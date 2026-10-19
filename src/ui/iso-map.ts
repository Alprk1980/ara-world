// The town as an isometric map: every place is a little 3D building on a block, homes on their lots, roads between
// blocks, a bus and a train going round. Drag to look around, pinch (or scroll) to zoom, tap a building to go in.
import { Container, Graphics, Polygon, Rectangle, Text, type FederatedPointerEvent } from 'pixi.js';
import type { Scene } from '../app/scenes.ts';
import type { Game } from '../app/game.ts';
import { DISTRICTS } from '../../schemas/place.ts';
import { houses, places } from '../data/index.ts';
import { exteriorFor } from '../art/house-art.ts';
import { themeFor } from '../art/themes.ts';
import { hexNum, shade } from '../art/color.ts';
import { LOT_COUNT } from '../world/state.ts';
import { COLORS, label } from './kit.ts';
import { playSound } from './sound.ts';

const TW = 96, TH = 48; // tile size in pixels before zoom
const PLOT = 3; // tiles per plot side: 2 for the building, 1 for the road
const iso = (gx: number, gy: number) => ({ x: (gx - gy) * (TW / 2), y: (gx + gy) * (TH / 2) });

const DISTRICT_LOOK: Record<string, { wall: string; roof: string; ground: string; name: string }> = {
  homes: { wall: '#ffe3ef', roof: '#e05a7a', ground: '#9be3a5', name: '🏡 Homes' },
  downtown: { wall: '#e3f0ff', roof: '#3a6ea5', ground: '#c9d6e8', name: '🏙️ Downtown' },
  shopping: { wall: '#fff3d6', roof: '#ff9f43', ground: '#f4e3c6', name: '🛍️ Shopping' },
  fun: { wall: '#f1e9ff', roof: '#b197fc', ground: '#ffd6ec', name: '🎡 Fun Land' },
  nature: { wall: '#e6fff2', roof: '#3fa66b', ground: '#8ce99a', name: '🌳 Nature' },
  travel: { wall: '#e3f6ff', roof: '#2f9e8f', ground: '#cfe8ff', name: '✈️ Travel' },
  care: { wall: '#fff0f0', roof: '#ff6b6b', ground: '#e8f7e4', name: '🏫 School & Care' },
  sky: { wall: '#ffffff', roof: '#ffd36e', ground: '#ffffff', name: '☁️ Up High' },
};

/** Building shapes for particular places (others: houses for homes and care, shops elsewhere). */
const SHAPES: Record<string, 'house' | 'shop' | 'hall' | 'tower'> = {
  offices: 'tower', hotels: 'tower', hospital: 'tower', fire_station: 'hall', malls: 'hall', supermarket: 'hall', airport: 'hall',
  train_station: 'hall', school: 'hall', aquarium: 'hall', sports_arena: 'hall', old_people_home: 'house', daycare: 'house', vets: 'house',
  mansion: 'house', beach_house: 'house', secret_mansion: 'house', secret_beach_house: 'house', halloween_house: 'house',
};

type Plot = { kind: 'place' | 'lot'; id: string; district: string; gx: number; gy: number; floors: number };

export class MapScene implements Scene {
  readonly name = 'map';
  readonly view = new Container();
  private game: Game;
  private sky = new Graphics();
  private world = new Container();
  private ground = new Graphics();
  private things = new Container();
  /** Names, emoji and district titles, always drawn on top so nothing hides them. */
  private labels = new Container();
  private vehicles: { c: Container; path: { x: number; y: number }[]; t: number; speed: number }[] = [];
  private plots: Plot[] = [];
  private screen = { w: 0, h: 0 };
  private zoom = 1;
  private pointers = new Map<number, { x: number; y: number }>();
  private drag: { x: number; y: number; wx: number; wy: number; moved: boolean; pinch?: number; zoom?: number } | null = null;
  private size = 0;

