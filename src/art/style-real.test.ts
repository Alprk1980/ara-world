import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { templateErrors, type Template } from '../../schemas/template.ts';
import { itemErrors, type Item } from '../../schemas/item.ts';
import { TEMPLATE_CATEGORIES } from '../../schemas/vocab.ts';

// The realistic style samples (tools/style-real.ts) are the examples Qwen will follow, so they must stay valid.
const samples = JSON.parse(readFileSync('prompts/style-real.json', 'utf8')) as { templates: Template[]; items: Item[] };

describe('realistic style samples', () => {
  it('are valid templates and items', () => {
    const templates = new Map(samples.templates.map((t) => [t.id, t]));
    for (const t of samples.templates) expect(templateErrors(t, samples.templates), t.id).toEqual([]);
    for (const it of samples.items) expect(itemErrors(it, samples.items, templates), it.id).toEqual([]);
  });
  it('cover every category once', () => {
    expect(samples.templates.map((t) => t.category).sort()).toEqual([...TEMPLATE_CATEGORIES].sort());
  });
});

describe('realStyleErrors', () => {
  it('passes the samples and catches flat, thick-outlined or badly cut drawings', async () => {
    const { realStyleErrors } = await import('../../schemas/style-real.ts');
    const pal = (id: string) => samples.items.find((i) => i.id === id)!.palette;
    for (const t of samples.templates) expect(realStyleErrors({ ...t, palette: pal(t.id) }), t.id).toEqual([]);
    const tee = samples.templates.find((t) => t.category === 'top')!;
    expect(realStyleErrors({ ...tee, palette: pal(tee.id), svg: tee.svg.replace(/fill="url\(#[\w-]+\)"/g, 'fill="{{main}}"') }).join()).toMatch(/gradient/);
    expect(realStyleErrors({ ...tee, palette: pal(tee.id), svg: tee.svg.replace('stroke-width="2.5"', 'stroke-width="6"') }).join()).toMatch(/thin/);
    expect(realStyleErrors({ ...tee }).join()).toMatch(/palette/);
    expect(realStyleErrors({ ...tee, palette: pal(tee.id), svg: tee.svg.replace('M20 24', 'M4 24') }).join()).toMatch(/fills the torso/);
  });
});
