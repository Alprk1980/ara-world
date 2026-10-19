// "On top right corner you can make people, pets and clothes. Lots of tops, bottoms, socks, shoes, dresses and much more."
import { Container, Graphics, Sprite } from 'pixi.js';
import type { Scene } from '../app/scenes.ts';
import type { Game } from '../app/game.ts';
import type { Item } from '../../schemas/item.ts';
import { OUTFIT_SLOTS, SKIN_TONES } from '../../schemas/character.ts';
import { AGE_GROUPS } from '../../schemas/vocab.ts';
import { items, names, templates } from '../data/index.ts';
import { textureFor } from '../art/textures.ts';
import { itemSprite, itemSize } from '../art/geometry.ts';
import { Rig } from '../world/rig.ts';
import { persist, uid, type Person } from '../world/state.ts';
import { COLORS, label, pillButton } from './kit.ts';
import { ScrollGrid, type Cell } from './scroll-grid.ts';
import { playSound } from './sound.ts';

const SWATCHES = ['#ff8fb8', '#ff4f8b', '#e63946', '#ff9f43', '#ffd36e', '#fff3b0', '#8ce99a', '#3fa66b', '#7fd1c7', '#74c0fc', '#3a6ea5', '#b197fc', '#7b4fa0', '#ffffff', '#c9c9c9', '#3a3a3a', '#8b5e3c', '#f4d6c6'];
const HAIR_COLOURS = ['#2b1d14', '#5a3825', '#8b5e3c', '#c68642', '#e8c07d', '#f5e1a4', '#d94f2b', '#b0b0b0', '#ffffff', '#ff8fb8', '#b197fc', '#74c0fc'];
const EYE_COLOURS = ['#3a2a2a', '#5a3825', '#3a6ea5', '#3fa66b', '#7b6a58', '#7b4fa0'];
const AGE_EMOJI: Record<string, string> = { baby: '👶', toddler: '🧒', kid: '👧', teen: '🧑', adult: '👩', elder: '👵' };
const SLOT_EMOJI: Record<string, string> = { top: '👕', bottom: '👖', dress: '👗', socks: '🧦', shoes: '👟', hat: '👒', glasses: '👓', bag: '🎒' };
type Tab = 'people' | 'pets' | 'clothes';

export class CreatorScene implements Scene {
  readonly name = 'creator';
  readonly view = new Container();
  private game: Game;
  private bg = new Graphics();
  private preview = new Container();
  private tabs = new Container();
  private sections = new Container();
  private grid = new ScrollGrid();
  private done: Container;
  private tab: Tab = 'people';
  private section = 'age';
  private person: Person;
  private pet: { item: string; name: string } | null = null;
  private cloth: { template: string; palette: Item['palette']; slot: 'main' | 'trim' | 'accent' } | null = null;
  private size = { w: 0, h: 0 };

  constructor(game: Game) {
    this.game = game;
    const firstHair = [...templates.values()].find((t) => t.category === 'hair');
    this.person = {
      kind: 'person', id: uid('p'), name: randomName(), age: 'kid', skin: SKIN_TONES[2], eyes: EYE_COLOURS[0],
      hair: { template: firstHair?.id ?? '', colour: HAIR_COLOURS[1] }, outfit: {},
    };
    this.dressDefaults();
    this.done = pillButton('✔ Done', () => this.finish(), 200, 70);
    this.view.addChild(this.bg, this.preview, this.tabs, this.sections, this.grid.view, this.done);
  }

  private dressDefaults(): void {
    for (const slot of ['top', 'bottom', 'shoes'] as const) {
      const it = wearables(slot, this.person.age)[0];
      if (it) this.person.outfit[slot] = it.id;
    }
  }

  layout(w: number, h: number): void {
    this.size = { w, h };
    this.bg.clear().rect(0, 0, w, h).fill(COLORS.pinkLight).roundRect(w * 0.36, 110, w * 0.62, h - 130, 30).fill(COLORS.cream).stroke({ color: COLORS.plum, width: 4 });
    this.done.position.set(w * 0.18, h - 70);
    this.drawTabs();
    this.show();
  }

  private drawTabs(): void {
    const { w } = this.size;
    this.tabs.removeChildren();
    (['people', 'pets', 'clothes'] as Tab[]).forEach((t, i) => {
      const b = pillButton({ people: '🧍 People', pets: '🐶 Pets', clothes: '👗 Clothes' }[t], () => {
        this.tab = t;
        this.section = t === 'people' ? 'age' : t === 'pets' ? 'pet' : 'template';
        this.drawTabs();
        this.show();
      }, 180, 60, t === this.tab ? COLORS.pink : 0xd9a3bb);
      b.position.set(w * 0.36 + 110 + i * 195, 66);
      this.tabs.addChild(b);
    });
  }

