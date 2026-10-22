// Drawing kit for the realistic style (shared by Claude's samples in tools/style-real.ts and the redraws in
// tools/real-*.ts). Shading is done with overlay gradients made of white and dark at low opacity, so every drawing keeps
// its colour slots and can still be recoloured: paint a shape in its slot colour, then lay a light over it that also
// carries the thin outline.
import { readFileSync, writeFileSync } from 'node:fs';
import type { Template } from '../schemas/template.ts';
import { checkSvg } from '../schemas/svg.ts';
import { KINDS, type Entry } from './kinds.ts';
export const M = '{{main}}', T = '{{trim}}', A = '{{accent}}', O = '{{outline}}', W = '#ffffff', K = '#3a2a2a', G = '#cdeeff';
export const n = (v: number) => Math.round(v * 10) / 10;
export const line = (w: number) => (w ? ` stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"` : '');

// ---- light
type Stop = [number, string, number?];
export const stops = (s: Stop[]) => s.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('');
export const lin = (id: string, [x1, y1, x2, y2]: number[], s: Stop[], user = false) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>${stops(s)}</linearGradient>`;
export const rad = (id: string, [cx, cy, r]: number[], s: Stop[]) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(s)}</radialGradient>`;
/** L: lit top left, shaded bottom right. H: a cylinder standing up. V: lit on top. R: a ball. G: a glow from inside. */
export const LIGHT: Record<string, string> = {
  L: lin('L', [0, 0, 1, 1], [[0, W, 0.42], [0.42, W, 0], [0.58, K, 0], [1, K, 0.34]]),
  H: lin('H', [0, 0, 1, 0], [[0, K, 0.28], [0.22, W, 0.34], [0.42, W, 0], [1, K, 0.36]]),
  V: lin('V', [0, 0, 0, 1], [[0, W, 0.38], [0.45, W, 0], [1, K, 0.3]]),
  R: rad('R', [0.38, 0.32, 0.72], [[0, W, 0.55], [0.32, W, 0], [1, K, 0.42]]),
  G: rad('G', [0.5, 0.5, 0.6], [[0, W, 0.7], [1, W, 0]]),
  S: lin('S', [0, 0, 1, 0], [[0, K, 0.28], [0.16, K, 0], [0.4, W, 0.14], [0.6, W, 0.14], [0.84, K, 0], [1, K, 0.28]]),
};
export const svg = (body: string, extra: string[] = []) => {
  const used = Object.keys(LIGHT).filter((k) => body.includes(`url(#${k})`));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs>${used.map((k) => LIGHT[k]).join('')}${extra.join('')}</defs>${body}</svg>`;
};

// ---- shapes: painted, then lit, with the outline on top
export const P = (d: string, fill: string, g = 'L', w = 2.5) => `<path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#${g})"${line(w)}/>`;
export const E = (cx: number, cy: number, rx: number, ry: number, fill: string, g = 'R', w = 2.5) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${g})"${line(w)}/>`;
export const C = (cx: number, cy: number, r: number, fill: string, g = 'R', w = 2.5) => E(cx, cy, r, r, fill, g, w);
export const B = (x: number, y: number, wd: number, h: number, rx: number, fill: string, g = 'L', w = 2.5) =>
  `<rect x="${x}" y="${y}" width="${wd}" height="${h}" rx="${rx}" fill="${fill}"/><rect x="${x}" y="${y}" width="${wd}" height="${h}" rx="${rx}" fill="url(#${g})"${line(w)}/>`;
// plain bits: a flat shape, a stroke, a soft ground shadow, a shine
export const f = (d: string, fill: string, op = 1) => `<path d="${d}" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
export const s = (d: string, col: string, w: number, op = 1) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op < 1 ? ` opacity="${op}"` : ''}/>`;
export const dot = (cx: number, cy: number, r: number, fill: string, op = 1) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
export const oval = (cx: number, cy: number, rx: number, ry: number, fill: string, op = 1) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
export const ground = (cx: number, cy: number, rx: number, ry = 6) => oval(cx, cy, rx, ry, K, 0.16);

