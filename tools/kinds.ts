// Every content kind the model makes: its prompt, its data file, its validator and the facts the prompt needs.
import { readFileSync, existsSync } from 'node:fs';
import { templateErrors, type Template } from '../schemas/template.ts';
import { itemErrors, ITEM_TAGS, type Item } from '../schemas/item.ts';
import { placeErrors, DISTRICTS, type Place } from '../schemas/place.ts';
import { houseErrors, HOUSE_STYLES, ROOF_SHAPES, ROOM_TYPES, type House } from '../schemas/house.ts';
import { characterErrors, OUTFIT_SLOTS, SKIN_TONES, type Character } from '../schemas/character.ts';
import { emotionErrors, EYES, MOUTHS, MOTIONS, SOUNDS, type Emotion } from '../schemas/emotion.ts';
import { dailyErrors, type Daily } from '../schemas/daily.ts';
import { planErrors, type PlanEntry } from '../schemas/plan.ts';
import { checkSvg } from '../schemas/svg.ts';
import { realStyleErrors } from '../schemas/style-real.ts';
import { shelfStockErrors, type ShelfStock } from '../schemas/shelf-stock.ts';
import { AGE_GROUPS, OBJECT_CATEGORIES, REQUIRED_ANCHORS, SIZE_BOUNDS, WEARABLE_CATEGORIES, isWearable } from '../schemas/vocab.ts';

export type Entry = { id: string } & Record<string, unknown>;
export type Kind = {
  prompt: string;
  data: string;
  errors: (entry: Entry, all: readonly Entry[]) => string[];
  /** Which entries of a shared data file this kind checks (default: all of them). */
  owns?: (entry: Entry) => boolean;
  /** Extra {{name}} values for the prompt, computed from the shipped data and the --ask text. */
  vars?: (ask: string) => Record<string, string>;
};

const realSamples = () => JSON.parse(readFileSync('prompts/style-real.json', 'utf8')) as { templates: Template[]; items: Item[] };

export const load = <T = Entry>(file: string): T[] => (existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T[]) : []);

export const FILES = {
  plan: 'src/data/place-plan.json',
  template: 'src/data/templates.json',
  item: 'src/data/items.json',
  place: 'src/data/places.json',
  house: 'src/data/houses.json',
  character: 'src/data/characters.json',
  emotion: 'src/data/emotions.json',
  daily: 'src/data/daily.json',
  names: 'src/data/names.json',
  templateReal: 'src/data/templates-real.json',
  shelfStock: 'src/data/shelf-stock.json',
};

const templates = () => new Map(load<Template>(FILES.template).map((t) => [t.id, t]));
const items = () => new Map(load<Item>(FILES.item).map((i) => [i.id, i]));
const as = <T>(e: unknown) => e as T;

/** Height of an item's "top" surface (for putting things on tables), in world units. */
function topHeight(it: Item, t: Template): number | null {
  const top = t.anchors?.top;
  if (!top || !t.size) return null;
  const box = checkSvg(t.svg).box;
  if (!box) return null;
  const u = t.size.h / Math.max(1, box.maxY - box.minY);
  const baseY = t.anchors?.base?.[1] ?? box.maxY;
  return Math.round((baseY - top[1]) * u);
}

/** Lines like "pink_sofa: furniture, 80x40, top=30, seat, tags living,cosy" for layout prompts. */
function itemLines(filter: (it: Item, t: Template) => boolean, limit = 400): string {
  const ts = templates();
  const lines: string[] = [];
  for (const it of items().values()) {
    const t = ts.get(it.template);
    if (!t || isWearable(t.category) || !filter(it, t)) continue;
    const extras = [topHeight(it, t) !== null ? `top=${topHeight(it, t)}` : '', t.anchors?.seat ? 'seat' : '', it.tags.includes('wall') ? 'wall' : ''].filter(Boolean);
    lines.push(`${it.id}: ${t.category}, ${t.size?.w}x${t.size?.h}${extras.length ? `, ${extras.join(', ')}` : ''}, tags ${it.tags.join(',')}`);
    if (lines.length >= limit) break;
  }
  return lines.join('\n');
}

const HOME_TAGS = ['kitchen', 'bedroom', 'bathroom', 'living', 'garden', 'nursery', 'kids_room', 'teen_room', 'pool', 'cosy', 'pet', 'baby', 'elder'];
const GENERAL_CATS = new Set(['plant', 'decor']);

