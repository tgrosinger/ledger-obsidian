const defaultSettings: ISettings = {
  tutorialIndex: 0,

  currencySymbol: '$',
  ledgerFile: 'transactions.ledger',
  includeFinalLineAmount: false,
  enableLedgerVis: false,

  assetAccountsPrefix: 'Assets',
  expenseAccountsPrefix: 'Expenses',
  incomeAccountsPrefix: 'Income',
  liabilityAccountsPrefix: 'Liabilities',
};

export interface ISettings {
  tutorialIndex: number;

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
