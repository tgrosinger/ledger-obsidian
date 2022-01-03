import { getTransactionCache, LedgerModifier } from './file-interface';
import type LedgerPlugin from './main';
import { TransactionCache } from './parser';
import { LedgerDashboard } from './ui/LedgerDashboard';
import { TextFileView, TFile, ViewState, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom';

export const LedgerViewType = 'ledger';

export class LedgerView extends TextFileView {
  private readonly plugin: LedgerPlugin;
  private txCache: TransactionCache;
  private currentFilePath: string | null;
  private updateInterface: LedgerModifier | null;

  constructor(leaf: WorkspaceLeaf, plugin: LedgerPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.txCache = plugin.txCache;

    this.currentFilePath = null;
    this.updateInterface = null;

    this.addAction('pencil', 'Switch to Markdown View', () => {
      const state = leaf.view.getState();
      leaf.setViewState(
        {
          type: 'markdown',
          state,
          popstate: true,
        } as ViewState,
        { focus: true },
      );
    });

    this.redraw();
  }

  public canAcceptExtension(extension: string): boolean {
    return extension === 'ledger';
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
    if (file.path === this.plugin.settings.ledgerFile) {
      this.txCache = this.plugin.txCache;
    } else {
      // TODO: Setup a file watch for modifications while this file is open.
      console.debug(
        'Ledger: Generating txCache for other Ledger file: ' + file.path,
      );
      this.txCache = await getTransactionCache(
        this.plugin.app.metadataCache,
        this.plugin.app.vault,
        this.plugin.settings,
        file.path,
      );
    }

    if (this.currentFilePath !== file.path) {
      this.currentFilePath = file.path;
      this.updateInterface = new LedgerModifier(this.plugin, file);
      this.redraw();
    }
  }

  public async onUnloadFile(file: TFile): Promise<void> {
    console.debug('Ledger: File being unloaded: ' + file.path);
    // TODO: Use this to persist any changes that need to be saved.
    // TODO: Tear down the file watch if this is a non-default file.
  }

  public readonly redraw = (): void => {
    console.debug('Ledger: Creating dashboard view');

    const contentEl = this.containerEl.children[1];

    if (this.currentFilePath && this.updateInterface) {
      ReactDOM.render(
        React.createElement(LedgerDashboard, {
          tutorialIndex: this.plugin.settings.tutorialIndex,
          setTutorialIndex: this.setTutorialIndex,
          settings: this.plugin.settings,
          txCache: this.txCache,
          updater: this.updateInterface,
        }),
        this.contentEl,
      );
    } else {
      contentEl.empty();
      const span = contentEl.createSpan();
      span.setText('Loading...');
    }
  };

  private readonly setTutorialIndex = (index: number): void => {
    this.plugin.settings.tutorialIndex = index;
    this.plugin.saveData(this.plugin.settings);
  };

  private readonly handleTxCacheUpdate = (txCache: TransactionCache): void => {
    console.debug('Ledger: received an updated txCache for dashboard');
    this.txCache = txCache;

    // The plugin only monitors the ledger file for changes, so we will only be
    // notified for that file. If we are viewing a different file currently then
    // we should not redraw for this event.
    if (this.currentFilePath === this.plugin.settings.ledgerFile) {
      this.redraw();
    }
  };

  // TODO: Create a save function that can be passed into the React app to save
  // data back to the file.  Look into what the existing save function on this
  // class does and whether that can be leveraged (maybe it calls getViewData).
}
