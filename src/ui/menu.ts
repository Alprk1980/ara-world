// The ⚙️ settings menu: music, sounds, the cute or realistic look, back to the title, and resetting the world (behind a hold-to-confirm, so a
// stray tap can't wipe it). Settings are kept apart from the world, so a reset keeps them.
import { Container, Graphics, Rectangle, Ticker } from 'pixi.js';
import { COLORS, label, makeTappable, pillButton, roundButton } from './kit.ts';

export type MenuActions = {
  music(): boolean;
  toggleMusic(): Promise<void>;
  sounds(): boolean;
  toggleSounds(): Promise<void>;
  realistic(): boolean;
  toggleLook(): Promise<void>;
  title(): void;
  reset(): Promise<void>;
};

const GREEN = 0x3fa66b, RED = 0xe03131, GREY = 0x9aa3ad;
const HOLD = 2; // seconds to hold "reset"

export class Menu {
  readonly view = new Container();
  open = false;
  private dim = new Graphics();
  private card = new Container();
  private page: 'main' | 'confirm' = 'main';
  private size = { w: 0, h: 0 };
  private actions: MenuActions;

  constructor(actions: MenuActions) {
    this.actions = actions;
    this.view.addChild(this.dim, this.card);
    this.view.visible = false;
    this.view.eventMode = 'static';
    // Taps on the dimmed background close the menu; nothing underneath gets them.
    this.dim.eventMode = 'static';
    this.dim.on('pointertap', () => this.hide());
    this.card.eventMode = 'static';
    this.card.on('pointerdown', (e) => e.stopPropagation());
    this.card.on('pointertap', (e) => e.stopPropagation());
  }

  show(): void {
    this.open = true;
    this.page = 'main';
    this.view.visible = true;
    this.draw();
  }

  hide(): void {
    this.open = false;
    this.view.visible = false;
  }

  layout(w: number, h: number): void {
    this.size = { w, h };
    if (this.open) this.draw();
  }

  private draw(): void {
    const { w, h } = this.size;
    this.dim.clear().rect(0, 0, w, h).fill({ color: COLORS.plum, alpha: 0.45 });
    this.dim.hitArea = new Rectangle(0, 0, w, h);
    this.card.removeChildren().forEach((c) => c.destroy({ children: true }));
    const cw = Math.min(520, w - 40), ch = Math.min(this.page === 'main' ? 646 : 500, h - 40);
    this.card.position.set(w / 2, h / 2);
    this.card.hitArea = new Rectangle(-cw / 2, -ch / 2, cw, ch);
    this.card.addChild(new Graphics().roundRect(-cw / 2, -ch / 2, cw, ch, 34).fill(COLORS.cream).stroke({ color: COLORS.plum, width: 5 }));
    const close = roundButton('✖️', () => this.hide(), 60);
    close.position.set(cw / 2 - 40, -ch / 2 + 40);
    this.card.addChild(close);
    if (this.page === 'main') this.mainPage(cw, ch);
    else this.confirmPage(cw, ch);
  }

  private mainPage(cw: number, ch: number): void {
    const a = this.actions;
    const title = label('⚙️ Settings', 40);
    title.position.set(0, -ch / 2 + 44);
    this.card.addChild(title);
    const bw = Math.min(400, cw - 60), gap = 86;
    let y = -ch / 2 + 140;
    const row = (text: string, fill: number, onTap: () => void) => {
      const b = pillButton(text, onTap, bw, 70, fill);
      b.position.set(0, y);
      this.card.addChild(b);
      y += gap;
    };
    row(`🎵 Music: ${a.music() ? 'On' : 'Off'}`, a.music() ? GREEN : GREY, async () => {
      await a.toggleMusic();
      this.draw();
    });
    row(`🔔 Sounds: ${a.sounds() ? 'On' : 'Off'}`, a.sounds() ? GREEN : GREY, async () => {
      await a.toggleSounds();
      this.draw();
    });
    row(a.realistic() ? '📷 Look: Realistic' : '🧸 Look: Cute', COLORS.pink, () => void a.toggleLook());
    row('🌸 Title screen', COLORS.pink, () => {
      this.hide();
      a.title();
    });
    y += 14;
    row('🧹 Reset world', RED, () => {
      this.page = 'confirm';
      this.draw();
    });
  }

  private confirmPage(cw: number, ch: number): void {
    const head = label('Start a brand new world?', 30);
    head.position.set(-20, -ch / 2 + 60);
    const body = label('Built houses, moved things, secrets found, clothes you made and everyone\'s new looks all go back to how they started.\n\nThis can\'t be undone!', 22);
    body.style.wordWrap = true;
    body.style.wordWrapWidth = cw - 70;
    body.position.set(0, -ch / 2 + 180);
    this.card.addChild(head, body);
    const bw = Math.min(400, cw - 60);
    const keep = pillButton('💖 Keep my world', () => {
      this.page = 'main';
      this.draw();
    }, bw, 70, GREEN);
    keep.position.set(0, ch / 2 - 190);
    const hold = holdButton('Hold to reset 🧹', bw, 70, async () => {
      await this.actions.reset();
    });
    hold.position.set(0, ch / 2 - 90);
    this.card.addChild(keep, hold);
  }
}

/** A button that only fires after being held down for a couple of seconds, filling up as it's held. */
function holdButton(text: string, w: number, h: number, onDone: () => void): Container {
  const c = new Container();
  const bg = new Graphics().roundRect(-w / 2, -h / 2, w, h, h / 2).fill(RED).stroke({ color: COLORS.plum, width: 4 });
  const fill = new Graphics();
  const mask = new Graphics().roundRect(-w / 2, -h / 2, w, h, h / 2).fill(0xffffff);
  fill.mask = mask;
  const t = label(text, h * 0.4, COLORS.white);
  c.addChild(bg, fill, mask, t);
  // Timed by the clock, not by summed frame times (the ticker caps each frame, so a slow device would never finish).
  let held = 0, since = 0, holding = false, done = false;
  const tick = () => {
    if (!holding || done) return;
    held = Math.min(HOLD, (performance.now() - since) / 1000);
    fill.clear().rect(-w / 2, -h / 2, (w * held) / HOLD, h).fill({ color: 0x7a1010, alpha: 0.6 });
    if (held >= HOLD) {
      done = true;
      t.text = 'Resetting…';
      onDone();
    }
  };
  Ticker.shared.add(tick);
  c.on('destroyed', () => Ticker.shared.remove(tick));
  const stop = () => {
    holding = false;
    if (done) return;
    held = 0;
    fill.clear();
  };
  makeTappable(c, () => stop());
  c.on('pointerdown', () => {
    holding = true;
    since = performance.now();
  });
  c.on('pointerupoutside', stop);
  c.on('pointerleave', stop);
  return c;
}
