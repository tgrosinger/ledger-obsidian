import type LedgerPlugin from './main';
import { TransactionCache } from './parser';
import { LedgerDashboard } from './ui/LedgerDashboard';
import { TextFileView, TFile, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom';

export const LedgerViewType = 'ledger';

export class LedgerView extends TextFileView {
  private readonly plugin: LedgerPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: LedgerPlugin) {
    super(leaf);
    this.plugin = plugin;

    this.redraw();
  }

  public canAcceptExtension(extension: string): boolean {
    return extension === 'ledger' || extension === 'md';
  }

  public getViewType(): string {
    return LedgerViewType;
  }

  public getDisplayText(): string {
    return 'Ledger';
  }

  public getIcon(): string {
    return 'ledger';
  }

  public getViewData(): string {
    console.debug('Ledger: returning view data');
    return this.data;
  }

  public setViewData(data: string, clear: boolean): void {
    console.debug('Ledger: setting view data');

    // TODO: Update the txCache and call redraw()

    // TODO: This might not tell me about all file modify events
  }

  public clear(): void {
    console.debug('Ledger: clearing view');
  }

  public onload(): void {
    console.debug('Ledger: loading dashboard');
    this.plugin.registerTxCacheSubscription(this.handleTxCacheUpdate);
  }

  public onunload(): void {
    console.debug('Ledger: unloading dashboard');
    this.plugin.deregisterTxCacheSubscription(this.handleTxCacheUpdate);
  }

  public async onLoadFile(file: TFile): Promise<void> {
    console.debug('Ledger: File being loaded: ' + file.path);

    // TODO: Update the txCache and call redraw();
    // (unless this call is redundant with setViewData)
  }

  public async onUnloadFile(file: TFile): Promise<void> {
    console.debug('Ledger: File being unloaded: ' + file.path);

    // TODO: Use this to persist any changes that need to be saved.
  }

  public readonly redraw = (): void => {
    console.debug('Ledger: Creating dashboard view');

    const contentEl = this.containerEl.children[1];
    ReactDOM.render(
      React.createElement(LedgerDashboard, {
        currencySymbol: this.plugin.settings.currencySymbol,
        txCache: this.plugin.txCache,
      }),
      this.contentEl,
    );
  };

  private readonly handleTxCacheUpdate = (txCache: TransactionCache): void => {
    console.debug('Ledger: received an updated txCache for dashboard');
    this.redraw();
  };

  // TODO: Create a save function that can be passed into the React app to save
  // data back to the file.  Look into what the existing save function on this
  // class does and whether that can be leveraged (maybe it calls getViewData).
}
