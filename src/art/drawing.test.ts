import { describe, expect, it } from 'vitest';
import { templateErrors } from '../../schemas/template.ts';
import { MAX_SVG_BYTES } from '../../schemas/svg.ts';
import { DRAW_KINDS, DRAW_SIZES, drawingToTemplate, simplify, type Stroke } from './drawing.ts';

/** A wobbly circle, like a finger draws. */
const loop = (cx: number, cy: number, r: number, n = 80): [number, number][] =>
  Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * 6.283) * r * (1 + Math.sin(i) * 0.03), cy + Math.sin((i / n) * 6.283) * r]);

const teddy: Stroke[] = [
  { kind: 'fill', ink: 'main', width: 8, points: loop(128, 150, 50) },
  { kind: 'fill', ink: 'main', width: 8, points: loop(128, 80, 34) },
  { kind: 'fill', ink: 'trim', width: 8, points: loop(100, 50, 12) },
  { kind: 'fill', ink: 'trim', width: 8, points: loop(156, 50, 12) },
  { kind: 'line', ink: 'outline', width: 6, points: [[116, 76], [117, 77]] },
  { kind: 'line', ink: 'outline', width: 6, points: [[140, 76], [141, 77]] },
  { kind: 'line', ink: 'white', width: 4, points: loop(128, 95, 10, 20).slice(0, 10) },
];

const make = (strokes: Stroke[], category: string, height = 40) => drawingToTemplate(strokes, { id: 'drawn_test', name: 'My Teddy', category, height });

describe('drawingToTemplate', () => {
  it('makes a valid template for every kind and size', () => {
    for (const k of DRAW_KINDS)
      for (const s of DRAW_SIZES) {
        const t = make(teddy, k.category, s.h)!;
        expect(templateErrors(t), `${k.category} ${s.word}`).toEqual([]);
      }
  });
  it('stands the drawing on the floor and fills the canvas, wherever it was drawn', () => {
    const small = teddy.map((s) => ({ ...s, points: s.points.map(([x, y]) => [x * 0.2 + 10, y * 0.2 + 5] as [number, number]) }));
    const t = make(small, 'toy')!;
    expect(templateErrors(t)).toEqual([]);
    expect(t.anchors!.base[1]).toBeGreaterThan(235);
    expect(t.anchors!.grip).toBeDefined();
  });
  it('keeps a huge scribble under the size limit', () => {
    const scribble: Stroke[] = Array.from({ length: 300 }, (_, i) => ({
      kind: 'line', ink: (['main', 'trim', 'accent', 'outline'] as const)[i % 4], width: 6,
      points: Array.from({ length: 60 }, (_, j) => [((i * 37 + j * 13) % 250) + Math.sin(j) * 3, ((i * 11 + j * 7) % 250) + Math.cos(j) * 3] as [number, number]),
    }));
    const t = make(scribble, 'decor')!;
    expect(t.svg.length).toBeLessThanOrEqual(MAX_SVG_BYTES);
    expect(templateErrors(t)).toEqual([]);
  });
  it('handles a single dot, a drawing with no main colour, a thin line, and nothing', () => {
    expect(templateErrors(make([{ kind: 'line', ink: 'main', width: 10, points: [[50, 50]] }], 'toy')!)).toEqual([]);
    expect(templateErrors(make([{ kind: 'line', ink: 'outline', width: 4, points: loop(128, 128, 60) }], 'decor')!)).toEqual([]);
    expect(templateErrors(make([{ kind: 'line', ink: 'trim', width: 4, points: [[10, 128], [250, 130]] }], 'vehicle', 90)!)).toEqual([]);
    expect(make([], 'toy')).toBeNull();
  });
  it('keeps sizes inside what the category allows', () => {
    expect(make(teddy, 'food', 180)!.size!.h).toBe(30);
    expect(make(teddy, 'vehicle', 6)!.size!.h).toBe(40);
  });
});

describe('simplify', () => {
  it('keeps a loop that ends where it started (how a finger draws round a shape)', () => {
    const ring = loop(128, 128, 60, 40);
    ring.push(ring[0]);
    expect(simplify(ring, 1).length).toBeGreaterThan(8);
    const t = make([{ kind: 'fill', ink: 'main', width: 8, points: ring }], 'animal')!;
    expect(templateErrors(t)).toEqual([]);
    expect(t.svg).toMatch(/Z"/);
  });
  it('drops points on a straight line and keeps corners', () => {
    expect(simplify([[0, 0], [5, 0.1], [10, 0], [10, 10]], 1)).toEqual([[0, 0], [10, 0], [10, 10]]);
  });
});
