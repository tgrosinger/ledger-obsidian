import { getWithDefault } from './generic-utils';
import { EnhancedTransaction } from './parser';
import { ISettings } from './settings';
import { Moment } from 'moment';

export type ChartData = {
  x: string | number | Date;
  y: number;
}[];

const calcNetWorth = (
  balanceData: Map<string, number>,
  settings: ISettings,
): number =>
  [...balanceData.entries()].reduce((accum, curr) => {
    const [acct, bal] = curr;
    return acct.startsWith(settings.assetAccountsPrefix) ||
      acct.startsWith(settings.liabilityAccountsPrefix)
      ? accum + bal
      : accum;
  }, 0);

export const makeNetWorthData = (
  dailyAccountBalanceMap: Map<string, Map<string, number>>,
  bucketNames: string[],
  settings: ISettings,
): ChartData =>
  bucketNames.map((bucket) => {
    const balanceData = dailyAccountBalanceMap.get(bucket);
    const netWorth = balanceData ? calcNetWorth(balanceData, settings) : 0;
    return {
      x: bucket,
      y: netWorth,
    };
  });

/**
 * makeBalanceData creates a list of data points representing the balance of an
 * account over the provided buckets.
 */
export const makeBalanceData = (
  dailyAccountBalanceMap: Map<string, Map<string, number>>,
  bucketNames: string[],
  account: string,
  allAccounts: string[],
): ChartData => {
  const accounts = [...findChildAccounts(account, allAccounts), account];
  return bucketNames.map((bucket) => {
    const accountBalances = dailyAccountBalanceMap.get(bucket);
    const balance = accounts.reduce(
      (prev, currentAccount) =>
        (accountBalances?.get(currentAccount) || 0) + prev,
      0,
    );

    return { x: bucket, y: balance };
  });
};

/**
 * makeDeltaData creates a list of data points representing the change in
 * balance of an account between the provided buckets.
 */
export const makeDeltaData = (
  dailyAccountBalanceMap: Map<string, Map<string, number>>,
  bucketBefore: string,
  bucketNames: string[],
  account: string,
  allAccounts: string[],
): ChartData => {
  const accounts = [...findChildAccounts(account, allAccounts), account];
  return bucketNames.map((bucket, i) => {
    const prevBucket = i === 0 ? bucketBefore : bucketNames[i - 1];
    const accountBalances = dailyAccountBalanceMap.get(bucket);
    const prevAccountBalances = dailyAccountBalanceMap.get(prevBucket);

    const balance = accounts.reduce((prev, currentAccount) => {
      const b1 = prevAccountBalances?.get(currentAccount) || 0;
      const b2 = accountBalances?.get(currentAccount) || 0;
      return b2 - b1 + prev;
    }, 0);

    return { x: bucket, y: balance };
  });
};

/**
 * findChildAccounts returns a list of accounts which are children to the
 * provided account.
 */
export const findChildAccounts = (
  account: string,
  accounts: string[],
): string[] =>
  accounts.filter((candidate) => candidate.startsWith(account + ':'));

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

/**
 * removeDuplicateAccounts accepts a list of account names and removes any which
 * only have a single child. For example, if given the input:
 * - Liabilities
 * - Liabilities:Credit
 * - Liabilities:Credit:Chase
 * - Liabilities:Credit:Citi
 * it would remove "Liabilities" because it only has a single child
 * ("Liabilities:Credit").
 */
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

/**
 * Of the format <'YYYY-MM-DD': <'l:Credit:Chase': -450>>
 */
export type DailyAccountBalanceChangeMap = Map<string, Map<string, number>>;

/**
 * makeDailyAccountBalanceChangeMap creates a sparse nested map structure that
 * enables looking up the balance change for any account on any date.
 *
 * If an account has no balance change on a date, that key will not be included
 * in the inner map. If a date has no transactions, that key will not be
 * included in the outer map.
 */
export const makeDailyAccountBalanceChangeMap = (
  transactions: EnhancedTransaction[],
): DailyAccountBalanceChangeMap => {
  // This map contains a mapping from every day (YYYY-MM-DD) to account names to
  // a list of all balance changes.
  const txDateAccountMap = new Map<string, Map<string, number[]>>();
  const makeDefaultAccountMap = (): Map<string, number[]> =>
    new Map<string, number[]>();
  const makeDefaultBalanceList = (): number[] => [];
  transactions.forEach((tx) => {
    const normalizedDate = window.moment(tx.value.date).format('YYYY-MM-DD');
    const accounts = getWithDefault(
      txDateAccountMap,
      normalizedDate,
      makeDefaultAccountMap,
    );

    tx.value.expenselines.forEach((line) => {
      if (!('account' in line)) {
        return; // Must be a comment line
      }

      getWithDefault(
        accounts,
        line.dealiasedAccount,
        makeDefaultBalanceList,
      ).push(line.amount);
    });
  });

  // This map rolls up the balance changes for each day (YYYY-MM-DD) and account
  // pair into a single balance change per entry.
  const dateAccountTotalMap = new Map<string, Map<string, number>>();
  txDateAccountMap.forEach((accounts, txDate) => {
    const rolledUpAccountMap = new Map<string, number>();
    dateAccountTotalMap.set(txDate, rolledUpAccountMap);

    accounts.forEach((changes, account) => {
      const sum = changes.reduce((prev, curr) => prev + curr, 0);
      rolledUpAccountMap.set(account, sum);
    });
  });

  return dateAccountTotalMap;
};

/**
 *  makeDailyBalanceMap rolls up the provided DailyAccountBalanceChangeMap into
 *  a daily map of the balance of every account on any given day after the
 *  provided first date. Unlike the input map, this map is not sparse and will
 *  include the balance for every account on every day.
 */
export const makeDailyBalanceMap = (
  accounts: string[],
  input: DailyAccountBalanceChangeMap,
  firstDate: Moment,
  lastDate: Moment,
): Map<string, Map<string, number>> => {
  const result = new Map<string, Map<string, number>>();
  const currentDate = firstDate.clone();

  // All accounts start with 0 balance
  let previousData: Map<string, number> = new Map();
  accounts.forEach((accountName) => {
    previousData.set(accountName, 0);
  });

  while (currentDate.isSameOrBefore(lastDate)) {
    const currentDateStr = currentDate.format('YYYY-MM-DD');

    const innerInputMap = input.get(currentDateStr);
    if (innerInputMap) {
      const innerResultMap = new Map<string, number>();

      accounts.forEach((accountName) => {
        const previousValue = previousData.get(accountName) || 0;
        const currentValue = innerInputMap.get(accountName) || 0;
        innerResultMap.set(accountName, previousValue + currentValue);
      });

      result.set(currentDateStr, innerResultMap);
      previousData = innerResultMap;
    } else {
      result.set(currentDateStr, previousData);
    }

    currentDate.add(1, 'day');
  }

  return result;
};
