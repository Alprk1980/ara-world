// ARA Island: the town as a hand-laid isometric island. Avenues split it into nine neighbourhoods, each with its own
// ground and landmarks (a snowy mountain, fields and a windmill, the airport runway, a zoo, the town square with a
// fountain, a tree-lined high street, homes, school and care, Fun Land with a pier and lighthouse). Hidden places
// sparkle until found; the cloud places float above the town. Drag to look around, pinch or scroll to zoom.
import { Container, Graphics, Polygon, Rectangle, Text, type FederatedPointerEvent } from 'pixi.js';
import type { Scene } from '../app/scenes.ts';
import type { Game } from '../app/game.ts';
import { houses, places } from '../data/index.ts';
import { exteriorFor } from '../art/house-art.ts';
import { themeFor } from '../art/themes.ts';
import { hexNum, shade } from '../art/color.ts';
import { drawBuilding } from './map-buildings.ts';
import { DESIGNS, OPEN, designFor, houseDesign } from './map-designs.ts';
import { COLORS, label } from './kit.ts';
import { playSound } from './sound.ts';

const TW = 96, TH = 48;
const N = 42; // island is drawn on an N x N grid
const C = (N - 1) / 2;
const iso = (gx: number, gy: number) => ({ x: (gx - gy) * (TW / 2), y: (gx + gy) * (TH / 2) });

// ---------------------------------------------------------------- the plan of the island
const AVENUES_X = [15, 25], AVENUES_Y = [15, 26];
const RAIL_Y = 13;
/** Every place's spot (top-left of its 2x2 footprint), chosen by hand to suit what it is. */
const SPOTS: Record<string, [number, number]> = {
  // north-west: mountain and forest
  snowboarding_place: [11, 6], starry_observatory: [6, 5], secret_treehouse: [8, 11], secret_mansion: [4, 10],
  // north: countryside on the railway
  stables: [17, 5], secret_pet_garden: [22, 8], train_station: [19, 10],
  // north-east: airport
  airport: [28, 8], hotels: [33, 9],
  // west: wild side
  zoo: [5, 17], aquarium: [4, 22], secret_garden: [11, 23],
  // centre: town square around the fountain (plaza 18-22)
  post_office: [16, 16], bus_station: [19, 16], police_station: [23, 16], restaurant: [16, 19], places_to_eat: [23, 19],
  fire_station: [16, 23], pub: [19, 23], offices: [23, 23],
  // east: high street (shops face the boulevard on rows 16 and 22), mall at the end
  cafe: [26, 16], sweets_shop: [28, 16], toy_shop: [30, 16], pet_shop: [32, 16], paint_shop: [34, 16],
  eye_opticians: [26, 22], hair_dressers: [28, 22], makeup_shop: [30, 22], school_shopping_place: [32, 22], supermarket: [34, 22],
  malls: [36, 19],
  // south-west: homes and the shore
  mansion: [13, 37], beach_house: [6, 38], secret_beach_house: [2, 30], secret_beach: [10, 39],
  // south: school and care
  school: [17, 28], daycare: [21, 28], hospital: [17, 32], old_people_home: [21, 32], vets: [23, 35],
  // south-east: Fun Land
  theme_park: [27, 28], rollercoaster_place: [31, 28], waterpark: [35, 28], pools: [27, 32], sports_arena: [31, 32],
  football_stadium: [35, 32], secret_candy_cave: [29, 36], halloween_house: [33, 36],
  // up in the sky (floating above the countryside)
  kingdom_in_the_clouds: [20, 6], cloud_swing_set: [25, 4],
};
const FLOATING = new Set(['kingdom_in_the_clouds', 'cloud_swing_set']);
const BIG = new Set(['zoo', 'airport', 'football_stadium', 'theme_park', 'malls', 'school', 'hospital']);
const LOTS: [number, number][] = [[4, 28], [7, 28], [10, 28], [13, 28], [4, 31], [7, 31], [10, 31], [13, 31], [4, 34], [7, 34], [10, 34], [13, 34]];
const AREAS: { name: string; x: number; y: number }[] = [
  { name: '🏔️ Snowy Mountain', x: 8, y: 7 }, { name: '🌾 Countryside', x: 20, y: 6 }, { name: '✈️ Airport', x: 31, y: 7 },
  { name: '🦁 Wild Side', x: 8, y: 19 }, { name: '⛲ Town Square', x: 20, y: 18 }, { name: '🛍️ High Street', x: 31, y: 18 },
  { name: '🏡 Homes', x: 9, y: 29 }, { name: '🏫 School & Care', x: 20, y: 29 }, { name: '🎡 Fun Land', x: 31, y: 29 },
];

type Ground = 'water' | 'sand' | 'grass' | 'road' | 'plaza' | 'rail' | 'runway' | 'field' | 'snow' | 'rock' | 'forest' | 'pond' | 'boulevard' | 'pier' | 'fun' | 'yard';

