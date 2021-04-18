const defaultSettings: ISettings = {
  currencySymbol: '$',
  ledgerFile: 'Ledger.md',
  includeFinalLineAmount: false,
};

export interface ISettings {
  currencySymbol: string;
  ledgerFile: string;
  includeFinalLineAmount: boolean;
}

export const settingsWithDefaults = (
  settings: Partial<ISettings>,
): ISettings => ({
  ...defaultSettings,
  ...settings,
});
