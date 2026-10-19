// Templates painted with a palette, rasterized once and cached as Pixi textures.
import { Texture } from 'pixi.js';
import { paint, type Palette } from './render.ts';
import { templates } from '../data/index.ts';

const cache = new Map<string, Texture>();
const pending = new Map<string, Promise<Texture>>();
/** Raster size of the 256 canvas; 2x keeps edges crisp on retina tablets. */
const RASTER = 512;

const key = (id: string, p: Partial<Palette>) => `${id}|${p.main ?? ''}|${p.trim ?? ''}|${p.accent ?? ''}|${p.outline ?? ''}`;

export function textureFor(templateId: string, palette: Partial<Palette> = {}): Promise<Texture> {
  const k = key(templateId, palette);
  const hit = cache.get(k);
  if (hit) return Promise.resolve(hit);
  const wait = pending.get(k);
  if (wait) return wait;
  const t = templates.get(templateId);
  if (!t) return Promise.resolve(Texture.EMPTY);
  const svg = paint(t.svg, palette).replace('<svg ', `<svg width="${RASTER}" height="${RASTER}" `);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const p = img.decode().then(() => {
    const tex = Texture.from(img);
    cache.set(k, tex);
    pending.delete(k);
    return tex;
  });
  pending.set(k, p);
  return p;
}

/** Pixels per 256-canvas unit, for placing anchors on a sprite drawn from a template. */
export const RASTER_SCALE = RASTER / 256;