function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Distance from the centre in a rounded-square norm, wobbled so the coast isn't a perfect shape. */
function islandDist(x: number, y: number): number {
  const dx = x - C, dy = y - C;
  const a = Math.atan2(dy, dx);
  return Math.cbrt(Math.abs(dx) ** 3 + Math.abs(dy) ** 3) - (Math.sin(a * 3 + 1) * 0.9 + Math.cos(a * 5) * 0.6);
}
const MOUNTAIN = { x: 7.5, y: 7.5, r: 5 };
function mountainHeight(x: number, y: number): number {
  const d = Math.hypot(x - MOUNTAIN.x, y - MOUNTAIN.y);
  return d < MOUNTAIN.r ? (MOUNTAIN.r - d) * 16 : 0;
}

function groundAt(x: number, y: number): Ground {
  const d = islandDist(x, y);
  if (d > 20.5) return x >= 37 && x <= 40 && (y === 30 || y === 31) ? 'pier' : 'water';
  if (d > 19.2) return 'sand';
  if (y === RAIL_Y && x > 1 && x < N - 2) return 'rail';
  if (AVENUES_X.includes(x) || AVENUES_Y.includes(y)) return 'road';
  if (x >= 18 && x <= 22 && y >= 18 && y <= 22) return 'plaza';
  if (x >= 26 && x <= 37 && (y === 19 || y === 20)) return 'boulevard';
  if (x >= 27 && x <= 38 && (y === 5 || y === 6)) return 'runway';
  if (mountainHeight(x, y) > 0) return mountainHeight(x, y) > 34 ? 'snow' : 'rock';
  if (x <= 14 && y <= 12 && y >= 9) return 'forest';
  if (x >= 16 && x <= 24 && y <= 12 && y >= 3) return 'field';
  if (x >= 9 && x <= 10 && y >= 19 && y <= 20) return 'pond';
  if (x >= 26 && y >= 27) return 'fun';
  if (x <= 14 && y >= 27 && (x === 6 || x === 9 || x === 12)) return 'yard';
  return 'grass';
}

