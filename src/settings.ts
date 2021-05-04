const defaultSettings: ISettings = {
  currencySymbol: '$',
  ledgerFile: 'Ledger.md',
  includeFinalLineAmount: false,
  enableLedgerVis: false,

  useExternalLedger: false,
  ledgerPath: '', // TODO
};

export interface ISettings {
  currencySymbol: string;
  ledgerFile: string;
  includeFinalLineAmount: boolean;
  enableLedgerVis: boolean;

  useExternalLedger: boolean;
  ledgerPath: string;
}

export const settingsWithDefaults = (
  settings: Partial<ISettings>,
): ISettings => ({
  ...defaultSettings,
  ...settings,
});
