// Extra checks for the realistic style (on top of templateErrors): shaded with gradients, thin outlines, real-world
// colours supplied, and clothes cut to the blocky body (tops fill the torso with no sleeves of their own; trousers and
// skirts are one block the width of the legs).
import { checkSvg } from './svg.ts';
import type { Template } from './template.ts';

const HEX = /^#[0-9a-f]{6}$/i;
export const MAX_OUTLINE = 3.5;

export function realStyleErrors(t: Template & { palette?: Record<string, string> }): string[] {
  const id = typeof t?.id === 'string' ? t.id : '?';
  const out: string[] = [];
  const err = (m: string) => out.push(`${id}: ${m}`);
  const svg = typeof t?.svg === 'string' ? t.svg : '';
  if (t?.category !== 'glasses' && !/fill="url\(#[\w-]+\)"/.test(svg)) err('shade it: lay a gradient overlay (fill="url(#L)" etc.) over the main shapes, like the examples');
  for (const m of svg.matchAll(/<(path|rect|circle|ellipse|polygon)\b([^>]*)>/g)) {
    // Outlines ({{outline}} strokes round filled shapes) are thin; a thick coloured stroke can be the thing itself
    // (a glasses frame, a strap).
    const fill = /fill="([^"]*)"/.exec(m[2])?.[1];
    const stroke = /stroke="([^"]*)"/.exec(m[2])?.[1];
    const w = Number(/stroke-width="([\d.]+)"/.exec(m[2])?.[1] ?? 0);
    if (fill && fill !== 'none' && stroke === '{{outline}}' && w > MAX_OUTLINE) {
      err(`outlines on filled shapes must be thin (stroke-width ${MAX_OUTLINE} or less), found ${w}`);
      break;
    }
  }
  const p = t?.palette;
  if (!p || !['main', 'trim', 'accent', 'outline'].every((k) => HEX.test(p[k] ?? ''))) err('palette: {"main","trim","accent","outline"} as real-world #rrggbb colours');
  const box = checkSvg(svg).box;
  if (box) {
    const between = (v: number, a: number, b: number) => v >= a && v <= b;
    if (t.category === 'top' && !(between(box.minX, 14, 26) && between(box.maxX, 230, 242)))
      err(`a top fills the torso exactly, x 20-236 (no sleeves sticking out): found x ${Math.round(box.minX)}-${Math.round(box.maxX)}`);
    // Trousers are x 40-216; a skirt may flare out to x 30-226.
    if (t.category === 'bottom' && !(between(box.minX, 26, 46) && between(box.maxX, 210, 230)))
      err(`trousers are one block the width of the legs, x 40-216 (a skirt may flare to x 30-226): found x ${Math.round(box.minX)}-${Math.round(box.maxX)}`);
  }
  return out;
}
