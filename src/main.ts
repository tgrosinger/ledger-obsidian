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
  TFile,
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
    this.addRibbonIcon('ledger', 'Add to Ledger', async () => {
      await this.createLedgerFileIfMissing();
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
      callback: async () => {
        await this.createLedgerFileIfMissing();
        new AddExpenseModal(this).open();
      },
    });

    this.addCommand({
      id: 'ledger-open-dashboard',
      name: 'Open Ledger dashboard',
      icon: 'ledger',
      callback: this.openLedgerDashboard,
    });

    this.addCommand({
      id: 'ledger-intro-tutorial',
      name: 'Reset Ledger Tutorial progress',
      icon: 'ledger',
      callback: () => {
        this.settings.tutorialIndex = 0;
        this.saveData(this.settings);
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

  private readonly openLedgerDashboard = async (): Promise<void> => {
    let leaf = this.app.workspace.activeLeaf;
    if (leaf.getViewState().pinned) {
      leaf = this.app.workspace.splitActiveLeaf('horizontal');
    }

    const ledgerTFile = await this.createLedgerFileIfMissing();
    leaf.openFile(ledgerTFile);
  };

  private readonly createLedgerFileIfMissing = async (): Promise<TFile> => {
    let ledgerTFile = this.app.vault
      .getFiles()
      .find((file) => file.path === this.settings.ledgerFile);
    if (!ledgerTFile) {
      ledgerTFile = await this.app.vault.create(
        this.settings.ledgerFile,
        this.generateLedgerFileExampleContent(),
      );
      await this.updateTransactionCache();
    }
    return ledgerTFile;
  };

  private readonly generateLedgerFileExampleContent = (): string =>
    `alias a=${this.settings.assetAccountsPrefix}
alias b=${this.settings.assetAccountsPrefix}:Banking
alias c=${this.settings.liabilityAccountsPrefix}:Credit
alias l=${this.settings.liabilityAccountsPrefix}
alias e=${this.settings.expenseAccountsPrefix}
alias i=${this.settings.incomeAccountsPrefix}

; Lines starting with a semicolon are comments and will not be parsed.

; This is an example of what a transaction looks like.
; Every transaction must balance to 0 if you add up all the lines.
; If the last line is left empty, it will automatically balance the transaction.
; 
; 2021-12-25 Starbucks Coffee
;     e:Food:Treats     $5.25   ; To this account
;     c:Chase                           ; From this account

; Use this transaction to fill in the balances from your bank accounts.
; This only needs to be done once, and enables you to reconcile your
; Ledger file with your bank account statements.

${window.moment().format('YYYY-MM-DD')} Starting Balances
    ; Add a line for each bank account or credit card
    c:Chase                   $-250.45
    b:BankOfAmerica    $450.27
    StartingBalance      ; Leave this line alone

; I highly recommend reading through the Ledger documentation about the basics
; of accounting with Ledger
;     https://www.ledger-cli.org/3.0/doc/ledger3.html#Principles-of-Accounting-with-Ledger

; Lots more information about this format can be found on the
; Ledger CLI homepage. Please note however that not quite all
; of the Ledger CLI functionality is supported by this plugin.
;     https://www.ledger-cli.org

; You can add transactions here easily using the "Add to Ledger"
; Command in Obsidian. You can even make a shortcut to it on your
; mobile phone homescreen. See the README for more information.

; If you have questions, please use the Github discussions:
;     https://github.com/tgrosinger/ledger-obsidian/discussions/landing
; If you encounter issues, please search the existing Github issues,
; and create a new one if your issue has not already been solved.
;     https://github.com/tgrosinger/ledger-obsidian/issues
`;

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
      this.settings.ledgerFile,
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
        displayFileWarning:
          !this.plugin.settings.ledgerFile.endsWith('.ledger'),
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
