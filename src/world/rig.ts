// A drawn person: body by code, clothes and hair from templates fitted to slot frames, a face driven by emotion data.
// Local units are world units (an adult is ~100 tall); the origin is between the feet, y grows downward.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Emotion } from '../../schemas/emotion.ts';
import { textureFor, RASTER_SCALE } from '../art/textures.ts';
import { shade, hexNum } from '../art/color.ts';
import { unitsPerCanvas } from '../art/geometry.ts';
import { items, templates } from '../data/index.ts';
import type { Person } from './state.ts';

type Body = { headR: number; torsoH: number; torsoW: number; legH: number; legW: number };
const BODIES: Record<string, Body> = {
  baby: { headR: 12, torsoH: 12, torsoW: 18, legH: 9, legW: 6 },
  toddler: { headR: 13, torsoH: 15, torsoW: 20, legH: 13, legW: 7 },
  kid: { headR: 15, torsoH: 20, torsoW: 24, legH: 22, legW: 8 },
  teen: { headR: 15.5, torsoH: 25, torsoW: 26, legH: 32, legW: 9 },
  adult: { headR: 16, torsoH: 28, torsoW: 30, legH: 38, legW: 10 },
  elder: { headR: 16, torsoH: 27, torsoW: 31, legH: 35, legW: 10 },
};
const FOOT_H = 4;

export type Frame = { x: number; y: number; w: number; h: number };

/** Geometry of a body: key points and the slot frame for each wearable category (see prompts/template.txt). */
export function bodyGeometry(age: string) {
  const b = BODIES[age] ?? BODIES.kid;
  const hipY = -b.legH;
  const shoulderY = hipY - b.torsoH;
  const headCy = shoulderY - b.headR * 0.85;
  const hipW = b.torsoW * 0.85;
  const eyeDist = b.headR * 0.7;
  const frames: Record<string, Frame> = {};
  {
    const w = (b.torsoW * 256) / 216, h = (b.torsoH * 256) / 220;
    frames.top = { x: -w / 2, y: shoulderY - (20 / 256) * h, w, h };
  }
  {
    const w = (hipW * 256) / 176, h = b.legH - FOOT_H * 0.5;
    frames.bottom = { x: -w / 2, y: hipY - 3, w, h };
  }
  {
    const w = (b.torsoW * 256) / 176, h = ((b.torsoH + b.legH * 0.6) * 256) / 240;
    frames.dress = { x: -w / 2, y: shoulderY - (10 / 256) * h, w, h };
  }
  {
    const w = (hipW * 256) / 216, h = b.legH * 0.55;
    frames.socks = { x: -w / 2, y: -h, w, h };
  }
  {
    const h = (FOOT_H * 1.6 * 256) / 130, w = ((hipW + 6) * 256) / 236;
    frames.shoes = { x: -w / 2, y: -(240 / 256) * h, w, h };
  }
  {
    const s = (b.headR * 256) / 90;
    frames.hair = { x: -(128 / 256) * s, y: headCy - (140 / 256) * s, w: s, h: s };
  }
  {
    const w = (b.headR * 2.4 * 256) / 216, h = w;
    frames.hat = { x: -w / 2, y: headCy - b.headR * 0.45 - (220 / 256) * h, w, h };
  }
  {
    const w = (eyeDist * 256) / 100, h = w;
    frames.glasses = { x: -w / 2, y: headCy + b.headR * 0.05 - h / 2, w, h };
  }
  {
    const s = b.torsoH * 0.8;
    frames.bag = { x: b.torsoW * 0.35, y: hipY - s * 0.8, w: s, h: s };
  }
  return { b, hipY, shoulderY, headCy, hipW, eyeDist, frames, height: -(headCy - b.headR) };
}

const LAYERS = ['bag', 'socks', 'shoes', 'bottom', 'top', 'dress', 'hair', 'glasses', 'hat'] as const;
const NEUTRAL: Emotion['face'] = { eyes: 'open', mouth: 'smile', brows: 0, blush: false, tears: false };

