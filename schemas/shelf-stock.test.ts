import { describe, expect, it } from 'vitest';
import type { Template } from './template.ts';
import type { Item } from './item.ts';
import type { Place } from './place.ts';
import { shelfStockErrors, surfaceLevels, type ShelfStock } from './shelf-stock.ts';

const svg = '<svg viewBox="0 0 256 256"><rect x="28" y="16" width="200" height="224" fill="{{main}}"/></svg>';
const templates = new Map<string, Template>([
  // 224 canvas units tall drawn as 112 world units: half a unit per canvas unit.
  ['unit', { id: 'unit', name: 'Unit', category: 'furniture', size: { w: 60, h: 112 }, svg, anchors: { base: [128, 240], shelf1: [128, 200], top: [128, 120] } }],
  ['plank', { id: 'plank', name: 'Plank', category: 'decor', size: { w: 40, h: 10 }, svg, anchors: { base: [128, 240], top: [128, 16] } }],
  ['cup', { id: 'cup', name: 'Cup', category: 'decor', size: { w: 8, h: 8 }, svg, anchors: { base: [128, 240] } }],
  ['sofa', { id: 'sofa', name: 'Sofa', category: 'furniture', size: { w: 80, h: 40 }, svg, anchors: { base: [128, 240] } }],
]);
const pal = { main: '#ff8fb8', trim: '#ffd36e', accent: '#7fd1c7', outline: '#5a3d4f' };
const items = new Map<string, Item>(['unit', 'plank', 'cup', 'sofa'].map((t) => [t, { id: t, name: t, template: t, palette: pal, tags: t === 'plank' ? ['wall'] : ['shop'] }]));
const floor = { name: 'Shop', wall: '#ffffff', ground: '#cccccc', width: 400, items: [0, 1, 2, 3].map((i) => ({ item: 'sofa', x: 50 + i * 82 })) };
const places = new Map<string, Place>([['shop', { id: 'shop', name: 'Shop', emoji: '🛍️', district: 'shopping', floors: [{ ...floor, width: 500 }] }]]);
const ctx = { items, templates, places };
const S = (list: ShelfStock['items']): ShelfStock => ({ id: 'shop:0', items: list });

describe('shelf stock', () => {
  it('measures surface levels in world units', () => {
    expect(surfaceLevels(templates.get('unit')!)).toEqual([20, 60]);
  });
  it('accepts things standing on shelf levels, and a hung shelf above the floor things', () => {
    expect(shelfStockErrors(S([{ item: 'unit', x: 440 }, { item: 'cup', x: 430, y: 20 }, { item: 'cup', x: 450, y: 60 }]), [], ctx)).toEqual([]);
    expect(shelfStockErrors(S([{ item: 'plank', x: 100, y: 60 }, { item: 'cup', x: 100, y: 70 }]), [], ctx)).toEqual([]);
  });
  it('rejects floating stock, hung shelves that are not wall things or cover something, and unknown floors', () => {
    expect(shelfStockErrors(S([{ item: 'unit', x: 440 }, { item: 'cup', x: 440, y: 40 }]), [], ctx).join()).toMatch(/not standing on a shelf level/);
    expect(shelfStockErrors(S([{ item: 'unit', x: 440 }, { item: 'cup', x: 300, y: 20 }]), [], ctx).join()).toMatch(/not standing/);
    expect(shelfStockErrors(S([{ item: 'plank', x: 100, y: 30 }]), [], ctx).join()).toMatch(/covers "sofa"/);
    expect(shelfStockErrors(S([{ item: 'unit', x: 100, y: 60 }]), [], ctx).join()).toMatch(/not a wall thing/);
    expect(shelfStockErrors({ id: 'nope:0', items: [] }, [], ctx).join()).toMatch(/no such place floor/);
  });
});
