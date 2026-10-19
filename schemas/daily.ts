// "In post box place every day you get a gift" and "every day a new thing adds to the house decorations".
import type { Item } from './item.ts';
import type { Template } from './template.ts';
import { isWearable } from './vocab.ts';

export type Daily = { id: string; month: number; day: number; gift: string; decor: string };

const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DECOR_CATS = new Set(['decor', 'furniture', 'garden', 'halloween', 'plant', 'toy']);
const REPEAT_GAP = 30;

export const dailyId = (month: number, day: number) => `d${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
const dayOfYear = (m: number, d: number) => DAYS_IN.slice(0, m - 1).reduce((a, b) => a + b, 0) + d;

export function dailyErrors(e: Daily, all: readonly Daily[], ctx: { items: ReadonlyMap<string, Item>; templates: ReadonlyMap<string, Template> }): string[] {
  const id = typeof e?.id === 'string' ? e.id : '?';
  const out: string[] = [];
  const err = (m: string) => out.push(`${id}: ${m}`);
  if (!Number.isInteger(e?.month) || e.month < 1 || e.month > 12 || !Number.isInteger(e?.day) || e.day < 1 || e.day > DAYS_IN[e.month - 1]) {
    err('month 1-12 and a real day of that month');
    return out;
  }
  if (e.id !== dailyId(e.month, e.day)) err(`id must be "${dailyId(e.month, e.day)}"`);
  const gift = ctx.items.get(e.gift);
  const decor = ctx.items.get(e.decor);
  if (!gift) err(`gift "${e.gift}" is not an item`);
  if (!decor) err(`decor "${e.decor}" is not an item`);
  else {
    const cat = ctx.templates.get(decor.template)?.category ?? '';
    if (!DECOR_CATS.has(cat) || isWearable(cat)) err(`decor "${e.decor}" is a ${cat}; decor must be a house thing (${[...DECOR_CATS].join(', ')})`);
  }
  if (gift && decor && e.gift === e.decor) err('gift and decor must be different items');
  const isOct = e.month === 10;
  if (decor && isOct && e.day >= 15 && !decor.tags.includes('halloween')) err('late October decor must be a halloween item');
  if (decor && !isOct && decor.tags.includes('halloween')) err('halloween decor only in October');
  if (decor && e.month !== 12 && decor.tags.includes('christmas')) err('christmas decor only in December');
  const me = dayOfYear(e.month, e.day);
  for (const o of all) {
    if (o === e || !Number.isInteger(o.month) || !Number.isInteger(o.day)) continue;
    if (o.id === e.id) err('id already exists');
    const gap = Math.abs(dayOfYear(o.month, o.day) - me);
    if (gap > 0 && gap < REPEAT_GAP) {
      if (o.gift === e.gift) err(`gift "${e.gift}" repeats within ${REPEAT_GAP} days (also ${o.id})`);
      if (o.decor === e.decor) err(`decor "${e.decor}" repeats within ${REPEAT_GAP} days (also ${o.id})`);
    }
  }
  return out;
}