export class Rig extends Container {
  readonly person: Person;
  readonly geo: ReturnType<typeof bodyGeometry>;
  private body = new Container();
  private skin = new Graphics();
  private face = new Graphics();
  private armR = new Graphics();
  private wear = new Map<string, Sprite>();
  private held: Sprite | null = null;
  private heldId: string | null = null;
  private emotion: Emotion | null = null;
  private feelT = 0;
  /** 0 = arm down, 1 = hand at mouth. */
  private reach = 0;
  private reachTarget = 0;
  private onBite: (() => void) | null = null;

  constructor(person: Person) {
    super();
    this.person = person;
    this.geo = bodyGeometry(person.age);
    this.addChild(this.body);
    this.draw();
  }

  /** Redraw everything (after the creator changes something). */
  draw(): void {
    this.body.removeChildren();
    this.wear.clear();
    const p = this.person, { b, hipY, shoulderY, headCy } = this.geo;
    const skin = hexNum(p.skin), line = hexNum(shade(p.skin, -0.45));
    const back = new Container(), front = new Container();
    this.body.addChild(back, this.skin, front, this.armR, this.face);
    // Bag behind the body.
    this.addWear('bag', back);
    this.skin.clear();
    const stroke = { color: line, width: 1.6 };
    // Legs and feet.
    for (const side of [-1, 1]) {
      this.skin.roundRect(side * (b.legW * 0.55) - b.legW / 2, hipY - 2, b.legW, b.legH + 2, b.legW / 2).fill(skin).stroke(stroke);
    }
    // Torso, left arm, neck, head, ears.
    this.skin.roundRect(-b.torsoW / 2, shoulderY, b.torsoW, b.torsoH + 2, b.torsoW * 0.3).fill(skin).stroke(stroke);
    this.skin.roundRect(-b.torsoW / 2 - b.legW * 0.7, shoulderY + 2, b.legW * 0.75, b.torsoH * 0.95, b.legW * 0.4).fill(skin).stroke(stroke);
    this.skin.circle(-b.torsoW / 2 - b.legW * 0.33, shoulderY + b.torsoH, b.legW * 0.5).fill(skin).stroke(stroke);
    for (const side of [-1, 1]) this.skin.circle(side * b.headR * 0.98, headCy + b.headR * 0.1, b.headR * 0.22).fill(skin).stroke(stroke);
    this.skin.circle(0, headCy, b.headR).fill(skin).stroke(stroke);
    for (const slot of ['socks', 'shoes', 'bottom', 'top', 'dress'] as const) this.addWear(slot, front);
    // Short sleeves on the left arm in the top's colour (the right arm draws its own in drawArm).
    const sl = this.sleeve();
    if (sl) {
      const sleeves = new Graphics().roundRect(-b.torsoW / 2 - b.legW * 0.78, shoulderY + 1, b.legW * 0.9, b.torsoH * 0.42, b.legW * 0.4).fill(sl.fill).stroke({ color: sl.line, width: 1.6 });
      front.addChild(sleeves);
    }
    this.drawArm();
    this.drawFace();
    for (const slot of ['hair', 'glasses', 'hat'] as const) this.addWear(slot, this.body);
    if (this.held) this.body.addChild(this.held);
  }

  private addWear(slot: (typeof LAYERS)[number], into: Container): void {
    const p = this.person;
    let templateId: string | undefined, palette: Record<string, string> | undefined;
    if (slot === 'hair') {
      templateId = p.hair.template;
      palette = { main: p.hair.colour, trim: shade(p.hair.colour, 0.25), accent: shade(p.hair.colour, 0.4), outline: shade(p.hair.colour, -0.45) };
    } else {
      const it = items.get(p.outfit[slot] ?? '');
      if (!it) return;
      templateId = it.template;
      palette = it.palette;
    }
    if (!templates.has(templateId)) return;
    const f = this.geo.frames[slot];
    const s = new Sprite();
    s.position.set(f.x, f.y);
    into.addChild(s);
    this.wear.set(slot, s);
    textureFor(templateId, palette).then((t) => {
      if (s.destroyed) return;
      s.texture = t;
      s.width = f.w;
      s.height = f.h;
    });
  }

