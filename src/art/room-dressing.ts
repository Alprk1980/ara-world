// Code-drawn backdrops per theme (src/art/themes.ts): the walls, windows, floor and outdoor scenery that make each
// place look like what it is. Drawn behind everything; never takes touches.
import { Container, Graphics, Text } from 'pixi.js';
import type { Floor } from '../../schemas/place.ts';
import { WALL_HEIGHT, OUTDOOR_HEIGHT } from '../../schemas/place.ts';
import { hexNum, shade } from './color.ts';
import type { Theme } from './themes.ts';
import { currentLook } from './look.ts';
import { dressFloorReal } from './room-real.ts';

export type Dressing = { seed: string; theme: Theme; night: boolean; sign?: { emoji: string; name: string } };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const N = (hex: string) => hexNum(hex);
const D = (hex: string, k: number) => hexNum(shade(hex, k));
const label = (text: string, size: number, fill = 0xffffff) =>
  new Text({ text, style: { fontFamily: 'Fredoka, sans-serif', fontSize: size, fontWeight: '600', fill } });

export function dressFloor(f: Floor, d: Dressing): Container {
  // The realistic look has its own painted backdrops for the same themes (src/art/room-real.ts).
  if (currentLook() === 'real') return dressFloorReal(f.width, d, hash(d.seed));
  const c = new Container();
  c.eventMode = 'none';
  const g = new Graphics();
  c.addChild(g);
  const h = hash(d.seed);
  if (d.theme.indoor) indoor(g, c, f.width, d, h);
  else outdoor(g, c, f.width, d, h);
  if (d.sign) sign(g, c, f.width, d, !d.theme.indoor);
  return c;
}

