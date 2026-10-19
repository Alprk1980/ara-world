// The place plan: every place the notes ask for, with the things it needs drawn. It drives the other generators:
// templates are made for `things`, items are tagged for `tags`, and each place's floors are laid out from it.
import { DISTRICTS } from './place.ts';
import { ITEM_TAGS } from './item.ts';

export type PlanEntry = {
  id: string;
  name: string;
  emoji: string;
  district: string;
  hidden?: boolean;
  /** Item tags whose items belong here (from ITEM_TAGS). */
  tags: string[];
  /** Floor names, bottom to top (swipe up/down). Outdoor areas are marked with "(outdoor)". */
  floors: string[];
  /** Things to draw for this place: short names like "espresso machine". */
  things: string[];
  /** The note it comes from, quoted. */
  note: string;
};

export function planErrors(p: PlanEntry, all: readonly PlanEntry[]): string[] {
  const id = typeof p?.id === 'string' ? p.id : '?';
  const out: string[] = [];
  const err = (m: string) => out.push(`${id}: ${m}`);
  if (typeof p?.id !== 'string' || !/^[a-z][a-z0-9_]{1,39}$/.test(p.id)) err('id: snake_case');
  else if (all.some((o) => o !== p && o.id === p.id)) err('id already exists');
  if (typeof p?.name !== 'string' || p.name.length < 2 || p.name.length > 28) err('name: 2-28 characters');
  if (typeof p?.emoji !== 'string' || [...p.emoji].length > 3 || /[a-z0-9]/i.test(p.emoji)) err('emoji: one emoji');
  if (!(DISTRICTS as readonly string[]).includes(p?.district)) err(`district: one of ${DISTRICTS.join(', ')}`);
  if (!Array.isArray(p?.tags) || p.tags.length < 1 || p.tags.length > 6) err('tags: 1-6');
  else for (const t of p.tags) if (!(ITEM_TAGS as readonly string[]).includes(t)) err(`tag "${t}" is not in the list`);
  if (!Array.isArray(p?.floors) || p.floors.length < 1 || p.floors.length > 4) err('floors: 1-4 names');
  else for (const f of p.floors) if (typeof f !== 'string' || f.length < 2 || f.length > 34) err('floor names: 2-34 characters');
  if (!Array.isArray(p?.things) || p.things.length < 8 || p.things.length > 24) err('things: 8-24 short names');
  else for (const t of p.things) if (typeof t !== 'string' || t.length < 3 || t.length > 32) err(`thing "${t}": 3-32 characters`);
  if (typeof p?.note !== 'string' || p.note.length < 3) err('note: quote the line of the notes it comes from');
  return out;
}
