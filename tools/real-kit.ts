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

// ---- redraws: Claude's realistic versions of the game's templates (user's OK, 2026-10-22, in place of Qwen)
export type Pal = { main: string; trim: string; accent: string; outline: string };
export const pal = (main: string, trim: string, accent: string, outline: string): Pal => ({ main, trim, accent, outline });
export type Redraw = { id: string; palette: Pal; body: string; anchors?: Template['anchors'] };
/** A redraw of template `id`: its body (svg() adds the root and lights) and real-world colours. Anchors default to the
 * original's names, with base moved to the bottom of the new drawing and the rest kept inside it. */
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
    const t: Template & { palette: Pal } = { id: o.id, name: o.name, category: o.category, ...(o.size ? { size: o.size, anchors: r.anchors ?? fitAnchors(o.anchors ?? {}, text) } : {}), palette: r.palette, svg: text };
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
