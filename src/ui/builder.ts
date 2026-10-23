// "In bottom left a hammer. If hammer pressed pick a place to build a house. There are thousands of houses to choose
// from. You can choose if your house has furniture in already or you can decorate."
import { Container, Graphics } from 'pixi.js';
import type { Scene } from '../app/scenes.ts';
import type { Game } from '../app/game.ts';
import { HOUSE_STYLES } from '../../schemas/house.ts';
import { houses } from '../data/index.ts';
import { DOORS, HUES, ROOFS, drawHouse, variantFor } from '../art/house-art.ts';
import { hexNum } from '../art/color.ts';
import { LOT_COUNT, persist } from '../world/state.ts';
import { COLORS, label, pillButton } from './kit.ts';
import { ScrollGrid, type Cell } from './scroll-grid.ts';
import { playSound } from './sound.ts';

const STYLE_EMOJI: Record<string, string> = { cottage: '🏡', modern: '🏢', mansion: '🏰', beach: '🏖️', cabin: '🪵', castle: '👑', apartment: '🏬', farmhouse: '🌾', treehouse: '🌳', spooky_cute: '🎃' };

export class BuilderScene implements Scene {
  readonly name = 'builder';
  readonly view = new Container();
  private game: Game;
  private lot: string | undefined;
  /** The house picked (step 2), then its colour (step 3). */
  private house: string | null = null;
  private pick: { house: string; variant: number } | null = null;
  /** Colours chosen on the colour step (indexes into HUES, ROOFS, DOORS); null keeps the blueprint's own colours. */
  private colours: { wall: number; roof: number; door: number } | null = null;
  private style: string | null = null;
  private bg = new Graphics();
  private heading = label('', 40);
  private grid = new ScrollGrid();
  private bar = new Container();
  private size = { w: 0, h: 0 };

  constructor(game: Game, lot?: string) {
    this.game = game;
    this.lot = lot;
    this.view.addChild(this.bg, this.heading, this.bar, this.grid.view);
  }

  layout(w: number, h: number): void {
    this.size = { w, h };
    this.bg.clear().rect(0, 0, w, h).fill(0xc9f2d4);
    this.heading.position.set(w / 2, 56);
    this.step();
  }

