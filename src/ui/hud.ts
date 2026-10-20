// The four corner buttons from the notes, shown over every play scene.
//   top-left: back (⚙️ settings on the town map) · top-right: make people/pets/clothes · bottom-right: people bar · bottom-left: hammer (build)
import { Container } from 'pixi.js';
import { roundButton } from './kit.ts';

export type HudActions = { back(): void; settings(): void; create(): void; people(): void; build(): void };

export class Hud {
  readonly view = new Container();
  readonly back: Container;
  readonly settings: Container;
  readonly create: Container;
  readonly people: Container;
  readonly build: Container;
  /** Extra controls a scene may add (e.g. the sky's sun/moon and weather). */
  readonly extras = new Container();

  constructor(actions: HudActions) {
    this.back = roundButton('⬅️', actions.back);
    this.settings = roundButton('⚙️', actions.settings);
    this.create = roundButton('✨', actions.create);
    this.people = roundButton('👪', actions.people);
    this.build = roundButton('🔨', actions.build);
    this.view.addChild(this.extras, this.back, this.settings, this.create, this.people, this.build);
  }

  layout(w: number, h: number): void {
    const m = 56;
    this.back.position.set(m, m);
    this.settings.position.set(m, m);
    this.create.position.set(w - m, m);
    this.people.position.set(w - m, h - m);
    this.build.position.set(m, h - m);
  }

  set visible(v: boolean) {
    this.view.visible = v;
  }
}