const GROUND_COLOUR: Record<Ground, number> = {
  water: 0x7fc4ff, sand: 0xf6e3b4, grass: 0x9be37a, road: 0x9aa3ad, plaza: 0xf0e2d0, rail: 0xc9b8a0, runway: 0x8a939d,
  field: 0xc8e070, snow: 0xf4f8ff, rock: 0xb8c4d8, forest: 0x7fcf6a, pond: 0x7fd1ff, boulevard: 0xe8d8c4, pier: 0xc9a27a, fun: 0xffe0ef, yard: 0xa8e889,
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
  private labels = new Container();
  private movers: { c: Container; path: { x: number; y: number }[]; t: number; speed: number; flip?: boolean }[] = [];
  private beam: Graphics | null = null;
  private screen = { w: 0, h: 0 };
  private zoom = 1;
  private time = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private drag: { x: number; y: number; wx: number; wy: number; moved: boolean; pinch?: number; zoom?: number } | null = null;

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

  private get night(): boolean {
    return this.game.world.sky.night;
  }

  // ---------------------------------------------------------------- building the island
  private build(): void {
    const g = this.ground.clear();
    for (const layer of [this.things, this.labels]) layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.movers = [];
    this.beam = null;
    const objects: { depth: number; c: Container }[] = [];
    const occupied = new Set<string>();
    const mark = (x: number, y: number, s = 2) => {
      for (let dx = 0; dx < s; dx++) for (let dy = 0; dy < s; dy++) occupied.add(`${x + dx},${y + dy}`);
    };
    for (const [id, [x, y]] of Object.entries(SPOTS)) if (!FLOATING.has(id)) mark(x, y);
    for (const [x, y] of LOTS) mark(x, y);

    // Ground tiles (the mountain is raised); water is drawn wider than the island for a sea all round.
    for (let gy = -6; gy < N + 6; gy++) {
      for (let gx = -6; gx < N + 6; gx++) {
        const kind: Ground = gx < 0 || gy < 0 || gx >= N || gy >= N ? 'water' : groundAt(gx, gy);
        const { x, y } = iso(gx, gy);
        const lift = kind === 'snow' || kind === 'rock' ? mountainHeight(gx, gy) : 0;
        const top = y - lift;
        const col = GROUND_COLOUR[kind];
        const fill = (gx + gy) % 2 ? col : hexNum(shade(`#${col.toString(16).padStart(6, '0')}`, -0.035));
        if (lift > 0) {
          // Cliff faces below a raised tile.
          g.poly([x - TW / 2, top + TH / 2, x, top + TH, x, y + TH, x - TW / 2, y + TH / 2]).fill(0x9aa8c0);
          g.poly([x, top + TH, x + TW / 2, top + TH / 2, x + TW / 2, y + TH / 2, x, y + TH]).fill(0xaab6cc);
        }
        g.poly([x, top, x + TW / 2, top + TH / 2, x, top + TH, x - TW / 2, top + TH / 2]).fill(fill);
        this.tileDetail(g, kind, gx, gy, x, top);
        // Trees in the forest and dotted through the countryside; streetlights along the avenues.
        if (gx >= 0 && gy >= 0 && gx < N && gy < N && !occupied.has(`${gx},${gy}`)) {
          const r = hash2(gx, gy);
          if ((kind === 'forest' && r < 0.7) || (kind === 'grass' && r < 0.08) || (kind === 'rock' && r < 0.25 && lift < 30)) objects.push({ depth: gx + gy, c: tree(x, top, kind === 'rock') });
          if (kind === 'boulevard' && gy === 19 && gx % 2 === 0) objects.push({ depth: gx + gy, c: tree(x, top, false, 0.8) });
          if (kind === 'road' && (gx + gy) % 6 === 0 && hash2(gy, gx) < 0.5) objects.push({ depth: gx + gy + 0.5, c: lamp(x + TW / 4, top + TH / 4, this.night) });
        }
      }
    }

    // Landmarks: the fountain, the windmill, the lighthouse, a plane on the runway.
    objects.push({ depth: 40, c: fountain(iso(20, 20)) });
    objects.push({ depth: 27, c: windmill(iso(22.5, 4.5)) });
    const lh = lighthouse(iso(37, 36), this.night);
    this.beam = lh.beam;
    objects.push({ depth: 73, c: lh.c });
    objects.push({ depth: 34, c: parkedPlane(iso(33.5, 5.5)) });

    // Places and lots.
    const plots: Plot[] = [];
    for (const [id, [gx, gy]] of Object.entries(SPOTS)) {
      const p = places.get(id);
      if (!p) continue;
      plots.push({ kind: 'place', id, district: p.district, gx, gy, floors: p.floors.filter((f) => !f.outdoor).length || 1 });
    }
    // Any place without a hand-picked spot (new content) goes along the south shore.
    let extra = 0;
    for (const p of places.values()) if (!SPOTS[p.id]) plots.push({ kind: 'place', id: p.id, district: p.district, gx: 16 + (extra % 4) * 2, gy: 37 + Math.floor(extra++ / 4) * 2, floors: 1 });
    LOTS.forEach(([gx, gy], i) => plots.push({ kind: 'lot', id: `lot_${i + 1}`, district: 'homes', gx, gy, floors: 2 }));
    for (const p of plots) {
      const pl = places.get(p.id);
      const found = !pl?.hidden || this.game.world.found.includes(p.id);
      if (!found) {
        if (!FLOATING.has(p.id)) objects.push({ depth: p.gx + p.gy + 2, c: this.hiddenSparkle(p) });
        continue;
      }
      objects.push({ depth: p.gx + p.gy + 2 + (FLOATING.has(p.id) ? 100 : 0), c: this.plotView(p) });
    }

    objects.sort((a, b) => a.depth - b.depth);
    for (const o of objects) this.things.addChild(o.c);
    for (const a of AREAS) {
      const { x, y } = iso(a.x, a.y);
      const t = label(a.name, 28, COLORS.white);
      t.style.stroke = { color: COLORS.plum, width: 8, join: 'round' };
      t.position.set(x, y - 120);
      this.labels.addChild(t);
    }
    this.addMovers();
  }

  /** Little details drawn on tiles: road lines, rails, crop rows, runway marks, waves. */
  private tileDetail(g: Graphics, kind: Ground, gx: number, gy: number, x: number, y: number): void {
    const cx = x, cy = y + TH / 2;
    switch (kind) {
      case 'road':
        if (AVENUES_X.includes(gx) && !AVENUES_Y.includes(gy)) g.moveTo(cx - 6, cy - 3).lineTo(cx + 6, cy + 3).stroke({ color: 0xffffff, width: 3 });
        if (AVENUES_Y.includes(gy) && !AVENUES_X.includes(gx)) g.moveTo(cx - 6, cy + 3).lineTo(cx + 6, cy - 3).stroke({ color: 0xffffff, width: 3 });
        break;
      case 'rail':
        g.moveTo(x - TW / 2 + 8, cy - 4).lineTo(x + TW / 2 - 8, cy - 4).stroke({ color: 0x6b6b6b, width: 3 }).moveTo(x - TW / 2 + 8, cy + 4).lineTo(x + TW / 2 - 8, cy + 4).stroke({ color: 0x6b6b6b, width: 3 });
        for (let k = -2; k <= 2; k++) g.rect(cx + k * 16 - 2, cy - 8, 4, 16).fill(0x8a5a3c);
        break;
      case 'field':
        for (let k = -2; k <= 2; k++) g.moveTo(cx + k * 12 - 14, cy + k * 6 - 7).lineTo(cx + k * 12 + 14, cy + k * 6 + 7).stroke({ color: (gx + gy) % 3 ? 0xa8c84a : 0xe8c84a, width: 4 });
        break;
      case 'runway':
        if (gy === 5) g.moveTo(cx - 14, cy + 7).lineTo(cx + 14, cy - 7).stroke({ color: 0xffffff, width: 4 });
        break;
      case 'water': case 'pond':
        if (hash2(gx, gy) < 0.25) g.moveTo(cx - 10, cy).quadraticCurveTo(cx - 5, cy - 4, cx, cy).quadraticCurveTo(cx + 5, cy + 4, cx + 10, cy).stroke({ color: 0xffffff, width: 2, alpha: 0.7 });
        break;
      case 'sand':
        if (hash2(gx, gy) < 0.12) g.ellipse(cx, cy, 5, 3).fill(0xffb3c7);
        break;
      case 'plaza': case 'boulevard':
        g.poly([x, y + 6, x + TW / 2 - 8, y + TH / 2, x, y + TH - 6, x - TW / 2 + 8, y + TH / 2]).stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });
        break;
      case 'pier':
        for (let k = -2; k <= 2; k++) g.moveTo(cx + k * 12 - 10, cy + k * 6 + 5).lineTo(cx + k * 12 + 10, cy + k * 6 - 5).stroke({ color: 0xa8774f, width: 2 });
        break;
      case 'fun':
        if ((gx + gy) % 2 === 0) g.circle(cx, cy, 3).fill(0xff8fb8);
        break;
      case 'yard':
        g.moveTo(cx - 20, cy - 10).lineTo(cx + 20, cy + 10).stroke({ color: 0xffffff, width: 2 });
        break;
    }
  }

  /** A faint sparkle where a hidden place is waiting to be found. */
  private hiddenSparkle(p: Plot): Container {
    const c = new Container();
    const { x, y } = iso(p.gx + 1, p.gy + 1);
    c.position.set(x, y);
    const s = label('✨', 30);
    s.alpha = 0.55;
    s.y = -30;
    c.addChild(s);
    tappable(c, new Rectangle(-40, -60, 80, 70), () => {
      if (this.drag?.moved) return;
      this.game.toast.show('Something is hidden here… find the secret door! 🔍');
    });
    this.movers.push({ c: s, path: [{ x: 0, y: -30 }, { x: 0, y: -38 }, { x: 0, y: -30 }], t: hash2(p.gx, p.gy), speed: 0.5 });
    return c;
  }

  private plotView(p: Plot): Container {
    const c = new Container();
    const base = iso(p.gx + 1, p.gy + 1);
    const floating = FLOATING.has(p.id);
    c.position.set(base.x, base.y - (floating ? 260 : 0));
    if (BIG.has(p.id)) c.scale.set(1.25);
    let design;
    let emoji = '🏠', name = '';
    const open = () => {
      if (this.drag?.moved) return;
      playSound('pop');
      this.game.openPlace(p.id);
    };
    const g = new Graphics();
    c.addChild(g);
    if (floating) {
      // A cloud island under the place.
      for (const [x, y, r] of [[-70, 10, 34], [-30, 24, 40], [20, 26, 40], [64, 12, 32], [0, 0, 44]]) g.circle(x, y, r).fill(0xffffff);
      g.ellipse(0, 40, 90, 14).fill({ color: 0xb197fc, alpha: 0.25 });
    }
    if (p.kind === 'lot') {
      const lot = this.game.world.lots[p.id];
      const house = lot ? houses.get(lot.house) : undefined;
      if (!lot || !house) {
        g.poly([0, -TH, TW, 0, 0, TH, -TW, 0]).fill(0xc9a27a).stroke({ color: 0xa8774f, width: 2 });
        for (let k = 0; k < 6; k++) g.circle(-40 + k * 16, (k % 2) * 6 - 2, 4).fill(0x8ce99a);
        this.sign(base.x, base.y - 8, '🔨', 'Build here');
        tappable(c, new Polygon([0, -TH - 40, TW, 0, 0, TH, -TW, 0]), () => !this.drag?.moved && this.game.build(p.id));
        return c;
      }
      emoji = '🏡';
      name = house.name;
      design = houseDesign(house.style, exteriorFor(house, lot.variant), Math.max(1, house.floors.filter((f) => !f.outdoor).length));
      // A little garden with a picket fence around the house.
      g.poly([0, -TH, TW, 0, 0, TH, -TW, 0]).fill(0xa8e889);
      for (let k = 0; k <= 8; k++) g.rect(-TW + k * 12 - 1.5, k * 6 - 12, 3, 12).fill(0xffffff);
    } else {
      const pl = places.get(p.id)!;
      emoji = pl.emoji;
      name = pl.name;
      const outdoorShare = pl.floors.filter((f) => f.outdoor).length / pl.floors.length;
      if ((OPEN.has(p.id) || (outdoorShare > 0.5 && !DESIGNS[p.id])) && !floating) {
        openAir(g, themeFor(pl.id, pl.floors.find((f) => f.outdoor)!.name, true).kind, this.night);
        this.sign(base.x, base.y - 80 * c.scale.y, emoji, name);
        tappable(c, new Polygon([0, -TH - 100, TW, 0, 0, TH, -TW, 0]), open);
        return c;
      }
      design = designFor(p.id, p.district, emoji, p.floors);
    }
    const { c: b, height } = drawBuilding(design, this.night);
    c.addChild(b);
    // The sign shows the emoji unless the building already wears it on its roof.
    this.sign(base.x, base.y - (floating ? 260 : 0) - (height + 14) * c.scale.y, design.prop ? '' : emoji, name);
    tappable(c, new Polygon([-TW * 1.05, TH * 0.6, -TW * 1.05, -height - 50, TW * 1.05, -height - 50, TW * 1.05, TH * 0.6, 0, TH + 8]), open);
    return c;
  }

  private sign(x: number, y: number, emoji: string, name: string): void {
    const s = label(emoji, 34);
    s.position.set(x, y - 26);
    const nm = label(name, 15, COLORS.plum);
    nm.style.stroke = { color: COLORS.white, width: 5, join: 'round' };
    nm.position.set(x, y);
    this.labels.addChild(s, nm);
  }

  // ---------------------------------------------------------------- things that move
  private addMovers(): void {
    const at = (gx: number, gy: number) => {
      const q = iso(gx, gy);
      return { x: q.x, y: q.y + TH / 2 };
    };
    // The bus loops the avenues; a car goes the other way round.
    const loop = [at(15, 15), at(25, 15), at(25, 26), at(15, 26), at(15, 15)];
    const bus = vehicle('🚌', () => this.goTo('bus_station'));
    this.things.addChild(bus);
    this.movers.push({ c: bus, path: loop, t: 0, speed: 0.025, flip: true });
    const car = vehicle('🚗', () => this.game.toast.show('Beep beep! 🚗'));
    this.things.addChild(car);
    this.movers.push({ c: car, path: [...loop].reverse(), t: 0.5, speed: 0.035, flip: true });
    // The train runs along the railway; boats sail round the island; a balloon drifts over.
    const train = vehicle('🚂', () => this.goTo('train_station'));
    this.things.addChild(train);
    this.movers.push({ c: train, path: [at(2, RAIL_Y), at(N - 3, RAIL_Y), at(2, RAIL_Y)], t: 0.2, speed: 0.02, flip: true });
    const sea = [at(-3, -3), at(N + 2, -3), at(N + 2, N + 2), at(-3, N + 2), at(-3, -3)];
    for (const [emoji, t] of [['⛵', 0], ['🚤', 0.45], ['🛳️', 0.7]] as const) {
      const b = vehicle(emoji, () => this.game.toast.show('Ahoy! ⚓'));
      this.things.addChild(b);
      this.movers.push({ c: b, path: sea, t, speed: 0.008 + t * 0.004, flip: true });
    }
    // People strolling round the square and along the high street; seagulls over the sea.
    const strolls: [string, { x: number; y: number }[], number][] = [
      ['🚶‍♀️', [at(18, 18), at(22.5, 18), at(22.5, 22.5), at(18, 22.5), at(18, 18)], 0.04],
      ['🧒', [at(22.5, 22.5), at(18, 22.5), at(18, 18), at(22.5, 18), at(22.5, 22.5)], 0.05],
      ['👵', [at(26, 19.5), at(37, 19.5), at(26, 19.5)], 0.02],
      ['🐕', [at(27, 20), at(36, 20), at(27, 20)], 0.03],
      ['👨‍👧', [at(5, 27.5), at(14, 27.5), at(5, 27.5)], 0.025],
    ];
    for (const [emoji, path, speed] of strolls) {
      const p = vehicle(emoji, () => playSound('giggle'), 30);
      this.things.addChild(p);
      this.movers.push({ c: p, path, t: hash2(path.length, Math.round(speed * 1000)), speed, flip: true });
    }
    for (let k = 0; k < 3; k++) {
      const bird = vehicle('🕊️', () => playSound('giggle'), 26);
      this.labels.addChild(bird);
      const ring = [at(-4 + k, 10), at(10, -4 - k), at(30, -4), at(N + 3, 12 + k), at(-4 + k, 10)].map((q) => ({ x: q.x, y: q.y - 120 - k * 30 }));
      this.movers.push({ c: bird, path: ring, t: k / 3, speed: 0.01, flip: true });
    }
    const balloon = vehicle('🎈', () => playSound('pop'), 54);
    this.labels.addChild(balloon);
    const hi = (q: { x: number; y: number }) => ({ x: q.x, y: q.y - 300 });
    this.movers.push({ c: balloon, path: [hi(at(4, 20)), hi(at(36, 18)), hi(at(4, 20))], t: 0.1, speed: 0.006 });
  }

  private goTo(id: string): void {
    if (this.drag?.moved) return;
    if (places.has(id)) this.game.openPlace(id);
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
    setTimeout(() => {
      if (this.pointers.size === 0) this.drag = null;
    });
  }

  private setZoom(z: number, at: { x: number; y: number }): void {
    const nz = Math.max(0.3, Math.min(1.6, z));
    const lx = (at.x - this.world.x) / this.zoom, ly = (at.y - this.world.y) / this.zoom;
    this.zoom = nz;
    this.world.scale.set(nz);
    this.world.position.set(at.x - lx * nz, at.y - ly * nz);
    this.clamp();
  }

  /** Keep the island on screen. */
  private clamp(): void {
    const { w, h } = this.screen;
    const left = iso(0, N).x, right = iso(N, 0).x, top = iso(0, 0).y - 400, bottom = iso(N, N).y;
    const z = this.zoom, m = 200;
    const minX = w - right * z - m, maxX = -left * z + m, minY = h - bottom * z - m, maxY = -top * z + m;
    this.world.x = Math.min(Math.max(this.world.x, Math.min(minX, maxX)), Math.max(minX, maxX));
    this.world.y = Math.min(Math.max(this.world.y, Math.min(minY, maxY)), Math.max(minY, maxY));
  }

  /** Centre the view on a grid spot (used by the screenshot tools). */
  lookAt(gx: number, gy: number, zoom = this.zoom): void {
    this.zoom = Math.max(0.3, Math.min(1.6, zoom));
    this.world.scale.set(this.zoom);
    const q = iso(gx, gy);
    this.world.position.set(this.screen.w / 2 - q.x * this.zoom, this.screen.h / 2 - (q.y - 60) * this.zoom);
    this.clamp();
  }

  onSky(): void {
    this.layout(this.screen.w, this.screen.h);
  }

  layout(w: number, h: number): void {
    const first = this.screen.w === 0;
    this.screen = { w, h };
    this.view.hitArea = new Rectangle(0, 0, w, h);
    // The background is the sea, so the island floats in water edge to edge.
    this.sky.clear().rect(0, 0, w, h).fill(this.night ? 0x4a6a9a : GROUND_COLOUR.water);
    this.build();
    if (first) {
      // Open on the town square, close enough to read the signs.
      this.zoom = Math.min(0.9, Math.max(0.55, h / 1000));
      this.world.scale.set(this.zoom);
      const start = iso(20, 20);
      this.world.position.set(w / 2 - start.x * this.zoom, h / 2 - (start.y - 60) * this.zoom);
    }
    this.clamp();
  }

  update(dt: number): void {
    this.time += dt;
    for (const m of this.movers) {
      m.t = (m.t + dt * m.speed) % 1;
      const segs = m.path.length - 1;
      const k = m.t * segs, i = Math.floor(k), f = k - i;
      const a = m.path[i], b = m.path[i + 1];
      m.c.position.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
      if (m.flip) m.c.scale.x = b.x < a.x ? -1 : 1;
    }
    if (this.beam) {
      this.beam.visible = this.night;
      this.beam.rotation = this.time * 0.8;
    }
  }
}