  /** The colours of the sleeves, from the top or dress being worn. */
  private sleeve(): { fill: number; line: number } | null {
    const it = items.get(this.person.outfit.top ?? this.person.outfit.dress ?? '');
    return it ? { fill: hexNum(it.palette.main), line: hexNum(it.palette.outline) } : null;
  }

  /** Right hand position for the current reach (down at the side → up at the mouth). */
  handPos(): { x: number; y: number } {
    const { b, shoulderY, headCy } = this.geo;
    const down = { x: b.torsoW / 2 + b.legW * 0.33, y: shoulderY + b.torsoH };
    const mouth = { x: b.headR * 0.35, y: headCy + b.headR * 0.55 };
    const k = this.reach;
    return { x: down.x + (mouth.x - down.x) * k, y: down.y + (mouth.y - down.y) * k };
  }

  mouthPos(): { x: number; y: number } {
    return { x: 0, y: this.geo.headCy + this.geo.b.headR * 0.5 };
  }

  private drawArm(): void {
    const { b, shoulderY } = this.geo;
    const skin = hexNum(this.person.skin), line = hexNum(shade(this.person.skin, -0.45));
    const sh = { x: b.torsoW / 2 - b.legW * 0.1, y: shoulderY + 4 };
    const h = this.handPos();
    this.armR.clear()
      .moveTo(sh.x, sh.y).lineTo(h.x, h.y).stroke({ color: line, width: b.legW * 0.75 + 3, cap: 'round' })
      .moveTo(sh.x, sh.y).lineTo(h.x, h.y).stroke({ color: skin, width: b.legW * 0.75, cap: 'round' })
      .circle(h.x, h.y, b.legW * 0.5).fill(skin).stroke({ color: line, width: 1.6 });
    const sl = this.sleeve();
    if (sl) {
      // The sleeve covers the top 40% of the arm, following it as it reaches.
      const ex = sh.x + (h.x - sh.x) * 0.42, ey = sh.y + (h.y - sh.y) * 0.42;
      this.armR.moveTo(sh.x, sh.y).lineTo(ex, ey).stroke({ color: sl.line, width: b.legW * 0.95 + 3, cap: 'round' })
        .moveTo(sh.x, sh.y).lineTo(ex, ey).stroke({ color: sl.fill, width: b.legW * 0.95, cap: 'round' });
    }
    if (this.held && this.heldId) this.placeHeld();
  }