  constructor(game: Game) {
    this.game = game;
    this.world.addChild(this.ground, this.things, this.labels);
    this.labels.eventMode = 'none';
    this.view.addChild(this.sky, this.world);
    this.view.eventMode = 'static';
    this.view.on('pointerdown', (e) => this.down(e));
    this.view.on('globalpointermove', (e) => this.move(e));
    this.view.on('pointerup', (e) => this.up(e));
    this.view.on('pointerupoutside', (e) => this.up(e));
    this.view.on('wheel', (e) => this.setZoom(this.zoom * (e.deltaY > 0 ? 0.9 : 1.1), e.global));
  }

  /** Lay out every place and lot on plots, district by district, in a square. */
  private plan(): void {
    const entries: Plot[] = [];
    for (const d of DISTRICTS) {
      if (d === 'homes') for (let i = 1; i <= LOT_COUNT; i++) entries.push({ kind: 'lot', id: `lot_${i}`, district: d, gx: 0, gy: 0, floors: 2 });
      for (const p of places.values())
        if (p.district === d && (!p.hidden || this.game.world.found.includes(p.id))) entries.push({ kind: 'place', id: p.id, district: d, gx: 0, gy: 0, floors: p.floors.filter((f) => !f.outdoor).length || 1 });
    }
    const side = Math.ceil(Math.sqrt(entries.length));
    entries.forEach((e, i) => {
      // Snake rows so a district's buildings stay next to each other.
      const row = Math.floor(i / side), col = row % 2 ? side - 1 - (i % side) : i % side;
      e.gx = col * PLOT;
      e.gy = row * PLOT;
    });
    this.plots = entries;
    this.size = side * PLOT;
  }

  private build(): void {
    this.plan();
    const g = this.ground.clear();
    this.things.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.labels.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.vehicles = [];
    const n = this.size;
    const owner = new Map<string, Plot>();
    for (const p of this.plots) for (let dx = 0; dx < PLOT; dx++) for (let dy = 0; dy < PLOT; dy++) owner.set(`${p.gx + dx},${p.gy + dy}`, p);
    // Ground: each tile tinted by the district that owns it; roads along the third row and column of every plot.
    const road = (gx: number, gy: number) => gx % PLOT === PLOT - 1 || gy % PLOT === PLOT - 1 || gx < 0 || gy < 0 || gx >= n || gy >= n;
    for (let gy = -1; gy <= n; gy++) {
      for (let gx = -1; gx <= n; gx++) {
        const { x, y } = iso(gx, gy);
        const diamond = [x, y, x + TW / 2, y + TH / 2, x, y + TH, x - TW / 2, y + TH / 2];
        if (road(gx, gy)) {
          g.poly(diamond).fill(0x9aa3ad).stroke({ color: 0x8a939d, width: 1 });
          if (gx % PLOT === PLOT - 1 && gy % PLOT !== PLOT - 1 && gy >= 0 && gy < n) g.moveTo(x - 4, y + TH / 2 - 2).lineTo(x + 4, y + TH / 2 + 2).stroke({ color: 0xffffff, width: 3 });
          if (gy % PLOT === PLOT - 1 && gx % PLOT !== PLOT - 1 && gx >= 0 && gx < n) g.moveTo(x - 4, y + TH / 2 + 2).lineTo(x + 4, y + TH / 2 - 2).stroke({ color: 0xffffff, width: 3 });
        } else {
          const look = DISTRICT_LOOK[owner.get(`${gx},${gy}`)?.district ?? 'nature'] ?? DISTRICT_LOOK.nature;
          g.poly(diamond).fill(hexNum((gx + gy) % 2 ? look.ground : shade(look.ground, -0.04))).stroke({ color: hexNum(shade(look.ground, -0.1)), width: 1 });
        }
      }
    }
    // A railway along the far edge, with a train going back and forth.
    const railY = -2;
    for (let gx = -2; gx <= n + 1; gx++) {
      const { x, y } = iso(gx, railY);
      g.poly([x, y, x + TW / 2, y + TH / 2, x, y + TH, x - TW / 2, y + TH / 2]).fill(0xb8a890);
      g.moveTo(x - TW / 4, y + TH / 4).lineTo(x + TW / 4, y + (3 * TH) / 4).stroke({ color: 0x6b6b6b, width: 3 });
    }
    // Buildings, back to front so nearer ones overlap farther ones.
    const sorted = [...this.plots].sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
    for (const p of sorted) this.things.addChild(this.buildingFor(p));
    // One title per district, above the middle of its plots.
    for (const d of DISTRICTS) {
      const mine = this.plots.filter((p) => p.district === d);
      if (!mine.length) continue;
      const gx = mine.reduce((a, p) => a + p.gx, 0) / mine.length, gy = mine.reduce((a, p) => a + p.gy, 0) / mine.length;
      const { x, y } = iso(gx + 1, gy + 1);
      const t = label(DISTRICT_LOOK[d]?.name ?? d, 26, COLORS.white);
      t.style.stroke = { color: COLORS.plum, width: 7, join: 'round' };
      t.position.set(x, y - 170);
      t.alpha = 0.95;
      this.labels.addChild(t);
    }
    // Trees on a few corners for life.
    for (let i = 0; i < n; i += 2) for (const [gx, gy] of [[-1, i], [i, n]] as const) this.things.addChild(tree(gx, gy));
    this.addVehicles(n, railY);
  }

