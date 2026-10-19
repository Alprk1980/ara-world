// Dress someone where they are: a panel of clothes that fit their age, opened from the emoji wheel (👗) or by tapping
// a clothes rack / wardrobe in a room. "Lots of tops, bottoms, socks, shoes, dresses and much more to choose from."
import { Container, Graphics, Rectangle } from 'pixi.js';
import { OUTFIT_SLOTS } from '../../schemas/character.ts';
import { items, templates } from '../data/index.ts';
import type { Rig } from '../world/rig.ts';
import type { Person } from '../world/state.ts';
import { templateThumb } from './creator.ts';
import { COLORS, label, pillButton, roundButton } from './kit.ts';
import { ScrollGrid, type Cell } from './scroll-grid.ts';
import { playSound } from './sound.ts';

const SLOT_EMOJI: Record<string, string> = { top: '👕', bottom: '👖', dress: '👗', socks: '🧦', shoes: '👟', hat: '👒', glasses: '👓', bag: '🎒' };
type Slot = (typeof OUTFIT_SLOTS)[number];

/** Clothes for a slot that fit an age (items without an age list fit everyone). */
export function clothesFor(slot: string, age: string): string[] {
  return [...items.values()].filter((it) => templates.get(it.template)?.category === slot && (!it.ages || it.ages.includes(age))).map((it) => it.id);
}

/** Put an item on (or take a slot off with null); a dress replaces top and bottom and the other way round. */
export function wear(person: Person, slot: Slot, itemId: string | null): void {
  if (!itemId) {
    delete person.outfit[slot];
    return;
  }
  person.outfit[slot] = itemId;
  if (slot === 'dress') {
    delete person.outfit.top;
    delete person.outfit.bottom;
  }
  if (slot === 'top' || slot === 'bottom') delete person.outfit.dress;
}

export class Wardrobe {
  readonly view = new Container();
  open = false;
  private grid = new ScrollGrid();
  private tabs = new Container();
  private bg = new Graphics();
  private title = label('', 30);
  private close = roundButton('✖️', () => this.hide(), 60);
  private slot: Slot = 'top';
  private rig: Rig | null = null;
  private onChange: () => void = () => {};
  private size = { w: 0, h: 0 };

  constructor() {
    this.view.addChild(this.bg, this.title, this.tabs, this.grid.view, this.close);
    this.view.visible = false;
    this.view.eventMode = 'static';
    // Swallow taps on the panel so they don't reach the room underneath.
    this.view.on('pointerdown', (e) => e.stopPropagation());
  }

  show(rig: Rig, onChange: () => void): void {
    this.rig = rig;
    this.onChange = onChange;
    this.open = true;
    this.view.visible = true;
    this.draw();
  }

  hide(): void {
    this.open = false;
    this.view.visible = false;
    this.rig = null;
  }

  layout(w: number, h: number): void {
    this.size = { w, h };
    if (this.open) this.draw();
  }

  private draw(): void {
    const { w, h } = this.size;
    // Open on the side of the screen away from the person, so you can watch them change.
    const pw = Math.min(560, w * 0.48), y0 = 110, ph = h - 230;
    const onRight = (this.rig?.getGlobalPosition().x ?? 0) > w / 2;
    const x0 = onRight ? 20 + 90 : w - pw - 20;
    this.bg.clear().roundRect(x0, y0, pw, ph, 30).fill(COLORS.cream).stroke({ color: COLORS.plum, width: 4 });
    this.view.hitArea = new Rectangle(x0, y0, pw, ph);
    const person = this.rig?.person;
    if (!person) return;
    this.title.text = `👗 ${person.name}'s clothes`;
    this.title.position.set(x0 + pw / 2, y0 + 34);
    this.close.position.set(x0 + pw - 30, y0 + 30);
    this.tabs.removeChildren();
    OUTFIT_SLOTS.forEach((s, i) => {
      const b = pillButton(SLOT_EMOJI[s], () => {
        this.slot = s;
        this.draw();
      }, 56, 52, s === this.slot ? COLORS.pink : COLORS.white);
      b.position.set(x0 + 40 + (i % 8) * 62, y0 + 94);
      this.tabs.addChild(b);
    });
    this.grid.view.position.set(x0 + 10, y0 + 130);
    this.grid.resize(pw - 20, ph - 140);
    const worn = person.outfit[this.slot];
    const cells: Cell[] = [
      { selected: !worn, draw: () => label('🚫', 40), onTap: () => this.pick(null) },
      ...clothesFor(this.slot, person.age).map((id) => ({
        selected: worn === id,
        draw: () => templateThumb(items.get(id)!.template, items.get(id)!.palette, 84),
        onTap: () => this.pick(id),
      })),
    ];
    this.grid.set(cells, 104);
  }

  private pick(itemId: string | null): void {
    const rig = this.rig;
    if (!rig) return;
    wear(rig.person, this.slot, itemId);
    rig.draw();
    playSound('pop');
    this.onChange();
    this.draw();
  }
}
