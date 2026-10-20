import { describe, expect, it } from 'vitest';
import placeList from '../data/places.json';
import { designErrors } from './map-buildings.ts';
import { DESIGNS, OPEN, houseDesign } from './map-designs.ts';

describe('map building designs', () => {
  it('are all valid', () => {
    for (const [id, d] of Object.entries(DESIGNS)) expect(designErrors(d), id).toEqual([]);
    for (const s of ['cottage', 'modern', 'mansion', 'beach', 'cabin', 'castle', 'apartment', 'farmhouse', 'treehouse', 'spooky_cute', 'unknown'])
      expect(designErrors(houseDesign(s, { walls: '#ffffff', roof: '#c2557a', door: '#7fd1c7' }, 2)), s).toEqual([]);
  });
  it('belong to real places, and every mostly-indoor place has one', () => {
    const places = placeList as { id: string; floors: { outdoor?: boolean }[] }[];
    const ids = new Set(places.map((p) => p.id));
    for (const id of Object.keys(DESIGNS)) expect(ids.has(id), id).toBe(true);
    for (const p of places) if (!OPEN.has(p.id) && p.floors.filter((f) => f.outdoor).length / p.floors.length <= 0.5) expect(DESIGNS[p.id], p.id).toBeDefined();
  });
  it('catch mistakes', () => {
    expect(designErrors({ body: 'house', wall: 'pink', roof: '#000000' }).join()).toMatch(/wall/);
    expect(designErrors({ body: 'house', wall: '#ffffff', roof: '#000000', extras: ['helipad'] }).join()).toMatch(/flat roof/);
    expect(designErrors({ body: 'shop', wall: '#ffffff', roof: '#000000', extras: ['smoke'] }).join()).toMatch(/chimney/);
    expect(designErrors({ body: 'shop', wall: '#ffffff', roof: '#000000', sign: 'post' }).join()).toMatch(/capital/);
  });
});