// ---------------------------------------------------------------- drawing pieces
function openAir(g: Graphics, kind: string, night: boolean): void {
  const plot = (col: number) => g.poly([0, -TH * 0.95, TW * 0.95, 0, 0, TH * 0.95, -TW * 0.95, 0]).fill(col).stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
  switch (kind) {
    case 'beach':
      plot(0xf6e3b4);
      g.poly([0, -TH * 0.95, TW * 0.95, 0, TW * 0.45, TH * 0.47, -TW * 0.5, -TH * 0.45]).fill(0x7fd1ff);
      palm(g, -30, 10);
      g.rect(30, -20, 3, 26).fill(0xffffff).moveTo(10, -18).quadraticCurveTo(31, -40, 52, -18).closePath().fill(0xff8fb8);
      break;
    case 'snow':
      plot(0xf4f8ff);
      g.moveTo(-60, 20).lineTo(50, -50).stroke({ color: 0xb8c4d8, width: 3 });
      for (const [x, y] of [[-30, 2], [10, -24]]) g.rect(x - 1, y - 18, 2, 18).fill(0x6b6b6b).roundRect(x - 8, y - 6, 16, 8, 3).fill(0xff6b6b);
      pineTree(g, 50, 10);
      pineTree(g, -60, 18);
      break;
    case 'pool':
      plot(0xe6f7ff);
      g.poly([0, -TH * 0.6, TW * 0.6, 0, 0, TH * 0.6, -TW * 0.6, 0]).fill(0x7fd1ff).stroke({ color: 0xffffff, width: 4 });
      g.moveTo(-20, 0).quadraticCurveTo(-10, -6, 0, 0).quadraticCurveTo(10, 6, 20, 0).stroke({ color: 0xffffff, width: 3 });
      g.moveTo(30, -20).bezierCurveTo(60, -80, 80, -40, 60, 0).stroke({ color: 0xffd36e, width: 8 });
      break;
    case 'stadium':
      plot(0x5cc86a);
      g.poly([0, -TH * 0.5, TW * 0.5, 0, 0, TH * 0.5, -TW * 0.5, 0]).stroke({ color: 0xffffff, width: 3 });
      for (const sx of [-1, 1]) g.poly([sx * TW * 0.95, 0, sx * TW * 0.6, -TH * 0.35, sx * TW * 0.6, -TH * 0.35 - 30, sx * TW * 0.95, -30]).fill(0x9aa3c8);
      for (const sx of [-1, 1]) g.rect(sx * TW * 0.9 - 2, -100, 4, 70).fill(0x6b6b6b).roundRect(sx * TW * 0.9 - 12, -110, 24, 12, 3).fill(0xffffff);
      break;
    case 'fun':
      plot(0xffd6ec);
      g.circle(-10, -70, 46).stroke({ color: 0xb197fc, width: 5 });
      for (let k = 0; k < 8; k++) g.moveTo(-10, -70).lineTo(-10 + Math.cos((k * Math.PI) / 4) * 46, -70 + Math.sin((k * Math.PI) / 4) * 46).stroke({ color: 0xb197fc, width: 2 });
      for (let k = 0; k < 8; k++) g.roundRect(-10 + Math.cos((k * Math.PI) / 4) * 46 - 6, -70 + Math.sin((k * Math.PI) / 4) * 46 - 4, 12, 9, 3).fill([0xff8fb8, 0xffd36e, 0x7fd1c7][k % 3]);
      g.moveTo(-10, -70).lineTo(-30, 0).moveTo(-10, -70).lineTo(10, 0).stroke({ color: 0x8a6ad0, width: 4 });
      g.poly([40, 10, 60, -40, 80, 10]).fill(0xff8fb8).poly([52, 10, 60, -40, 68, 10]).fill(0xffffff);
      break;
    case 'savanna': case 'farm':
      plot(kind === 'farm' ? 0x9be37a : 0xe0c068);
      for (let k = -4; k <= 4; k++) g.rect(k * 20 - 2, -TH * 0.95 + Math.abs(k) * 11 - 18, 4, 18).fill(0xa8774f);
      g.rect(-40, -26, 6, 30).fill(0x8a5a3c).ellipse(-37, -32, 34, 12).fill(0x6fa84f);
      if (kind === 'farm') g.rect(20, -40, 40, 40).fill(0xe05a4a).poly([16, -40, 40, -62, 64, -40]).fill(0xb8433f).rect(32, -24, 16, 24).fill(0xffffff);
      else g.ellipse(30, -10, 22, 14).fill(0xffd36e).circle(48, -24, 10).fill(0xffd36e);
      break;
    case 'sky': case 'candy':
      plot(kind === 'sky' ? 0xffffff : 0xffd6ec);
      for (const [x, y, r] of [[-40, -10, 20], [-14, -22, 26], [16, -12, 22], [40, -4, 18]]) g.circle(x, y, r).fill(0xffffff);
      if (kind === 'candy') for (const x of [-30, 30]) g.rect(x - 2, -60, 4, 50).fill(0xffffff).circle(x, -64, 14).fill(0xff8fb8);
      else ['#ff8fb8', '#ffd36e', '#8ce99a', '#7fd1ff'].forEach((col, i) => g.arc(0, -10, 60 - i * 8, Math.PI, 0).stroke({ color: hexNum(col), width: 7 }));
      break;
    case 'night':
      plot(0x4a3f7a);
      g.arc(0, -10, 40, Math.PI, 0).fill(0xd8d8e8);
      g.rect(-4, -60, 30, 10).fill(0x9aa3ad);
      for (let k = 0; k < 6; k++) g.circle(-60 + k * 24, -80 - (k % 2) * 16, 2).fill(0xffffff);
      break;
    case 'spooky':
      plot(0x5a3f7a);
      g.ellipse(-20, -4, 18, 13).fill(0xff9f43).ellipse(24, 6, 14, 10).fill(0xff9f43);
      break;
    default:
      plot(0x8ce99a);
      for (const [x, y] of [[-40, -6], [30, -14], [0, 16]]) g.rect(x - 3, y - 26, 6, 26).fill(0x8a5a3c).circle(x, y - 34, 16).fill(0x3fa66b);
      for (let k = 0; k < 8; k++) g.circle(-60 + k * 17, 24 - (k % 3) * 9, 4).fill([0xff8fb8, 0xffd36e, 0xffffff][k % 3]);
  }
  if (night) g.poly([0, -TH * 0.95, TW * 0.95, 0, 0, TH * 0.95, -TW * 0.95, 0]).fill({ color: 0x1d2350, alpha: 0.15 });
}

