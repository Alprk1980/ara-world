// Stocked shelves: shelf units added to a place's floor, with things standing on their levels. Kept apart from the
// place layouts so worlds saved before a floor was stocked still get its shelves (src/world/state.ts).
import type { Item } from './item.ts';
import type { Place, Placed } from './place.ts';
import { floorErrors } from './place.ts';
import type { Template } from './template.ts';
import { checkSvg } from './svg.ts';
import { SHELF_ANCHORS } from './vocab.ts';

/** id is "<placeId>:<floor index>". */
export type ShelfStock = { id: string; items: Placed[] };

type Ctx = { items: ReadonlyMap<string, Item>; templates: ReadonlyMap<string, Template>; places: ReadonlyMap<string, Place> };

/** Heights above its base of a template's surfaces (shelf levels, then the top), in world units. */
export function surfaceLevels(t: Template): number[] {
  const box = checkSvg(t.svg).box;
  if (!box || !t.size) return [];
  const u = t.size.h / Math.max(1, box.maxY - box.minY);
  const base = t.anchors?.base?.[1] ?? box.maxY;
  return [...SHELF_ANCHORS, 'top'].flatMap((k) => (t.anchors?.[k] ? [(base - t.anchors[k][1]) * u] : []));
}

const SNAP = 1.5;

export function shelfStockErrors(s: ShelfStock, all: readonly ShelfStock[], ctx: Ctx): string[] {
  const out: string[] = [];
  const err = (m: string) => out.push(`${s?.id}: ${m}`);
  const [placeId, fi] = String(s?.id).split(':');
  const floor = ctx.places.get(placeId)?.floors[Number(fi)];
  if (!floor) return [`${s?.id}: no such place floor (id is "<placeId>:<floor index>")`];
  if (all.some((o) => o !== s && o.id === s.id)) err('a floor is stocked once');
  if (!Array.isArray(s.items) || !s.items.length) return [...out, `${s.id}: items: at least one shelf`];
  const tpl = (p: Placed) => ctx.templates.get(ctx.items.get(p.item)?.template ?? '');
  // The whole floor, data layout plus stock, must still be a good floor.
  out.push(...floorErrors({ ...floor, items: [...floor.items, ...s.items] }, s.id, { ...ctx, placeIds: new Set(ctx.places.keys()) }));
  const shelves = s.items.filter((p) => { const t = tpl(p); return t && surfaceLevels(t).length > 0; });
  // Stock stands on shelves added here or on shelf units the floor already has.
  const standOn = [...shelves, ...floor.items.filter((p) => !!tpl(p)?.anchors?.shelf1)];
  if (!standOn.length) err('no shelf (a thing with a top or shelf levels) among the items or on the floor');
  for (const p of s.items) {
    const t = tpl(p);
    if (!t || shelves.includes(p)) continue;
    // Stock stands on a level of one of these shelves, inside its width.
    const y = p.y ?? 0;
    const on = standOn.find((sh) => Math.abs(p.x - sh.x) <= (tpl(sh)!.size!.w - (t.size?.w ?? 0)) / 2 + 0.5 && surfaceLevels(tpl(sh)!).some((h) => Math.abs((sh.y ?? 0) + h - y) < SNAP));
    if (!on) err(`"${p.item}" at x=${p.x} y=${y} is not standing on a shelf level`);
  }
  // A hung shelf must be a wall thing; it may not cover anything already on the floor's wall or standing tall.
  for (const sh of shelves) {
    const t = tpl(sh)!, y = sh.y ?? 0;
    if (y > 0 && !ctx.items.get(sh.item)!.tags.includes('wall')) err(`"${sh.item}" hangs at y=${y} but is not a wall thing`);
    for (const o of floor.items) {
      const ot = tpl(o);
      if (!ot?.size) continue;
      const oy = o.y ?? 0;
      const xs = Math.min(sh.x + t.size!.w / 2, o.x + ot.size.w / 2) - Math.max(sh.x - t.size!.w / 2, o.x - ot.size.w / 2);
      const ys = Math.min(y + t.size!.h, oy + ot.size.h) - Math.max(y, oy);
      if (xs > 2 && ys > 2 && (y > 0 || oy > 0)) err(`"${sh.item}" covers "${o.item}"`);
    }
  }
  return out;
}
