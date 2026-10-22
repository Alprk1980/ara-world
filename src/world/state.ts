// The saved world: who is where, what has been moved, built, found and claimed.
import type { Character } from '../../schemas/character.ts';
import type { Item } from '../../schemas/item.ts';
import type { Template } from '../../schemas/template.ts';
import type { Floor, Placed } from '../../schemas/place.ts';
import { characters, houses, items, places, templates } from '../data/index.ts';
import { load, save } from '../app/save.ts';

export const WEATHERS = ['sunny', 'rain', 'snow', 'wind', 'rainbow', 'cloudy'] as const;
export type Weather = (typeof WEATHERS)[number];

export type Person = Character & { kind: 'person'; at?: { place: string; floor: number; x: number; y: number; /** the ride they sit on (a thing's uid) */ on?: string }; holding?: string; bitesLeft?: number; makeup?: Makeup };
/** Makeup on a face: colours for lips, cheeks and eyelids, and glitter. */
export type Makeup = { lips?: string; blush?: string; eyes?: string; glitter?: boolean };
export type Pet = { kind: 'pet'; id: string; name: string; item: string; at?: { place: string; floor: number; x: number; y: number } };
export type Thing = Placed & { uid: string; y: number; bitesLeft?: number; /** Switched on (lamps, TVs). */ on?: boolean; /** Opened (fridges, boxes, gates). */ open?: boolean };
export type Lot = { house: string; variant: number; furnished: boolean };

export type World = {
  version: 1;
  people: Person[];
  pets: Pet[];
  /** Live item layout per floor, keyed "<placeId>:<floorIndex>"; starts from the data's layout. */
  layouts: Record<string, Thing[]>;
  /** Built houses, keyed by lot id ("lot_1".."lot_N"). */
  lots: Record<string, Lot>;
  found: string[];
  /** Daily ids claimed this year, e.g. "2026-d1018". */
  claimed: string[];
  /** Decorations from the daily calendar waiting in the post box to be placed. */
  inbox: string[];
  sky: { night: boolean; weather: Weather };
  /** Clothes made in the creator, and the items made from drawings. */
  custom: Item[];
  /** Templates drawn in the 🖍️ draw pad. */
  drawings: Template[];
};

const KEY = 'world';
export const LOT_COUNT = 12;
let uidCounter = 0;
export const uid = (p = 't') => `${p}${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export function freshWorld(): World {
  return {
    version: 1,
    people: [...characters.values()].map((c) => ({ ...structuredClone(c), kind: 'person' as const })),
    pets: [],
    layouts: {},
    lots: {},
    found: [],
    claimed: [],
    inbox: [],
    sky: { night: false, weather: 'sunny' },
    custom: [],
    drawings: [],
  };
}

export async function loadWorld(): Promise<World> {
  const w = await load<World | null>(KEY, null);
  if (!w || w.version !== 1) return freshWorld();
  w.custom ??= [];
  w.drawings ??= [];
  for (const t of w.drawings) templates.set(t.id, t);
  for (const it of w.custom) items.set(it.id, it);
  // Starter characters added by later content updates join the people bar.
  for (const c of characters.values()) if (!w.people.some((p) => p.id === c.id)) w.people.push({ ...structuredClone(c), kind: 'person' });
  return w;
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Save soon (debounced), so every drag doesn't hit the disk. */
export function persist(w: World): void {
  clearTimeout(timer);
  timer = setTimeout(() => save(KEY, w), 400);
}

/** Throw the saved world away and save a fresh one (any save still waiting is cancelled first). */
export async function resetWorld(): Promise<World> {
  clearTimeout(timer);
  const w = freshWorld();
  await save(KEY, w);
  return w;
}

/** The floors of a place id, which may be a built house on a lot. */
export function floorsOf(w: World, placeId: string, furnishedOverride?: boolean): Floor[] {
  const lot = w.lots[placeId];
  if (lot) {
    const h = houses.get(lot.house);
    if (!h) return [];
    const furnished = furnishedOverride ?? lot.furnished;
    return h.floors.map((f) => ({ ...f, items: furnished ? f.items : [] }));
  }
  return places.get(placeId)?.floors ?? [];
}

/** The live things on a floor, created from the data layout the first time it is visited. */
export function thingsOn(w: World, placeId: string, floor: number): Thing[] {
  const k = `${placeId}:${floor}`;
  if (!w.layouts[k]) {
    const f = floorsOf(w, placeId)[floor];
    w.layouts[k] = (f?.items ?? []).map((p) => ({ ...p, y: p.y ?? 0, uid: uid() }));
  }
  return w.layouts[k];
}
