// What things do, by what they are (template id). The notes ask for lots to do in every place; these rules make
// fridges open, ovens cook, lamps and TVs switch on, baths bubble, swings swing, salon chairs restyle hair, and
// makeup show on faces.
import { categoryOf, items, templates } from '../data/index.ts';

const tpl = (itemId: string) => items.get(itemId)?.template ?? '';

/** Containers: tapping opens them; what's inside depends on what they are. */
export const CONTAINERS: { test: RegExp; inside: (itemId: string) => boolean; emoji: string }[] = [
  { test: /fridge|freezer|cooler|ice_cream_cart/, inside: (id) => ['food', 'drink'].includes(categoryOf(id)), emoji: '🧊' },
  { test: /cookie_jar|candy_jar|sweet|treat_jar|candy_bowl|candy_bucket|sprinkle/, inside: (id) => categoryOf(id) === 'food' && /cookie|candy|sweet|donut|cupcake|chocolate|gumm|lolli|heart/.test(tpl(id)), emoji: '🍪' },
  { test: /toy_box|toy_chest|treasure_chest|gift_cabinet|parcel|post_box|big_post_box/, inside: (id) => categoryOf(id) === 'toy', emoji: '🎁' },
  { test: /cupboard|pantry|kitchen_cabinet|fruit_stand|snack_basket|picnic_basket/, inside: (id) => categoryOf(id) === 'food', emoji: '🥫' },
  { test: /backpack_shelf|school_locker|pencil|crayon_box/, inside: (id) => categoryOf(id) === 'school', emoji: '✏️' },
  { test: /first_aid|medicine|bandage/, inside: (id) => /bandage|plaster|stethoscope|thermometer|medicine/.test(tpl(id)), emoji: '🩹' },
  { test: /makeup|lipstick_display|nail_polish_rack|product_shelf|vanity/, inside: (id) => categoryOf(id) === 'makeup', emoji: '💄' },
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

/** Cookers: drop food on them and it cooks (steam, a ding, and it's fresh to eat again). */
export const COOKS = /oven|stove|cooker|grill|toaster|microwave|bbq|cauldron|pizza_oven|espresso|coffee_machine|kettle/;
/** Things that switch on and off with a tap (and glow, or show a picture). */
export const SWITCHES = /lamp|light|lantern|candle|tv|television|computer|screen|radio|telescope|disco|neon|fairy_lamp|chandelier/;
export const SCREENS = /tv|television|computer|screen|monitor/;
/** Splashy things: people put in them get bubbles and a happy wiggle. */
export const SPLASH = /bath|tub|shower|pool_water|jacuzzi|hot_tub|splash|fountain/;
/** Things that rock or swing when someone sits on them. */
export const SWINGS = /swing|hammock|rocking|carousel|ferris|seesaw|cradle/;
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
