// Small shared UI pieces: round buttons, labels, the font.
import { Container, Graphics, Text, type FederatedPointerEvent } from 'pixi.js';

export const FONT = 'Fredoka, "Arial Rounded MT Bold", sans-serif';
export const COLORS = { pink: 0xff8fb8, pinkLight: 0xffc4dc, plum: 0x5a3d4f, white: 0xffffff, cream: 0xfff6f9 };

export function label(text: string, size = 28, color = COLORS.plum): Text {
  const t = new Text({ text, style: { fontFamily: FONT, fontSize: size, fill: color, fontWeight: '600', align: 'center' } });
  t.anchor.set(0.5);
  return t;
}

/** A round button with an emoji or short text; calls onTap on release inside. */
export function roundButton(glyph: string, onTap: () => void, size = 76, fill = COLORS.white): Container {
  const c = new Container();
  const bg = new Graphics().circle(0, 0, size / 2).fill(fill).stroke({ color: COLORS.plum, width: 4 });
  const g = label(glyph, size * 0.5);
  c.addChild(bg, g);
  makeTappable(c, onTap);
  return c;
}

/** A rounded pill button with text. */
export function pillButton(text: string, onTap: () => void, w = 220, h = 70, fill = COLORS.pink): Container {
  const c = new Container();
  c.addChild(new Graphics().roundRect(-w / 2, -h / 2, w, h, h / 2).fill(fill).stroke({ color: COLORS.plum, width: 4 }), label(text, h * 0.45, COLORS.white));
  makeTappable(c, onTap);
  return c;
}

export function makeTappable(c: Container, onTap: (e: FederatedPointerEvent) => void): void {
  c.eventMode = 'static';
  c.cursor = 'pointer';
  c.on('pointerdown', (e) => {
    e.stopPropagation();
    c.scale.set(0.92);
  });
  const release = () => c.scale.set(1);
  c.on('pointerupoutside', release);
  c.on('pointerup', (e) => {
    e.stopPropagation();
    release();
    onTap(e);
  });
}
