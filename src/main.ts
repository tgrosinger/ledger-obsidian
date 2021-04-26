import {
  appendLedger,
  ExpenseLine,
  formatExpense,
  getTransactionCache,
} from './file-interface';
import { billIcon } from './graphics';
import type { TransactionCache } from './parser';
import { ISettings, settingsWithDefaults } from './settings';
import AddExpenseUI from './ui/AddExpenseUI.svelte';
import type { default as MomentType } from 'moment';
import { addIcon, Modal, Plugin, TAbstractFile } from 'obsidian';

declare global {
  interface Window {
    moment: typeof MomentType;
  }
}

export default class LedgerPlugin extends Plugin {
  public settings: ISettings;
  public txCache: TransactionCache;

  public async onload(): Promise<void> {
    console.log('ledger: Loading plugin v' + this.manifest.version);

    await this.loadSettings();

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
  private readonly plugin: LedgerPlugin;

  constructor(plugin: LedgerPlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  public onOpen = (): void => {
    const { contentEl } = this;
    new AddExpenseUI({
      target: contentEl,
      props: {
        currencySymbol: this.plugin.settings.currencySymbol,
        saveFn: async (
          date: string,
          payee: string,
          lines: ExpenseLine[],
        ): Promise<void> => {
          const formatted = formatExpense(
            { date, payee, lines },
            this.plugin.settings,
          );
          await appendLedger(
            this.app.metadataCache,
            this.app.vault,
            this.plugin.settings,
            formatted,
          );
        },
        txCache: this.plugin.txCache,
        close: () => this.close(),
      },
    });
  };

  public onClose = (): void => {
    const { contentEl } = this;
    contentEl.empty();
  };
}
