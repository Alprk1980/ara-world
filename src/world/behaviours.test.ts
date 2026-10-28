import { describe, expect, it } from 'vitest';
import { items } from '../data/index.ts';
import { insideShelves, itemSize } from '../art/geometry.ts';
import { applyLook, insideOf } from '../art/look.ts';
import { containerOf, fillInside } from './behaviours.ts';

applyLook('real');
// One item of every container that has shelves drawn inside its open drawing.
const boxes = [...new Map([...items.values()].filter((it) => insideOf(it.template) && containerOf(it.id)).map((it) => [it.template, it.id])).values()];

describe('things inside open containers', () => {
  it('covers every container that has an open drawing', () => {
    expect(boxes.length).toBeGreaterThanOrEqual(30);
  });
  it('leaves out things that only look like containers by name', () => {
    for (const t of ['parcel_crane', 'water_cooler', 'bandage_roll', 'makeup_mirror'])
      expect([...items.values()].filter((it) => it.template === t).every((it) => !containerOf(it.id))).toBe(true);
  });
  for (const id of boxes) {
    it(`${items.get(id)!.template} fills with things that fit`, () => {
      const shelves = insideShelves(id);
      const inside = fillInside(id, 'u1', shelves, itemSize);
      expect(inside.length).toBeGreaterThan(0);
      expect(inside.length).toBeLessThanOrEqual(16);
      // Each thing's shelf: at its height and under it (a row of jars has shelves side by side at one height).
      const shelfOf = (p: (typeof inside)[number]) => shelves.find((s) => Math.abs(s.y - p.y) < 1e-6 && p.x >= s.x0 && p.x <= s.x1)!;
      for (const p of inside) {
        const s = shelfOf(p);
        const { w, h } = itemSize(p.item);
        expect(h).toBeLessThanOrEqual(s.room);
        // A lone thing in a tiny jar may poke out over the rim a little.
        const over = inside.filter((o) => shelfOf(o) === s).length === 1 ? (s.x1 - s.x0) * 0.3 : 0;
        expect(p.x - w / 2).toBeGreaterThanOrEqual(s.x0 - over - 1e-6);
        expect(p.x + w / 2).toBeLessThanOrEqual(s.x1 + over + 1e-6);
      }
      // Nothing overlaps on a shelf.
      for (const s of shelves) {
        const row = inside.filter((p) => shelfOf(p) === s);
        const spans = row.map((p) => [p.x - itemSize(p.item).w / 2, p.x + itemSize(p.item).w / 2]).sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < spans.length; i++) expect(spans[i][0]).toBeGreaterThanOrEqual(spans[i - 1][1] - 1e-6);
      }
      // The same container always holds the same things.
      expect(fillInside(id, 'u1', shelves, itemSize)).toEqual(inside);
    });
  }
});
