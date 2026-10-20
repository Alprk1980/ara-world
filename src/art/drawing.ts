// Turn a child's finger drawing into a game template: strokes are simplified, fitted to the 256 canvas (standing on
// the bottom edge), and written as SVG paths in the colour slots, so the drawing passes the same validator as every
// other template and can be recoloured like any item.
import type { Template } from '../../schemas/template.ts';
import { MAX_SVG_BYTES } from '../../schemas/svg.ts';
import { SIZE_BOUNDS } from '../../schemas/vocab.ts';

/** main, trim and accent are the paint pots; outline is the black pen; white is always white. */
export type Ink = 'main' | 'trim' | 'accent' | 'outline' | 'white';
export type Pt = [number, number];
/** A line follows the finger; a fill closes the loop the finger drew and fills it. Points are 0-256 pad units. */
export type Stroke = { kind: 'line' | 'fill'; ink: Ink; width: number; points: Pt[] };

/** The things a drawing can become, with what the game needs to know about each. */
export const DRAW_KINDS = [
  { category: 'toy', emoji: '🧸', word: 'Toy', tags: ['toys', 'kids_room'] },
  { category: 'food', emoji: '🍰', word: 'Food', tags: ['kitchen'], bites: 3 },
  { category: 'drink', emoji: '🥤', word: 'Drink', tags: ['kitchen'], bites: 3 },
  { category: 'furniture', emoji: '🛋️', word: 'Furniture', tags: ['living', 'bedroom'] },
  { category: 'decor', emoji: '🖼️', word: 'Decoration', tags: ['living', 'cosy'] },
  { category: 'plant', emoji: '🌷', word: 'Plant', tags: ['garden', 'living'] },
  { category: 'animal', emoji: '🐶', word: 'Animal', tags: ['pet', 'zoo'] },
  { category: 'vehicle', emoji: '🚗', word: 'Vehicle', tags: ['outdoor'] },
] as const;
export type DrawKind = (typeof DRAW_KINDS)[number];

/** How big, in world units (an adult is 100 tall); clamped to what the category allows. */
export const DRAW_SIZES = [
  { emoji: '🐜', word: 'Tiny', h: 6 },
  { emoji: '🐱', word: 'Small', h: 16 },
  { emoji: '🧒', word: 'Medium', h: 40 },
  { emoji: '🧍', word: 'Big', h: 90 },
  { emoji: '🦒', word: 'Huge', h: 180 },
] as const;

const HOLDABLE = new Set(['food', 'drink', 'toy', 'school', 'makeup', 'sport']);
const FIT = 228; // longest side of the drawing in the 256 canvas
const FLOOR = 250; // where the drawing stands
const MAX_STROKES = 160;
const MAX_ELEMENTS = 56;

export function heightFor(category: string, wanted: number): number {
  const b = SIZE_BOUNDS[category] ?? { min: 5, max: 100 };
  return Math.max(b.min, Math.min(b.max, wanted));
}

/** Douglas-Peucker: drop points that stay within `tol` of the line between their neighbours. */
export function simplify(points: Pt[], tol: number): Pt[] {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  let far = 0, at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const d = len < 1e-6 ? Math.hypot(p[0] - a[0], p[1] - a[1]) : Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > far) [far, at] = [d, i];
  }
  if (far <= tol) return [a, b];
  return [...simplify(points.slice(0, at + 1), tol).slice(0, -1), ...simplify(points.slice(at), tol)];
}

