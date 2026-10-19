// A place: floors stacked like a dollhouse (swipe up/down), things to drag anywhere, people to tap and feed.
import { Container, Graphics, Rectangle, Sprite, type FederatedPointerEvent } from 'pixi.js';
import type { Scene } from '../app/scenes.ts';
import type { Floor } from '../../schemas/place.ts';
import { WALL_HEIGHT, OUTDOOR_HEIGHT } from '../../schemas/place.ts';
import { categoryOf, houses, items, places } from '../data/index.ts';
import { anchorOffset, itemSize, itemSprite } from '../art/geometry.ts';
import { hexNum, shade } from '../art/color.ts';
import { dressFloor } from '../art/room-dressing.ts';
import { DISTRICT_AWNING } from '../art/house-art.ts';
import { label, roundButton } from '../ui/kit.ts';
import { playSound } from '../ui/sound.ts';
import { Rig } from './rig.ts';
import { floorsOf, persist, thingsOn, uid, type Person, type Thing } from './state.ts';
import type { Game } from '../app/game.ts';

const GROUND = 24;
const GAP = 70;
const HOLDABLE = new Set(['food', 'drink', 'toy', 'school', 'makeup', 'sport']);
const EDIBLE = new Set(['food', 'drink']);
/** Things that light up at night (by template id). */
const LIGHT = /lamp|light|lantern|candle|chandelier|torch|neon/;
/** Things you can sleep on (by template id). */
const BED = /bed|cot|crib|hammock|cradle/;
/** Things that hold clothes: tapping one opens the wardrobe for the nearest person. */
/** Emoji shown when picking a destination, by vehicle template. */
const VEHICLE_EMOJI: [RegExp, string][] = [[/bus/, '🚌'], [/train|tram/, '🚂'], [/plane|jet/, '✈️'], [/boat|ship/, '⛵'], [/taxi|car/, '🚗']];
const WARDROBE = /rack|wardrobe|closet|dresser|hanger|mannequin|clothes|uniform/;
type Drag = { kind: 'thing'; thing: Thing; sprite: Sprite; floor: number; dx: number; dy: number; gx: number; gy: number; at: number }
  | { kind: 'person'; person: Person; rig: Rig; floor: number; dx: number; dy: number }
  | { kind: 'pan'; startX: number; startY: number; camX: number; moved: boolean };

export class PlaceScene implements Scene {
  readonly name: string;
  readonly view = new Container();
  readonly placeId: string;
  private game: Game;
  private cam = new Container();
  private floorData: Floor[];
  private floorViews: Container[] = [];
  private floorTop: number[] = [];
  private rigs = new Map<string, Rig>();
  private floor = 0;
  private camY = 0;
  private camYTarget = 0;
  private scale = 1;
  private screen = { w: 0, h: 0 };
  private drag: Drag | null = null;
  private indicator = new Container();
  private title = label('', 30);
  /** Shown while dragging a thing: drop it here to tidy it away. */
  private bin = roundButton('🗑️', () => {}, 96, 0xffe3ef);

  constructor(game: Game, placeId: string) {
    this.game = game;
    this.placeId = placeId;
    this.name = `place:${placeId}`;
    this.floorData = floorsOf(game.world, placeId);
    this.view.eventMode = 'static';
    this.bin.visible = false;
    this.bin.eventMode = 'none';
    this.view.addChild(this.cam, this.indicator, this.title, this.bin);
    let top = 0;
    this.floorData.forEach((f, i) => {
      this.floorTop.push(top);
      const v = this.buildFloor(f, i);
      v.y = -top;
      this.cam.addChild(v);
      this.floorViews.push(v);
      top += (f.outdoor ? OUTDOOR_HEIGHT : WALL_HEIGHT) + GROUND + GAP;
    });
    this.view.on('pointerdown', (e) => this.downBackground(e));
    this.view.on('globalpointermove', (e) => this.move(e));
    this.view.on('pointerup', (e) => this.up(e));
    this.view.on('pointerupoutside', (e) => this.up(e));
    const p = places.get(placeId);
    const lot = game.world.lots[placeId];
    this.title.text = p ? `${p.emoji} ${p.name}` : `🏡 ${houses.get(lot?.house ?? '')?.name ?? 'Home'}`;
    // Homes open indoors (the garden is a swipe away).
    if (lot) {
      const indoor = this.floorData.findIndex((f) => !f.outdoor);
      if (indoor > 0) {
        this.floor = indoor;
        this.camYTarget = this.floorTop[indoor];
      }
    }
  }

