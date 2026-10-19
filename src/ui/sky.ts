// "You can choose weather" and "when sun, moon is clicked" day turns to night (and back).
import { Container, Graphics } from 'pixi.js';
import type { Game } from '../app/game.ts';
import { WEATHERS, type World } from '../world/state.ts';
import { COLORS, roundButton } from './kit.ts';

const WEATHER_EMOJI: Record<string, string> = { sunny: '☀️', rain: '🌧️', snow: '❄️', wind: '🍃', rainbow: '🌈', cloudy: '☁️' };

export class SkyControls {
  readonly view = new Container();
  private game: Game;
  private sunMoon = new Container();
  private picker = new Container();
  private weatherBtn = new Container();

  constructor(game: Game) {
    this.game = game;
    this.view.addChild(this.sunMoon, this.weatherBtn, this.picker);
    this.picker.visible = false;
    this.redraw();
  }

  private redraw(): void {
    const sky = this.game.world?.sky ?? { night: false, weather: 'sunny' };
    this.sunMoon.removeChildren();
    this.sunMoon.addChild(roundButton(sky.night ? '🌙' : '🌞', () => {
      this.game.setSky(!this.game.world.sky.night);
      this.redraw();
    }, 70, sky.night ? 0x2a2f6b : 0xfff3b0));
    this.weatherBtn.removeChildren();
    this.weatherBtn.addChild(roundButton(WEATHER_EMOJI[sky.weather] ?? '☀️', () => (this.picker.visible = !this.picker.visible), 70));
    this.weatherBtn.x = 86;
    this.picker.removeChildren();
    WEATHERS.forEach((w, i) => {
      const b = roundButton(WEATHER_EMOJI[w], () => {
        this.game.setSky(this.game.world.sky.night, w);
        this.picker.visible = false;
        this.redraw();
      }, 62, w === sky.weather ? COLORS.pinkLight : COLORS.white);
      b.position.set(86 + (i - (WEATHERS.length - 1) / 2) * 70, 80);
      this.picker.addChild(b);
    });
  }

  layout(w: number): void {
    this.redraw();
    // Left of the top-right "make" button, clear of the place name in the middle.
    this.view.position.set(w - 300, 56);
  }
}

type Drop = { x: number; y: number; v: number; s: number };

/** Rain, snow, leaves, a rainbow and a night tint drawn over the scene. */
export class WeatherLayer {
  readonly view = new Container();
  private tint = new Graphics();
  private fx = new Graphics();
  private drops: Drop[] = [];
  private sky: World['sky'] = { night: false, weather: 'sunny' };
  /** Places draw their own night (so lamps can glow); the map uses this tint. */
  nightTint = true;

  constructor() {
    this.view.addChild(this.tint, this.fx);
    this.view.eventMode = 'none';
  }

  set(sky: World['sky']): void {
    this.sky = sky;
    this.drops = [];
  }

  update(dt: number, w: number, h: number): void {
    this.tint.clear();
    if (this.sky.night && this.nightTint) this.tint.rect(0, 0, w, h).fill({ color: 0x1d2350, alpha: 0.32 });
    const g = this.fx.clear();
    const kind = this.sky.weather;
    if (kind === 'rainbow') {
      const colors = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0xb197fc];
      colors.forEach((c, i) => g.arc(w * 0.75, h * 0.6, h * 0.5 - i * 14, Math.PI, 0).stroke({ color: c, width: 14, alpha: 0.55 }));
      return;
    }
    if (kind === 'cloudy') {
      for (let i = 0; i < 4; i++) {
        const cx = ((performance.now() / 60 + i * 400) % (w + 300)) - 150, cy = 140 + (i % 2) * 60;
        g.circle(cx, cy, 40).circle(cx + 40, cy - 15, 50).circle(cx + 85, cy, 40).fill({ color: 0xffffff, alpha: 0.85 });
      }
      return;
    }
    const want = kind === 'rain' ? 140 : kind === 'snow' ? 90 : kind === 'wind' ? 30 : 0;
    while (this.drops.length < want) this.drops.push({ x: Math.random() * w, y: Math.random() * h, v: 0.6 + Math.random() * 0.8, s: Math.random() });
    if (this.drops.length > want) this.drops.length = want;
    for (const d of this.drops) {
      if (kind === 'rain') {
        d.y += 700 * d.v * dt;
        d.x -= 80 * dt;
        g.moveTo(d.x, d.y).lineTo(d.x - 4, d.y + 14).stroke({ color: 0x7cc8ff, width: 2.5, alpha: 0.8 });
      } else if (kind === 'snow') {
        d.y += 70 * d.v * dt;
        d.x += Math.sin((d.y + d.s * 100) / 30) * 20 * dt;
        g.circle(d.x, d.y, 3 + d.s * 4).fill({ color: COLORS.white, alpha: 0.9 });
      } else {
        d.x += 300 * d.v * dt;
        d.y += Math.sin(d.x / 40) * 40 * dt;
        g.ellipse(d.x, d.y, 9, 4).fill({ color: 0x8cd17d, alpha: 0.9 });
      }
      if (d.y > h + 20) d.y = -20;
      if (d.x > w + 20) d.x = -20;
      if (d.x < -20) d.x = w + 20;
    }
  }
}
