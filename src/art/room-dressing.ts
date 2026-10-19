// Code-drawn backdrops so places read as real rooms, not empty boxes: wallpaper, windows with curtains, a sign with
// the place's name, floor patterns, ceiling lights; outdoors, clouds, hills, a fence and flowers.
import { Container, Graphics, Text } from 'pixi.js';
import type { Floor } from '../../schemas/place.ts';
import { WALL_HEIGHT, OUTDOOR_HEIGHT } from '../../schemas/place.ts';
import { hexNum, shade } from './color.ts';

export type Dressing = { seed: string; accent: string; night: boolean; sign?: { emoji: string; name: string } };

/** A small stable hash so each floor always gets the same pattern. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function dressFloor(f: Floor, d: Dressing): Container {
  const c = new Container();
  c.eventMode = 'none';
  const g = new Graphics();
  c.addChild(g);
  const h = hash(d.seed);
  if (f.outdoor) outdoor(g, f, d, h);
  else indoor(g, c, f, d, h);
  return c;
}

function indoor(g: Graphics, c: Container, f: Floor, d: Dressing, h: number): void {
  const H = WALL_HEIGHT, W = f.width;
  const deep = hexNum(shade(f.wall, -0.06)), accent = hexNum(d.accent);
  // Wallpaper: stripes, dots or diamonds.
  switch (h % 3) {
    case 0: for (let x = 10; x < W; x += 28) g.rect(x, -H, 12, H).fill({ color: deep, alpha: 0.55 }); break;
    case 1: for (let y = -H + 16; y < -10; y += 26) for (let x = 14 + ((y / 26) % 2 ? 13 : 0); x < W; x += 26) g.circle(x, y, 3.2).fill({ color: deep, alpha: 0.9 }); break;
    default: for (let y = -H + 20; y < -10; y += 30) for (let x = 15; x < W; x += 30) g.poly([x, y - 7, x + 7, y, x, y + 7, x - 7, y]).fill({ color: deep, alpha: 0.8 });
  }
  // A wainscot band along the bottom of the wall.
  g.rect(0, -44, W, 38).fill(hexNum(shade(f.wall, -0.1))).rect(0, -46, W, 4).fill(hexNum(shade(f.wall, -0.22)));
  // Windows with curtains, evenly spaced.
  const n = Math.max(1, Math.floor(W / 280));
  for (let i = 0; i < n; i++) {
    const cx = (W / n) * (i + 0.5), wy = -H + 26, ww = 54, wh = 58;
    g.roundRect(cx - ww / 2 - 4, wy - 4, ww + 8, wh + 8, 8).fill(hexNum('#ffffff'));
    g.roundRect(cx - ww / 2, wy, ww, wh, 6).fill(d.night ? 0x1d2350 : 0xbfe6ff);
    if (d.night) g.circle(cx + 12, wy + 16, 6).fill(0xfff3b0);
    else g.circle(cx - 12, wy + 18, 7).fill({ color: 0xffffff, alpha: 0.9 }).circle(cx - 4, wy + 16, 8).fill({ color: 0xffffff, alpha: 0.9 });
    g.rect(cx - 1.5, wy, 3, wh).fill(0xffffff).rect(cx - ww / 2, wy + wh / 2 - 1.5, ww, 3).fill(0xffffff);
    // Curtains tied back, and a rail.
    for (const side of [-1, 1]) g.poly([cx + side * (ww / 2 + 8), wy - 8, cx + side * (ww / 2 - 10), wy - 8, cx + side * (ww / 2 - 2), wy + wh * 0.6, cx + side * (ww / 2 + 10), wy + wh + 6]).fill(accent);
    g.roundRect(cx - ww / 2 - 14, wy - 12, ww + 28, 5, 2).fill(hexNum(shade(d.accent, -0.3)));
  }
  // Ceiling lights between the windows.
  for (let i = 0; i <= n; i++) {
    const lx = (W / n) * i;
    if (lx < 30 || lx > W - 30) continue;
    g.rect(lx - 1, -H, 2, 12).fill(0x9a8a96).moveTo(lx - 12, -H + 22).quadraticCurveTo(lx, -H + 6, lx + 12, -H + 22).closePath().fill(accent);
    if (d.night) g.circle(lx, -H + 26, 16).fill({ color: 0xffe08a, alpha: 0.35 });
  }
  // Floor: planks or tiles.
  const line = hexNum(shade(f.ground, -0.12));
  if (h % 2) for (let x = 0; x < W; x += 36) g.rect(x, 0, 2, 24).fill(line);
  else for (let x = 0; x < W; x += 24) g.rect(x, 0, 2, 24).fill(line).rect(x, 11, 24, 2).fill(line);
  // The place's sign, centred high on the wall between the windows.
  if (d.sign) {
    const t = new Text({ text: `${d.sign.emoji} ${d.sign.name}`, style: { fontFamily: 'Fredoka, sans-serif', fontSize: 13, fontWeight: '600', fill: 0xffffff } });
    t.anchor.set(0.5);
    const sx = n > 1 ? W / n : W / 2, sy = -H + 22;
    const bw = t.width + 22;
    g.roundRect(sx - bw / 2, sy - 12, bw, 24, 12).fill(hexNum(shade(d.accent, -0.15))).stroke({ color: 0xffffff, width: 2 });
    t.position.set(sx, sy);
    c.addChild(t);
  }
}

function outdoor(g: Graphics, f: Floor, d: Dressing, h: number): void {
  const W = f.width, H = OUTDOOR_HEIGHT;
  // Soft hills far away, clouds (or stars) and the sun or moon.
  g.ellipse(W * 0.25, -10, W * 0.4, 70).fill({ color: hexNum(shade(f.ground, -0.08)), alpha: 0.7 });
  g.ellipse(W * 0.8, -6, W * 0.35, 54).fill({ color: hexNum(shade(f.ground, -0.15)), alpha: 0.7 });
  if (d.night) {
    for (let i = 0; i < 30; i++) g.circle(((h >> (i % 16)) * (i + 7)) % W, -H + 20 + ((i * 53) % (H - 140)), 1.6).fill(0xffffff);
    g.circle(W - 70, -H + 60, 22).fill(0xfff3b0);
  } else {
    g.circle(W - 70, -H + 60, 24).fill(0xffe066);
    for (let i = 0; i < 4; i++) {
      const cx = ((h >> (i * 4)) % Math.max(1, W - 120)) + 60, cy = -H + 50 + i * 38;
      g.circle(cx, cy, 16).circle(cx + 18, cy - 8, 20).circle(cx + 38, cy, 16).fill({ color: 0xffffff, alpha: 0.9 });
    }
  }
  // A picket fence along the back and a few flowers along the front edge.
  for (let x = 4; x < W; x += 18) g.roundRect(x, -40, 9, 40, 3).fill(0xffffff);
  g.rect(0, -30, W, 4).fill(0xffffff).rect(0, -14, W, 4).fill(0xffffff);
  const flowers = [0xff8fb8, 0xffd36e, 0xb197fc, 0xffffff];
  for (let x = 20; x < W; x += 46 + (h % 30)) g.circle(x, 6, 4).fill(flowers[(x / 46) % 4 | 0]).circle(x, 6, 1.6).fill(0xffd36e);
}