  /** Whether the floor in view is outdoors (weather shows there). */
  get outdoorNow(): boolean {
    return !!this.floorData[this.floor]?.outdoor;
  }

  get floorIndex(): number {
    return this.floor;
  }

  private buildFloor(f: Floor, i: number): Container {
    const c = new Container();
    const H = f.outdoor ? OUTDOOR_HEIGHT : WALL_HEIGHT;
    const bg = new Graphics();
    if (f.outdoor) {
      const night = this.game.world.sky.night;
      bg.rect(-200, -H - 200, f.width + 400, H + 200).fill(night ? 0x1d2350 : 0xbfe6ff);
    } else {
      bg.rect(-200, -H - 30, f.width + 400, H + 30 + GROUND).fill(hexNum(shade(f.wall, -0.08)));
      bg.rect(0, -H, f.width, H).fill(hexNum(f.wall));
      // A skirting line and a ceiling line make it read as a room.
      bg.rect(0, -6, f.width, 6).fill(hexNum(shade(f.wall, -0.15)));
      bg.rect(0, -H - 6, f.width, 6).fill(hexNum(shade(f.wall, -0.2)));
    }
    bg.rect(f.outdoor ? -200 : 0, 0, f.width + (f.outdoor ? 400 : 0), GROUND).fill(hexNum(f.ground));
    c.addChild(bg);
    // Wallpaper, windows, a sign, floor pattern (or sky, hills and a fence outdoors).
    const place = places.get(this.placeId);
    c.addChild(dressFloor(f, {
      seed: `${this.placeId}:${i}`,
      accent: DISTRICT_AWNING[place?.district ?? 'homes'] ?? '#ff8fb8',
      night: this.game.world.sky.night,
      sign: place && i === 0 ? { emoji: place.emoji, name: place.name } : undefined,
    }));
    const things = new Container();
    things.label = 'things';
    c.addChild(things);
    // Things, lowest first so things on tables draw over the tables.
    for (const t of [...thingsOn(this.game.world, this.placeId, i)].sort((a, b) => a.y - b.y)) things.addChild(this.thingView(t, i));
    // People on this floor.
    for (const person of this.game.world.people) if (person.at?.place === this.placeId && person.at.floor === i) things.addChild(this.rigFor(person));
    // Hidden spots: invisible until tapped.
    (f.hidden ?? []).forEach((s, k) => {
      const key = `spot:${this.placeId}:${i}:${k}`;
      if (this.game.world.found.includes(key)) return;
      const spot = new Graphics().circle(0, 0, 14).fill({ color: 0xffffff, alpha: 0.001 });
      spot.position.set(s.x, -s.y);
      spot.eventMode = 'static';
      spot.on('pointertap', (e) => {
        e.stopPropagation();
        this.game.world.found.push(key);
        spot.destroy();
        this.sparkle(c, s.x, -s.y);
        if (s.reveal.item) this.addThing({ item: s.reveal.item, x: s.x, y: 0, uid: uid() }, i);
        if (s.reveal.place) this.game.found(s.reveal.place);
        persist(this.game.world);
      });
      c.addChild(spot);
    });
    // Night: the room dims and lights glow (drawn every frame so they follow lamps that are moved).
    if (this.game.world.sky.night) {
      const dark = new Graphics().rect(-200, -H - 200, f.width + 400, H + 200 + GROUND).fill({ color: 0x1d2350, alpha: f.outdoor ? 0.25 : 0.38 });
      const glows = new Graphics();
      glows.label = 'glows';
      dark.eventMode = glows.eventMode = 'none';
      c.addChild(dark, glows);
    }
    return c;
  }

  /** Redraw everything (day/night changed). The world state is untouched. */
  onSky(): void {
    this.rigs.clear();
    this.animals = [];
    this.cam.removeChildren().forEach((v) => v.destroy({ children: true }));
    this.floorViews = [];
    this.floorData.forEach((f, i) => {
      const v = this.buildFloor(f, i);
      v.y = -this.floorTop[i];
      this.cam.addChild(v);
      this.floorViews.push(v);
    });
  }