/** The box round every point, padded by half the stroke widths. */
export function drawingBox(strokes: Stroke[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let box: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  for (const s of strokes)
    for (const [x, y] of s.points) {
      const r = s.kind === 'line' ? s.width / 2 : 0;
      box = box
        ? { minX: Math.min(box.minX, x - r), minY: Math.min(box.minY, y - r), maxX: Math.max(box.maxX, x + r), maxY: Math.max(box.maxY, y + r) }
        : { minX: x - r, minY: y - r, maxX: x + r, maxY: y + r };
    }
  return box;
}

const paintOf = (ink: Ink) => (ink === 'white' ? '#ffffff' : `{{${ink}}}`);

function svgFor(strokes: Stroke[], tol: number): { svg: string; box: { minX: number; minY: number; maxX: number; maxY: number } } {
  const r = (v: number) => Math.round(v);
  // Consecutive lines with the same look share one <path>, so the drawing order is kept.
  const groups: { key: string; s: Stroke; d: string[] }[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) {
    let pts = simplify(s.points.map(([x, y]) => [r(x), r(y)] as Pt), tol);
    if (s.kind === 'fill' && pts.length < 3) continue;
    if (pts.length === 1) pts = [pts[0], pts[0]];
    const pad = s.kind === 'line' ? s.width / 2 : 1.5;
    for (const [x, y] of pts) [minX, minY, maxX, maxY] = [Math.min(minX, x - pad), Math.min(minY, y - pad), Math.max(maxX, x + pad), Math.max(maxY, y + pad)];
    const d = `M${pts[0][0]} ${pts[0][1]}` + pts.slice(1).map(([x, y]) => `L${x} ${y}`).join('') + (s.kind === 'fill' ? 'Z' : '');
    const key = `${s.kind}|${s.ink}|${s.width}`;
    const last = groups[groups.length - 1];
    // Lines can share a path; each filled shape gets its own, so its outline sits under what's drawn after it.
    if (last && last.key === key && s.kind === 'line') last.d.push(d);
    else groups.push({ key, s, d: [d] });
  }
  // Too many separate pieces: merge same-looking ones regardless of order.
  let list = groups;
  if (list.length > MAX_ELEMENTS) {
    const byKey = new Map<string, { key: string; s: Stroke; d: string[] }>();
    for (const g of groups) {
      const m = byKey.get(g.key);
      if (m) m.d.push(...g.d);
      else byKey.set(g.key, { ...g, d: [...g.d] });
    }
    list = [...byKey.values()];
  }
  const body = list
    .map(({ s, d }) =>
      s.kind === 'fill'
        ? `<path d="${d.join('')}" fill="${paintOf(s.ink)}" stroke="{{outline}}" stroke-width="3" stroke-linejoin="round"/>`
        : `<path d="${d.join('')}" fill="none" stroke="${paintOf(s.ink)}" stroke-width="${r(s.width)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');
  // An invisible frame round everything you can see (thick lines included), so the drawing's measured size matches
  // its look; it also carries {{main}}, which the validator wants even when the first pot wasn't used.
  [minX, minY, maxX, maxY] = [Math.max(0, r(minX)), Math.max(0, r(minY)), Math.min(256, r(maxX)), Math.min(256, r(maxY))];
  const frame = minX <= maxX ? `<rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" fill="{{main}}" opacity="0"/>` : '';
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${frame}${body}</svg>`, box: { minX, minY, maxX, maxY } };
}

/**
 * Make a template from strokes. Returns null for an empty drawing. `height` is the wanted world height (clamped to
 * the category's limits); the template's width follows the drawing's shape.
 */
export function drawingToTemplate(strokes: Stroke[], o: { id: string; name: string; category: string; height: number }): Template | null {
  const kept = strokes.filter((s) => s.points.length > 0).slice(-MAX_STROKES);
  const box = drawingBox(kept);
  if (!box) return null;
  const bw = Math.max(1, box.maxX - box.minX), bh = Math.max(1, box.maxY - box.minY);
  const k = FIT / Math.max(bw, bh);
  // Lines thicken less than the drawing grows, so a small doodle blown up doesn't turn into sausages.
  const wk = Math.min(k, Math.sqrt(k) * 1.4);
  const ox = 128 - ((box.minX + box.maxX) / 2) * k, oy = FLOOR - box.maxY * k;
  let fitted: Stroke[] = kept.map((s) => ({
    ...s,
    width: Math.max(2, Math.min(40, s.width * wk)),
    points: s.points.map(([x, y]) => [x * k + ox, y * k + oy] as Pt),
  }));
  // Thick lines were thinned above, so a drawing that is mostly line (a dot, a squiggle) can come out small: grow
  // the whole thing, lines included, until what you see fills the canvas.
  const seen = svgFor(fitted, 0.6).box;
  const grow = FIT / Math.max(1, seen.maxX - seen.minX, seen.maxY - seen.minY);
  const g = grow > 1.05 ? grow : 1, scx = (seen.minX + seen.maxX) / 2;
  fitted = fitted.map((s) => ({ ...s, width: Math.min(FIT, s.width * g), points: s.points.map(([x, y]) => [128 + (x - scx) * g, FLOOR + (y - seen.maxY) * g] as Pt) }));
  // Simplify harder until it fits the size limit; a really busy scribble then loses every other point, and at the
  // very last its oldest strokes.
  let tol = 0.6;
  let out = svgFor(fitted, tol);
  while (out.svg.length > MAX_SVG_BYTES && tol < 24) {
    tol *= 1.5;
    out = svgFor(fitted, tol);
  }
  while (out.svg.length > MAX_SVG_BYTES && fitted.some((s) => s.points.length > 3)) {
    fitted = fitted.map((s) => (s.points.length > 3 ? { ...s, points: s.points.filter((_, i) => i % 2 === 0 || i === s.points.length - 1) } : s));
    out = svgFor(fitted, tol);
  }
  while (out.svg.length > MAX_SVG_BYTES && fitted.length > 1) {
    fitted = fitted.slice(Math.ceil(fitted.length / 10));
    out = svgFor(fitted, tol);
  }
  const b = out.box;
  const cx = Math.round((b.minX + b.maxX) / 2);
  const h = heightFor(o.category, o.height);
  const bounds = SIZE_BOUNDS[o.category] ?? { min: 5, max: 100 };
  const w = Math.max(bounds.min / 4, Math.min(bounds.max * 2, Math.round(h * ((b.maxX - b.minX) / Math.max(1, b.maxY - b.minY)) * 10) / 10));
  const anchors: Template['anchors'] = { base: [cx, Math.round(b.maxY)] };
  if (HOLDABLE.has(o.category)) anchors.grip = [cx, Math.round((b.minY + b.maxY) / 2)];
  return { id: o.id, name: o.name, category: o.category, size: { w, h }, anchors, svg: out.svg };
}
