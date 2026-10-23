// Put real shelves in places' indoor floors and stock every level with small things that belong there (rules, not the
// model). Shops, salons and sweet shops get up to three shelves; other indoor floors one, where it fits. Every entry
// is checked with shelfStockErrors and only passing ones are written to src/data/shelf-stock.json.
//
//   node tools/stock-shelves.ts [--seed 7]
import { writeFileSync } from 'node:fs';
import { FILES, load } from './kinds.ts';
import { shelfStockErrors, surfaceLevels, type ShelfStock } from '../schemas/shelf-stock.ts';
import { WALL_HEIGHT, type Floor, type Place, type Placed } from '../schemas/place.ts';
import type { Item } from '../schemas/item.ts';
import type { Template } from '../schemas/template.ts';
import type { PlanEntry } from '../schemas/plan.ts';
import { isWearable } from '../schemas/vocab.ts';
import { themeFor } from '../src/art/themes.ts';

const args = process.argv.slice(2);
let seed = Number(args.includes('--seed') ? args[args.indexOf('--seed') + 1] : 7);
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(a: readonly T[]): T => a[Math.floor(rand() * a.length)];
const shuffle = <T>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const templates = new Map(load<Template>(FILES.template).map((t) => [t.id, t]));
const itemList = load<Item>(FILES.item);
const items = new Map(itemList.map((i) => [i.id, i]));
const places = load<Place>(FILES.place);
const plan = new Map(load<PlanEntry>(FILES.plan).map((p) => [p.id, p]));
const tpl = (id: string) => templates.get(items.get(id)?.template ?? '');

/** Shelf units that stand on the floor, by the backdrop they suit best; wall shelves hang anywhere. */
const STANDING: Record<string, string[]> = {
  shop: ['shop_shelving_unit', 'cube_storage_shelf', 'low_display_cabinet'],
  salon: ['glass_display_shelf', 'low_display_cabinet', 'ladder_shelf'],
  candy: ['shop_shelving_unit', 'glass_display_shelf'],
  default: ['tall_open_bookcase', 'low_display_cabinet', 'ladder_shelf', 'cube_storage_shelf'],
};
const HANGING = ['wall_double_shelf', 'wall_plank_shelf'];
const SHOPS = new Set(['shop', 'salon', 'candy']);
/** Small things for shelves anywhere: the ornaments made for them. */
const ORNAMENTS = ['small_flower_vase', 'photo_frame_stand', 'trophy_cup', 'snow_globe', 'candle_jar', 'book_stack', 'sweet_jar', 'cat_ornament', 'desk_globe', 'music_box', 'piggy_bank', 'fairy_light_jar', 'succulent_pot'];
/** What each shop sells, by place: tags are too loose for shops (restaurant food is tagged sweets, pet toys are toys). */
const SHOP_STOCK: Record<string, string[]> = {
  makeup_shop: ['cute_lipstick', 'lip_balm', 'blush_pot', 'powder_compact', 'eyeshadow_palette', 'brush_set', 'perfume_bottle', 'tissue_box'],
  hair_dressers: ['hair_dryer', 'salon_comb', 'salon_scissors', 'hair_clips', 'perfume_bottle', 'candle_jar', 'small_flower_vase'],
  sweets_shop: ['candy_heart', 'gummy_bears', 'chocolate_bar', 'sprinkle_jar', 'candy_apple', 'cute_cupcake', 'pink_donut', 'food_street_cupcake', 'sweet_jar', 'candy_bowl'],
  toy_shop: ['building_blocks', 'plush_bunny', 'jigsaw_puzzle', 'toy_car', 'board_game', 'train_set', 'bouncy_ball_toy', 'snow_globe', 'music_box', 'diamond_kite', 'cute_photo_flash', 'rocket_toy'],
  pet_shop: ['pet_food_bowl', 'toy_mouse', 'cat_bell_toy', 'yarn_ball', 'hamster_ball', 'tiny_party_hat', 'goldfish_bowl', 'treat_jar', 'bone_toy', 'water_bowl'],
  paint_shop: ['paint_cans', 'paintbrush', 'paint_roller', 'paint_palette', 'paint_sponge', 'colour_mixing_bowl', 'crayon_box'],
  eye_opticians: ['lens_case', 'contact_lens_box', 'eye_drop_bottle', 'reading_glasses_tray', 'small_flower_vase'],
  supermarket: ['bread_loaf', 'cereal_box', 'banana', 'cheese_wedge', 'egg_carton', 'carrot', 'milk_carton', 'zoo_fruit_basket', 'cute_apple', 'fizzy_drink', 'cute_juice_box'],
  school_shopping_place: ['school_shopping_notebook', 'school_shopping_ruler', 'school_shopping_eraser', 'glue_stick', 'crayon_box', 'zipper_pencil_case', 'school_zip_pencil_case', 'school_water_bottle', 'cute_lunchbox', 'school_shopping_lunchbox'],
  malls: ['perfume_bottle', 'plush_bunny', 'snow_globe', 'music_box', 'cute_lipstick', 'toy_car', 'board_game', 'piggy_bank', 'photo_frame_stand', 'candle_jar', 'small_flower_vase'],
  theme_park: ['plush_bunny', 'cute_photo_flash', 'coaster_place_sticker', 'theme_park_ticket_stamp', 'snow_globe', 'piggy_bank', 'candy_apple'],
  rollercoaster_place: ['plush_bunny', 'cute_photo_flash', 'coaster_place_sticker', 'theme_park_ticket_stamp', 'snow_globe', 'piggy_bank', 'trophy_cup'],
};
/** Place tags too broad to choose stock by ("shop" alone would put pet food in the makeup shop). */
const BROAD = new Set(['outdoor', 'cosy', 'fancy', 'party', 'birthday', 'wall', 'living', 'garden', 'shop', 'kitchen', 'kids_room', 'pet']);
const SMALL_CATS = new Set(['food', 'drink', 'toy', 'school', 'makeup', 'sport', 'decor', 'plant', 'halloween', 'baby']);

