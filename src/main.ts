import {
  appendLedger,
  formatExpense,
  getTransactionCache,
} from './file-interface';
import { billIcon } from './graphics';
import { LedgerView, LedgerViewType } from './ledgerview';
import type { Transaction, TransactionCache } from './parser';
import { ISettings, SettingsTab, settingsWithDefaults } from './settings';
import { CreateLedgerEntry } from './ui/CreateLedgerEntry';
import type { default as MomentType } from 'moment';
import { addIcon, Modal, Plugin, TAbstractFile } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom';

declare global {
  interface Window {
    moment: typeof MomentType;
  }
}

export default class LedgerPlugin extends Plugin {
  public settings: ISettings;
  public txCache: TransactionCache;

  private readonly renderer: LedgerView;

  public async onload(): Promise<void> {
    console.log('ledger: Loading plugin v' + this.manifest.version);

    await this.loadSettings();
    this.addSettingTab(new SettingsTab(this));

    addIcon('ledger', billIcon);
    this.addRibbonIcon('ledger', 'Add to Ledger', () => {
      new AddExpenseModal(this).open();
    });

    this.addCommand({
      id: 'ledger-add-transaction',
      name: 'Add to Ledger',
      icon: 'ledger',
      callback: () => {
        new AddExpenseModal(this).open();
      },
    });

    this.registerEvent(
      this.app.vault.on('modify', (file: TAbstractFile) => {
        if (file.path === this.settings.ledgerFile) {
          this.updateTransactionCache();
        }
      }),
    );

    this.registerView(LedgerViewType, (leaf) => new LedgerView(leaf, this));

    this.registerExtensions(['ledger'], LedgerViewType);

    this.registerEvent(
      this.app.workspace.on('layout-change', this.switchToLedgerView),
    );

    this.app.workspace.onLayoutReady(() => {
      this.updateTransactionCache();
    });
  }

  private async loadSettings(): Promise<void> {
    this.settings = settingsWithDefaults(await this.loadData());
    this.saveData(this.settings);
  }

  private readonly updateTransactionCache = async (): Promise<void> => {
    console.debug('ledger: Updating the transaction cache');
    this.txCache = await getTransactionCache(
      this.app.metadataCache,
      this.app.vault,
      this.settings,
    );
  };

  private readonly switchToLedgerView = (): void => {
    const activeLeaf = this.app.workspace.getMostRecentLeaf();
    const viewState = activeLeaf.getViewState().state;
    if (
      !this.settings.enableLedgerVis ||
      !viewState ||
      viewState.file !== this.settings.ledgerFile ||
      viewState.mode !== 'preview'
    ) {
      // Only render when previewing the Ledger file
      return;
    }

    const vs = activeLeaf.getViewState();
    vs.type = 'ledger';
    activeLeaf.setViewState(vs);
  };
}

class AddExpenseModal extends Modal {
  private readonly plugin: LedgerPlugin;

  constructor(plugin: LedgerPlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  public onOpen = (): void => {
    ReactDOM.render(
      React.createElement(CreateLedgerEntry, {
        currencySymbol: this.plugin.settings.currencySymbol,
        saveFn: async (tx: Transaction): Promise<void> => {
          const formatted = formatExpense(tx, this.plugin.settings);
          await appendLedger(
            this.app.metadataCache,
            this.app.vault,
            this.plugin.settings,
            formatted,
          );
        },
        txCache: this.plugin.txCache,
        close: () => this.close(),
      }),
      this.contentEl,
    );
  };

  public onClose = (): void => {
    ReactDOM.unmountComponentAtNode(this.contentEl);
    this.contentEl.empty();
  };
}
