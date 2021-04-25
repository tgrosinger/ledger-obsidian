import type { ExpenseLine, Transaction } from './file-interface';
import { flatMap, sortedUniq } from 'lodash';

const dateRe = /^\d{4}\/\d{2}\/\d{2}/;

export interface TransactionCache {
  transactions: Transaction[];
  payees: string[];
  categories: string[];
}

export const parse = (
  fileContents: string,
  currencySymbol: string,
): TransactionCache => {
  const splitFileContents = fileContents.split('\n');
  const transactions: Transaction[] = [];
  for (let i = 0; i < splitFileContents.length; i++) {
    const startI = i;

    // Assume that all transactions start with a line beginning with the date
    if (!dateRe.test(splitFileContents[i])) {
      continue;
    }

    const transactionLines = [splitFileContents[i]];

    // After the date and payee are the categories and amounts
    i++;
    while (i < splitFileContents.length && splitFileContents[i].trim() !== '') {
      transactionLines.push(splitFileContents[i]);
      i++;
    }

    if (transactionLines.length < 3) {
      console.debug('ledger: Unexpected end of transaction on line ' + startI);
      continue;
    }

    const tx = extractTransaction(transactionLines, currencySymbol);
    if (tx) {
      transactions.push(tx);
    }
  }

  return {
    transactions,
    payees: sortedUniq(
      transactions
        .map((tx) => tx.payee)
        .sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)),
    ),
    categories: sortedUniq(
      flatMap(transactions, (tx) =>
        tx.lines.map((line) => line.category),
      ).sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)),
    ),
  };
};

const extractTransaction = (
  lines: string[],
  currencySymbol: string,
): Transaction | undefined => {
  const dateMatches = dateRe.exec(lines[0]);
  if (dateMatches.length !== 1) {
    console.debug(`Unable to find date in transaction: ${lines[0]}`);
    return;
  }

  const date = dateMatches[0];
  const payee = lines[0].replace(date, '').split(';')[0].trim();
  const expenseLines: ExpenseLine[] = [];
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i].replace(/[!*]/, '').trim(); // Remove reconciliation symbols
    line = line.split(';')[0].trim(); // Ignore comments

    if (line.length === 0) {
      // Must have been just a comment
      continue;
    }

    const parts = line.split(/[ \t][ \t]+/);

    if (i === lines.length - 1) {
      // The last expense line is not required to have an amount
      // but if present it must match the sum thus far.
      const sum = expenseLines
        .map(({ amount }) => amount)
        .reduce((prev, curr) => parseFloat((curr + prev).toFixed(2)), 0);

      if (
        parts.length > 1 &&
        parseFloat(parts[1].replace(currencySymbol, '')) !== -1 * sum
      ) {
        console.debug(
          'ledger: Expenses do not add up in transaction: ' + lines[0],
        );
        return undefined;
      }

      expenseLines.push({
        category: parts[0],
        amount: -1 * sum,
        id: 0,
      });
    } else {
      if (parts.length !== 2) {
        console.debug('ledger: Invalid expense line: ' + lines[i]);
        return undefined;
      }
      expenseLines.push({
        category: parts[0],
        amount: parseFloat(parts[1].replace(currencySymbol, '')),
        id: 0,
      });
    }
  }

  return { date, payee, lines: expenseLines };
};
