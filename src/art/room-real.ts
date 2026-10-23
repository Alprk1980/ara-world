// Realistic backdrops (the realistic look, src/art/look.ts): the same themes as src/art/room-dressing.ts, so every
// place keeps what makes it itself, but painted like the realistic drawings: soft light from above, shading into the
// corners, real materials (painted plaster, brick, tiles, wood planks, glass), framed windows with a view, and outdoor
// skies that fade to the horizon behind layers of scenery. Drawn behind everything; never takes touches.
import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import { OUTDOOR_HEIGHT, WALL_HEIGHT } from '../../schemas/place.ts';
import { hexNum, shade } from './color.ts';
import type { Dressing } from './room-dressing.ts';

type G = Graphics;
const N = (hex: string) => hexNum(hex);
const D = (hex: string, k: number) => hexNum(shade(hex, k));
const hx = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
/** Real paint is a little greyer than the cute pastels: mix towards a warm grey. */
const paint = (hex: string, k = 0.14) => {
  const a = N(hex), g = 0xd8d0c8;
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - k) + ((g >> s) & 255) * k);
  return hx((ch(16) << 16) | (ch(8) << 8) | ch(0));
};
const rgba = (n: number, a: number) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
/** A gradient from top to bottom (or left to right), in the shape's own box. */
const lin = (stops: [number, number, number?][], across = false) =>
  new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: across ? { x: 1, y: 0 } : { x: 0, y: 1 }, colorStops: stops.map(([offset, c, a]) => ({ offset, color: rgba(c, a ?? 1) })) });
const glow = (c: number, a: number) =>
  new FillGradient({ type: 'radial', center: { x: 0.5, y: 0.5 }, innerRadius: 0, outerCenter: { x: 0.5, y: 0.5 }, outerRadius: 0.5, colorStops: [{ offset: 0, color: rgba(c, a) }, { offset: 1, color: rgba(c, 0) }] });
const DARK = 0x3a2a2a, WHITE = 0xffffff;
const label = (text: string, size: number, fill = 0xffffff) =>
  new Text({ text, style: { fontFamily: 'Fredoka, sans-serif', fontSize: size, fontWeight: '600', fill } });
/** A steady pseudo-random number in 0..1 for (seed, i). */
const rnd = (h: number, i: number) => (((h ^ Math.imul(i + 1, 2654435761)) >>> 0) % 1000) / 1000;

export function dressFloorReal(W: number, d: Dressing, h: number): Container {
  const c = new Container();
  c.eventMode = 'none';
  const g = new Graphics();
  c.addChild(g);
  if (d.theme.indoor) indoor(g, c, W, d, h);
  else outdoor(g, c, W, d, h);
  if (d.sign) sign(g, c, W, d, !d.theme.indoor);
  return c;
}