  /** Glows around lights at night, following where the lights are now. */
  private drawGlows(): void {
    if (!this.game.world.sky.night) return;
    this.floorViews.forEach((v, i) => {
      const g = v.getChildByLabel('glows') as Graphics | null;
      if (!g) return;
      g.clear();
      for (const t of thingsOn(this.game.world, this.placeId, i)) {
        if (!LIGHT.test(items.get(t.item)?.template ?? '')) continue;
        const h = itemSize(t.item).h;
        // A soft halo around the top of the light: a few rings fading outwards.
        const r = Math.min(40, Math.max(16, h * 0.3)), cy = -t.y - h * 0.78;
        for (const [k, a] of [[1.6, 0.12], [1.25, 0.18], [0.9, 0.26]] as const) g.circle(t.x, cy, r * k).fill({ color: 0xffc94d, alpha: a });
      }
    });
  }

  private thingView(t: Thing, floor: number): Sprite {
    const s = itemSprite(t.item);
    s.position.set(t.x, -t.y);
    s.eventMode = 'static';
    s.cursor = 'grab';
    if (categoryOf(t.item) === 'animal') this.animals.push({ t, s, phase: Math.random() * 6 });
    s.on('pointerdown', (e) => {
      e.stopPropagation();
      const p = this.toFloor(e, floor);
      this.drag = { kind: 'thing', thing: t, sprite: s, floor, dx: t.x - p.x, dy: t.y - p.y, gx: e.global.x, gy: e.global.y, at: performance.now() };
      s.parent?.addChild(s);
      s.scale.set(s.scale.x * 1.08);
      this.bin.visible = true;
    });
    return s;
  }

  private rigFor(person: Person): Rig {
    const rig = new Rig(person);
    this.rigs.set(person.id, rig);
    rig.position.set(person.at?.x ?? 100, -(person.at?.y ?? 0));
    if (person.holding) rig.hold(person.holding, () => this.bite(person, rig));
    rig.eventMode = 'static';
    rig.cursor = 'grab';
    const height = rig.geo.height;
    rig.hitArea = new Rectangle(-rig.geo.b.torsoW * 0.8, -height, rig.geo.b.torsoW * 1.6, height);
    // Someone left sitting (or sleeping) stays that way when you come back.
    if (person.at && person.at.y > 4) this.settlePerson(person, rig);
    let downAt = 0, downX = 0, downY = 0;
    rig.on('pointerdown', (e) => {
      e.stopPropagation();
      downAt = performance.now();
      downX = e.global.x;
      downY = e.global.y;
      const floor = person.at!.floor;
      const p = this.toFloor(e, floor);
      this.drag = { kind: 'person', person, rig, floor, dx: person.at!.x - p.x, dy: person.at!.y - p.y };
    });
    rig.on('pointerup', (e) => {
      const still = Math.hypot(e.global.x - downX, e.global.y - downY) < 12 && performance.now() - downAt < 400;
      if (still) {
        this.drag = null;
        this.settlePerson(person, rig);
        this.game.showEmojis(rig, e.global, () => this.feed(person, rig));
      }
    });
    return rig;
  }

  /** Bring someone out of the people bar into this scene at a screen point. */
  placePerson(person: Person, global: { x: number; y: number }): void {
    const p = this.toFloorXY(global, this.floor);
    person.at = { place: this.placeId, floor: this.floor, x: clamp(p.x, 10, this.floorData[this.floor].width - 10), y: Math.max(0, p.y) };
    const rig = this.rigFor(person);
    this.thingsLayer(this.floor).addChild(rig);
    this.settlePerson(person, rig);
    persist(this.game.world);
  }

  removePerson(person: Person): void {
    this.rigs.get(person.id)?.destroy();
    this.rigs.delete(person.id);
  }

  private thingsLayer(floor: number): Container {
    return this.floorViews[floor].getChildByLabel('things') as Container;
  }

  private addThing(t: Thing, floor: number): void {
    thingsOn(this.game.world, this.placeId, floor).push(t);
    this.thingsLayer(floor).addChild(this.thingView(t, floor));
  }

  /** Put a new item in the scene (from the post box, a gift, or a hidden spot). */
  spawn(itemId: string): void {
    const x = clamp(-this.cam.x / this.scale + this.screen.w / this.scale / 2, 20, this.floorData[this.floor].width - 20);
    this.addThing({ item: itemId, x, y: 0, uid: uid() }, this.floor);
    persist(this.game.world);
  }

