// A pop-up grid panel (what's in the fridge, hairstyles at the salon...). One open at a time; back or ✖ closes it.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { COLORS, label, roundButton } from './kit.ts';
import { ScrollGrid, type Cell } from './scroll-grid.ts';

export class Panel {
  readonly view = new Container();
  open = false;
  private bg = new Graphics();
  private title = label('', 30);
  private grid = new ScrollGrid();
  private extra = new Container();
  private close = roundButton('✖️', () => this.hide(), 60);
  private size = { w: 0, h: 0 };
  private pending: { title: string; cells: () => Cell[]; cell: number; side: 'left' | 'right'; extra?: () => Container } | null = null;

  constructor() {
    this.view.addChild(this.bg, this.title, this.extra, this.grid.view, this.close);
    this.view.visible = false;
    this.view.eventMode = 'static';
    this.view.on('pointerdown', (e) => e.stopPropagation());
  }

  /** Show a panel; `cells` is called again by refresh() so a selection can update. */
  show(title: string, cells: () => Cell[], opts: { cell?: number; side?: 'left' | 'right'; extra?: () => Container } = {}): void {
    this.pending = { title, cells, cell: opts.cell ?? 104, side: opts.side ?? 'right', extra: opts.extra };
    this.open = true;
    this.view.visible = true;
    this.draw();
  }

  refresh(): void {
    if (this.open) this.draw();
  }

  hide(): void {
    this.open = false;
    this.view.visible = false;
    this.pending = null;
  }

  layout(w: number, h: number): void {
    this.size = { w, h };
    if (this.open) this.draw();
  }

  private draw(): void {
    const p = this.pending;
    if (!p) return;
    const { w, h } = this.size;
    const pw = Math.min(560, w * 0.48), y0 = 110, ph = h - 230;
    const x0 = p.side === 'left' ? 110 : w - pw - 20;
    this.bg.clear().roundRect(x0, y0, pw, ph, 30).fill(COLORS.cream).stroke({ color: COLORS.plum, width: 4 });
    this.view.hitArea = new Rectangle(x0, y0, pw, ph);
    this.title.text = p.title;
    this.title.position.set(x0 + pw / 2, y0 + 34);
    this.close.position.set(x0 + pw - 30, y0 + 30);
    this.extra.removeChildren().forEach((c) => c.destroy({ children: true }));
    let top = y0 + 70;
    if (p.extra) {
      const ex = p.extra();
      ex.position.set(x0 + 20, top);
      this.extra.addChild(ex);
      top += ex.height + 10;
    }
    this.grid.view.position.set(x0 + 10, top);
    this.grid.resize(pw - 20, y0 + ph - top - 10);
    this.grid.set(p.cells(), p.cell);
  }
}
