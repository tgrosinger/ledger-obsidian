import LedgerPlugin from './main';
import { AddExpenseModal, Operation } from './modals';
import { parse, Transaction, TransactionCache } from './parser';
import type { ISettings } from './settings';
import type { MetadataCache, TFile, Vault } from 'obsidian';

export class LedgerModifier {
  private readonly plugin: LedgerPlugin;
  private ledgerFile: TFile;

  constructor(plugin: LedgerPlugin, ledgerFile: TFile) {
    this.plugin = plugin;
    this.ledgerFile = ledgerFile;
  }

  public setLedgerFile(ledgerFile: TFile): void {
    this.ledgerFile = ledgerFile;
  }

  public openExpenseModal(
    operation: Operation,
    initialState?: Transaction,
  ): void {
    new AddExpenseModal(this.plugin, this, operation, initialState).open();
  }

  public async updateTransaction(
    oldTx: Transaction,
    newTx: string,
  ): Promise<void> {
    const vault = this.plugin.app.vault;
    const fileContents = await vault.cachedRead(this.ledgerFile);
    const lines = fileContents.split('\n');
    const newLines =
      lines.slice(0, oldTx.block.firstLine).join('\n') +
      newTx +
      '\n' +
      lines.slice(oldTx.block.lastLine + 1).join('\n');
    return vault.modify(this.ledgerFile, newLines);
  }

  public async deleteTransaction(tx: Transaction): Promise<void> {
    const vault = this.plugin.app.vault;
    const fileContents = await vault.cachedRead(this.ledgerFile);
    const lines = fileContents.split('\n');
    let length = tx.block.lastLine - tx.block.firstLine + 1;
    if (lines[tx.block.firstLine + length] === '') {
      length++; // Attempt to prevent a double blank line
    }
    lines.splice(tx.block.firstLine, length);
    return vault.modify(this.ledgerFile, lines.join('\n'));
  }

  public async appendLedger(newExpense: string): Promise<void> {
    const vault = this.plugin.app.vault;
    const fileContents = await vault.read(this.ledgerFile);
    const newFileContents = `${fileContents}\n${newExpense}`;
    await vault.modify(this.ledgerFile, newFileContents);
  }
}

export const getTransactionCache = async (
  cache: MetadataCache,
  vault: Vault,
  settings: ISettings,
  ledgerFilePath: string,
): Promise<TransactionCache> => {
  const file = cache.getFirstLinkpathDest(ledgerFilePath, '');
  if (!file) {
    console.debug('Ledger: Unable to find Ledger file to parse');
    return undefined;
  }

  const fileContents = await vault.read(file);
  return parse(fileContents, settings);
};
