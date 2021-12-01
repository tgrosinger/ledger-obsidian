import { buyMeACoffee, paypal } from './graphics';
import LedgerPlugin from './main';
import { PluginSettingTab, Setting } from 'obsidian';

const defaultSettings: ISettings = {
  currencySymbol: '$',
  ledgerFile: 'Ledger.md',
  includeFinalLineAmount: false,
  enableLedgerVis: false,

  assetAccountsPrefix: 'Assets',
  expenseAccountsPrefix: 'Expenses',
  incomeAccountsPrefix: 'Income',
  liabilityAccountsPrefix: 'Liabilities',
};

export interface ISettings {
  currencySymbol: string;
  ledgerFile: string;
  includeFinalLineAmount: boolean;
  enableLedgerVis: boolean;

  assetAccountsPrefix: string;
  expenseAccountsPrefix: string;
  incomeAccountsPrefix: string;
  liabilityAccountsPrefix: string;
}

export const settingsWithDefaults = (
  settings: Partial<ISettings>,
): ISettings => ({
  ...defaultSettings,
  ...settings,
});

export class SettingsTab extends PluginSettingTab {
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
      .setDesc(
        'The category prefix used for grouping asset accounts. If you use aliases in your Ledger file, this must be the **unaliased** category prefix. e.g. "Assets" instead of "a"',
      )
      .addText((text) => {
        text.setValue(this.plugin.settings.assetAccountsPrefix);
        text.inputEl.onblur = (e: FocusEvent) => {
          this.plugin.settings.assetAccountsPrefix = (
            e.target as HTMLInputElement
          ).value;
          this.plugin.saveData(this.plugin.settings);
        };
      });

    new Setting(containerEl)
      .setName('Expense Category Prefix')
      .setDesc(
        'The category prefix used for grouping expense accounts. If you use aliases in your Ledger file, this must be the **unaliased** category prefix. e.g. "Expenses" instead of "e"',
      )
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
      .setDesc(
        'The category prefix used for grouping income accounts. If you use aliases in your Ledger file, this must be the **unaliased** category prefix. e.g. "Income" instead of "i"',
      )
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
      .setDesc(
        'The category prefix used for grouping liability accounts. If you use aliases in your Ledger file, this must be the **unaliased** category prefix. e.g. "Liabilities" instead of "l"',
      )
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
