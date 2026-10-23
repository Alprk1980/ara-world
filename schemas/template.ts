// A template is one drawable shape with colour slots. Recipes (items) paint it.
import { checkSvg } from './svg.ts';
import { OPTIONAL_ANCHORS, REQUIRED_ANCHORS, SHELF_ANCHORS, SIZE_BOUNDS, TEMPLATE_CATEGORIES, isWearable } from './vocab.ts';

export type Point = [number, number];
export type Template = {
  id: string;
  name: string;
  category: string;
  /** World size; adult = 100 tall. Objects only (wearables fill their body slot). */
  size?: { w: number; h: number };
  anchors?: Record<string, Point>;
  svg: string;
};

/** How much of its slot frame a wearable must cover, so it reads at body size. */
const WEARABLE_MIN_COVER = 0.5;
/** How much of the canvas an object's longest side must cover. */
const OBJECT_MIN_FILL = 0.6;
/** Canvas units between shelf levels, so things fit between them. */
const SHELF_GAP = 40;

const isPoint = (p: unknown): p is Point =>
  Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === 'number' && v >= 0 && v <= 256);

export function templateErrors(t: Template, all: readonly Template[] = []): string[] {
  const id = typeof t?.id === 'string' ? t.id : '?';
  const out: string[] = [];
  const err = (m: string) => out.push(`${id}: ${m}`);
  if (typeof t?.id !== 'string' || !/^[a-z][a-z0-9_]{1,39}$/.test(t.id)) err('id: snake_case, 2-40 chars, starts with a letter');
  else if (all.some((o) => o !== t && o.id === t.id)) err('id already exists, pick another');
  if (typeof t?.name !== 'string' || t.name.length < 2 || t.name.length > 30) err('name: 2-30 characters');
  if (!(TEMPLATE_CATEGORIES as readonly string[]).includes(t?.category)) {
    err(`category must be one of ${TEMPLATE_CATEGORIES.join(', ')}`);
    return out;
  }
  const wearable = isWearable(t.category);
  const svg = checkSvg(t.svg);
  out.push(...svg.errors.map((e) => `${id}: ${e}`));

  if (wearable) {
    if (t.size !== undefined) err('wearables have no size (they fill their body slot frame)');
    if (t.anchors !== undefined && Object.keys(t.anchors).length) err('wearables have no anchors');
    if (svg.box) {
      const w = (svg.box.maxX - svg.box.minX) / 256;
      const h = (svg.box.maxY - svg.box.minY) / 256;
      if (w < WEARABLE_MIN_COVER || h < WEARABLE_MIN_COVER)
        err(`a ${t.category} must fill its slot frame: covers ${Math.round(w * 100)}% wide x ${Math.round(h * 100)}% tall, needs at least ${WEARABLE_MIN_COVER * 100}% each`);
    }
    return out;
  }

  const bounds = SIZE_BOUNDS[t.category];
  const s = t.size;
  if (typeof s?.w !== 'number' || typeof s?.h !== 'number') err('size: {"w": number, "h": number} in world units (adult = 100 tall)');
  else if (s.h < bounds.min || s.h > bounds.max || s.w < bounds.min / 4 || s.w > bounds.max * 2)
    err(`size h ${s.h} out of range for ${t.category} (h ${bounds.min}-${bounds.max})`);

  const anchors = t.anchors ?? {};
  for (const name of REQUIRED_ANCHORS[t.category] ?? []) if (!(name in anchors)) err(`anchors.${name} is required for ${t.category}`);
  for (const [name, p] of Object.entries(anchors)) {
    if (!(REQUIRED_ANCHORS[t.category] ?? []).includes(name) && !(OPTIONAL_ANCHORS as readonly string[]).includes(name))
      err(`anchors.${name} is not a known anchor`);
    else if (!isPoint(p)) err(`anchors.${name} must be [x, y] inside 0-256`);
    else if (svg.box && (p[0] < svg.box.minX - 6 || p[0] > svg.box.maxX + 6 || p[1] < svg.box.minY - 6 || p[1] > svg.box.maxY + 6))
      err(`anchors.${name} [${p}] is outside the drawing (box ${Math.round(svg.box.minX)},${Math.round(svg.box.minY)} to ${Math.round(svg.box.maxX)},${Math.round(svg.box.maxY)})`);
  }
  // Shelf levels go bottom to top under the top shelf, with room above each for things to stand.
  const levels = SHELF_ANCHORS.filter((k) => isPoint(anchors[k]));
  if (levels.length) {
    if (!isPoint(anchors.top)) err('a shelf unit with shelf1-3 needs a "top" anchor (its highest shelf)');
    if (levels.some((k, i) => k !== SHELF_ANCHORS[i])) err('shelf anchors are numbered from shelf1 up, with no gaps');
    const ys = [...levels.map((k) => anchors[k][1]), ...(isPoint(anchors.top) ? [anchors.top[1]] : [])];
    for (let i = 1; i < ys.length; i++)
      if (ys[i - 1] - ys[i] < SHELF_GAP) err(`shelf levels need ${SHELF_GAP} canvas units between them (bottom to top: y ${ys.join(', ')})`);
    if (isPoint(anchors.base) && anchors.base[1] - ys[0] < 8) err('shelf1 must be above the base');
  }
  if (svg.box && isPoint(anchors.base) && anchors.base[1] < svg.box.maxY - 12)
    err(`anchors.base must sit at the bottom of the drawing (y near ${Math.round(svg.box.maxY)})`);
  if (svg.box) {
    const fill = Math.max(svg.box.maxX - svg.box.minX, svg.box.maxY - svg.box.minY) / 256;
    if (fill < OBJECT_MIN_FILL) err(`drawing is too small: longest side fills ${Math.round(fill * 100)}% of the canvas, needs ${OBJECT_MIN_FILL * 100}%`);
  }
  return out;
}
