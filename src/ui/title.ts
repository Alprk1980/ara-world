// The notes: "to play open app. screen will be pink with roses and a play button."
import { Container, Graphics, Sprite } from 'pixi.js';
import type { Scene } from '../app/scenes.ts';
import { textureFor } from '../art/textures.ts';
import { templates } from '../data/index.ts';
import { COLORS, label, pillButton } from './kit.ts';

const ROSE_COLOURS = [
  { main: '#ff4f8b', trim: '#3fa66b', accent: '#ffb3cf', outline: '#7a2348' },
  { main: '#ff8fb8', trim: '#4cb87a', accent: '#ffe0ec', outline: '#7a2348' },
  { main: '#e8336f', trim: '#3a9a5f', accent: '#ff8fb8', outline: '#6b1d3d' },
];

export class TitleScene implements Scene {
  readonly name = 'title';
  readonly view = new Container();
  private bg = new Graphics();
  private roses = new Container();
  private title = label('ARA World', 96, COLORS.white);
  private play: Container;
  private t = 0;

  constructor(onPlay: () => void) {
    this.play = pillButton('▶  Play', onPlay, 300, 100);
    this.title.style.stroke = { color: COLORS.plum, width: 10, join: 'round' };
    this.view.addChild(this.bg, this.roses, this.title, this.play);
  }

  layout(w: number, h: number): void {
    this.bg.clear().rect(0, 0, w, h).fill(COLORS.pinkLight);
    this.title.position.set(w / 2, h * 0.36);
    this.play.position.set(w / 2, h * 0.62);
    this.placeRoses(w, h);
  }

  /** Roses around the border, drawn from whichever rose templates the model has made. */
  private placeRoses(w: number, h: number): void {
    this.roses.removeChildren();
    const roseIds = [...templates.keys()].filter((id) => id.includes('rose'));
    if (roseIds.length === 0) return;
    const size = Math.min(w, h) * 0.2;
    const spots: [number, number][] = [];
    for (let x = size * 0.4; x < w; x += size * 0.8) spots.push([x, size * 0.3], [x, h - size * 0.3]);
    for (let y = size * 1.1; y < h - size; y += size * 0.8) spots.push([size * 0.3, y], [w - size * 0.3, y]);
    spots.forEach(([x, y], i) => {
      const s = new Sprite();
      s.anchor.set(0.5);
      s.width = s.height = size;
      s.position.set(x, y);
      s.rotation = ((i * 37) % 40 - 20) * (Math.PI / 180);
      textureFor(roseIds[i % roseIds.length], ROSE_COLOURS[i % ROSE_COLOURS.length]).then((t) => {
        if (s.destroyed) return;
        s.texture = t;
        s.width = s.height = size;
      });
      this.roses.addChild(s);
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.play.scale.set(1 + Math.sin(this.t * 3) * 0.04);
  }
}