function tree(x: number, y: number, snowy: boolean, s = 1): Container {
  const g = new Graphics();
  const cx = x, cy = y + TH / 2;
  if (snowy) {
    g.rect(cx - 2, cy - 10 * s, 4, 10 * s).fill(0x8a5a3c);
    for (let k = 0; k < 3; k++) g.poly([cx - (16 - k * 4) * s, cy - (10 + k * 13) * s, cx, cy - (32 + k * 13) * s, cx + (16 - k * 4) * s, cy - (10 + k * 13) * s]).fill(k === 2 ? 0xffffff : 0x3f8f5f);
  } else {
    g.ellipse(cx, cy, 16 * s, 6 * s).fill({ color: 0x000000, alpha: 0.12 });
    g.rect(cx - 3 * s, cy - 24 * s, 6 * s, 24 * s).fill(0x8a5a3c);
    g.circle(cx, cy - 34 * s, 18 * s).fill(0x3fa66b).circle(cx - 7 * s, cy - 40 * s, 7 * s).fill({ color: 0xffffff, alpha: 0.22 });
  }
  g.eventMode = 'none';
  return g;
}

function lamp(x: number, y: number, night: boolean): Container {
  const g = new Graphics().rect(x - 1.5, y - 40, 3, 40).fill(0x5a5f6a).circle(x, y - 42, 5).fill(night ? 0xfff3b0 : 0xffffff);
  if (night) g.circle(x, y - 42, 16).fill({ color: 0xffe08a, alpha: 0.3 });
  g.eventMode = 'none';
  return g;
}

