import { LedgerModifier } from './file-interface';
import LedgerPlugin from './main';
import { EnhancedTransaction } from './parser';
import { emptyTransaction } from './transaction-utils';
import { EditTransaction } from './ui/EditTransaction';
import { Modal } from 'obsidian';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

export type Operation = 'new' | 'clone' | 'modify';

export class AddExpenseModal extends Modal {
  private readonly plugin: LedgerPlugin;
  private readonly updater: LedgerModifier;
  private readonly operation: Operation;
  private readonly initialState: EnhancedTransaction;
  private root: Root | null = null;

  constructor(
    plugin: LedgerPlugin,
    updater: LedgerModifier,
    operation: Operation,
    initialState?: EnhancedTransaction,
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.updater = updater;
    this.operation = operation;
    this.initialState = initialState || emptyTransaction;
  }

  public onOpen = (): void => {
    this.root = createRoot(this.contentEl);
    this.root.render(
      React.createElement(EditTransaction, {
        displayFileWarning:
          !this.plugin.settings.ledgerFile.endsWith('.ledger'),
        currencySymbol: this.plugin.settings.currencySymbol,
        initialState: this.initialState,
        operation: this.operation,
        updater: this.updater,
        txCache: this.plugin.txCache,
        close: () => this.close(),
      }),
    );
  };

  public onClose = (): void => {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  };
}