// ---------------------------------------------------------------- indoor
function indoor(g: Graphics, c: Container, W: number, d: Dressing, h: number): void {
  const H = WALL_HEIGHT, t = d.theme, wall = t.wall, acc = N(t.accent);
  g.rect(0, -H, W, H).fill(N(wall));
  const windows = (n: number, style: 'curtain' | 'blinds' | 'arch' | 'round' | 'big' | 'none') => {
    if (style === 'none') return;
    for (let i = 0; i < n; i++) {
      const cx = (W / n) * (i + 0.5);
      const sky = d.night ? 0x1d2350 : 0xbfe6ff;
      if (style === 'big') {
        g.roundRect(cx - 70, -H + 16, 140, 96, 6).fill(0xffffff).roundRect(cx - 64, -H + 22, 128, 84, 4).fill(sky);
        g.rect(cx - 2, -H + 22, 4, 84).fill(0xffffff);
        continue;
      }
      if (style === 'round') {
        g.circle(cx, -H + 58, 32).fill(0xffffff).circle(cx, -H + 58, 26).fill(sky);
        if (t.kind === 'spooky') g.circle(cx + 6, -H + 52, 12).fill(0xfff3b0);
        continue;
      }
      const wx = cx - 27, wy = -H + 26;
      if (style === 'arch') g.roundRect(wx - 4, wy - 14, 62, 76, 30).fill(D(t.accent, 0.3)).roundRect(wx, wy - 10, 54, 68, 26).fill(sky);
      else g.roundRect(wx - 4, wy - 4, 62, 66, 8).fill(0xffffff).roundRect(wx, wy, 54, 58, 6).fill(sky);
      if (!d.night) g.circle(cx - 10, wy + 18, 8).fill({ color: 0xffffff, alpha: 0.9 });
      else g.circle(cx + 10, wy + 14, 6).fill(0xfff3b0);
      if (style === 'blinds') for (let y = wy + 4; y < wy + 40; y += 7) g.rect(wx, y, 54, 3).fill({ color: 0xffffff, alpha: 0.9 });
      if (style === 'curtain' || style === 'arch')
        for (const s of [-1, 1]) g.poly([cx + s * 35, wy - 8, cx + s * 17, wy - 8, cx + s * 25, wy + 36, cx + s * 37, wy + 64]).fill(acc);
    }
  };
  const lights = (n: number, kind: 'pendant' | 'chandelier' | 'strip' | 'lantern') => {
    for (let i = 0; i <= n; i++) {
      const x = (W / n) * i;
      if (x < 30 || x > W - 30) continue;
      if (kind === 'strip') g.roundRect(x - 26, -H, 52, 6, 3).fill(0xffffff);
      else if (kind === 'chandelier') g.rect(x - 1, -H, 2, 10).fill(0x9a8a96).ellipse(x, -H + 16, 16, 6).fill(N('#d4a017')).circle(x - 10, -H + 22, 3).fill(0xffffff).circle(x, -H + 24, 3).fill(0xffffff).circle(x + 10, -H + 22, 3).fill(0xffffff);
      else if (kind === 'lantern') g.rect(x - 1, -H, 2, 14).fill(0x5a3d2a).roundRect(x - 7, -H + 14, 14, 18, 4).fill(N('#ffd36e'));
      else g.rect(x - 1, -H, 2, 12).fill(0x9a8a96).moveTo(x - 12, -H + 22).quadraticCurveTo(x, -H + 6, x + 12, -H + 22).closePath().fill(acc);
      if (d.night) g.circle(x, -H + 26, 16).fill({ color: 0xffe08a, alpha: 0.3 });
    }
  };
  const n = Math.max(1, Math.floor(W / 280));
  switch (t.kind) {
    case 'fancy': {
      for (let y = -H + 18; y < -46; y += 26) for (let x = 14 + ((y / 26) % 2 ? 13 : 0); x < W; x += 26) g.poly([x, y - 6, x + 6, y, x, y + 6, x - 6, y]).fill({ color: N('#d4a017'), alpha: 0.25 });
      g.rect(0, -50, W, 44).fill(D(wall, -0.12)).rect(0, -52, W, 4).fill(N('#d4a017'));
      for (let x = 20; x < W; x += 60) g.roundRect(x, -44, 40, 30, 4).stroke({ color: N('#d4a017'), width: 2 });
      windows(n, 'arch');
      lights(n, 'chandelier');
      break;
    }
    case 'shop': case 'salon': {
      // An awning stripe along the top and a dado band; the shelves are real things, stocked from the data.
      for (let x = 0; x < W; x += 24) g.rect(x, -H, 12, 14).fill(acc).rect(x + 12, -H, 12, 14).fill(0xffffff);
      g.rect(0, -40, W, 34).fill(D(wall, -0.08)).rect(0, -42, W, 3).fill(D(wall, -0.25));
      if (t.kind === 'salon') for (let i = 0; i < n; i++) {
        const cx = (W / n) * (i + 0.5);
        g.roundRect(cx - 24, -H + 22, 48, 60, 18).fill(0xffffff).roundRect(cx - 18, -H + 28, 36, 48, 14).fill(N('#cdeeff'));
        for (let k = 0; k < 6; k++) g.circle(cx - 24 + (k % 2) * 48, -H + 30 + Math.floor(k / 2) * 22, 3.5).fill(0xfff3b0);
      }
      lights(n, 'strip');
      break;
    }
    case 'clinic': {
      for (let y = -64; y < -6; y += 14) for (let x = 0; x < W; x += 14) g.rect(x + 1, y + 1, 12, 12).fill(0xffffff);
      g.rect(0, -66, W, 4).fill(acc);
      windows(n, 'blinds');
      g.circle(W / 2, -H + 40, 14).fill(0xffffff).rect(W / 2 - 3, -H + 30, 6, 20).fill(acc).rect(W / 2 - 10, -H + 37, 20, 6).fill(acc);
      lights(n, 'strip');
      break;
    }
    case 'school': case 'nursery': {
      // Bunting with letters, a pinboard of drawings, big classroom windows.
      for (let x = 10, i = 0; x < W - 20; x += 26, i++) {
        g.poly([x, -H + 6, x + 22, -H + 6, x + 11, -H + 26]).fill(N(['#ff8fb8', '#ffd36e', '#7fd1c7', '#b197fc'][i % 4]));
        if (t.kind === 'school' && i < 26) {
          const l = label(String.fromCharCode(65 + (i % 26)), 8);
          l.anchor.set(0.5);
          l.position.set(x + 11, -H + 13);
          c.addChild(l);
        }
      }
      windows(n, 'big');
      const px = W - 120;
      if (W > 400) {
        g.roundRect(px, -H + 40, 90, 60, 4).fill(N('#c9a27a'));
        for (let k = 0; k < 4; k++) g.rect(px + 8 + (k % 2) * 42, -H + 46 + Math.floor(k / 2) * 27, 34, 22).fill(N(['#ffffff', '#fff3b0', '#e3f2ff', '#ffe0ec'][k])).circle(px + 25 + (k % 2) * 42, -H + 56 + Math.floor(k / 2) * 27, 5).fill(acc);
      }
      if (t.kind === 'nursery') for (let x = 40; x < W; x += 120) g.ellipse(x, -60, 10, 13).fill(N(['#ff8fb8', '#ffd36e', '#7fd1c7'][(x / 120 | 0) % 3])).moveTo(x, -47).lineTo(x - 2, -30).stroke({ color: 0x9a8a96, width: 1 });
      break;
    }
    case 'cafe': case 'pub': {
      // Brick (cafe) or wood panelling (pub) on the lower wall, a chalkboard, warm pendant lights.
      if (t.kind === 'cafe') {
        g.rect(0, -60, W, 54).fill(N('#e8a07a'));
        for (let y = -60, r = 0; y < -6; y += 9, r++) for (let x = (r % 2) * 12; x < W; x += 24) g.rect(x + 1, y + 1, 22, 7).fill(N('#d98a66'));
      } else {
        for (let x = 0; x < W; x += 20) g.rect(x, -H, 18, H).fill(D(wall, (x / 20) % 2 ? -0.05 : -0.1));
        g.rect(0, -H + 12, W, 8).fill(D(wall, -0.35));
      }
      g.roundRect(W * 0.62, -H + 34, 70, 50, 4).fill(N('#3a2a2a'));
      for (let k = 0; k < 3; k++) g.rect(W * 0.62 + 10, -H + 46 + k * 12, 40 - k * 8, 3).fill(0xffffff);
      windows(Math.max(1, n - 1), t.kind === 'pub' ? 'none' : 'curtain');
      lights(n + 1, t.kind === 'pub' ? 'lantern' : 'pendant');
      break;
    }
    case 'office': {
      windows(n, 'blinds');
      g.circle(W - 40, -H + 40, 14).fill(0xffffff).stroke({ color: D(wall, -0.4), width: 2 }).moveTo(W - 40, -H + 40).lineTo(W - 40, -H + 31).lineTo(W - 34, -H + 40).stroke({ color: 0x3a2a2a, width: 2 });
      g.rect(0, -40, W, 4).fill(D(wall, -0.15));
      lights(n, 'strip');
      break;
    }
    case 'station': {
      // Tall windows looking out, and a departures board.
      for (let x = 10; x < W - 10; x += 100) {
        g.rect(x, -H + 10, 90, 120).fill(d.night ? 0x1d2350 : 0xbfe6ff);
        g.rect(x, -H + 100, 90, 30).fill(N('#9be37a'));
        g.rect(x + 44, -H + 10, 3, 120).fill(0xffffff).rect(x, -H + 60, 90, 3).fill(0xffffff);
      }
      g.roundRect(W / 2 - 60, -H + 16, 120, 34, 4).fill(N('#2a2f3a'));
      for (let k = 0; k < 3; k++) g.rect(W / 2 - 52, -H + 22 + k * 9, 70 - k * 12, 4).fill(N('#ffd36e'));
      break;
    }
    case 'aquarium': {
      // Walls of water: light rays, bubbles, fish and seaweed.
      g.rect(0, -H, W, H).fill(N('#5fb3f0')).rect(0, -H, W, 50).fill(N('#7fc4ff'));
      for (let x = 20; x < W; x += 90) g.poly([x, -H, x + 30, -H, x + 70, -10, x + 40, -10]).fill({ color: 0xffffff, alpha: 0.12 });
      for (let i = 0; i < W / 14; i++) g.circle((h * (i + 3)) % W, -20 - ((i * 37) % (H - 40)), 2 + (i % 3)).fill({ color: 0xffffff, alpha: 0.5 });
      for (let x = 50; x < W; x += 140) {
        const y = -60 - ((x * 13) % 60);
        g.ellipse(x, y, 16, 9).fill(N(['#ffd36e', '#ff8fb8', '#ff9f43'][(x / 140 | 0) % 3])).poly([x + 14, y, x + 26, y - 8, x + 26, y + 8]).fill(N(['#ffd36e', '#ff8fb8', '#ff9f43'][(x / 140 | 0) % 3])).circle(x - 7, y - 2, 2).fill(0x3a2a2a);
      }
      for (let x = 10; x < W; x += 34) g.moveTo(x, 0).quadraticCurveTo(x - 10, -24, x + 2, -44).stroke({ color: N('#3fa66b'), width: 5, cap: 'round' });
      break;
    }
    case 'barn': {
      for (let x = 0; x < W; x += 22) g.rect(x, -H, 20, H).fill(D(t.wall, (x / 22) % 3 === 0 ? -0.08 : 0)).circle(x + 10, -H + 30 + ((x * 7) % 90), 2).fill(D(t.wall, -0.3));
      g.rect(0, -H + 24, W, 10).fill(D(t.wall, -0.35));
      for (let x = 40; x < W; x += 200) g.moveTo(x, -H + 34).lineTo(x + 60, -H + 90).moveTo(x + 120, -H + 34).lineTo(x + 60, -H + 90).stroke({ color: D(t.wall, -0.35), width: 6 });
      lights(n, 'lantern');
      break;
    }
    case 'garage': {
      for (let y = -H, r = 0; y < 0; y += 10, r++) for (let x = (r % 2) * 14; x < W; x += 28) g.rect(x + 1, y + 1, 26, 8).fill(N('#e6a090'));
      const gw = Math.min(220, W * 0.5), gx = W / 2 - gw / 2;
      g.roundRect(gx, -H + 30, gw, H - 30, 8).fill(N('#e63946'));
      for (let y = -H + 44; y < 0; y += 14) g.rect(gx + 6, y, gw - 12, 4).fill(N('#c22f3b'));
      g.circle(gx - 30, -H + 60, 18).fill(N('#ffd36e')).circle(gx - 30, -H + 60, 8).fill(N('#c4502a'));
      break;
    }
    case 'police': {
      g.rect(0, -70, W, 64).fill(N('#7fa8e6'));
      g.poly(star(W / 2, -H + 46, 22, 10)).fill(N('#ffd36e'));
      windows(n, 'blinds');
      g.roundRect(W * 0.15, -H + 30, 70, 50, 4).fill(N('#c9a27a')).rect(W * 0.15 + 8, -H + 38, 22, 16).fill(0xffffff).rect(W * 0.15 + 38, -H + 42, 24, 18).fill(N('#fff3b0'));
      lights(n, 'strip');
      break;
    }
    case 'post': {
      for (let x = 0; x < W; x += 24) g.rect(x, -64, 12, 58).fill(N('#ff8f8f')).rect(x + 12, -64, 12, 58).fill(0xffffff);
      const gx = W * 0.6;
      g.rect(gx, -H + 20, 120, 72).fill(N('#c9a27a'));
      for (let k = 0; k < 15; k++) {
        const x = gx + 4 + (k % 5) * 23, y = -H + 24 + Math.floor(k / 5) * 23;
        g.rect(x, y, 21, 21).fill(N('#a8774f'));
        if ((k * 7 + h) % 3) g.rect(x + 3, y + 6, 15, 10).fill(0xffffff);
      }
      windows(Math.max(1, n - 1), 'curtain');
      break;
    }
    case 'candy': {
      for (let y = -H + 30; y < -10; y += 22) for (let x = 12 + ((y / 22) % 2 ? 11 : 0); x < W; x += 22) g.circle(x, y, 4).fill(N(['#ff8fb8', '#ffffff', '#7fd1c7', '#ffd36e'][(x / 22 | 0) % 4]));
      g.moveTo(0, -H);
      for (let x = 0; x <= W; x += 30) g.lineTo(x, -H + 14).quadraticCurveTo(x + 8, -H + 34 + ((x * 7) % 14), x + 15, -H + 14);
      g.lineTo(W, -H).closePath().fill(N('#ff8fb8'));
      break;
    }
    case 'spooky': {
      for (let x = 0; x < W; x += 30) g.rect(x, -H, 15, H).fill({ color: N('#a98ad8'), alpha: 0.5 });
      windows(n, 'round');
      for (const [x, s] of [[0, 1], [W, -1]] as const) for (let k = 1; k <= 3; k++) g.moveTo(x, -H + k * 12).lineTo(x + s * k * 12, -H).stroke({ color: 0xffffff, width: 1, alpha: 0.8 });
      for (let x = 80; x < W; x += 160) bat(g, x, -H + 40 + ((x * 3) % 30));
      lights(n, 'lantern');
      break;
    }
    case 'space': {
      g.rect(0, -H, W, H).fill(N('#2a2f6b'));
      for (let i = 0; i < W / 8; i++) g.circle((h * (i + 5)) % W, -10 - ((i * 53) % (H - 20)), 1.4).fill(0xffffff);
      g.circle(W * 0.25, -H + 50, 18).fill(N('#ffb3c7')).ellipse(W * 0.25, -H + 50, 30, 6).stroke({ color: N('#ffd36e'), width: 3 });
      g.circle(W * 0.75, -H + 70, 12).fill(N('#7fd1c7'));
      g.poly(star(W / 2, -H + 40, 10, 4)).fill(N('#ffd36e'));
      break;
    }
    case 'cloud': {
      for (let x = 30; x < W; x += 110) cloud(g, x, -H + 40 + ((x * 7) % 60), 0.9);
      for (let x = 60; x < W; x += 90) g.poly(star(x, -H + 20 + ((x * 11) % 30), 6, 2.5)).fill(N('#ffd36e'));
      windows(n, 'arch');
      break;
    }
    case 'gym': {
      g.rect(0, -66, W, 8).fill(acc);
      for (let x = 20; x < W - 40; x += 34) g.roundRect(x, -H + 30, 30, 90, 3).fill(N('#7fb8ff')).rect(x + 22, -H + 70, 3, 10).fill(0xffffff).rect(x + 4, -H + 36, 22, 3).fill(N('#5f8fd0'));
      lights(n, 'strip');
      break;
    }
    default: {
      // home: wallpaper (stripes, dots or diamonds), a wainscot, curtained windows, pendant lights.
      const deep = D(wall, -0.06);
      switch (h % 3) {
        case 0: for (let x = 10; x < W; x += 28) g.rect(x, -H, 12, H).fill({ color: deep, alpha: 0.55 }); break;
        case 1: for (let y = -H + 16; y < -10; y += 26) for (let x = 14 + ((y / 26) % 2 ? 13 : 0); x < W; x += 26) g.circle(x, y, 3.2).fill(deep); break;
        default: for (let y = -H + 20; y < -10; y += 30) for (let x = 15; x < W; x += 30) g.poly([x, y - 7, x + 7, y, x, y + 7, x - 7, y]).fill(deep);
      }
      g.rect(0, -44, W, 38).fill(D(wall, -0.1)).rect(0, -46, W, 4).fill(D(wall, -0.22));
      windows(n, 'curtain');
      lights(n, 'pendant');
    }
  }
  // Floor
  const fl = N(t.floor), line = D(t.floor, -0.14);
  g.rect(0, 0, W, 24).fill(fl);
  if (['clinic', 'station', 'salon', 'gym', 'police'].includes(t.kind)) for (let x = 0; x < W; x += 24) g.rect(x, 0, 1.5, 24).fill(line).rect(x, 11, 24, 1.5).fill(line);
  else if (['cafe', 'pub'].includes(t.kind)) for (let x = 0, k = 0; x < W; x += 12, k++) g.rect(x, (k % 2) * 12, 12, 12).fill(D(t.floor, -0.1));
  else if (t.kind === 'aquarium') for (let x = 0; x < W; x += 30) g.ellipse(x + 15, 6, 12, 4).fill(N('#f6e3b4'));
  else for (let x = 0; x < W; x += 36) g.rect(x, 0, 2, 24).fill(line);
  g.rect(0, -6, W, 6).fill(D(t.wall, -0.18));
}

