import type { ISettings } from './settings';
import type { MetadataCache, Vault } from 'obsidian';

export interface ExpenseLine {
  category: string;
  amount: number;
}

export const formatExpense = (
  date: string,
  payee: string,
  lines: ExpenseLine[],
  settings: ISettings,
): string => {
  const symb = settings.currencySymbol;
  // The final line needs to have the amount updated so all lines total 0.
  const total = lines
    .slice(0, -1)
    .map(({ amount }) => amount)
    .reduce((prev, curr) => curr + prev, 0);
  lines[lines.length - 1].amount = total * -1;

  const joinedLines = lines
    .map(({ category, amount }, i) => {
      if (i !== lines.length - 1 || settings.includeFinalLineAmount) {
        return `    ${category}    ${symb}${amount.toFixed(2)}`;
      }
      // The amount is optional on the final line
      return `    ${category}`;
    })
    .join('\n');
  return `\n${date} ${payee}\n${joinedLines}`;
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
