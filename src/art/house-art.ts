// House fronts drawn from a blueprint's exterior colours, roof shape and floor count.
// Colourways: variant n shifts the exterior colours, so each blueprint has many looks.
import { Graphics } from 'pixi.js';
import type { House } from '../../schemas/house.ts';
import type { Place } from '../../schemas/place.ts';
import { hexNum, shade } from './color.ts';

/** Colourways per blueprint: every mix of wall, roof and door colours (12 x 12 x 6). Variant 0 is the blueprint's own. */
export const VARIANTS = 864;

export const ROOFS = ['#e05a7a', '#c2557a', '#7b4fa0', '#3a6ea5', '#2f9e8f', '#e0784a', '#b8433f', '#5f8f3f', '#d4a017', '#8a5a3c', '#4f63c2', '#c24fa0'];
export const DOORS = ['#7fd1c7', '#ff8fb8', '#ffd36e', '#7fb8ff', '#b197fc', '#ff9f43'];
export const HUES = ['#ffb3c7', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#ffffff', '#f4d6c6', '#d8e2dc', '#ffe5ec'];

export function exteriorFor(h: House, variant: number): House['exterior'] {
  if (variant === 0) return h.exterior;
  // Step through the combinations so neighbouring variants differ in more than one colour.
  const k = (variant * 37) % (HUES.length * ROOFS.length * DOORS.length);
  return { walls: HUES[k % HUES.length], roof: ROOFS[Math.floor(k / HUES.length) % ROOFS.length], door: DOORS[Math.floor(k / (HUES.length * ROOFS.length)) % DOORS.length], trim: h.exterior.trim };
}

/** The variant with these wall, roof and door colours (indexes into HUES, ROOFS and DOORS). */
export function variantFor(wall: number, roof: number, door: number): number {
  const k = wall + roof * HUES.length + door * HUES.length * ROOFS.length;
  for (let v = 1; v < VARIANTS; v++) if ((v * 37) % VARIANTS === k) return v;
  return 0;
}

/** Draw a house front into g, `w` wide, standing on y=0 (grows upward). */
export function drawHouse(g: Graphics, h: House, variant: number, w: number): void {
  const ex = exteriorFor(h, variant);
  const indoor = h.floors.filter((f) => !f.outdoor).length || 1;
  // Tall houses are drawn squashed so they still fit their card.
  const floorH = w * 0.42 * Math.min(1, 3 / indoor);
  const bodyW = h.style === 'mansion' || h.style === 'castle' ? w : h.style === 'townhouse' ? w * 0.62 : w * 0.82;
  const x0 = -bodyW / 2, top = -floorH * indoor;
  const line = { color: hexNum(shade(ex.walls, -0.55)), width: Math.max(2, w * 0.025), join: 'round' as const };
  g.rect(x0, top, bodyW, floorH * indoor).fill(hexNum(ex.walls)).stroke(line);
  // Roof
  const roof = hexNum(ex.roof);
  switch (h.roof) {
    case 'flat': g.rect(x0 - w * 0.04, top - w * 0.08, bodyW + w * 0.08, w * 0.08).fill(roof).stroke(line); break;
    case 'dome': g.moveTo(x0, top).arc(0, top, bodyW / 2, Math.PI, 0).closePath().fill(roof).stroke(line); break;
    case 'tower':
      for (const tx of [x0, x0 + bodyW - bodyW * 0.22]) {
        g.rect(tx, top - w * 0.3, bodyW * 0.22, w * 0.3).fill(hexNum(ex.walls)).stroke(line);
        g.poly([tx - 4, top - w * 0.3, tx + bodyW * 0.11, top - w * 0.55, tx + bodyW * 0.22 + 4, top - w * 0.3]).fill(roof).stroke(line);
      }
      break;
    case 'hip': g.poly([x0 - w * 0.06, top, x0 + bodyW * 0.2, top - w * 0.28, x0 + bodyW * 0.8, top - w * 0.28, x0 + bodyW + w * 0.06, top]).fill(roof).stroke(line); break;
    case 'thatch': g.moveTo(x0 - w * 0.08, top).quadraticCurveTo(0, top - w * 0.6, x0 + bodyW + w * 0.08, top).closePath().fill(roof).stroke(line); break;
    default: g.poly([x0 - w * 0.06, top, 0, top - w * 0.38, x0 + bodyW + w * 0.06, top]).fill(roof).stroke(line);
  }
  // Windows on each floor, door on the ground floor.
  const win = hexNum('#cdeeff');
  for (let f = 0; f < indoor; f++) {
    const fy = -floorH * (f + 1) + floorH * 0.2;
    const n = Math.max(2, Math.round(bodyW / (w * 0.3)));
    for (let i = 0; i < n; i++) {
      const wx = x0 + (bodyW / n) * (i + 0.5);
      if (f === 0 && i === Math.floor(n / 2)) continue;
      g.roundRect(wx - w * 0.07, fy, w * 0.14, floorH * 0.38, 4).fill(win).stroke({ ...line, color: hexNum(ex.trim) });
    }
  }
  g.roundRect(-w * 0.08, -floorH * 0.62, w * 0.16, floorH * 0.62, w * 0.05).fill(hexNum(ex.door)).stroke(line);
  g.circle(w * 0.045, -floorH * 0.3, w * 0.012).fill(hexNum(ex.trim));
  if (h.style === 'beach') g.rect(x0 - w * 0.1, 0, bodyW + w * 0.2, w * 0.05).fill(hexNum('#f6e3b4'));
}

export const DISTRICT_AWNING: Record<string, string> = {
  homes: '#ff8fb8', downtown: '#7fb8ff', shopping: '#ff9f43', fun: '#b197fc', nature: '#3fa66b', travel: '#74c0fc', care: '#ff6b6b', sky: '#ffd36e',
};

/** A place's front for the town map: one storey per floor in its wall colour, windows, a door and a striped awning. */
export function drawBuilding(g: Graphics, place: Place, w: number): void {
  const storeys = Math.max(1, place.floors.length);
  const sh = w * 0.34, bodyH = sh * storeys;
  const wall = place.floors[0]?.wall ?? '#ffe3ef';
  const awning = DISTRICT_AWNING[place.district] ?? '#ff8fb8';
  const line = { color: hexNum(shade(wall, -0.55)), width: Math.max(2, w * 0.025), join: 'round' as const };
  g.rect(-w / 2, -bodyH, w, bodyH).fill(hexNum(shade(wall, -0.05))).stroke(line);
  g.rect(-w / 2 - w * 0.04, -bodyH - w * 0.07, w * 1.08, w * 0.07).fill(hexNum(shade(awning, -0.2))).stroke(line);
  for (let s = 0; s < storeys; s++) {
    const y = -sh * (s + 1) + sh * 0.22;
    for (const x of [-w * 0.3, 0, w * 0.3]) {
      if (s === 0 && x === 0) continue;
      g.roundRect(x - w * 0.09, y, w * 0.18, sh * 0.45, 4).fill(hexNum('#cdeeff')).stroke(line);
    }
  }
  g.roundRect(-w * 0.1, -sh * 0.62, w * 0.2, sh * 0.62, w * 0.04).fill(hexNum(shade(awning, -0.3))).stroke(line);
  // Striped awning over the door.
  const ay = -sh * 0.78, aw = w * 0.5, n = 5;
  for (let i = 0; i < n; i++) g.rect(-aw / 2 + (aw / n) * i, ay, aw / n, sh * 0.12).fill(hexNum(i % 2 ? '#ffffff' : awning));
  g.rect(-aw / 2, ay, aw, sh * 0.12).stroke(line);
}