// ---------------------------------------------------------------- outdoor
function outdoor(g: Graphics, c: Container, W: number, d: Dressing, h: number): void {
  const H = OUTDOOR_HEIGHT, t = d.theme;
  const night = d.night || t.kind === 'night';
  const skyTop = night ? 0x141a40 : N(t.wall), skyLow = night ? 0x2a2f6b : D(t.wall, 0.4);
  g.rect(-200, -H - 200, W + 400, H + 200).fill(skyTop).rect(-200, -H * 0.45, W + 400, H * 0.45).fill({ color: skyLow, alpha: 0.7 });
  if (night) {
    for (let i = 0; i < 50; i++) g.circle(((h >> (i % 16)) * (i + 7)) % W, -H + 10 + ((i * 53) % (H - 140)), 1.6).fill(0xffffff);
    g.circle(W - 70, -H + 60, 22).fill(0xfff3b0);
  } else if (t.kind !== 'sky') g.circle(W - 70, -H + 60, 24).fill(0xffe066);
  const ground = N(t.floor);
  const hills = (col: number, a = 0.8) => g.ellipse(W * 0.25, -6, W * 0.4, 70).fill({ color: col, alpha: a }).ellipse(W * 0.8, -4, W * 0.35, 54).fill({ color: col, alpha: a });
  switch (t.kind) {
    case 'beach': {
      g.rect(-200, -70, W + 400, 64).fill(N('#5fb3f0'));
      for (let x = 0; x < W; x += 40) g.moveTo(x, -50).quadraticCurveTo(x + 10, -56, x + 20, -50).stroke({ color: 0xffffff, width: 2 });
      for (let x = 60; x < W; x += 260) palm(g, x);
      for (let x = 30; x < W; x += 70) g.ellipse(x, 10, 5, 3).fill(N('#ffb3c7'));
      break;
    }
    case 'snow': {
      for (let x = -40; x < W + 40; x += 160) g.poly([x, 0, x + 90, -180 - ((x * 7) % 60), x + 180, 0]).fill(N('#c9d8ee')).poly([x + 60, -120 - ((x * 7) % 40), x + 90, -180 - ((x * 7) % 60), x + 120, -120 - ((x * 7) % 40)]).fill(0xffffff);
      // A big snowy slope to ride down, with ski tracks and flags.
      g.poly([-200, 0, W * 0.7, -190, W * 0.75, -185, W + 200, 0]).fill(0xffffff);
      for (let k = 0; k < 3; k++) g.moveTo(W * (0.66 - k * 0.04), -170 + k * 6).quadraticCurveTo(W * (0.45 - k * 0.05), -100, W * (0.2 - k * 0.04), -6).stroke({ color: 0xc9d8ee, width: 3 });
      for (let k = 0; k < 5; k++) {
        const fx = W * (0.62 - k * 0.11), fy = -166 + k * 33;
        g.rect(fx - 1, fy - 22, 2, 22).fill(0x6b6b6b).poly([fx + 1, fy - 22, fx + 14, fy - 17, fx + 1, fy - 12]).fill(k % 2 ? 0xff6b6b : 0x3a6ea5);
      }
      for (let x = 20; x < W; x += 90) pine(g, x, 0.8 + ((x * 3) % 5) / 10);
      break;
    }
    case 'sky': case 'candy': {
      if (t.kind === 'sky') ['#ff8fb8', '#ffd36e', '#8ce99a', '#7fd1ff', '#b197fc'].forEach((col, i) => g.arc(W / 2, 0, 220 - i * 16, Math.PI, 0).stroke({ color: N(col), width: 14, alpha: 0.6 }));
      else for (let x = 40; x < W; x += 120) g.rect(x - 3, -110, 6, 110).fill(0xffffff).circle(x, -120, 26).fill(N(['#ff8fb8', '#7fd1c7', '#ffd36e'][(x / 120 | 0) % 3]));
      for (let x = 0; x < W + 60; x += 70) cloud(g, x, -2, 1.3);
      if (t.kind === 'candy') for (let x = 0; x < W; x += 200) g.ellipse(x + 100, -10, 120, 60).fill({ color: N('#ffb3c7'), alpha: 0.8 });
      break;
    }
    case 'pool': {
      for (let x = 0; x < W; x += 22) for (let y = -60; y < -10; y += 22) g.rect(x + 1, y + 1, 20, 20).fill(N('#dff4ff'));
      // A wide pool of water with rolling waves, a slide and a lifeguard chair.
      g.rect(0, -90, W, 84).fill(N('#7fd1ff')).rect(0, -94, W, 6).fill(0xffffff);
      for (let y = -80; y < -10; y += 16) for (let x = ((y / 16) % 2 ? 0 : 25); x < W; x += 50) g.moveTo(x, y).quadraticCurveTo(x + 12, y - 7, x + 24, y).stroke({ color: 0xffffff, width: 2.5, alpha: 0.85 });
      const sx = W * 0.82;
      g.rect(sx, -230, 10, 140).fill(0xffffff).rect(sx + 40, -230, 10, 140).fill(0xffffff).rect(sx - 4, -236, 58, 10).fill(N('#ff8fb8'));
      g.moveTo(sx, -226).bezierCurveTo(sx - 80, -220, sx - 40, -120, sx - 140, -92).stroke({ color: N('#ffd36e'), width: 16, cap: 'round' });
      g.rect(W * 0.12, -170, 6, 80).fill(0xffffff).rect(W * 0.12 + 30, -170, 6, 80).fill(0xffffff).roundRect(W * 0.12 - 6, -176, 48, 16, 4).fill(N('#e63946'));
      for (let x = 80; x < W * 0.7; x += 260) umbrella(g, x, -100);
      break;
    }
    case 'city': case 'rails': case 'rooftop': {
      const base = t.kind === 'rooftop' ? -80 : 0;
      for (let x = -20, i = 0; x < W + 20; x += 54 + ((i * 13) % 30), i++) {
        const bh = 80 + ((h >> (i % 12)) % 120);
        g.rect(x, base - bh, 46, bh).fill(N(['#a8b8d8', '#c9b8d8', '#b8d0d8', '#d8c0b0'][i % 4]));
        for (let y = base - bh + 10; y < base - 14; y += 18) for (let wx = x + 7; wx < x + 40; wx += 14) g.rect(wx, y, 8, 10).fill(night ? 0xfff3b0 : 0xe8f4ff);
      }
      if (t.kind === 'rooftop') {
        g.rect(-200, -80, W + 400, 80).fill({ color: 0xffffff, alpha: 0.4 });
        for (let x = 0; x < W; x += 20) g.rect(x, -40, 4, 40).fill(0x9aa3ad);
        g.rect(0, -42, W, 5).fill(0x9aa3ad);
      } else if (t.kind === 'rails') {
        for (let x = 0; x < W; x += 18) g.rect(x, 2, 10, 20).fill(N('#8a5a3c'));
        g.rect(0, 6, W, 3).fill(0x6b6b6b).rect(0, 16, W, 3).fill(0x6b6b6b).rect(0, -4, W, 4).fill(N('#ffd36e'));
      } else {
        g.rect(0, 0, W, 24).fill(0x8a8f9a);
        for (let x = 0; x < W; x += 40) g.rect(x, 11, 20, 3).fill(0xffffff);
        for (let x = 60; x < W; x += 220) g.rect(x, -90, 4, 90).fill(0x5a5f6a).circle(x + 2, -94, 8).fill(night ? 0xfff3b0 : 0xffffff);
      }
      break;
    }
    case 'savanna': case 'farm': {
      hills(D(t.floor, -0.1));
      if (t.kind === 'savanna') for (let x = 70; x < W; x += 240) acacia(g, x);
      else {
        const bx = W * 0.65;
        g.rect(bx, -90, 90, 90).fill(N('#e05a4a')).poly([bx - 8, -90, bx + 45, -130, bx + 98, -90]).fill(N('#b8433f')).rect(bx + 30, -50, 30, 50).fill(0xffffff);
      }
      for (let x = 0; x < W; x += 40) g.rect(x + 16, -36, 6, 36).fill(N('#a8774f'));
      g.rect(0, -30, W, 5).fill(N('#a8774f')).rect(0, -16, W, 5).fill(N('#a8774f'));
      for (let x = 10; x < W; x += 26) g.poly([x, 4, x + 4, -10, x + 8, 4]).fill(D(t.floor, -0.2));
      break;
    }
    case 'fun': {
      g.circle(W * 0.3, -150, 90).stroke({ color: N('#b197fc'), width: 6, alpha: 0.6 });
      for (let k = 0; k < 8; k++) g.moveTo(W * 0.3, -150).lineTo(W * 0.3 + Math.cos((k * Math.PI) / 4) * 90, -150 + Math.sin((k * Math.PI) / 4) * 90).stroke({ color: N('#b197fc'), width: 3, alpha: 0.6 });
      g.moveTo(W * 0.55, 0).bezierCurveTo(W * 0.6, -200, W * 0.7, -40, W * 0.8, -160).lineTo(W * 0.95, 0).stroke({ color: N('#ff8fb8'), width: 6, alpha: 0.6 });
      for (let x = 0; x < W; x += 26) g.poly([x, -H + 30, x + 22, -H + 30, x + 11, -H + 50]).fill(N(['#ff8fb8', '#ffd36e', '#7fd1c7', '#b197fc'][(x / 26 | 0) % 4]));
      for (let x = 40; x < W; x += 300) g.poly([x, 0, x + 40, -70, x + 80, 0]).fill(N('#ff8fb8')).poly([x + 20, 0, x + 40, -70, x + 60, 0]).fill(0xffffff);
      break;
    }
    case 'stadium': {
      g.rect(-200, -150, W + 400, 150).fill(N('#9aa3c8'));
      for (let y = -140; y < -20; y += 16) for (let x = (y / 16) % 2 ? 4 : 10; x < W; x += 12) g.circle(x, y, 3.5).fill(N(['#ff8fb8', '#ffd36e', '#7fd1c7', '#ffffff', '#b197fc'][Math.abs((x + y) / 12 | 0) % 5]));
      for (const x of [20, W - 20]) g.rect(x - 3, -260, 6, 110).fill(0x6b6b6b).roundRect(x - 24, -280, 48, 24, 4).fill(0xffffff);
      for (let x = 0; x < W; x += 60) g.rect(x, 0, 30, 24).fill(D(t.floor, -0.08));
      g.rect(0, 10, W, 2).fill(0xffffff);
      break;
    }
    case 'night': {
      hills(D(t.floor, -0.15));
      g.arc(W * 0.3, 0, 80, Math.PI, 0).fill(N('#d8d8e8'));
      g.rect(W * 0.3 - 6, -90, 40, 12).fill(N('#9aa3ad'));
      break;
    }
    case 'runway': {
      g.rect(-200, -30, W + 400, 30).fill({ color: 0x9be37a, alpha: 0.6 });
      g.rect(W * 0.8, -200, 30, 200).fill(0xd8dde6).rect(W * 0.8 - 14, -230, 58, 34).fill(N('#7fb8ff'));
      plane(g, W * 0.3, -280);
      for (let x = 0; x < W; x += 60) g.rect(x, 10, 34, 4).fill(0xffffff);
      break;
    }
    case 'spooky': {
      hills(N('#5a3f7a'), 0.9);
      g.circle(W * 0.7, -H + 80, 40).fill(0xfff3b0);
      for (let x = 60; x < W; x += 180) bat(g, x, -H + 60 + ((x * 3) % 60));
      for (let x = 0; x < W; x += 24) g.poly([x + 4, 0, x + 4, -30 - ((x * 7) % 10), x + 10, -36 - ((x * 7) % 10), x + 16, -30 - ((x * 7) % 10), x + 16, 0]).fill(N('#3a2a4a'));
      for (let x = 40; x < W; x += 140) g.ellipse(x, -8, 14, 10).fill(N('#ff9f43')).rect(x - 2, -20, 4, 6).fill(N('#3fa66b'));
      break;
    }
    case 'garden': {
      for (let x = -10; x < W; x += 60) g.roundRect(x, -60, 64, 60, 30).fill(N('#5fbf6a'));
      for (let x = 20; x < W; x += 30) g.circle(x, -40 - ((x * 7) % 20), 4).fill(N(['#ff8fb8', '#ffffff', '#ffd36e'][(x / 30 | 0) % 3]));
      for (let x = 100; x < W; x += 320) g.arc(x, -60, 40, Math.PI, 0).stroke({ color: N('#ff8fb8'), width: 8 });
      break;
    }
    default: {
      // park: hills, clouds, a picket fence and flowers.
      hills(D(t.floor, -0.1));
      if (!night) for (let i = 0; i < 4; i++) cloud(g, ((h >> (i * 4)) % Math.max(1, W - 120)) + 60, -H + 60 + i * 38, 0.8);
      for (let x = 4; x < W; x += 18) g.roundRect(x, -40, 9, 40, 3).fill(0xffffff);
      g.rect(0, -30, W, 4).fill(0xffffff).rect(0, -14, W, 4).fill(0xffffff);
    }
  }
  if (!['city', 'rails', 'stadium', 'beach', 'pool'].includes(t.kind)) {
    g.rect(-200, 0, W + 400, 24).fill(ground);
    for (let x = 20; x < W; x += 46 + (h % 30)) g.circle(x, 6, 4).fill([0xff8fb8, 0xffd36e, 0xb197fc, 0xffffff][(x / 46) % 4 | 0]);
  } else if (t.kind !== 'city' && t.kind !== 'rails') g.rect(-200, 0, W + 400, 24).fill(ground);
  else if (t.kind === 'rails') g.rect(-200, 0, 200, 24).fill(ground).rect(W, 0, 200, 24).fill(ground);
  void c;
}