/** Mirror a path left-right (absolute M L C Q Z only), for pairs of socks and shoes. */
export function mirror(d: string): string {
  return d.replace(/([MLCQ])([^MLCQZ]*)/g, (_, cmd: string, args: string) => {
    const v = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    return cmd + v.map((x, i) => (i % 2 === 0 ? 256 - x : x)).join(' ') + ' ';
  }).replace(/\s+Z/g, ' Z').trim();
}
/** A monstera leaf: a heart shape with slits, pointing at `angle` (radians, 0 = right). */
export function leaf(cx: number, cy: number, r: number, angle: number): string {
  const pts: [number, number][] = [];
  const slits = [0.75, 1.35, 1.95];
  for (let i = 0; i < 26; i++) {
    const t = -Math.PI + (i / 26) * Math.PI * 2;
    const heart = 1 - 0.28 * Math.max(0, -Math.cos(t)) ** 3 + 0.08 * Math.cos(t);
    const slit = slits.some((a) => Math.abs(Math.abs(t) - a) < 0.09) ? 0.55 : 1;
    const rr = r * heart * slit;
    const x = Math.cos(t) * rr, y = Math.sin(t) * rr * 0.72;
    pts.push([cx + x * Math.cos(angle) - y * Math.sin(angle), cy + x * Math.sin(angle) + y * Math.cos(angle)]);
  }
  return `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')} Z`;
}
export function wheel(cx: number, cy: number, r: number): string {
  let out = dot(cx, cy, r, K) + C(cx, cy, r * 0.62, T, 'H', 1.5) + dot(cx, cy, r * 0.22, K, 0.5);
  for (let k = 0; k < 5; k++) out += dot(n(cx + Math.cos(k * 1.2566) * r * 0.4), n(cy + Math.sin(k * 1.2566) * r * 0.4), r * 0.07, K, 0.45);
  return out + s(`M${n(cx - r * 0.75)} ${n(cy - r * 0.45)} C${n(cx - r * 0.5)} ${n(cy - r * 0.85)} ${n(cx)} ${n(cy - r * 0.95)} ${n(cx + r * 0.3)} ${n(cy - r * 0.88)}`, W, 2, 0.3);
}

/** A pointed leaf (or blade of grass, petal, flame) from (x0, y0) to its tip at (x1, y1), w wide at its middle; bend
 * pushes the middle sideways (a share of the length). */
export function blade(x0: number, y0: number, x1: number, y1: number, w: number, bend = 0): string {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const mx = (x0 + x1) / 2 + nx * bend * len, my = (y0 + y1) / 2 + ny * bend * len;
  return `M${n(x0)} ${n(y0)} Q${n(mx + nx * w)} ${n(my + ny * w)} ${n(x1)} ${n(y1)} Q${n(mx - nx * w)} ${n(my - ny * w)} ${n(x0)} ${n(y0)} Z`;
}
/** Points round an ellipse, as an SVG path through them (for stars, gears, scalloped edges): r(i) gives the radius
 * scale of point i of k. */
export function ring(cx: number, cy: number, rx: number, ry: number, k: number, r: (i: number) => number = () => 1, turn = -Math.PI / 2): string {
  const pts = Array.from({ length: k }, (_, i) => {
    const a = turn + (i / k) * Math.PI * 2;
    return `${n(cx + Math.cos(a) * rx * r(i))} ${n(cy + Math.sin(a) * ry * r(i))}`;
  });
  return `M${pts.join(' L')} Z`;
}
/** A star with k points. */
export const star = (cx: number, cy: number, r: number, k = 5, inner = 0.45) => ring(cx, cy, r, r, k * 2, (i) => (i % 2 ? inner : 1));