function fountain(at: { x: number; y: number }): Container {
  const g = new Graphics();
  const x = at.x, y = at.y + TH / 2;
  g.ellipse(x, y, 40, 20).fill(0xd8d0c8).ellipse(x, y - 4, 32, 15).fill(0x7fd1ff);
  g.rect(x - 4, y - 40, 8, 36).fill(0xd8d0c8).ellipse(x, y - 40, 16, 7).fill(0xd8d0c8).ellipse(x, y - 42, 12, 5).fill(0x7fd1ff);
  g.moveTo(x, y - 46).quadraticCurveTo(x - 20, y - 70, x - 26, y - 8).moveTo(x, y - 46).quadraticCurveTo(x + 20, y - 70, x + 26, y - 8).stroke({ color: 0xbfe6ff, width: 3 });
  g.eventMode = 'none';
  return g;
}

function windmill(at: { x: number; y: number }): Container {
  const c = new Container();
  const g = new Graphics();
  const x = at.x, y = at.y + TH / 2;
  g.poly([x - 16, y, x - 8, y - 70, x + 8, y - 70, x + 16, y]).fill(0xfff3d6).stroke({ color: 0xa8774f, width: 2 });
  g.poly([x - 12, y - 70, x, y - 86, x + 12, y - 70]).fill(0xc4502a);
  g.rect(x - 4, y - 16, 8, 16).fill(0xa8774f);
  c.addChild(g);
  const sails = new Graphics();
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    sails.poly([0, 0, Math.cos(a) * 44 - Math.sin(a) * 8, Math.sin(a) * 44 + Math.cos(a) * 8, Math.cos(a) * 44, Math.sin(a) * 44]).fill(0xffffff).stroke({ color: 0xa8774f, width: 1 });
  }
  sails.position.set(x, y - 72);
  c.addChild(sails);
  // The sails turn slowly.
  sails.onRender = () => {
    sails.rotation += 0.01;
  };
  c.eventMode = 'none';
  return c;
}