  private drawFace(): void {
    const base = this.emotion?.face ?? NEUTRAL;
    const f = !this.emotion && (this.sleeping || this.blinking > 0) ? { ...base, eyes: 'closed' } : base;
    const { b, headCy } = this.geo;
    const g = this.face.clear();
    const ink = 0x3a2a2a, er = b.headR * 0.13;
    const ey = headCy + b.headR * 0.05, ex = b.headR * 0.35;
    const eye = (x: number, kind: string) => {
      switch (kind) {
        case 'happy': g.moveTo(x - er, ey + er * 0.3).quadraticCurveTo(x, ey - er * 1.3, x + er, ey + er * 0.3).stroke({ color: ink, width: er * 0.6, cap: 'round' }); break;
        case 'closed': g.moveTo(x - er, ey - er * 0.2).quadraticCurveTo(x, ey + er * 1.1, x + er, ey - er * 0.2).stroke({ color: ink, width: er * 0.6, cap: 'round' }); break;
        case 'sleepy': g.moveTo(x - er, ey + er * 0.2).lineTo(x + er, ey + er * 0.2).stroke({ color: ink, width: er * 0.6, cap: 'round' }); break;
        case 'wide': g.circle(x, ey, er * 1.45).fill(0xffffff).stroke({ color: ink, width: er * 0.35 }).circle(x, ey, er * 0.8).fill(ink); break;
        case 'hearts': heart(g, x, ey, er * 1.5, 0xff4f8b); break;
        case 'stars': star(g, x, ey, er * 1.6, 0xffc93c); break;
        case 'sad':
          g.circle(x, ey, er).fill(ink).circle(x - er * 0.35, ey - er * 0.35, er * 0.35).fill(0xffffff);
          g.moveTo(x - er * 1.3, ey - er * 1.3 + (x > 0 ? 0.6 : 0) * er).lineTo(x + er * 1.3, ey - er * 1.3 + (x > 0 ? 0 : 0.6) * er).stroke({ color: ink, width: er * 0.4, cap: 'round' });
          break;
        default: g.circle(x, ey, er).fill(ink).circle(x - er * 0.35, ey - er * 0.35, er * 0.35).fill(0xffffff);
      }
    };
    if (f.eyes === 'wink') {
      eye(-ex, 'open');
      eye(ex, 'happy');
    } else {
      eye(-ex, f.eyes);
      eye(ex, f.eyes);
    }
    // Brows: -1 worried/angry (inner end down), 1 raised.
    const by = ey - er * 2.3 - f.brows * er * 0.8;
    for (const side of [-1, 1]) {
      const tilt = f.eyes === 'angry' ? er * 0.9 : -f.brows * er * 0.4;
      g.moveTo(side * (ex + er), by).lineTo(side * (ex - er), by + tilt).stroke({ color: ink, width: er * 0.4, cap: 'round' });
    }
    // Makeup from the makeup shop: eyeshadow above the eyes, blush on the cheeks, glitter sparkles.
    const mk = this.person.makeup;
    if (mk?.eyes) for (const side of [-1, 1]) g.ellipse(side * ex, ey - er * 1.1, er * 1.5, er * 0.7).fill({ color: hexNum(mk.eyes), alpha: 0.55 });
    if (mk?.blush) for (const side of [-1, 1]) g.ellipse(side * b.headR * 0.55, ey + b.headR * 0.32, b.headR * 0.2, b.headR * 0.12).fill({ color: hexNum(mk.blush), alpha: 0.65 });
    if (mk?.glitter) for (const [x, y] of [[-0.6, 0.15], [0.62, 0.2], [-0.45, 0.45], [0.5, 0.48]]) star(g, x * b.headR, ey + y * b.headR, b.headR * 0.07, 0xffe066);
    if (f.blush) for (const side of [-1, 1]) g.ellipse(side * b.headR * 0.55, ey + b.headR * 0.32, b.headR * 0.17, b.headR * 0.1).fill({ color: 0xff7aa8, alpha: 0.6 });
    if (f.tears) for (const side of [-1, 1]) g.ellipse(side * ex + side * er * 0.4, ey + er * 2.4, er * 0.45, er * 0.75).fill(0x7cc8ff);
    const my = headCy + b.headR * 0.5, mw = b.headR * 0.32;
    switch (f.mouth) {
      case 'grin': g.moveTo(-mw, my - mw * 0.2).quadraticCurveTo(0, my + mw * 1.4, mw, my - mw * 0.2).closePath().fill(ink); break;
      case 'open': g.ellipse(0, my + mw * 0.2, mw * 0.55, mw * 0.65).fill(ink); break;
      case 'frown': g.moveTo(-mw, my + mw * 0.5).quadraticCurveTo(0, my - mw * 0.5, mw, my + mw * 0.5).stroke({ color: ink, width: er * 0.5, cap: 'round' }); break;
      case 'o': g.circle(0, my + mw * 0.2, mw * 0.35).stroke({ color: ink, width: er * 0.45 }); break;
      case 'flat': g.moveTo(-mw * 0.7, my + mw * 0.2).lineTo(mw * 0.7, my + mw * 0.2).stroke({ color: ink, width: er * 0.5, cap: 'round' }); break;
      case 'tongue':
        g.moveTo(-mw, my).quadraticCurveTo(0, my + mw * 1.2, mw, my).closePath().fill(ink);
        g.ellipse(mw * 0.15, my + mw * 0.65, mw * 0.4, mw * 0.35).fill(0xff7aa8);
        break;
      case 'wobbly':
        g.moveTo(-mw, my + mw * 0.3).lineTo(-mw * 0.5, my).lineTo(0, my + mw * 0.3).lineTo(mw * 0.5, my).lineTo(mw, my + mw * 0.3).stroke({ color: ink, width: er * 0.45, cap: 'round', join: 'round' });
        break;
      case 'kiss': heart(g, mw * 0.1, my + mw * 0.2, mw * 0.7, 0xff4f8b); break;
      default: g.moveTo(-mw, my).quadraticCurveTo(0, my + mw * 1.1, mw, my).stroke({ color: ink, width: er * 0.5, cap: 'round' });
    }
    // Lipstick: a soft coloured smile over the mouth.
    if (mk?.lips) g.ellipse(0, my + mw * 0.35, mw * 0.75, mw * 0.32).fill({ color: hexNum(mk.lips), alpha: 0.75 });
    if (this.chewing > 0) g.ellipse(0, my + mw * 0.2, mw * 0.5, mw * (0.2 + 0.3 * Math.abs(Math.sin(this.chewing * 14)))).fill(ink);
  }

