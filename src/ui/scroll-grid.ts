// A drag-to-scroll grid of tappable cells inside a rectangle. Cells are built lazily as they scroll into view,
// so a grid of thousands of houses stays fast.
import { Container, Graphics, Rectangle, type FederatedPointerEvent } from 'pixi.js';
import { COLORS } from './kit.ts';

export type Cell = { draw(): Container; onTap(): void; selected?: boolean };

export class ScrollGrid {
  readonly view = new Container();
  private content = new Container();
  private maskG = new Graphics();
  private cells: Cell[] = [];
  private built = new Map<number, Container>();
  private w = 0;
  private h = 0;
  private size = 100;
  private cols = 1;
  private y = 0;
  private drag: { start: number; y: number; moved: boolean } | null = null;

  constructor() {
    this.view.addChild(this.maskG, this.content);
    this.content.mask = this.maskG;
    this.view.eventMode = 'static';
    this.view.on('pointerdown', (e) => (this.drag = { start: e.global.y, y: this.y, moved: false }));
    this.view.on('globalpointermove', (e) => this.move(e));
    this.view.on('pointerup', () => setTimeout(() => (this.drag = null)));
    this.view.on('pointerupoutside', () => (this.drag = null));
  }

  set(cells: Cell[], size: number): void {
    this.cells = cells;
    this.size = size;
    this.y = 0;
    this.rebuild();
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.maskG.clear().rect(0, 0, w, h).fill(0xffffff);
    this.view.hitArea = new Rectangle(0, 0, w, h);
    this.rebuild();
  }

  private move(e: FederatedPointerEvent): void {
    if (!this.drag) return;
    const dy = e.global.y - this.drag.start;
    if (Math.abs(dy) > 10) this.drag.moved = true;
    const rows = Math.ceil(this.cells.length / this.cols);
    this.y = Math.min(0, Math.max(Math.min(0, this.h - rows * this.size - 20), this.drag.y + dy));
    this.place();
  }

  private rebuild(): void {
    for (const c of this.built.values()) c.destroy({ children: true });
    this.built.clear();
    this.content.removeChildren();
    this.cols = Math.max(1, Math.floor(this.w / this.size));
    this.place();
  }

  /** Build the cells in view, drop the ones far out of view. */
  private place(): void {
    this.content.y = this.y;
    const first = Math.max(0, Math.floor(-this.y / this.size) - 1) * this.cols;
    const last = Math.min(this.cells.length, (Math.ceil((-this.y + this.h) / this.size) + 1) * this.cols);
    for (const [i, c] of this.built) {
      if (i < first || i >= last) {
        c.destroy({ children: true });
        this.built.delete(i);
      }
    }
    for (let i = first; i < last; i++) {
      if (this.built.has(i)) continue;
      const cell = this.cells[i];
      const box = new Container();
      const pad = 6;
      box.addChild(new Graphics().roundRect(pad, pad, this.size - pad * 2, this.size - pad * 2, 18).fill(cell.selected ? COLORS.pinkLight : COLORS.white).stroke({ color: cell.selected ? COLORS.pink : COLORS.plum, width: cell.selected ? 5 : 3 }));
      const art = cell.draw();
      art.position.set(this.size / 2, this.size / 2);
      box.addChild(art);
      box.position.set((i % this.cols) * this.size + (this.w - this.cols * this.size) / 2, Math.floor(i / this.cols) * this.size);
      box.eventMode = 'static';
      box.on('pointertap', () => {
        if (!this.drag?.moved) cell.onTap();
      });
      this.content.addChild(box);
      this.built.set(i, box);
    }
  }
}
