import {
  appendLedger,
  formatExpense,
  getTransactionCache,
} from './file-interface';
import { billIcon, buyMeACoffee, paypal } from './graphics';
import { LedgerView, LedgerViewType } from './ledgerview';
import type { Transaction, TransactionCache } from './parser';
import { ISettings, settingsWithDefaults } from './settings';
import { CreateLedgerEntry } from './ui/CreateLedgerEntry';
import type { default as MomentType } from 'moment';
import {
  addIcon,
  Modal,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  TAbstractFile,
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

class SettingsTab extends PluginSettingTab {
  private readonly plugin: LedgerPlugin;

  constructor(plugin: LedgerPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  public display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Ledger Plugin - Settings' });

    new Setting(containerEl)
      .setName('Currency Symbol')
      .setDesc('Prefixes all transaction amounts')
      .addText((text) => {
        text.setPlaceholder('$').setValue(this.plugin.settings.currencySymbol);
        text.inputEl.onblur = (e: FocusEvent) => {
          this.plugin.settings.currencySymbol = (
            e.target as HTMLInputElement
          ).value;
          this.plugin.saveData(this.plugin.settings);
        };
      });

    new Setting(containerEl)
      .setName('Ledger File')
      .setDesc('Path in the Vault to your Ledger file. Must be a .md file.')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.ledgerFile)
          .setPlaceholder('Ledger.md');
        text.inputEl.onblur = (e: FocusEvent) => {
          this.plugin.settings.ledgerFile = (
            e.target as HTMLInputElement
          ).value;
          this.plugin.saveData(this.plugin.settings);
        };
      });

    new Setting(containerEl)
      .setName('Include final line amount')
      .setDesc(
        'Include the dollar amount on the final line of a transaction. This value is optional, and is alway equal to the sum of the previous lines * -1.',
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.includeFinalLineAmount)
          .onChange((value) => {
            this.plugin.settings.includeFinalLineAmount = value;
            this.plugin.saveData(this.plugin.settings);
          });
      });

    containerEl.createEl('h3', 'Transaction Category Prefixes');

    containerEl.createEl('p', {
      text: "Ledger uses categories to group exense types. Categories are grouped into a hierarchy by separating with a colon. For example 'expenses:food:grocery' and 'expenses:food:restaurants",
    });

    new Setting(containerEl)
      .setName('Asset Category Prefix')
      .setDesc('The category prefix used for grouping asset accounts.')
      .addText((text) => {
        text.setValue(this.plugin.settings.assetAccountsPrefix);
        text.inputEl.onblur = (e: FocusEvent) => {
          const target = e.target as HTMLInputElement;
          const value = target.value;

          if (value.contains(':')) {
            target.setCustomValidity(
              'Alias must not contain a colon character',
            );
          } else {
            target.setCustomValidity('');
            this.plugin.settings.assetAccountsPrefix = value;
            this.plugin.saveData(this.plugin.settings);
          }
        };
      });

    new Setting(containerEl)
      .setName('Expense Category Prefix')
      .setDesc('The category prefix used for grouping expense accounts.')
      .addText((text) => {
        text.setValue(this.plugin.settings.expenseAccountsPrefix);
        text.inputEl.onblur = (e: FocusEvent) => {
          this.plugin.settings.expenseAccountsPrefix = (
            e.target as HTMLInputElement
          ).value;
          this.plugin.saveData(this.plugin.settings);
        };
      });

    new Setting(containerEl)
      .setName('Income Category Prefix')
      .setDesc('The category prefix used for grouping income accounts.')
      .addText((text) => {
        text.setValue(this.plugin.settings.incomeAccountsPrefix);
        text.inputEl.onblur = (e: FocusEvent) => {
          this.plugin.settings.incomeAccountsPrefix = (
            e.target as HTMLInputElement
          ).value;
          this.plugin.saveData(this.plugin.settings);
        };
      });

    new Setting(containerEl)
      .setName('Liability Category Prefix')
      .setDesc('The category prefix used for grouping liability accounts.')
      .addText((text) => {
        text.setValue(this.plugin.settings.liabilityAccountsPrefix);
        text.inputEl.onblur = (e: FocusEvent) => {
          this.plugin.settings.liabilityAccountsPrefix = (
            e.target as HTMLInputElement
          ).value;
          this.plugin.saveData(this.plugin.settings);
        };
      });

    const div = containerEl.createEl('div', {
      cls: 'ledger-donation',
    });

    const donateText = document.createElement('p');
    donateText.appendText(
      'If this plugin adds value for you and you would like to help support ' +
        'continued development, please use the buttons below:',
    );
    div.appendChild(donateText);

    const parser = new DOMParser();

    div.appendChild(
      createDonateButton(
        'https://paypal.me/tgrosinger',
        parser.parseFromString(paypal, 'text/xml').documentElement,
      ),
    );

    div.appendChild(
      createDonateButton(
        'https://www.buymeacoffee.com/tgrosinger',
        parser.parseFromString(buyMeACoffee, 'text/xml').documentElement,
      ),
    );
  }
}

const createDonateButton = (link: string, img: HTMLElement): HTMLElement => {
  const a = document.createElement('a');
  a.setAttribute('href', link);
  a.addClass('ledger-donate-button');
  a.appendChild(img);
  return a;
};