  /** Drop a new item at a screen point (a pet from the people bar). */
  spawnAt(itemId: string, global: { x: number; y: number }): void {
    const p = this.toFloorXY(global, this.floor);
    const t: Thing = { item: itemId, x: p.x, y: Math.max(0, p.y), uid: uid() };
    this.addThing(t, this.floor);
    const s = this.thingsLayer(this.floor).children.at(-1) as Sprite;
    this.dropThing(t, s, this.floor);
    persist(this.game.world);
  }

  private feed(person: Person, rig: Rig): void {
    if (person.holding && EDIBLE.has(categoryOf(person.holding))) rig.eat();
  }

  private bite(person: Person, rig: Rig): void {
    const left = (person.bitesLeft ?? items.get(person.holding ?? '')?.bites ?? 1) - 1;
    if (left <= 0) {
      person.holding = undefined;
      person.bitesLeft = undefined;
      rig.hold(null);
    } else person.bitesLeft = left;
    persist(this.game.world);
  }

  // ---- input

  private toFloorXY(global: { x: number; y: number }, floor: number): { x: number; y: number } {
    const local = this.floorViews[floor].toLocal(global);
    return { x: local.x, y: -local.y };
  }
  private toFloor(e: FederatedPointerEvent, floor: number) {
    return this.toFloorXY(e.global, floor);
  }

  private downBackground(e: FederatedPointerEvent): void {
    this.drag = { kind: 'pan', startX: e.global.x, startY: e.global.y, camX: this.cam.x, moved: false };
  }

  private move(e: FederatedPointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (d.kind === 'pan') {
      const dx = e.global.x - d.startX, dy = e.global.y - d.startY;
      if (Math.abs(dx) > 8) d.moved = true;
      if (Math.abs(dy) < Math.abs(dx)) this.cam.x = this.clampCamX(d.camX + dx);
      return;
    }
    const p = this.toFloor(e, d.floor);
    if (d.kind === 'thing') {
      d.thing.x = p.x + d.dx;
      d.thing.y = p.y + d.dy;
      d.sprite.position.set(d.thing.x, -d.thing.y);
    } else {
      d.person.at!.x = p.x + d.dx;
      d.person.at!.y = p.y + d.dy;
      d.rig.position.set(d.person.at!.x, -d.person.at!.y);
    }
  }

