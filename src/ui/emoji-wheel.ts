// "When person clicked emojis show, when emoji pressed avatar feels that emotion."
import { Container, Graphics } from 'pixi.js';
import { emotions } from '../data/index.ts';
import type { Rig } from '../world/rig.ts';
import { categoryOf } from '../data/index.ts';
import { COLORS, roundButton } from './kit.ts';
import { playSound } from './sound.ts';

export class EmojiWheel {
  readonly view = new Container();
  open = false;

  show(rig: Rig, at: { x: number; y: number }, onEat: () => void, onDress: () => void): void {
    this.close();
    this.open = true;
    const list = [...emotions];
    const held = rig.holding;
    const canEat = held && ['food', 'drink'].includes(categoryOf(held));
    const n = list.length + (canEat ? 1 : 0) + 1;
    const r = Math.max(110, n * 13);
    const ring = new Graphics().circle(0, 0, r + 46).fill({ color: COLORS.white, alpha: 0.55 });
    this.view.addChild(ring);
    const buttons: Container[] = list.map((e) =>
      roundButton(e.emoji, () => {
        rig.feel(e);
        playSound(e.sound);
        this.close();
      }, 68),
    );
    if (canEat) {
      const eat = roundButton(categoryOf(held!) === 'drink' ? '🥤' : '😋', () => {
        onEat();
        this.close();
      }, 68, COLORS.pinkLight);
      eat.label = 'eat';
      buttons.unshift(eat);
    }
    // Change clothes right here.
    const dress = roundButton('👗', () => {
      this.close();
      onDress();
    }, 68, 0xfff3b0);
    dress.label = 'dress';
    buttons.unshift(dress);
    buttons.forEach((b, i) => {
      const a = -Math.PI / 2 + (i / buttons.length) * Math.PI * 2;
      b.position.set(Math.cos(a) * r, Math.sin(a) * r);
      this.view.addChild(b);
    });
    this.view.position.set(at.x, at.y);
    // Keep the wheel on screen.
    const parent = this.view.parent;
    if (parent) {
      const W = window.innerWidth, H = window.innerHeight, m = r + 50;
      this.view.position.set(Math.min(W - m, Math.max(m, at.x)), Math.min(H - m, Math.max(m, at.y)));
    }
    this.view.eventMode = 'static';
    ring.eventMode = 'static';
    ring.on('pointertap', () => this.close());
  }

  close(): void {
    this.open = false;
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
  }
}
