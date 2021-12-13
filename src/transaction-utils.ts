import { Transaction } from './parser';

/**
 * getTotal returns the total value of the transaction. It assumes that all
 * lines use the same currency. In a transaction, any 1 line may be left empty
 * and can be inferred from the remainder. If muliple lines are empty, it will
 * return a 0 value.
 */
export const getTotal = (tx: Transaction, defaultCurrency: string): string => {
  const lines = tx.value.expenselines;
  const currency = getCurrency(tx, defaultCurrency);

  // If the last line has an amount, then the inverse of that is the total
  if (lines[lines.length - 1].amount) {
    return currency + (-1 * lines[lines.length - 1].amount).toFixed(2);
  }

  // The last line does not have an amount, so the other lines must. We can
  // simply add them all together.
  let sum = 0.0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].amount) {
      sum += lines[i].amount;
    }
  }
  return currency + sum.toFixed(2);
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