const colourway = (template: string) => {
  const list = itemList.filter((i) => i.template === template && !i.tags.includes('halloween') && !i.tags.includes('christmas'));
  return list.length ? pick(list).id : undefined;
};

/** Things that could stand on a shelf in this place: its own small things, things tagged for it, ornaments. */
function stockPool(p: Place, f: Floor, shop: boolean): string[] {
  const tags = new Set((plan.get(p.id)?.tags ?? []).filter((t) => !BROAD.has(t)));
  const ok = (i: Item) => {
    const t = templates.get(i.template);
    return !!t?.size && !isWearable(t.category) && SMALL_CATS.has(t.category) && !i.tags.includes('wall') && !i.tags.includes('halloween') && !i.tags.includes('christmas') && t.size.w <= 24 && t.size.h <= 28 && surfaceLevels(t).length === 0;
  };
  const sells = SHOP_STOCK[p.id];
  if (sells) return itemList.filter((i) => sells.includes(i.template) && ok(i) && !i.tags.includes('halloween') && !i.tags.includes('christmas')).map((i) => i.id);
  const own = f.items.map((x) => items.get(x.item)!).filter((i) => i && ok(i));
  const tagged = itemList.filter((i) => ok(i) && i.tags.some((x) => tags.has(x)));
  const orn = itemList.filter((i) => ORNAMENTS.includes(i.template) && ok(i));
  // Shops sell what they are about; elsewhere shelves are for ornaments and a few of the room's things.
  return [...new Set(shop ? [...own, ...tagged, ...own] : [...orn, ...orn, ...own, ...tagged.slice(0, 20)])].map((i) => i.id);
}

type Rect = { a: number; b: number; lo: number; hi: number };
const rectOf = (x: Placed): Rect | null => {
  const t = tpl(x.item);
  return t?.size ? { a: x.x - t.size.w / 2, b: x.x + t.size.w / 2, lo: x.y ?? 0, hi: (x.y ?? 0) + t.size.h } : null;
};
const hits = (r: Rect, s: Rect, pad = 2) => Math.min(r.b, s.b) - Math.max(r.a, s.a) > -pad && Math.min(r.hi, s.hi) - Math.max(r.lo, s.lo) > -pad;

