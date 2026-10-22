// The game's look: 'cute' (the flat drawings) or 'real' (the realistic redraws in src/data/templates-real.json, and
// open versions of things that open in src/data/templates-open.json).
// Chosen in the ⚙️ menu and saved apart from the world. In the realistic look every template that has a redraw is
// swapped for it (same id, so saved worlds and items keep working); the rest stay cute until they are redrawn.
import type { Template } from '../../schemas/template.ts';
import { load, save } from '../app/save.ts';
import { templates } from '../data/index.ts';
import realList from '../data/templates-real.json';
import openList from '../data/templates-open.json';
import type { RigStyle } from '../world/rig.ts';

let look: RigStyle = 'cute';

export const currentLook = (): RigStyle => look;

export const openId = (templateId: string) => `${templateId}__open`;
/** Whether a template has an open drawing (only in the realistic look). */
export const hasOpenArt = (templateId: string) => templates.has(openId(templateId));

/** Read the saved look and apply it; call once before anything is drawn. ?look=real (or cute) in the address
 * overrides it without saving, for previews and the e2e tests. */
export async function initLook(): Promise<void> {
  const asked = new URLSearchParams(location.search).get('look');
  applyLook(asked === 'real' || asked === 'cute' ? asked : await load<RigStyle>('look', 'cute'));
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

/** Save the other look; the game reloads to redraw everything in it. */
export async function toggleLook(): Promise<void> {
  await save('look', look === 'real' ? 'cute' : 'real');
}
