import type { TFile, Vault } from 'obsidian';

const dateRe = /^\d{4}\/\d{2}\/\d{2}/;

export interface Transaction {}

export class Parser {
  private readonly file: TFile;
  private readonly vault: Vault;

  constructor(file: TFile, vault: Vault) {
    this.file = file;
    this.vault = vault;
  }

  public parse = async () => {
    const fileContents = await this.vault.read(this.file);
    const splitFileContents = fileContents.split('\n');
    for (let i = 0; i < splitFileContents.length; i++) {
      if (!dateRe.test(splitFileContents[i])) {
        continue;
      }
    }
  };

  private readonly extractTransaction = (
    lines: string[],
    i: number,
  ): Transaction | undefined => {};
}
