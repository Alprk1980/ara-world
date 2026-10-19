// The town: districts of places side by side (drag to scroll), house lots, and a bus and a train going by.
import { Container, Graphics, Rectangle, Sprite, type FederatedPointerEvent } from 'pixi.js';
import type { Scene } from '../app/scenes.ts';
import type { Game } from '../app/game.ts';
import { DISTRICTS } from '../../schemas/place.ts';
import { houses, items, places, templates } from '../data/index.ts';
import { drawBuilding, drawHouse } from '../art/house-art.ts';
import { itemSize, itemSprite } from '../art/geometry.ts';
import { LOT_COUNT } from '../world/state.ts';
import { COLORS, label, makeTappable } from './kit.ts';

const DISTRICT_NAMES: Record<string, string> = {
  homes: '🏡 Homes', downtown: '🏙️ Downtown', shopping: '🛍️ Shopping', fun: '🎡 Fun Land', nature: '🌳 Nature',
  travel: '✈️ Travel', care: '🏫 School & Care', sky: '☁️ Up High',
};
const CARD = 150;

export class MapScene implements Scene {
  readonly name = 'map';
  readonly view = new Container();
  private game: Game;
  private bg = new Graphics();
  private strip = new Container();
  private vehicles: { s: Container; speed: number; y: number }[] = [];
  private stripW = 0;
  private screen = { w: 0, h: 0 };
  private pan: { x: number; start: number } | null = null;
  private moved = false;

  constructor(game: Game) {
    this.game = game;
    this.view.addChild(this.bg, this.strip);
    this.view.eventMode = 'static';
    this.view.on('pointerdown', (e) => this.down(e));
    this.view.on('globalpointermove', (e) => this.move(e));
    this.view.on('pointerup', () => (this.pan = null));
    this.view.on('pointerupoutside', () => (this.pan = null));
  }

  /** Rebuild when returning (a house may have been built, a place found). */
  private build(h: number): void {
    this.strip.removeChildren();
    this.vehicles = [];
    const rows = Math.max(1, Math.floor((h - 260) / (CARD + 40)));
    let x = 140;
    for (const d of DISTRICTS) {
      const list = [...places.values()].filter((p) => p.district === d && (!p.hidden || this.game.world.found.includes(p.id)));
      const cards: Container[] = [];
      if (d === 'homes') for (let i = 1; i <= LOT_COUNT; i++) cards.push(this.lotCard(`lot_${i}`));
      for (const p of list) cards.push(this.placeCard(p.id));
      if (cards.length === 0) continue;
      const cols = Math.ceil(cards.length / rows);
      const title = label(DISTRICT_NAMES[d] ?? d, 34, COLORS.white);
      title.style.stroke = { color: COLORS.plum, width: 6, join: 'round' };
      title.anchor.set(0, 0.5);
      title.position.set(x, 120);
      this.strip.addChild(title);
      cards.forEach((c, i) => {
        c.position.set(x + Math.floor(i / rows) * (CARD + 30) + CARD / 2, 190 + (i % rows) * (CARD + 40) + CARD / 2);
        this.strip.addChild(c);
      });
      x += cols * (CARD + 30) + 80;
    }
    this.stripW = x + 100;
    // Road and rails along the bottom, with a bus and a train ("there's also trains and buses").
    const road = new Graphics().rect(0, h - 70, this.stripW, 50).fill(0x8a8f9a).rect(0, h - 47, this.stripW, 4).fill(0xffffff);
    road.rect(0, h - 104, this.stripW, 8).fill(0x8b5e3c).rect(0, h - 96, this.stripW, 4).fill(0x6b6b6b);
    this.strip.addChild(road);
    for (const [want, y, speed] of [['bus', h - 46, 90], ['train', h - 98, 140]] as const) {
      const item = [...items.values()].find((it) => it.template.includes(want) && templates.get(it.template)?.category === 'vehicle');
      if (!item) continue;
      const s = new Container();
      const sp: Sprite = itemSprite(item.id);
      s.addChild(sp);
      s.scale.set((want === 'bus' ? 70 : 60) / itemSize(item.id).h);
      s.position.set(Math.random() * this.stripW, y);
      const dest = [...places.values()].find((p) => p.id.includes(want === 'bus' ? 'bus' : 'train') || p.id.includes('station'));
      if (dest) makeTappable(s, () => !this.moved && this.game.openPlace(dest.id));
      this.strip.addChild(s);
      this.vehicles.push({ s, speed, y });
    }
  }