/** Stand stock on each level of a shelf, left to right, leaving room under the next level up. */
function fill(shelf: Placed, pool: string[], shown: Set<string>): Placed[] {
  const t = tpl(shelf.item)!, y0 = shelf.y ?? 0;
  const levels = surfaceLevels(t);
  const out: Placed[] = [];
  levels.forEach((h, k) => {
    const room = (k + 1 < levels.length ? levels[k + 1] - h : Math.min(26, WALL_HEIGHT - (y0 + h))) - 2;
    let x = shelf.x - t.size!.w / 2 + 3;
    const end = shelf.x + t.size!.w / 2 - 3;
    const per = new Map<string, number>();
    for (const id of shuffle(pool.filter((i) => tpl(i)!.size!.h <= room)).sort((a, b) => Number(shown.has(a)) - Number(shown.has(b)))) {
      const w = tpl(id)!.size!.w, kind = items.get(id)!.template;
      // At most two of a kind on a level, so a shelf shows a little of everything.
      if (x + w > end || (per.get(kind) ?? 0) >= 2) continue;
      per.set(kind, (per.get(kind) ?? 0) + 1);
      out.push({ item: id, x: Math.round((x + w / 2) * 10) / 10, y: Math.round((y0 + h) * 100) / 100 });
      shown.add(id);
      x += w + 2;
    }
  });
  return out;
}

const result: ShelfStock[] = [];
const placeMap = new Map(places.map((p) => [p.id, p]));
let shelvesPut = 0, stockPut = 0;
for (const p of places) {
  p.floors.forEach((f, fi) => {
    if (f.outdoor) return;
    const kind = themeFor(p.id, f.name, false).kind;
    const shop = SHOPS.has(kind);
    const pool = stockPool(p, f, shop);
    if (pool.length < 3) return;
    const want = shop ? 3 : 1;
    const entry: ShelfStock = { id: `${p.id}:${fi}`, items: [] };
    const taken = () => [...f.items, ...entry.items].map(rectOf).filter((r): r is Rect => !!r);
    const shown = new Set<string>();
    const tryPut = (shelf: Placed): boolean => {
      const r = rectOf(shelf)!;
      if (r.a < 0 || r.b > f.width || r.hi > WALL_HEIGHT - 4 || taken().some((o) => hits(r, o))) return false;
      const stock = fill(shelf, pool, shown);
      const candidate = { ...entry, items: [...entry.items, shelf, ...stock] };
      if (stock.length < 2 || shelfStockErrors(candidate, [], { items, templates, places: placeMap }).length) return false;
      entry.items = candidate.items;
      shelvesPut++;
      stockPut += stock.length;
      return true;
    };
    // Shelf units the floor already has are stocked first.
    for (const unit of f.items.filter((x) => tpl(x.item)?.anchors?.shelf1)) {
      const stock = fill(unit, pool, shown);
      const candidate = { ...entry, items: [...entry.items, ...stock] };
      if (stock.length && !shelfStockErrors(candidate, [], { items, templates, places: placeMap }).length) {
        entry.items = candidate.items;
        stockPut += stock.length;
      }
    }
    // Standing units first (they need a gap on the floor), then shelves hung on the wall above the floor things.
    const standing = (STANDING[kind] ?? STANDING.default).filter((t) => templates.has(t));
    const hanging = HANGING.filter((t) => templates.has(t));
    let put = 0;
    for (const tid of shuffle([...standing])) {
      if (put >= (shop ? 1 : 1)) break;
      const id = colourway(tid), w = templates.get(tid)!.size!.w;
      if (!id) continue;
      for (let x = Math.ceil(w / 2) + 2; x < f.width - w / 2 - 2; x += 6) if (tryPut({ item: id, x })) { put++; break; }
    }
    for (let tries = 0; put < want && tries < 6; tries++) {
      const tid = pick(hanging);
      const id = tid && colourway(tid);
      if (!id) break;
      const w = templates.get(tid)!.size!.w;
      let ok = false;
      for (const y of [92, 84, 100, 76, 108]) {
        for (let x = Math.ceil(w / 2) + 4 + Math.floor(rand() * 40); x < f.width - w / 2 - 4 && !ok; x += 8) ok = tryPut({ item: id, x, y });
        if (ok) break;
      }
      if (ok) put++;
    }
    if (entry.items.length) result.push(entry);
  });
}
const bad = result.flatMap((e) => shelfStockErrors(e, result, { items, templates, places: placeMap }));
if (bad.length) {
  console.log(bad.slice(0, 20).join('\n'));
  process.exit(1);
}
writeFileSync(FILES.shelfStock, JSON.stringify(result, null, 2) + '\n');
console.log(`${result.length} floors stocked: ${shelvesPut} shelves, ${stockPut} things on them`);
