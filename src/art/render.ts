// Turn a template + palette into a concrete SVG string. Pure: used by the game and by the tools.

export type Palette = { main: string; trim: string; accent: string; outline: string };

/** Fallback colourway when a recipe gives none. */
export const DEFAULT_PALETTE: Palette = { main: '#ff8fb8', trim: '#ffd36e', accent: '#7fd1c7', outline: '#5a3d4f' };

export function paint(svg: string, palette: Partial<Palette> = {}): string {
  const p = { ...DEFAULT_PALETTE, ...palette };
  return svg.replace(/\{\{(main|trim|accent|outline)\}\}/g, (_, slot: keyof Palette) => p[slot]);
}
