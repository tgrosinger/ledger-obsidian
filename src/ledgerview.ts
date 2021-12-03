import type LedgerPlugin from './main';
import { LedgerDashboard } from './ui/LedgerDashboard';
import * as d3 from 'd3';
import { range, scaleLinear } from 'd3';
import { TextFileView, TFile, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom';

export const LedgerViewType = 'ledger';

export class LedgerView extends TextFileView {
  private readonly plugin: LedgerPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: LedgerPlugin) {
    super(leaf);
    this.plugin = plugin;

    this.redraw();
  }

  public canAcceptExtension(extension: string): boolean {
    return extension === 'ledger' || extension === 'md';
  }

  public getViewType(): string {
    return LedgerViewType;
  }

  public getDisplayText(): string {
    return 'Ledger';
  }

  public getIcon(): string {
    return 'ledger';
  }

  public getViewData(): string {
    console.debug('Ledger: returning view data');
    return this.data;
  }

  public setViewData(data: string, clear: boolean): void {
    console.debug('Ledger: setting view data');

    // TODO: Update the txCache and call redraw()

    // TODO: This might not tell me about all file modify events
  }

  public clear(): void {
    console.debug('Ledger: clearing view');
  }

  public onload(): void {
    console.debug('Ledger: loading dashboard');
  }

  public onunload(): void {
    console.debug('Ledger: unloading dashboard');
  }

  public async onLoadFile(file: TFile): Promise<void> {
    console.debug('Ledger: File being loaded: ' + file.path);

    // TODO: Update the txCache and call redraw();
    // (unless this call is redundant with setViewData)
  }

  public async onUnloadFile(file: TFile): Promise<void> {
    console.debug('Ledger: File being unloaded: ' + file.path);

    // TODO: Use this to persist any changes that need to be saved.
  }

  public readonly redraw = (): void => {
    console.debug('Ledger: Creating dashboard view');

    const contentEl = this.containerEl.children[1];
    ReactDOM.render(
      React.createElement(LedgerDashboard, {
        currencySymbol: this.plugin.settings.currencySymbol,
        txCache: this.plugin.txCache,
      }),
      this.contentEl,
    );
  };

  // TODO: Create a save function that can be passed into the React app to save
  // data back to the file.  Look into what the existing save function on this
  // class does and whether that can be leveraged (maybe it calls getViewData).

  private readonly makeSimpleBarD3 = (): SVGSVGElement => {
    // https://www.essycode.com/posts/create-sparkline-charts-d3/
    const WIDTH = 160;
    const HEIGHT = 30;
    const DATA_COUNT = 40;
    const BAR_WIDTH = (WIDTH - DATA_COUNT) / DATA_COUNT;
    const data = range(DATA_COUNT).map((d) => Math.random());
    const x = scaleLinear().domain([0, DATA_COUNT]).range([0, WIDTH]);
    const y = scaleLinear().domain([0, 1]).range([HEIGHT, 0]);

    const svg = d3.create('svg').attr('width', WIDTH).attr('height', HEIGHT);
    const g = svg.append('g');
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d, i) => x(i))
      .attr('y', (d) => HEIGHT - y(d))
      .attr('width', BAR_WIDTH)
      .attr('height', (d) => y(d))
      .attr('fill', 'MediumSeaGreen');
    return svg.node();
  };
}
