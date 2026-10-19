// Rule-based content for the proof of concept, used while the local model is busy (user's OK, 2026-10-19).
// Every entry goes through the same validators as model-made content; nothing that fails is written.
//
//   node tools/auto-content.ts items|places|houses|characters|daily [--seed 7]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { FILES, load } from './kinds.ts';
import { checkSvg } from '../schemas/svg.ts';
import { itemErrors, ITEM_TAGS, type Item } from '../schemas/item.ts';
import { placeErrors, WALL_HEIGHT, OUTDOOR_HEIGHT, type Floor, type Place, type Placed } from '../schemas/place.ts';
import { houseErrors, type House } from '../schemas/house.ts';
import { characterErrors, SKIN_TONES, type Character } from '../schemas/character.ts';
import { dailyErrors, dailyId, type Daily } from '../schemas/daily.ts';
import type { Template } from '../schemas/template.ts';
import type { PlanEntry } from '../schemas/plan.ts';
import { AGE_GROUPS, isWearable } from '../schemas/vocab.ts';

const args = process.argv.slice(2);
const what = args[0];
let seed = Number(args.includes('--seed') ? args[args.indexOf('--seed') + 1] : 7);
const rand = () => {
  seed |= 0;
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
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s: string) => norm(s).split(' ').filter((w) => w.length > 2 && !['cute', 'cozy', 'cosy', 'the', 'and', 'big', 'little', 'small', 'mini'].includes(w));

