// 🖍️ The draw pad: draw anything with your finger, say what it is and how big, and it becomes a real thing in the
// game. Three paint pots (which become the item's colours, so it can be recoloured like anything else), a black pen
// and white; lines in three sizes, or "fill" to colour in a shape you draw round.
import { Container, Graphics, Rectangle, type FederatedPointerEvent } from 'pixi.js';
import type { Scene } from '../app/scenes.ts';
import type { Game } from '../app/game.ts';
import type { Item } from '../../schemas/item.ts';
import { itemErrors } from '../../schemas/item.ts';
import { templateErrors } from '../../schemas/template.ts';
import { characters, items, templates } from '../data/index.ts';
import { DRAW_KINDS, DRAW_SIZES, drawingToTemplate, heightFor, type DrawKind, type Ink, type Stroke } from '../art/drawing.ts';
import { itemSprite } from '../art/geometry.ts';
import { Rig } from '../world/rig.ts';
import { persist, uid, type Person } from '../world/state.ts';
import { PlaceScene } from '../world/place-scene.ts';
import { itemThumb } from './creator.ts';
import { COLORS, label, pillButton } from './kit.ts';
import { playSound } from './sound.ts';

const SWATCHES = ['#ff8fb8', '#ff4f8b', '#e63946', '#ff9f43', '#ffd36e', '#fff3b0', '#8ce99a', '#3fa66b', '#7fd1c7', '#74c0fc', '#3a6ea5', '#b197fc', '#7b4fa0', '#c9c9c9', '#8b5e3c', '#f4d6c6', '#d9a066', '#5a3d4f'];
const OUTLINE = '#3a2a2a';
const PENS = [{ width: 4, r: 4 }, { width: 10, r: 8 }, { width: 22, r: 13 }];
type Tool = 'line' | 'fill';

/** Everything made in the draw pad. */
export function myDrawings(game: Game): Item[] {
  return game.world.custom.filter((it) => game.world.drawings.some((t) => t.id === it.template));
}

export class DrawScene implements Scene {
  readonly name = 'draw';
  readonly view = new Container();
  private game: Game;
  private bg = new Graphics();
  private pad = new Container();
  private padBg = new Graphics();
  private ink = new Graphics();
  private live = new Graphics();
  private padMask = new Graphics();
  private panel = new Container();
  private preview = new Container();
  private strokes: Stroke[] = [];
  private current: Stroke | null = null;
  private pots: Record<'main' | 'trim' | 'accent', string> = { main: '#ff8fb8', trim: '#74c0fc', accent: '#ffd36e' };
  private sel: Ink = 'main';
  private pen = 1;
  private tool: Tool = 'line';
  private step: 'draw' | 'what' = 'draw';
  private kind: DrawKind = DRAW_KINDS[0];
  private sizeIdx = 1;
  private nameText = '';
  private previewId: { t: string; i: string } | null = null;
  private side = 400;
  private size = { w: 0, h: 0 };

  constructor(game: Game) {
    this.game = game;
    this.pad.addChild(this.padBg, this.ink, this.live, this.padMask, this.preview);
    this.ink.mask = this.padMask;
    this.view.addChild(this.bg, this.pad, this.panel);
    this.pad.eventMode = 'static';
    this.pad.cursor = 'crosshair';
    this.pad.on('pointerdown', (e) => this.down(e));
    this.pad.on('globalpointermove', (e) => this.move(e));
    this.pad.on('pointerup', () => this.up());
    this.pad.on('pointerupoutside', () => this.up());
  }

  layout(w: number, h: number): void {
    this.size = { w, h };
    this.side = Math.max(240, Math.min(h - 130, w * 0.56));
    this.bg.clear().rect(0, 0, w, h).fill(COLORS.pinkLight);
    this.pad.position.set(24, 110);
    const s = this.side;
    this.padBg.clear().roundRect(0, 0, s, s, 24).fill(0xffffff).stroke({ color: COLORS.plum, width: 4 });
    this.padMask.clear().roundRect(2, 2, s - 4, s - 4, 22).fill(0xffffff);
    this.pad.hitArea = new Rectangle(0, 0, s, s);
    this.redraw();
    this.drawPanel();
  }

  // ---------------------------------------------------------------- drawing
  private toPad(e: FederatedPointerEvent): [number, number] {
    const p = this.pad.toLocal(e.global);
    return [(p.x / this.side) * 256, (p.y / this.side) * 256];
  }

  private down(e: FederatedPointerEvent): void {
    if (this.step !== 'draw') return;
    this.current = { kind: this.tool, ink: this.sel, width: PENS[this.pen].width, points: [this.toPad(e)] };
    this.drawLive();
  }