  private card(onTap: () => void): Container {
    const c = new Container();
    c.addChild(new Graphics().roundRect(-CARD / 2, -CARD / 2, CARD, CARD, 28).fill(COLORS.white).stroke({ color: COLORS.plum, width: 4 }));
    makeTappable(c, () => {
      if (!this.moved) onTap();
    });
    return c;
  }

  /** A little building with its emoji as a sign and its name underneath. */
  private placeCard(id: string): Container {
    const p = places.get(id)!;
    const c = new Container();
    makeTappable(c, () => {
      if (!this.moved) this.game.openPlace(id);
    });
    const g = new Graphics();
    const bw = CARD * (p.floors.length > 2 ? 0.62 : 0.78);
    drawBuilding(g, p, bw);
    const top = -bw * 0.34 * p.floors.length;
    g.y = CARD * 0.32;
    // Tall buildings are scaled to fit the cell.
    const fit = Math.min(1, (CARD * 0.85) / (-top + bw * 0.07 + 30));
    g.scale.set(fit);
    const sign = label(p.emoji, 34);
    sign.y = g.y + (top - bw * 0.07) * fit - 16;
    const n = label(p.name, 17);
    n.y = CARD / 2 + 4;
    n.style.wordWrap = true;
    n.style.wordWrapWidth = CARD;
    n.style.stroke = { color: COLORS.white, width: 5, join: 'round' };
    c.addChild(g, sign, n);
    return c;
  }

  private lotCard(lotId: string): Container {
    const lot = this.game.world.lots[lotId];
    const house = lot ? houses.get(lot.house) : undefined;
    if (!lot || !house) {
      const c = this.card(() => this.game.build(lotId));
      const e = label('🔨', 50);
      e.y = -16;
      const n = label('Build here', 18);
      n.y = CARD / 2 - 24;
      c.addChild(e, n);
      return c;
    }
    const c = this.card(() => this.game.openPlace(lotId));
    const g = new Graphics();
    drawHouse(g, house, lot.variant, CARD * 0.6);
    g.y = CARD * 0.18;
    const n = label(house.name, 16);
    n.y = CARD / 2 - 18;
    c.addChild(g, n);
    return c;
  }

  private down(e: FederatedPointerEvent): void {
    this.pan = { x: this.strip.x, start: e.global.x };
    this.moved = false;
  }

  private move(e: FederatedPointerEvent): void {
    if (!this.pan) return;
    const dx = e.global.x - this.pan.start;
    if (Math.abs(dx) > 10) this.moved = true;
    this.strip.x = Math.min(0, Math.max(this.screen.w - this.stripW, this.pan.x + dx));
  }

  onSky(): void {
    this.drawSky();
  }

  private drawSky(): void {
    const { w, h } = this.screen;
    const night = this.game.world.sky.night;
    this.bg.clear().rect(0, 0, w, h).fill(night ? 0x2a2f6b : 0xbfe6ff).rect(0, h * 0.55, w, h * 0.45).fill(night ? 0x2f6b4f : 0x9be3a5);
  }

  layout(w: number, h: number): void {
    this.screen = { w, h };
    this.view.hitArea = new Rectangle(0, 0, w, h);
    this.drawSky();
    this.build(h);
    this.strip.x = Math.min(0, Math.max(w - this.stripW, this.strip.x));
  }

  update(dt: number): void {
    for (const v of this.vehicles) {
      v.s.x += v.speed * dt;
      if (v.s.x > this.stripW + 200) v.s.x = -200;
    }
  }
}