const templates = load<Template>(FILES.template);
const tById = new Map(templates.map((t) => [t.id, t]));
const plan = load<PlanEntry>(FILES.plan);
/** Signature pieces drawn for specific places (template id → place ids), see tools/draw-kit.ts. */
const SIGS = (existsSync('src/data/signatures.json') ? JSON.parse(readFileSync('src/data/signatures.json', 'utf8')) : {}) as Record<string, string[]>;
const save = (file: string, list: unknown[]) => writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`);

/** Which plan entries a template was drawn for (its name matches one of their first 10 things). */
function placesOf(t: Template): PlanEntry[] {
  if (SIGS[t.id]) return plan.filter((p) => SIGS[t.id].includes(p.id));
  const tw = new Set([...words(t.name), ...words(t.id.replace(/_/g, ' '))]);
  return plan.filter((p) => p.things.slice(0, 10).some((thing) => {
    const w = words(thing);
    return w.length > 0 && w.filter((x) => tw.has(x) || tw.has(x.replace(/s$/, ''))).length >= Math.min(2, w.length);
  }));
}

// ---------------------------------------------------------------- items
const FAMILIES: { name: string; p: Item['palette']; tag?: string; cats?: string[] }[] = [
  { name: 'Strawberry', p: { main: '#ff8fb8', trim: '#ffe0ec', accent: '#ffd36e', outline: '#9c3d64' } },
  { name: 'Mint', p: { main: '#8fe3c8', trim: '#e6fff6', accent: '#ff9fb8', outline: '#2f7d68' } },
  { name: 'Lemon', p: { main: '#ffe066', trim: '#fff7d1', accent: '#7fb8ff', outline: '#a07a12' } },
  { name: 'Sky', p: { main: '#7fc4ff', trim: '#e3f2ff', accent: '#ffd36e', outline: '#2f5f8f' } },
  { name: 'Lilac', p: { main: '#c3a6ff', trim: '#f1e9ff', accent: '#ff9fb8', outline: '#5f4799' } },
  { name: 'Cocoa', p: { main: '#b07a54', trim: '#f2dcc6', accent: '#ff8fb8', outline: '#5c3a22' }, cats: ['furniture', 'vehicle', 'garden', 'sport', 'school', 'animal'] },
  { name: 'Spooky', p: { main: '#ff9f43', trim: '#7b4fa0', accent: '#8ce99a', outline: '#3d2457' }, tag: 'halloween', cats: ['decor', 'plant', 'toy', 'furniture', 'garden', 'halloween'] },
  { name: 'Festive', p: { main: '#e63946', trim: '#3fa66b', accent: '#ffd36e', outline: '#7a1d26' }, tag: 'christmas', cats: ['decor', 'plant', 'toy', 'garden'] },
];
const CAT_TAGS: Record<string, string[]> = {
  decor: ['living'], furniture: ['living'], vehicle: ['station', 'outdoor'], toy: ['toys', 'kids_room'], garden: ['garden', 'outdoor'],
  plant: ['garden'], drink: ['cafe', 'kitchen'], food: ['kitchen', 'cafe'], sport: ['sport'], school: ['school'], makeup: ['makeup'],
  baby: ['baby', 'nursery'], elder: ['elder'], halloween: ['halloween'],
  hat: ['shop', 'mall'], glasses: ['optician', 'shop'], bag: ['shop', 'mall'], shoes: ['shop', 'mall'], top: ['shop', 'mall'], bottom: ['shop', 'mall'], dress: ['shop', 'mall'], socks: ['shop', 'mall'],
};
const PET = /cat|kitten|dog|pup|bunny|rabbit|hamster|guinea|fish|bird|budgie|parrot|horse|pony|turtle|tortoise/;
const WALL = /clock|picture|frame|poster|sign|mirror|board|menu|map|garland|banner|calendar|wreath|window|bunting|painting|chart/;
const BROAD = new Set(['outdoor', 'cosy', 'fancy', 'vip', 'wall', 'party', 'birthday']);

function agesFor(id: string): string[] | undefined {
  if (/baby/.test(id)) return ['baby', 'toddler'];
  if (/toddler/.test(id)) return ['toddler', 'kid'];
  if (/kid/.test(id)) return ['toddler', 'kid'];
  if (/teen/.test(id)) return ['teen', 'adult'];
  if (/grandma|grandpa|granny/.test(id)) return ['adult', 'elder'];
  return undefined;
}

function makeItems(): void {
  const items = load<Item>(FILES.item);
  const covered = new Set(items.map((i) => i.template));
  let added = 0, failed = 0;
  for (const t of templates) {
    if (covered.has(t.id) || t.category === 'hair') continue;
    const fromPlan = placesOf(t).flatMap((p) => p.tags).filter((x) => !BROAD.has(x));
    const tags = new Set([...fromPlan, ...(CAT_TAGS[t.category] ?? [])]);
    if (t.category === 'animal') tags.add(PET.test(t.id) ? 'pet' : 'zoo');
    if (WALL.test(t.id) && ['decor', 'school', 'sport'].includes(t.category)) tags.add('wall');
    const fams = FAMILIES.filter((f) => !f.cats || f.cats.includes(t.category));
    for (const f of fams.slice(0, t.category === 'decor' || t.category === 'furniture' ? 8 : 5)) {
      const it: Item = {
        id: `${t.id.slice(0, 38)}_${f.name.toLowerCase()}`,
        name: `${f.name} ${t.name}`.slice(0, 30),
        template: t.id,
        palette: { ...f.p },
        tags: [...new Set([...(f.tag ? [f.tag] : []), ...tags])].filter((x) => (ITEM_TAGS as readonly string[]).includes(x)).slice(0, 6),
      };
      if (t.category === 'food') it.bites = 3;
      if (t.category === 'drink') it.bites = 2;
      const ages = isWearable(t.category) ? agesFor(t.id) : undefined;
      if (ages) it.ages = ages;
      const errs = itemErrors(it, [...items, it], tById);
      if (errs.length) {
        failed++;
        console.log(`  ✗ ${errs[0]}`);
        continue;
      }
      items.push(it);
      added++;
    }
  }
  save(FILES.item, items);
  console.log(`items: +${added} (${failed} rejected), ${items.length} total`);
}

// ---------------------------------------------------------------- layouts
type Ctx = { items: Map<string, Item>; templates: Map<string, Template> };
const ctx = (): Ctx => ({ items: new Map(load<Item>(FILES.item).map((i) => [i.id, i])), templates: tById });
const catOf = (c: Ctx, id: string) => c.templates.get(c.items.get(id)?.template ?? '')?.category ?? '';
const sizeOf = (c: Ctx, id: string) => c.templates.get(c.items.get(id)?.template ?? '')?.size ?? { w: 20, h: 20 };
const SMALL = new Set(['food', 'drink', 'school', 'makeup']);
const STANDING = new Set(['furniture', 'garden', 'plant', 'vehicle', 'decor', 'baby', 'elder', 'halloween', 'toy', 'sport', 'animal']);

function topOf(c: Ctx, id: string): number | null {
  const t = c.templates.get(c.items.get(id)?.template ?? '');
  const top = t?.anchors?.top;
  if (!t || !top || !t.size) return null;
  const box = checkSvg(t.svg).box;
  if (!box) return null;
  const base = t.anchors?.base?.[1] ?? box.maxY;
  return Math.round(((base - top[1]) * t.size.h) / Math.max(1, box.maxY - box.minY));
}

/** Lay items out along a floor: standing things spaced left to right, small things on tables, wall things up high. */
function layFloor(c: Ctx, pool: string[], outdoor: boolean, want: number, maxW = 1200, avoid: Set<string> = new Set()): { items: Placed[]; width: number } {
  const limit = maxW - 40;
  const H = outdoor ? OUTDOOR_HEIGHT : WALL_HEIGHT;
  const fits = (id: string) => sizeOf(c, id).h <= (c.items.get(id)?.tags.includes('wall') ? H - 60 : H - 4);
  const usedTemplates = new Set<string>();
  const chosen: string[] = [];
  // Things not used on other floors first; repeats only to reach a minimum of 5.
  for (const pass of [0, 1]) {
    for (const id of pool) {
      const tpl = c.items.get(id)!.template;
      if (usedTemplates.has(tpl) || !fits(id) || (pass === 0 && avoid.has(tpl))) continue;
      usedTemplates.add(tpl);
      chosen.push(id);
      if (chosen.length >= want) break;
    }
    if (chosen.length >= want) break;
  }
  const wall = chosen.filter((id) => c.items.get(id)!.tags.includes('wall') && !SMALL.has(catOf(c, id)));
  const small = chosen.filter((id) => SMALL.has(catOf(c, id)));
  // Big and small things alternate, so a floor reads as a scene rather than a queue.
  const bySize = chosen.filter((id) => !wall.includes(id) && !small.includes(id) && STANDING.has(catOf(c, id))).sort((a, b) => sizeOf(c, b).h - sizeOf(c, a).h);
  const standing: string[] = [];
  while (bySize.length) {
    standing.push(bySize.shift()!);
    if (bySize.length) standing.push(bySize.pop()!);
  }
  const placed: Placed[] = [];
  let x = 30;
  const tables: { x: number; w: number; top: number }[] = [];
  for (const id of standing) {
    const { w } = sizeOf(c, id);
    if (x + w > limit) continue;
    placed.push({ item: id, x: Math.round(x + w / 2) });
    const top = topOf(c, id);
    if (top !== null && top < H - 30) tables.push({ x: x + w / 2, w, top });
    x += w + 6 + rand() * 14;
  }
  for (const [i, id] of small.entries()) {
    const t = tables[i % Math.max(1, tables.length)];
    const { w } = sizeOf(c, id);
    if (t && w < t.w) placed.push({ item: id, x: Math.round(t.x + (i >= tables.length ? w * 0.6 : 0)), y: t.top });
    else if (x + w <= limit) {
      placed.push({ item: id, x: Math.round(x + w / 2) });
      x += w + 20;
    }
  }
  const width = Math.round(Math.min(maxW, Math.max(maxW < 1200 ? 200 : 400, x + 30)));
  let wx = 60;
  for (const id of wall) {
    const { w, h } = sizeOf(c, id);
    if (wx + w > width - 20) break;
    placed.push({ item: id, x: Math.round(wx + w / 2), y: Math.round(Math.min(H - h - 10, outdoor ? 120 : 75)) });
    wx += w + 60;
  }
  return { items: placed, width };
}

const WALLS = ['#ffe3ef', '#fff3d6', '#e3f6ff', '#eae3ff', '#e6fff2', '#fff0e6', '#f6ecff', '#e8f7e4'];
const GROUNDS = { indoor: ['#d9b38c', '#c9a27a', '#e8d2b8', '#cfd8e8', '#e6c3d6'], grass: '#8ce99a', snow: '#f4f8ff', sand: '#f6e3b4', cloud: '#ffffff', water: '#7fd1ff' };

function groundFor(name: string, p: PlanEntry, outdoor: boolean): string {
  const s = `${name} ${p.tags.join(' ')} ${p.id}`;
  if (!outdoor) return pick(GROUNDS.indoor);
  if (/snow|slope/.test(s)) return GROUNDS.snow;
  if (/beach|shore|dune|sand/.test(s)) return GROUNDS.sand;
  if (/cloud|sky|star/.test(s)) return GROUNDS.cloud;
  if (/pool|wave|splash|water/.test(s)) return GROUNDS.water;
  return GROUNDS.grass;
}

function makePlaces(): void {
  const c = ctx();
  const all = [...c.items.values()].filter((i) => !isWearable(catOf(c, i.id)));
  const out: Place[] = [];
  const hidden = plan.filter((p) => p.hidden);
  // Templates that were drawn for some place: they belong there, not borrowed elsewhere.
  const ownedElsewhere = new Set(templates.filter((t) => placesOf(t).length > 0).map((t) => t.id));
  const visible = plan.filter((p) => !p.hidden);
  for (const p of plan) {
    // Items drawn for this place first, then items tagged for it, then a few general plants and decor.
    const linked = new Set(templates.filter((t) => placesOf(t).some((q) => q.id === p.id)).map((t) => t.id));
    // Borrow by the place's main tag only (secondary tags like "pet" or "cosy" pulled in the wrong things).
    const tags = new Set(p.tags.filter((t) => !BROAD.has(t) && !['pet', 'living', 'garden', 'kids_room', 'baby', 'nursery'].includes(t)).slice(0, 1));

    // Borrow only generic things (not another place's own drawings), and seasonal colours only where they belong.
    const seasonalOk = (i: Item) => p.tags.includes('halloween') ? true : !i.tags.includes('halloween') && !i.tags.includes('christmas');
    // Signature pieces first (one colourway each, in a random order), then the rest of the place's own things.
    const sig = shuffle(all.filter((i) => SIGS[i.template]?.includes(p.id) && seasonalOk(i)).map((i) => i.id));
    const own = [...sig, ...shuffle(all.filter((i) => linked.has(i.template) && !SIGS[i.template]?.includes(p.id) && seasonalOk(i)).map((i) => i.id))];
    // Places with few drawings of their own may borrow tagged things from other places.
    const borrow = new Set(own.map((id) => c.items.get(id)!.template)).size < 4;
    const tagged = shuffle(all.filter((i) => !linked.has(i.template) && (borrow || !ownedElsewhere.has(i.template)) && i.tags.some((t) => tags.has(t)) && seasonalOk(i)).map((i) => i.id));
    // A little generic greenery only: plants, never lamps or random decor.
    const general = shuffle(all.filter((i) => catOf(c, i.id) === 'plant' && !ownedElsewhere.has(i.template) && seasonalOk(i)).map((i) => i.id)).slice(0, 2);
    const floors: Floor[] = [];
    const usedHere = new Set<string>();
    p.floors.forEach((fname, fi) => {
      const outdoor = /\(outdoor\)/i.test(fname);
      const name = fname.replace(/\s*\(outdoor\)\s*/i, '').trim().slice(0, 24);
      const prefer = (id: string) => {
        const cat = catOf(c, id);
        return outdoor ? ['garden', 'plant', 'vehicle', 'animal', 'sport', 'toy'].includes(cat) : !['vehicle'].includes(cat);
      };
      // Each floor gets its own share of the place's things first (template k goes to floor k mod n), so floors differ;
      // then the rest, then borrowed and general things. Vehicles never go indoors.
      const n = p.floors.length;
      const ownTemplates = [...new Set(own.map((id) => c.items.get(id)!.template))];
      const mine = own.filter((id) => ownTemplates.indexOf(c.items.get(id)!.template) % n === fi);
      const rotate = <T>(a: T[]) => a.slice(fi * 5).concat(a.slice(0, fi * 5));
      const indoorOk = (id: string) => outdoor || catOf(c, id) !== 'vehicle';
      // A floor's own share first, then the place's other things (other colourways), then tagged, then general.
      const others = shuffle(own.filter((id) => !mine.includes(id)));
      // Signature pieces on every floor first (they make the place what it is), then this floor's share of the
      // place's own things, then its other things, then borrowed and a little greenery. Fewer, fitting things beat
      // a full floor of fillers.
      const sigHere = sig.filter((id) => prefer(id) && indoorOk(id));
      const pool = [...sigHere, ...mine.filter(prefer), ...mine, ...others.filter(prefer), ...others, ...rotate(tagged).filter(prefer), ...rotate(tagged), ...general].filter(indoorOk);
      const fitting = new Set([...sig, ...own, ...tagged].map((id) => c.items.get(id)!.template)).size;
      const want = Math.max(6, Math.min(12, fitting + 1));
      const { items, width } = layFloor(c, pool, outdoor, want, 1200, new Set([...usedHere].filter((t) => !sig.some((id) => c.items.get(id)!.template === t))));
      // Only the place's own things are kept to one floor; generic things may repeat.
      for (const it of items) if (ownTemplates.includes(c.items.get(it.item)!.template)) usedHere.add(c.items.get(it.item)!.template);
      floors.push({ name, outdoor, wall: outdoor ? '#bfe6ff' : pick(WALLS), ground: groundFor(fname, p, outdoor), width, items });
    });
    // Each hidden place gets a secret spot in a visible place, so it can be found.
    const place: Place = { id: p.id, name: p.name, emoji: p.emoji, district: p.district, ...(p.hidden ? { hidden: true } : {}), floors };
    const vi = visible.indexOf(p);
    const leads = hidden.filter((_, k) => (k * 3) % visible.length === vi);
    for (const h of leads) {
      const f = floors[0];
      const spotAt = f.items.find((i) => ['plant', 'decor', 'furniture'].includes(catOf(c, i.item))) ?? f.items[0];
      if (spotAt) (f.hidden ??= []).push({ x: spotAt.x, y: Math.min(40, sizeOf(c, spotAt.item).h / 2), reveal: { place: h.id } });
    }
    // Drop floors that came out too thin, keeping at least one.
    const full = place.floors.filter((f) => f.items.length >= 4);
    place.floors = full.length ? full : [place.floors.reduce((a, b) => (b.items.length > a.items.length ? b : a))];
    out.push(place);
  }
  const good: Place[] = [];
  for (const p of out) {
    const errs = placeErrors(p, out, c);
    if (errs.length) console.log(`  ✗ ${p.id}: ${errs.length} problem(s): ${errs.slice(0, 2).join(' | ')}`);
    else good.push(p);
  }
  // Hidden spots must lead to places that made it.
  for (const p of good) for (const f of p.floors) if (f.hidden) f.hidden = f.hidden.filter((s) => !s.reveal.place || good.some((g) => g.id === s.reveal.place));
  save(FILES.place, good);
  console.log(`places: ${good.length}/${out.length} pass`);
}

// ---------------------------------------------------------------- houses
const HOUSE_SPECS: { id: string; name: string; style: string; roof: string; ext: House['exterior']; floors: { rooms: string[]; outdoor?: boolean; name: string }[] }[] = [
  { id: 'rosy_cottage', name: 'Rosy Cottage', style: 'cottage', roof: 'gable', ext: { walls: '#ffe3ef', roof: '#c2557a', door: '#7fd1c7', trim: '#ffffff' }, floors: [{ name: 'Garden', outdoor: true, rooms: ['garden'] }, { name: 'Downstairs', rooms: ['kitchen', 'living'] }, { name: 'Upstairs', rooms: ['bedroom', 'bathroom'] }] },
  { id: 'mint_modern', name: 'Mint Modern', style: 'modern', roof: 'flat', ext: { walls: '#e6fff6', roof: '#2f7d68', door: '#ffd36e', trim: '#ffffff' }, floors: [{ name: 'Ground Floor', rooms: ['living', 'kitchen'] }, { name: 'Top Floor', rooms: ['bedroom', 'kids_room', 'bathroom'] }] },
  { id: 'sparkle_mansion', name: 'Sparkle Mansion', style: 'mansion', roof: 'hip', ext: { walls: '#fff3d6', roof: '#b58a2e', door: '#c2557a', trim: '#ffffff' }, floors: [{ name: 'Pool Garden', outdoor: true, rooms: ['pool', 'garden'] }, { name: 'Grand Hall', rooms: ['living', 'kitchen'] }, { name: 'Bedrooms', rooms: ['bedroom', 'teen_room', 'bathroom'] }, { name: 'Playroom Attic', rooms: ['playroom', 'nursery'] }] },
  { id: 'seashell_beach_house', name: 'Seashell Beach House', style: 'beach', roof: 'hip', ext: { walls: '#e3f2ff', roof: '#7fc4ff', door: '#ff9f43', trim: '#ffffff' }, floors: [{ name: 'Beach Garden', outdoor: true, rooms: ['garden'] }, { name: 'Downstairs', rooms: ['kitchen', 'living', 'bathroom'] }, { name: 'Sunny Bedroom', rooms: ['bedroom'] }] },
  { id: 'cosy_cabin', name: 'Cosy Cabin', style: 'cabin', roof: 'gable', ext: { walls: '#d9b38c', roof: '#7a4a2a', door: '#3fa66b', trim: '#fff3d6' }, floors: [{ name: 'Cabin', rooms: ['kitchen', 'living', 'bedroom', 'bathroom'] }] },
  { id: 'dream_castle', name: 'Dream Castle', style: 'castle', roof: 'tower', ext: { walls: '#f1e9ff', roof: '#7b4fa0', door: '#ff8fb8', trim: '#ffd36e' }, floors: [{ name: 'Courtyard', outdoor: true, rooms: ['garden'] }, { name: 'Throne Hall', rooms: ['living', 'kitchen'] }, { name: 'Royal Bedrooms', rooms: ['bedroom', 'kids_room', 'bathroom'] }] },
  { id: 'lemon_apartment', name: 'Lemon Apartment', style: 'apartment', roof: 'flat', ext: { walls: '#fff7d1', roof: '#a07a12', door: '#7fc4ff', trim: '#ffffff' }, floors: [{ name: 'Flat', rooms: ['living', 'kitchen', 'bedroom', 'bathroom'] }] },
  { id: 'sunny_farmhouse', name: 'Sunny Farmhouse', style: 'farmhouse', roof: 'gable', ext: { walls: '#fff0e6', roof: '#c4502a', door: '#3fa66b', trim: '#ffffff' }, floors: [{ name: 'Farmyard', outdoor: true, rooms: ['garden'] }, { name: 'Farm Kitchen', rooms: ['kitchen', 'living'] }, { name: 'Bedrooms', rooms: ['bedroom', 'nursery', 'bathroom'] }] },
  { id: 'leafy_treehouse', name: 'Leafy Treehouse', style: 'treehouse', roof: 'thatch', ext: { walls: '#c9a27a', roof: '#3fa66b', door: '#ff8fb8', trim: '#e6fff2' }, floors: [{ name: 'Tree Room', rooms: ['kitchen', 'bedroom', 'bathroom'] }, { name: 'Lookout', rooms: ['kids_room'] }] },
  { id: 'pumpkin_cottage', name: 'Pumpkin Cottage', style: 'spooky_cute', roof: 'gable', ext: { walls: '#ffd6a5', roof: '#7b4fa0', door: '#3d2457', trim: '#8ce99a' }, floors: [{ name: 'Pumpkin Patch', outdoor: true, rooms: ['garden'] }, { name: 'Spooky Kitchen', rooms: ['kitchen', 'living'] }, { name: 'Cosy Attic', rooms: ['bedroom', 'bathroom'] }] },
];
const ROOM_TAGS: Record<string, string[]> = {
  kitchen: ['kitchen'], living: ['living', 'cosy'], bedroom: ['bedroom'], bathroom: ['bathroom'], nursery: ['nursery', 'baby'],
  kids_room: ['kids_room', 'toys'], teen_room: ['teen_room', 'bedroom'], garden: ['garden'], playroom: ['toys', 'kids_room'], pool: ['pool', 'garden'],
};

/** What belongs in each room, by template id. */
const ROOM_WORDS: Record<string, RegExp> = {
  kitchen: /fridge|kitchen|table|chair|stove|oven|sink|counter|kettle|toaster|cupboard|cake|cookie|fruit|bowl|tea_cup|mug|plate|juice|milk|apple|pizza|cupcake|croissant|donut|espresso/,
  living: /sofa|armchair|lamp|bookshelf|rug|tv|potted|clock|picture|cushion|fireplace|piano|blanket|rocking_chair|card_table|puzzle|goldfish|cat_tree|pet_bed/,
  bedroom: /bed|wardrobe|dresser|lamp|nightstand|teddy|mirror|rug|blanket/,
  bathroom: /bath|tub|toilet|sink|towel|duck|mirror|soap|toothbrush|comb/,
  nursery: /cot|crib|cradle|mobile|teddy|bunny|blocks|changing|rocking_horse|baby/,
  kids_room: /toy|teddy|blocks|dollhouse|train_set|ball|bunny|puzzle|single_cozy_bed|rocking_horse|backpack|lunchbox/,
  teen_room: /bed|lamp|desk|mirror|poster|guitar|beanbag|makeup|lipstick|nail_polish|eyeshadow/,
  garden: /tree|flower|plant|swing|bench|slide|fountain|rose|tulip|bush|bird|watering|garden|sitting_cat|sitting_puppy|pet_rabbit/,
  playroom: /toy|teddy|blocks|dollhouse|train_set|ball|bunny|puzzle|rocking_horse|paint|easel/,
  pool: /pool|float|ring|slide|duck|towel|umbrella|lounger/,
};

/** The one thing each room must have, placed first. */
const ROOM_KEY: Record<string, RegExp> = {
  kitchen: /fridge/, living: /sofa|armchair/, bedroom: /^(?!.*(pet|bedside)).*bed/, bathroom: /bath/, nursery: /cot|crib|cradle/, kids_room: /single_cozy_bed|toy/,
};

function makeHouses(): void {
  const c = ctx();
  const all = [...c.items.values()].filter((i) => !isWearable(catOf(c, i.id)) && catOf(c, i.id) !== 'vehicle');
  const out: House[] = [];
  for (const spec of HOUSE_SPECS) {
    const spooky = spec.style === 'spooky_cute';
    const floors = spec.floors.map((sf) => {
      const rooms: { type: string; width: number }[] = [];
      const items: Placed[] = [];
      let x0 = 0;
      for (const type of sf.rooms) {
        const tags = new Set(ROOM_TAGS[type]);
        const seasonOk = (i: Item) => (spooky || !i.tags.includes('halloween')) && !i.tags.includes('christmas');
        const fitsRoom = shuffle(all.filter((i) => ROOM_WORDS[type]?.test(i.template) && seasonOk(i)).map((i) => i.id));
        const key = shuffle(all.filter((i) => ROOM_KEY[type]?.test(i.template) && seasonOk(i)).map((i) => i.id)).slice(0, 1);
        const pool = [...key, ...fitsRoom, ...shuffle(all.filter((i) => !fitsRoom.includes(i.id) && i.tags.some((t) => tags.has(t)) && seasonOk(i) && !['decor'].includes(catOf(c, i.id))).map((i) => i.id))];
        if (spooky) pool.unshift(...shuffle(all.filter((i) => i.tags.includes('halloween') && STANDING.has(catOf(c, i.id))).map((i) => i.id)).slice(0, 2));
        const room = layFloor(c, pool, !!sf.outdoor, 4 + Math.floor(rand() * 3), Math.floor(1200 / sf.rooms.length));
        const width = room.width;
        rooms.push({ type, width });
        for (const p of room.items) items.push({ ...p, x: p.x + x0 });
        x0 += width;
      }
      // Rooms are at most 1200 wide in total: squeeze by dropping the last room's extra space if needed.
      return { name: sf.name, outdoor: !!sf.outdoor, wall: sf.outdoor ? '#bfe6ff' : pick(WALLS), ground: sf.outdoor ? GROUNDS.grass : pick(GROUNDS.indoor), width: x0, rooms, items };
    });
    const h: House = { id: spec.id, name: spec.name, style: spec.style, roof: spec.roof, exterior: spec.ext, floors };
    const errs = houseErrors(h, [...out, h], c);
    if (errs.length) console.log(`  ✗ ${h.id}: ${errs.slice(0, 3).join(' | ')}`);
    else out.push(h);
  }
  save(FILES.house, out);
  console.log(`houses: ${out.length}/${HOUSE_SPECS.length} pass`);
}

// ---------------------------------------------------------------- characters
function makeCharacters(): void {
  const c = ctx();
  const names = load<{ id: string; name: string }>(FILES.names).map((n) => n.name);
  const hairs = templates.filter((t) => t.category === 'hair').map((t) => t.id);
  const wear = (slot: string, age: string) => [...c.items.values()].filter((i) => catOf(c, i.id) === slot && (!i.ages || i.ages.includes(age))).map((i) => i.id);
  const HAIR = ['#2b1d14', '#5a3825', '#8b5e3c', '#c68642', '#e8c07d', '#d94f2b', '#b0b0b0', '#ffffff'];
  const EYES = ['#3a2a2a', '#5a3825', '#3a6ea5', '#3fa66b'];
  // Three families and some friends, across all six ages.
  const ages = ['adult', 'adult', 'kid', 'baby', 'elder', 'adult', 'teen', 'toddler', 'kid', 'teen', 'elder', 'adult'];
  const out: Character[] = [];
  const used = new Set<string>();
  for (const age of ages) {
    const name = names.find((n) => !used.has(n) && rand() < 0.3) ?? names.find((n) => !used.has(n)) ?? `Friend${out.length}`;
    used.add(name);
    const dress = rand() < 0.35 && wear('dress', age).length > 0;
    const outfit: Character['outfit'] = {};
    for (const slot of dress ? ['dress', 'shoes', 'socks'] : ['top', 'bottom', 'shoes', 'socks']) {
      const opts = wear(slot, age);
      if (opts.length) outfit[slot as 'top'] = pick(opts);
    }
    if (rand() < 0.3 && wear('hat', age).length) outfit.hat = pick(wear('hat', age));
    if (age === 'elder' && wear('glasses', age).length) outfit.glasses = pick(wear('glasses', age));
    const ch: Character = {
      id: name.toLowerCase(), name, age, skin: pick(SKIN_TONES), eyes: pick(EYES),
      hair: { template: pick(hairs), colour: age === 'elder' ? pick(['#b0b0b0', '#ffffff']) : pick(HAIR) }, outfit,
    };
    const errs = characterErrors(ch, [...out, ch], { ...c, placeIds: new Set() });
    if (errs.length) console.log(`  ✗ ${errs[0]}`);
    else out.push(ch);
  }
  save(FILES.character, out);
  console.log(`characters: ${out.length} (${out.map((x) => `${x.name} ${x.age}`).join(', ')})`);
}

// ---------------------------------------------------------------- daily calendar
function makeDaily(): void {
  const c = ctx();
  const all = [...c.items.values()];
  const DECOR = new Set(['decor', 'furniture', 'garden', 'halloween', 'plant', 'toy']);
  const gifts = shuffle(all.filter((i) => !isWearable(catOf(c, i.id)) && !i.tags.includes('halloween') && !i.tags.includes('christmas') && catOf(c, i.id) !== 'vehicle').map((i) => i.id));
  const decor = shuffle(all.filter((i) => DECOR.has(catOf(c, i.id)) && !i.tags.includes('halloween') && !i.tags.includes('christmas')).map((i) => i.id));
  const spooky = shuffle(all.filter((i) => DECOR.has(catOf(c, i.id)) && i.tags.includes('halloween')).map((i) => i.id));
  const festive = shuffle(all.filter((i) => DECOR.has(catOf(c, i.id)) && i.tags.includes('christmas')).map((i) => i.id));
  const out: Daily[] = [];
  const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let g = 0, d = 0, s = 0, x = 0;
  for (let m = 1; m <= 12; m++) {
    for (let day = 1; day <= DAYS[m - 1]; day++) {
      const lateOct = m === 10 && day >= 15;
      const dec = m === 12 && day % 2 === 0 && festive.length >= 20;
      const decorId = lateOct ? spooky[s++ % spooky.length] : dec ? festive[x++ % festive.length] : decor[d++ % decor.length];
      let giftId = gifts[g++ % gifts.length];
      if (giftId === decorId) giftId = gifts[g++ % gifts.length];
      out.push({ id: dailyId(m, day), month: m, day, gift: giftId, decor: decorId });
    }
  }
  const bad = out.flatMap((e) => dailyErrors(e, out, c));
  if (bad.length) {
    console.log(`daily: ${bad.length} problem(s): ${bad.slice(0, 5).join(' | ')}`);
    process.exit(1);
  }
  save(FILES.daily, out);
  console.log(`daily: ${out.length} days (${gifts.length} gifts, ${decor.length} decor, ${spooky.length} halloween, ${festive.length} christmas in rotation)`);
}

const RUN: Record<string, () => void> = { items: makeItems, places: makePlaces, houses: makeHouses, characters: makeCharacters, daily: makeDaily };
if (!RUN[what]) {
  console.error(`usage: node tools/auto-content.ts ${Object.keys(RUN).join('|')}`);
  process.exit(1);
}
RUN[what]();
void AGE_GROUPS;
