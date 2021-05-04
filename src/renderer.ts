import type LedgerPlugin from './main';

export class Renderer {
  private readonly plugin: LedgerPlugin;
  private dirty: boolean;

  constructor(plugin: LedgerPlugin) {
    this.plugin = plugin;
    this.dirty = true;
  }

  public readonly markFileChanged = (): void => {
    this.dirty = true;
  };

  public readonly render = (el: HTMLElement): void => {
    if (!this.dirty) {
      console.debug('ledger: Ledger file unchanged, skipping render');
      return;
    }

    console.debug('ledger: Rendering preview for ledger file');
    el.empty();
    const p = el.createEl('p');
    p.setText('Hello world 2');

    this.dirty = false;
  };
}
