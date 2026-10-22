// A house blueprint: the hammer builds one on a lot. "Thousands of houses" = blueprints x colourways.
// Floors have the same shape as a place's; `furnished` floors are what you get if you choose a furnished house.
import { floorErrors, type Floor } from './place.ts';
import type { Item } from './item.ts';
import type { Template } from './template.ts';

export const HOUSE_STYLES = ['cottage', 'modern', 'mansion', 'beach', 'cabin', 'castle', 'apartment', 'farmhouse', 'treehouse', 'spooky_cute', 'townhouse'] as const;
export const ROOF_SHAPES = ['gable', 'flat', 'dome', 'tower', 'hip', 'thatch'] as const;
export const ROOM_TYPES = ['kitchen', 'living', 'bedroom', 'bathroom', 'nursery', 'kids_room', 'teen_room', 'garden', 'playroom', 'pool', 'garage', 'game_room', 'balcony'] as const;

export type House = {
  id: string;
  name: string;
  style: string;
  roof: string;
  /** Default exterior colours; colourways repaint these. */
  exterior: { walls: string; roof: string; door: string; trim: string };
  /** Each floor lists its rooms (left to right) and the furniture for the furnished version. */
  floors: (Floor & { rooms: { type: string; width: number }[] })[];
};

const HEX = /^#[0-9a-f]{6}$/i;

export function houseErrors(h: House, all: readonly House[], ctx: { items: ReadonlyMap<string, Item>; templates: ReadonlyMap<string, Template> }): string[] {
  const id = typeof h?.id === 'string' ? h.id : '?';
  const out: string[] = [];
  const err = (m: string) => out.push(`${id}: ${m}`);
  if (typeof h?.id !== 'string' || !/^[a-z][a-z0-9_]{1,39}$/.test(h.id)) err('id: snake_case');
  else if (all.some((o) => o !== h && o.id === h.id)) err('id already exists');
  if (typeof h?.name !== 'string' || h.name.length < 2 || h.name.length > 28) err('name: 2-28 characters');
  if (!(HOUSE_STYLES as readonly string[]).includes(h?.style)) err(`style: one of ${HOUSE_STYLES.join(', ')}`);
  if (!(ROOF_SHAPES as readonly string[]).includes(h?.roof)) err(`roof: one of ${ROOF_SHAPES.join(', ')}`);
  for (const k of ['walls', 'roof', 'door', 'trim'] as const) if (!HEX.test(h?.exterior?.[k] ?? '')) err(`exterior.${k}: #rrggbb`);
  // A townhouse is tall and thin: up to six floors and a garden (Ara's six-floor house).
  const maxFloors = h?.style === 'townhouse' ? 7 : h?.style === 'mansion' || h?.style === 'castle' ? 6 : 3;
  if (!Array.isArray(h?.floors) || h.floors.length < 1 || h.floors.length > maxFloors) {
    err(`floors: 1-${maxFloors} for a ${h?.style}`);
    return out;
  }
  if (h.style === 'mansion' && h.floors.filter((f) => !f.outdoor).length < 2) err('a mansion has at least 2 indoor floors');
  h.floors.forEach((f, i) => {
    const where = `${id} floor ${i + 1}`;
    out.push(...floorErrors(f, where, { ...ctx, placeIds: new Set() }));
    if (!Array.isArray(f?.rooms) || f.rooms.length < 1) {
      out.push(`${where}: rooms: at least one room`);
      return;
    }
    let total = 0;
    for (const r of f.rooms) {
      if (!(ROOM_TYPES as readonly string[]).includes(r?.type)) out.push(`${where}: room type "${r?.type}" not in ${ROOM_TYPES.join(', ')}`);
      if (!Number.isFinite(r?.width) || r.width < 100) out.push(`${where}: room width at least 100`);
      total += r?.width ?? 0;
    }
    if (Number.isFinite(f.width) && Math.abs(total - f.width) > 1) out.push(`${where}: room widths add to ${total} but the floor is ${f.width} wide`);
    if (f.outdoor && f.rooms.some((r) => r.type !== 'garden' && r.type !== 'pool')) out.push(`${where}: an outdoor floor only has garden or pool rooms`);
  });
  const indoor = h.floors.filter((f) => !f.outdoor).flatMap((f) => f.rooms?.map((r) => r.type) ?? []);
  for (const need of ['kitchen', 'bedroom', 'bathroom']) if (!indoor.includes(need)) err(`needs a ${need}`);
  return out;
}
