import { Transaction } from './parser';
import { some } from 'lodash';
import { Moment } from 'moment';

/**
 * getTotal returns the total value of the transaction. It assumes that all
 * lines use the same currency. In a transaction, any 1 line may be left empty
 * and can be inferred from the remainder. If muliple lines are empty, it will
 * return a 0 value.
 */
export const getTotal = (tx: Transaction, defaultCurrency: string): string => {
  const currency = getCurrency(tx, defaultCurrency);
  const total = getTotalAsNum(tx);
  return currency + total.toFixed(2);
};

export const getTotalAsNum = (tx: Transaction): number => {
  const lines = tx.value.expenselines;

  // If the last line has an amount, then the inverse of that is the total
  if (lines[lines.length - 1].amount) {
    return -1 * lines[lines.length - 1].amount;
  }

  // The last line does not have an amount, so the other lines must. We can
  // simply add them all together.
  let sum = 0.0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].amount) {
      sum += lines[i].amount;
    }
  }
  return sum;
};

/**
 * getCurrency attempts to return the currency symbol used in this transaction.
 * It will return the currency symbol used by the first expense line that has
 * one. If no expense lines have a currency symbol, then the provided
 * defaultCurrency value will be returned.
 */
export const getCurrency = (
  tx: Transaction,
  defaultCurrency: string,
): string => {
  for (let i = 0; i < tx.value.expenselines.length; i++) {
    const line = tx.value.expenselines[i];
    if (line.currency) {
      return line.currency;
    }
  }
  return defaultCurrency;
};

/**
 * fillMissingAmmount attempts to fill any empty amount fields in the
 * transactions expense lines.
 */
export const fillMissingAmount = (tx: Transaction): void => {
  const lines = tx.value.expenselines;
  const commentLines: number[] = [];
  let missingIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].amount) {
      if (!lines[i].account || lines[i].account === '') {
        commentLines.push(i);
        continue;
      }
      if (missingIndex !== -1) {
        console.debug(tx);
        throw new Error(
          'Transaction has multiple expense lines without an amount. At most one is allowed.',
        );
      }
      missingIndex = i;
    }
  }

  if (missingIndex === -1) {
    return;
  }

  const total = getTotalAsNum(tx);
  if (missingIndex + 1 === lines.length) {
    // The last line is missing. It should be the inverse of the rest of the lines.
    lines[missingIndex].amount = -1 * total;
  } else {
    // A non-last line is missing. It should be the total minus the other non-last lines.
    lines[missingIndex].amount = lines.reduce(
      (prev, line, i) =>
        i === missingIndex || i + 1 === lines.length || commentLines.includes(i)
          ? prev
          : prev - line.amount,
      total,
    );
  }
};

export const valueForAccount = (tx: Transaction, account: string): number => {
  for (let i = 0; i < tx.value.expenselines.length; i++) {
    const line = tx.value.expenselines[i];
    if (
      (line.account && line.account === account) ||
      (line.dealiasedAccount && line.dealiasedAccount === account)
    ) {
      return i + 1 === tx.value.expenselines.length
        ? -1 * getTotalAsNum(tx) // On the last line
        : line.amount;
    }
  }
  return 0;
};

export type Filter = (tx: Transaction) => boolean;

/**
 * filterByAccount accepts an account name and attempts to match to
 * transactions. Checks both account name an dealiased acocunt name.
 */
export const filterByAccount =
  (account: string): Filter =>
  (tx: Transaction): boolean =>
    some(
      tx.value.expenselines,
      (line) =>
        (line.account && line.account.startsWith(account)) ||
        (line.dealiasedAccount && line.dealiasedAccount.startsWith(account)),
    );

export const filterByPayeeExact =
  (account: string): Filter =>
  (tx: Transaction): boolean =>
    tx.value.payee === account;

export const filterByStartDate = (start: Moment): Filter => null;

export const filterByEndDate = (start: Moment): Filter => null;

/**
 * filterTransactions filters the provided transactions if _any_ of the provided
 * filters match. To _and_ filters, apply this function sequentially.
 */
export const filterTransactions = (
  txs: Transaction[],
  ...filters: Filter[]
): Transaction[] =>
  filters.length > 0 ? txs.filter((tx) => some(filters, (fn) => fn(tx))) : txs;

export const dealiasAccount = (
  account: string,
  aliases: Map<string, string>,
): string => {
  const firstDelimeter = account.indexOf(':');
  if (firstDelimeter > 0) {
    const prefix = account.substring(0, firstDelimeter);
    if (aliases.has(prefix)) {
      return aliases.get(prefix) + account.substring(firstDelimeter);
    }
  }
  return account;
};

export interface Node {
  id: string;
  account: string;
  subRows?: Node[];
  expanded?: boolean;
}

export const makeAccountTree = (
  nodes: Node[],
  newValue: string,
  parent?: string,
): void => {
  const parts = newValue.split(':');
  const fullName = parent ? `${parent}:${parts[0]}` : parts[0];
  let destNode = nodes.find((val) => val.account === parts[0]);

  if (!destNode) {
    destNode = { account: parts[0], id: fullName };
    nodes.push(destNode);
  }

  if (parts.length > 1) {
    if (!destNode.subRows) {
      destNode.subRows = [];
    }

    const newParent = parent ? `${parent}:${parts[0]}` : parts[0];
    makeAccountTree(destNode.subRows, parts.slice(1).join(':'), newParent);
  }
};

export const sortAccountTree = (nodes: Node[]): void => {
  nodes.sort((a: Node, b: Node): number =>
    a.account.localeCompare(b.account, 'en', { numeric: true }),
  );

  nodes.forEach((node) => {
    if (node.subRows) {
      sortAccountTree(node.subRows);
    }
  });
};
