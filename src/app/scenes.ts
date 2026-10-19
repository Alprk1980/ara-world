// A stack of scenes. The back button (top-left) pops one.
import { Container, type Application } from 'pixi.js';

export interface Scene {
  readonly name: string;
  readonly view: Container;
  /** Called after the scene is shown, and again whenever the screen size changes. */
  layout(width: number, height: number): void;
  update?(dt: number): void;
  /** Called when the scene leaves the stack for good. */
  destroy?(): void;
}

export class SceneStack {
  private stack: Scene[] = [];
  readonly root = new Container();
  private listeners: (() => void)[] = [];
  private app: Application;

  constructor(app: Application) {
    this.app = app;
    app.ticker.add((t) => this.top?.update?.(t.deltaMS / 1000));
  }

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }
  get depth(): number {
    return this.stack.length;
  }

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  push(scene: Scene): void {
    if (this.top) this.root.removeChild(this.top.view);
    this.stack.push(scene);
    this.show(scene);
  }

  /** Swap the top scene (e.g. travel between places without growing the back stack). */
  replace(scene: Scene): void {
    const old = this.stack.pop();
    if (old) {
      this.root.removeChild(old.view);
      old.destroy?.();
    }
    this.push(scene);
  }

  pop(): void {
    if (this.stack.length <= 1) return;
    const old = this.stack.pop()!;
    this.root.removeChild(old.view);
    old.destroy?.();
    this.show(this.top!);
  }

  relayout(): void {
    this.top?.layout(this.app.screen.width, this.app.screen.height);
  }

  private show(scene: Scene): void {
    this.root.addChildAt(scene.view, 0);
    scene.layout(this.app.screen.width, this.app.screen.height);
    for (const fn of this.listeners) fn();
  }
}
