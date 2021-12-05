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
