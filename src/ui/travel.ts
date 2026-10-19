// "There's also trains and buses" + "airport with planes": drop someone on a vehicle and pick where to go.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { houses, places } from '../data/index.ts';
import type { Person, World } from '../world/state.ts';
import { COLORS, label, roundButton } from './kit.ts';
import { ScrollGrid, type Cell } from './scroll-grid.ts';

export type Destination = { id: string; emoji: string; name: string };

/** Everywhere you can travel to: places on the map (hidden ones once found) and built homes. */
export function destinations(w: World, from: string): Destination[] {
  const out: Destination[] = [];
  for (const [lot, l] of Object.entries(w.lots)) out.push({ id: lot, emoji: '🏡', name: houses.get(l.house)?.name ?? 'Home' });
  for (const p of places.values()) if ((!p.hidden || w.found.includes(p.id))) out.push({ id: p.id, emoji: p.emoji, name: p.name });
  return out.filter((d) => d.id !== from);
}

export class TravelPicker {
  readonly view = new Container();
  open = false;
  private bg = new Graphics();
  private title = label('', 32);
  private grid = new ScrollGrid();
  private close = roundButton('✖️', () => this.hide(), 60);
  private size = { w: 0, h: 0 };
  private pending: { list: Destination[]; go: (id: string) => void; title: string } | null = null;

  constructor() {
    this.view.addChild(this.bg, this.title, this.grid.view, this.close);
    this.view.visible = false;
    this.view.eventMode = 'static';
    this.view.on('pointerdown', (e) => e.stopPropagation());
  }

  show(person: Person, vehicleEmoji: string, list: Destination[], go: (id: string) => void): void {
    this.open = true;
    this.view.visible = true;
    this.pending = { list, go, title: `${vehicleEmoji} Where is ${person.name} going?` };
    this.draw();
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
    const x0 = 110, y0 = 100, pw = w - 220, ph = h - 200;
    this.bg.clear().roundRect(x0, y0, pw, ph, 30).fill(COLORS.cream).stroke({ color: COLORS.plum, width: 4 });
    this.view.hitArea = new Rectangle(x0, y0, pw, ph);
    this.title.text = p.title;
    this.title.position.set(x0 + pw / 2, y0 + 40);
    this.close.position.set(x0 + pw - 34, y0 + 34);
    this.grid.view.position.set(x0 + 10, y0 + 80);
    this.grid.resize(pw - 20, ph - 90);
    const cells: Cell[] = p.list.map((d) => ({
      draw: () => {
        const c = new Container();
        const e = label(d.emoji, 52);
        e.y = -14;
        const n = label(d.name, 15);
        n.y = 44;
        n.style.wordWrap = true;
        n.style.wordWrapWidth = 120;
        c.addChild(e, n);
        return c;
      },
      onTap: () => {
        const go = p.go;
        this.hide();
        go(d.id);
      },
    }));
    this.grid.set(cells, 140);
  }
}