  private buildingFor(p: Plot): Container {
    const c = new Container();
    const base = iso(p.gx + 1, p.gy + 1); // centre of the 2x2 footprint
    c.position.set(base.x, base.y);
    const look = DISTRICT_LOOK[p.district] ?? DISTRICT_LOOK.downtown;
    let wall = look.wall, roof = look.roof, door = '#7fd1c7';
    let emoji = '🏠', name = '';
    let onTap: () => void;
    if (p.kind === 'lot') {
      const lot = this.game.world.lots[p.id];
      const house = lot ? houses.get(lot.house) : undefined;
      if (!lot || !house) {
        // An empty plot: soil, a little fence and a hammer sign.
        const g = new Graphics();
        g.poly([0, -TH, TW, 0, 0, TH, -TW, 0]).fill(0xc9a27a).stroke({ color: 0xa8774f, width: 2 });
        for (let k = 0; k < 6; k++) g.circle(-40 + k * 16, (k % 2) * 6 - 2, 4).fill(0x8ce99a);
        c.addChild(g);
        this.sign(base.x, base.y - 8, '🔨', 'Build here');
        tappable(c, new Polygon([0, -TH - 40, TW, 0, 0, TH, -TW, 0]), () => !this.drag?.moved && this.game.build(p.id));
        return c;
      }
      const ex = exteriorFor(house, lot.variant);
      wall = ex.walls;
      roof = ex.roof;
      door = ex.door;
      emoji = '🏡';
      name = house.name;
      p.floors = Math.max(1, house.floors.filter((f) => !f.outdoor).length);
      onTap = () => this.game.openPlace(p.id);
    } else {
      const pl = places.get(p.id)!;
      emoji = pl.emoji;
      name = pl.name;
      onTap = () => this.game.openPlace(p.id);
    }
    const g = new Graphics();
    c.addChild(g);
    const pl = p.kind === 'place' ? places.get(p.id) : undefined;
    const outdoorShare = pl ? pl.floors.filter((f) => f.outdoor).length / pl.floors.length : 0;
    // Mostly-outdoor places are open-air plots (beach, slopes, zoo...); the rest are buildings of a fitting shape.
    if (pl && outdoorShare >= 0.5) {
      const of = pl.floors.find((f) => f.outdoor)!;
      openAir(g, themeFor(pl.id, of.name, true).kind, this.game.world.sky.night);
      this.sign(base.x, base.y - 70, emoji, name);
      tappable(c, new Polygon([0, -TH - 90, TW, 0, 0, TH, -TW, 0]), () => {
        if (this.drag?.moved) return;
        playSound('pop');
        onTap();
      });
      return c;
    }
    const style = SHAPES[p.id] ?? (p.district === 'homes' || p.kind === 'lot' || p.district === 'care' ? 'house' : 'shop');
    const floors = Math.min(4, Math.max(1, p.floors)) + (style === 'tower' ? 2 : 0);
    const wide = style === 'hall' ? 0.95 : style === 'tower' ? 0.6 : 0.78;
    const bw = TW * wide, bh = TH * wide, hgt = 34 + floors * 24;
    g.ellipse(0, 6, bw, bh * 0.9).fill({ color: 0x000000, alpha: 0.12 });
    const edge = { color: hexNum(shade(wall, -0.5)), width: 2 };
    g.poly([-bw, 0, 0, bh, 0, bh - hgt, -bw, -hgt]).fill(hexNum(shade(wall, -0.12))).stroke(edge);
    g.poly([0, bh, bw, 0, bw, -hgt, 0, bh - hgt]).fill(hexNum(wall)).stroke(edge);
    // Windows: a row per storey on each face (iso parallelograms).
    const lit = this.game.world.sky.night ? 0xfff3b0 : 0xcdeeff;
    for (let f = 0; f < floors; f++) {
      const y0 = -24 - f * 24;
      for (const t of [0.3, 0.7]) {
        const lx = -bw + bw * t, ly = bh * t + y0;
        g.poly([lx - 7, ly - 3.5, lx + 7, ly + 3.5, lx + 7, ly + 15.5, lx - 7, ly + 8.5]).fill(lit);
        if (f > 0 || t > 0.5) {
          const rx = bw * t, ry = bh * (1 - t) + y0;
          g.poly([rx - 7, ry + 3.5, rx + 7, ry - 3.5, rx + 7, ry + 8.5, rx - 7, ry + 15.5]).fill(lit);
        }
      }
    }
    // Door on the right face, and a striped awning over it for shops and halls.
    const dx = bw * 0.3, dy = bh * 0.7;
    g.poly([dx - 9, dy + 4.5, dx + 9, dy - 4.5, dx + 9, dy - 30, dx - 9, dy - 21]).fill(hexNum(door)).stroke({ color: hexNum(shade(door, -0.4)), width: 2 });
    if (style === 'shop' || style === 'hall')
      for (let k = 0; k < 5; k++) {
        const x1 = dx - 22 + k * 9;
        g.poly([x1, dy - 19 - (k * 9) / 2, x1 + 9, dy - 19 - ((k + 1) * 9) / 2, x1 + 13, dy - 11 - ((k + 1) * 9) / 2, x1 + 4, dy - 11 - (k * 9) / 2]).fill(k % 2 ? 0xffffff : hexNum(roof));
      }
    // Roof: pointed for houses and care places, flat with a rim for shops, halls and towers.
    if (style === 'house') {
      g.poly([-bw - 6, -hgt + 2, 0, bh - hgt + 4, 0, -hgt - 40]).fill(hexNum(roof)).stroke({ color: hexNum(shade(roof, -0.4)), width: 2 });
      g.poly([0, bh - hgt + 4, bw + 6, -hgt + 2, 0, -hgt - 40]).fill(hexNum(shade(roof, -0.15))).stroke({ color: hexNum(shade(roof, -0.4)), width: 2 });
    } else {
      g.poly([-bw, -hgt, 0, bh - hgt, bw, -hgt, 0, -bh - hgt]).fill(hexNum(shade(roof, 0.25))).stroke({ color: hexNum(shade(roof, -0.3)), width: 3 });
      g.poly([-bw * 0.6, -hgt, 0, bh * 0.6 - hgt, bw * 0.6, -hgt, 0, -bh * 0.6 - hgt]).fill(hexNum(roof));
    }
    this.sign(base.x, base.y - hgt - (style === 'house' ? 50 : 16), emoji, name);
    tappable(c, new Polygon([-bw, bh, -bw, -hgt - 90, bw, -hgt - 90, bw, bh, 0, bh + 8]), () => {
      if (this.drag?.moved) return;
      playSound('pop');
      onTap();
    });
    return c;
  }