  feel(e: Emotion): void {
    this.emotion = e;
    this.feelT = 0;
    this.drawFace();
  }

  get holding(): string | null {
    return this.heldId;
  }

  /** Put an item in the right hand (the notes: food "gets teleported to hand"). */
  hold(itemId: string | null, onBite?: () => void): void {
    this.held?.destroy();
    this.held = null;
    this.heldId = itemId;
    this.onBite = onBite ?? null;
    if (!itemId) return;
    const it = items.get(itemId);
    const t = it ? templates.get(it.template) : undefined;
    if (!it || !t) return;
    this.held = new Sprite();
    this.body.addChild(this.held);
    textureFor(it.template, it.palette).then((tex) => {
      if (!this.held || this.held.destroyed) return;
      this.held.texture = tex;
      this.placeHeld();
    });
    this.placeHeld();
  }

  private placeHeld(): void {
    const it = items.get(this.heldId ?? '');
    const t = it ? templates.get(it.template) : undefined;
    if (!this.held || !t) return;
    const sc = unitsPerCanvas(t.id);
    this.held.scale.set(sc / RASTER_SCALE);
    const grip = t.anchors?.grip ?? [128, 200];
    const h = this.handPos();
    this.held.position.set(h.x - grip[0] * sc, h.y - grip[1] * sc);
  }

  /** "Hand brings food or drink to mouth, avatar eats/drinks." */
  eat(): void {
    if (!this.heldId) return;
    this.reachTarget = 1;
  }

  private chewing = 0;
  /** Rocking on a swing, hammock or rocking horse. */
  swinging = false;
  private swingT = 0;

  /** Redraw the face (after makeup changes). */
  refreshFace(): void {
    this.drawFace();
  }
  // Idle life: blinking, breathing, sleeping.
  private blinkIn = 1 + Math.random() * 3;
  private blinking = 0;
  private idleT = Math.random() * 10;
  private zzz: Text | null = null;
  private sleeping = false;