// ---------------------------------------------------------------- indoor pieces
/** Light falls from above: a soft shadow under the ceiling, darker corners, and a little shade near the floor. */
function roomLight(g: G, W: number, H: number, night: boolean): void {
  g.rect(0, -H, W, 34).fill(lin([[0, DARK, night ? 0.32 : 0.2], [1, DARK, 0]]));
  g.rect(0, -H, 40, H).fill(lin([[0, DARK, 0.16], [1, DARK, 0]], true)).rect(W - 40, -H, 40, H).fill(lin([[0, DARK, 0], [1, DARK, 0.16]], true));
  g.rect(0, -30, W, 30).fill(lin([[0, DARK, 0], [1, DARK, 0.1]]));
  if (night) g.rect(0, -H, W, H).fill({ color: 0x1d2350, alpha: 0.16 });
}
function plaster(g: G, W: number, H: number, wall: string): void {
  g.rect(0, -H, W, H).fill(lin([[0, N(shade(wall, 0.05))], [1, N(shade(wall, -0.05))]]));
}
function wallpaper(g: G, W: number, H: number, wall: string, h: number): void {
  const deep = D(wall, -0.08);
  switch (h % 3) {
    case 0: for (let x = 10; x < W; x += 28) g.rect(x, -H, 12, H).fill({ color: deep, alpha: 0.35 }).rect(x, -H, 1, H).fill({ color: WHITE, alpha: 0.25 }); break;
    case 1: for (let y = -H + 16; y < -10; y += 26) for (let x = 14 + ((y / 26) % 2 ? 13 : 0); x < W; x += 26) g.poly(flower(x, y, 4)).fill({ color: deep, alpha: 0.5 }); break;
    default: for (let y = -H + 20; y < -10; y += 30) for (let x = 15; x < W; x += 30) g.poly([x, y - 7, x + 5, y, x, y + 7, x - 5, y]).fill({ color: deep, alpha: 0.4 });
  }
}
function flower(x: number, y: number, r: number): number[] {
  const p: number[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, rr = r * (i % 2 ? 0.5 : 1);
    p.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  return p;
}
/** Brick in running bond, each brick a touch different, with mortar showing between. */
function brick(g: G, x0: number, y0: number, w: number, hgt: number, col: string, h: number): void {
  g.rect(x0, y0, w, hgt).fill(D(col, 0.18));
  for (let y = y0, r = 0; y < y0 + hgt - 1; y += 10, r++)
    for (let x = x0 - (r % 2) * 12; x < x0 + w; x += 24) {
      const k = rnd(h, r * 97 + x) * 0.14 - 0.07, bx = Math.max(x0, x + 1), bw = Math.min(x0 + w, x + 23) - bx;
      if (bw > 1) g.rect(bx, y + 1, bw, 8).fill(D(col, k)).rect(bx, y + 1, bw, 1.5).fill({ color: WHITE, alpha: 0.12 });
    }
}
/** Glazed tiles with grout and a sheen on each. */
function tiles(g: G, x0: number, y0: number, w: number, hgt: number, col: number, size = 14): void {
  g.rect(x0, y0, w, hgt).fill(D(hx(col), -0.12));
  for (let y = y0; y < y0 + hgt - 1; y += size) for (let x = x0; x < x0 + w - 1; x += size) {
    const tw = Math.min(size - 1.5, x0 + w - x - 1), th = Math.min(size - 1.5, y0 + hgt - y - 1);
    g.rect(x + 0.75, y + 0.75, tw, th).fill(lin([[0, D(hx(col), 0.06)], [1, D(hx(col), -0.04)]])).rect(x + 2, y + 2, tw * 0.5, 1.5).fill({ color: WHITE, alpha: 0.5 });
  }
}
/** Wood panelling: boards with grain and a shadow line between them. */
function panelling(g: G, x0: number, y0: number, w: number, hgt: number, col: string, board = 20): void {
  for (let x = x0, i = 0; x < x0 + w; x += board, i++) {
    g.rect(x, y0, board, hgt).fill(lin([[0, D(col, i % 3 ? 0.02 : -0.04)], [1, D(col, i % 3 ? -0.08 : -0.13)]])).rect(x, y0, 1.5, hgt).fill({ color: DARK, alpha: 0.25 });
    for (let k = 0; k < 2; k++) g.moveTo(x + 5 + k * 8, y0 + 4).bezierCurveTo(x + 3 + k * 8, y0 + hgt * 0.4, x + 8 + k * 8, y0 + hgt * 0.6, x + 5 + k * 8, y0 + hgt - 4).stroke({ color: DARK, width: 0.8, alpha: 0.12 });
  }
}
/** A dado rail and wainscot along the lower wall. */
function wainscot(g: G, W: number, top: number, col: string, boards = false): void {
  if (boards) panelling(g, 0, top, W, -top, col, 26);
  else {
    g.rect(0, top, W, -top).fill(lin([[0, D(col, -0.02)], [1, D(col, -0.1)]]));
    for (let x = 10; x < W - 30; x += 60) g.roundRect(x, top + 6, 48, -top - 14, 2).stroke({ color: DARK, width: 1, alpha: 0.14 }).roundRect(x + 1, top + 7, 48, -top - 14, 2).stroke({ color: WHITE, width: 1, alpha: 0.3 });
  }
  g.rect(0, top - 4, W, 5).fill(lin([[0, D(col, 0.15)], [1, D(col, -0.15)]])).rect(0, top + 1, W, 3).fill({ color: DARK, alpha: 0.12 });
}
function skirting(g: G, W: number, col: number): void {
  g.rect(0, -9, W, 9).fill(lin([[0, D(hx(col), 0.1)], [1, D(hx(col), -0.08)]])).rect(0, -9, W, 1.5).fill({ color: WHITE, alpha: 0.6 });
}
function cornice(g: G, W: number, H: number, wall: string): void {
  g.rect(0, -H, W, 7).fill(lin([[0, D(wall, 0.12)], [1, D(wall, -0.12)]])).rect(0, -H + 7, W, 2).fill({ color: DARK, alpha: 0.15 });
}
/** What you see through a window: sky fading down to trees, or the night. */
function view(g: G, x: number, y: number, w: number, hgt: number, night: boolean, h: number): void {
  g.rect(x, y, w, hgt).fill(night ? lin([[0, 0x141a40], [1, 0x2f3a78]]) : lin([[0, 0x8fc8f0], [1, 0xdff1ff]]));
  if (night) {
    for (let i = 0; i < 4; i++) g.circle(x + w * rnd(h, i), y + hgt * 0.5 * rnd(h, i + 9), 1).fill(WHITE);
    g.circle(x + w * 0.72, y + hgt * 0.25, 5).fill(0xfff3c4);
  } else g.ellipse(x + w * 0.3, y + hgt * 0.3, w * 0.22, hgt * 0.07).fill({ color: WHITE, alpha: 0.8 });
  const tree = night ? 0x24304a : 0x6ea86a;
  for (let k = 0; k < 4; k++) g.ellipse(x + (w / 3) * k, y + hgt * 0.92, w * 0.24, hgt * 0.22).fill({ color: tree, alpha: night ? 1 : 0.85 });
}
/** Glass: two soft diagonal reflections. */
function sheen(g: G, x: number, y: number, w: number, hgt: number): void {
  g.poly([x + w * 0.15, y + hgt, x + w * 0.45, y, x + w * 0.6, y, x + w * 0.3, y + hgt]).fill({ color: WHITE, alpha: 0.16 });
  g.poly([x + w * 0.65, y + hgt, x + w * 0.9, y, x + w * 0.95, y, x + w * 0.72, y + hgt]).fill({ color: WHITE, alpha: 0.1 });
}
type WindowStyle = 'curtain' | 'blinds' | 'arch' | 'round' | 'big' | 'none';
function windows(g: G, W: number, H: number, n: number, style: WindowStyle, d: Dressing, h: number): void {
  if (style === 'none') return;
  const acc = d.theme.accent;
  for (let i = 0; i < n; i++) {
    const cx = (W / n) * (i + 0.5);
    if (style === 'round') {
      g.circle(cx, -H + 58, 34).fill(lin([[0, 0xf4efe8], [1, 0xc8bfb4]])).circle(cx, -H + 58, 26).fill(d.night ? 0x1d2350 : 0xbfe6ff);
      if (d.theme.kind === 'spooky') g.circle(cx + 6, -H + 52, 12).fill(0xfff3b0).circle(cx + 6, -H + 52, 22).fill(glow(0xfff3b0, 0.4));
      g.moveTo(cx - 26, -H + 58).lineTo(cx + 26, -H + 58).moveTo(cx, -H + 32).lineTo(cx, -H + 84).stroke({ color: 0xe8e0d6, width: 3 });
      continue;
    }
    const big = style === 'big';
    const ww = big ? 128 : 54, wh = big ? 84 : 58, wx = cx - ww / 2, wy = -H + (big ? 22 : 26);
    // Frame with depth: a darker reveal inside, a sill with its shadow.
    if (style === 'arch') g.roundRect(wx - 6, wy - 16, ww + 12, wh + 22, 32).fill(lin([[0, D(acc, 0.25)], [1, D(acc, -0.1)]]));
    else g.roundRect(wx - 6, wy - 6, ww + 12, wh + 12, 3).fill(lin([[0, 0xfbf8f4], [1, 0xd9d2c8]]));
    if (style === 'arch') {
      g.roundRect(wx, wy - 10, ww, wh + 10, 26).fill(0xffffff);
      view(g, wx + 3, wy - 7, ww - 6, wh + 4, d.night, h + i);
    } else view(g, wx, wy, ww, wh, d.night, h + i);
    g.rect(wx, wy, ww, 4).fill({ color: DARK, alpha: 0.18 }).rect(wx, wy, 3, wh).fill({ color: DARK, alpha: 0.12 });
    g.rect(cx - 1.5, wy, 3, wh).fill(0xf4efe8);
    if (big) g.rect(wx, wy + wh * 0.55, ww, 3).fill(0xf4efe8);
    sheen(g, wx, wy, ww, wh);
    g.roundRect(wx - 10, wy + wh + 4, ww + 20, 6, 2).fill(lin([[0, 0xffffff], [1, 0xd0c8be]])).rect(wx - 8, wy + wh + 10, ww + 16, 4).fill({ color: DARK, alpha: 0.12 });
    if (style === 'blinds') for (let y = wy + 3; y < wy + wh * 0.7; y += 6) g.rect(wx, y, ww, 4).fill(lin([[0, 0xffffff], [1, 0xd8d4ce]])).rect(wx, y + 4, ww, 1).fill({ color: DARK, alpha: 0.1 });
    if (style === 'curtain' || style === 'arch') {
      // Curtains hang in folds: light and shade in stripes, gathered at a tie-back.
      g.rect(wx - 14, wy - 12, ww + 28, 4).fill(0x9a8a7e).circle(wx - 15, wy - 10, 3.5).fill(0x9a8a7e).circle(wx + ww + 15, wy - 10, 3.5).fill(0x9a8a7e);
      for (const s of [-1, 1]) {
        const edge = cx + s * (ww / 2 + 10), inner = cx + s * (ww / 2 - 10);
        g.poly([edge, wy - 8, inner, wy - 8, cx + s * (ww / 2 - 2), wy + 34, edge + s * 2, wy + wh + 6]).fill(lin([[0, D(acc, 0.12)], [0.5, D(acc, -0.12)], [1, D(acc, 0.05)]], true));
        for (let k = 1; k < 3; k++) g.moveTo(edge - s * k * 5, wy - 6).lineTo(edge - s * k * 3, wy + wh).stroke({ color: DARK, width: 1, alpha: 0.12 });
      }
    }
  }
}
type LightKind = 'pendant' | 'chandelier' | 'strip' | 'lantern' | 'spot';
function lights(g: G, W: number, H: number, n: number, kind: LightKind, night: boolean, acc: string): void {
  for (let i = 0; i <= n; i++) {
    const x = (W / n) * i;
    if (x < 30 || x > W - 30) continue;
    if (kind === 'strip') g.roundRect(x - 28, -H, 56, 7, 3).fill(lin([[0, 0xe8e8e8], [1, 0xffffff]])).rect(x - 26, -H + 6, 52, 2).fill({ color: 0xfff6d8, alpha: 0.9 });
    else if (kind === 'chandelier') {
      g.rect(x - 1, -H, 2, 10).fill(0x9a8a6a).ellipse(x, -H + 16, 18, 6).fill(lin([[0, 0xf0d070], [1, 0xa8801a]]));
      for (const k of [-12, -4, 4, 12]) g.rect(x + k - 1, -H + 8, 2, 8).fill(0xf6f0e0).circle(x + k, -H + 7, 2).fill(0xfff3b0).poly([x + k - 2, -H + 22, x + k + 2, -H + 22, x + k, -H + 30]).fill({ color: 0xeaf6ff, alpha: 0.9 });
    } else if (kind === 'lantern') g.rect(x - 1, -H, 2, 14).fill(0x4a3a2a).roundRect(x - 7, -H + 14, 14, 18, 3).fill(lin([[0, 0xffe7a0], [1, 0xe8a83a]])).rect(x - 8, -H + 12, 16, 3).fill(0x4a3a2a).rect(x - 8, -H + 31, 16, 3).fill(0x4a3a2a);
    else if (kind === 'spot') g.rect(x - 1, -H, 2, 6).fill(0x6b6b6b).poly([x - 6, -H + 6, x + 6, -H + 6, x + 4, -H + 16, x - 4, -H + 16]).fill(lin([[0, 0x8a8f96], [1, 0x3a3f46]]));
    else {
      g.rect(x - 0.75, -H, 1.5, 14).fill(0x6b5e56);
      g.moveTo(x - 14, -H + 26).quadraticCurveTo(x, -H + 6, x + 14, -H + 26).closePath().fill(lin([[0, D(acc, 0.2)], [1, D(acc, -0.15)]]));
      g.ellipse(x, -H + 26, 14, 3).fill(0xfff3c4);
    }
    const r = kind === 'strip' ? 60 : 40;
    g.ellipse(x, -H + 26, r, r * 0.8).fill(glow(0xfff0c0, night ? 0.45 : 0.18));
  }
}
function frame(g: G, x: number, y: number, w: number, hgt: number, gold = false, h = 0): void {
  g.rect(x + 3, y + 4, w, hgt).fill({ color: DARK, alpha: 0.18 });
  g.rect(x, y, w, hgt).fill(gold ? lin([[0, 0xf0d27a], [1, 0xa8801a]]) : lin([[0, 0x8a6040], [1, 0x5a3a24]]));
  g.rect(x + 4, y + 4, w - 8, hgt - 8).fill(lin([[0, 0xa9d8f0], [0.6, 0xe6f2d8], [1, 0x9fcf8a]]));
  g.ellipse(x + w * (0.3 + rnd(h, 3) * 0.4), y + hgt - 6, w * 0.3, hgt * 0.16).fill({ color: 0x6ea86a, alpha: 0.9 });
  if (rnd(h, 5) > 0.5) g.circle(x + w * 0.72, y + hgt * 0.32, 3).fill(0xffe28a);
}
function clock(g: G, x: number, y: number, r: number): void {
  g.circle(x + 2, y + 3, r).fill({ color: DARK, alpha: 0.15 }).circle(x, y, r).fill(lin([[0, 0x8a8f96], [1, 0x3a3f46]])).circle(x, y, r - 2.5).fill(0xfdfbf6);
  for (let k = 0; k < 12; k++) g.rect(x + Math.cos(k * 0.5236) * (r - 5) - 0.75, y + Math.sin(k * 0.5236) * (r - 5) - 0.75, 1.5, 1.5).fill(DARK);
  g.moveTo(x, y).lineTo(x, y - r * 0.6).moveTo(x, y).lineTo(x + r * 0.42, y + 2).stroke({ color: DARK, width: 1.8, cap: 'round' });
}
function board(g: G, x: number, y: number, w: number, hgt: number, face: number, chalk = true): void {
  g.rect(x + 3, y + 4, w, hgt).fill({ color: DARK, alpha: 0.18 }).rect(x, y, w, hgt).fill(lin([[0, 0xa8784a], [1, 0x6a4628]])).rect(x + 4, y + 4, w - 8, hgt - 8).fill(lin([[0, D(hx(face), 0.08)], [1, D(hx(face), -0.08)]]));
  if (chalk) for (let k = 0; k < 3; k++) g.moveTo(x + 10, y + 14 + k * 11).lineTo(x + w - 18 - k * 9, y + 13 + k * 11).stroke({ color: WHITE, width: 1.6, alpha: 0.8, cap: 'round' });
}

// ---------------------------------------------------------------- floors
function planks(g: G, W: number, col: string, h: number, wide = 36): void {
  g.rect(0, 0, W, 24).fill(lin([[0, D(col, -0.12)], [1, D(col, 0.04)]]));
  for (let row = 0; row < 3; row++) {
    const y = row * 8;
    for (let x = -((row * 13 + h) % wide), i = 0; x < W; x += wide + Math.round(rnd(h, row * 50 + i) * 30), i++) {
      g.rect(x, y, 1.5, 8).fill({ color: DARK, alpha: 0.28 });
      g.rect(x + 2, y + 1, wide - 4, 6).fill({ color: rnd(h, i * 3 + row) > 0.5 ? WHITE : DARK, alpha: 0.05 });
      g.moveTo(x + 4, y + 3 + rnd(h, i) * 2).bezierCurveTo(x + wide * 0.3, y + 2, x + wide * 0.6, y + 6, x + wide - 4, y + 4).stroke({ color: DARK, width: 0.7, alpha: 0.14 });
    }
    g.rect(0, y + 7.5, W, 1).fill({ color: DARK, alpha: 0.25 });
  }
}
function floorTiles(g: G, W: number, col: string, check = false): void {
  for (let x = 0, k = 0; x < W; x += 24, k++) for (let r = 0; r < 2; r++) {
    const c = check && (k + r) % 2 ? D(col, -0.25) : D(col, (k * 7 + r * 3) % 5 === 0 ? -0.04 : 0);
    g.rect(x + 0.5, r * 12 + 0.5, 23, 11).fill(lin([[0, D(hx(c), -0.05)], [1, D(hx(c), 0.06)]])).rect(x + 3, r * 12 + 2, 9, 1.5).fill({ color: WHITE, alpha: 0.35 });
  }
}
function carpet(g: G, W: number, col: string, h: number): void {
  g.rect(0, 0, W, 24).fill(lin([[0, D(col, -0.12)], [1, D(col, 0.02)]]));
  for (let i = 0; i < W / 3; i++) g.rect((i * 37 + h) % W, (i * 13) % 23, 1.5, 1.5).fill({ color: i % 2 ? WHITE : DARK, alpha: 0.08 });
}
/** The floor band in front of the wall, with a contact shadow where they meet. */
function roomFloor(g: G, W: number, kind: string, col: string, h: number): void {
  if (['clinic', 'station', 'salon', 'gym', 'police', 'office'].includes(kind)) floorTiles(g, W, col);
  else if (['cafe', 'pub', 'candy'].includes(kind)) floorTiles(g, W, col, true);
  else if (kind === 'aquarium') {
    g.rect(0, 0, W, 24).fill(lin([[0, 0xc8b07a], [1, 0xf0dca8]]));
    for (let i = 0; i < W / 6; i++) g.ellipse((i * 41 + h) % W, 3 + ((i * 7) % 20), 2, 1).fill({ color: i % 3 ? 0xa8905a : WHITE, alpha: 0.5 });
  } else if (['school', 'nursery', 'space', 'cloud', 'spooky'].includes(kind)) carpet(g, W, col, h);
  else if (kind === 'garage') {
    g.rect(0, 0, W, 24).fill(lin([[0, 0x7a7f88], [1, 0x9aa0a8]]));
    for (let i = 0; i < W / 40; i++) g.ellipse((i * 97 + h) % W, 6 + ((i * 11) % 14), 10, 2.5).fill({ color: DARK, alpha: 0.08 });
  } else planks(g, W, col, h);
  g.rect(0, 0, W, 6).fill(lin([[0, DARK, 0.3], [1, DARK, 0]]));
}

// ---------------------------------------------------------------- indoor
function indoor(g: G, c: Container, W: number, d: Dressing, h: number): void {
  const H = WALL_HEIGHT, t = d.theme, wall = paint(t.wall), acc = t.accent, night = d.night;
  const n = Math.max(1, Math.floor(W / 280));
  plaster(g, W, H, wall);
  let skirt = 0xf4efe8;
  switch (t.kind) {
    case 'fancy': {
      for (let y = -H + 18; y < -50; y += 26) for (let x = 14 + ((y / 26) % 2 ? 13 : 0); x < W; x += 26) g.poly(flower(x, y, 6)).fill({ color: 0xc8a040, alpha: 0.22 });
      wainscot(g, W, -52, shade(wall, -0.14));
      g.rect(0, -54, W, 3).fill(lin([[0, 0xf0d27a], [1, 0xa8801a]]));
      windows(g, W, H, n, 'arch', d, h);
      for (let i = 0; i < n; i++) frame(g, (W / n) * i + 8, -H + 44, 30, 38, true, h + i);
      cornice(g, W, H, wall);
      lights(g, W, H, n, 'chandelier', night, acc);
      break;
    }
    case 'shop': case 'salon': {
      // An awning along the top and a panelled dado; the shelves are real things, stocked from the data.
      for (let x = 0; x < W; x += 24) g.rect(x, -H, 12, 16).fill(lin([[0, D(acc, 0.1)], [1, D(acc, -0.15)]])).rect(x + 12, -H, 12, 16).fill(lin([[0, 0xffffff], [1, 0xe0d8d0]]));
      g.rect(0, -H + 16, W, 4).fill({ color: DARK, alpha: 0.15 });
      wainscot(g, W, -40, shade(wall, -0.08), true);
      if (t.kind === 'salon') for (let i = 0; i < n; i++) {
        const cx = (W / n) * (i + 0.5);
        g.roundRect(cx - 26, -H + 24, 52, 62, 20).fill(lin([[0, 0xf4efe8], [1, 0xc8bfb4]])).roundRect(cx - 20, -H + 30, 40, 50, 16).fill(lin([[0, 0xe6f4ff], [1, 0xb8d8ec]]));
        sheen(g, cx - 20, -H + 30, 40, 50);
        for (let k = 0; k < 6; k++) g.circle(cx - 26 + (k % 2) * 52, -H + 32 + Math.floor(k / 2) * 22, 3.5).fill(0xfff3c4).circle(cx - 26 + (k % 2) * 52, -H + 32 + Math.floor(k / 2) * 22, 8).fill(glow(0xfff3c4, 0.5));
      }
      lights(g, W, H, n, 'spot', night, acc);
      break;
    }
    case 'clinic': {
      tiles(g, 0, -66, W, 60, 0xf6fbfa);
      g.rect(0, -68, W, 4).fill(lin([[0, D(acc, 0.1)], [1, D(acc, -0.15)]]));
      windows(g, W, H, n, 'blinds', d, h);
      g.circle(W / 2, -H + 40, 15).fill(lin([[0, 0xffffff], [1, 0xe0e8ea]])).rect(W / 2 - 3, -H + 30, 6, 20).fill(N(acc)).rect(W / 2 - 10, -H + 37, 20, 6).fill(N(acc));
      lights(g, W, H, n, 'strip', night, acc);
      break;
    }
    case 'school': case 'nursery': {
      // Bunting with letters, big classroom windows, a pinboard of drawings.
      g.moveTo(0, -H + 6).lineTo(W, -H + 6).stroke({ color: 0x9a8a7e, width: 1 });
      for (let x = 10, i = 0; x < W - 20; x += 26, i++) {
        const col = [0xe86a8a, 0xe8b44a, 0x5ab8a8, 0x8a7ac8][i % 4];
        g.poly([x, -H + 6, x + 22, -H + 6, x + 11, -H + 26]).fill(lin([[0, D(hx(col), 0.12)], [1, D(hx(col), -0.12)]]));
        if (t.kind === 'school' && i < 26) {
          const l = label(String.fromCharCode(65 + (i % 26)), 8);
          l.anchor.set(0.5);
          l.position.set(x + 11, -H + 13);
          c.addChild(l);
        }
      }
      wainscot(g, W, -40, shade(wall, -0.1), true);
      windows(g, W, H, n, 'big', d, h);
      if (W > 400) {
        const px = W - 120;
        g.rect(px + 3, -H + 44, 90, 60).fill({ color: DARK, alpha: 0.18 }).rect(px, -H + 40, 90, 60).fill(lin([[0, 0xc8a27a], [1, 0x9a7650]]));
        for (let k = 0; k < 4; k++) {
          const x = px + 8 + (k % 2) * 42, y = -H + 46 + Math.floor(k / 2) * 27;
          g.rect(x, y, 34, 22).fill([0xffffff, 0xfff3c4, 0xe6f2ff, 0xffe6ee][k]).circle(x + 17, y + 2, 2).fill(0xd84a4a);
          g.moveTo(x + 6, y + 16).lineTo(x + 14, y + 8).lineTo(x + 22, y + 14).lineTo(x + 28, y + 9).stroke({ color: [0x5a9ad8, 0x7ab86a, 0xe86a8a, 0xe8b44a][k], width: 2 });
        }
      }
      if (t.kind === 'nursery') for (let x = 40; x < W; x += 120) g.moveTo(x, -47).lineTo(x - 2, -30).stroke({ color: 0x9a8a96, width: 1 }).ellipse(x, -60, 10, 13).fill(lin([[0, D(['#ff8fb8', '#ffd36e', '#7fd1c7'][(x / 120 | 0) % 3], 0.2)], [1, D(['#ff8fb8', '#ffd36e', '#7fd1c7'][(x / 120 | 0) % 3], -0.15)]])).ellipse(x - 4, -66, 3, 4).fill({ color: WHITE, alpha: 0.6 });
      lights(g, W, H, n, 'strip', night, acc);
      break;
    }
    case 'cafe': case 'pub': {
      if (t.kind === 'cafe') brick(g, 0, -62, W, 56, '#c87a5a', h);
      else {
        panelling(g, 0, -H, W, H, shade(wall, -0.25), 22);
        g.rect(0, -H + 12, W, 8).fill(lin([[0, 0x6a4a30], [1, 0x3a2618]]));
      }
      board(g, W * 0.62, -H + 32, 74, 52, 0x2a2a2a);
      windows(g, W, H, Math.max(1, n - 1), t.kind === 'pub' ? 'none' : 'curtain', d, h);
      if (t.kind === 'pub') for (let i = 0; i < n; i++) frame(g, (W / n) * i + 20, -H + 40, 36, 28, false, h + i);
      lights(g, W, H, n + 1, t.kind === 'pub' ? 'lantern' : 'pendant', night, acc);
      skirt = t.kind === 'pub' ? 0x5a3a24 : 0xf4efe8;
      break;
    }
    case 'office': {
      windows(g, W, H, n, 'blinds', d, h);
      clock(g, W - 40, -H + 40, 14);
      g.rect(0, -42, W, 4).fill(lin([[0, D(wall, 0.05)], [1, D(wall, -0.18)]]));
      for (let x = 40; x < W - 60; x += 300) {
        g.rect(x + 3, -H + 54, 60, 40).fill({ color: DARK, alpha: 0.15 }).rect(x, -H + 50, 60, 40).fill(0xfdfdfb).rect(x, -H + 50, 60, 3).fill(0x9aa0a8);
        for (let k = 0; k < 4; k++) g.rect(x + 8 + k * 12, -H + 82 - k * 6, 8, 6 + k * 6).fill([0x5a9ad8, 0x7ab86a, 0xe8b44a, 0xe86a8a][k]);
      }
      lights(g, W, H, n, 'strip', night, acc);
      break;
    }
    case 'station': {
      // Tall glazed walls with steel mullions looking out, and a departures board.
      g.rect(0, -H, W, H).fill(lin([[0, 0xe8edf2], [1, 0xc8d0d8]]));
      for (let x = 10; x < W - 10; x += 100) {
        view(g, x, -H + 10, 90, 120, night, h + x);
        g.rect(x, -H + 98, 90, 32).fill({ color: night ? 0x24304a : 0x8ac07a, alpha: 0.9 });
        sheen(g, x, -H + 10, 90, 120);
        g.rect(x + 43, -H + 10, 4, 120).fill(lin([[0, 0xd8dde4], [1, 0x8a929c]], true)).rect(x, -H + 58, 90, 4).fill(lin([[0, 0xd8dde4], [1, 0x8a929c]]));
        g.rect(x - 2, -H + 8, 94, 4).fill(0x8a929c).rect(x - 2, -H + 128, 94, 4).fill(0x8a929c);
      }
      g.rect(W / 2 - 58, -H + 19, 120, 34).fill({ color: DARK, alpha: 0.25 }).roundRect(W / 2 - 60, -H + 16, 120, 34, 3).fill(lin([[0, 0x2a2f3a], [1, 0x14171e]]));
      for (let k = 0; k < 3; k++) g.rect(W / 2 - 52, -H + 22 + k * 9, 70 - k * 12, 4).fill(0xffc94a).rect(W / 2 + 26, -H + 22 + k * 9, 24, 4).fill(0x7fe0a0);
      skirt = 0x8a929c;
      break;
    }
    case 'aquarium': {
      // A wall of water: deep blue fading down, light rays, bubbles, fish and swaying weed.
      g.rect(0, -H, W, H).fill(lin([[0, 0x6ac0f0], [0.6, 0x2f86c8], [1, 0x1a5a90]]));
      for (let x = 20; x < W; x += 90) g.poly([x, -H, x + 30, -H, x + 70, -10, x + 40, -10]).fill(lin([[0, WHITE, 0.22], [1, WHITE, 0]]));
      for (let i = 0; i < W / 14; i++) g.circle((h * (i + 3)) % W, -20 - ((i * 37) % (H - 40)), 1.5 + (i % 3)).stroke({ color: WHITE, width: 1, alpha: 0.6 });
      for (let x = 50; x < W; x += 140) {
        const y = -60 - ((x * 13) % 60), col = [0xf0b43a, 0xe8607a, 0xf08a3a][(x / 140 | 0) % 3];
        g.ellipse(x, y, 16, 9).fill(lin([[0, D(hx(col), 0.25)], [1, D(hx(col), -0.2)]])).poly([x + 14, y, x + 26, y - 8, x + 26, y + 8]).fill(D(hx(col), -0.1));
        g.moveTo(x - 4, y - 8).lineTo(x - 4, y + 8).stroke({ color: WHITE, width: 2, alpha: 0.6 }).circle(x - 9, y - 2, 2).fill(DARK).circle(x - 9.5, y - 2.5, 0.7).fill(WHITE);
      }
      for (let x = 10; x < W; x += 34) g.moveTo(x, 0).quadraticCurveTo(x - 10, -24, x + 2, -48).stroke({ color: x % 68 ? 0x2f8a4a : 0x4aa85a, width: 5, cap: 'round' });
      g.rect(0, -H, W, H).fill(lin([[0, WHITE, 0], [0.92, WHITE, 0], [1, 0x0a2a4a, 0.3]]));
      skirt = 0x1a3a5a;
      break;
    }
    case 'barn': {
      panelling(g, 0, -H, W, H, shade(t.wall, -0.04), 22);
      for (let x = 0; x < W; x += 22) g.circle(x + 6, -H + 30 + ((x * 7) % 90), 1.5).fill({ color: DARK, alpha: 0.5 }).circle(x + 6, -H + 110 + ((x * 3) % 30), 1.5).fill({ color: DARK, alpha: 0.5 });
      g.rect(0, -H + 24, W, 10).fill(lin([[0, D(t.wall, -0.25)], [1, D(t.wall, -0.45)]]));
      for (let x = 40; x < W; x += 200) g.moveTo(x, -H + 34).lineTo(x + 60, -H + 90).moveTo(x + 120, -H + 34).lineTo(x + 60, -H + 90).stroke({ color: D(t.wall, -0.4), width: 7 });
      lights(g, W, H, n, 'lantern', night, acc);
      skirt = N(shade(t.wall, -0.4));
      break;
    }
    case 'garage': {
      brick(g, 0, -H, W, H, '#c8806a', h);
      const gw = Math.min(220, W * 0.5), gx = W / 2 - gw / 2;
      g.rect(gx - 6, -H + 24, gw + 12, H - 24).fill(0x5a5f68).roundRect(gx, -H + 30, gw, H - 30, 4).fill(lin([[0, 0xe85a5a], [1, 0xa82a2a]]));
      for (let y = -H + 44; y < 0; y += 14) g.rect(gx + 4, y, gw - 8, 3).fill({ color: DARK, alpha: 0.25 }).rect(gx + 4, y + 3, gw - 8, 1).fill({ color: WHITE, alpha: 0.25 });
      g.circle(gx - 30, -H + 60, 18).fill(lin([[0, 0xffe07a], [1, 0xd8a020]])).circle(gx - 30, -H + 60, 8).fill(0xa8401a);
      skirt = 0x5a5f68;
      break;
    }
    case 'police': {
      g.rect(0, -72, W, 66).fill(lin([[0, 0x6a8ec8], [1, 0x4a6ea8]])).rect(0, -74, W, 3).fill(0xe8ecf2);
      windows(g, W, H, n, 'blinds', d, h);
      g.poly(star(W / 2, -H + 46, 22, 10)).fill(lin([[0, 0xffe07a], [1, 0xc89a20]]));
      board(g, W * 0.15, -H + 30, 74, 52, 0xc8a070, false);
      g.rect(W * 0.15 + 10, -H + 38, 22, 16).fill(WHITE).rect(W * 0.15 + 40, -H + 42, 24, 18).fill(0xfff3c4);
      lights(g, W, H, n, 'strip', night, acc);
      break;
    }
    case 'post': {
      for (let x = 0; x < W; x += 24) g.rect(x, -66, 12, 60).fill(lin([[0, 0xe86a6a], [1, 0xb83a3a]])).rect(x + 12, -66, 12, 60).fill(lin([[0, 0xffffff], [1, 0xe0d8d0]]));
      const gx = W * 0.6;
      g.rect(gx + 3, -H + 24, 120, 72).fill({ color: DARK, alpha: 0.2 }).rect(gx, -H + 20, 120, 72).fill(lin([[0, 0xc8a27a], [1, 0x8a6a44]]));
      for (let k = 0; k < 15; k++) {
        const x = gx + 4 + (k % 5) * 23, y = -H + 24 + Math.floor(k / 5) * 23;
        g.rect(x, y, 21, 21).fill(lin([[0, 0x6a4a30], [1, 0x8a6a48]]));
        if ((k * 7 + h) % 3) g.rect(x + 3, y + 7, 15, 10).fill(0xfbf8f2).moveTo(x + 3, y + 7).lineTo(x + 10.5, y + 12).lineTo(x + 18, y + 7).stroke({ color: 0xc8c0b4, width: 0.8 });
      }
      windows(g, W, H, Math.max(1, n - 1), 'curtain', d, h);
      break;
    }
    case 'candy': {
      for (let y = -H + 30; y < -10; y += 22) for (let x = 12 + ((y / 22) % 2 ? 11 : 0); x < W; x += 22) {
        const col = [0xf08ab0, 0xffffff, 0x6ad0c0, 0xf8d06a][(x / 22 | 0) % 4];
        g.circle(x, y, 4.5).fill(lin([[0, D(hx(col), 0.2)], [1, D(hx(col), -0.15)]])).circle(x - 1.5, y - 1.5, 1.2).fill({ color: WHITE, alpha: 0.8 });
      }
      g.moveTo(0, -H);
      for (let x = 0; x <= W; x += 30) g.lineTo(x, -H + 14).quadraticCurveTo(x + 8, -H + 34 + ((x * 7) % 14), x + 15, -H + 14);
      g.lineTo(W, -H).closePath().fill(lin([[0, 0xf8a0c4], [1, 0xd8608c]]));
      break;
    }
    case 'spooky': {
      for (let x = 0; x < W; x += 30) g.rect(x, -H, 15, H).fill({ color: 0x8a6ab8, alpha: 0.35 });
      wainscot(g, W, -44, '#5a4a6a', true);
      windows(g, W, H, n, 'round', d, h);
      for (const [x, s] of [[0, 1], [W, -1]] as const) for (let k = 1; k <= 3; k++) g.moveTo(x, -H + k * 12).lineTo(x + s * k * 12, -H).stroke({ color: WHITE, width: 0.8, alpha: 0.7 });
      for (let x = 80; x < W; x += 160) bat(g, x, -H + 40 + ((x * 3) % 30));
      lights(g, W, H, n, 'lantern', true, acc);
      skirt = 0x3a2a4a;
      break;
    }
    case 'space': {
      g.rect(0, -H, W, H).fill(lin([[0, 0x0e1230], [1, 0x2a2f6b]]));
      for (let i = 0; i < W / 8; i++) g.circle((h * (i + 5)) % W, -10 - ((i * 53) % (H - 20)), 0.6 + (i % 3) * 0.5).fill({ color: WHITE, alpha: 0.5 + (i % 2) * 0.5 });
      g.ellipse(W * 0.6, -H * 0.55, W * 0.3, 30).fill(glow(0xb08ae0, 0.25));
      g.circle(W * 0.25, -H + 50, 18).fill(lin([[0, 0xf8c8a8], [1, 0xb86a5a]])).ellipse(W * 0.25, -H + 50, 32, 6).stroke({ color: 0xe8c87a, width: 2.5 });
      g.circle(W * 0.75, -H + 70, 12).fill(lin([[0, 0x8ad8e0], [1, 0x2a7a9a]]));
      skirt = 0x14183a;
      break;
    }
    case 'cloud': {
      g.rect(0, -H, W, H).fill(lin([[0, 0xe6dcff], [1, 0xfdf6ff]]));
      for (let x = 30; x < W; x += 110) softCloud(g, x, -H + 40 + ((x * 7) % 60), 0.9);
      for (let x = 60; x < W; x += 90) g.poly(star(x, -H + 20 + ((x * 11) % 30), 6, 2.5)).fill(lin([[0, 0xffe07a], [1, 0xd8a020]]));
      windows(g, W, H, n, 'arch', d, h);
      break;
    }
    case 'gym': {
      g.rect(0, -68, W, 62).fill(lin([[0, D(acc, 0.05)], [1, D(acc, -0.12)]])).rect(0, -70, W, 3).fill(WHITE);
      for (let x = 20; x < W - 40; x += 34) {
        g.roundRect(x, -H + 30, 30, 90, 2).fill(lin([[0, 0x6a9ad8], [1, 0x3a6aa8]], true)).rect(x + 22, -H + 70, 3, 10).fill(0xd8dde4);
        g.rect(x + 4, -H + 36, 22, 3).fill({ color: DARK, alpha: 0.3 }).rect(x + 4, -H + 42, 22, 3).fill({ color: DARK, alpha: 0.3 });
      }
      lights(g, W, H, n, 'strip', night, acc);
      break;
    }
    default: {
      // home: wallpaper above a panelled wainscot, curtained windows, pictures, pendant lights.
      wallpaper(g, W, H, wall, h);
      wainscot(g, W, -46, shade(wall, -0.12));
      windows(g, W, H, n, 'curtain', d, h);
      for (let i = 0; i < n; i++) if (W / n > 220) frame(g, (W / n) * i + 18, -H + 46, 28, 34, false, h + i * 7);
      cornice(g, W, H, wall);
      lights(g, W, H, n, 'pendant', night, acc);
    }
  }
  roomLight(g, W, H, night);
  skirting(g, W, skirt);
  roomFloor(g, W, t.kind, t.floor, h);
}

// ---------------------------------------------------------------- outdoor pieces
function sky(g: G, W: number, H: number, top: number, low: number): void {
  g.rect(-200, -H - 200, W + 400, H + 200).fill(lin([[0, D(hx(top), -0.18)], [0.55, top], [1, low]]));
}
function softCloud(g: G, x: number, y: number, s: number): void {
  for (const [dx, dy, r] of [[0, 0, 16], [18, -8, 20], [38, 0, 16], [20, 4, 18]]) g.circle(x + dx * s, y + dy * s, r * s).fill(lin([[0, WHITE, 0.98], [0.7, 0xf0f4fa, 0.95], [1, 0xc8d4e4, 0.9]]));
}
function sun(g: G, x: number, y: number, r: number): void {
  g.circle(x, y, r * 4).fill(glow(0xfff2b0, 0.5)).circle(x, y, r).fill(lin([[0, 0xfffbe0], [1, 0xffd85a]]));
}
function moon(g: G, x: number, y: number, r: number): void {
  g.circle(x, y, r * 3.5).fill(glow(0xfff6d0, 0.35)).circle(x, y, r).fill(lin([[0, 0xfffbe6], [1, 0xe8dcb0]])).circle(x - r * 0.3, y + r * 0.2, r * 0.18).fill({ color: 0xc8bc90, alpha: 0.6 }).circle(x + r * 0.35, y - r * 0.3, r * 0.12).fill({ color: 0xc8bc90, alpha: 0.6 });
}
/** Rolling hills fading into the distance: far ones bluer and paler (air between), near ones greener. */
function hills(g: G, W: number, col: string, night: boolean, layers = 3): void {
  for (let k = 0; k < layers; k++) {
    const far = 1 - k / layers, base = night ? 0x2a3050 : N(col);
    const tint = night ? base : N(shade(hx(base), 0.25 * far));
    const top = -70 - far * 60;
    g.moveTo(-200, 0).lineTo(-200, top + 20);
    for (let x = -200; x <= W + 200; x += 80) g.quadraticCurveTo(x + 40, top - 20 - ((x * (k + 3)) % 40), x + 80, top + ((x * 7) % 24));
    g.lineTo(W + 200, 0).closePath().fill(lin([[0, tint, night ? 1 : 0.92 - far * 0.2], [1, N(shade(hx(base), -0.1)), 1]]));
  }
}
function tree(g: G, x: number, s: number, col = 0x5a9a4a, night = false): void {
  const c = night ? 0x2a3a3a : col;
  g.ellipse(x, 0, 22 * s, 4 * s).fill({ color: DARK, alpha: 0.2 });
  g.roundRect(x - 4 * s, -40 * s, 8 * s, 40 * s, 2).fill(lin([[0, 0x8a6040], [1, 0x5a3a24]], true));
  for (const [dx, dy, r] of [[-14, -48, 18], [14, -50, 18], [0, -66, 22], [-6, -40, 14], [10, -38, 14]]) g.circle(x + dx * s, dy * s, r * s).fill(lin([[0, N(shade(hx(c), 0.18))], [1, N(shade(hx(c), -0.2))]]));
}
function pine(g: G, x: number, s: number, snow = false): void {
  g.rect(x - 3 * s, -16 * s, 6 * s, 16 * s).fill(0x6a4a30);
  for (let k = 0; k < 3; k++) {
    const w = (26 - k * 6) * s, y = -(16 + k * 24) * s, top = -(56 + k * 24) * s;
    g.poly([x - w, y, x, top, x + w, y]).fill(lin([[0, 0x4a8a5a], [1, 0x2a5a3a]], true));
    if (snow) g.poly([x - w * 0.5, (y + top) / 2 + 4, x, top, x + w * 0.5, (y + top) / 2 + 4, x, (y + top) / 2 + 8]).fill({ color: WHITE, alpha: 0.95 });
  }
}
function palm(g: G, x: number): void {
  g.moveTo(x, 0).quadraticCurveTo(x + 14, -60, x + 6, -120).stroke({ color: 0x9a7048, width: 9, cap: 'round' });
  for (let k = 0; k < 8; k++) g.moveTo(x - 2, -10 - k * 14).lineTo(x + 10, -12 - k * 14).stroke({ color: 0x6a4a30, width: 1.2, alpha: 0.6 });
  for (const a of [-2.8, -2.3, -1.8, -1.3, -0.8, -0.3]) {
    const ex = x + 6 + Math.cos(a) * 46, ey = -120 + Math.sin(a) * 22 + 14;
    g.moveTo(x + 6, -120).quadraticCurveTo((x + 6 + ex) / 2, -132 + Math.sin(a) * 10, ex, ey).stroke({ color: 0x3a8a4a, width: 6, cap: 'round' });
  }
  g.circle(x + 4, -116, 4).fill(0x6a4a2a).circle(x + 10, -115, 4).fill(0x6a4a2a);
}
function acacia(g: G, x: number): void {
  g.moveTo(x, 0).lineTo(x + 4, -60).lineTo(x - 20, -80).moveTo(x + 4, -60).lineTo(x + 26, -82).stroke({ color: 0x6a4a30, width: 6, cap: 'round' });
  g.ellipse(x + 4, -86, 72, 16).fill(lin([[0, 0x8ab85a], [1, 0x4a7a3a]]));
}
function fence(g: G, W: number, col: number, picket = false): void {
  for (let x = picket ? 4 : 16, i = 0; x < W; x += picket ? 18 : 40, i++) {
    if (picket) g.poly([x, 0, x, -36, x + 4.5, -42, x + 9, -36, x + 9, 0]).fill(lin([[0, D(hx(col), 0.05)], [1, D(hx(col), -0.12)]], true));
    else g.rect(x, -38, 7, 38).fill(lin([[0, D(hx(col), 0.08)], [1, D(hx(col), -0.18)]], true));
  }
  for (const y of picket ? [-30, -14] : [-32, -18]) g.rect(0, y, W, 4).fill(lin([[0, D(hx(col), 0.1)], [1, D(hx(col), -0.2)]]));
}
/** Grass along the ground line: a band with blades and a few flowers. */
function grass(g: G, W: number, col: string, h: number, flowers = true): void {
  g.rect(-200, 0, W + 400, 24).fill(lin([[0, D(col, -0.12)], [1, D(col, 0.06)]]));
  for (let x = -6; x < W + 6; x += 5) g.moveTo(x, 4).lineTo(x + 2 - rnd(h, x) * 4, -4 - rnd(h, x + 1) * 6).stroke({ color: N(shade(col, rnd(h, x + 2) > 0.5 ? -0.18 : 0.1)), width: 1.6, cap: 'round' });
  if (flowers) for (let x = 20; x < W; x += 46 + (h % 30)) g.circle(x, -2, 3).fill([0xf08ab0, 0xf8d06a, 0xb08ae0, WHITE][(x / 46) % 4 | 0]).circle(x, -2, 1).fill(0xf8d06a);
}
function bat(g: G, x: number, y: number): void {
  g.poly([x - 18, y, x - 6, y - 6, x, y - 2, x + 6, y - 6, x + 18, y, x + 8, y + 2, x, y + 6, x - 8, y + 2]).fill(0x2a1a3a).circle(x - 2, y - 1, 1).fill(0xfff3b0).circle(x + 2, y - 1, 1).fill(0xfff3b0);
}
function umbrella(g: G, x: number, y: number): void {
  g.rect(x - 1.5, y - 50, 3, 50).fill(0xe8e0d6).moveTo(x - 40, y - 46).quadraticCurveTo(x, y - 90, x + 40, y - 46).closePath().fill(lin([[0, 0xf8a0c0], [1, 0xc85a80]]));
  g.ellipse(x, y, 26, 4).fill({ color: DARK, alpha: 0.18 });
}
function plane(g: G, x: number, y: number): void {
  g.roundRect(x - 50, y - 8, 100, 16, 8).fill(lin([[0, 0xffffff], [1, 0xc8d0dc]])).poly([x - 6, y, x + 14, y, x - 10, y + 30]).fill(0x9aa8c0).poly([x + 36, y - 8, x + 48, y - 28, x + 52, y - 8]).fill(0xd8607a);
  for (let k = 0; k < 8; k++) g.circle(x - 34 + k * 9, y - 2, 1.5).fill(0x5a6a80);
  g.moveTo(x + 50, y).lineTo(x + 160, y + 4).stroke({ color: WHITE, width: 3, alpha: 0.5 });
}
function buildings(g: G, W: number, base: number, night: boolean, h: number): void {
  const cols = [0xa8b4c8, 0xc8bccc, 0xb4c8cc, 0xd0bca8];
  for (let x = -20, i = 0; x < W + 20; x += 54 + ((i * 13) % 30), i++) {
    const bh = 80 + ((h >> (i % 12)) % 120), col = cols[i % 4];
    g.rect(x, base - bh, 46, bh).fill(lin([[0, D(hx(col), 0.08)], [1, D(hx(col), -0.12)]], true)).rect(x, base - bh, 46, 3).fill(D(hx(col), -0.25));
    for (let y = base - bh + 10; y < base - 14; y += 18) for (let wx = x + 7; wx < x + 40; wx += 14) {
      const lit = night && rnd(h, wx * 3 + y) > 0.4;
      g.rect(wx, y, 8, 10).fill(lit ? 0xffe6a0 : lin([[0, 0xdcecf8], [1, 0x8aa0b8]]));
    }
  }
}

// ---------------------------------------------------------------- outdoor
function outdoor(g: G, c: Container, W: number, d: Dressing, h: number): void {
  const H = OUTDOOR_HEIGHT, t = d.theme;
  const night = d.night || t.kind === 'night';
  if (night) sky(g, W, H, 0x1a2050, 0x3a3f7a);
  else sky(g, W, H, N(paint(t.wall, 0.05)), N(shade(t.wall, 0.45)));
  if (night) {
    for (let i = 0; i < 70; i++) g.circle(((h >> (i % 16)) * (i + 7)) % W, -H + 10 + ((i * 53) % (H - 140)), 0.6 + (i % 3) * 0.5).fill({ color: WHITE, alpha: 0.5 + (i % 2) * 0.5 });
    moon(g, W - 70, -H + 60, 20);
  } else if (t.kind !== 'sky') {
    sun(g, W - 70, -H + 60, 22);
    for (let i = 0; i < 3; i++) softCloud(g, ((h >> (i * 4)) % Math.max(1, W - 160)) + 40, -H + 70 + i * 40, 1 - i * 0.15);
  }
  const ground = t.floor;
  switch (t.kind) {
    case 'beach': {
      // The sea: deep blue at the horizon, turquoise near shore, foam lines, then wet and dry sand.
      g.rect(-200, -120, W + 400, 114).fill(lin([[0, 0x2a7ab8], [0.6, 0x3aa8c8], [1, 0x6ad0d0]]));
      // Glints on the water, smaller and closer together towards the horizon.
      for (let i = 0; i < W / 9; i++) {
        const depth = rnd(h, i), y = -116 + depth * depth * 100, len = 4 + depth * 16;
        const x = ((i * 97 + h) % (W + 40)) - 20;
        g.moveTo(x, y).lineTo(x + len, y).stroke({ color: WHITE, width: 0.8 + depth * 1.4, alpha: 0.35 + depth * 0.3, cap: 'round' });
      }
      g.moveTo(-200, -10);
      for (let x = -200; x <= W + 200; x += 40) g.quadraticCurveTo(x + 20, -16, x + 40, -10);
      g.lineTo(W + 200, -4).lineTo(-200, -4).closePath().fill({ color: WHITE, alpha: 0.85 });
      g.rect(-200, -6, W + 400, 30).fill(lin([[0, 0xc8b080], [0.3, N(ground)], [1, D(ground, 0.06)]]));
      for (let x = 60; x < W; x += 260) palm(g, x);
      for (let x = 30; x < W; x += 70) g.ellipse(x, 12, 4, 2.5).fill(0xf8c8b8).ellipse(x - 1, 11, 1.5, 0.8).fill({ color: WHITE, alpha: 0.7 });
      return;
    }
    case 'snow': {
      for (let x = -40; x < W + 40; x += 160) {
        const peak = -180 - ((x * 7) % 60);
        g.poly([x, 0, x + 90, peak, x + 180, 0]).fill(lin([[0, 0xb8c8e0], [1, 0x8a9cb8]], true));
        g.poly([x + 90, peak, x + 180, 0, x + 120, 0]).fill({ color: 0x5a6a88, alpha: 0.25 });
        g.poly([x + 58, peak + 60, x + 90, peak, x + 122, peak + 60, x + 106, peak + 50, x + 90, peak + 64, x + 74, peak + 48]).fill(lin([[0, WHITE], [1, 0xdde8f6]]));
      }
      g.poly([-200, 0, W * 0.7, -190, W * 0.75, -185, W + 200, 0]).fill(lin([[0, 0xffffff], [1, 0xd8e4f2]]));
      for (let k = 0; k < 3; k++) g.moveTo(W * (0.66 - k * 0.04), -170 + k * 6).quadraticCurveTo(W * (0.45 - k * 0.05), -100, W * (0.2 - k * 0.04), -6).stroke({ color: 0xb8c8de, width: 2.5 });
      for (let k = 0; k < 5; k++) {
        const fx = W * (0.62 - k * 0.11), fy = -166 + k * 33;
        g.rect(fx - 1, fy - 22, 2, 22).fill(0x5a5a5a).poly([fx + 1, fy - 22, fx + 14, fy - 17, fx + 1, fy - 12]).fill(k % 2 ? 0xe04a4a : 0x2a5ea5);
      }
      for (let x = 20; x < W; x += 90) pine(g, x, 0.8 + ((x * 3) % 5) / 10, true);
      g.rect(-200, 0, W + 400, 24).fill(lin([[0, 0xdde8f6], [1, 0xffffff]]));
      return;
    }
    case 'sky': case 'candy': {
      if (t.kind === 'sky') ['#f08ab0', '#f8d06a', '#8ad89a', '#6ac0f0', '#a88ae8'].forEach((col, i) => g.moveTo(W / 2 - 220 + i * 16, 0).arc(W / 2, 0, 220 - i * 16, Math.PI, 0).stroke({ color: N(col), width: 14, alpha: 0.45 }));
      else for (let x = 40; x < W; x += 120) {
        const col = [0xf08ab0, 0x6ad0c0, 0xf8d06a][(x / 120 | 0) % 3];
        g.rect(x - 3, -110, 6, 110).fill(lin([[0, 0xffffff], [1, 0xd8d0c8]], true)).circle(x, -120, 26).fill(lin([[0, D(hx(col), 0.2)], [1, D(hx(col), -0.18)]]));
        g.arc(x, -120, 16, -2.6, 0.4).stroke({ color: WHITE, width: 4, alpha: 0.7 });
      }
      for (let x = 0; x < W + 60; x += 70) softCloud(g, x, -2, 1.3);
      if (t.kind === 'candy') for (let x = 0; x < W; x += 200) g.ellipse(x + 100, -10, 120, 60).fill(lin([[0, 0xf8c0d4], [1, 0xe88aa8]]));
      g.rect(-200, 0, W + 400, 24).fill(lin([[0, N(shade(ground, -0.06))], [1, N(ground)]]));
      return;
    }
    case 'pool': {
      tiles(g, 0, -64, W, 54, 0xe6f4fa, 20);
      g.rect(0, -96, W, 6).fill(lin([[0, 0xffffff], [1, 0xc8d4dc]]));
      g.rect(0, -90, W, 84).fill(lin([[0, 0x6ad0f0], [1, 0x2a98d0]]));
      // Caustics: a net of light rippling on the pool floor, and glints on top.
      for (let i = 0; i < W / 14; i++) {
        const x = (i * 53 + h) % W, y = -84 + ((i * 29) % 70);
        g.ellipse(x, y, 9 + (i % 3) * 3, 2.5).stroke({ color: WHITE, width: 1, alpha: 0.16 });
      }
      for (let i = 0; i < W / 16; i++) g.moveTo((i * 71 + h) % W, -88 + ((i * 17) % 12)).lineTo(((i * 71 + h) % W) + 10, -88 + ((i * 17) % 12)).stroke({ color: WHITE, width: 1.5, alpha: 0.6, cap: 'round' });
      for (let x = 30; x < W; x += 120) g.rect(x, -90, 4, 84).fill({ color: 0x1a6aa8, alpha: 0.25 });
      const sx = W * 0.82;
      g.rect(sx, -230, 10, 140).fill(lin([[0, 0xffffff], [1, 0xc8d0d8]], true)).rect(sx + 40, -230, 10, 140).fill(lin([[0, 0xffffff], [1, 0xc8d0d8]], true)).rect(sx - 4, -236, 58, 10).fill(lin([[0, 0xf8a0c0], [1, 0xc85a80]]));
      g.moveTo(sx, -226).bezierCurveTo(sx - 80, -220, sx - 40, -120, sx - 140, -92).stroke({ color: 0xa8801a, width: 18, cap: 'round' }).moveTo(sx, -226).bezierCurveTo(sx - 80, -220, sx - 40, -120, sx - 140, -92).stroke({ color: 0xf8d06a, width: 14, cap: 'round' });
      g.rect(W * 0.12, -170, 6, 80).fill(0xe8e8e8).rect(W * 0.12 + 30, -170, 6, 80).fill(0xe8e8e8).roundRect(W * 0.12 - 6, -176, 48, 16, 4).fill(lin([[0, 0xf06a6a], [1, 0xb02a2a]]));
      for (let x = 80; x < W * 0.7; x += 260) umbrella(g, x, -100);
      g.rect(-200, 0, W + 400, 24).fill(lin([[0, 0xd8e4ea], [1, 0xf0f6f8]]));
      return;
    }
    case 'city': case 'rails': case 'rooftop': {
      const base = t.kind === 'rooftop' ? -80 : 0;
      buildings(g, W, base, night, h);
      g.rect(-200, base - 60, W + 400, 60).fill(lin([[0, WHITE, 0], [1, WHITE, night ? 0 : 0.18]]));
      if (t.kind === 'rooftop') {
        g.rect(-200, -80, W + 400, 80).fill(lin([[0, 0xc8c0b8], [1, 0xa8a098]]));
        for (let x = 0; x < W; x += 20) g.rect(x, -40, 3, 40).fill(0x8a929c);
        g.rect(0, -42, W, 4).fill(lin([[0, 0xc8d0d8], [1, 0x6a727c]]));
        for (let x = 60; x < W; x += 240) g.roundRect(x, -30, 40, 30, 3).fill(lin([[0, 0xa8b0b8], [1, 0x6a727c]], true)).circle(x + 20, -15, 9).stroke({ color: 0x4a525c, width: 2 });
        g.rect(-200, 0, W + 400, 24).fill(lin([[0, 0x8a827a], [1, 0xa8a098]]));
      } else if (t.kind === 'rails') {
        g.rect(-200, -6, W + 400, 6).fill(lin([[0, 0xf8d06a], [1, 0xc8a030]]));
        g.rect(-200, 0, W + 400, 24).fill(lin([[0, 0x8a8078], [1, 0xa89c90]]));
        for (let i = 0; i < W / 3; i++) g.circle((i * 37 + h) % W, 3 + ((i * 13) % 20), 1.2).fill({ color: i % 2 ? WHITE : DARK, alpha: 0.2 });
        for (let x = 0; x < W; x += 18) g.rect(x, 3, 10, 18).fill(lin([[0, 0x8a6040], [1, 0x5a3a24]]));
        for (const y of [6, 16]) g.rect(0, y, W, 3).fill(lin([[0, 0xd8dde4], [1, 0x5a5f68]]));
      } else {
        g.rect(-200, -8, W + 400, 8).fill(lin([[0, 0xd8d4ce], [1, 0xa8a49e]])).rect(-200, -2, W + 400, 2).fill({ color: DARK, alpha: 0.2 });
        g.rect(-200, 0, W + 400, 24).fill(lin([[0, 0x5a5f6a], [1, 0x7a7f8a]]));
        for (let x = 0; x < W; x += 40) g.rect(x, 11, 20, 2.5).fill({ color: WHITE, alpha: 0.85 });
        for (let x = 60; x < W; x += 220) {
          g.rect(x, -92, 4, 92).fill(lin([[0, 0x8a929c], [1, 0x3a3f46]], true)).roundRect(x - 6, -98, 16, 8, 3).fill(0x3a3f46);
          g.ellipse(x + 2, -88, 6, 3).fill(night ? 0xfff0b0 : 0xf0f0f0);
          if (night) g.ellipse(x + 2, -60, 40, 60).fill(glow(0xfff0b0, 0.3));
        }
      }
      return;
    }
    case 'savanna': case 'farm': {
      hills(g, W, t.kind === 'savanna' ? '#c8b060' : '#7ab85a', night);
      if (t.kind === 'savanna') for (let x = 70; x < W; x += 240) acacia(g, x);
      else {
        const bx = W * 0.65;
        g.rect(bx, -90, 90, 90).fill(lin([[0, 0xd85a4a], [1, 0xa83a2a]], true)).poly([bx - 8, -90, bx + 45, -130, bx + 98, -90]).fill(lin([[0, 0x8a3a30], [1, 0x6a2a20]]));
        for (let y = -84; y < 0; y += 8) g.rect(bx, y, 90, 1).fill({ color: DARK, alpha: 0.18 });
        g.rect(bx + 30, -50, 30, 50).fill(0xf4efe8).moveTo(bx + 30, -50).lineTo(bx + 60, 0).moveTo(bx + 60, -50).lineTo(bx + 30, 0).stroke({ color: 0xf4efe8, width: 3 });
        g.rect(bx + 30, -50, 30, 50).fill({ color: 0xa83a2a, alpha: 0.6 });
        for (let x = 30; x < bx - 30; x += 140) tree(g, x, 0.8, 0x5a9a4a, night);
      }
      fence(g, W, 0x9a7050);
      grass(g, W, t.kind === 'savanna' ? '#c8a850' : ground, h, t.kind === 'farm');
      return;
    }
    case 'fun': {
      hills(g, W, '#8ac87a', night, 2);
      const wx = W * 0.3;
      g.circle(wx, -170, 92).stroke({ color: 0x8a6ad0, width: 5 });
      for (let k = 0; k < 8; k++) g.moveTo(wx, -170).lineTo(wx + Math.cos((k * Math.PI) / 4) * 92, -170 + Math.sin((k * Math.PI) / 4) * 92).stroke({ color: 0xa88ae0, width: 2 });
      for (let k = 0; k < 8; k++) g.roundRect(wx + Math.cos((k * Math.PI) / 4) * 92 - 8, -170 + Math.sin((k * Math.PI) / 4) * 92 - 2, 16, 12, 3).fill([0xf08ab0, 0xf8d06a, 0x6ad0c0][k % 3]);
      g.moveTo(wx, -170).lineTo(wx - 40, 0).moveTo(wx, -170).lineTo(wx + 40, 0).stroke({ color: 0x6a4ab0, width: 5 });
      g.moveTo(W * 0.55, 0).bezierCurveTo(W * 0.6, -200, W * 0.7, -40, W * 0.8, -160).lineTo(W * 0.95, 0).stroke({ color: 0xd84a6a, width: 5 });
      for (let x = 0; x < W; x += 26) g.poly([x, -H + 30, x + 22, -H + 30, x + 11, -H + 50]).fill([0xf08ab0, 0xf8d06a, 0x6ad0c0, 0xa88ae0][(x / 26 | 0) % 4]);
      for (let x = 40; x < W; x += 300) {
        g.poly([x, 0, x + 40, -70, x + 80, 0]).fill(lin([[0, 0xf8a0c0], [1, 0xd8608a]], true)).poly([x + 20, 0, x + 40, -70, x + 60, 0]).fill(lin([[0, 0xffffff], [1, 0xe0d8d8]], true));
        g.rect(x + 39, -84, 2, 14).fill(0x6a4a30).poly([x + 41, -84, x + 54, -79, x + 41, -74]).fill(0xd84a6a);
      }
      grass(g, W, ground, h);
      return;
    }
    case 'stadium': {
      g.rect(-200, -160, W + 400, 160).fill(lin([[0, 0x8a94b8], [1, 0x6a7498]]));
      for (let y = -150; y < -20; y += 16) {
        g.rect(-200, y + 10, W + 400, 2).fill({ color: DARK, alpha: 0.2 });
        for (let x = (y / 16) % 2 ? 4 : 10; x < W; x += 12) {
          const col = [0xe86a8a, 0xf8d06a, 0x6ad0c0, 0xffffff, 0x8a7ac8][Math.abs((x + y) / 12 | 0) % 5];
          g.circle(x, y + 2, 3.5).fill(col).rect(x - 3.5, y + 4, 7, 5).fill(D(hx(col), -0.2));
        }
      }
      for (const x of [20, W - 20]) {
        g.rect(x - 3, -270, 6, 110).fill(lin([[0, 0x8a929c], [1, 0x3a3f46]], true)).roundRect(x - 26, -292, 52, 26, 3).fill(0x3a3f46);
        for (let k = 0; k < 6; k++) g.circle(x - 18 + (k % 3) * 18, -286 + Math.floor(k / 3) * 12, 4).fill(0xfffbe6);
        g.ellipse(x, -280, 60, 40).fill(glow(0xfffbe0, 0.4));
      }
      g.rect(-200, 0, W + 400, 24).fill(lin([[0, 0x3a9a4a], [1, 0x5ac86a]]));
      for (let x = 0; x < W; x += 60) g.rect(x, 0, 30, 24).fill({ color: WHITE, alpha: 0.07 });
      g.rect(0, 10, W, 2).fill({ color: WHITE, alpha: 0.9 });
      return;
    }
    case 'night': {
      hills(g, W, '#4a3f7a', true, 2);
      g.moveTo(W * 0.3 - 80, 0).arc(W * 0.3, 0, 80, Math.PI, 0).fill(lin([[0, 0xe8e8f4], [1, 0xa8a8c0]], true));
      g.rect(W * 0.3 - 6, -96, 44, 14).fill(lin([[0, 0xb8c0c8], [1, 0x6a727c]])).circle(W * 0.3 + 38, -89, 6).fill(0x2a2f3a);
      g.rect(W * 0.3 - 10, -40, 20, 40).fill(0xffe6a0);
      grass(g, W, '#3a3060', h, false);
      return;
    }
    case 'runway': {
      g.rect(-200, -40, W + 400, 40).fill(lin([[0, 0x8ac07a], [1, 0x6aa05a]]));
      g.rect(W * 0.8, -200, 30, 200).fill(lin([[0, 0xe8ecf2], [1, 0xa8b0bc]], true)).rect(W * 0.8 - 14, -232, 58, 36).fill(lin([[0, 0xa8d8f8], [1, 0x5a8ab8]]));
      sheen(g, W * 0.8 - 14, -232, 58, 36);
      plane(g, W * 0.3, -280);
      g.rect(-200, 0, W + 400, 24).fill(lin([[0, 0x5a5f6a], [1, 0x7a7f8a]]));
      for (let x = 0; x < W; x += 60) g.rect(x, 10, 34, 3).fill({ color: WHITE, alpha: 0.9 });
      for (let x = 30; x < W; x += 120) g.circle(x, 1, 2.5).fill(night ? 0xfff0a0 : 0xf8d06a);
      return;
    }
    case 'spooky': {
      g.rect(-200, -H - 200, W + 400, H + 200).fill(lin([[0, 0x2a1a4a], [0.7, 0x6a4a8a], [1, 0xc87a6a]]));
      moon(g, W * 0.7, -H + 80, 36);
      hills(g, W, '#3a2a5a', true, 2);
      for (let x = 60; x < W; x += 180) bat(g, x, -H + 60 + ((x * 3) % 60));
      for (let x = 30; x < W; x += 200) {
        g.moveTo(x, 0).lineTo(x + 3, -70).stroke({ color: 0x1a1020, width: 6 });
        g.moveTo(x + 3, -50).lineTo(x - 18, -76).moveTo(x + 2, -60).lineTo(x + 24, -84).moveTo(x - 10, -64).lineTo(x - 16, -88).stroke({ color: 0x1a1020, width: 3, cap: 'round' });
      }
      for (let x = 0; x < W; x += 24) g.poly([x + 4, 0, x + 4, -30 - ((x * 7) % 10), x + 10, -36 - ((x * 7) % 10), x + 16, -30 - ((x * 7) % 10), x + 16, 0]).fill(lin([[0, 0x4a3a5a], [1, 0x2a1a3a]], true));
      for (let x = 40; x < W; x += 140) g.ellipse(x, -8, 14, 10).fill(lin([[0, 0xf8a040], [1, 0xc8601a]])).rect(x - 2, -20, 4, 6).fill(0x3a8a4a).ellipse(x, -8, 24, 20).fill(glow(0xffb040, 0.35));
      grass(g, W, '#3a2a4a', h, false);
      return;
    }
    case 'garden': {
      hills(g, W, '#7ac87a', night, 2);
      for (let x = -10; x < W; x += 60) g.roundRect(x, -62, 64, 62, 28).fill(lin([[0, night ? 0x2a4a3a : 0x6ab86a], [1, night ? 0x1a3a2a : 0x3a8a4a]]));
      for (let x = 20; x < W; x += 30) g.circle(x, -40 - ((x * 7) % 20), 4).fill([0xf08ab0, 0xffffff, 0xf8d06a][(x / 30 | 0) % 3]).circle(x - 1, -41 - ((x * 7) % 20), 1.3).fill({ color: WHITE, alpha: 0.7 });
      for (let x = 100; x < W; x += 320) {
        g.moveTo(x - 40, -62).arc(x, -62, 40, Math.PI, 0).stroke({ color: 0x5a3a24, width: 9 }).moveTo(x - 40, -62).arc(x, -62, 40, Math.PI, 0).stroke({ color: 0xe8e0d0, width: 6 });
        for (let k = 0; k < 7; k++) g.circle(x + Math.cos(Math.PI + (k * Math.PI) / 6) * 40, -62 + Math.sin(Math.PI + (k * Math.PI) / 6) * 40, 5).fill(k % 2 ? 0xf08ab0 : 0xd84a6a);
      }
      grass(g, W, ground, h);
      return;
    }
    default: {
      // park: hills into the distance, trees, a picket fence and flowers in the grass.
      hills(g, W, ground, night);
      for (let x = 50; x < W; x += 170) tree(g, x + ((x * 7) % 40), 0.9 + ((x * 3) % 4) / 10, 0x5a9a4a, night);
      fence(g, W, 0xf4efe8, true);
      grass(g, W, ground, h);
    }
  }
  void c;
}

// ---------------------------------------------------------------- pieces
function sign(g: G, c: Container, W: number, d: Dressing, outdoor: boolean): void {
  const t = label(`${d.sign!.emoji} ${d.sign!.name}`, 13);
  t.anchor.set(0.5);
  const n = Math.max(1, Math.floor(W / 280));
  const sx = n > 1 ? W / n : W / 2, sy = outdoor ? -OUTDOOR_HEIGHT + 110 : -WALL_HEIGHT + 22;
  const bw = t.width + 22;
  const acc = d.theme.accent;
  // A painted board on two chains (indoors) or a post (outdoors), with a shadow.
  if (outdoor) g.rect(sx - 2, sy + 12, 4, 40).fill(lin([[0, 0x8a6040], [1, 0x5a3a24]], true));
  else g.moveTo(sx - bw / 2 + 10, sy - 22).lineTo(sx - bw / 2 + 10, sy - 12).moveTo(sx + bw / 2 - 10, sy - 22).lineTo(sx + bw / 2 - 10, sy - 12).stroke({ color: 0x8a8a8a, width: 1.5 });
  g.roundRect(sx - bw / 2 + 2, sy - 9, bw, 24, 6).fill({ color: DARK, alpha: 0.2 });
  g.roundRect(sx - bw / 2, sy - 12, bw, 24, 6).fill(lin([[0, D(acc, 0.05)], [1, D(acc, -0.25)]])).stroke({ color: 0xf4efe8, width: 2 });
  t.position.set(sx, sy);
  c.addChild(t);
}
function star(x: number, y: number, r: number, ri: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? ri : r, a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  return pts;
}
