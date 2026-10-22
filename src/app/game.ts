// Wires the scenes, the corner buttons, the people bar, the emoji wheel and the saved world together.
import { Container, type Application } from 'pixi.js';
import type { SceneStack } from './scenes.ts';
import { Hud } from '../ui/hud.ts';
import { TitleScene } from '../ui/title.ts';
import { MapScene } from '../ui/iso-map.ts';
import { PeopleBar } from '../ui/people-bar.ts';
import { EmojiWheel } from '../ui/emoji-wheel.ts';
import { CreatorScene } from '../ui/creator.ts';
import { BuilderScene } from '../ui/builder.ts';
import { SkyControls, WeatherLayer } from '../ui/sky.ts';
import { Toast } from '../ui/toast.ts';
import { PostBox } from '../ui/postbox.ts';
import { Wardrobe } from '../ui/wardrobe.ts';
import { Panel } from '../ui/panel.ts';
import { templateThumb, itemThumb } from '../ui/creator.ts';
import { contentsOf, containerOf } from '../world/behaviours.ts';
import type { Thing } from '../world/state.ts';
import { templates, items } from '../data/index.ts';
import { Graphics } from 'pixi.js';
import { TravelPicker, destinations } from '../ui/travel.ts';
import type { Person } from '../world/state.ts';
import { playSound, soundsOn, toggleSounds } from '../ui/sound.ts';
import { Menu } from '../ui/menu.ts';
import { musicOn, startMusic, toggleMusic } from '../ui/music.ts';
import { roundButton } from '../ui/kit.ts';
import { PlaceScene } from '../world/place-scene.ts';
import type { Rig } from '../world/rig.ts';
import { initLook } from '../art/look.ts';
import { loadWorld, persist, resetWorld, type World } from '../world/state.ts';
import { places } from '../data/index.ts';

export class Game {
  world!: World;
  readonly app: Application;
  readonly stack: SceneStack;
  readonly hud: Hud;
  readonly peopleBar: PeopleBar;
  readonly emojis: EmojiWheel;
  readonly weather: WeatherLayer;
  readonly sky: SkyControls;
  readonly toast: Toast;
  readonly postbox: PostBox;
  readonly wardrobe = new Wardrobe();
  readonly panel = new Panel();
  readonly travelPicker = new TravelPicker();
  private overlay = new Container();
  private musicButton = new Container();
  readonly menu: Menu;

  constructor(app: Application, stack: SceneStack) {
    this.app = app;
    this.stack = stack;
    this.hud = new Hud({ back: () => this.back(), settings: () => this.menu.show(), create: () => this.create(), people: () => this.peopleBar.toggle(), build: () => this.build() });
    this.peopleBar = new PeopleBar(this);
    this.emojis = new EmojiWheel();
    this.weather = new WeatherLayer();
    this.sky = new SkyControls(this);
    this.toast = new Toast();
    this.postbox = new PostBox(this);
    this.hud.extras.addChild(this.sky.view);
    // Music on/off, next to the sky buttons.
    this.drawMusic();
    this.hud.extras.addChild(this.musicButton);
    this.menu = new Menu({
      music: musicOn,
      toggleMusic: async () => {
        await toggleMusic();
        this.drawMusic();
      },
      sounds: soundsOn,
      toggleSounds: async () => void (await toggleSounds()),
      title: () => {
        while (this.stack.depth > 1) this.stack.pop();
      },
      reset: async () => {
        await resetWorld();
        location.reload();
      },
    });
    this.overlay.addChild(this.weather.view, this.postbox.view, this.peopleBar.view, this.hud.view, this.wardrobe.view, this.panel.view, this.travelPicker.view, this.emojis.view, this.toast.view, this.menu.view);
    app.stage.addChild(this.overlay);
    stack.onChange(() => this.onSceneChange());
    app.ticker.add((t) => {
      const dt = t.deltaMS / 1000;
      this.weather.update(dt, this.app.screen.width, this.app.screen.height);
      this.toast.update(dt);
      // Weather shows outside: on the town map and on outdoor floors.
      const place = this.place;
      this.weather.nightTint = place === null;
      this.weather.view.visible = this.stack.top?.name === 'map' || (place !== null && place.outdoorNow);
    });
  }

  async start(): Promise<void> {
    await initLook();
    this.world = await loadWorld();
    this.stack.push(new TitleScene(() => this.play()));
    this.layout();
  }

  private drawMusic(): void {
    this.musicButton.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.musicButton.addChild(roundButton(musicOn() ? '🎵' : '🔇', async () => {
      await toggleMusic();
      this.drawMusic();
    }, 70));
  }

  play(): void {
    void startMusic();
    this.stack.push(new MapScene(this));
  }

  openPlace(id: string): void {
    this.stack.push(new PlaceScene(this, id));
  }

  /** The place scene currently shown, if any. */
  get place(): PlaceScene | null {
    const top = this.stack.top;
    return top instanceof PlaceScene ? top : null;
  }

  back(): void {
    if (this.menu.open) return this.menu.hide();
    if (this.emojis.open) return this.emojis.close();
    if (this.wardrobe.open) return this.wardrobe.hide();
    if (this.panel.open) return this.panel.hide();
    if (this.travelPicker.open) return this.travelPicker.hide();
    if (this.peopleBar.open) return this.peopleBar.toggle();
    if (this.stack.depth > 2) this.stack.pop();
  }

  create(): void {
    if (!(this.stack.top instanceof CreatorScene)) this.stack.push(new CreatorScene(this));
  }

