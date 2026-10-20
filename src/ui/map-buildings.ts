// Buildings on the town map, drawn in isometric from a small kit: bodies (shop, house, tower, castle, barn, station,
// dome, arena, treehouse, ...) and add-ons (a clock, a red cross, a siren, chimney smoke, an awning, ...). Each place
// has a design saying what it looks like (src/ui/map-designs.ts); new places fall back to a building in their
// district's colours. Coordinates: u runs down-right, v down-left, z up, in tiles (u, v) and pixels (z); the plot is
// u, v in -1..1 around its centre.
import { Container, Graphics } from 'pixi.js';
import { hexNum, shade } from '../art/color.ts';
import { label } from './kit.ts';

export const BODIES = ['shop', 'house', 'hall', 'tower', 'castle', 'barn', 'terminal', 'station', 'dome', 'observatory', 'arena', 'stilts', 'stalls', 'shelter', 'treehouse', 'swings', 'mansion', 'bungalow'] as const;
export const EXTRAS = [
  // on the walls (under the windows)
  'stripes', 'beams', 'checker', 'rainbow', 'splashes', 'glass',
  // on the walls (over the windows)
  'clock', 'cross', 'awning', 'garage', 'balconies', 'columns', 'ivy', 'fishes',
  // on the roof
  'chimney', 'smoke', 'flag', 'siren', 'antenna', 'helipad', 'rooftrees', 'pool', 'belltower', 'atrium', 'weathervane', 'bunting', 'stars',
  // behind the building
  'hosetower', 'witchtower',
  // on the ground in front
  'kennel', 'trolleys', 'patio', 'palm', 'haybales', 'pumpkins', 'postbox', 'barberpole', 'benches', 'surfboard', 'flowers', 'fence', 'sunroom', 'bats',
] as const;
export type Body = (typeof BODIES)[number];
export type Extra = (typeof EXTRAS)[number];
export type MapDesign = {
  body: Body;
  wall: string;
  roof: string;
  /** Door, awning, flag and sign colour. */
  trim?: string;
  floors?: number;
  /** Footprint scale; 1 is the usual size. */
  size?: number;
  /** Roof shape for shops, halls, houses and towers. */
  top?: 'flat' | 'gable' | 'hip';
  windows?: 'square' | 'tall' | 'round';
  extras?: Extra[];
  /** A giant thing on the roof that shows what the place is, like the doughnut on a doughnut shop (an emoji). */
  prop?: string;
  /** A short word on a board above the door. */
  sign?: string;
};

const HEX = /^#[0-9a-f]{6}$/i;
/** Problems with a design (an empty list when it is fine). */
export function designErrors(d: MapDesign): string[] {
  const out: string[] = [];
  if (!BODIES.includes(d.body)) out.push(`body "${d.body}" is not one of ${BODIES.join(', ')}`);
  for (const k of ['wall', 'roof', 'trim'] as const) if (d[k] !== undefined && !HEX.test(d[k]!)) out.push(`${k}: #rrggbb colour`);
  if (d.floors !== undefined && !(Number.isInteger(d.floors) && d.floors >= 1 && d.floors <= 5)) out.push('floors: 1-5');
  if (d.size !== undefined && !(d.size >= 0.6 && d.size <= 1.3)) out.push('size: 0.6-1.3');
  for (const e of d.extras ?? []) if (!EXTRAS.includes(e)) out.push(`extra "${e}" is not in the kit`);
  if (new Set(d.extras).size !== (d.extras ?? []).length) out.push('extras: no repeats');
  const flatOnly: Extra[] = ['helipad', 'rooftrees', 'pool'];
  const flatTop = ['tower', 'hall', 'shop', 'terminal'].includes(d.body) && (d.top ?? 'flat') === 'flat' && d.body !== 'house';
  for (const e of flatOnly) if (d.extras?.includes(e) && !flatTop) out.push(`"${e}" needs a flat roof (a shop, hall, tower or terminal with top "flat")`);
  if (d.extras?.includes('smoke') && !d.extras.includes('chimney')) out.push('"smoke" needs a "chimney"');
  if (d.sign !== undefined && !/^[A-Z !&']{2,10}$/.test(d.sign)) out.push('sign: 2-10 capital letters');
  if (d.prop !== undefined && (d.prop.length < 1 || d.prop.length > 8)) out.push('prop: one emoji');
  return out;
}

// ---------------------------------------------------------------- geometry
const HW = 48, HH = 24, FH = 24;
type Pt = [number, number];
type Face = 'L' | 'R';
type Box = { u0: number; u1: number; v0: number; v1: number; z0: number; z1: number };
const P = (u: number, v: number, z = 0): Pt => [(u - v) * HW, (u + v) * HH - z];
const flat = (...p: Pt[]) => p.flat();
const ring = (cu: number, cv: number, r: number, z: number, from = 0, to = Math.PI * 2, n = 28): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n).map((t) => P(cu + r * Math.cos(t), cv + r * Math.sin(t), z));

function hull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Pt[]) => {
    const out: Pt[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    return out.slice(0, -1);
  };
  return [...half(p), ...half(p.reverse())];
}

/** What a body tells the add-ons: its main box, the roof height at a point, which face has the door. */
type Anchors = { b: Box; surf: (u: number, v: number) => number; door: Face; doorAt: number; flatTop: boolean };

class Kit {
  readonly g: Graphics;
  readonly c: Container;
  readonly d: MapDesign;
  readonly night: boolean;
  readonly trim: string;
  readonly glass: number;
  chimneyTop: Pt | null = null;
  private spots: Pt[] = [];

  constructor(c: Container, d: MapDesign, night: boolean) {
    this.c = c;
    this.g = new Graphics();
    c.addChild(this.g);
    this.d = d;
    this.night = night;
    this.trim = d.trim ?? '#ffffff';
    this.glass = night ? 0xfff3b0 : 0xcdeeff;
  }

  has(e: Extra): boolean {
    return this.d.extras?.includes(e) ?? false;
  }
  edge(col: string, width = 2) {
    return { color: hexNum(shade(col, -0.5)), width, join: 'round' as const };
  }
  /** A point on the left (v = v1) or right (u = u1) face of a box; `at` runs along u on the left face, v on the right. */
  on(b: Box, face: Face, at: number, z: number, out = 0): Pt {
    return face === 'L' ? P(at, b.v1 + out, z) : P(b.u1 + out, at, z);
  }
  span(b: Box, face: Face): [number, number] {
    return face === 'L' ? [b.u0, b.u1] : [b.v0, b.v1];
  }
  /** A flat panel on a face (window, door, sign, stripe). */
  pane(b: Box, face: Face, at: number, half: number, z0: number, z1: number, fill: number | { color: number; alpha: number }, frame?: string): void {
    this.g.poly(flat(this.on(b, face, at - half, z0), this.on(b, face, at + half, z0), this.on(b, face, at + half, z1), this.on(b, face, at - half, z1))).fill(fill);
    if (frame) this.g.stroke({ color: hexNum(frame), width: 1.5 });
  }

