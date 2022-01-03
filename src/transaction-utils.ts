import { EnhancedTransaction } from './parser';
import { some } from 'lodash';
import { Moment } from 'moment';

export const emptyTransaction: EnhancedTransaction = {
  type: 'tx',
  block: { firstLine: -1, lastLine: -1, block: '' },
  blockLine: -1,
  value: {
    date: '',
    payee: '',
    expenselines: [],
  },
};

/**
 * formatTransaction converts a transaction object into the string
 * representation which can be stored in the Ledger file.
 */
export const formatTransaction = (
  tx: EnhancedTransaction,
  currencySymbol: string,
): string => {
  const joinedLines = tx.value.expenselines
    .map((line, i) => {
      if (!('account' in line)) {
        return `    ; ${line.comment}`;
      }

      const currency = line.currency ? line.currency : currencySymbol;
      const symb = line.reconcile ? line.reconcile : ' ';
      const comment = line.comment ? `    ; ${line.comment}` : '';
      return i !== tx.value.expenselines.length - 1
        ? `  ${symb} ${line.account}    ${currency}${line.amount.toFixed(
            2,
          )}${comment}`
        : `  ${symb} ${line.account}${comment}`;
    })
    .join('\n');
  return `\n${tx.value.date} ${tx.value.payee}\n${joinedLines}`;
};

/**
 * getTotal returns the total value of the transaction. It assumes that all
 * lines use the same currency. In a transaction, any 1 line may be left empty
 * and can be inferred from the remainder. If muliple lines are empty, it will
 * return a 0 value.
 */
export const getTotal = (
  tx: EnhancedTransaction,
  defaultCurrency: string,
): string => {
  const currency = getCurrency(tx, defaultCurrency);
  const total = getTotalAsNum(tx);
  return currency + total.toFixed(2);
};

export const getTotalAsNum = (tx: EnhancedTransaction): number => {
  // The total of an EnhancedTransaction is -1 * the last line that is not a comment
  for (let i = tx.value.expenselines.length - 1; i >= 0; i--) {
    const line = tx.value.expenselines[i];
    if ('amount' in line) {
      // This is the last line which is not a comment-only line
      return -1 * line.amount;
    }
  }

  // If we got here then there are no expenselines with an amount, which would not happen because of validation in the parser.
  return 0;
};

/**
 * getCurrency attempts to return the currency symbol used in this transaction.
 * It will return the currency symbol used by the first expense line that has
 * one. If no expense lines have a currency symbol, then the provided
 * defaultCurrency value will be returned.
 */
export const getCurrency = (
  tx: EnhancedTransaction,
  defaultCurrency: string,
): string => {
  for (let i = 0; i < tx.value.expenselines.length; i++) {
    const line = tx.value.expenselines[i];
    if ('currency' in line && line.currency) {
      return line.currency;
    }
  }
  return defaultCurrency;
};

/**
 * firstDate returns the date of the earliest transaction.
 */
export const firstDate = (txs: EnhancedTransaction[]): Moment =>
  txs.reduce((prev, tx) => {
    const current = window.moment(tx.value.date);
    return current.isSameOrBefore(prev) ? current : prev;
  }, window.moment());

export const valueForAccount = (
  tx: EnhancedTransaction,
  account: string,
): number => {
  for (let i = 0; i < tx.value.expenselines.length; i++) {
    const line = tx.value.expenselines[i];
    if (!('account' in line)) {
      continue;
    }
    if (line.account === account || line.dealiasedAccount === account) {
      return i + 1 === tx.value.expenselines.length
        ? -1 * line.amount // On the last line
        : line.amount;
    }
  }
  return 0;
};

export type Filter = (tx: EnhancedTransaction) => boolean;

/**
 * filterByAccount accepts an account name and attempts to match to
 * transactions. Checks both account name an dealiased acocunt name.
 */
export const filterByAccount =
  (account: string): Filter =>
  (tx: EnhancedTransaction): boolean =>
    some(
      tx.value.expenselines,
      (line) =>
        ('account' in line && line.account.startsWith(account)) ||
        ('dealiasedAccount' in line &&
          line.dealiasedAccount.startsWith(account)),
    );

export const filterByPayeeExact =
  (account: string): Filter =>
  (tx: EnhancedTransaction): boolean =>
    tx.value.payee === account;

export const filterByStartDate =
  (start: Moment): Filter =>
  (tx) =>
    start.isSameOrBefore(window.moment(tx.value.date));

export const filterByEndDate =
  (end: Moment): Filter =>
  (tx) =>
    end.isSameOrAfter(window.moment(tx.value.date));

/**
 * filterTransactions filters the provided transactions if _any_ of the provided
 * filters match. To _and_ filters, apply this function sequentially.
 */
export const filterTransactions = (
  txs: EnhancedTransaction[],
  ...filters: Filter[]
): EnhancedTransaction[] =>
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
  return aliases.get(account) || account;
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
