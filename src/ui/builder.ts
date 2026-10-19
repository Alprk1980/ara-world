// "In bottom left a hammer. If hammer pressed pick a place to build a house. There are thousands of houses to choose
// from. You can choose if your house has furniture in already or you can decorate."
import { Container, Graphics } from 'pixi.js';
import type { Scene } from '../app/scenes.ts';
import type { Game } from '../app/game.ts';
import { HOUSE_STYLES } from '../../schemas/house.ts';
import { houses } from '../data/index.ts';
import { drawHouse, VARIANTS } from '../art/house-art.ts';
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
  private pick: { house: string; variant: number } | null = null;
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
    if (!this.pick) {
      const list = [...houses.values()].filter((hh) => !this.style || hh.style === this.style);
      this.heading.text = `🏠 Pick a house (${(houses.size * VARIANTS).toLocaleString()} to choose from!)`;
      // Style filter chips.
      [null, ...HOUSE_STYLES.filter((s) => [...houses.values()].some((hh) => hh.style === s))].forEach((s, i) => {
        const b = pillButton(s ? STYLE_EMOJI[s] ?? '🏠' : '⭐', () => {
          this.style = s;
          this.step();
        }, 70, 60, s === this.style ? COLORS.pink : COLORS.white);
        b.position.set(80 + i * 80, 130);
        this.bar.addChild(b);
      });
      const cells: Cell[] = [];
      for (const house of list)
        for (let v = 0; v < VARIANTS; v++)
          cells.push({
            draw: () => {
              const c = new Container();
              const g = new Graphics();
              drawHouse(g, house, v, 130);
              g.y = 50;
              const n = label(house.name, 15);
              n.y = 80;
              c.addChild(g, n);
              return c;
            },
            onTap: () => {
              this.pick = { house: house.id, variant: v };
              this.step();
            },
          });
      this.grid.set(cells, 200);
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
