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
import {
  addIcon,
  Menu,
  MenuItem,
  Modal,
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

    // TODO: Consider switch to using a custom file type
    // This does however add an extra step to making sure it works with sync.
    // this.registerExtensions(['ledger'], LedgerViewType);

    // TODO: Look into moving this menu button into the header row.
    // Maybe using onLayoutChange, detect any Leafs with the Ledger file,
    // then use leaf.OnHeaderMenu.

    this.registerEvent(
      this.app.workspace.on(
        'file-menu',
        (
          menu: Menu,
          file: TAbstractFile,
          source: string,
          leaf: WorkspaceLeaf,
        ) => {
          if (
            this.settings.enableLedgerVis &&
            file.path === this.settings.ledgerFile
          ) {
            menu.addItem((item: MenuItem) => {
              item.setTitle('Switch to Ledger View');
              item.setIcon('ledger');
              item.setActive(true);
              item.onClick(() => {
                this.switchToLedgerView(leaf);
              });
            });
          }
        },
      ),
    );

    this.addCommand({
      id: 'open-ledger-view',
      name: 'Switch to Ledger View',
      checkCallback: (checking: boolean): boolean | void => {
        const activeLeaf = this.app.workspace.getMostRecentLeaf();
        if (checking) {
          const state = activeLeaf.view.getState();
          return (
            this.settings.enableLedgerVis &&
            state.file === this.settings.ledgerFile
          );
        }

        this.switchToLedgerView(activeLeaf);
      },
    });

    this.addCommand({
      id: 'open-markdown-view',
      name: 'Switch to Markdown View',
      checkCallback: (checking: boolean): boolean | void => {
        const activeLeaf = this.app.workspace.getMostRecentLeaf();
        if (checking) {
          const state = activeLeaf.view.getState();
          console.log(state);
          // TODO: This should check if we are currently in LedgerView, however
          // for some reason the type is not available on the view state here.
          return (
            this.settings.enableLedgerVis &&
            state.file === this.settings.ledgerFile
          );
        }

        this.switchToMarkdownView(activeLeaf);
      },
    });

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

  private readonly switchToMarkdownView = async (
    leaf: WorkspaceLeaf,
  ): Promise<void> => {
    const state = leaf.view.getState();
    await leaf.setViewState(
      {
        type: 'markdown',
        state,
        popstate: true,
      } as ViewState,
      { focus: true },
    );
  };

  private readonly switchToLedgerView = async (
    leaf: WorkspaceLeaf,
  ): Promise<void> => {
    const state = leaf.view.getState();
    await leaf.setViewState({
      type: LedgerViewType,
      state: { file: state.file },
      popstate: true,
    } as ViewState);
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
