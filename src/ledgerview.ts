import type LedgerPlugin from './main';
import * as d3 from 'd3';
import { range, scaleLinear } from 'd3';
import { ItemView, TAbstractFile, WorkspaceLeaf } from 'obsidian';

export const LedgerViewType = 'ledger';

export class LedgerView extends ItemView {
  private readonly plugin: LedgerPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: LedgerPlugin) {
    super(leaf);
    this.plugin = plugin;

    this.registerEvent(
      this.app.vault.on('modify', (file: TAbstractFile) => {
        if (file.path === this.plugin.settings.ledgerFile) {
          this.reloadData();
        }
      }),
    );

    this.reloadData();
    this.redraw();
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

  public readonly redraw = (): void => {
    const contentEl = this.containerEl.children[1];

    console.debug('ledger: Rendering preview for ledger file');
    contentEl.empty();
    const p = contentEl.createEl('p');
    p.setText('Hello world 2');

    const div = contentEl.createDiv();
    div.appendChild(this.makeSimpleBarD3());
  };

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

  private readonly reloadData = (): void => {
    throw new Error('Not Implemented');
  };
}
