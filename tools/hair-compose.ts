// Compose PARAMETRIC hair designs (schemas/hair-params.ts) into the game's EXACT realistic
// hair grammar, learned from the 26 shipped styles in src/data/templates-real.json:
//   lump = <path fill="{{main}}"/> + identical twin <path fill="url(#H)"/> carrying the thin
//   {{outline}} stroke; texture = extra lumps or thin {{outline}}/{{trim}} strokes; house shine
//   = the #ffffff stroke-width 6 arc. The model only supplies polygons + knobs; every gradient,
//   token and quote here is fixed, so raw-SVG asks can no longer drift style.
import { shade } from '../src/art/color.ts';
import { inside } from './hair-sign.ts';
import type { HairParams, HairLump, HairStroke, Pt } from '../schemas/hair-params.ts';
import type { Template } from '../schemas/template.ts';

export const GRADS: Record<string, string> = {
  H: '<linearGradient id="H" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2a2a" stop-opacity="0.28"/><stop offset="0.22" stop-color="#ffffff" stop-opacity="0.34"/><stop offset="0.42" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#3a2a2a" stop-opacity="0.36"/></linearGradient>',
  R: '<radialGradient id="R" cx="0.38" cy="0.32" r="0.72"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="0.32" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#3a2a2a" stop-opacity="0.42"/></radialGradient>',
  V: '<linearGradient id="V" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.38"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#3a2a2a" stop-opacity="0.3"/></linearGradient>',
  L: '<linearGradient id="L" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.42"/><stop offset="0.42" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.58" stop-color="#3a2a2a" stop-opacity="0"/><stop offset="1" stop-color="#3a2a2a" stop-opacity="0.34"/></linearGradient>',
};

const r = (n: number) => Math.round(n * 10) / 10;
const num = (p: Pt) => `${r(p[0])} ${r(p[1])}`;