  /** Emoji and name floating above a building, on the top layer. */
  private sign(x: number, y: number, emoji: string, name: string): void {
    const s = label(emoji, 34);
    s.position.set(x, y - 26);
    const nm = small(name);
    nm.position.set(x, y);
    this.labels.addChild(s, nm);
  }

  private addVehicles(n: number, railY: number): void {
    // The bus loops round the outside road; the train runs along the railway.
    const loop = [iso(-1, -1), iso(n, -1), iso(n, n), iso(-1, n)].map((q) => ({ x: q.x, y: q.y + TH / 2 }));
    const bus = vehicle('🚌', () => this.goTo(/bus/));
    this.things.addChild(bus);
    this.vehicles.push({ c: bus, path: [...loop, loop[0]], t: 0, speed: 0.04 });
    const a = iso(-2, railY), b = iso(n + 1, railY);
    const train = vehicle('🚂', () => this.goTo(/train|station/));
    this.things.addChild(train);
    this.vehicles.push({ c: train, path: [{ x: a.x, y: a.y + TH / 2 }, { x: b.x, y: b.y + TH / 2 }, { x: a.x, y: a.y + TH / 2 }], t: 0.3, speed: 0.03 });
  }

  private goTo(re: RegExp): void {
    if (this.drag?.moved) return;
    const dest = [...places.values()].find((p) => re.test(p.id));
    if (dest) this.game.openPlace(dest.id);
  }