/** Move and scale an absolute path (M L C Q Z only), drawn round (0, 0), to (dx, dy) at size k; flip mirrors it. */
export function place(d: string, dx: number, dy: number, k: number, flip = false): string {
  return d.replace(/([MLCQ])([^MLCQZ]*)/g, (_, cmd: string, args: string) => {
    const v = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    return cmd + v.map((x, i) => n(i % 2 === 0 ? dx + (flip ? -x : x) * k : dy + x * k)).join(' ') + ' ';
  }).replace(/\s+Z/g, ' Z').trim();
}
/** A prancing carousel horse facing right, body centred on (cx, cy): body, legs, mane, tail and saddle. */
export function horse(cx: number, cy: number, k: number, body = M, mane = T, saddle = A): string {
  const at = (d: string) => place(d, cx, cy, k);
  const w = Math.max(3, 9 * k);
  return s(at('M-50 -4 C-72 0 -76 22 -66 36'), O, w + 4) + s(at('M-50 -4 C-72 0 -76 22 -66 36'), mane, w) +
    s(at('M28 18 L32 46 L44 60 M-24 18 L-20 48 L-32 60'), O, w + 3) + s(at('M28 18 L32 46 L44 60 M-24 18 L-20 48 L-32 60'), body, w) +
    P(at('M-50 -6 C-50 -26 -20 -26 10 -24 C24 -24 30 -30 36 -44 L44 -62 C48 -70 58 -72 64 -66 L84 -48 C88 -44 86 -38 80 -38 L66 -40 C60 -30 56 -14 52 0 C50 18 30 24 10 24 L-30 24 C-46 24 -50 12 -50 -6 Z'), body, 'L', 2) +
    s(at('M40 14 L56 38 L50 58 M-36 16 L-52 38 L-46 58'), O, w + 3) + s(at('M40 14 L56 38 L50 58 M-36 16 L-52 38 L-46 58'), body, w) +
    s(at('M42 -60 C34 -50 28 -36 26 -24'), mane, w * 1.1) + P(at('M-20 -24 C-14 -34 14 -34 20 -24 L18 -10 L-18 -10 Z'), saddle, 'V', 1.5) +
    dot(cx + 60 * k, cy - 58 * k, Math.max(2, 4 * k), K);
}

/** A petal: an ellipse rx by ry around (cx, cy), tilted by angle (radians), as a path. */
export function lobe(cx: number, cy: number, rx: number, ry: number, angle: number, k = 8): string {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  // A smooth closed curve through k points (quadratic curves between midpoints), whole numbers to keep it small.
  const pts = Array.from({ length: k }, (_, i) => {
    const t = (i / k) * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    return [Math.round(cx + x * ca - y * sa), Math.round(cy + x * sa + y * ca)];
  });
  const mid = (i: number) => { const a = pts[i % k], b = pts[(i + 1) % k]; return `${Math.round((a[0] + b[0]) / 2)} ${Math.round((a[1] + b[1]) / 2)}`; };
  return `M${mid(0)}` + pts.map((_, i) => ` Q${pts[(i + 1) % k].join(' ')} ${mid(i + 1)}`).join('') + ' Z';
}
/** A rose seen from above and a little in front: an outer ring of broad petals, a smaller ring turned between
 * them, a cupped heart, and a tight spiral of petal edges in the middle. main is the petal colour, accent the deep
 * shade inside. */
