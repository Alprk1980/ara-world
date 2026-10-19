// "Bottom right corner a button to get characters out of the people bar."
// The bar slides up; drag someone from it into the scene. Drag a person back onto it to put them away.
import { Container, Graphics, Rectangle, type FederatedPointerEvent } from 'pixi.js';
import type { Game } from '../app/game.ts';
import { Rig } from '../world/rig.ts';
import type { Person, Pet } from '../world/state.ts';
import { itemSprite, itemSize } from '../art/geometry.ts';
import { COLORS, label } from './kit.ts';

const H = 150;
const SLOT = 110;

export class PeopleBar {
  readonly view = new Container();
  private game: Game;
  private bg = new Graphics();
  private row = new Container();
  private hint = label('', 20);
  private ghost: Rig | null = null;
  private dragging: Person | null = null;
  private petGhost: { pet: Pet; view: Container } | null = null;
  private w = 0;
  private h = 0;
  private scroll = 0;
  open = false;

  constructor(game: Game) {
    this.game = game;
    this.view.addChild(this.bg, this.row, this.hint);
    this.view.visible = false;
    this.view.eventMode = 'static';
    this.view.on('globalpointermove', (e) => this.move(e));
    this.view.on('pointerup', (e) => this.drop(e));
    this.view.on('pointerupoutside', (e) => this.drop(e));
  }

  toggle(): void {
    this.open = !this.open;
    this.view.visible = this.open;
    this.refresh();
  }

  contains(p: { x: number; y: number }): boolean {
    return this.open && p.y > this.h - H - 20 && p.x > 110 && p.x < this.w - 110;
  }

  refresh(): void {
    if (!this.open || !this.game.world) return;
    this.row.removeChildren().forEach((c) => c.destroy({ children: true }));
    const place = this.game.place;
    const here = (p: Person) => place && p.at?.place === place.placeId;
    const list = this.game.world.people.filter((p) => !here(p));
    this.hint.text = place ? (list.length ? 'Drag someone into the room' : 'Everyone is here!') : 'Go into a place to bring people in';
    list.forEach((person, i) => {
      const slot = new Container();
      slot.addChild(new Graphics().roundRect(-SLOT / 2 + 4, -SLOT / 2, SLOT - 8, SLOT, 22).fill(COLORS.cream).stroke({ color: COLORS.plum, width: 3 }));
      const rig = new Rig(person);
      const s = (SLOT * 0.85) / rig.geo.height;
      rig.scale.set(s);
      rig.y = SLOT / 2 - 6;
      slot.addChild(rig);
      const name = label(person.name, 16);
      name.y = SLOT / 2 + 12;
      slot.addChild(name);
      slot.x = i * SLOT + SLOT / 2;
      slot.eventMode = 'static';
      slot.hitArea = new Rectangle(-SLOT / 2, -SLOT / 2, SLOT, SLOT);
      slot.on('pointerdown', (e) => this.pick(person, e));
      this.row.addChild(slot);
    });
    // Pets: each one can be brought into any place (a copy follows you around).
    this.game.world.pets.forEach((pet, j) => {
      const slot = new Container();
      slot.addChild(new Graphics().roundRect(-SLOT / 2 + 4, -SLOT / 2, SLOT - 8, SLOT, 22).fill(0xfff3d6).stroke({ color: COLORS.plum, width: 3 }));
      const s = itemSprite(pet.item);
      s.scale.set((s.scale.x * SLOT * 0.7) / itemSize(pet.item).h);
      s.y = SLOT / 2 - 10;
      slot.addChild(s);
      const name = label(pet.name, 16);
      name.y = SLOT / 2 + 12;
      slot.addChild(name);
      slot.x = (list.length + j) * SLOT + SLOT / 2;
      slot.eventMode = 'static';
      slot.hitArea = new Rectangle(-SLOT / 2, -SLOT / 2, SLOT, SLOT);
      slot.on('pointerdown', (e) => {
        e.stopPropagation();
        if (!this.game.place) return;
        const v = itemSprite(pet.item);
        v.scale.set((v.scale.x * 120) / itemSize(pet.item).h);
        v.position.set(e.global.x, e.global.y + 40);
        this.petGhost = { pet, view: v };
        this.view.addChild(v);
      });
      this.row.addChild(slot);
    });
    this.layout(this.w, this.h);
  }

  private pick(person: Person, e: FederatedPointerEvent): void {
    e.stopPropagation();
    if (!this.game.place) return;
    this.dragging = person;
    this.ghost = new Rig(person);
    this.ghost.scale.set(1.6);
    this.ghost.alpha = 0.85;
    this.ghost.position.set(e.global.x, e.global.y + 40);
    this.view.addChild(this.ghost);
  }

  private move(e: FederatedPointerEvent): void {
    if (this.ghost) this.ghost.position.set(e.global.x, e.global.y + 40);
    this.petGhost?.view.position.set(e.global.x, e.global.y + 40);
  }

  private drop(e: FederatedPointerEvent): void {
    const pg = this.petGhost;
    this.petGhost = null;
    if (pg) {
      pg.view.destroy();
      if (this.game.place && !this.contains(e.global)) this.game.place.spawnAt(pg.pet.item, { x: e.global.x, y: e.global.y + 40 });
      return;
    }
    const person = this.dragging;
    this.ghost?.destroy();
    this.ghost = null;
    this.dragging = null;
    const place = this.game.place;
    if (!person || !place || this.contains(e.global)) return;
    // Moving someone from another place brings them here.
    person.at = undefined;
    place.placePerson(person, { x: e.global.x, y: e.global.y + 40 });
    this.refresh();
  }

  layout(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.bg.clear().roundRect(110, h - H - 10, w - 220, H, 30).fill({ color: COLORS.white, alpha: 0.92 }).stroke({ color: COLORS.plum, width: 4 });
    this.row.position.set(130 + this.scroll, h - H / 2 - 20);
    this.hint.position.set(w / 2, h - H - 26);
  }
}