  // ---------------------------------------------------------------- pan and zoom
  private down(e: FederatedPointerEvent): void {
    this.pointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
    if (this.pointers.size === 2) {
      const [p1, p2] = [...this.pointers.values()];
      this.drag = { x: 0, y: 0, wx: this.world.x, wy: this.world.y, moved: true, pinch: Math.hypot(p1.x - p2.x, p1.y - p2.y), zoom: this.zoom };
    } else this.drag = { x: e.global.x, y: e.global.y, wx: this.world.x, wy: this.world.y, moved: false };
  }

  private move(e: FederatedPointerEvent): void {
    if (!this.drag || !this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
    if (this.drag.pinch && this.pointers.size === 2) {
      const [p1, p2] = [...this.pointers.values()];
      this.setZoom(this.drag.zoom! * (Math.hypot(p1.x - p2.x, p1.y - p2.y) / this.drag.pinch), { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
      return;
    }
    const dx = e.global.x - this.drag.x, dy = e.global.y - this.drag.y;
    if (Math.hypot(dx, dy) > 10) this.drag.moved = true;
    this.world.position.set(this.drag.wx + dx, this.drag.wy + dy);
    this.clamp();
  }

  private up(e: FederatedPointerEvent): void {
    this.pointers.delete(e.pointerId);
    // Let tap handlers see whether this was a drag, then forget it.
    setTimeout(() => {
      if (this.pointers.size === 0) this.drag = null;
    });
  }

  private setZoom(z: number, at: { x: number; y: number }): void {
    const nz = Math.max(0.45, Math.min(1.8, z));
    const lx = (at.x - this.world.x) / this.zoom, ly = (at.y - this.world.y) / this.zoom;
    this.zoom = nz;
    this.world.scale.set(nz);
    this.world.position.set(at.x - lx * nz, at.y - ly * nz);
    this.clamp();
  }

  private clamp(): void {
    const b = this.world.getLocalBounds();
    const { w, h } = this.screen, m = 120;
    const minX = w - (b.maxX * this.zoom) - m, maxX = -b.minX * this.zoom + m;
    const minY = h - (b.maxY * this.zoom) - m, maxY = -b.minY * this.zoom + m;
    this.world.x = Math.min(Math.max(this.world.x, Math.min(minX, maxX)), Math.max(minX, maxX));
    this.world.y = Math.min(Math.max(this.world.y, Math.min(minY, maxY)), Math.max(minY, maxY));
  }

  onSky(): void {
    this.layout(this.screen.w, this.screen.h);
  }

  layout(w: number, h: number): void {
    const first = this.screen.w === 0;
    this.screen = { w, h };
    this.view.hitArea = new Rectangle(0, 0, w, h);
    const night = this.game.world.sky.night;
    this.sky.clear().rect(0, 0, w, h).fill(night ? 0x2a2f6b : 0xbfe6ff);
    this.build();
    if (first) {
      // Start zoomed so a handful of buildings fill the screen, looking at the homes.
      this.zoom = Math.min(1.1, Math.max(0.6, h / 900));
      this.world.scale.set(this.zoom);
      const start = iso(PLOT * 1.5, PLOT * 1.5);
      this.world.position.set(w / 2 - start.x * this.zoom, h / 2 - start.y * this.zoom);
    }
    this.clamp();
  }

  update(dt: number): void {
    for (const v of this.vehicles) {
      v.t = (v.t + dt * v.speed) % 1;
      const segs = v.path.length - 1;
      const k = v.t * segs, i = Math.floor(k), f = k - i;
      const a = v.path[i], b = v.path[i + 1];
      v.c.position.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
      v.c.scale.x = b.x < a.x ? -1 : 1;
    }
  }
}

function small(text: string): Text {
  const t = label(text, 15, COLORS.plum);
  t.style.stroke = { color: COLORS.white, width: 5, join: 'round' };
  t.style.wordWrap = true;
  t.style.wordWrapWidth = 150;
  return t;
}

function tappable(c: Container, area: Polygon, onTap: () => void): void {
  c.eventMode = 'static';
  c.cursor = 'pointer';
  c.hitArea = area;
  c.on('pointertap', onTap);
}

function tree(gx: number, gy: number): Graphics {
  const { x, y } = iso(gx, gy);
  const g = new Graphics().rect(x - 3, y + TH / 2 - 26, 6, 26).fill(0x8a5a3c).circle(x, y + TH / 2 - 38, 20).fill(0x3fa66b).circle(x - 8, y + TH / 2 - 44, 8).fill({ color: 0xffffff, alpha: 0.25 });
  g.eventMode = 'none';
  return g;
}

function vehicle(emoji: string, onTap: () => void): Container {
  const c = new Container();
  const t = label(emoji, 46);
  t.y = -20;
  c.addChild(t);
  c.eventMode = 'static';
  c.cursor = 'pointer';
  c.hitArea = new Rectangle(-30, -50, 60, 50);
  c.on('pointertap', onTap);
  return c;
}

/** An open-air plot drawn for its theme: sand and sea, snow and a mountain, a pool, a pitch, rides... */
function openAir(g: Graphics, kind: string, night: boolean): void {
  const plot = (col: number) => g.poly([0, -TH * 0.95, TW * 0.95, 0, 0, TH * 0.95, -TW * 0.95, 0]).fill(col).stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
  switch (kind) {
    case 'beach':
      plot(0xf6e3b4);
      g.poly([0, -TH * 0.95, TW * 0.95, 0, TW * 0.45, TH * 0.47, -TW * 0.5, -TH * 0.45]).fill(0x7fd1ff);
      palm(g, -30, 10);
      break;
    case 'snow':
      plot(0xf4f8ff);
      g.poly([-50, 10, 0, -110, 50, 10]).fill(0xc9d8ee).poly([-18, -60, 0, -110, 18, -60]).fill(0xffffff);
      pineTree(g, 50, 10);
      pineTree(g, -60, 18);
      break;
    case 'pool':
      plot(0xe6f7ff);
      g.poly([0, -TH * 0.6, TW * 0.6, 0, 0, TH * 0.6, -TW * 0.6, 0]).fill(0x7fd1ff).stroke({ color: 0xffffff, width: 4 });
      g.moveTo(-20, 0).quadraticCurveTo(-10, -6, 0, 0).quadraticCurveTo(10, 6, 20, 0).stroke({ color: 0xffffff, width: 3 });
      break;
    case 'stadium':
      plot(0x5cc86a);
      g.poly([0, -TH * 0.5, TW * 0.5, 0, 0, TH * 0.5, -TW * 0.5, 0]).stroke({ color: 0xffffff, width: 3 });
      for (const sx of [-1, 1]) g.poly([sx * TW * 0.95, 0, sx * TW * 0.6, -TH * 0.35, sx * TW * 0.6, -TH * 0.35 - 30, sx * TW * 0.95, -30]).fill(0x9aa3c8);
      break;
    case 'fun':
      plot(0xffd6ec);
      g.circle(-10, -70, 46).stroke({ color: 0xb197fc, width: 5 });
      for (let k = 0; k < 8; k++) g.moveTo(-10, -70).lineTo(-10 + Math.cos((k * Math.PI) / 4) * 46, -70 + Math.sin((k * Math.PI) / 4) * 46).stroke({ color: 0xb197fc, width: 2 });
      g.moveTo(-10, -70).lineTo(-30, 0).moveTo(-10, -70).lineTo(10, 0).stroke({ color: 0x8a6ad0, width: 4 });
      g.poly([40, 10, 60, -40, 80, 10]).fill(0xff8fb8);
      break;
    case 'savanna': case 'farm':
      plot(kind === 'farm' ? 0x9be37a : 0xe0c068);
      for (let k = -4; k <= 4; k++) g.rect(k * 20 - 2, -TH * 0.95 + Math.abs(k) * 11 - 18, 4, 18).fill(0xa8774f);
      g.rect(-40, -26, 6, 30).fill(0x8a5a3c).ellipse(-37, -32, 34, 12).fill(0x6fa84f);
      if (kind === 'farm') g.rect(20, -40, 40, 40).fill(0xe05a4a).poly([16, -40, 40, -62, 64, -40]).fill(0xb8433f);
      break;
    case 'sky': case 'candy':
      plot(kind === 'sky' ? 0xffffff : 0xffd6ec);
      for (const [x, y, r] of [[-40, -10, 20], [-14, -22, 26], [16, -12, 22], [40, -4, 18]]) g.circle(x, y, r).fill(0xffffff);
      if (kind === 'candy') for (const x of [-30, 30]) g.rect(x - 2, -60, 4, 50).fill(0xffffff).circle(x, -64, 14).fill(0xff8fb8);
      else ['#ff8fb8', '#ffd36e', '#8ce99a', '#7fd1ff'].forEach((col, i) => g.arc(0, -10, 60 - i * 8, Math.PI, 0).stroke({ color: hexNum(col), width: 7 }));
      break;
    case 'runway':
      plot(0x9aa3ad);
      for (let k = -3; k <= 3; k++) g.moveTo(k * 22 - 6, k * 11 - 3).lineTo(k * 22 + 6, k * 11 + 3).stroke({ color: 0xffffff, width: 4 });
      break;
    case 'night':
      plot(0x4a3f7a);
      g.arc(0, -10, 40, Math.PI, 0).fill(0xd8d8e8);
      for (let k = 0; k < 6; k++) g.circle(-60 + k * 24, -80 - (k % 2) * 16, 2).fill(0xffffff);
      break;
    case 'spooky':
      plot(0x5a3f7a);
      g.ellipse(-20, -4, 18, 13).fill(0xff9f43).ellipse(24, 6, 14, 10).fill(0xff9f43);
      break;
    default: // park, garden, city, rooftop, rails
      plot(0x8ce99a);
      for (const [x, y] of [[-40, -6], [30, -14], [0, 16]]) g.rect(x - 3, y - 26, 6, 26).fill(0x8a5a3c).circle(x, y - 34, 16).fill(0x3fa66b);
      for (let k = 0; k < 8; k++) g.circle(-60 + k * 17, 24 - (k % 3) * 9, 4).fill([0xff8fb8, 0xffd36e, 0xffffff][k % 3]);
  }
  if (night) g.poly([0, -TH * 0.95, TW * 0.95, 0, 0, TH * 0.95, -TW * 0.95, 0]).fill({ color: 0x1d2350, alpha: 0.15 });
}

function palm(g: Graphics, x: number, y: number): void {
  g.moveTo(x, y).quadraticCurveTo(x + 8, y - 40, x + 4, y - 70).stroke({ color: 0xa8774f, width: 6, cap: 'round' });
  for (const a of [-2.6, -2.0, -1.4, -0.8]) g.ellipse(x + 4 + Math.cos(a) * 18, y - 70 + Math.sin(a) * 9, 18, 5).fill(0x3fa66b);
}

function pineTree(g: Graphics, x: number, y: number): void {
  g.rect(x - 2, y - 10, 4, 10).fill(0x8a5a3c);
  for (let k = 0; k < 3; k++) g.poly([x - 16 + k * 4, y - 10 - k * 14, x, y - 34 - k * 14, x + 16 - k * 4, y - 10 - k * 14]).fill(k === 2 ? 0xffffff : 0x3f8f5f);
}
