// An item is a recipe: a template painted in a colourway, with tags that say where it belongs.
import type { Template } from './template.ts';
import { AGE_GROUPS, isWearable } from './vocab.ts';

export const ITEM_TAGS = [
  // rooms
  'kitchen', 'bedroom', 'bathroom', 'living', 'garden', 'nursery', 'kids_room', 'teen_room',
  // places
  'school', 'daycare', 'shop', 'mall', 'supermarket', 'cafe', 'restaurant', 'pub', 'sweets', 'toys', 'office',
  'hotel', 'airport', 'vip', 'hospital', 'fire_station', 'police', 'elder_home', 'salon', 'makeup', 'optician',
  'vet', 'pet_shop', 'stable', 'paint_shop', 'zoo', 'aquarium', 'farm', 'pool', 'waterpark', 'theme_park',
  'snow', 'beach', 'sport', 'football', 'post_office', 'clouds', 'station',
  // themes
  'halloween', 'christmas', 'birthday', 'party', 'pet', 'baby', 'elder', 'outdoor', 'wall', 'fancy', 'cosy',
] as const;

export type Hex = string;
export type Item = {
  id: string;
  name: string;
  template: string;
  palette: { main: Hex; trim: Hex; accent: Hex; outline: Hex };
  tags: string[];
  /** Wearables: who can wear it (default: everyone). */
  ages?: string[];
  /** Food and drink: how many bites/sips before it is gone. */
  bites?: number;
};

const HEX = /^#[0-9a-f]{6}$/i;

export function itemErrors(it: Item, all: readonly Item[], templates: ReadonlyMap<string, Template>): string[] {
  const id = typeof it?.id === 'string' ? it.id : '?';
  const out: string[] = [];
  const err = (m: string) => out.push(`${id}: ${m}`);
  if (typeof it?.id !== 'string' || !/^[a-z][a-z0-9_]{1,47}$/.test(it.id)) err('id: snake_case, 2-48 chars');
  else if (all.some((o) => o !== it && o.id === it.id)) err('id already exists, pick another');
  if (typeof it?.name !== 'string' || it.name.length < 2 || it.name.length > 30) err('name: 2-30 characters');
  const t = templates.get(it?.template);
  if (!t) {
    err(`template "${it?.template}" does not exist`);
    return out;
  }
  const p = it.palette;
  for (const slot of ['main', 'trim', 'accent', 'outline'] as const)
    if (typeof p?.[slot] !== 'string' || !HEX.test(p[slot])) err(`palette.${slot}: a #rrggbb colour`);
  if (p && HEX.test(p.main ?? '') && p.main.toLowerCase() === p.outline?.toLowerCase()) err('palette: outline must differ from main');
  if (!Array.isArray(it.tags) || it.tags.length === 0 || it.tags.length > 6) err('tags: 1-6 tags');
  else for (const tag of it.tags) if (!(ITEM_TAGS as readonly string[]).includes(tag)) err(`tag "${tag}" is not in the list`);
  const edible = t.category === 'food' || t.category === 'drink';
  if (edible && (!Number.isInteger(it.bites) || it.bites! < 1 || it.bites! > 6)) err('bites: whole number 1-6 for food and drink');
  if (!edible && it.bites !== undefined) err('bites: only for food and drink');
  if (it.ages !== undefined) {
    if (!isWearable(t.category)) err('ages: only for wearables');
    else if (!Array.isArray(it.ages) || it.ages.length === 0 || it.ages.some((a) => !(AGE_GROUPS as readonly string[]).includes(a)))
      err(`ages: list from ${AGE_GROUPS.join(', ')}`);
  }
  return out;
}