  /** The hammer: pick a lot (or use the given one), pick a house, choose furnished or empty. */
  build(lotId?: string): void {
    const place = this.place;
    if (place && lotId === undefined) {
      place.setBuilding(!place.building);
      this.hud.setBuilding(place.building);
      return;
    }
    if (!(this.stack.top instanceof BuilderScene)) this.stack.push(new BuilderScene(this, lotId));
  }

  showEmojis(rig: Rig, at: { x: number; y: number }, onEat: () => void): void {
    this.emojis.show(rig, at, onEat, () => this.dress(rig));
  }

  /** Someone got on a vehicle: pick where to go, then they (and the view) go there. */
  travel(person: Person, vehicleEmoji: string): void {
    const from = this.place?.placeId ?? '';
    this.travelPicker.show(person, vehicleEmoji, destinations(this.world, from), (to) => {
      this.place?.removePerson(person);
      person.at = { place: to, floor: 0, x: 80, y: 0 };
      persist(this.world);
      playSound('tada');
      // Travel swaps the place instead of stacking, so back still returns to the map.
      this.stack.replace(new PlaceScene(this, to));
    });
  }

  /** Open a fridge, toy box, cookie jar...: tap something inside to take it out. */
  openContainer(thing: Thing, take: (itemId: string) => void): void {
    const c = containerOf(thing.item);
    if (!c) return;
    const inside = contentsOf(thing.item, thing.uid);
    this.panel.show(`${c.emoji} ${items.get(thing.item)?.name ?? 'Inside'}`, () => inside.map((id) => ({
      draw: () => itemThumb(id, 84),
      onTap: () => {
        take(id);
        playSound('pop');
      },
    })));
  }

  /** The salon: pick a new hairstyle and colour for someone in the chair. */
  openHair(rig: Rig): void {
    const p = rig.person;
    const colours = ['#2b1d14', '#5a3825', '#8b5e3c', '#c68642', '#e8c07d', '#f5e1a4', '#d94f2b', '#b0b0b0', '#ffffff', '#ff8fb8', '#b197fc', '#74c0fc', '#8ce99a'];
    const swatches = () => {
      const row = new Container();
      colours.forEach((col, i) => {
        const s = new Graphics().circle(0, 0, 16).fill(col).stroke({ color: col === p.hair.colour ? 0xff4f8b : 0x5a3d4f, width: col === p.hair.colour ? 5 : 2 });
        s.position.set(20 + (i % 13) * 38, 18);
        s.eventMode = 'static';
        s.on('pointertap', () => {
          p.hair.colour = col;
          rig.draw();
          persist(this.world);
          this.panel.refresh();
        });
        row.addChild(s);
      });
      return row;
    };
    this.panel.show(`💇 ${p.name}'s new look`, () => [...templates.values()].filter((t) => t.category === 'hair').map((t) => ({
      selected: t.id === p.hair.template,
      draw: () => templateThumb(t.id, { main: p.hair.colour, outline: '#3a2a2a' }, 84),
      onTap: () => {
        p.hair.template = t.id;
        rig.draw();
        playSound('tada');
        persist(this.world);
        this.panel.refresh();
      },
    })), { extra: swatches, side: (rig.getGlobalPosition().x > this.app.screen.width / 2 ? 'left' : 'right') });
  }

  /** Open the wardrobe for someone in the room. */
  dress(rig: Rig): void {
    this.wardrobe.show(rig, () => persist(this.world));
  }

  overPeopleBar(p: { x: number; y: number }): boolean {
    return this.peopleBar.contains(p);
  }

  refreshPeopleBar(): void {
    this.peopleBar.refresh();
  }

  /** A hidden place was found: it appears on the map from now on. */
  found(placeId: string): void {
    if (!this.world.found.includes(placeId)) this.world.found.push(placeId);
    persist(this.world);
    const p = places.get(placeId);
    if (p) this.toast.show(`You found ${p.emoji} ${p.name}!`, () => this.openPlace(placeId));
  }

  setSky(night: boolean, weather?: World['sky']['weather']): void {
    this.world.sky.night = night;
    if (weather) this.world.sky.weather = weather;
    persist(this.world);
    this.weather.set(this.world.sky);
    this.sky.layout(this.app.screen.width);
    this.stack.relayout();
    const top = this.stack.top as { onSky?: () => void } | undefined;
    top?.onSky?.();
  }

  private onSceneChange(): void {
    const top = this.stack.top;
    this.hud.visible = top !== undefined && top.name !== 'title';
    // Sky and the make/people/hammer tools belong to the world; the creator and builder only need back.
    const inWorld = top?.name === 'map' || top instanceof PlaceScene;
    for (const b of [this.hud.extras, this.hud.create, this.hud.people, this.hud.build]) b.visible = inWorld;
    this.hud.setBuilding(this.place?.building ?? false);
    // The town map is home: there is nowhere to go back to from it.
    this.hud.back.visible = top?.name !== 'map';
    this.hud.settings.visible = top?.name === 'map';
    this.menu.hide();
    this.emojis.close();
    this.wardrobe.hide();
    this.panel.hide();
    this.travelPicker.hide();
    this.peopleBar.refresh();
    this.postbox.refresh();
    this.weather.set(this.world?.sky ?? { night: false, weather: 'sunny' });
    this.layout();
  }

  layout(): void {
    const { width: w, height: h } = this.app.screen;
    this.stack.relayout();
    this.hud.layout(w, h);
    this.sky.layout(w);
    this.musicButton.position.set(w - 386, 56);
    this.menu.layout(w, h);
    this.peopleBar.layout(w, h);
    this.toast.layout(w, h);
    this.postbox.layout(w, h);
    this.wardrobe.layout(w, h);
    this.panel.layout(w, h);
    this.travelPicker.layout(w, h);
  }
}