  box(b: Box, wall: string, top: string | null = shade(wall, 0.3)): void {
    const { u0, u1, v0, v1, z0, z1 } = b;
    const e = this.edge(wall);
    this.g.poly(flat(P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1))).fill(hexNum(shade(wall, -0.12))).stroke(e);
    this.g.poly(flat(P(u1, v1, z0), P(u1, v0, z0), P(u1, v0, z1), P(u1, v1, z1))).fill(hexNum(wall)).stroke(e);
    if (top) this.g.poly(flat(P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1))).fill(hexNum(top)).stroke(e);
  }

  /** The main walls, with any wall patterns from the design painted on before the windows go on. */
  walls(b: Box, wall = this.d.wall): void {
    this.box(b, wall, null);
    const t = hexNum(this.trim);
    for (const face of ['L', 'R'] as Face[]) {
      const [a0, a1] = this.span(b, face);
      const len = a1 - a0;
      if (this.has('stripes')) for (let i = 0; i < 8; i += 2) this.pane(b, face, a0 + (len * (i + 0.5)) / 8, len / 16, b.z0, b.z1, t);
      if (this.has('checker')) for (let i = 0; i < 10; i++) this.pane(b, face, a0 + (len * (i + 0.5)) / 10, len / 20, b.z0 + 32 + (i % 2) * 6, b.z0 + 38 + (i % 2) * 6, i % 2 ? t : 0xffffff);
      if (this.has('glass')) this.pane(b, face, (a0 + a1) / 2, len * 0.46, b.z0 + 4, b.z1 - 6, this.night ? 0xfff3b0 : 0x9fd4f0);
      if (this.has('beams')) {
        const brown = { color: 0x6b4a2f, width: 3 };
        for (let k = 0; k <= 4; k++) this.g.moveTo(...this.on(b, face, a0 + (len * k) / 4, b.z0)).lineTo(...this.on(b, face, a0 + (len * k) / 4, b.z1)).stroke(brown);
        for (let z = b.z0 + FH + 8; z < b.z1; z += FH) this.g.moveTo(...this.on(b, face, a0, z)).lineTo(...this.on(b, face, a1, z)).stroke(brown);
        this.g.moveTo(...this.on(b, face, a0, b.z1)).lineTo(...this.on(b, face, a0 + len / 4, b.z1 - FH)).moveTo(...this.on(b, face, a1, b.z1)).lineTo(...this.on(b, face, a1 - len / 4, b.z1 - FH)).stroke(brown);
      }
      if (this.has('splashes'))
        [0xff6b6b, 0xffd36e, 0x4dabf7, 0x8ce99a, 0xb197fc].forEach((col, i) => {
          const [x, y] = this.on(b, face, a0 + len * (0.15 + 0.17 * i), b.z0 + 14 + ((i * 37 + (face === 'L' ? 0 : 19)) % Math.max(20, b.z1 - b.z0 - 24)));
          this.g.circle(x, y, 7).fill(col).circle(x + 6, y + 6, 3).fill(col).circle(x - 5, y + 7, 2.5).fill(col);
        });
      if (this.has('rainbow') && face === 'L') {
        const mid = (a0 + a1) / 2;
        ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc'].forEach((col, i) => {
          const r = len * (0.42 - i * 0.045), rz = (b.z1 - b.z0) * (0.75 - i * 0.08);
          const arc = Array.from({ length: 17 }, (_, j) => this.on(b, 'L', mid + r * Math.cos((Math.PI * j) / 16), b.z0 + 4 + rz * Math.sin((Math.PI * j) / 16)));
          this.g.poly(arc.flat(), false).stroke({ color: hexNum(col), width: 4 });
        });
      }
    }
  }

  /** Rows of windows on a face; `skip` leaves a gap on the ground floor (for the door). */
  windows(b: Box, face: Face, rows: number, n: number, skip?: number, from = 0): void {
    const [a0, a1] = this.span(b, face);
    const step = (a1 - a0) / n;
    const style = this.d.windows ?? 'square';
    for (let f = from; f < rows; f++) {
      const z = b.z0 + 10 + f * FH;
      for (let i = 0; i < n; i++) {
        const at = a0 + step * (i + 0.5);
        if (f === 0 && skip !== undefined && Math.abs(at - skip) < step * 0.7) continue;
        if (style === 'round') {
          const [x, y] = this.on(b, face, at, z + 7);
          this.g.circle(x, y, 6).fill(this.glass).stroke({ color: hexNum(this.trim), width: 1.5 });
        } else {
          const half = Math.min(0.13, step * 0.28), h = style === 'tall' ? 16 : 12;
          this.pane(b, face, at, half, z, z + h, this.glass, this.trim);
        }
      }
    }
  }

  door(b: Box, face: Face, at: number, w = 0.11, h = 28): void {
    const col = this.trim === '#ffffff' ? '#7fd1c7' : this.trim;
    const p = [this.on(b, face, at - w, b.z0), this.on(b, face, at + w, b.z0), this.on(b, face, at + w, b.z0 + h - 4), this.on(b, face, at, b.z0 + h + 2), this.on(b, face, at - w, b.z0 + h - 4)];
    this.g.poly(p.flat()).fill(hexNum(col)).stroke(this.edge(col));
    const [kx, ky] = this.on(b, face, at + w * 0.55, b.z0 + h * 0.45);
    this.g.circle(kx, ky, 1.8).fill(0xffd36e);
  }

  roofFlat(b: Box, col = this.d.roof): (u: number, v: number) => number {
    const { u0, u1, v0, v1, z1 } = b;
    const e = this.edge(col);
    this.g.poly(flat(P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1))).fill(hexNum(shade(col, 0.25))).stroke(e);
    const iu = (u1 - u0) * 0.08, iv = (v1 - v0) * 0.08;
    this.g.poly(flat(P(u0 + iu, v0 + iv, z1), P(u1 - iu, v0 + iv, z1), P(u1 - iu, v1 - iv, z1), P(u0 + iu, v1 - iv, z1))).fill(hexNum(col));
    return () => z1;
  }

  /** A pitched roof; the ridge runs along u (gable end on the right face) or along v (gable end on the left face). */
  gable(b: Box, rh: number, axis: 'u' | 'v' = 'u', col = this.d.roof, endWall = this.d.wall): (u: number, v: number) => number {
    const { u0, u1, v0, v1, z1: z } = b;
    const o = 0.07, e = this.edge(col);
    if (axis === 'u') {
      const m = (v0 + v1) / 2;
      this.g.poly(flat(P(u0 - o, m, z + rh), P(u1 + o, m, z + rh), P(u1 + o, v0 - o, z - 4), P(u0 - o, v0 - o, z - 4))).fill(hexNum(shade(col, -0.25))).stroke(e);
      this.g.poly(flat(P(u1, v1, z), P(u1, v0, z), P(u1, m, z + rh))).fill(hexNum(endWall)).stroke(this.edge(endWall));
      this.g.poly(flat(P(u0 - o, v1 + o, z - 4), P(u1 + o, v1 + o, z - 4), P(u1 + o, m, z + rh), P(u0 - o, m, z + rh))).fill(hexNum(col)).stroke(e);
      return (_u, v) => z + rh * (1 - Math.min(1, Math.abs(v - m) / ((v1 - v0) / 2)));
    }
    const m = (u0 + u1) / 2;
    this.g.poly(flat(P(m, v0 - o, z + rh), P(m, v1 + o, z + rh), P(u0 - o, v1 + o, z - 4), P(u0 - o, v0 - o, z - 4))).fill(hexNum(shade(col, -0.25))).stroke(e);
    this.g.poly(flat(P(u0, v1, z), P(u1, v1, z), P(m, v1, z + rh))).fill(hexNum(shade(endWall, -0.12))).stroke(this.edge(endWall));
    this.g.poly(flat(P(u1 + o, v1 + o, z - 4), P(u1 + o, v0 - o, z - 4), P(m, v0 - o, z + rh), P(m, v1 + o, z + rh))).fill(hexNum(shade(col, -0.1))).stroke(e);
    return (u) => z + rh * (1 - Math.min(1, Math.abs(u - m) / ((u1 - u0) / 2)));
  }

  /** A hipped roof (a pyramid on a square box). */
  hip(b: Box, rh: number, col = this.d.roof): (u: number, v: number) => number {
    const { u0, u1, v0, v1, z1: z } = b;
    const o = 0.07, e = this.edge(col);
    const hu = (u1 - u0) / 2, hv = (v1 - v0) / 2, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    const r = Math.min(hu, hv);
    const a = P(cu - (hu - r), cv - (hv - r), z + rh), c = P(cu + (hu - r), cv + (hv - r), z + rh);
    const A = P(u0 - o, v0 - o, z - 4), B = P(u1 + o, v0 - o, z - 4), C = P(u1 + o, v1 + o, z - 4), D = P(u0 - o, v1 + o, z - 4);
    this.g.poly(flat(A, B, c, a)).fill(hexNum(shade(col, -0.25))).stroke(e);
    this.g.poly(flat(A, D, a)).fill(hexNum(shade(col, -0.25))).stroke(e);
    this.g.poly(flat(D, C, c, a)).fill(hexNum(col)).stroke(e);
    this.g.poly(flat(C, B, c)).fill(hexNum(shade(col, -0.12))).stroke(e);
    return (u, v) => z + rh * (1 - Math.min(1, Math.max(0, Math.max(Math.abs(u - cu) - (hu - r), Math.abs(v - cv) - (hv - r)) / r)));
  }

  roof(b: Box, fallback: 'flat' | 'gable' | 'hip', rh = 36): { surf: (u: number, v: number) => number; flatTop: boolean } {
    const kind = this.d.top ?? fallback;
    if (kind === 'gable') return { surf: this.gable(b, rh), flatTop: false };
    if (kind === 'hip') return { surf: this.hip(b, rh * 0.85), flatTop: false };
    return { surf: this.roofFlat(b), flatTop: true };
  }

  cylinder(cu: number, cv: number, r: number, z0: number, z1: number, wall: string, top: string | null = shade(wall, 0.3)): void {
    const e = this.edge(wall);
    this.g.poly(hull([...ring(cu, cv, r, z0), ...ring(cu, cv, r, z1)]).flat()).fill(hexNum(wall)).stroke(e);
    // The left half is in shade.
    this.g.poly([...ring(cu, cv, r, z0, Math.PI / 4, (Math.PI * 3) / 4, 12), ...ring(cu, cv, r, z1, (Math.PI * 3) / 4, Math.PI / 4, 12)].flat()).fill(hexNum(shade(wall, -0.12)));
    if (top) this.g.poly(ring(cu, cv, r, z1).flat()).fill(hexNum(top)).stroke(e);
  }

  cone(cu: number, cv: number, r: number, z: number, h: number, col: string): void {
    const apex = P(cu, cv, z + h);
    this.g.poly(hull([...ring(cu, cv, r, z), apex]).flat()).fill(hexNum(col)).stroke(this.edge(col));
    this.g.poly([...ring(cu, cv, r, z, Math.PI / 4, (Math.PI * 3) / 4, 12), apex].flat()).fill(hexNum(shade(col, -0.15)));
  }

  dome(cu: number, cv: number, r: number, z: number, h: number, col: string): void {
    const pts: Pt[] = [];
    for (let k = 0; k <= 6; k++) {
      const phi = (Math.PI / 2) * (k / 6);
      pts.push(...ring(cu, cv, r * Math.cos(phi), z + h * Math.sin(phi), 0, Math.PI * 2, 20));
    }
    this.g.poly(hull(pts).flat()).fill(hexNum(col)).stroke(this.edge(col));
    // A shine on the top left.
    const [x, y] = P(cu - r * 0.25, cv + r * 0.1, z + h * 0.75);
    this.g.ellipse(x, y, r * 18, r * 9).fill({ color: 0xffffff, alpha: 0.45 });
  }

  /** The next free spot on the ground in front of the building. */
  spot(a: Anchors): Pt {
    if (!this.spots.length) {
      const { b } = a;
      if (b.v1 <= 0.82) for (const u of [-0.5, 0.15, 0.62]) this.spots.push([u, (b.v1 + 1) / 2]);
      if (b.u1 <= 0.82) for (const v of [0.55, -0.1, -0.6]) this.spots.push([(b.u1 + 1) / 2, v]);
      if (!this.spots.length) this.spots.push([0.95, 0.95], [0.95, 0.3], [0.3, 0.95]);
      this.spots.reverse();
    }
    return this.spots.length > 1 ? this.spots.pop()! : this.spots[0];
  }
}