  private up(e: FederatedPointerEvent): void {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (d.kind === 'pan') {
      // A mostly-vertical swipe changes floor: up goes up a floor.
      const dy = e.global.y - d.startY, dx = e.global.x - d.startX;
      if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5) this.goFloor(this.floor + (dy > 0 ? 1 : -1));
      return;
    }
    this.bin.visible = false;
    if (d.kind === 'thing') {
      d.sprite.scale.set(d.sprite.scale.x / 1.08);
      if (Math.hypot(e.global.x - this.bin.x, e.global.y - this.bin.y) < 60) {
        this.removeThing(d.thing, d.floor);
        this.sparkle(this.floorViews[d.floor], d.thing.x, -d.thing.y);
        d.sprite.destroy();
        playSound('pop');
        persist(this.game.world);
        return;
      }
      const tap = Math.hypot(e.global.x - d.gx, e.global.y - d.gy) < 10 && performance.now() - d.at < 350;
      if (tap) {
        // A tap: the thing goes back where it was and does a happy little bounce.
        d.sprite.position.set(d.thing.x, -d.thing.y);
        this.bounce(d.sprite);
        playSound(categoryOf(d.thing.item) === 'animal' ? 'giggle' : 'pop');
        if (WARDROBE.test(items.get(d.thing.item)?.template ?? '')) this.openWardrobeNear(d.thing.x, d.floor);
        return;
      }
      this.dropThing(d.thing, d.sprite, d.floor);
    } else {
      if (this.game.overPeopleBar(e.global)) {
        d.person.at = undefined;
        this.removePerson(d.person);
        this.game.refreshPeopleBar();
        persist(this.game.world);
        return;
      }
      // Dropped onto a vehicle: off they go (after picking where).
      const v = this.vehicleAt(d.person.at!.x, d.floor);
      if (v) {
        this.settlePerson(d.person, d.rig);
        this.game.travel(d.person, VEHICLE_EMOJI.find(([re]) => re.test(items.get(v.item)?.template ?? ''))?.[1] ?? '🚗');
        return;
      }
      this.settlePerson(d.person, d.rig);
    }
    persist(this.game.world);
  }

  private dropThing(t: Thing, s: Sprite, floor: number): void {
    const cat = categoryOf(t.item);
    const f = this.floorData[floor];
    // Onto a person: holdable things go to the hand; food dropped on the mouth gets eaten.
    if (HOLDABLE.has(cat)) {
      for (const person of this.game.world.people) {
        const rig = this.rigs.get(person.id);
        if (!rig || person.at?.floor !== floor) continue;
        const lx = t.x - person.at.x, ly = -(t.y - person.at.y);
        if (Math.abs(lx) < rig.geo.b.torsoW && ly < 4 && ly > -rig.geo.height) {
          if (person.holding) this.addThing({ item: person.holding, x: person.at.x + 14, y: 0, uid: uid() }, floor);
          person.holding = t.item;
          person.bitesLeft = undefined;
          rig.hold(t.item, () => this.bite(person, rig));
          const m = rig.mouthPos();
          if (EDIBLE.has(cat) && Math.hypot(lx - m.x, ly - m.y) < rig.geo.b.headR * 1.4) rig.eat();
          this.removeThing(t, floor);
          s.destroy();
          return;
        }
      }
    }
    t.x = clamp(t.x, itemSize(t.item).w / 2, f.width - itemSize(t.item).w / 2);
    // Wall things stay where they are put; everything else lands on a surface or the floor.
    const onWall = items.get(t.item)?.tags.includes('wall') && t.y > 10;
    if (!onWall) t.y = this.surfaceBelow(t.x, t.y, floor, t);
    s.position.set(t.x, -t.y);
  }

  /** Height of the highest table-top (a 'top' anchor) under x that is below y, else the floor. */
  private surfaceBelow(x: number, y: number, floor: number, self?: Thing): number {
    let best = 0;
    for (const o of thingsOn(this.game.world, this.placeId, floor)) {
      if (o === self) continue;
      const top = anchorOffset(o.item, 'top');
      if (!top) continue;
      const w = itemSize(o.item).w;
      const h = o.y - top.y;
      if (Math.abs(x - o.x) < w / 2 && h <= y + 8 && h > best) best = h;
    }
    return best;
  }

  private settlePerson(person: Person, rig: Rig): void {
    const at = person.at!;
    const f = this.floorData[at.floor];
    at.x = clamp(at.x, 8, f.width - 8);
    // Sit on a seat if dropped near one, else stand on the floor.
    let y = 0;
    let bed = false;
    for (const o of thingsOn(this.game.world, this.placeId, at.floor)) {
      const seat = anchorOffset(o.item, 'seat');
      if (seat && Math.abs(o.x + seat.x - at.x) < 14 && at.y > 4) {
        at.x = o.x + seat.x;
        y = o.y - seat.y - rig.geo.b.legH * 0.6;
        bed = BED.test(items.get(o.item)?.template ?? '');
        break;
      }
    }
    rig.asleep = bed;
    // Sleepers lie down along the bed (only the drawing turns; the saved spot stays the seat).
    rig.rotation = bed ? -Math.PI / 2 : 0;
    at.y = Math.max(0, y);
    if (bed) rig.position.set(at.x + rig.geo.height / 2, -(at.y + rig.geo.b.legH * 0.6 + rig.geo.b.torsoW * 0.45));
    else rig.position.set(at.x, -at.y);
  }

  private removeThing(t: Thing, floor: number): void {
    const list = thingsOn(this.game.world, this.placeId, floor);
    const i = list.indexOf(t);
    if (i >= 0) list.splice(i, 1);
  }

  private animals: { t: Thing; s: Sprite; phase: number }[] = [];

  /** A vehicle standing at x on a floor, if any. */
  private vehicleAt(x: number, floor: number): Thing | null {
    for (const t of thingsOn(this.game.world, this.placeId, floor))
      if (categoryOf(t.item) === 'vehicle' && Math.abs(t.x - x) < itemSize(t.item).w / 2) return t;
    return null;
  }

  /** The nearest person on a floor gets the wardrobe; with nobody here, a hint. */
  private openWardrobeNear(x: number, floor: number): void {
    let best: Rig | null = null, bestD = Infinity;
    for (const p of this.game.world.people) {
      const rig = this.rigs.get(p.id);
      if (!rig || p.at?.floor !== floor) continue;
      const d = Math.abs(p.at.x - x);
      if (d < bestD) [best, bestD] = [rig, d];
    }
    if (best) this.game.dress(best);
    else this.game.toast.show('Bring someone here to try clothes on! 👪');
  }

  private bounce(s: Sprite): void {
    const sx = s.scale.x, sy = s.scale.y;
    let t = 0;
    const tick = (dt: number) => {
      if (s.destroyed) {
        this.updates.delete(tick);
        return;
      }
      t += dt;
      const k = Math.sin(Math.min(1, t / 0.35) * Math.PI);
      s.scale.set(sx * (1 - k * 0.08), sy * (1 + k * 0.15));
      if (t >= 0.35 || s.destroyed) {
        if (!s.destroyed) s.scale.set(sx, sy);
        this.updates.delete(tick);
      }
    };
    this.updates.add(tick);
  }

  private sparkle(c: Container, x: number, y: number): void {
    const s = label('✨', 40);
    s.position.set(x, y);
    s.scale.set(0.5);
    c.addChild(s);
    let t = 0;
    const tick = (dt: number) => {
      if (s.destroyed) {
        this.updates.delete(tick);
        return;
      }
      t += dt;
      s.y = y - t * 40;
      s.alpha = 1 - t;
      if (t >= 1) {
        this.updates.delete(tick);
        s.destroy();
      }
    };
    this.updates.add(tick);
  }
  private updates = new Set<(dt: number) => void>();

  goFloor(i: number): void {
    if (i < 0 || i >= this.floorData.length || i === this.floor) return;
    this.floor = i;
    this.camYTarget = this.floorTop[i];
    this.drawIndicator();
  }

  private clampCamX(x: number): number {
    const width = (this.floorData[this.floor]?.width ?? 400) * this.scale;
    const margin = this.screen.w * 0.12;
    if (width + margin * 2 < this.screen.w) return (this.screen.w - width) / 2;
    return clamp(x, this.screen.w - width - margin, margin);
  }

  private drawIndicator(): void {
    this.indicator.removeChildren();
    const n = this.floorData.length;
    if (n < 2) return;
    for (let i = 0; i < n; i++) {
      const dot = new Graphics().circle(0, 0, i === this.floor ? 11 : 7).fill(i === this.floor ? 0xff8fb8 : 0xffffff).stroke({ color: 0x5a3d4f, width: 3 });
      dot.y = (n - 1 - i) * 30;
      dot.eventMode = 'static';
      dot.on('pointertap', (e) => {
        e.stopPropagation();
        this.goFloor(i);
      });
      this.indicator.addChild(dot);
    }
    const name = label(this.floorData[this.floor].name, 20);
    name.anchor.set(1, 0.5);
    name.position.set(-20, (n - 1 - this.floor) * 30);
    this.indicator.addChild(name);
  }

  layout(w: number, h: number): void {
    this.screen = { w, h };
    this.scale = h / (WALL_HEIGHT + GROUND + 60);
    this.cam.scale.set(this.scale);
    this.view.hitArea = new Rectangle(0, 0, w, h);
    this.cam.x = this.clampCamX(this.cam.x || (w - (this.floorData[0]?.width ?? 400) * this.scale) / 2);
    this.camY = this.camYTarget;
    this.cam.y = h - GROUND * this.scale - 20 + this.camY * this.scale;
    this.indicator.position.set(w - 40, h / 2 - this.floorData.length * 15);
    this.title.position.set(w / 2, 36);
    this.bin.position.set(w / 2 - 150, h - 70);
    this.drawIndicator();
  }

  update(dt: number): void {
    if (Math.abs(this.camY - this.camYTarget) > 0.5) {
      this.camY += (this.camYTarget - this.camY) * Math.min(1, dt * 8);
      this.cam.y = this.screen.h - GROUND * this.scale - 20 + this.camY * this.scale;
      this.cam.x = this.clampCamX(this.cam.x);
    }
    for (const r of this.rigs.values()) r.update(dt);
    // Pets and animals wiggle and hop a little now and then.
    const now = performance.now() / 1000;
    for (const a of this.animals) {
      if (a.s.destroyed || this.drag?.kind === 'thing' && this.drag.sprite === a.s) continue;
      const k = now * 2 + a.phase;
      a.s.rotation = Math.sin(k * 1.7) * 0.04;
      a.s.y = -a.t.y - Math.max(0, Math.sin(k)) ** 8 * 4;
    }
    this.drawGlows();
    for (const u of this.updates) u(dt);
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