// Closed Catmull-Rom -> cubic bezier (smooth, like the shipped curves).
export function closedPath(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${num(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${num(c1)} ${num(c2)} ${num(p2)}`;
  }
  return d + ' Z';
}

// Open chain -> polyline (line) or smooth curve (arc).
export function openPath(pts: Pt[], kind: 'line' | 'arc'): string {
  if (kind === 'line') return `M${pts.map(num).join(' L')}`;
  const n = pts.length;
  let d = `M${num(pts[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${num(c1)} ${num(c2)} ${num(p2)}`;
  }
  return d;
}

function lumpPair(l: HairLump): string {
  const d = closedPath(l.pts);
  const base = `<path d="${d}" fill="{{${l.fill}}}"/>`;
  const twin = `<path d="${d}" fill="url(#${l.grad})" stroke="{{outline}}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  return base + twin;
}

function strand(s: HairStroke): string {
  return `<path d="${openPath(s.pts, s.d)}" fill="none" stroke="{{${s.tone}}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="${s.opacity}"/>`;
}

// Deterministic clipper ticks across the top band of the main lump (buzz / crop stubble).
function stubbleTicks(lump: HairLump, count: number): string {
  const top = lump.pts.filter((p) => p[1] < 110).sort((a, b) => a[0] - b[0]);
  if (top.length < 2 || count <= 0) return '';
  let d = '';
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const p = top[Math.min(top.length - 1, Math.round(t * (top.length - 1)))];
    d += `M${r(p[0])} ${r(p[1])} L${r(p[0] + 8)} ${r(p[1] - 8)} `;
  }
  return `<path d="${d.trim()}" fill="none" stroke="{{trim}}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>`;
}

function bbox(pts: Pt[]) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

const distSeg = (q: Pt, a: Pt, b: Pt) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy));
};

// Lower face (nose-tip to chin): hair must NOT blanket it. Fringe may sit on the FOREHEAD
// (y<=168); back/side masses that fill this box read as hair over the face (failed mullet).
const FACE = { x0: 75, x1: 181, y0: 168, y1: 215 };
const inFace = (p: Pt) => p[0] > FACE.x0 && p[0] < FACE.x1 && p[1] > FACE.y0 && p[1] < FACE.y1;

function faceCover(lump: HairLump): number {
  // fraction of a 9x5 grid inside the lower-face box that the lump polygon covers
  let hit = 0, tot = 0;
  for (let x = FACE.x0; x <= FACE.x1; x += (FACE.x1 - FACE.x0) / 8) {
    for (let y = FACE.y0; y <= FACE.y1; y += (FACE.y1 - FACE.y0) / 4) {
      tot++;
      if (inside(lump.pts, x, y)) hit++;
    }
  }
  return hit / tot;
}

export type ComposeResult = { template: Template & { palette: Record<string, string> }; errors: string[] };

export function compose(p: HairParams): ComposeResult {
  const errors: string[] = [];
  const allPts: Pt[] = [...p.lump.pts, ...(p.extra ?? []).flatMap((l) => l.pts)];
  const b = bbox(allPts);
  if (b.maxX - b.minX < 128) errors.push(`hair must cover >= half the frame width (128), found ${Math.round(b.maxX - b.minX)}`);
  if (b.maxY - b.minY < 128) errors.push(`hair must cover >= half the frame height (128), found ${Math.round(b.maxY - b.minY)}`);

  const grads = new Set<string>([p.lump.grad, ...(p.extra ?? []).map((l) => l.grad)]);
  const defs = `<defs>${[...grads].map((g) => GRADS[g]).join('')}</defs>`;

  // face-clearance gate: fringe sits above y168; no hair mass may blanket the lower face,
  // and no strand/sheen line may run over it (the failed slicked_back / mullet modes).
  for (const l of [p.lump, ...(p.extra ?? [])]) {
    const cov = faceCover(l);
    if (cov > 0.2) errors.push(`a hair lump covers ${Math.round(cov * 100)}% of the lower face (x${FACE.x0}-${FACE.x1}, y${FACE.y0}-${FACE.y1}) - keep the face clear: hair hangs BESIDE it (x<${FACE.x0} or x>${FACE.x1}) or behind, fringe never below y${FACE.y0}`);
  }
  for (const s of p.strands ?? []) {
    if (s.pts.some(inFace)) errors.push('a strand line crosses the lower face (x 75-181, y 168-215) - keep flow lines on hair only');
    const near = (q: Pt) => [p.lump, ...(p.extra ?? [])].some((l) => l.pts.some((a, i) => distSeg(q, a, l.pts[(i + 1) % l.pts.length]) <= 14));
    for (const q of [s.pts[0], s.pts[s.pts.length - 1]]) {
      if (!near(q)) errors.push(`a strand end at [${r(q[0])},${r(q[1])}] floats off the hair outline - scallop/tick endpoints must sit ON a lump boundary (within ~10 px)`);
    }
  }
  for (const a of p.sheen ?? []) {
    if (a.some(inFace)) errors.push('a sheen arc crosses the lower face - keep it on the crown/hair');
  }

  const main = lumpPair(p.lump);
  const extras = (p.extra ?? []).map(lumpPair).join('');
  const strands = (p.strands ?? []).map(strand).join('');
  const sheen = (p.sheen ?? []).map((a) => `<path d="${openPath(a, 'arc')}" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.25"/>`).join('');
  const stub = p.stubble ? stubbleTicks(p.lump, p.stubble) : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${defs}${main}${extras}${strands}${sheen}${stub}</svg>`;
  const palette = { main: p.main, trim: shade(p.main, 0.25), accent: shade(p.main, 0.4), outline: shade(p.main, -0.45) };
  return { template: { id: p.id, name: p.name, category: 'hair', palette, svg }, errors };
}

// CLI: node tools/hair-compose.ts params.json [out.svg]
if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2];
  if (!src) { console.error('usage: node tools/hair-compose.ts params.json [out.svg]'); process.exit(2); }
  const { readFileSync, writeFileSync } = await import('node:fs');
  const { hairParamsErrors } = await import('../schemas/hair-params.ts');
  const params = JSON.parse(readFileSync(src, 'utf8')) as HairParams;
  const perr = hairParamsErrors(params);
  if (perr.length) { console.error('param errors:\n  ' + perr.join('\n  ')); process.exit(1); }
  const { template, errors } = compose(params);
  if (errors.length) { console.error('compose errors:\n  ' + errors.join('\n  ')); process.exit(1); }
  if (process.argv[3]) writeFileSync(process.argv[3], template.svg);
  else console.log(template.svg);
}