export const KINDS: Record<string, Kind> = {
  plan: {
    prompt: 'prompts/plan.txt',
    data: FILES.plan,
    errors: (e, all) => planErrors(as<PlanEntry>(e), as<PlanEntry[]>(all)),
    vars: () => ({ notes: readFileSync('prompts/notes.txt', 'utf8'), districts: DISTRICTS.join(', '), tags: ITEM_TAGS.join(', ') }),
  },
  // Redraw a game template in the realistic style. Same id, name, category, size and anchors as the original, so
  // every item and layout keeps working; kept in its own file until the realistic look is switched on.
  'template-redraw': {
    prompt: 'prompts/template-redraw.txt',
    data: FILES.templateReal,
    errors: (e, all) => {
      const t = as<Template & { palette?: Record<string, string> }>(e);
      const orig = load<Template>(FILES.template).find((o) => o.id === t.id);
      if (!orig) return [`${t.id}: keep the original id (it must be one of the game's templates)`];
      const out = [...templateErrors(t, as<Template[]>(all)), ...realStyleErrors(t)];
      // Natural coats (animals): whole palettes the realistic look paints the template's items in.
      const coats = (e as { coats?: unknown }).coats;
      if (coats !== undefined && (!Array.isArray(coats) || !coats.length || coats.some((c) => !['main', 'trim', 'accent', 'outline'].every((k) => /^#[0-9a-f]{6}$/i.test(c?.[k] ?? '')))))
        out.push(`${t.id}: coats: a list of palettes {"main","trim","accent","outline"} as #rrggbb`);
      if (t.category !== orig.category) out.push(`${t.id}: category must stay "${orig.category}"`);
      if (orig.size) {
        const near = (a: number, b: number) => Math.abs(a - b) <= b * 0.15;
        if (!t.size || !near(t.size.w, orig.size.w) || !near(t.size.h, orig.size.h)) out.push(`${t.id}: size must stay ${JSON.stringify(orig.size)} (within 15%)`);
        for (const k of Object.keys(orig.anchors ?? {})) if (!t.anchors?.[k]) out.push(`${t.id}: keep the anchor "${k}"`);
      }
      return out;
    },
    vars: (ask) => {
      const s = realSamples();
      const id = ask.trim().split(/[\s,]+/)[0];
      const orig = load<Template>(FILES.template).find((o) => o.id === id);
      if (!orig) throw new Error(`no template "${id}"`);
      // Examples: Claude's sample of the same category, and one other.
      const same = s.templates.find((t) => t.category === orig.category);
      const ids = [...new Set([same?.id, isWearable(orig.category) ? 'real_apple' : 'real_tshirt'].filter(Boolean) as string[])];
      const ex = ids.map((x) => JSON.stringify({ ...s.templates.find((t) => t.id === x)!, palette: s.items.find((i) => i.id === x)!.palette }));
      const uses = load<Item>(FILES.item).filter((it) => it.template === id).slice(0, 3).map((it) => it.name);
      return {
        target: [
          `id "${orig.id}", name "${orig.name}", category "${orig.category}"`,
          orig.size ? `size ${JSON.stringify(orig.size)} (keep it), anchors ${JSON.stringify(orig.anchors)} (keep the same anchor names, placed on your drawing)` : 'a wearable: no size, no anchors',
          uses.length ? `in the game it is used for: ${uses.join(', ')}` : '',
          `today's (cute, flat) drawing, for what it shows (do not copy its style): ${orig.svg}`,
        ].filter(Boolean).join('\n'),
        objects: OBJECT_CATEGORIES.join(', '),
        sizes: Object.entries(SIZE_BOUNDS).map(([c, b]) => `${c} ${b.min}-${b.max}`).join(', '),
        anchors: Object.entries(REQUIRED_ANCHORS).map(([c, a]) => `${c}: ${a.join(' + ')}`).join('; '),
        examples: ex.join('\n'),
      };
    },
  },
  // Realistic-style trials: kept apart from the game's data (prompts/style-real-qwen.json) until the look is chosen.
  'template-real': {
    prompt: 'prompts/template-real.txt',
    data: 'prompts/style-real-qwen.json',
    errors: (e, all) => {
      const taken = [...load<Template>(FILES.template), ...realSamples().templates, ...as<Template[]>(all)];
      return [...templateErrors(as<Template>(e), taken), ...realStyleErrors(as<Template & { palette?: Record<string, string> }>(e))];
    },
    vars: (ask) => {
      const s = realSamples();
      // Show examples of the categories asked for (e.g. "(hair)"), topped up with a top and an object.
      const asked = s.templates.filter((t) => ask.includes(`(${t.category})`)).map((t) => t.id);
      const ids = [...new Set([...asked, 'real_tshirt', 'real_apple'])].slice(0, 2);
      const ex = ids.map((id) => {
        const t = s.templates.find((x) => x.id === id)!;
        return JSON.stringify({ ...t, palette: s.items.find((i) => i.id === id)!.palette });
      });
      return {
        objects: OBJECT_CATEGORIES.join(', '),
        anchors: Object.entries(REQUIRED_ANCHORS).map(([c, a]) => `${c}: ${a.join(' + ')}`).join('; '),
        sizes: Object.entries(SIZE_BOUNDS).map(([c, b]) => `${c} ${b.min}-${b.max}`).join(', '),
        examples: ex.join('\n'),
        existing: [...load<Template>(FILES.template), ...s.templates].map((t) => t.id).filter((id) => id.startsWith('real_')).join(', '),
      };
    },
  },
  // New game templates, drawn straight in the realistic style (the cute look is no longer drawn for).
  'template-new': {
    prompt: 'prompts/template-new.txt',
    data: FILES.template,
    // It shares templates.json with the cute templates; the realistic ones are those that carry a palette.
    owns: (e) => 'palette' in e,
    errors: (e, all) => [...templateErrors(as<Template>(e), as<Template[]>(all)), ...realStyleErrors(as<Template & { palette?: Record<string, string> }>(e))],
    vars: (ask) => {
      const s = realSamples();
      const asked = s.templates.filter((t) => ask.includes(`(${t.category})`)).map((t) => t.id);
      const ids = [...new Set([...asked, 'real_tshirt', 'real_apple'])].slice(0, 2);
      return {
        objects: OBJECT_CATEGORIES.join(', '),
        anchors: Object.entries(REQUIRED_ANCHORS).map(([c, a]) => `${c}: ${a.join(' + ')}`).join('; '),
        sizes: Object.entries(SIZE_BOUNDS).map(([c, b]) => `${c} ${b.min}-${b.max}`).join(', '),
        examples: ids.map((id) => JSON.stringify({ ...s.templates.find((x) => x.id === id)!, palette: s.items.find((i) => i.id === id)!.palette })).join('\n'),
      };
    },
  },
  template: {
    prompt: 'prompts/template.txt',
    data: FILES.template,
    errors: (e, all) => templateErrors(as<Template>(e), as<Template[]>(all)),
    vars: () => ({
      wearables: WEARABLE_CATEGORIES.join(', '),
      objects: OBJECT_CATEGORIES.join(', '),
      anchors: Object.entries(REQUIRED_ANCHORS).map(([c, a]) => `${c}: ${a.join(' + ')}`).join('; '),
      sizes: Object.entries(SIZE_BOUNDS).map(([c, b]) => `${c} ${b.min}-${b.max}`).join(', '),
    }),
  },
  item: {
    prompt: 'prompts/item.txt',
    data: FILES.item,
    errors: (e, all) => itemErrors(as<Item>(e), as<Item[]>(all), templates()),
    // --ask is a comma list of template ids; --count is items per template.
    vars: (ask) => {
      const ts = templates();
      const ids = ask.split(/[,;\s]+/).filter(Boolean);
      const per = Number(process.env.PER ?? 5);
      return {
        per: String(per),
        count: String(per * ids.length),
        templates: ids.map((id) => { const t = ts.get(id); return t ? `- ${id}: "${t.name}", a ${t.category}` : `- ${id}: (unknown)`; }).join('\n'),
        tags: ITEM_TAGS.join(', '),
        ages: AGE_GROUPS.join(', '),
      };
    },
  },
  place: {
    prompt: 'prompts/place.txt',
    data: FILES.place,
    errors: (e, all) => placeErrors(as<Place>(e), as<Place[]>(all), { items: items(), templates: templates() }),
    // --ask is the plan id.
    vars: (ask) => {
      const plan = load<PlanEntry>(FILES.plan).find((p) => p.id === ask.trim());
      if (!plan) throw new Error(`no plan entry "${ask}"`);
      const tags = new Set(plan.tags);
      return {
        id: plan.id,
        plan: JSON.stringify({ id: plan.id, name: plan.name, emoji: plan.emoji, district: plan.district, hidden: plan.hidden ?? false, floors: plan.floors, about: plan.note }),
        hiddenPlaces: load<PlanEntry>(FILES.plan).filter((p) => p.hidden && p.id !== plan.id).map((p) => p.id).join(', ') || '(none)',
        items: itemLines((it, t) => it.tags.some((x) => tags.has(x)) || GENERAL_CATS.has(t.category)),
      };
    },
  },
  house: {
    prompt: 'prompts/house.txt',
    data: FILES.house,
    errors: (e, all) => houseErrors(as<House>(e), as<House[]>(all), { items: items(), templates: templates() }),
    vars: () => ({
      styles: HOUSE_STYLES.join(', '),
      roofs: ROOF_SHAPES.join(', '),
      rooms: ROOM_TYPES.join(', '),
      items: itemLines((it, t) => it.tags.some((x) => HOME_TAGS.includes(x)) || GENERAL_CATS.has(t.category) || it.tags.includes('halloween')),
    }),
  },
  character: {
    prompt: 'prompts/character.txt',
    data: FILES.character,
    errors: (e, all) => characterErrors(as<Character>(e), as<Character[]>(all), { items: items(), templates: templates(), placeIds: new Set(load<Place>(FILES.place).map((p) => p.id)) }),
    vars: () => {
      const ts = templates();
      const wear = (slot: string) => [...items().values()].filter((it) => ts.get(it.template)?.category === slot).map((it) => (it.ages ? `${it.id} (${it.ages.join('/')})` : it.id));
      return {
        ages: AGE_GROUPS.join(', '),
        skins: SKIN_TONES.join(', '),
        hairs: [...ts.values()].filter((t) => t.category === 'hair').map((t) => t.id).join(', '),
        wearables: OUTFIT_SLOTS.map((s) => `  ${s}: ${wear(s).join(', ') || '(none yet)'}`).join('\n'),
      };
    },
  },
  emotion: {
    prompt: 'prompts/emotion.txt',
    data: FILES.emotion,
    errors: (e, all) => emotionErrors(as<Emotion>(e), as<Emotion[]>(all)),
    vars: () => ({ eyes: EYES.join(', '), mouths: MOUTHS.join(', '), motions: MOTIONS.join(', '), sounds: SOUNDS.join(', ') }),
  },
  daily: {
    prompt: 'prompts/daily.txt',
    data: FILES.daily,
    errors: (e, all) => dailyErrors(as<Daily>(e), as<Daily[]>(all), { items: items(), templates: templates() }),
    // --ask is the month number.
    vars: (ask) => {
      const month = Number(ask);
      const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
      const ts = templates();
      const all = [...items().values()];
      const decorCats = new Set(['decor', 'furniture', 'garden', 'halloween', 'plant', 'toy']);
      const prev = load<Daily>(FILES.daily).filter((d) => d.month === (month === 1 ? 12 : month - 1)).sort((a, b) => b.day - a.day).slice(0, 30);
      return {
        month: String(month),
        mm: String(month).padStart(2, '0'),
        days: String(days),
        recent: prev.map((d) => `${d.gift}, ${d.decor}`).join('; ') || '(none)',
        gifts: all.filter((it) => !isWearable(ts.get(it.template)?.category ?? '')).map((it) => it.id).join(', '),
        decor: all.filter((it) => decorCats.has(ts.get(it.template)?.category ?? '')).map((it) => `${it.id}${it.tags.includes('halloween') ? ' (halloween)' : it.tags.includes('christmas') ? ' (christmas)' : ''}`).join(', '),
      };
    },
  },
  // Shelves stocked by tools/stock-shelves.ts (rules, not the model): no prompt, checked like the rest.
  'shelf-stock': {
    prompt: '',
    data: FILES.shelfStock,
    errors: (e, all) => shelfStockErrors(as<ShelfStock>(e), as<ShelfStock[]>(all), { items: items(), templates: templates(), places: new Map(load<Place>(FILES.place).map((p) => [p.id, p])) }),
  },
  names: {
    prompt: 'prompts/names.txt',
    data: FILES.names,
    errors: (e, all) => {
      const n = e as { id: string; name: string };
      const out: string[] = [];
      if (typeof n.name !== 'string' || !/^[A-Z][a-zA-Z]{1,11}$/.test(n.name)) out.push(`${n.id}: name: 2-12 letters, capitalised`);
      else if (n.id !== n.name.toLowerCase()) out.push(`${n.id}: id must be "${n.name.toLowerCase()}"`);
      if (all.some((o) => o !== e && o.id === n.id)) out.push(`${n.id}: already used`);
      return out;
    },
  },
};