// ---------------------------------------------------------------- bodies
type BodyDef = { box: (d: MapDesign) => Box; draw: (k: Kit, b: Box) => Anchors };
const floorsOf = (d: MapDesign) => d.floors ?? 1;
const square = (s: number, z1: number): Box => ({ u0: -s, u1: s, v0: -s, v1: s, z0: 0, z1 });

const BODY: Record<Body, BodyDef> = {
  shop: {
    box: (d) => square(0.72 * (d.size ?? 1), 34 + floorsOf(d) * FH),
    draw: (k, b) => {
      const F = floorsOf(k.d);
      k.walls(b);
      k.windows(b, 'L', F, 2);
      k.windows(b, 'R', F, 2, undefined, 1);
      // A shop window and the door on the right face.
      k.pane(b, 'R', b.v0 + (b.v1 - b.v0) * 0.3, (b.v1 - b.v0) * 0.2, b.z0 + 6, b.z0 + 26, k.glass, k.trim);
      const doorAt = b.v0 + (b.v1 - b.v0) * 0.75;
      k.door(b, 'R', doorAt);
      return { b, ...k.roof(b, 'flat'), door: 'R', doorAt };
    },
  },
  house: {
    box: (d) => square(0.72 * (d.size ?? 1), 30 + floorsOf(d) * FH),
    draw: (k, b) => {
      const F = floorsOf(k.d);
      k.walls(b);
      k.windows(b, 'L', F, 2);
      k.windows(b, 'R', F, 3, 0);
      k.door(b, 'R', 0);
      return { b, ...k.roof(b, 'gable', 40), door: 'R', doorAt: 0 };
    },
  },
  hall: {
    box: (d) => {
      const s = d.size ?? 1;
      return { u0: -0.95 * s, u1: 0.95 * s, v0: -0.7 * s, v1: 0.7 * s, z0: 0, z1: 30 + floorsOf(d) * 26 };
    },
    draw: (k, b) => {
      const F = floorsOf(k.d);
      k.walls(b);
      if (!k.has('glass')) k.windows(b, 'L', F, 4);
      if (k.has('garage')) {
        k.door(b, 'L', 0);
        if (!k.has('glass')) k.windows(b, 'R', F, 3, undefined, 1);
        return { b, ...k.roof(b, 'flat'), door: 'L', doorAt: 0 };
      }
      if (!k.has('glass')) k.windows(b, 'R', F, 3, 0);
      k.door(b, 'R', 0, 0.16, 30);
      // A canopy over the door.
      k.g.poly(flat(P(b.u1, 0.24, 36), P(b.u1, -0.24, 36), P(b.u1 + 0.16, -0.24, 33), P(b.u1 + 0.16, 0.24, 33))).fill(hexNum(k.d.roof)).stroke(k.edge(k.d.roof));
      return { b, ...k.roof(b, 'flat'), door: 'R', doorAt: 0 };
    },
  },
  tower: {
    box: (d) => square(0.56 * (d.size ?? 1), 30 + (floorsOf(d) + 2) * FH),
    draw: (k, b) => {
      const F = floorsOf(k.d) + 2;
      k.walls(b);
      if (k.has('glass')) {
        for (let z = b.z0 + FH + 6; z < b.z1 - 4; z += FH / 2) for (const face of ['L', 'R'] as Face[]) k.g.moveTo(...k.on(b, face, k.span(b, face)[0], z)).lineTo(...k.on(b, face, k.span(b, face)[1], z)).stroke({ color: hexNum(k.d.wall), width: 2 });
      } else {
        k.windows(b, 'L', F, 3);
        k.windows(b, 'R', F, 2, b.v0 + (b.v1 - b.v0) * 0.75);
      }
      const doorAt = b.v0 + (b.v1 - b.v0) * 0.6;
      k.door(b, 'R', doorAt, 0.13);
      return { b, ...k.roof(b, 'flat'), door: 'R', doorAt };
    },
  },
  castle: {
    box: (d) => square(0.5 * (d.size ?? 1), 40 + floorsOf(d) * FH),
    draw: (k, b) => {
      const F = floorsOf(k.d), c = b.u1 + 0.06, r = 0.2, th = b.z1 + 26;
      const turret = (cu: number, cv: number) => {
        k.cylinder(cu, cv, r, 0, th, k.d.wall, null);
        const [x, y] = P(cu + r * 0.7, cv + r * 0.7, th - 18);
        k.g.roundRect(x - 3, y, 6, 10, 3).fill(k.glass);
        k.cone(cu, cv, r + 0.05, th, 46, k.d.roof);
        const [fx, fy] = P(cu, cv, th + 46);
        k.g.rect(fx - 1, fy - 18, 2, 18).fill(0x6b6b6b).poly([fx + 1, fy - 18, fx + 14, fy - 13, fx + 1, fy - 8]).fill(hexNum(k.trim));
      };
      turret(-c, -c);
      k.walls(b);
      k.windows(b, 'L', F, 2);
      k.windows(b, 'R', F, 2, undefined, 1);
      k.roofFlat(b, shade(k.d.wall, -0.1));
      // Battlements along the front edges.
      for (let i = 0; i < 5; i++) {
        const t = b.u0 + ((b.u1 - b.u0) * (i + 0.5)) / 5;
        k.box({ u0: t - 0.06, u1: t + 0.06, v0: b.v1 - 0.1, v1: b.v1, z0: b.z1, z1: b.z1 + 10 }, k.d.wall);
        k.box({ u0: b.u1 - 0.1, u1: b.u1, v0: t - 0.06, v1: t + 0.06, z0: b.z1, z1: b.z1 + 10 }, k.d.wall);
      }
      k.door(b, 'R', 0, 0.16, 34);
      turret(-c, c);
      turret(c, -c);
      turret(c, c);
      return { b, surf: () => b.z1, flatTop: true, door: 'R', doorAt: 0 };
    },
  },
  barn: {
    box: (d) => square(0.7 * (d.size ?? 1), 52),
    draw: (k, b) => {
      const { u0, u1, v0, v1, z1: z } = b;
      const rh = 46, kz = z + rh * 0.62, kv = (v1 - v0) * 0.3;
      const col = k.d.roof, e = k.edge(col), white = 0xffffff;
      k.walls(b);
      k.pane(b, 'L', u0 + (u1 - u0) * 0.3, 0.1, 16, 30, k.glass, '#ffffff');
      k.pane(b, 'L', u0 + (u1 - u0) * 0.7, 0.1, 16, 30, k.glass, '#ffffff');
      // Gambrel roof: back slopes, the end wall, then the front slopes.
      k.g.poly(flat(P(u0, 0, z + rh), P(u1, 0, z + rh), P(u1, -kv, kz), P(u0, -kv, kz))).fill(hexNum(shade(col, -0.3))).stroke(e);
      k.g.poly(flat(P(u0, -kv, kz), P(u1, -kv, kz), P(u1, v0 - 0.06, z - 4), P(u0, v0 - 0.06, z - 4))).fill(hexNum(shade(col, -0.3))).stroke(e);
      k.g.poly(flat(P(u1, v1, z), P(u1, kv, kz), P(u1, 0, z + rh), P(u1, -kv, kz), P(u1, v0, z))).fill(hexNum(k.d.wall)).stroke(k.edge(k.d.wall));
      k.g.poly(flat(P(u1, v1, z), P(u1, kv, kz), P(u1, 0, z + rh), P(u1, -kv, kz), P(u1, v0, z))).stroke({ color: white, width: 3 });
      k.g.poly(flat(P(u0 - 0.06, v1 + 0.06, z - 4), P(u1 + 0.06, v1 + 0.06, z - 4), P(u1 + 0.06, kv, kz), P(u0 - 0.06, kv, kz))).fill(hexNum(col)).stroke(e);
      k.g.poly(flat(P(u0 - 0.06, kv, kz), P(u1 + 0.06, kv, kz), P(u1 + 0.06, 0, z + rh), P(u0 - 0.06, 0, z + rh))).fill(hexNum(shade(col, 0.12))).stroke(e);
      // Big doors with a white X, and a hay loft window.
      k.pane(b, 'R', 0, 0.3, 0, 40, hexNum(shade(k.d.wall, -0.2)));
      for (const [a, c] of [[-0.3, 0.3], [0.3, -0.3]]) k.g.moveTo(...k.on(b, 'R', a, 0)).lineTo(...k.on(b, 'R', c, 40)).stroke({ color: white, width: 3 });
      k.g.poly(flat(k.on(b, 'R', -0.3, 0), k.on(b, 'R', 0.3, 0), k.on(b, 'R', 0.3, 40), k.on(b, 'R', -0.3, 40))).stroke({ color: white, width: 3 });
      k.g.moveTo(...k.on(b, 'R', 0, 0)).lineTo(...k.on(b, 'R', 0, 40)).stroke({ color: white, width: 2 });
      k.pane(b, 'R', 0, 0.1, z + 8, z + 22, hexNum('#ffd36e'), '#ffffff');
      for (const [face, a] of [['L', u0], ['R', v0]] as [Face, number][]) k.g.moveTo(...k.on(b, face, a, 0)).lineTo(...k.on(b, face, a, z)).stroke({ color: white, width: 3 });
      k.g.moveTo(...P(u1, v1, 0)).lineTo(...P(u1, v1, z)).stroke({ color: white, width: 3 });
      return { b, surf: (_u, v) => z + rh * (1 - Math.min(1, Math.abs(v) / v1)), flatTop: false, door: 'R', doorAt: 0 };
    },
  },
  terminal: {
    box: () => ({ u0: -0.95, u1: 0.95, v0: -0.15, v1: 0.85, z0: 0, z1: 56 }),
    draw: (k, b) => {
      // The control tower behind the terminal.
      k.cylinder(0.55, -0.6, 0.12, 0, 130, '#ffffff');
      k.cylinder(0.55, -0.6, 0.24, 130, 152, '#9fd4f0', null);
      k.g.poly(hull([...ring(0.55, -0.6, 0.24, 130), ...ring(0.55, -0.6, 0.24, 152)]).flat()).fill(k.night ? 0xfff3b0 : 0x9fd4f0).stroke(k.edge('#9fd4f0'));
      k.cylinder(0.55, -0.6, 0.28, 152, 158, k.d.roof);
      const [ax, ay] = P(0.55, -0.6, 158);
      k.g.rect(ax - 1.5, ay - 26, 3, 26).fill(0x9aa3ad).circle(ax, ay - 28, 4).fill(0xff6b6b);
      k.walls(b);
      for (const face of ['L', 'R'] as Face[]) {
        const [a0, a1] = k.span(b, face);
        k.pane(b, face, (a0 + a1) / 2, (a1 - a0) * 0.44, 8, 46, k.night ? 0xfff3b0 : 0x9fd4f0);
        for (let i = 1; i < 8; i++) k.g.moveTo(...k.on(b, face, a0 + ((a1 - a0) * i) / 8, 8)).lineTo(...k.on(b, face, a0 + ((a1 - a0) * i) / 8, 46)).stroke({ color: hexNum(k.d.wall), width: 2 });
      }
      k.door(b, 'L', 0.1, 0.18, 30);
      // A wavy roof that overhangs the glass.
      const { u0, u1, v0, v1, z1 } = b;
      const wave = (u: number): Pt[] => Array.from({ length: 13 }, (_, i) => P(u, v1 + 0.12 - ((v1 - v0 + 0.24) * i) / 12, z1 + 4 + 16 * Math.sin((Math.PI * i) / 12)));
      const col = k.d.roof;
      k.g.poly(hull([...wave(u0 - 0.06), ...wave(u1 + 0.12)]).flat()).fill(hexNum(col)).stroke(k.edge(col));
      k.g.poly(wave(u1 + 0.12).flat()).fill(hexNum(shade(col, -0.15))).stroke(k.edge(col));
      for (let i = 1; i < 6; i++) k.g.poly(wave(u0 + ((u1 - u0) * i) / 6).slice(0, 7).flat(), false).stroke({ color: hexNum(shade(col, 0.3)), width: 2 });
      return { b, surf: () => z1 + 20, flatTop: false, door: 'L', doorAt: 0.1 };
    },
  },
  station: {
    box: () => ({ u0: -0.95, u1: 0.95, v0: -0.6, v1: 0.3, z0: 0, z1: 48 }),
    draw: (k, b) => {
      const { u0, u1, v0, v1, z1 } = b;
      k.walls(b);
      k.windows(b, 'L', 1, 5);
      // A glass arched roof over the platforms.
      const r = (v1 - v0) / 2, m = (v0 + v1) / 2;
      const arch = (u: number, from = 0, to = Math.PI): Pt[] => Array.from({ length: 15 }, (_, i) => from + ((to - from) * i) / 14).map((t) => P(u, m + r * Math.cos(t), z1 + 34 * Math.sin(t)));
      k.g.poly(hull([...arch(u0), ...arch(u1)]).flat()).fill(k.night ? 0xffe9a8 : 0xbfe3f5).stroke(k.edge(k.d.roof));
      for (let i = 0; i <= 6; i++) k.g.poly(arch(u0 + ((u1 - u0) * i) / 6, 0, Math.PI * 0.75).flat(), false).stroke({ color: hexNum(k.d.roof), width: 2.5 });
      k.g.poly(arch(u1).flat()).fill(hexNum(shade(k.d.wall, 0.1))).stroke(k.edge(k.d.wall));
      const [fx, fy] = P(u1, m, z1 + 14);
      k.g.circle(fx, fy, 10).fill(k.glass).stroke({ color: hexNum(k.d.roof), width: 2 });
      // The clock tower at the front.
      const t: Box = { u0: 0.4, u1: 0.85, v0: 0.3, v1: 0.78, z0: 0, z1: 118 };
      k.walls(t);
      k.pane(t, 'L', 0.62, 0.08, 40, 58, k.glass, k.trim);
      k.pane(t, 'R', 0.54, 0.08, 40, 58, k.glass, k.trim);
      k.door(t, 'R', 0.54, 0.13, 30);
      for (const face of ['L', 'R'] as Face[]) clockAt(k, k.on(t, face, face === 'L' ? 0.62 : 0.54, 92), 11);
      const surf = k.hip(t, 38);
      return { b: t, surf, flatTop: false, door: 'R', doorAt: 0.54 };
    },
  },
  dome: {
    box: () => square(0.78, 44),
    draw: (k, b) => {
      const r = b.u1;
      k.cylinder(0, 0, r, 0, b.z1, k.d.wall, null);
      // Waves round the base.
      const wave = Array.from({ length: 25 }, (_, i) => {
        const t = -Math.PI / 4 + (Math.PI * i) / 24;
        return P(r * Math.cos(t), r * Math.sin(t), 12 + 4 * Math.sin(i * 1.6));
      });
      k.g.poly(wave.flat(), false).stroke({ color: hexNum(k.trim), width: 4 });
      if (k.has('fishes'))
        [0.1, 0.5, 0.9, 1.3].forEach((t, i) => {
          const [x, y] = P(r * Math.cos(t * 1.2 - 0.3), r * Math.sin(t * 1.2 - 0.3), 26 + (i % 2) * 8);
          const col = [0xff9f43, 0xffd36e, 0xff8fb8, 0x8ce99a][i];
          k.g.ellipse(x, y, 7, 4).fill(col).poly([x + 6, y, x + 11, y - 4, x + 11, y + 4]).fill(col).circle(x - 3, y - 1, 1).fill(0x333333);
        });
      // The door faces the front.
      const [dx, dy] = P(r * 0.71, r * 0.71, 0);
      k.g.roundRect(dx - 10, dy - 30, 20, 30, 8).fill(hexNum(k.trim === '#ffffff' ? '#7fd1c7' : k.trim)).stroke(k.edge(k.d.wall));
      k.dome(0, 0, r, b.z1, 58, k.d.roof);
      for (const t of [-0.6, 0, 0.6]) {
        const rib = Array.from({ length: 9 }, (_, i) => {
          const phi = (Math.PI / 2) * (i / 8);
          return P(r * Math.cos(phi) * Math.cos(t + Math.PI / 4), r * Math.cos(phi) * Math.sin(t + Math.PI / 4), b.z1 + 58 * Math.sin(phi));
        });
        k.g.poly(rib.flat(), false).stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
      }
      return { b, surf: () => b.z1 + 58, flatTop: false, door: 'R', doorAt: 0 };
    },
  },
  observatory: {
    box: () => square(0.5, 54),
    draw: (k, b) => {
      const r = b.u1;
      // A low wing at the side.
      const wing: Box = { u0: -0.95, u1: -0.3, v0: -0.2, v1: 0.55, z0: 0, z1: 36 };
      k.walls(wing);
      k.windows(wing, 'L', 1, 2);
      k.roofFlat(wing, shade(k.d.wall, -0.1));
      k.cylinder(0, 0, r, 0, b.z1, k.d.wall, null);
      const [dx, dy] = P(r * 0.71, r * 0.71, 0);
      k.g.roundRect(dx - 9, dy - 28, 18, 28, 8).fill(hexNum(k.trim)).stroke(k.edge(k.d.wall));
      k.dome(0, 0, r + 0.04, b.z1, 46, k.d.roof);
      // The slit and the telescope looking out of it.
      const slit = Array.from({ length: 7 }, (_, i) => {
        const phi = (Math.PI / 2) * (i / 6);
        return P((r + 0.04) * Math.cos(phi) * 0.71, (r + 0.04) * Math.cos(phi) * 0.71, b.z1 + 46 * Math.sin(phi));
      });
      k.g.poly(slit.flat(), false).stroke({ color: 0x2b2550, width: 9 });
      const [tx, ty] = P(0, 0, b.z1 + 34);
      k.g.moveTo(tx, ty).lineTo(tx + 34, ty - 36).stroke({ color: 0x6b7280, width: 9, cap: 'round' }).circle(tx + 34, ty - 36, 5).fill(0xcdeeff);
      return { b, surf: () => b.z1 + 46, flatTop: false, door: 'R', doorAt: 0 };
    },
  },
  arena: {
    box: () => square(0.92, 44),
    draw: (k, b) => {
      const r = b.u1, z = b.z1;
      k.cylinder(0, 0, r, 0, z, k.d.wall, null);
      for (let i = 0; i < 9; i++) {
        const t = -Math.PI / 4 + (Math.PI * (i + 0.5)) / 9;
        const [x, y] = P(r * Math.cos(t), r * Math.sin(t), 0);
        k.g.roundRect(x - 6, y - 24, 12, 22, 6).fill(hexNum(shade(k.d.wall, -0.35)));
      }
      k.g.poly([...ring(0, 0, r, 28, -Math.PI / 4, (Math.PI * 3) / 4, 20), ...ring(0, 0, r, 35, (Math.PI * 3) / 4, -Math.PI / 4, 20)].flat()).fill(hexNum(k.trim));
      // Seats round the top and the pitch in the middle.
      k.g.poly(ring(0, 0, r, z).flat()).fill(hexNum(k.d.roof)).stroke(k.edge(k.d.roof));
      k.g.poly(ring(0, 0, r * 0.78, z).flat()).fill(hexNum(shade(k.d.roof, 0.3)));
      k.g.poly(ring(0, 0, r * 0.62, z).flat()).fill(0x5cc86a).stroke({ color: 0xffffff, width: 2 });
      k.g.poly(ring(0, 0, r * 0.38, z).flat()).stroke({ color: 0xffffff, width: 2 });
      for (let i = 0; i < 8; i++) {
        const t = (Math.PI * 2 * i) / 8;
        const [x, y] = P(r * Math.cos(t), r * Math.sin(t), z);
        k.g.rect(x - 1, y - 22, 2, 22).fill(0x6b6b6b).poly([x + 1, y - 22, x + 13, y - 18, x + 1, y - 14]).fill([0xff6b6b, 0xffd36e, 0x4dabf7, 0x8ce99a][i % 4]);
      }
      return { b, surf: () => z, flatTop: false, door: 'R', doorAt: 0 };
    },
  },
  stilts: {
    box: (d) => ({ ...square(0.6 * (d.size ?? 1), 0), z0: 24, z1: 24 + 30 + floorsOf(d) * FH }),
    draw: (k, b) => {
      const F = floorsOf(k.d), s = b.u1, wood = '#c9a27a';
      for (const [u, v] of [[-s, -s], [-s, s], [s, -s], [s, s]]) k.box({ u0: u - 0.04, u1: u + 0.04, v0: v - 0.04, v1: v + 0.04, z0: 0, z1: 24 }, wood);
      k.walls(b);
      k.windows(b, 'L', F, 2);
      k.windows(b, 'R', F, 3, 0);
      k.door(b, 'R', 0);
      const surf = k.gable(b, 36);
      // The deck and steps on the door side.
      const deck: Box = { u0: s, u1: s + 0.3, v0: -s, v1: s, z0: 20, z1: 24 };
      k.box(deck, wood);
      for (let i = 0; i <= 6; i++) {
        const [x, y] = P(s + 0.3, -s + (2 * s * i) / 6, 24);
        k.g.rect(x - 1, y - 12, 2, 12).fill(0xffffff);
      }
      k.g.moveTo(...P(s + 0.3, s, 36)).lineTo(...P(s + 0.3, -s, 36)).stroke({ color: 0xffffff, width: 2 });
      for (let i = 0; i < 4; i++) k.box({ u0: s + 0.3 + i * 0.07, u1: s + 0.37 + i * 0.07, v0: 0.3, v1: s, z0: 0, z1: 20 - i * 5 }, wood);
      return { b, surf, flatTop: false, door: 'R', doorAt: 0 };
    },
  },
  stalls: {
    box: () => ({ u0: -0.85, u1: 0.85, v0: -0.4, v1: 0.05, z0: 0, z1: 32 }),
    draw: (k, b) => {
      const cols = [k.d.wall, k.trim, k.d.roof];
      [-0.58, 0, 0.58].forEach((cu, i) => {
        const s: Box = { u0: cu - 0.25, u1: cu + 0.25, v0: -0.4, v1: 0.05, z0: 0, z1: 32 };
        const col = cols[i % 3];
        k.box(s, col, shade(col, 0.3));
        k.pane(s, 'L', cu, 0.17, 10, 26, hexNum(shade(col, -0.45)));
        k.box({ u0: cu - 0.22, u1: cu + 0.22, v0: 0.05, v1: 0.14, z0: 8, z1: 12 }, '#ffffff');
        // Striped awning.
        for (let j = 0; j < 4; j++) {
          const a = cu - 0.27 + j * 0.135;
          k.g.poly(flat(P(a, 0.05, 34), P(a + 0.135, 0.05, 34), P(a + 0.135, 0.3, 26), P(a, 0.3, 26))).fill(j % 2 ? 0xffffff : hexNum(shade(col, -0.15)));
        }
      });
      // Tables with umbrellas out front.
      for (const u of [-0.35, 0.4]) umbrella(k, P(u, 0.7, 0), u < 0 ? k.trim : k.d.roof);
      return { b, surf: () => 34, flatTop: false, door: 'L', doorAt: 0 };
    },
  },
  shelter: {
    box: () => ({ u0: -0.85, u1: 0.85, v0: -0.5, v1: 0.4, z0: 0, z1: 50 }),
    draw: (k, b) => {
      k.g.poly(flat(P(-0.95, -0.6), P(0.95, -0.6), P(0.95, 0.75), P(-0.95, 0.75))).fill(0xd8d0c8).stroke({ color: 0xffffff, width: 2 });
      k.g.poly(flat(P(-0.9, 0.85), P(0.9, 0.85), P(0.9, 0.98), P(-0.9, 0.98))).fill(0xffd43b);
      const glassBox: Box = { u0: -0.8, u1: 0.8, v0: -0.46, v1: -0.38, z0: 0, z1: 44 };
      k.g.poly(flat(P(-0.8, -0.38, 0), P(0.8, -0.38, 0), P(0.8, -0.38, 44), P(-0.8, -0.38, 44))).fill({ color: 0xbfe3f5, alpha: 0.75 }).stroke({ color: hexNum(k.d.wall), width: 3 });
      k.box({ ...glassBox, u0: 0.76 }, k.d.wall);
      k.box({ u0: -0.5, u1: 0.5, v0: -0.34, v1: -0.18, z0: 10, z1: 14 }, '#c9a27a');
      for (const u of [-0.8, 0.8]) k.box({ u0: u - 0.04, u1: u + 0.04, v0: 0.26, v1: 0.34, z0: 0, z1: 44 }, k.d.wall);
      k.box({ u0: -0.9, u1: 0.9, v0: -0.52, v1: 0.42, z0: 44, z1: 50 }, k.d.roof);
      // The bus stop sign.
      const [x, y] = P(0.92, 0.62, 0);
      k.g.rect(x - 2, y - 66, 4, 66).fill(0x6b6b6b).circle(x, y - 70, 12).fill(0xffffff).stroke({ color: 0xe03131, width: 4 }).rect(x - 13, y - 73, 26, 6).fill(0x1c7ed6);
      return { b, surf: () => 50, flatTop: false, door: 'L', doorAt: 0 };
    },
  },
  treehouse: {
    box: () => ({ ...square(0.34, 0), z0: 72, z1: 108 }),
    draw: (k, b) => {
      const green = '#3fa66b', leaf = hexNum(green), dark = hexNum(shade(green, -0.2)), light = hexNum(shade(green, 0.2));
      const [cx, cy] = P(0, 0, 0);
      for (const [x, y, r] of [[-56, -150, 44], [50, -158, 46], [0, -190, 48], [-20, -128, 40]]) k.g.circle(cx + x, cy + y, r).fill(dark);
      k.cylinder(0, 0, 0.17, 0, 80, '#8a5a3c', null);
      for (const [dx, dz, w] of [[-30, 50, 0.35], [26, 60, -0.3]]) k.g.moveTo(cx, cy - dz).lineTo(cx + dx, cy - dz - 26).stroke({ color: 0x8a5a3c, width: 8, cap: 'round' }).circle(cx + dx, cy - dz - 32, 16 + w).fill(leaf);
      k.box({ ...square(0.46, 72), z0: 66 }, '#a8774f');
      k.walls(b);
      k.windows(b, 'L', 1, 1);
      k.door(b, 'R', 0, 0.1, 24);
      const surf = k.gable(b, 28);
      for (const [x, y, r] of [[-62, -96, 20], [64, -104, 22], [70, -150, 18]]) k.g.circle(cx + x, cy + y, r).fill(light);
      // A rope ladder down to the ground.
      const top = P(0.46, 0.15, 66), bot = P(0.75, 0.15, 0);
      for (const dv of [-0.08, 0.08]) k.g.moveTo(top[0] + dv * -48, top[1]).lineTo(bot[0] + dv * -48, bot[1]).stroke({ color: 0xc9a27a, width: 2 });
      for (let i = 1; i < 7; i++) {
        const f = i / 7, x = top[0] + (bot[0] - top[0]) * f, y = top[1] + (bot[1] - top[1]) * f;
        k.g.moveTo(x - 5, y).lineTo(x + 5, y).stroke({ color: 0xa8774f, width: 2.5 });
      }
      return { b, surf, flatTop: false, door: 'R', doorAt: 0 };
    },
  },
  swings: {
    box: () => ({ ...square(0.7, 84) }),
    draw: (k, b) => {
      ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc'].forEach((col, i) => {
        const [x, y] = P(-0.3, -0.5, 0);
        k.g.arc(x, y, 84 - i * 7, Math.PI, 0).stroke({ color: hexNum(col), width: 7 });
      });
      const pole = hexNum(k.d.wall), e = { color: pole, width: 6, cap: 'round' as const };
      for (const u of [-0.7, 0.7]) k.g.moveTo(...P(u, -0.35, 0)).lineTo(...P(u, 0, 84)).lineTo(...P(u, 0.35, 0)).stroke(e);
      k.g.moveTo(...P(-0.7, 0, 84)).lineTo(...P(0.7, 0, 84)).stroke({ color: pole, width: 7, cap: 'round' });
      for (const [u, col] of [[-0.3, k.trim], [0.3, k.d.roof]] as [number, string][]) {
        const [x, y] = P(u, 0, 84), [sx, sy] = P(u, 0.1, 26);
        k.g.moveTo(x - 8, y).lineTo(sx - 8, sy).moveTo(x + 8, y).lineTo(sx + 8, sy).stroke({ color: 0xffffff, width: 2 });
        k.g.roundRect(sx - 12, sy - 3, 24, 7, 3).fill(hexNum(col)).stroke(k.edge(col));
      }
      return { b, surf: () => 84, flatTop: false, door: 'R', doorAt: 0 };
    },
  },
  mansion: {
    box: (d) => ({ u0: -0.38, u1: 0.38, v0: -0.75, v1: 0.82, z0: 0, z1: 44 + floorsOf(d) * FH }),
    draw: (k, b) => {
      const F = floorsOf(k.d), wz = b.z1 - 28;
      const wing = (u0: number, u1: number) => {
        const w: Box = { u0, u1, v0: -0.55, v1: 0.55, z0: 0, z1: wz };
        k.walls(w);
        k.windows(w, 'L', Math.max(1, F), 2);
        k.windows(w, 'R', Math.max(1, F), 2);
        k.hip(w, 18);
      };
      wing(-0.95, -0.38);
      k.walls(b);
      k.windows(b, 'L', F + 1, 2, 0);
      k.windows(b, 'R', F + 1, 1, undefined, 1);
      k.door(b, 'L', 0, 0.12, 32);
      const surf = k.gable(b, 34, 'v');
      wing(0.38, 0.95);
      return { b, surf, flatTop: false, door: 'L', doorAt: 0 };
    },
  },
  bungalow: {
    box: () => ({ u0: -0.9, u1: 0.9, v0: -0.5, v1: 0.4, z0: 0, z1: 50 }),
    draw: (k, b) => {
      k.walls(b);
      k.windows(b, 'L', 1, 4);
      k.windows(b, 'R', 1, 3, 0);
      k.door(b, 'R', 0);
      return { b, surf: k.gable(b, 32), flatTop: false, door: 'R', doorAt: 0 };
    },
  },
};