function lighthouse(at: { x: number; y: number }, night: boolean): { c: Container; beam: Graphics } {
  const c = new Container();
  const g = new Graphics();
  const x = at.x, y = at.y + TH / 2;
  g.poly([x - 14, y, x - 9, y - 90, x + 9, y - 90, x + 14, y]).fill(0xffffff).stroke({ color: 0x9aa3ad, width: 2 });
  for (const k of [0, 1]) g.poly([x - 13 + k * 2, y - 20 - k * 40, x - 11 + k * 2, y - 36 - k * 40, x + 11 - k * 2, y - 36 - k * 40, x + 13 - k * 2, y - 20 - k * 40]).fill(0xff6b6b);
  g.rect(x - 10, y - 108, 20, 18).fill(night ? 0xfff3b0 : 0xcdeeff).poly([x - 12, y - 108, x, y - 122, x + 12, y - 108]).fill(0xff6b6b);
  c.addChild(g);
  const beam = new Graphics().poly([0, 0, 220, -26, 220, 26]).fill({ color: 0xfff3b0, alpha: 0.35 });
  beam.position.set(x, y - 99);
  beam.visible = night;
  c.addChild(beam);
  c.eventMode = 'none';
  return { c, beam };
}

function parkedPlane(at: { x: number; y: number }): Container {
  const t = label('✈️', 64);
  t.position.set(at.x, at.y - 10);
  t.eventMode = 'none';
  return t;
}

