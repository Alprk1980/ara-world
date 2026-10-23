// All generated content, indexed by id. Files are produced by tools/qwen-gen.ts and checked by `npm run check`.
import type { Template } from '../../schemas/template.ts';
import type { Item } from '../../schemas/item.ts';
import type { Place } from '../../schemas/place.ts';
import type { House } from '../../schemas/house.ts';
import type { Character } from '../../schemas/character.ts';
import type { Emotion } from '../../schemas/emotion.ts';
import type { Daily } from '../../schemas/daily.ts';
import templateList from './templates.json';
import itemList from './items.json';
import placeList from './places.json';
import houseList from './houses.json';
import characterList from './characters.json';
import emotionList from './emotions.json';
import dailyList from './daily.json';
import nameList from './names.json';
import stockList from './shelf-stock.json';
import type { ShelfStock } from '../../schemas/shelf-stock.ts';

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((e) => [e.id, e]));

export const templates = byId(templateList as Template[]);
export const items = byId(itemList as Item[]);
export const places = byId(placeList as Place[]);
export const houses = byId(houseList as House[]);
export const characters = byId(characterList as Character[]);
export const emotions = emotionList as Emotion[];
export const daily = byId(dailyList as Daily[]);
/** Shelves and their stock added to place floors, keyed "<placeId>:<floor>". */
export const shelfStock = byId(stockList as ShelfStock[]);

/** First names for new people and pets. */
export const names = (nameList as { id: string; name: string }[]).map((n) => n.name);

export const categoryOf = (itemId: string): string => templates.get(items.get(itemId)?.template ?? '')?.category ?? '';