// ---------------------------------------------------------------- add-ons
function clockAt(k: Kit, [x, y]: Pt, r = 10): void {
  k.g.circle(x, y, r).fill(0xffffff).stroke({ color: 0x5a3d4f, width: 2 });
  k.g.moveTo(x, y).lineTo(x, y - r * 0.7).moveTo(x, y).lineTo(x + r * 0.5, y + r * 0.1).stroke({ color: 0x5a3d4f, width: 2, cap: 'round' });
}

function umbrella(k: Kit, [x, y]: Pt, col: string): void {
  k.g.ellipse(x, y - 12, 9, 4).fill(0xffffff).stroke(k.edge('#ffffff'));
  k.g.rect(x - 1, y - 34, 2, 34).fill(0x8a8a8a);
  k.g.poly([x - 22, y - 30, x, y - 44, x + 22, y - 30]).fill(hexNum(col)).stroke(k.edge(col));
  k.g.poly([x - 8, y - 30, x, y - 44, x + 8, y - 30]).fill(0xffffff);
}

function tinyTree(k: Kit, [x, y]: Pt, s = 1): void {
  k.g.rect(x - 2 * s, y - 14 * s, 4 * s, 14 * s).fill(0x8a5a3c).circle(x, y - 20 * s, 10 * s).fill(0x3fa66b);
}

