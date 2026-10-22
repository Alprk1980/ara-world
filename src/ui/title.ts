// The notes: "to play open app. screen will be pink with roses and a play button."
// In the realistic look the same idea, painted: a soft pink glow, garlands of roses and leaves round the edges,
// petals drifting down, and a glossy play button (drawings in src/data/title-art.json, from tools/real-title.ts).
import { Container, FillGradient, Graphics, Sprite, Text } from 'pixi.js';
import type { Scene } from '../app/scenes.ts';
import { currentLook } from '../art/look.ts';
import { textureFor } from '../art/textures.ts';
import { templates } from '../data/index.ts';
import titleArt from '../data/title-art.json';
import { COLORS, FONT, label, makeTappable, pillButton } from './kit.ts';

const ROSE_COLOURS = [
  { main: '#ff4f8b', trim: '#3fa66b', accent: '#ffb3cf', outline: '#7a2348' },
  { main: '#ff8fb8', trim: '#4cb87a', accent: '#ffe0ec', outline: '#7a2348' },
  { main: '#e8336f', trim: '#3a9a5f', accent: '#ff8fb8', outline: '#6b1d3d' },
];
/** Real rose colours for the realistic title: deep red, rose pink, blush and cream (main petal, deep heart, outline). */
const REAL_ROSES = [
  { main: '#c8174a', trim: '#4a7a3a', accent: '#7a0a2a', outline: '#5a0a20' },
  { main: '#e8507e', trim: '#4a7a3a', accent: '#a8204e', outline: '#6b1d3d' },
  { main: '#f4a0b8', trim: '#4a7a3a', accent: '#d8607e', outline: '#8a3a52' },
  { main: '#fbe0e4', trim: '#4a7a3a', accent: '#f0a0b0', outline: '#9a6a72' },
];
const LEAF = { main: '#4f8a3e', trim: '#2f5a24', accent: '#2f5a24', outline: '#24401c' };

const grad = (stops: [number, string][], across = false) =>
  new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: across ? { x: 1, y: 0 } : { x: 0, y: 1 }, colorStops: stops.map(([offset, color]) => ({ offset, color })) });
