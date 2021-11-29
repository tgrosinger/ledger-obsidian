const defaultSettings: ISettings = {
  currencySymbol: '$',
  ledgerFile: 'Ledger.md',
  includeFinalLineAmount: false,
  enableLedgerVis: false,

  assetAccountsPrefix: 'a',
  expenseAccountsPrefix: 'e',
  incomeAccountsPrefix: 'i',
  liabilityAccountsPrefix: 'l',
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
