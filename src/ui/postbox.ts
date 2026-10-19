// "In post box place every day you get a gift" + "every day a new thing adds to the house decorations".
// The gift appears in the post office; the decoration waits in the inbox and appears in the next home you visit.
import { Container } from 'pixi.js';
import type { Game } from '../app/game.ts';
import { dailyId } from '../../schemas/daily.ts';
import { daily, items } from '../data/index.ts';
import { persist } from '../world/state.ts';
import { COLORS, roundButton } from './kit.ts';
import { playSound } from './sound.ts';

export const POST_OFFICE = 'post_office';

export function todayKey(now = new Date()): { key: string; id: string } {
  const id = dailyId(now.getMonth() + 1, now.getDate());
  return { key: `${now.getFullYear()}-${id}`, id };
}

export class PostBox {
  readonly view = new Container();
  private game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  refresh(): void {
    this.view.removeChildren();
    const place = this.game.place;
    if (!place) return;
    if (place.placeId === POST_OFFICE) {
      const { key } = todayKey();
      const ready = !this.game.world.claimed.includes(key);
      const b = roundButton(ready ? '📬' : '📪', () => this.open(), 110, ready ? COLORS.pinkLight : COLORS.white);
      this.view.addChild(b);
    }
    // Homes collect waiting decorations.
    if (place.placeId.startsWith('lot_') && this.game.world.inbox.length) {
      for (const id of this.game.world.inbox.splice(0)) place.spawn(id);
      this.game.toast.show('New decorations arrived! 🎁');
      persist(this.game.world);
    }
  }

  private open(): void {
    const w = this.game.world;
    const { key, id } = todayKey();
    if (w.claimed.includes(key)) {
      this.game.toast.show('Come back tomorrow for another gift! 💌');
      return;
    }
    const d = daily.get(id);
    w.claimed.push(key);
    if (d) {
      this.game.place?.spawn(d.gift);
      w.inbox.push(d.decor);
      this.game.toast.show(`🎁 ${items.get(d.gift)?.name ?? 'A gift'}! And a new decoration for your home 🏠`);
    }
    playSound('tada');
    persist(w);
    this.refresh();
  }

  layout(w: number, h: number): void {
    this.view.position.set(w / 2, h - 90);
  }
}