const BACK: Extra[] = ['hosetower', 'witchtower'];

function backExtra(k: Kit, e: Extra, b: Box): void {
  if (e === 'hosetower') {
    const t: Box = { u0: b.u0, u1: b.u0 + 0.38, v0: b.v0, v1: b.v0 + 0.38, z0: 0, z1: b.z1 + 56 };
    k.box(t, k.d.wall, shade(k.d.roof, 0.2));
    for (let z = b.z1 + 8; z < t.z1 - 10; z += 18) k.pane(t, 'L', b.u0 + 0.19, 0.06, z, z + 10, k.glass, k.trim);
  }
  if (e === 'witchtower') {
    const t: Box = { u0: b.u1 - 0.36, u1: b.u1 + 0.02, v0: b.v0 - 0.02, v1: b.v0 + 0.36, z0: 0, z1: b.z1 + 30 };
    k.box(t, shade(k.d.wall, -0.05), null);
    k.pane(t, 'R', t.v0 + 0.19, 0.07, t.z1 - 22, t.z1 - 8, 0xffd43b, '#3d2457');
    k.hip(t, 62);
  }
}

function frontExtra(k: Kit, e: Extra, a: Anchors): void {
  const { b, surf } = a;
  const g = k.g;
  const cu = (b.u0 + b.u1) / 2, cv = (b.v0 + b.v1) / 2;
  const top = surf(cu, cv);
  switch (e) {
    case 'clock': {
      const face: Face = a.door === 'R' ? 'L' : 'R';
      const [a0, a1] = k.span(b, face);
      clockAt(k, k.on(b, face, (a0 + a1) / 2, b.z1 - 16), 11);
      break;
    }
    case 'cross': {
      const [x, y] = k.on(b, 'L', b.u0 + (b.u1 - b.u0) * 0.25, b.z1 - 22);
      const col = hexNum(k.d.trim ?? '#e03131');
      g.roundRect(x - 13, y - 13, 26, 26, 5).fill(0xffffff).stroke({ color: col, width: 2 }).rect(x - 3.5, y - 10, 7, 20).fill(col).rect(x - 10, y - 3.5, 20, 7).fill(col);
      break;
    }
    case 'awning': {
      const face = a.door, [a0, a1] = k.span(b, face), n = 8;
      for (let i = 0; i < n; i++) {
        const s0 = a0 + 0.04 + ((a1 - a0 - 0.08) * i) / n, s1 = a0 + 0.04 + ((a1 - a0 - 0.08) * (i + 1)) / n;
        g.poly(flat(k.on(b, face, s0, b.z0 + 36), k.on(b, face, s1, b.z0 + 36), k.on(b, face, s1, b.z0 + 27, 0.18), k.on(b, face, s0, b.z0 + 27, 0.18))).fill(i % 2 ? 0xffffff : hexNum(k.trim));
      }
      g.poly(flat(k.on(b, face, a0 + 0.04, b.z0 + 27, 0.18), k.on(b, face, a1 - 0.04, b.z0 + 27, 0.18)), false).stroke(k.edge(k.trim));
      break;
    }
    case 'garage':
      for (const at of [-0.36, 0.36]) {
        k.pane(b, 'R', at, 0.26, 0, 40, hexNum(k.trim), '#ffffff');
        for (let z = 8; z < 40; z += 8) g.moveTo(...k.on(b, 'R', at - 0.24, z)).lineTo(...k.on(b, 'R', at + 0.24, z)).stroke({ color: 0xffffff, width: 1.5, alpha: 0.8 });
        k.pane(b, 'R', at, 0.18, 26, 33, k.glass);
      }
      break;
    case 'balconies':
      for (let z = b.z0 + 10 + FH; z < b.z1 - 20; z += FH) {
        const [a0, a1] = k.span(b, 'L');
        g.poly(flat(k.on(b, 'L', a0 + 0.06, z - 2), k.on(b, 'L', a1 - 0.06, z - 2), k.on(b, 'L', a1 - 0.06, z - 2, 0.1), k.on(b, 'L', a0 + 0.06, z - 2, 0.1))).fill(0xffffff);
        g.poly(flat(k.on(b, 'L', a0 + 0.06, z + 6, 0.1), k.on(b, 'L', a1 - 0.06, z + 6, 0.1)), false).stroke({ color: hexNum(k.trim), width: 2 });
      }
      break;
    case 'columns': {
      const face = a.door, at = a.doorAt, h = b.z0 + FH + 22;
      for (const d of [-0.3, -0.16, 0.16, 0.3]) {
        const [x, y] = k.on(b, face, at + d, b.z0, 0.12);
        g.rect(x - 3, y - h, 6, h).fill(0xffffff).stroke({ color: 0xc8c0b8, width: 1 });
      }
      g.poly(flat(k.on(b, face, at - 0.38, h, 0.12), k.on(b, face, at + 0.38, h, 0.12), k.on(b, face, at, h + 18, 0.12))).fill(0xffffff).stroke({ color: 0xc8c0b8, width: 2 });
      break;
    }
    case 'ivy':
      for (const [face, a0] of [['L', b.u0], ['R', b.v0]] as [Face, number][])
        for (let i = 0; i < 14; i++) {
          const [x, y] = k.on(b, face, a0 + 0.04 + (i % 4) * 0.07, b.z0 + 6 + i * ((b.z1 - b.z0) / 16));
          g.circle(x, y, 5).fill(i % 3 ? 0x3f8f5f : 0x5cb85c);
        }
      break;
    case 'fishes':
      if (k.d.body !== 'dome')
        for (let i = 0; i < 3; i++) {
          const [x, y] = k.on(b, 'L', b.u0 + (b.u1 - b.u0) * (0.2 + 0.3 * i), b.z0 + 40 + (i % 2) * 10);
          g.ellipse(x, y, 8, 5).fill(0xff9f43).poly([x + 7, y, x + 13, y - 5, x + 13, y + 5]).fill(0xff9f43);
        }
      break;
    case 'chimney': {
      const u = b.u0 + (b.u1 - b.u0) * 0.28, v = b.v0 + (b.v1 - b.v0) * 0.6;
      const z = surf(u, v);
      const zt = Math.max(z + 16, top + 10);
      k.box({ u0: u - 0.07, u1: u + 0.07, v0: v - 0.07, v1: v + 0.07, z0: z - 8, z1: zt }, '#b8433f', '#6b3a2a');
      k.chimneyTop = P(u, v, zt);
      break;
    }
    case 'smoke':
      if (k.chimneyTop) {
        const [x, y] = k.chimneyTop;
        for (const [dx, dy, r] of [[2, -10, 6], [8, -22, 8], [3, -36, 10]]) g.circle(x + dx, y + dy, r).fill({ color: 0xffffff, alpha: 0.75 });
      }
      break;
    case 'flag': {
      const [x, y] = P(cu, cv, top);
      g.rect(x - 1.5, y - 40, 3, 40).fill(0x6b6b6b).poly([x + 1.5, y - 40, x + 24, y - 33, x + 1.5, y - 26]).fill(hexNum(k.trim)).stroke(k.edge(k.trim, 1));
      break;
    }
    case 'siren': {
      const [x, y] = P(cu + (b.u1 - cu) * 0.4, cv + (b.v1 - cv) * 0.4, top);
      const col = hexNum(k.trim);
      if (k.night) g.circle(x, y - 8, 24).fill({ color: col, alpha: 0.3 });
      g.roundRect(x - 14, y - 6, 28, 6, 2).fill(0x5a5f6a).ellipse(x - 6, y - 8, 7, 6).fill(col).ellipse(x + 6, y - 8, 7, 6).fill(col === 0x1c7ed6 ? 0xe03131 : 0xffffff);
      break;
    }
    case 'antenna': {
      const [x, y] = P(cu, cv, top);
      g.rect(x - 2, y - 44, 4, 44).fill(0x9aa3ad).circle(x, y - 46, 5).fill(0xff6b6b);
      if (k.night) g.circle(x, y - 46, 12).fill({ color: 0xff6b6b, alpha: 0.35 });
      break;
    }
    case 'helipad': {
      const [x, y] = P(cu, cv, top);
      const r = Math.min(b.u1 - b.u0, b.v1 - b.v0) * 0.36;
      g.ellipse(x, y, r * HW * Math.SQRT2, r * HH * Math.SQRT2).fill(0x5a5f6a).stroke({ color: 0xffffff, width: 2 });
      g.moveTo(x - 8, y - 5).lineTo(x - 8, y + 5).moveTo(x + 8, y - 5).lineTo(x + 8, y + 5).moveTo(x - 8, y).lineTo(x + 8, y).stroke({ color: 0xffd43b, width: 3 });
      break;
    }
    case 'rooftrees':
      for (const [u, v] of [[b.u0 + 0.2, b.v0 + 0.2], [b.u0 + 0.2, b.v1 - 0.25], [b.u1 - 0.25, b.v0 + 0.2]]) tinyTree(k, P(u, v, top));
      break;
    case 'pool': {
      const i = 0.18;
      g.poly(flat(P(cu - i, b.v0 + 0.1, top), P(b.u1 - 0.1, b.v0 + 0.1, top), P(b.u1 - 0.1, cv + i, top), P(cu - i, cv + i, top))).fill(0x7fd1ff).stroke({ color: 0xffffff, width: 2 });
      break;
    }
    case 'belltower': {
      const t: Box = { u0: cu - 0.14, u1: cu + 0.14, v0: cv - 0.14, v1: cv + 0.14, z0: top, z1: top + 30 };
      k.box(t, k.d.wall, null);
      k.pane(t, 'L', cu, 0.07, top + 8, top + 24, 0x5a3d4f);
      const [x, y] = k.on(t, 'L', cu, top + 14);
      g.ellipse(x, y, 4, 5).fill(0xffd43b);
      k.hip(t, 22);
      break;
    }
    case 'atrium':
      k.dome(cu, cv, Math.min(b.u1 - b.u0, b.v1 - b.v0) * 0.3, top, 34, '#9fd4f0');
      break;
    case 'weathervane': {
      const [x, y] = P(cu, cv, top);
      g.rect(x - 1, y - 30, 2, 30).fill(0x5a5f6a).moveTo(x - 12, y - 24).lineTo(x + 12, y - 24).stroke({ color: 0x5a5f6a, width: 2 });
      g.poly([x - 8, y - 34, x + 4, y - 34, x + 8, y - 40, x + 2, y - 44, x - 4, y - 38]).fill(0x5a5f6a);
      break;
    }
    case 'bunting': {
      const colours = [0xff6b6b, 0xffd43b, 0x4dabf7, 0x8ce99a, 0xb197fc];
      const edge: Pt[] = [P(b.u0, b.v1, b.z1 - 2), P(b.u1, b.v1, b.z1 - 2), P(b.u1, b.v0, b.z1 - 2)];
      let n = 0;
      for (let s = 0; s < 2; s++)
        for (let i = 0; i < 7; i++) {
          const [x0, y0] = edge[s], [x1, y1] = edge[s + 1];
          const f0 = i / 7, f1 = (i + 1) / 7;
          const ax = x0 + (x1 - x0) * f0, ay = y0 + (y1 - y0) * f0, bx = x0 + (x1 - x0) * f1, by = y0 + (y1 - y0) * f1;
          g.poly([ax, ay, bx, by, (ax + bx) / 2, (ay + by) / 2 + 10]).fill(colours[n++ % colours.length]);
        }
      break;
    }
    case 'stars':
      for (const [dx, dy, r] of [[-60, -40, 3], [50, -70, 4], [70, -20, 2.5], [-40, -90, 2.5], [10, -110, 3.5]]) {
        const [x, y] = P(cu, cv, top);
        g.star(x + dx, y + dy, 5, r * 2, r).fill(0xffe066);
      }
      break;
    case 'sunroom': {
      const s: Box = { u0: b.u0 + 0.2, u1: b.u0 + 1, v0: b.v1, v1: b.v1 + 0.42, z0: 0, z1: 30 };
      k.g.poly(flat(P(s.u0, s.v1, 0), P(s.u1, s.v1, 0), P(s.u1, s.v1, 30), P(s.u0, s.v1, 30))).fill({ color: k.night ? 0xfff3b0 : 0xbfe3f5, alpha: 0.9 }).stroke({ color: 0xffffff, width: 2 });
      k.g.poly(flat(P(s.u1, s.v1, 0), P(s.u1, s.v0, 0), P(s.u1, s.v0, 30), P(s.u1, s.v1, 30))).fill({ color: k.night ? 0xfff3b0 : 0xd8f0fa, alpha: 0.9 }).stroke({ color: 0xffffff, width: 2 });
      for (let i = 1; i < 5; i++) k.g.moveTo(...P(s.u0 + ((s.u1 - s.u0) * i) / 5, s.v1, 0)).lineTo(...P(s.u0 + ((s.u1 - s.u0) * i) / 5, s.v1, 30)).stroke({ color: 0xffffff, width: 2 });
      k.g.poly(flat(P(s.u0, s.v0, 30), P(s.u1, s.v0, 30), P(s.u1, s.v1, 30), P(s.u0, s.v1, 30))).fill(0xffffff).stroke({ color: 0xd8d0c8, width: 2 });
      tinyTree(k, P(s.u0 + 0.3, s.v0 + 0.2, 0), 0.6);
      break;
    }
    case 'bats':
      for (const [dx, dy] of [[-50, -50], [40, -80], [70, -40]]) {
        const [x, y] = P(cu, cv, top);
        g.poly([x + dx - 10, y + dy, x + dx - 4, y + dy - 4, x + dx, y + dy + 2, x + dx + 4, y + dy - 4, x + dx + 10, y + dy, x + dx, y + dy + 5]).fill(0x3d2457);
      }
      break;
    case 'flowers':
      for (const [face, a0, a1] of [['L', b.u0, b.u1], ['R', b.v0, b.v1]] as [Face, number, number][])
        for (let i = 0; i < 7; i++) {
          if (face === a.door && Math.abs(a0 + ((a1 - a0) * (i + 0.5)) / 7 - a.doorAt) < 0.2) continue;
          const [x, y] = k.on(b, face, a0 + ((a1 - a0) * (i + 0.5)) / 7, b.z0 + 3, 0.06);
          g.circle(x, y, 4).fill(0x3fa66b).circle(x, y - 3, 3).fill([0xff8fb8, 0xffd43b, 0xffffff, 0xb197fc][i % 4]);
        }
      break;
    case 'fence':
      for (let i = 0; i <= 10; i++) {
        for (const [x, y] of [P(-0.98 + i * 0.196, 0.98), P(0.98, 0.98 - i * 0.196)]) g.rect(x - 1.5, y - 12, 3, 12).fill(0xffffff);
      }
      g.poly(flat(P(-0.98, 0.98, 8), P(0.98, 0.98, 8), P(0.98, -0.98, 8)), false).stroke({ color: 0xffffff, width: 2 });
      break;
    default:
      groundExtra(k, e, k.spot(a), a);
  }
}