export function roseHead(cx: number, cy: number, r: number, main = M, deep = A): string {
  // One base of petal colour under the whole head; each petal is then just its light and outline, so the stacked
  // shading reads as layers of petals (and the drawing stays small).
  const lit = (d: string, w: number) => `<path d="${d}" fill="url(#R)"${line(w)}/>`;
  let out = oval(cx, cy, r * 0.82, r * 0.72, main);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    out += P(lobe(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.44, r * 0.54, r * 0.44, a), main, 'R', Math.max(1, r * 0.022));
  }
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 4 + (i * Math.PI) / 2;
    out += lit(lobe(cx + Math.cos(a) * r * 0.28, cy + Math.sin(a) * r * 0.25, r * 0.36, r * 0.28, a), Math.max(0.8, r * 0.01));
  }
  out += E(cx, cy, r * 0.36, r * 0.32, deep, 'R', Math.max(1, r * 0.02));
  out += lit(lobe(cx - r * 0.06, cy + r * 0.1, r * 0.3, r * 0.18, -0.3), Math.max(0.8, r * 0.01));
  const w = Math.max(1.2, r * 0.035);
  out += s(`M${n(cx - r * 0.02)} ${n(cy - r * 0.04)} C${n(cx + r * 0.1)} ${n(cy - r * 0.16)} ${n(cx + r * 0.22)} ${n(cy - r * 0.02)} ${n(cx + r * 0.12)} ${n(cy + r * 0.1)} C${n(cx)} ${n(cy + r * 0.2)} ${n(cx - r * 0.2)} ${n(cy + r * 0.06)} ${n(cx - r * 0.16)} ${n(cy - r * 0.12)} C${n(cx - r * 0.1)} ${n(cy - r * 0.28)} ${n(cx + r * 0.2)} ${n(cy - r * 0.3)} ${n(cx + r * 0.3)} ${n(cy - r * 0.12)}`, O, w, 0.55);
  out += s(`M${n(cx - r * 0.7)} ${n(cy - r * 0.4)} C${n(cx - r * 0.5)} ${n(cy - r * 0.8)} ${n(cx)} ${n(cy - r * 0.95)} ${n(cx + r * 0.35)} ${n(cy - r * 0.82)}`, W, w * 1.4, 0.35);
  return out;
}
/** A rose leaf from (x0, y0) to its tip, with a midrib and side veins. */
export function roseLeaf(x0: number, y0: number, x1: number, y1: number, w: number, fill = M, vein = T): string {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  let v = `M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)}`;
  for (const t of [0.3, 0.5, 0.7]) {
    const px = x0 + dx * t, py = y0 + dy * t;
    for (const sgn of [-1, 1]) v += ` M${n(px)} ${n(py)} L${n(px + dx * 0.12 + nx * w * 0.7 * sgn)} ${n(py + dy * 0.12 + ny * w * 0.7 * sgn)}`;
  }
  void mx; void my;
  return P(blade(x0, y0, x1, y1, w), fill, 'L', Math.max(1, w * 0.08)) + s(v, vein, Math.max(1, w * 0.07), 0.8);
}

// ---- furniture and fittings (shared by the redraw files)
export const WATER = '#7fd1ff';
export const bar = (d: string, col: string, w: number) => s(d, O, w + 4) + s(d, col, w);
// A table or counter: a top seen slightly from above (a lit strip), its front edge, and legs or a front panel.
export const slab = (x0: number, x1: number, y: number, depth: number, thick: number, fill = M) =>
  P(`M${x0 + depth} ${y} L${x1 - depth} ${y} L${x1} ${y + depth} L${x0} ${y + depth} Z`, fill, 'V', 2) + B(x0, y + depth, x1 - x0, thick, 3, fill, 'L', 2);
export const legs = (xs: number[], top: number, bottom: number, w: number, fill = M) => xs.map((x) => B(x, top, w, bottom - top, 3, fill, 'H', 2)).join('');
// A cushion: a soft rounded block, lit on top.
export const cushion = (x: number, y: number, w: number, h: number, fill = T) => B(x, y, w, h, Math.min(16, h / 2), fill, 'V', 2);
// Shelf rows inside a cabinet: dark backs with thin shelves.
export const shelves = (x0: number, x1: number, ys: number[], fill = M) => ys.map((y) => B(x0, y, x1 - x0, 7, 2, fill, 'V', 1.5)).join('');
export const back = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#3a2a2a" opacity="0.28"/>`;
export const books = (x: number, y: number, n: number, cols = [T, A, W]) =>
  Array.from({ length: n }, (_, i) => `<rect x="${x + i * 13}" y="${y - 30 - (i % 3) * 4}" width="11" height="${30 + (i % 3) * 4}" rx="2" fill="${cols[i % cols.length]}" stroke="${O}" stroke-width="1"/>`).join('');
export const box = (x: number, y: number, w: number, h: number, fill = A) => B(x, y, w, h, 3, fill, 'L', 2) + s(`M${x + w / 2} ${y} L${x + w / 2} ${y + h}`, T, 3, 0.8);
export const tyre = (cx: number, cy: number, r: number) => dot(cx, cy, r, K) + C(cx, cy, r * 0.55, T, 'H', 1.5) + dot(cx, cy, r * 0.18, K, 0.5);
export const cloud = (cx: number, cy: number, w: number, h: number, fill = M) =>
  P(`M${cx - w / 2} ${cy + h / 2} C${cx - w / 2 - h * 0.6} ${cy + h / 2} ${cx - w / 2 - h * 0.4} ${cy - h * 0.2} ${cx - w / 2 + h * 0.2} ${cy - h * 0.1} C${cx - w / 4} ${cy - h * 0.9} ${cx} ${cy - h * 0.9} ${cx + w * 0.05} ${cy - h * 0.4} C${cx + w / 4} ${cy - h} ${cx + w / 2} ${cy - h * 0.6} ${cx + w / 2 - h * 0.1} ${cy - h * 0.1} C${cx + w / 2 + h * 0.5} ${cy - h * 0.1} ${cx + w / 2 + h * 0.5} ${cy + h / 2} ${cx + w / 2} ${cy + h / 2} Z`, fill, 'R');
