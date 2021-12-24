import { bucketTransactions } from './date-utils';
import { Transaction } from './parser';
import { getTotalAsNum, valueForAccount } from './transaction-utils';

export type ChartData = {
  x: string | number | Date;
  y: number;
}[];

export const makeBalanceData = (
  txs: Transaction[],
  bucketNames: string[],
  account: string,
  startingBalance: number,
): ChartData => {
  const groupedTXs = bucketTransactions(bucketNames, txs);
  const data: ChartData = [];
  let prevBalance = startingBalance;
  groupedTXs.forEach((value, key) => {
    prevBalance = accountBalance(value, account, prevBalance);
    data.push({ x: key.format('YYYY-MM-DD'), y: prevBalance });
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
