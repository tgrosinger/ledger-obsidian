import { parse, TransactionCache } from './parser';
import type { ISettings } from './settings';
import type { MetadataCache, Vault } from 'obsidian';

export interface Transaction {
  date: string;
  payee: string;
  lines: ExpenseLine[];
}

export interface ExpenseLine {
  category: string;
  amount: number;
  id: number;
}

export const formatExpense = (tx: Transaction, settings: ISettings): string => {
  const symb = settings.currencySymbol;
  // The final line needs to have the amount updated so all lines total 0.
  const total = tx.lines
    .slice(0, -1)
    .map(({ amount }) => amount)
    .reduce((prev, curr) => curr + prev, 0);
  tx.lines[tx.lines.length - 1].amount = total * -1;

  const joinedLines = tx.lines
    .map(({ category, amount }, i) => {
      if (i !== tx.lines.length - 1 || settings.includeFinalLineAmount) {
        return `    ${category}    ${symb}${amount.toFixed(2)}`;
      }
      // The amount is optional on the final line
      return `    ${category}`;
    })
    .join('\n');
  return `\n${tx.date} ${tx.payee}\n${joinedLines}`;
};

export const appendLedger = async (
  cache: MetadataCache,
  vault: Vault,
  settings: ISettings,
  newExpense: string,
): Promise<void> => {
  const file = cache.getFirstLinkpathDest(settings.ledgerFile, '');
  if (file) {
    const fileContents = await vault.read(file);
    const newFileContents = `${fileContents}\n${newExpense}`;
    await vault.modify(file, newFileContents);
  } else {
    await vault.create(settings.ledgerFile, newExpense);
  }
};

export const getTransactionCache = async (
  cache: MetadataCache,
  vault: Vault,
  settings: ISettings,
): Promise<TransactionCache> => {
  const file = cache.getFirstLinkpathDest(settings.ledgerFile, '');
  if (!file) {
    return;
  }
  const fileContents = await vault.read(file);
  return parse(fileContents, settings.currencySymbol);
};
