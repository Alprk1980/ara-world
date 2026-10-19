import { describe, expect, it } from 'vitest';
import type { Template } from './template.ts';
import { itemErrors, type Item } from './item.ts';
import { placeErrors, type Place } from './place.ts';
import { characterErrors, type Character } from './character.ts';
import { emotionErrors, type Emotion } from './emotion.ts';
import { dailyErrors, type Daily } from './daily.ts';

const svg = '<svg viewBox="0 0 256 256"><rect x="20" y="20" width="216" height="216" fill="{{main}}"/></svg>';
const T = (id: string, category: string, size?: { w: number; h: number }): Template => ({ id, name: id, category, size, svg, anchors: size ? { base: [128, 236] } : undefined });
const templates = new Map<string, Template>([
  ['cupcake', T('cupcake', 'food', { w: 8, h: 9 })],
  ['sofa', T('sofa', 'furniture', { w: 80, h: 40 })],
  ['pumpkin', T('pumpkin', 'halloween', { w: 20, h: 20 })],
  ['tshirt', T('tshirt', 'top')],
  ['jeans', T('jeans', 'bottom')],
  ['bob', T('bob', 'hair')],
]);
const pal = { main: '#ff8fb8', trim: '#ffd36e', accent: '#7fd1c7', outline: '#5a3d4f' };
const I = (id: string, template: string, extra: Partial<Item> = {}): Item => ({ id, name: id, template, palette: pal, tags: ['kitchen'], ...extra });
const itemList: Item[] = [
  I('pink_cupcake', 'cupcake', { bites: 3 }),
  I('pink_sofa', 'sofa'),
  I('happy_pumpkin', 'pumpkin', { tags: ['halloween'] }),
  I('red_tshirt', 'tshirt', { ages: ['kid', 'teen'] }),
  I('blue_jeans', 'jeans'),
];
const items = new Map(itemList.map((i) => [i.id, i]));

describe('itemErrors', () => {
  it('accepts good items', () => {
    for (const i of itemList) expect(itemErrors(i, itemList, templates)).toEqual([]);
  });
  it('checks template, tags, bites and ages', () => {
    expect(itemErrors(I('x', 'nope'), [], templates).join()).toMatch(/does not exist/);
    expect(itemErrors(I('x', 'sofa', { tags: ['moon'] }), [], templates).join()).toMatch(/tag "moon"/);
    expect(itemErrors(I('x', 'cupcake'), [], templates).join()).toMatch(/bites/);
    expect(itemErrors(I('x', 'sofa', { bites: 2 }), [], templates).join()).toMatch(/only for food/);
    expect(itemErrors(I('x', 'sofa', { ages: ['kid'] }), [], templates).join()).toMatch(/only for wearables/);
    expect(itemErrors(I('x', 'sofa', { palette: { ...pal, main: 'pink' } }), [], templates).join()).toMatch(/palette.main/);
  });
});

describe('placeErrors', () => {
  const floor = { name: 'Ground', wall: '#ffeeee', ground: '#ccaa88', width: 400, items: [
    { item: 'pink_sofa', x: 60 }, { item: 'pink_sofa', x: 160 }, { item: 'pink_cupcake', x: 160, y: 40 }, { item: 'happy_pumpkin', x: 300 },
  ] };
  const cafe: Place = { id: 'cafe', name: 'Cosy Cafe', emoji: '☕', district: 'downtown', floors: [floor] };
  it('accepts a good place', () => expect(placeErrors(cafe, [cafe], { items, templates })).toEqual([]));
  it('checks overlap, bounds, clothing and hidden spots', () => {
    const bad: Place = { ...cafe, floors: [{ ...floor, items: [...floor.items, { item: 'pink_sofa', x: 70 }, { item: 'pink_sofa', x: 390 }, { item: 'red_tshirt', x: 200 }], hidden: [{ x: 10, y: 10, reveal: { place: 'nowhere' } }] }] };
    const e = placeErrors(bad, [bad], { items, templates }).join('\n');
    expect(e).toMatch(/overlap on the floor/);
    expect(e).toMatch(/must fit inside 0-400/);
    expect(e).toMatch(/clothes go on people/);
    expect(e).toMatch(/unknown place "nowhere"/);
  });
  it('checks emoji and district', () => {
    expect(placeErrors({ ...cafe, emoji: 'cafe', district: 'moon' }, [], { items, templates }).join()).toMatch(/emoji.*district|district/);
  });
});

describe('characterErrors', () => {
  const ctx = { items, templates, placeIds: new Set(['cafe']) };
  const kid: Character = { id: 'mia', name: 'Mia', age: 'kid', skin: '#efb995', hair: { template: 'bob', colour: '#6b3e26' }, eyes: '#3a6ea5', outfit: { top: 'red_tshirt', bottom: 'blue_jeans' } };
  it('accepts a good character', () => expect(characterErrors(kid, [kid], ctx)).toEqual([]));
  it('checks outfit fit and age', () => {
    expect(characterErrors({ ...kid, age: 'baby' }, [], ctx).join()).toMatch(/not for a baby/);
    expect(characterErrors({ ...kid, outfit: { top: 'blue_jeans', bottom: 'blue_jeans' } }, [], ctx).join()).toMatch(/is a bottom, not a top/);
    expect(characterErrors({ ...kid, outfit: { top: 'red_tshirt' } }, [], ctx).join()).toMatch(/needs a dress, or a top and a bottom/);
    expect(characterErrors({ ...kid, skin: '#00ff00' }, [], ctx).join()).toMatch(/skin/);
  });
});

describe('emotionErrors', () => {
  const happy: Emotion = { id: 'happy', emoji: '😊', name: 'Happy', face: { eyes: 'happy', mouth: 'smile', brows: 0.3, blush: true, tears: false }, motion: 'bounce', sound: 'giggle', seconds: 3 };
  it('accepts a good emotion', () => expect(emotionErrors(happy, [happy])).toEqual([]));
  it('checks enums and duplicate emoji', () => {
    expect(emotionErrors({ ...happy, face: { ...happy.face, eyes: 'laser' } }, []).join()).toMatch(/face.eyes/);
    expect(emotionErrors({ ...happy, id: 'glad' }, [happy]).join()).toMatch(/already used/);
  });
});

describe('dailyErrors', () => {
  const ctx = { items, templates };
  const d = (month: number, day: number, gift: string, decor: string): Daily => ({ id: `d${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`, month, day, gift, decor });
  it('accepts a good day', () => expect(dailyErrors(d(3, 1, 'pink_cupcake', 'pink_sofa'), [], ctx)).toEqual([]));
  it('checks seasons, repeats and decor category', () => {
    expect(dailyErrors(d(10, 30, 'pink_cupcake', 'pink_sofa'), [], ctx).join()).toMatch(/halloween item/);
    expect(dailyErrors(d(5, 1, 'pink_cupcake', 'happy_pumpkin'), [], ctx).join()).toMatch(/only in October/);
    const a = d(3, 1, 'pink_cupcake', 'pink_sofa');
    expect(dailyErrors(d(3, 5, 'pink_cupcake', 'happy_pumpkin'), [a], ctx).join()).toMatch(/repeats within/);
    expect(dailyErrors(d(3, 1, 'pink_cupcake', 'red_tshirt'), [], ctx).join()).toMatch(/decor must be a house thing/);
    expect(dailyErrors(d(2, 30, 'pink_cupcake', 'pink_sofa'), [], ctx).join()).toMatch(/real day/);
  });
});
