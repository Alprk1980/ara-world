// The whole content build, stage by stage. Resumable: each stage only asks for what is still missing.
//
//   node tools/pipeline.ts [stage ...]     stages: plan wardrobe things items places houses emotions names characters daily
//
// Long: hours of model time. Run in the background; progress goes to .qwen-runs/pipeline.log.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { FILES, load } from './kinds.ts';
import type { PlanEntry } from '../schemas/plan.ts';
import type { Template } from '../schemas/template.ts';
import type { Item } from '../schemas/item.ts';
import type { Place } from '../schemas/place.ts';
import { HOUSE_STYLES } from '../schemas/house.ts';
import type { Daily } from '../schemas/daily.ts';

const LOG = '.qwen-runs/pipeline.log';
const WISHES = '.qwen-runs/wishes-done.json';
const log = (s: string) => {
  console.log(s);
  appendFileSync(LOG, `${new Date().toISOString()} ${s}\n`);
};

/** Run the generator for one request; never throws (a failed request is logged and skipped). */
function gen(kind: string, args: string[], env: Record<string, string> = {}): void {
  try {
    const out = execFileSync(process.execPath, ['tools/qwen-gen.ts', kind, ...args], { encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
    const merged = /merged (\d+)/.exec(out)?.[1] ?? '0';
    log(`  ${kind} ${args.join(' ').slice(0, 90)} → merged ${merged}`);
  } catch (e) {
    log(`  ${kind} failed: ${(e as Error).message.slice(0, 200)}`);
  }
}

const done = (): Set<string> => new Set(existsSync(WISHES) ? (JSON.parse(readFileSync(WISHES, 'utf8')) as string[]) : []);
const markDone = (w: string) => writeFileSync(WISHES, JSON.stringify([...done(), w]));
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').trim();

const REQUIRED_PLACES = ['post_office', 'train_station', 'bus_station'];
const WARDROBE: Record<string, number> = { hair: 16, top: 16, bottom: 12, dress: 12, socks: 6, shoes: 12, hat: 12, glasses: 6, bag: 8 };
const STAGES: Record<string, () => void> = {
  plan() {
    for (let round = 0; round < 14; round++) {
      const plan = load<PlanEntry>(FILES.plan);
      const missing = REQUIRED_PLACES.filter((id) => !plan.some((p) => p.id === id));
      if (plan.length >= 50 && missing.length === 0) break;
      gen('plan', ['--count', '5', '--ask', missing.length ? `Include these ids: ${missing.join(', ')}.` : 'Plan the next places from her notes that are not planned yet.']);
    }
  },
  wardrobe() {
    // Lots of clothes and hair: one new design per request, each different from what exists.
    for (const [cat, want] of Object.entries(WARDROBE)) {
      for (let i = 0; i < want * 1.5; i++) {
        const have = load<Template>(FILES.template).filter((t) => t.category === cat);
        if (have.length >= want) break;
        const ages = cat === 'hair' ? 'for any age' : 'for babies, kids, teens, adults or grandparents (vary it)';
        gen('template', ['--count', '1', '--ask', `one new ${cat} ${ages}, different from these existing ones: ${have.map((t) => t.name).join(', ') || 'none'}`]);
      }
    }
  },
  things() {
    // Draw the things the place plan asks for (deduplicated by name). THINGS_PER_PLACE caps the first pass;
    // raise it later to fill places out.
    const cap = Number(process.env.THINGS_PER_PLACE ?? 10);
    const seen = new Set(load<Template>(FILES.template).map((t) => norm(t.name)));
    for (const p of load<PlanEntry>(FILES.plan)) {
      for (const thing of p.things.slice(0, cap)) {
        const key = norm(thing);
        if (seen.has(key) || done().has(key)) continue;
        seen.add(key);
        gen('template', ['--count', '1', '--ask', `${thing} (for the ${p.name})`]);
        markDone(key);
      }
    }
  },
  items() {
    // Colourways for every template that has none yet, two templates per request.
    const have = new Set(load<Item>(FILES.item).map((i) => i.template));
    const todo = load<Template>(FILES.template).filter((t) => !have.has(t.id)).map((t) => t.id);
    for (let i = 0; i < todo.length; i += 3) gen('item', ['--ask', todo.slice(i, i + 3).join(',')], { PER: '5' });
  },
  places() {
    const have = new Set(load<Place>(FILES.place).map((p) => p.id));
    for (const p of load<PlanEntry>(FILES.plan)) if (!have.has(p.id)) gen('place', ['--ask', p.id]);
  },
  houses() {
    for (let i = 0; i < 160; i++) {
      const n = load(FILES.house).length;
      if (n >= 100) break;
      const style = HOUSE_STYLES[n % HOUSE_STYLES.length];
      gen('house', ['--count', '1', '--ask', `Make a ${style} house${style === 'mansion' ? ' with 3-4 floors' : ''}.`]);
    }
  },
  emotions() {
    if (load(FILES.emotion).length < 14) gen('emotion', ['--count', '16']);
  },
  names() {
    for (let i = 0; i < 5 && load(FILES.names).length < 150; i++) gen('names', ['--count', '40']);
  },
  characters() {
    for (let i = 0; i < 12 && load(FILES.character).length < 60; i++) gen('character', ['--count', '6', '--ask', 'Include at least one family with a baby and a grandparent.']);
  },
  daily() {
    for (let m = 1; m <= 12; m++) {
      if (load<Daily>(FILES.daily).filter((d) => d.month === m).length >= 28) continue;
      gen('daily', ['--ask', String(m)]);
    }
  },
};

const order = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(STAGES);
for (const s of order) {
  log(`== stage ${s}`);
  STAGES[s]();
}
log('== pipeline done');