  private step(): void {
    const { w, h } = this.size;
    this.bar.removeChildren();
    this.grid.view.visible = true;
    this.grid.view.position.set(40, 180);
    this.grid.resize(w - 80, h - 200);
    if (!this.lot) {
      this.heading.text = '🔨 Where do you want to build?';
      const cells: Cell[] = [];
      for (let i = 1; i <= LOT_COUNT; i++) {
        const id = `lot_${i}`;
        const lot = this.game.world.lots[id];
        const house = lot && houses.get(lot.house);
        cells.push({
          draw: () => {
            if (!house) return label(`🌱\nLot ${i}`, 28);
            const g = new Graphics();
            drawHouse(g, house, lot.variant, 120);
            g.y = 60;
            return g;
          },
          onTap: () => {
            this.lot = id;
            this.step();
          },
        });
      }
      this.grid.set(cells, 190);
      return;
    }
    if (!this.house) {
      const list = [...houses.values()].filter((hh) => !this.style || hh.style === this.style);
      this.heading.text = '🏠 Pick a house';
      // Style filter chips.
      [null, ...HOUSE_STYLES.filter((s) => [...houses.values()].some((hh) => hh.style === s))].forEach((s, i) => {
        const b = pillButton(s ? STYLE_EMOJI[s] ?? '🏠' : '⭐', () => {
          this.style = s;
          this.step();
        }, 70, 60, s === this.style ? COLORS.pink : COLORS.white);
        b.position.set(80 + i * 80, 130);
        this.bar.addChild(b);
      });
      // Each house once; its colour is picked next.
      this.grid.set(list.map((house) => ({
        draw: () => houseCell(house.id, 0, house.name),
        onTap: () => {
          this.house = house.id;
          this.step();
        },
      })), 200);
      return;
    }
    if (!this.pick) {
      // Pick the colours: walls, roof and door swatches beside a big picture of the house.
      const house = houses.get(this.house)!;
      this.heading.text = `🎨 Colour your ${house.name}`;
      this.grid.view.visible = false;
      const variant = this.colours ? variantFor(this.colours.wall, this.colours.roof, this.colours.door) : 0;
      const g = new Graphics();
      drawHouse(g, house, variant, Math.min(w * 0.36, h * 0.45));
      g.position.set(w * 0.26, h * 0.8);
      this.bar.addChild(g);
      const x0 = w * 0.5, rowGap = Math.min(110, h * 0.17);
      const rows: [string, string[], 'wall' | 'roof' | 'door'][] = [['Walls', HUES, 'wall'], ['Roof', ROOFS, 'roof'], ['Door', DOORS, 'door']];
      rows.forEach(([name, list, key], r) => {
        const y = h * 0.3 + r * rowGap;
        const t = label(name, 26);
        t.anchor.set(0, 0.5);
        t.position.set(x0, y - 34);
        this.bar.addChild(t);
        const size = Math.min(40, (w * 0.46) / 12 - 6);
        list.forEach((col, i) => {
          const on = this.colours?.[key] === i;
          const sw = new Graphics().circle(0, 0, size / 2).fill(hexNum(col)).stroke({ color: on ? COLORS.pink : 0x5a3d4f, width: on ? 5 : 2 });
          sw.position.set(x0 + size / 2 + i * (size + 6), y + 6);
          sw.eventMode = 'static';
          sw.cursor = 'pointer';
          sw.on('pointertap', () => {
            this.colours = { wall: 0, roof: 0, door: 0, ...this.colours, [key]: i };
            playSound('pop');
            this.step();
          });
          this.bar.addChild(sw);
        });
      });
      const own = pillButton('✨ Original colours', () => {
        this.colours = null;
        this.step();
      }, 280, 60, this.colours ? 0xb197fc : COLORS.pink);
      own.position.set(x0 + 130, h * 0.3 + 3 * rowGap);
      const back = pillButton('⬅️ Houses', () => {
        this.house = null;
        this.colours = null;
        this.step();
      }, 200, 60);
      back.position.set(140, 130);
      const next = pillButton('Next ➡️', () => {
        this.pick = { house: house.id, variant };
        this.step();
      }, 220, 80, 0x7fd1c7);
      next.position.set(w - 160, h - 70);
      this.bar.addChild(own, back, next);
      return;
    }
    // Furnished or empty?
    this.heading.text = 'Furniture already in, or decorate it yourself?';
    this.grid.view.visible = false;
    const house = houses.get(this.pick.house)!;
    const g = new Graphics();
    drawHouse(g, house, this.pick.variant, Math.min(w, h) * 0.35);
    g.position.set(w / 2, h * 0.55);
    this.bar.addChild(g);
    const furnished = pillButton('🛋️ Furnished', () => this.done(true), 300, 90);
    const empty = pillButton('📦 Empty', () => this.done(false), 300, 90, 0x7fd1c7);
    furnished.position.set(w / 2 - 180, h * 0.8);
    empty.position.set(w / 2 + 180, h * 0.8);
    this.bar.addChild(furnished, empty);
  }

  private done(furnished: boolean): void {
    const w = this.game.world;
    const lot = this.lot!;
    w.lots[lot] = { house: this.pick!.house, variant: this.pick!.variant, furnished };
    // A rebuilt lot starts fresh.
    for (const k of Object.keys(w.layouts)) if (k.startsWith(`${lot}:`)) delete w.layouts[k];
    for (const p of w.people) if (p.at?.place === lot) p.at = undefined;
    persist(w);
    playSound('tada');
    this.game.stack.pop();
    this.game.openPlace(lot);
  }
}

/** A house in one of its colours, with its name under it (if given). */
function houseCell(id: string, variant: number, name: string): Container {
  const c = new Container();
  const g = new Graphics();
  // Tall houses (castles, mansions) shrink to fit the card.
  const house = houses.get(id)!;
  const floors = house.floors.filter((f) => !f.outdoor).length || 1;
  drawHouse(g, house, variant, Math.min(130, 150 / (floors * 0.42 + 0.55)));
  g.y = 62;
  c.addChild(g);
  if (name) {
    const n = label(name, 15);
    n.y = 80;
    c.addChild(n);
  }
  return c;
}