// ---------------------------------------------------------------- pieces
function sign(g: Graphics, c: Container, W: number, d: Dressing, outdoor: boolean): void {
  const t = label(`${d.sign!.emoji} ${d.sign!.name}`, 13);
  t.anchor.set(0.5);
  const n = Math.max(1, Math.floor(W / 280));
  const sx = n > 1 ? W / n : W / 2, sy = outdoor ? -OUTDOOR_HEIGHT + 110 : -WALL_HEIGHT + 22;
  const bw = t.width + 22;
  g.roundRect(sx - bw / 2, sy - 12, bw, 24, 12).fill(D(d.theme.accent, -0.15)).stroke({ color: 0xffffff, width: 2 });
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
function cloud(g: Graphics, x: number, y: number, s: number): void {
  g.circle(x, y, 16 * s).circle(x + 18 * s, y - 8 * s, 20 * s).circle(x + 38 * s, y, 16 * s).fill({ color: 0xffffff, alpha: 0.92 });
}
function bat(g: Graphics, x: number, y: number): void {
  g.poly([x - 18, y, x - 6, y - 6, x, y - 2, x + 6, y - 6, x + 18, y, x + 8, y + 2, x, y + 6, x - 8, y + 2]).fill(0x3a2a4a).circle(x - 2, y - 1, 1).fill(0xffffff).circle(x + 2, y - 1, 1).fill(0xffffff);
}
function palm(g: Graphics, x: number): void {
  g.moveTo(x, 0).quadraticCurveTo(x + 14, -60, x + 6, -120).stroke({ color: 0xa8774f, width: 8, cap: 'round' });
  for (const a of [-2.6, -2.1, -1.5, -1.0, -0.5]) g.ellipse(x + 6 + Math.cos(a) * 26, -120 + Math.sin(a) * 14, 26, 7).fill(0x3fa66b);
}
function pine(g: Graphics, x: number, s: number): void {
  g.rect(x - 3, -16 * s, 6, 16 * s).fill(0x8a5a3c);
  for (let k = 0; k < 3; k++) g.poly([x - (26 - k * 6) * s, -(16 + k * 24) * s, x, -(56 + k * 24) * s, x + (26 - k * 6) * s, -(16 + k * 24) * s]).fill(k === 2 ? 0xffffff : 0x3f8f5f);
}
function acacia(g: Graphics, x: number): void {
  g.moveTo(x, 0).lineTo(x + 4, -70).stroke({ color: 0x8a5a3c, width: 8 });
  g.ellipse(x + 4, -80, 70, 18).fill(0x6fa84f);
}
function umbrella(g: Graphics, x: number, y: number): void {
  g.rect(x - 2, y - 50, 4, 50).fill(0xffffff).moveTo(x - 40, y - 46).quadraticCurveTo(x, y - 90, x + 40, y - 46).closePath().fill(0xff8fb8);
}
function plane(g: Graphics, x: number, y: number): void {
  g.roundRect(x - 50, y - 8, 100, 16, 8).fill(0xffffff).poly([x - 6, y, x + 14, y, x - 10, y + 30]).fill(0xb8c8e8).poly([x + 36, y - 8, x + 48, y - 28, x + 52, y - 8]).fill(0xff8fb8);
}
