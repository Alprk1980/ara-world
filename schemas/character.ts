// Starter townsfolk. The creator makes more at play time with the same shape.
import type { Item } from './item.ts';
import type { Template } from './template.ts';
import { AGE_GROUPS } from './vocab.ts';

export const SKIN_TONES = ['#ffe3d3', '#f9cfb4', '#efb995', '#d99a73', '#b87650', '#8d5535', '#6a3d24', '#4a2a19'] as const;
export const OUTFIT_SLOTS = ['top', 'bottom', 'dress', 'socks', 'shoes', 'hat', 'glasses', 'bag'] as const;

export type Character = {
  id: string;
  name: string;
  age: string;
  skin: string;
  hair: { template: string; colour: string };
  eyes: string;
  outfit: Partial<Record<(typeof OUTFIT_SLOTS)[number], string>>;
  home?: string;
};

const HEX = /^#[0-9a-f]{6}$/i;

export function characterErrors(c: Character, all: readonly Character[], ctx: { items: ReadonlyMap<string, Item>; templates: ReadonlyMap<string, Template>; placeIds: ReadonlySet<string> }): string[] {
  const id = typeof c?.id === 'string' ? c.id : '?';
  const out: string[] = [];
  const err = (m: string) => out.push(`${id}: ${m}`);
  if (typeof c?.id !== 'string' || !/^[a-z][a-z0-9_]{1,31}$/.test(c.id)) err('id: snake_case');
  else if (all.some((o) => o !== c && o.id === c.id)) err('id already exists');
  if (typeof c?.name !== 'string' || c.name.length < 2 || c.name.length > 12) err('name: 2-12 characters');
  if (!(AGE_GROUPS as readonly string[]).includes(c?.age)) err(`age: one of ${AGE_GROUPS.join(', ')}`);
  if (!(SKIN_TONES as readonly string[]).includes(c?.skin)) err(`skin: one of ${SKIN_TONES.join(', ')}`);
  if (!HEX.test(c?.eyes ?? '')) err('eyes: #rrggbb');
  const hair = ctx.templates.get(c?.hair?.template);
  if (!hair || hair.category !== 'hair') err(`hair.template "${c?.hair?.template}" is not a hair template`);
  if (!HEX.test(c?.hair?.colour ?? '')) err('hair.colour: #rrggbb');
  const outfit = c?.outfit ?? {};
  for (const [slot, itemId] of Object.entries(outfit)) {
    const it = ctx.items.get(itemId as string);
    const cat = it ? ctx.templates.get(it.template)?.category : undefined;
    if (!(OUTFIT_SLOTS as readonly string[]).includes(slot)) err(`outfit.${slot} is not a slot`);
    else if (!it) err(`outfit.${slot}: item "${itemId}" does not exist`);
    else if (cat !== slot) err(`outfit.${slot}: "${itemId}" is a ${cat}, not a ${slot}`);
    else if (it.ages && !it.ages.includes(c.age)) err(`outfit.${slot}: "${itemId}" is not for a ${c.age}`);
  }
  if (outfit.dress && (outfit.top || outfit.bottom)) err('outfit: a dress replaces top and bottom; use one or the other');
  if (!outfit.dress && !(outfit.top && outfit.bottom)) err('outfit: needs a dress, or a top and a bottom');
  if (c?.home !== undefined && !ctx.placeIds.has(c.home)) err(`home "${c.home}" is not a place`);
  return out;
}
