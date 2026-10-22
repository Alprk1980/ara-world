// The game's look: the realistic drawings. Every template with a realistic redraw (src/data/templates-real.json) is
// swapped for it under the same id, so saved worlds and items keep working, and things that open get their open
// drawing (src/data/templates-open.json).
import type { Template } from '../../schemas/template.ts';
import { templates } from '../data/index.ts';
import realList from '../data/templates-real.json';
import openList from '../data/templates-open.json';
import type { RigStyle } from '../world/rig.ts';

let look: RigStyle = 'cute';

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
  for (const t of realList as (Template & { palette?: unknown })[]) {
    if (!templates.has(t.id)) continue;
    const { palette: _, ...real } = t;
    templates.set(t.id, real);
  }
  // Things that open have a second drawing, kept as "<id>__open" (same canvas, size and anchors as the closed one).
  for (const o of openList as { id: string; svg: string }[]) {
    const closed = templates.get(o.id);
    if (closed) templates.set(openId(o.id), { ...closed, id: openId(o.id), svg: o.svg });
  }
}
