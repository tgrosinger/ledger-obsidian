import { Transaction } from './parser';
import { getTotalAsNum, valueForAccount } from './transaction-utils';

/**
 * A grouper accepts a transaction and returns the key which should be used to
 * group this transaction into a bucket.
 */
export type Grouper = (tx: Transaction) => string;

// TODO: Consider changing this to use the date of the Monday before to make the
// chart more readable.
export const grouperByWeek: Grouper = (tx: Transaction): string =>
  window.moment(tx.value.date).format('YYYY-WW');

export const grouperByMonth: Grouper = (tx: Transaction): string =>
  window.moment(tx.value.date).format('YYYY-MM');

/**
 * transactionGroupSorter accepts the data format created by groupTransactions
 * and sorts the result in chronological order. It assumes that the key values
 * will be naively numerically sortable (i.e. YYYY-MM or YYYY-WW)
 */
const transactionGroupSorter = (
  a: [string, Transaction[]],
  b: [string, Transaction[]],
): number => {
  const aKey = a[0];
  const bKey = b[0];
  if (aKey.length !== bKey.length) {
    console.debug(a);
    console.debug(b);
    throw new Error('Unexpected keys when sorting transaction groups');
  }
  for (let i = 0; i < aKey.length; i++) {
    if (aKey[i] > bKey[i]) {
      return 1;
    }
    if (aKey[i] < bKey[i]) {
      return -1;
    }
  }
  return 0;
};

const groupTransactions = (
  txs: Transaction[],
  grouperFn: Grouper,
): [string, Transaction[]][] => {
  const m: Map<string, Transaction[]> = new Map();
  txs.forEach((tx) => {
    const key = grouperFn(tx);
    const txGroup = m.get(key);
    if (txGroup) {
      txGroup.push(tx);
    } else {
      m.set(key, [tx]);
    }
  });

  const toReturn = [...m.entries()];
  toReturn.sort(transactionGroupSorter);
  return toReturn;
};

export type ChartData = {
  x: string | number | Date;
  y: number;
}[];

export const makeBalanceData = (
  txs: Transaction[],
  grouperFn: Grouper,
  account: string,
  startingBalance: number,
): ChartData => {
  const groupedTXs = groupTransactions(txs, grouperFn);
  const data: ChartData = [];
  let prevBalance = startingBalance;
  groupedTXs.forEach(([key, value]) => {
    prevBalance = accountBalance(value, account, prevBalance);
    data.push({ x: key, y: prevBalance });
  });
  return data;
};

/**
 * accountBalance sums the balance for the provided account across the
 * transactions.
 */
export const accountBalance = (
  txs: Transaction[],
  account: string,
  startingBalance: number,
): number =>
  txs.reduce((sum, tx) => sum + valueForAccount(tx, account), startingBalance);

/**
 * allDealiasedAccountBalances sums all transactions provided by account,
 * returning a map of dealiased account names to their balances. Assumes all
 * accounts have an initial balance of 0.
 */
export const allDealiasedAccountBalances = (
  txs: Transaction[],
): Map<string, number> => {
  const balances: Map<string, number> = new Map();
  const add = (account: string, amount: number): void => {
    const currentValue = balances.get(account) || 0;
    balances.set(account, currentValue + amount);
  };

  txs.forEach((tx) => {
    const length = tx.value.expenselines.length;
    tx.value.expenselines.forEach((line, i) => {
      // We will assume expense lines have been normalized and all lines
      // which have an account will have an amount except for the final line.

      if (!line.account || line.account === '') {
        return; // Skip comment-only lines
      }

      const account = line.dealiasedAccount
        ? line.dealiasedAccount
        : line.account;

      if (i + 1 === length) {
        add(account, -1 * getTotalAsNum(tx)); // last line
      } else {
        add(account, line.amount);
      }
    });
  });
  return balances;
};

interface RootNode {
  children: TreeNode[];
}

interface TreeNode {
  exists: boolean;
  label: string;
  children: TreeNode[];
}

const renderTree = (
  output: string[],
  node: RootNode | TreeNode,
  path?: string,
): void => {
  let newPath: string | undefined;
  if ('label' in node) {
    newPath = path ? [path, node.label].join(':') : node.label;
    if (node.children.length !== 1 && node.exists) {
      output.push(newPath);
    }
  }
  node.children.forEach((child) => renderTree(output, child, newPath));
};

export const removeDuplicateAccounts = (input: string[]): string[] => {
  const tree: RootNode = { children: [] };

  input.forEach((path) => {
    let parentNode = tree;
    path.split(':').forEach((segment, i, segments) => {
      const lastSegment = segments.length === i + 1;
      let node = parentNode.children.find(({ label }) => label === segment);
      if (!node) {
        node = {
          exists: lastSegment,
          label: segment,
          children: [],
        };
        parentNode.children.push(node);
      } else if (lastSegment) {
        node.exists = true;
      }
      parentNode = node;
    });
  });

  const output: string[] = [];
  renderTree(output, tree);
  return output;
};
