// World-size sprites for items: scaled from the template's real size, pivoted on its base anchor.
import { Rectangle, Sprite } from 'pixi.js';
import { checkSvg, type Box } from '../../schemas/svg.ts';
import { items, templates } from '../data/index.ts';
import { RASTER_SCALE, textureFor } from './textures.ts';
import { hasOpenArt, openId } from './look.ts';

const boxes = new Map<string, Box>();

export function templateBox(templateId: string): Box {
  let b = boxes.get(templateId);
  if (!b) {
    b = checkSvg(templates.get(templateId)?.svg ?? '').box ?? { minX: 0, minY: 0, maxX: 256, maxY: 256 };
    boxes.set(templateId, b);
  }
  return b;
}

/** World units per canvas unit for a template (its real height over its drawn height). */
export function unitsPerCanvas(templateId: string): number {
  const t = templates.get(templateId);
  const b = templateBox(templateId);
  const h = t?.size?.h ?? 20;
  return h / Math.max(1, b.maxY - b.minY);
}

/** An anchor of an item in world units, relative to its base point (y up is negative). */
export function anchorOffset(itemId: string, anchor: string): { x: number; y: number } | null {
  const it = items.get(itemId);
  const t = it ? templates.get(it.template) : undefined;
  const a = t?.anchors?.[anchor];
  const base = t?.anchors?.base ?? [128, templateBox(it?.template ?? '').maxY];
  if (!t || !a) return null;
  const u = unitsPerCanvas(t.id);
  return { x: (a[0] - base[0]) * u, y: (a[1] - base[1]) * u };
}

/** Heights above its base of everything that can be put on: a table-top, or each level of a shelf unit. */
export function surfaceHeights(itemId: string): number[] {
  return (['shelf1', 'shelf2', 'shelf3', 'top'] as const).flatMap((k) => {
    const a = anchorOffset(itemId, k);
    return a ? [-a.y] : [];
  });
}

/** Width and height of an item in world units. */
export function itemSize(itemId: string): { w: number; h: number } {
  const t = templates.get(items.get(itemId)?.template ?? '');
  return t?.size ?? { w: 20, h: 20 };
}

/** A sprite for an item, sized and pivoted by its template; open shows its open drawing if it has one. */
export function itemSprite(itemId: string, open = false): Sprite {
  const s = new Sprite();
  const it = items.get(itemId);
  const t = it ? templates.get(it.template) : undefined;
  if (!it || !t) return s;
  const u = unitsPerCanvas(t.id);
  const base = t.anchors?.base ?? [128, templateBox(t.id).maxY];
  s.scale.set(u / RASTER_SCALE);
  s.pivot.set(base[0] * RASTER_SCALE, base[1] * RASTER_SCALE);
  // Touch only the drawing, not the transparent canvas around it (or big things swallow swipes).
  const b = templateBox(t.id), R = RASTER_SCALE, pad = 4;
  s.hitArea = new Rectangle((b.minX - pad) * R, (b.minY - pad) * R, (b.maxX - b.minX + pad * 2) * R, (b.maxY - b.minY + pad * 2) * R);
  showOpen(s, itemId, open);
  return s;
}

/** Show an item's open or closed drawing. The open one is drawn on the same canvas, so the scale, pivot and touch
 * area from the closed one still fit. */
export function showOpen(s: Sprite, itemId: string, open: boolean): void {
  const it = items.get(itemId);
  if (!it) return;
  const id = open && hasOpenArt(it.template) ? openId(it.template) : it.template;
  textureFor(id, it.palette).then((tex) => {
    if (!s.destroyed) s.texture = tex;
  });
}