  private show(): void {
    this.drawSections();
    this.drawPreview();
    const rows = Math.ceil(this.sectionList().length / Math.max(1, Math.floor((this.size.w * 0.62 - 40) / 62)));
    const top = 200 + (rows - 1) * 62;
    this.grid.view.position.set(this.size.w * 0.36 + 10, top);
    this.grid.resize(this.size.w * 0.62 - 20, this.size.h - top - 40);
    this.grid.set(this.cells(), 110);
  }

  private sectionList(): [string, string][] {
    if (this.tab === 'people') {
      const s: [string, string][] = [['age', '🎂'], ['skin', '🎨'], ['hair', '💇'], ['hairColour', '🌈'], ['eyes', '👀'], ['name', '🔤']];
      for (const slot of OUTFIT_SLOTS) s.push([slot, SLOT_EMOJI[slot]]);
      return s;
    }
    if (this.tab === 'pets') return [['pet', '🐾'], ['name', '🔤']];
    return [['template', '✂️'], ['main', '1️⃣'], ['trim', '2️⃣'], ['accent', '3️⃣']];
  }

  private drawSections(): void {
    this.sections.removeChildren();
    const list = this.sectionList();
    const x0 = this.size.w * 0.36 + 30;
    const perRow = Math.max(1, Math.floor((this.size.w * 0.62 - 40) / 62));
    list.forEach(([id, emoji], i) => {
      const b = pillButton(emoji, () => {
        if (id === 'name') return this.rename();
        this.section = id;
        this.show();
      }, 56, 56, id === this.section ? COLORS.pink : COLORS.white);
      b.position.set(x0 + (i % perRow) * 62 + 28, 160 + Math.floor(i / perRow) * 62);
      this.sections.addChild(b);
    });
  }

  private cells(): Cell[] {
    const p = this.person;
    const swatches = (list: readonly string[], current: string, set: (c: string) => void): Cell[] =>
      list.map((c) => ({ selected: c === current, draw: () => new Graphics().circle(0, 0, 36).fill(c).stroke({ color: COLORS.plum, width: 3 }), onTap: () => { set(c); this.show(); } }));
    if (this.tab === 'people') {
      switch (this.section) {
        case 'age':
          return AGE_GROUPS.map((a) => ({ selected: a === p.age, draw: () => label(AGE_EMOJI[a], 56), onTap: () => { p.age = a; this.fixOutfit(); this.show(); } }));
        case 'skin': return swatches(SKIN_TONES, p.skin, (c) => (p.skin = c));
        case 'hairColour': return swatches(HAIR_COLOURS, p.hair.colour, (c) => (p.hair.colour = c));
        case 'eyes': return swatches(EYE_COLOURS, p.eyes, (c) => (p.eyes = c));
        case 'hair':
          return [...templates.values()].filter((t) => t.category === 'hair').map((t) => ({
            selected: t.id === p.hair.template,
            draw: () => templateThumb(t.id, { main: p.hair.colour, outline: '#3a2a2a' }, 90),
            onTap: () => { p.hair.template = t.id; this.show(); },
          }));
        default: {
          const slot = this.section as (typeof OUTFIT_SLOTS)[number];
          const none: Cell = { selected: !p.outfit[slot], draw: () => label('🚫', 44), onTap: () => { delete p.outfit[slot]; this.show(); } };
          return [none, ...wearables(slot, p.age).map((it) => ({
            selected: p.outfit[slot] === it.id,
            draw: () => templateThumb(it.template, it.palette, 90),
            onTap: () => {
              p.outfit[slot] = it.id;
              if (slot === 'dress') { delete p.outfit.top; delete p.outfit.bottom; }
              if (slot === 'top' || slot === 'bottom') delete p.outfit.dress;
              this.show();
            },
          }))];
        }
      }
    }
    if (this.tab === 'pets') {
      return [...items.values()].filter((it) => it.tags.includes('pet') && templates.get(it.template)?.category === 'animal').map((it) => ({
        selected: this.pet?.item === it.id,
        draw: () => itemThumb(it.id, 90),
        onTap: () => { this.pet = { item: it.id, name: this.pet?.name ?? randomName() }; this.show(); },
      }));
    }
    // Clothes: pick a shape, then paint its three colours.
    if (this.section === 'template') {
      return [...templates.values()].filter((t) => (OUTFIT_SLOTS as readonly string[]).includes(t.category)).map((t) => ({
        selected: this.cloth?.template === t.id,
        draw: () => templateThumb(t.id, this.cloth?.palette ?? {}, 90),
        onTap: () => { this.cloth = { template: t.id, palette: this.cloth?.palette ?? { main: '#ff8fb8', trim: '#ffd36e', accent: '#ffffff', outline: '#5a3d4f' }, slot: 'main' }; this.show(); },
      }));
    }
    const slot = this.section as 'main' | 'trim' | 'accent';
    return swatches(SWATCHES, this.cloth?.palette[slot] ?? '', (c) => { if (this.cloth) this.cloth.palette[slot] = c; });
  }