export const ripple = (x0: number, x1: number, y: number) => s(Array.from({ length: Math.floor((x1 - x0) / 40) }, (_, i) => `M${x0 + i * 40} ${y + (i % 2) * 6} c10 -5 20 5 30 0`).join(' '), W, 3, 0.6);

export const eye = (x: number, y: number, r = 6) => dot(x, y, r, K) + dot(x - r * 0.35, y - r * 0.35, r * 0.38, W);

// ---- redraws: Claude's realistic versions of the game's templates (user's OK, 2026-10-22, in place of Qwen)
export type Pal = { main: string; trim: string; accent: string; outline: string };
export const pal = (main: string, trim: string, accent: string, outline: string): Pal => ({ main, trim, accent, outline });
export type Redraw = { id: string; palette: Pal; body: string; anchors?: Template['anchors'] };
/** A redraw of template `id`: its body (svg() adds the root and lights) and real-world colours. Anchors default to the
 * original's names, with base moved to the bottom of the new drawing and the rest kept inside it; any given here
 * are added or replace those (a seat on a horse's back). */
export const rd = (id: string, palette: Pal, body: string, anchors?: Template['anchors']): Redraw => ({ id, palette, body, anchors });

const REAL_FILE = 'src/data/templates-real.json';

/** Validate each redraw like Qwen's (kind template-redraw) and merge the passing ones into templates-real.json. */
export function commitReal(list: Redraw[], label: string): number {
  const originals = new Map((JSON.parse(readFileSync('src/data/templates.json', 'utf8')) as Template[]).map((t) => [t.id, t]));
  const shipped = JSON.parse(readFileSync(REAL_FILE, 'utf8')) as (Template & { palette: Pal })[];
  const errors: string[] = [];
  let ok = 0;
  for (const r of list) {
    const o = originals.get(r.id);
    if (!o) {
      errors.push(`${r.id}: no such template`);
      continue;
    }
    const text = svg(r.body);
    const t: Template & { palette: Pal } = { id: o.id, name: o.name, category: o.category, ...(o.size ? { size: o.size, anchors: { ...fitAnchors(o.anchors ?? {}, text), ...r.anchors } } : {}), palette: r.palette, svg: text };
    const pool = [...shipped.filter((x) => x.id !== t.id), t] as unknown as Entry[];
    const errs = KINDS['template-redraw'].errors(t as unknown as Entry, pool);
    if (errs.length) {
      errors.push(...errs);
      continue;
    }
    const i = shipped.findIndex((x) => x.id === t.id);
    if (i >= 0) shipped[i] = t;
    else shipped.push(t);
    ok++;
  }
  writeFileSync(REAL_FILE, `${JSON.stringify(shipped, null, 2)}\n`);
  console.log(`${label}: ${ok} of ${list.length} merged (${shipped.length} redrawn in all)`);
  for (const x of errors) console.log(`  ✗ ${x}`);
  return errors.length;
}

function fitAnchors(orig: NonNullable<Template['anchors']>, text: string): Template['anchors'] {
  const box = checkSvg(text).box;
  if (!box) return orig;
  const out: Record<string, [number, number]> = {};
  const clamp = (v: number, a: number, b: number) => Math.round(Math.min(b - 4, Math.max(a + 4, v)));
  for (const [k, p] of Object.entries(orig)) {
    if (!p) continue;
    out[k] = k === 'base' ? [128, Math.round(Math.min(246, box.maxY))] : [clamp(p[0], box.minX, box.maxX), clamp(p[1], box.minY, box.maxY)];
  }
  return out as Template['anchors'];
}
