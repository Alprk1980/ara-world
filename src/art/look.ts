// The game's look: the realistic drawings. Every template with a realistic redraw (src/data/templates-real.json) is
// swapped for it under the same id, so saved worlds and items keep working, and things that open get their open
// drawing (src/data/templates-open.json).
import type { Template } from '../../schemas/template.ts';
import type { Item } from '../../schemas/item.ts';
import { items, templates } from '../data/index.ts';
import realList from '../data/templates-real.json';
import openList from '../data/templates-open.json';
import type { RigStyle } from '../world/rig.ts';

let look: RigStyle = 'cute';
/** Things that only come in their real colours in the realistic look. */
const NATURAL = new Set(['food', 'drink', 'plant']);

export const currentLook = (): RigStyle => look;

export const openId = (templateId: string) => `${templateId}__open`;
/** Whether a template has an open drawing. */
export const hasOpenArt = (templateId: string) => templates.has(openId(templateId));

/** Swap in the realistic drawings; call once before anything is drawn. */
export async function initLook(): Promise<void> {
  applyLook('real');
}

export function applyLook(next: RigStyle): void {
  look = next;
  if (look !== 'real') return;
  const byTemplate = new Map<string, Item[]>();
  for (const it of items.values()) byTemplate.set(it.template, [...(byTemplate.get(it.template) ?? []), it]);
  const wear = (id: string, palettes: Item['palette'][]) => (byTemplate.get(id) ?? []).forEach((it, k) => items.set(it.id, { ...it, palette: palettes[k % palettes.length] }));
  for (const t of realList as (Template & { palette?: Item['palette']; coats?: Item['palette'][] })[]) {
    const orig = templates.get(t.id);
    if (!orig) continue;
    const { palette, coats, ...real } = t;
    templates.set(t.id, real);
    // Animals wear natural coats in turn (a ginger cat, a grey cat, a black cat…) instead of their items' own colours,
    // and food, drink and plants their real colours (no blue carrots).
    if (coats?.length) wear(t.id, coats);
    else if (palette && NATURAL.has(t.category)) wear(t.id, [palette]);
  }
  // Things that open have a second drawing, kept as "<id>__open" (same canvas, size and anchors as the closed one).
  for (const o of openList as { id: string; svg: string }[]) {
    const closed = templates.get(o.id);
    if (closed) templates.set(openId(o.id), { ...closed, id: openId(o.id), svg: o.svg });
  }
}