  private move(e: FederatedPointerEvent): void {
    if (!this.current) return;
    const p = this.toPad(e);
    const last = this.current.points[this.current.points.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
    this.current.points.push([Math.max(0, Math.min(256, p[0])), Math.max(0, Math.min(256, p[1]))]);
    this.drawLive();
  }

  private up(): void {
    if (!this.current) return;
    if (this.current.kind === 'line' || this.current.points.length >= 3) this.strokes.push(this.current);
    this.current = null;
    this.live.clear();
    this.redraw();
    this.drawPanel();
  }

  private colourOf(ink: Ink): number {
    const hex = ink === 'outline' ? OUTLINE : ink === 'white' ? '#ffffff' : this.pots[ink];
    return parseInt(hex.slice(1), 16);
  }

  private paintStroke(g: Graphics, s: Stroke, closed: boolean): void {
    const k = this.side / 256;
    const pts = s.points.map(([x, y]) => [x * k, y * k]);
    if (s.kind === 'fill' && closed && pts.length >= 3) {
      g.poly(pts.flat()).fill(this.colourOf(s.ink)).stroke({ color: this.colourOf('outline'), width: 3 * k, join: 'round' });
      return;
    }
    const style = { color: this.colourOf(s.ink), width: (s.kind === 'fill' ? 4 : s.width) * k, cap: 'round' as const, join: 'round' as const };
    if (pts.length === 1) g.circle(pts[0][0], pts[0][1], style.width / 2).fill(style.color);
    else g.poly(pts.flat(), false).stroke(style);
    // A white mark on white paper: give it a faint edge so you can see it.
    if (s.ink === 'white' && pts.length > 1) g.poly(pts.flat(), false).stroke({ ...style, color: 0xdddddd, width: style.width + 2, alpha: 0.5 });
  }

  private redraw(): void {
    this.ink.clear();
    for (const s of this.strokes) this.paintStroke(this.ink, s, true);
  }

  private drawLive(): void {
    this.live.clear();
    if (this.current) this.paintStroke(this.live, this.current, false);
  }

  // ---------------------------------------------------------------- the panel on the right
  private drawPanel(): void {
    this.panel.removeChildren().forEach((c) => c.destroy({ children: true }));
    const x0 = 24 + this.side + 24, pw = this.size.w - x0 - 20;
    this.panel.position.set(x0, 0);
    this.panel.addChild(new Graphics().roundRect(0, 110, pw, this.side, 24).fill(COLORS.cream).stroke({ color: COLORS.plum, width: 4 }));
    this.preview.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.ink.visible = this.step === 'draw';
    this.padBg.tint = 0xffffff;
    if (this.step === 'draw') this.drawTools(pw);
    else this.drawWhat(pw);
  }

  private add(c: Container, x: number, y: number): Container {
    c.position.set(x, y);
    this.panel.addChild(c);
    return c;
  }

  private drawTools(pw: number): void {
    const cx = pw / 2;
    this.add(label('🖍️ Draw anything!', 32), cx, 150);
    // Paint pots and pens: tap one to draw with it.
    const inks: Ink[] = ['main', 'trim', 'accent', 'outline', 'white'];
    const gap = Math.min(78, (pw - 30) / 5);
    inks.forEach((ink, i) => {
      const sel = ink === this.sel;
      const pot = new Container();
      pot.addChild(new Graphics().circle(0, 0, 30).fill(this.colourOf(ink)).stroke({ color: sel ? COLORS.pink : COLORS.plum, width: sel ? 8 : 3 }));
      if (ink === 'outline') pot.addChild(label('✏️', 26));
      pot.eventMode = 'static';
      pot.cursor = 'pointer';
      pot.on('pointertap', () => {
        this.sel = ink;
        this.drawPanel();
      });
      pot.label = `ink-${ink}`;
      this.add(pot, cx + (i - 2) * gap, 215);
    });
    // Colours for the chosen pot (the pen and white stay as they are).
    let y = 275;
    if (this.sel === 'main' || this.sel === 'trim' || this.sel === 'accent') {
      const pot = this.sel;
      const cols = 9, sw = Math.min(44, (pw - 30) / cols);
      SWATCHES.forEach((c, i) => {
        const b = new Graphics().circle(0, 0, sw * 0.42).fill(c).stroke({ color: c === this.pots[pot] ? COLORS.pink : COLORS.plum, width: c === this.pots[pot] ? 5 : 2 });
        b.eventMode = 'static';
        b.cursor = 'pointer';
        b.on('pointertap', () => {
          this.pots[pot] = c;
          this.redraw();
          this.drawPanel();
        });
        this.add(b, cx + ((i % cols) - (cols - 1) / 2) * sw, y + Math.floor(i / cols) * sw);
      });
      y += sw * 2 + 18;
    } else y += 20;
    // Pen sizes and the fill tool.
    const tools: [string, () => boolean, () => void][] = PENS.map((p, i) => [
      `pen-${i}`,
      () => this.tool === 'line' && this.pen === i,
      () => {
        this.tool = 'line';
        this.pen = i;
      },
    ]);
    tools.push(['fill', () => this.tool === 'fill', () => (this.tool = 'fill')]);
    tools.forEach(([id, on, set], i) => {
      const b = new Container();
      b.addChild(new Graphics().roundRect(-34, -30, 68, 60, 18).fill(on() ? COLORS.pink : COLORS.white).stroke({ color: COLORS.plum, width: 3 }));
      if (id === 'fill') b.addChild(label('🫧', 30));
      else b.addChild(new Graphics().circle(0, 0, PENS[i].r).fill(this.colourOf(this.sel)).stroke({ color: COLORS.plum, width: 1 }));
      b.eventMode = 'static';
      b.cursor = 'pointer';
      b.label = `tool-${id}`;
      b.on('pointertap', () => {
        set();
        this.drawPanel();
      });
      this.add(b, cx + (i - 1.5) * 78, y + 30);
    });
    const hint = label(this.tool === 'fill' ? 'Draw round a shape to fill it in' : 'Draw with your finger', 18);
    this.add(hint, cx, y + 80);
    y += 130;
    const small = (text: string, x: number, onTap: () => void) => this.add(pillButton(text, onTap, 130, 56, 0xd9a3bb), x, y);
    small('↩️ Undo', cx - 140, () => {
      this.strokes.pop();
      this.redraw();
      this.drawPanel();
    });
    small('🗑️ Clear', cx, () => {
      this.strokes = [];
      this.redraw();
      this.drawPanel();
    });
    small('🖼️ Mine', cx + 140, () => this.showMine());
    const next = pillButton('Next ▶', () => {
      if (!this.strokes.length) {
        this.game.toast.show('Draw something first! 🖍️');
        return;
      }
      this.step = 'what';
      this.drawPanel();
    }, Math.min(300, pw - 40), 76, this.strokes.length ? COLORS.pink : 0xd9a3bb);
    this.add(next, cx, 110 + this.side - 60);
  }

  private drawWhat(pw: number): void {
    const cx = pw / 2;
    this.add(label('What is it?', 32), cx, 150);
    const bw = Math.min(200, (pw - 40) / 2);
    DRAW_KINDS.forEach((k, i) => {
      const b = pillButton(`${k.emoji} ${k.word}`, () => {
        if (!this.nameText || DRAW_KINDS.some((d) => this.nameText === `My ${d.word}`)) this.nameText = `My ${k.word}`;
        this.kind = k;
        this.drawPanel();
      }, bw, 52, k === this.kind ? COLORS.pink : 0xd9a3bb);
      this.add(b, cx + (i % 2 ? 1 : -1) * (bw / 2 + 6), 205 + Math.floor(i / 2) * 60);
    });
    let y = 205 + 4 * 60 + 20;
    this.add(label('How big?', 26), cx, y);
    y += 50;
    const sg = Math.min(80, (pw - 20) / 5);
    DRAW_SIZES.forEach((s, i) => {
      const b = pillButton(s.emoji, () => {
        this.sizeIdx = i;
        this.drawPanel();
      }, sg - 8, 56, i === this.sizeIdx ? COLORS.pink : COLORS.white);
      this.add(b, cx + (i - 2) * sg, y);
    });
    y += 70;
    if (!this.nameText) this.nameText = `My ${this.kind.word}`;
    this.add(pillButton(`🔤 ${this.nameText}`, () => this.rename(), Math.min(340, pw - 40), 56, 0xd9a3bb), cx, y);
    const bottom = 110 + this.side - 60;
    this.add(pillButton('◀ Draw', () => {
      this.step = 'draw';
      this.drawPanel();
    }, 150, 70, 0xd9a3bb), cx - 100, bottom);
    this.add(pillButton('✔ Done', () => this.finish(), 170, 76), cx + 90, bottom);
    this.drawPreview();
  }

  /** The drawing next to a child, at the size chosen, on the pad. */
  private drawPreview(): void {
    const t = this.build('drawn_preview');
    if (!t) return;
    if (this.previewId) {
      templates.delete(this.previewId.t);
      items.delete(this.previewId.i);
    }
    const tid = uid('drawn_preview_'), iid = uid('drawn_preview_item_');
    templates.set(tid, { ...t, id: tid });
    items.set(iid, { id: iid, name: 'preview', template: tid, palette: this.palette(), tags: ['shop'] });
    this.previewId = { t: tid, i: iid };
    const s = this.side;
    const kid = [...characters.values()].find((c) => c.age === 'kid');
    const rig = kid ? new Rig({ ...structuredClone(kid), kind: 'person' } as Person) : null;
    const itemH = heightFor(this.kind.category, DRAW_SIZES[this.sizeIdx].h);
    const f = (s - 110) / Math.max(rig?.geo.height ?? 60, itemH);
    const floor = s - 40;
    this.preview.addChild(new Graphics().rect(16, floor, s - 32, 4).fill(0xe0d0d8));
    if (rig) {
      rig.scale.set(f);
      rig.position.set(s * 0.25, floor);
      this.preview.addChild(rig);
    }
    const sp = itemSprite(iid);
    sp.scale.set(sp.scale.x * f);
    sp.position.set(s * 0.65, floor);
    this.preview.addChild(sp);
    const tip = label(`${DRAW_SIZES[this.sizeIdx].word} ${this.kind.word.toLowerCase()}`, 22);
    tip.position.set(s / 2, 40);
    this.preview.addChild(tip);
  }

  private palette(): Item['palette'] {
    return { main: this.pots.main, trim: this.pots.trim, accent: this.pots.accent, outline: OUTLINE };
  }

  private build(id: string) {
    return drawingToTemplate(this.strokes, { id, name: this.nameText.slice(0, 30) || 'My Drawing', category: this.kind.category, height: DRAW_SIZES[this.sizeIdx].h });
  }

  private rename(): void {
    const typed = window.prompt('What is it called?', this.nameText);
    if (typed && typed.trim().length >= 2) this.nameText = typed.trim().slice(0, 24);
    this.drawPanel();
  }

  // ---------------------------------------------------------------- making it real
  private finish(): void {
    const id = uid('drawn_');
    const t = this.build(id);
    if (!t) return;
    const it: Item = { id: `${id}_item`, name: t.name, template: t.id, palette: this.palette(), tags: [...this.kind.tags] };
    if ('bites' in this.kind) it.bites = this.kind.bites;
    const errs = [...templateErrors(t, [...templates.values()]), ...itemErrors(it, [...items.values()], new Map([...templates, [t.id, t]]))];
    if (errs.length) {
      console.error('drawing did not pass the checks', errs);
      this.game.toast.show('Oops! Try drawing it a bit bigger 🖍️');
      return;
    }
    const w = this.game.world;
    w.drawings.push(t);
    w.custom.push(it);
    templates.set(t.id, t);
    items.set(it.id, it);
    persist(w);
    playSound('tada');
    this.deliver(it.id, true);
  }

  /** Back out of the draw pad and the maker, and put the thing where you were (or wait at home for you). */
  private deliver(itemId: string, isNew: boolean): void {
    const it = items.get(itemId);
    while (this.game.stack.depth > 2 && (this.game.stack.top === this || this.game.stack.top?.name === 'creator')) this.game.stack.pop();
    const top = this.game.stack.top;
    const pet = it?.tags.includes('pet') ? ' It\'s in 🐾 Pets too!' : '';
    const name = (it?.name ?? 'drawing').replace(/^My /, '');
    if (top instanceof PlaceScene) {
      top.spawn(itemId);
      this.game.toast.show(`${isNew ? 'Ta-da! ' : ''}Here's your ${name}! ✨${pet}`);
    } else {
      this.game.world.inbox.push(itemId);
      persist(this.game.world);
      this.game.toast.show(`Your ${name} is waiting in your home 🏡${pet}`);
    }
  }

  private showMine(): void {
    const mine = myDrawings(this.game);
    if (!mine.length) {
      this.game.toast.show('Your drawings will be here 🖼️');
      return;
    }
    this.game.panel.show('🖼️ My drawings', () =>
      mine.map((it) => ({
        draw: () => itemThumb(it.id, 90),
        onTap: () => {
          this.game.panel.hide();
          this.deliver(it.id, false);
        },
      })),
    );
  }

  destroy(): void {
    if (this.previewId) {
      templates.delete(this.previewId.t);
      items.delete(this.previewId.i);
    }
  }
}
