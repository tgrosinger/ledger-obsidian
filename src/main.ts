import {
  appendLedger,
  ExpenseLine,
  formatExpense,
  getTransactionCache,
  Transaction,
} from './file-interface';
import { billIcon } from './graphics';
import { ISettings, settingsWithDefaults } from './settings';
import AddExpenseUI from './ui/AddExpenseUI.svelte';
import type { default as MomentType } from 'moment';
import { addIcon, App, Modal, Plugin, TAbstractFile } from 'obsidian';

declare global {
  interface Window {
    moment: typeof MomentType;
  }
}

export default class LedgerPlugin extends Plugin {
  public settings: ISettings;
  private txCache: Transaction[];

  public async onload(): Promise<void> {
    console.log('loading ledger plugin');

    await this.loadSettings();

    addIcon('ledger', billIcon);
    this.addRibbonIcon('ledger', 'Add to Ledger', () => {
      new AddExpenseModal(this.app, this.txCache, this.settings).open();
    });

    this.registerEvent(
      this.app.vault.on('modify', (file: TAbstractFile) => {
        if (file.name === this.settings.ledgerFile) {
          this.updateTransactionCache();
        }
      }),
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
}

class AddExpenseModal extends Modal {
  private readonly settings: ISettings;
  private readonly txCache: Transaction[];

  constructor(app: App, txCache: Transaction[], settings: ISettings) {
    super(app);
    this.txCache = txCache;
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
          lines: ExpenseLine[],
        ): Promise<void> => {
          const formatted = formatExpense(
            { date, payee, lines },
            this.settings,
          );
          await appendLedger(
            this.app.metadataCache,
            this.app.vault,
            this.settings,
            formatted,
          );
        },
        txCache: this.txCache,
        close: () => this.close(),
      },
    });
  };

  public onClose = (): void => {
    const { contentEl } = this;
    contentEl.empty();
  };
}