function palm(g: Graphics, x: number, y: number): void {
  g.moveTo(x, y).quadraticCurveTo(x + 8, y - 40, x + 4, y - 70).stroke({ color: 0xa8774f, width: 6, cap: 'round' });
  for (const a of [-2.6, -2.0, -1.4, -0.8]) g.ellipse(x + 4 + Math.cos(a) * 18, y - 70 + Math.sin(a) * 9, 18, 5).fill(0x3fa66b);
}

function pineTree(g: Graphics, x: number, y: number): void {
  g.rect(x - 2, y - 10, 4, 10).fill(0x8a5a3c);
  for (let k = 0; k < 3; k++) g.poly([x - 16 + k * 4, y - 10 - k * 14, x, y - 34 - k * 14, x + 16 - k * 4, y - 10 - k * 14]).fill(k === 2 ? 0xffffff : 0x3f8f5f);
}

function tappable(c: Container, area: Polygon | Rectangle, onTap: () => void): void {
  c.eventMode = 'static';
  c.cursor = 'pointer';
  c.hitArea = area;
  c.on('pointertap', onTap);
}

function vehicle(emoji: string, onTap: () => void, size = 46): Container {
  const c = new Container();
  const t: Text = label(emoji, size);
  t.y = -20;
  c.addChild(t);
  c.eventMode = 'static';
  c.cursor = 'pointer';
  c.hitArea = new Rectangle(-30, -50, 60, 50);
  c.on('pointertap', onTap);
  return c;
}