  /** Asleep (on a bed or cot): eyes closed and a little "z z z". */
  set asleep(v: boolean) {
    if (v === this.sleeping) return;
    this.sleeping = v;
    this.zzz?.destroy();
    this.zzz = null;
    if (v) {
      this.zzz = new Text({ text: "z z z", style: { fontFamily: "Fredoka, sans-serif", fontSize: 12, fill: 0x7b6aa8, fontWeight: "600" } });
      this.zzz.position.set(this.geo.b.headR * 0.8, this.geo.headCy - this.geo.b.headR * 1.6);
      this.addChild(this.zzz);
    }
    this.drawFace();
  }
  get asleep(): boolean {
    return this.sleeping;
  }

  update(dt: number): void {
    // Arm towards its target; at the mouth, take a bite and lower again.
    if (this.reach !== this.reachTarget) {
      const step = dt * 4;
      this.reach = this.reachTarget > this.reach ? Math.min(this.reachTarget, this.reach + step) : Math.max(this.reachTarget, this.reach - step);
      this.drawArm();
      if (this.reach === 1) {
        this.chewing = 0.6;
        this.reachTarget = 0;
        this.onBite?.();
      }
    }
    if (this.chewing > 0) {
      this.chewing = Math.max(0, this.chewing - dt);
      this.drawFace();
    }
    if (!this.emotion) {
      // Breathe, blink now and then, and drift a z z z while asleep.
      this.idleT += dt;
      if (this.swinging) {
        this.swingT += dt;
        this.body.rotation = Math.sin(this.swingT * 2.6) * 0.18;
      } else if (this.swingT) {
        this.swingT = 0;
        this.body.rotation = 0;
      }
      this.body.scale.set(1, 1 + Math.sin(this.idleT * 2.2) * 0.012);
      if (this.blinking > 0) {
        this.blinking -= dt;
        if (this.blinking <= 0) this.drawFace();
      } else if ((this.blinkIn -= dt) <= 0 && !this.sleeping) {
        this.blinking = 0.12;
        this.blinkIn = 2 + Math.random() * 4;
        this.drawFace();
      }
      if (this.zzz) {
        this.zzz.alpha = 0.5 + 0.5 * Math.sin(this.idleT * 2);
        this.zzz.y = this.geo.headCy - this.geo.b.headR * 1.6 - (this.idleT % 2) * 4;
      }
      return;
    }
    this.feelT += dt;
    const t = this.feelT;
    this.body.position.set(0, 0);
    this.body.rotation = 0;
    this.body.scale.set(1);
    switch (this.emotion.motion) {
      case 'bounce': this.body.y = -Math.abs(Math.sin(t * 8)) * 3; break;
      case 'jump': this.body.y = -Math.abs(Math.sin(t * 5)) * 12; break;
      case 'shake': this.body.x = Math.sin(t * 30) * 1.5; break;
      case 'shiver': this.body.x = Math.sin(t * 50) * 0.8; break;
      case 'droop': this.body.scale.y = 0.96; this.body.rotation = 0.04; break;
      case 'spin': this.body.scale.x = Math.cos(t * 6); break;
      case 'wiggle': this.body.rotation = Math.sin(t * 12) * 0.08; break;
      case 'sway': this.body.rotation = Math.sin(t * 3) * 0.06; break;
    }
    if (t > this.emotion.seconds) {
      this.emotion = null;
      this.body.position.set(0, 0);
      this.body.rotation = 0;
      this.body.scale.set(1);
      this.drawFace();
    }
  }
}

function heart(g: Graphics, x: number, y: number, s: number, color: number): void {
  g.moveTo(x, y + s * 0.45)
    .bezierCurveTo(x - s * 1.1, y - s * 0.2, x - s * 0.5, y - s * 0.9, x, y - s * 0.35)
    .bezierCurveTo(x + s * 0.5, y - s * 0.9, x + s * 1.1, y - s * 0.2, x, y + s * 0.45)
    .fill(color);
}

function star(g: Graphics, x: number, y: number, s: number, color: number): void {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? s * 0.42 : s;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.poly(pts).fill(color);
}