function groundExtra(k: Kit, e: Extra, [u, v]: Pt, a: Anchors): void {
  const g = k.g;
  const [x, y] = P(u, v, 0);
  switch (e) {
    case 'kennel': {
      const t: Box = { u0: u - 0.12, u1: u + 0.12, v0: v - 0.12, v1: v + 0.12, z0: 0, z1: 14 };
      k.box(t, '#c9a27a', null);
      k.pane(t, a.door, a.door === 'L' ? u : v, 0.05, 0, 9, 0x3d2b1f);
      k.gable(t, 10, 'u', k.d.roof, '#c9a27a');
      break;
    }
    case 'trolleys':
      for (const d of [0, 14]) g.roundRect(x - 10 + d, y - 16 - d / 3, 16, 11, 2).stroke({ color: 0x9aa3ad, width: 2 }).circle(x - 6 + d, y - 3 - d / 3, 2).circle(x + 4 + d, y - 3 - d / 3, 2).fill(0x5a5f6a);
      break;
    case 'patio':
      umbrella(k, [x, y], k.trim);
      break;
    case 'palm':
      g.moveTo(x, y).quadraticCurveTo(x + 8, y - 40, x + 4, y - 70).stroke({ color: 0xa8774f, width: 6, cap: 'round' });
      for (const t of [-2.6, -2.0, -1.4, -0.8, -0.2]) g.ellipse(x + 4 + Math.cos(t) * 18, y - 70 + Math.sin(t) * 9, 18, 5).fill(0x3fa66b);
      break;
    case 'haybales':
      for (const [dx, dy] of [[0, 0], [16, 6], [8, -10]]) g.roundRect(x + dx - 9, y + dy - 14, 18, 14, 4).fill(0xf0c94a).stroke({ color: 0xc9a227, width: 1.5 });
      break;
    case 'pumpkins':
      for (const [dx, dy, r] of [[0, 0, 9], [16, 5, 7], [-14, 4, 6]]) g.ellipse(x + dx, y + dy - r, r * 1.2, r).fill(0xff9f43).stroke({ color: 0xc4502a, width: 1.5 }).rect(x + dx - 1, y + dy - r * 2 - 4, 2, 5).fill(0x3fa66b);
      break;
    case 'postbox':
      g.roundRect(x - 6, y - 28, 12, 28, 5).fill(0xe03131).stroke({ color: 0x8a1c1c, width: 1.5 }).rect(x - 4, y - 20, 8, 2).fill(0x3d2b1f);
      break;
    case 'barberpole':
      g.roundRect(x - 4, y - 36, 8, 34, 3).fill(0xffffff).stroke({ color: 0x9aa3ad, width: 1 });
      for (let i = 0; i < 4; i++) g.poly([x - 4, y - 8 - i * 8, x + 4, y - 14 - i * 8, x + 4, y - 11 - i * 8, x - 4, y - 5 - i * 8]).fill(0xe03131);
      g.circle(x, y - 38, 4).fill(0xffd43b);
      break;
    case 'benches':
      g.rect(x - 14, y - 10, 28, 4).fill(0xa8774f).rect(x - 14, y - 18, 28, 4).fill(0xa8774f).rect(x - 12, y - 6, 2, 6).rect(x + 10, y - 6, 2, 6).fill(0x5a5f6a);
      break;
    case 'surfboard':
      g.ellipse(x, y - 22, 6, 24).fill(hexNum(k.trim)).stroke(k.edge(k.trim)).rect(x - 1, y - 44, 2, 44).fill(0xffffff);
      break;
  }
}

