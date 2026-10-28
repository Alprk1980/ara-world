// A place is a side-view building with floors (swipe up/down). Items are placed on each floor.
// Houses use the same shape, with an exterior and a style.
import type { Item } from './item.ts';
import type { Template } from './template.ts';
import { isWearable } from './vocab.ts';

export const DISTRICTS = ['homes', 'downtown', 'shopping', 'fun', 'nature', 'travel', 'care', 'sky'] as const;
export const WALL_HEIGHT = 160;
export const OUTDOOR_HEIGHT = 400;

export type Placed = { item: string; x: number; y?: number };
export type HiddenSpot = { x: number; y: number; reveal: { item?: string; place?: string } };
export type Floor = { name: string; outdoor?: boolean; wall: string; ground: string; width: number; items: Placed[]; hidden?: HiddenSpot[] };
export type Place = {
  id: string;
  name: string;
  emoji: string;
  district: string;
  /** Hidden places are not on the map until found through a hidden spot. */
  hidden?: boolean;
  floors: Floor[];
};

const HEX = /^#[0-9a-f]{6}$/i;

type Ctx = { items: ReadonlyMap<string, Item>; templates: ReadonlyMap<string, Template>; placeIds: ReadonlySet<string> };

/** Floor problems shared by places and houses. */
export function floorErrors(f: Floor, where: string, ctx: Ctx): string[] {
  const out: string[] = [];
  const err = (m: string) => out.push(`${where}: ${m}`);
  if (typeof f?.name !== 'string' || f.name.length < 2 || f.name.length > 24) err('name: 2-24 characters');
  if (!HEX.test(f?.wall ?? '') || !HEX.test(f?.ground ?? '')) err('wall and ground: #rrggbb colours');
  if (!Number.isFinite(f?.width) || f.width < 240 || f.width > 1200) err('width: 240-1200 units');
  const H = f?.outdoor ? OUTDOOR_HEIGHT : WALL_HEIGHT;
  if (!Array.isArray(f?.items) || f.items.length < 4) {
    err('items: at least 4 placed items so it is fun to explore');
    return out;
  }
  const spans: { id: string; a: number; b: number }[] = [];
  for (const p of f.items) {
    const it = ctx.items.get(p?.item);
    const t = it ? ctx.templates.get(it.template) : undefined;
    if (!it || !t) {
      err(`item "${p?.item}" does not exist`);
      continue;
    }
    if (isWearable(t.category)) {
      err(`"${p.item}" is clothing; clothes go on people, not on the floor (put a rack or shelf instead)`);
      continue;
    }
    const w = t.size?.w ?? 20, h = t.size?.h ?? 20, y = p.y ?? 0;
    if (!Number.isFinite(p.x) || p.x - w / 2 < 0 || p.x + w / 2 > f.width) err(`"${p.item}" at x=${p.x} (w ${w}) must fit inside 0-${f.width}`);
    if (!Number.isFinite(y) || y < 0 || y + h > H) err(`"${p.item}" at y=${y} (h ${h}) must fit inside 0-${H}`);
    if (y === 0 && t.category !== 'animal') spans.push({ id: p.item, a: p.x - w / 2, b: p.x + w / 2 });
  }
  // Floor-standing things may touch but not stack inside each other.
  spans.sort((s, t) => s.a - t.a);
  for (let i = 1; i < spans.length; i++) {
    const prev = spans[i - 1], cur = spans[i];
    const overlap = prev.b - cur.a;
    if (overlap > Math.min(prev.b - prev.a, cur.b - cur.a) * 0.4)
      err(`"${prev.id}" and "${cur.id}" overlap on the floor; space them out or put the small one on top (give it a y)`);
  }
  for (const s of f.hidden ?? []) {
    if (!Number.isFinite(s?.x) || s.x < 0 || s.x > f.width || !Number.isFinite(s?.y) || s.y < 0 || s.y > H) err('hidden spot x/y must be inside the floor');
    if (s?.reveal?.item !== undefined && !ctx.items.has(s.reveal.item)) err(`hidden spot reveals unknown item "${s.reveal.item}"`);
    if (s?.reveal?.place !== undefined && !ctx.placeIds.has(s.reveal.place)) err(`hidden spot leads to unknown place "${s.reveal.place}"`);
    if (s?.reveal?.item === undefined && s?.reveal?.place === undefined) err('hidden spot must reveal an item or a place');
  }
  return out;
}

export function placeErrors(p: Place, all: readonly Place[], ctx: Omit<Ctx, 'placeIds'>): string[] {
  const id = typeof p?.id === 'string' ? p.id : '?';
  const out: string[] = [];
  const err = (m: string) => out.push(`${id}: ${m}`);
  if (typeof p?.id !== 'string' || !/^[a-z][a-z0-9_]{1,39}$/.test(p.id)) err('id: snake_case, 2-40 chars');
  else if (all.some((o) => o !== p && o.id === p.id)) err('id already exists, pick another');
  if (typeof p?.name !== 'string' || p.name.length < 2 || p.name.length > 28) err('name: 2-28 characters');
  if (typeof p?.emoji !== 'string' || [...p.emoji].length < 1 || [...p.emoji].length > 3 || /[a-z0-9]/i.test(p.emoji)) err('emoji: one emoji');
  if (!(DISTRICTS as readonly string[]).includes(p?.district)) err(`district: one of ${DISTRICTS.join(', ')}`);
  // A public home may be as grand as the blueprint the hammer builds (schemas/house.ts): a mansion carries six floors.
  const maxFloors = p?.district === 'homes' ? 6 : 4;
  if (!Array.isArray(p?.floors) || p.floors.length < 1 || p.floors.length > maxFloors) {
    err(`floors: 1-${maxFloors} floors`);
    return out;
  }
  const placeIds = new Set(all.map((o) => o.id));
  p.floors.forEach((f, i) => out.push(...floorErrors(f, `${id} floor ${i + 1}`, { ...ctx, placeIds })));
  return out;
}
