import { addIcon, App, Modal, Plugin } from 'obsidian';
import AddExpenseUI from './ui/AddExpenseUI.svelte';
import { billIcon } from './graphics';
import { ISettings, settingsWithDefaults } from './settings';
import { appendLedger, expenseLine, formatExpense } from './file-interface';

export default class LedgerPlugin extends Plugin {
  public settings: ISettings;

  public async onload(): Promise<void> {
    console.log('loading ledger plugin');

    await this.loadSettings();

    addIcon('ledger', billIcon);
    this.addRibbonIcon('ledger', 'Add to Ledger', () => {
      new AddExpenseModal(this.app, this.settings).open();
    });
  }

  private async loadSettings(): Promise<void> {
    this.settings = settingsWithDefaults(await this.loadData());
    this.saveData(this.settings);
  }
}

class AddExpenseModal extends Modal {
  private readonly settings: ISettings;

  constructor(app: App, settings: ISettings) {
    super(app);
    this.settings = settings;
  }

  public onOpen = (): void => {
    const { contentEl } = this;
    new AddExpenseUI({
      target: contentEl,
      props: {
        currencySymbol: this.settings.currencySymbol,
        saveFn: async (
          date: string,
          payee: string,
          lines: expenseLine[],
        ): Promise<void> => {
          const formatted = formatExpense(date, payee, lines, this.settings);
          await appendLedger(
            this.app.metadataCache,
            this.app.vault,
            this.settings,
            formatted,
          );
        },
        close: () => this.close(),
      },
    });
  };

  public onClose = (): void => {
    const { contentEl } = this;
    contentEl.empty();
  };
}