  /** Clothes that no longer fit after an age change come off. */
  private fixOutfit(): void {
    for (const [slot, id] of Object.entries(this.person.outfit)) {
      const it = items.get(id!);
      if (it?.ages && !it.ages.includes(this.person.age)) delete this.person.outfit[slot as keyof Person['outfit']];
    }
    if (!this.person.outfit.dress && !(this.person.outfit.top && this.person.outfit.bottom)) this.dressDefaults();
  }

  private drawPreview(): void {
    this.preview.removeChildren().forEach((c) => c.destroy({ children: true }));
    const { w, h } = this.size;
    const box = { x: w * 0.18, y: h - 130, maxH: h - 260 };
    if (this.tab === 'people') {
      const rig = new Rig(this.person);
      rig.scale.set(Math.min(box.maxH / rig.geo.height, (w * 0.3) / 60));
      rig.position.set(box.x, box.y);
      const n = label(this.person.name, 40);
      n.position.set(box.x, 70);
      this.preview.addChild(rig, n);
    } else if (this.tab === 'pets' && this.pet) {
      const s = itemSprite(this.pet.item);
      s.scale.set((s.scale.x * Math.min(box.maxH * 0.6, 260)) / itemSize(this.pet.item).h);
      s.position.set(box.x, box.y);
      const n = label(this.pet.name, 40);
      n.position.set(box.x, 70);
      this.preview.addChild(s, n);
    } else if (this.tab === 'clothes' && this.cloth) {
      const t = templateThumb(this.cloth.template, this.cloth.palette, Math.min(w * 0.3, box.maxH));
      t.position.set(box.x, h / 2);
      this.preview.addChild(t);
    }
  }

  private rename(): void {
    const target = this.tab === 'pets' ? this.pet : this.person;
    if (!target) return;
    const typed = window.prompt('Name?', target.name);
    target.name = typed && typed.trim() ? typed.trim().slice(0, 12) : randomName();
    this.show();
  }

  private finish(): void {
    const w = this.game.world;
    if (this.tab === 'people') {
      w.people.push(structuredClone(this.person));
      this.game.toast.show(`${this.person.name} is in the people bar! 👪`);
    } else if (this.tab === 'pets' && this.pet) {
      w.pets.push({ kind: 'pet', id: uid('pet'), name: this.pet.name, item: this.pet.item });
      this.game.toast.show(`${this.pet.name} is in the people bar! 🐾`);
    } else if (this.tab === 'clothes' && this.cloth) {
      const t = templates.get(this.cloth.template)!;
      const it: Item = { id: uid('my_'), name: `My ${t.name}`, template: t.id, palette: { ...this.cloth.palette }, tags: ['shop'] };
      w.custom.push(it);
      items.set(it.id, it);
      this.game.toast.show(`New ${t.name} made! Find it in ${SLOT_EMOJI[t.category]}`);
    } else return;
    playSound('tada');
    persist(w);
    this.game.stack.pop();
  }
}

function wearables(slot: string, age: string): Item[] {
  return [...items.values()].filter((it) => templates.get(it.template)?.category === slot && (!it.ages || it.ages.includes(age)));
}

function randomName(): string {
  const list = names.length ? names : ['Ara'];
  return list[Math.floor(Math.random() * list.length)];
}

export function templateThumb(templateId: string, palette: Partial<Item['palette']>, size: number): Sprite {
  const s = new Sprite();
  s.anchor.set(0.5);
  textureFor(templateId, palette).then((t) => {
    if (s.destroyed) return;
    s.texture = t;
    s.width = s.height = size;
  });
  return s;
}

export function itemThumb(itemId: string, size: number): Sprite {
  const it = items.get(itemId);
  return templateThumb(it?.template ?? '', it?.palette ?? {}, size);
}