/** Draw a building for a design. Returns the container and how high the building reaches (for its sign). */
export function drawBuilding(d: MapDesign, night: boolean): { c: Container; height: number } {
  const c = new Container();
  const def = BODY[d.body];
  const b = def.box(d);
  const k = new Kit(c, d, night);
  const reach = Math.max(b.u1, b.v1, -b.u0, -b.v0, 0.6);
  if (d.body !== 'swings') k.g.ellipse(0, 6, reach * 90, reach * 45).fill({ color: 0x000000, alpha: 0.1 });
  if (d.extras?.includes('fence')) frontExtra(k, 'fence', { b, surf: () => 0, door: 'R', doorAt: 0, flatTop: false });
  for (const e of d.extras ?? []) if (BACK.includes(e)) backExtra(k, e, b);
  const a = def.draw(k, b);
  for (const e of d.extras ?? []) if (!BACK.includes(e) && e !== 'fence' && !['stripes', 'beams', 'checker', 'rainbow', 'splashes', 'glass'].includes(e)) frontExtra(k, e, a);
  if (d.sign) {
    const [a0, a1] = k.span(a.b, a.door);
    const [x, y] = k.on(a.b, a.door, a.door === 'L' ? a.doorAt : Math.max(a0 + 0.3, Math.min(a1 - 0.3, a.doorAt)), a.b.z0 + (d.extras?.includes('awning') ? 46 : 40));
    const t = label(d.sign, 11, 0xffffff);
    k.g.roundRect(x - t.width / 2 - 5, y - 8, t.width + 10, 16, 4).fill(hexNum(shade(k.trim === '#ffffff' ? d.roof : k.trim, -0.1))).stroke({ color: 0xffffff, width: 1.5 });
    t.position.set(x, y);
    c.addChild(t);
  }
  let height = -c.getLocalBounds().minY;
  if (d.prop) {
    const cu = (a.b.u0 + a.b.u1) / 2, cv = (a.b.v0 + a.b.v1) / 2;
    const [x, y] = P(cu, cv, a.surf(cu, cv));
    const p = label(d.prop, 40);
    p.position.set(x, y - 18);
    c.addChild(p);
    height = Math.max(height, -(y - 40));
  }
  return { c, height };
}