const glow = (color: string, alpha: number) =>
  new FillGradient({ type: 'radial', center: { x: 0.5, y: 0.5 }, innerRadius: 0, outerCenter: { x: 0.5, y: 0.5 }, outerRadius: 0.5, colorStops: [{ offset: 0, color: rgba(color, alpha) }, { offset: 1, color: rgba(color, 0) }] });
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export class TitleScene implements Scene {
  readonly name = 'title';
  readonly view = new Container();
  private bg = new Graphics();
  private roses = new Container();
  private petals = new Container();
  private title = label('ARA World', 96, COLORS.white);
  private play: Container;
  private t = 0;
  private real = currentLook() === 'real';
  private size = { w: 0, h: 0 };
  private falling: { s: Sprite; vy: number; sway: number; phase: number; spin: number }[] = [];

  constructor(onPlay: () => void) {
    if (this.real) {
      for (const a of titleArt as { id: string; svg: string }[]) templates.set(a.id, { id: a.id, name: a.id, category: 'decor', svg: a.svg });
      this.title = new Text({
        text: 'ARA World',
        style: {
          fontFamily: FONT, fontSize: 104, fontWeight: '700', fill: grad([[0, '#ffffff'], [0.55, '#fff0f5'], [1, '#ffc6d8']]),
          stroke: { color: '#a8204e', width: 9, join: 'round' },
          dropShadow: { color: '#6b1d3d', alpha: 0.35, blur: 10, distance: 6, angle: Math.PI / 2 },
        },
      });
      this.title.anchor.set(0.5);
      this.play = glossyButton('▶  Play', onPlay, 320, 104);
    } else {
      this.play = pillButton('▶  Play', onPlay, 300, 100);
      this.title.style.stroke = { color: COLORS.plum, width: 10, join: 'round' };
    }
    this.view.addChild(this.bg, this.roses, this.petals, this.title, this.play);
  }

  layout(w: number, h: number): void {
    this.size = { w, h };
    this.title.position.set(w / 2, h * 0.36);
    this.play.position.set(w / 2, h * 0.62);
    if (this.real) {
      this.paintBackground(w, h);
      this.garlands(w, h);
      this.startPetals(w, h);
      return;
    }
    this.bg.clear().rect(0, 0, w, h).fill(COLORS.pinkLight);
    this.placeRoses(w, h);
  }

  /** Roses around the border, drawn from whichever rose templates the model has made. */
  private placeRoses(w: number, h: number): void {
    this.roses.removeChildren();
    const roseIds = [...templates.keys()].filter((id) => id.includes('rose'));
    if (roseIds.length === 0) return;
    const size = Math.min(w, h) * 0.2;
    const spots: [number, number][] = [];
    for (let x = size * 0.4; x < w; x += size * 0.8) spots.push([x, size * 0.3], [x, h - size * 0.3]);
    for (let y = size * 1.1; y < h - size; y += size * 0.8) spots.push([size * 0.3, y], [w - size * 0.3, y]);
    spots.forEach(([x, y], i) => {
      const s = new Sprite();
      s.anchor.set(0.5);
      s.width = s.height = size;
      s.position.set(x, y);
      s.rotation = ((i * 37) % 40 - 20) * (Math.PI / 180);
      textureFor(roseIds[i % roseIds.length], ROSE_COLOURS[i % ROSE_COLOURS.length]).then((t) => {
        if (s.destroyed) return;
        s.texture = t;
        s.width = s.height = size;
      });
      this.roses.addChild(s);
    });
  }

  // ---------------------------------------------------------------- the realistic title
  /** Soft pink, lighter behind the title, deeper at the edges, with out-of-focus light drifting about. */
  private paintBackground(w: number, h: number): void {
    const g = this.bg.clear();
    g.rect(0, 0, w, h).fill(grad([[0, '#ffe8f0'], [0.5, '#ffd3e2'], [1, '#f7b3ca']]));
    g.ellipse(w / 2, h * 0.42, w * 0.55, h * 0.45).fill(glow('#ffffff', 0.75));
    for (let i = 0; i < 26; i++) {
      const x = ((i * 397) % 1000) / 1000 * w, y = ((i * 613) % 1000) / 1000 * h, r = 12 + ((i * 7) % 5) * 10;
      g.circle(x, y, r).fill(glow(i % 3 ? '#ffffff' : '#ffb0c8', 0.35));
    }
    // A vignette: the edges fall into a deeper rose.
    g.rect(0, 0, w, h * 0.25).fill(grad([[0, rgba('#b8406a', 0.25)], [1, rgba('#b8406a', 0)]]));
    g.rect(0, h * 0.75, w, h * 0.25).fill(grad([[0, rgba('#b8406a', 0)], [1, rgba('#b8406a', 0.3)]]));
    g.rect(0, 0, w * 0.18, h).fill(grad([[0, rgba('#b8406a', 0.22)], [1, rgba('#b8406a', 0)]], true));
    g.rect(w * 0.82, 0, w * 0.18, h).fill(grad([[0, rgba('#b8406a', 0)], [1, rgba('#b8406a', 0.22)]], true));
  }

  /** Garlands along the top and bottom and up the sides: leaves first, then roses of different sizes and colours,
   * biggest in the corners, the ones further back a little darker. */
  private garlands(w: number, h: number): void {
    this.roses.removeChildren().forEach((c) => c.destroy());
    const base = Math.min(w, h);
    const spots: { x: number; y: number; r: number; back: boolean }[] = [];
    const edge = (x0: number, y0: number, x1: number, y1: number, n: number) => {
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, wob = Math.sin(i * 2.3) * base * 0.02;
        spots.push({ x: x + wob, y: y - wob, r: base * (0.075 + ((i * 7) % 4) * 0.012), back: i % 2 === 1 });
      }
    };
    edge(0, base * 0.04, w, base * 0.04, Math.round(w / (base * 0.13)));
    edge(0, h - base * 0.05, w, h - base * 0.05, Math.round(w / (base * 0.13)));
    edge(base * 0.03, base * 0.18, base * 0.03, h - base * 0.18, Math.round(h / (base * 0.2)));
    edge(w - base * 0.03, base * 0.18, w - base * 0.03, h - base * 0.18, Math.round(h / (base * 0.2)));
    for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) for (let k = 0; k < 4; k++) spots.push({ x: cx + (cx ? -1 : 1) * base * (0.05 + k * 0.05), y: cy + (cy ? -1 : 1) * base * (0.06 + ((k * 3) % 4) * 0.03), r: base * (0.11 - k * 0.012), back: k === 3 });
    // Leaves tucked behind every rose, pointing outwards.
    spots.forEach((p, i) => {
      for (const turn of [-0.9, 0.9]) {
        const out = Math.atan2(p.y - h / 2, p.x - w / 2) + turn * 0.7;
        const leaf = this.sprite('title_leaf', LEAF, p.r * 2);
        leaf.position.set(p.x - Math.cos(out) * p.r * 0.2 + Math.cos(out + Math.PI) * -p.r * 0.9, p.y + Math.sin(out) * p.r * 0.7);
        leaf.rotation = out + Math.PI / 4 + ((i * 13) % 10) / 20;
        leaf.tint = p.back ? 0xc8d8c0 : 0xffffff;
        this.roses.addChild(leaf);
      }
    });
    [...spots].sort((a, b) => Number(b.back) - Number(a.back)).forEach((p, i) => {
      const rose = this.sprite('title_rose', REAL_ROSES[(i * 5 + Math.round(p.x)) % REAL_ROSES.length], p.r * 2);
      rose.position.set(p.x, p.y);
      rose.rotation = ((i * 47) % 60 - 30) * (Math.PI / 180);
      if (p.back) rose.tint = 0xe8c8d0;
      this.roses.addChild(rose);
    });
  }

  /** Petals that drift down, swaying, and start again at the top. */
  private startPetals(w: number, h: number): void {
    this.petals.removeChildren().forEach((c) => c.destroy());
    this.falling = [];
    const n = Math.round(w / 90);
    for (let i = 0; i < n; i++) {
      const s = this.sprite('title_petal', REAL_ROSES[i % REAL_ROSES.length], Math.min(w, h) * (0.03 + (i % 3) * 0.008));
      s.position.set(((i * 271) % 1000) / 1000 * w, ((i * 577) % 1000) / 1000 * h);
      s.alpha = 0.85;
      this.petals.addChild(s);
      this.falling.push({ s, vy: 22 + (i % 5) * 7, sway: 18 + (i % 4) * 8, phase: i * 1.3, spin: ((i % 5) - 2) * 0.35 });
    }
  }

  private sprite(id: string, palette: Record<string, string>, size: number): Sprite {
    const s = new Sprite();
    s.anchor.set(0.5);
    textureFor(id, palette).then((t) => {
      if (s.destroyed) return;
      s.texture = t;
      s.width = s.height = size;
    });
    s.width = s.height = size;
    return s;
  }

  update(dt: number): void {
    this.t += dt;
    this.play.scale.set(1 + Math.sin(this.t * 3) * 0.04);
    const { w, h } = this.size;
    for (const p of this.falling) {
      p.s.y += p.vy * dt;
      p.s.x += Math.sin(this.t * 1.2 + p.phase) * p.sway * dt;
      p.s.rotation += p.spin * dt;
      if (p.s.y > h + 30) {
        p.s.y = -30;
        p.s.x = Math.random() * w;
      }
    }
  }
}

/** A deep rose pill with light on its top half, a soft shadow beneath, and the label in white. */
function glossyButton(text: string, onTap: () => void, w: number, h: number): Container {
  const c = new Container();
  const g = new Graphics();
  g.roundRect(-w / 2 + 4, -h / 2 + 10, w, h, h / 2).fill({ color: 0x6b1d3d, alpha: 0.25 });
  g.roundRect(-w / 2, -h / 2, w, h, h / 2).fill(grad([[0, '#ff6f9c'], [0.6, '#e8336f'], [1, '#b81e52']])).stroke({ color: 0x8a1640, width: 3 });
  g.roundRect(-w / 2 + 14, -h / 2 + 7, w - 28, h * 0.42, h * 0.21).fill(grad([[0, 'rgba(255,255,255,0.65)'], [1, 'rgba(255,255,255,0.05)']]));
  const t = new Text({ text, style: { fontFamily: FONT, fontSize: h * 0.42, fontWeight: '700', fill: 0xffffff, dropShadow: { color: '#6b1d3d', alpha: 0.4, blur: 3, distance: 2, angle: Math.PI / 2 } } });
  t.anchor.set(0.5);
  c.addChild(g, t);
  makeTappable(c, onTap);
  return c;
}
