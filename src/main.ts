import {
  appendLedger,
  formatExpense,
  getTransactionCache,
} from './file-interface';
import { billIcon } from './graphics';
import { LedgerView, LedgerViewType } from './ledgerview';
import type { Transaction, TransactionCache } from './parser';
import { ISettings, settingsWithDefaults } from './settings';
import { SettingsTab } from './settings-tab';
import { CreateLedgerEntry } from './ui/CreateLedgerEntry';
import type { default as MomentType } from 'moment';
import { around } from 'monkey-around';
import {
  addIcon,
  MarkdownView,
  Menu,
  MenuItem,
  Modal,
  ObsidianProtocolData,
  Plugin,
  TAbstractFile,
  ViewState,
  WorkspaceLeaf,
} from 'obsidian';
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
  private txCacheSubscriptions: ((txCache: TransactionCache) => void)[];

  private readonly renderer: LedgerView;

  public async onload(): Promise<void> {
    console.log('ledger: Loading plugin v' + this.manifest.version);

    this.txCacheSubscriptions = [];

    await this.loadSettings();
    this.addSettingTab(new SettingsTab(this));

    addIcon('ledger', billIcon);
    this.addRibbonIcon('ledger', 'Add to Ledger', () => {
      new AddExpenseModal(this).open();
    });

    this.registerObsidianProtocolHandler('ledger', this.handleProtocolAction);

    this.registerView(LedgerViewType, (leaf) => new LedgerView(leaf, this));

    // TODO: Add a warning to enable syncing other files
    this.registerExtensions(['ledger'], LedgerViewType);

    this.registerEvent(
      this.app.vault.on('modify', (file: TAbstractFile) => {
        if (file.path === this.settings.ledgerFile) {
          this.updateTransactionCache();
        }
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    /*
    let addedOnce = false;
    this.register(
      around(MarkdownView.prototype, {
        addAction(next) {
          return function (icon, title, callback) {
            console.log('Add actions called: ' + title);
            if (!addedOnce) {
              addedOnce = true;
              this.addAction('ledger', 'testing', () => {
                console.log('clicked!');
              });
            }
            return next.call(icon, title, callback);
          };
        },
      }),
    );
    */
    this.register(
      around(MarkdownView.prototype, {
        onMoreOptionsMenu(next) {
          return function (menu: Menu) {
            if (this.file.path === self.settings.ledgerFile) {
              menu
                .addItem((item) => {
                  item
                    .setTitle('Open as Ledger file')
                    .setIcon('ledger')
                    .onClick(() => {
                      const state = this.leaf.view.getState();
                      this.leaf.setViewState({
                        type: LedgerViewType,
                        state: { file: state.file },
                        popstate: true,
                      } as ViewState);
                    });
                })
                .addSeparator();
            }
            next.call(this, menu);
          };
        },
      }),
    );

    this.addCommand({
      id: 'ledger-add-transaction',
      name: 'Add to Ledger',
      icon: 'ledger',
      callback: () => {
        new AddExpenseModal(this).open();
      },
    });

    this.app.workspace.onLayoutReady(() => {
      this.updateTransactionCache();
    });
  }

  /**
   * registerTxCacheSubscriptions takes a function which will be called any time
   * the transaction cache is updated. The cache will automatically be updated
   * whenever the ledger file is modified.
   */
  public registerTxCacheSubscription = (
    fn: (txCache: TransactionCache) => void,
  ): void => {
    this.txCacheSubscriptions.push(fn);
  };

  /**
   * deregisterTxCacheSubscription removes a function which was added using
   * registerTxCacheSubscription.
   */
  public deregisterTxCacheSubscription = (
    fn: (txCache: TransactionCache) => void,
  ): void => {
    this.txCacheSubscriptions.remove(fn);
  };

  private async loadSettings(): Promise<void> {
    this.settings = settingsWithDefaults(await this.loadData());
    this.saveData(this.settings);
  }

  /**
   * updateTransactionCache is called whenever a modification to the ledger file
   * is detected. The file will be reparsed and the txCache on this object will
   * be replaced. Subscriptions will be notified with the new txCache.
   */
  private readonly updateTransactionCache = async (): Promise<void> => {
    console.debug('ledger: Updating the transaction cache');
    this.txCache = await getTransactionCache(
      this.app.metadataCache,
      this.app.vault,
      this.settings,
    );

    this.txCacheSubscriptions.forEach((fn) => fn(this.txCache));
  };

  private readonly handleProtocolAction = (
    params: ObsidianProtocolData,
  ): void => {
    // TODO: Support pre-populating fields, or even completely skipping the form
    // by passing the correct data here.
    new AddExpenseModal(this).open();
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
