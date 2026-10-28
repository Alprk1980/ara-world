// What things do, by what they are (template id). The notes ask for lots to do in every place; these rules make
// fridges open, ovens cook, lamps and TVs switch on, baths bubble, swings swing, salon chairs restyle hair,
// horses and elephants can be ridden, and makeup show on faces.
import { categoryOf, items, templates } from '../data/index.ts';

const tpl = (itemId: string) => items.get(itemId)?.template ?? '';

/** Containers: tapping opens them; what's inside depends on what they are. */
export const CONTAINERS: { test: RegExp; inside: (itemId: string) => boolean; emoji: string }[] = [
  { test: /fridge|freezer|(?<!water_)cooler|ice_cream_cart/, inside: (id) => ['food', 'drink'].includes(categoryOf(id)), emoji: '🧊' },
  { test: /cookie_jar|candy_jar|sweet|treat_jar|candy_bowl|candy_bucket|sprinkle/, inside: (id) => categoryOf(id) === 'food' && /cookie|candy|sweet|donut|cupcake|chocolate|gumm|lolli|heart/.test(tpl(id)), emoji: '🍪' },
  { test: /toy_box|toy_chest|treasure_chest|gift_cabinet|parcel_(?!crane)|post_box|big_post_box/, inside: (id) => categoryOf(id) === 'toy', emoji: '🎁' },
  { test: /cupboard|pantry|kitchen_cabinet|fruit_stand|snack_basket|picnic_basket/, inside: (id) => categoryOf(id) === 'food', emoji: '🥫' },
  { test: /backpack_shelf|school_locker|pencil|crayon_box/, inside: (id) => categoryOf(id) === 'school', emoji: '✏️' },
  { test: /first_aid|medicine|bandage_box/, inside: (id) => /bandage|plaster|stethoscope|thermometer|medicine/.test(tpl(id)), emoji: '🩹' },
  { test: /makeup_(?!mirror)|lipstick_display|nail_polish_rack|product_shelf|vanity/, inside: (id) => categoryOf(id) === 'makeup', emoji: '💄' },
];
export function containerOf(itemId: string): (typeof CONTAINERS)[number] | null {
  return CONTAINERS.find((c) => c.test.test(tpl(itemId))) ?? null;
}
/** A handful of things to find inside a container (always the same ones for the same container). */
export function contentsOf(itemId: string, uid: string, n = 8): string[] {
  const c = containerOf(itemId);
  if (!c) return [];
  const pool = [...items.keys()].filter((id) => c.inside(id) && !items.get(id)!.tags.includes('halloween') && !items.get(id)!.tags.includes('christmas'));
  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < n && i < pool.length * 2; i++) {
    const id = pool[(h + i * 7919) % pool.length];
    if (!seen.has(tpl(id))) {
      seen.add(tpl(id));
      out.push(id);
    }
  }
  return out;
}

export type Shelf = { y: number; x0: number; x1: number; room: number };
/** Pack a container's things onto its shelves, left to right, each one that fits the shelf's width and room; each
 * shelf's row is centred. A tiny jar or pot that nothing fits in still holds one thing, a little wider than its mouth
 * (it pokes out over the rim), and so does each jar of a row of jars. Always the same things in the same places for the same container. */
export function fillInside(itemId: string, uid: string, shelves: Shelf[], sizeOf: (id: string) => { w: number; h: number }, n = 16): { item: string; x: number; y: number }[] {
  const pool = contentsOf(itemId, uid, 60);
  const rows: { item: string; w: number }[][] = shelves.map(() => []);
  const used = shelves.map(() => 0);
  const gap = 0.6;
  let placed = 0;
  for (const id of pool) {
    if (placed >= n) break;
    const { w, h } = sizeOf(id);
    const k = shelves.findIndex((s, i) => h <= s.room && used[i] + (rows[i].length ? gap : 0) + w <= s.x1 - s.x0);
    if (k < 0) continue;
    used[k] += (rows[k].length ? gap : 0) + w;
    rows[k].push({ item: id, w });
    placed++;
  }
  const taken = new Set(rows.flat().map((r) => r.item));
  shelves.forEach((s, k) => {
    if (rows[k].length || placed >= n) return;
    const id = pool.find((id) => !taken.has(id) && sizeOf(id).h <= s.room && sizeOf(id).w <= (s.x1 - s.x0) * 1.6);
    if (!id) return;
    taken.add(id);
    used[k] = sizeOf(id).w;
    rows[k].push({ item: id, w: used[k] });
    placed++;
  });
  return rows.flatMap((row, i) => {
    const s = shelves[i];
    let x = (s.x0 + s.x1) / 2 - used[i] / 2;
    return row.map(({ item, w }) => {
      const at = { item, x: x + w / 2, y: s.y };
      x += w + gap;
      return at;
    });
  });
}

/** Cookers: drop food on them and it cooks (steam, a ding, and it's fresh to eat again). */
export const COOKS = /oven|stove|cooker|grill|toaster|microwave|bbq|cauldron|pizza_oven|espresso|coffee_machine|kettle/;
/** Things that switch on and off with a tap (and glow, or show a picture). */
export const SWITCHES = /lamp|light|lantern|candle|tv|television|computer|screen|radio|telescope|disco|neon|fairy_lamp|chandelier/;
export const SCREENS = /tv|television|computer|screen|monitor/;
/** Splashy things: people put in them get bubbles and a happy wiggle. */
export const SPLASH = /bath|tub|shower|pool_water|jacuzzi|hot_tub|splash|fountain/;
/** Things that rock or swing when someone sits on them. */
export const SWINGS = /swing|hammock|rocking|carousel|ferris|seesaw|cradle/;
/** Animals (and toy horses) people can ride: dropped on one, they sit on its back and ride along when it moves. */
export const MOUNTS = /standing_horse|little_pony|baby_elephant|tall_giraffe|friendly_lion|happy_dolphin|cute_sea_turtle|rocking_horse|unicorn|camel|donkey/;
/** Where a ride's back is, as a share of its height (for drawings without a seat point). */
const MOUNT_BACK: [RegExp, number][] = [[/elephant/, 0.82], [/giraffe/, 0.5], [/dolphin|turtle/, 0.72], [/pony/, 0.58], [/.*/, 0.62]];
export const mountBack = (itemId: string) => MOUNT_BACK.find(([re]) => re.test(tpl(itemId)))![1];
/** Salon chairs: sitting there opens the hairstyle panel. */
export const SALON = /salon_chair|barber|styling_chair/;
/** Makeup that shows on a face when dropped on it, and where. */
export function makeupKind(itemId: string): 'lips' | 'blush' | 'eyes' | 'glitter' | null {
  const t = tpl(itemId);
  if (categoryOf(itemId) !== 'makeup' && !/lipstick|blush|eyeshadow|glitter|lip_balm|powder/.test(t)) return null;
  if (/lip/.test(t)) return 'lips';
  if (/blush|powder|compact/.test(t)) return 'blush';
  if (/eye|shadow|palette|mascara/.test(t)) return 'eyes';
  if (/glitter|sparkle|nail/.test(t)) return 'glitter';
  return categoryOf(itemId) === 'makeup' ? 'glitter' : null;
}

export const is = (re: RegExp, itemId: string) => re.test(tpl(itemId));
export const templateOf = (itemId: string) => templates.get(tpl(itemId));
