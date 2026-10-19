// A friendly message bubble at the top of the screen, optionally tappable.
import { Container, Graphics } from 'pixi.js';
import { COLORS, label, makeTappable } from './kit.ts';

export class Toast {
  readonly view = new Container();
  private left = 0;
  private w = 0;

  show(text: string, onTap?: () => void): void {
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    const t = label(text, 30);
    const bw = t.width + 60;
    const box = new Container();
    box.addChild(new Graphics().roundRect(-bw / 2, -34, bw, 68, 34).fill(COLORS.white).stroke({ color: COLORS.pink, width: 5 }), t);
    if (onTap) makeTappable(box, () => {
      this.left = 0;
      onTap();
    });
    this.view.addChild(box);
    this.view.position.set(this.w / 2, 120);
    this.view.alpha = 1;
    this.left = 3.5;
  }

  layout(w: number, _h: number): void {
    this.w = w;
    this.view.x = w / 2;
  }

  update(dt: number): void {
    if (this.left <= 0) {
      this.view.visible = false;
      return;
    }
    this.view.visible = true;
    this.left -= dt;
    this.view.alpha = Math.min(1, this.left * 2);
  }
}
