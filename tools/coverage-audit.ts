// Ask the model which of her wishes the game does not meet yet. Leads, not facts: check each before acting.
//
//   node tools/coverage-audit.ts        → out/coverage.json, and a list of unmet wishes
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chat, parseJson } from './llm.ts';
import { FILES, load } from './kinds.ts';
import type { Template } from '../schemas/template.ts';
import type { Item } from '../schemas/item.ts';
import type { Place } from '../schemas/place.ts';
import type { House } from '../schemas/house.ts';

// What the engine does, in plain words (kept in step with src/).
const FEATURES = [
  'Title screen: pink background with roses and a big Play button (src/ui/title.ts).',
  'Top-left back button on every screen (src/ui/hud.ts).',
  'Top-right button opens the creator with People, Pets and Clothes tabs: age, skin, hair, hair colour, eyes, name, and outfit slots top/bottom/dress/socks/shoes/hat/glasses/bag; make new clothes by picking a shape and colours (src/ui/creator.ts).',
  'Bottom-right button opens the people bar; drag people and pets out of it into a place, drag people back onto it to put them away (src/ui/people-bar.ts).',
  'Bottom-left hammer: pick a lot, pick from the house list (blueprints x 12 colourways each), choose Furnished or Empty, then go inside (src/ui/builder.ts).',
  'Tapping a person shows a wheel of emojis; tapping one changes their face, makes them move and plays a sound (src/ui/emoji-wheel.ts, src/world/rig.ts).',
  'Dragging food or a drink onto a person puts it in their hand; dropping it on the mouth, or tapping the yummy button, makes the hand bring it to the mouth and they eat/drink bite by bite (src/world/place-scene.ts).',
  'Sun/moon button switches day and night; weather button picks sunny, rain, snow, wind, rainbow or cloudy (src/ui/sky.ts).',
  'Places have floors stacked like a dollhouse; swipe up or down to change floor (src/world/place-scene.ts).',
  'Everything in a place can be dragged and decorated; small things sit on tables; wall things hang on walls.',
  'Hidden tap spots reveal secret items or hidden places, which then appear on the map (src/world/place-scene.ts).',
  'Town map with districts; a bus and a train drive along the bottom and take you to the stations (src/ui/map.ts).',
  'Post office: a post box gives a gift every day; a new house decoration also arrives every day and appears in your home (src/ui/postbox.ts).',
  'Everything is free and unlocked, including VIP things. No money, no ads.',
  'People come in six ages: baby, toddler, kid, teen, adult, elder; clothes can be limited to ages.',
  'A wardrobe (👗 on the emoji wheel, or tapping a clothes rack/wardrobe in a room) dresses someone in place, with clothes that fit their age (src/ui/wardrobe.ts).',
  'Drop a person on a bus, train, plane or car to pick a destination and travel there (src/ui/travel.ts).',
  'People breathe and blink; pets wiggle; things bounce when tapped; people on a bed fall asleep; lamps glow at night.',
  'Rooms have wallpaper, windows with curtains, ceiling lights, a sign with the place name; outdoor floors have clouds, hills, a fence and flowers.',
  'Each place has signature pieces (e.g. hospital bed and reception desk, fire engine and fire pole, airplane and check-in desk).',
  'A bin appears while dragging a thing, to tidy it away. Gentle background music with an on/off button.',
];

const templates = load<Template>(FILES.template);
const items = load<Item>(FILES.item);
const places = load<Place>(FILES.place);
const houses = load<House>(FILES.house);
const count = <T>(list: T[], key: (x: T) => string) => Object.entries(list.reduce<Record<string, number>>((a, x) => ((a[key(x)] = (a[key(x)] ?? 0) + 1), a), {})).map(([k, n]) => `${k} ${n}`).join(', ');
const tcat = new Map(templates.map((t) => [t.id, t.category]));
const digest = [
  'ENGINE FEATURES:', ...FEATURES.map((f) => `- ${f}`), '',
  `DRAWINGS: ${templates.length} (${count(templates, (t) => t.category)})`,
  `ITEMS: ${items.length} by category: ${count(items, (i) => tcat.get(i.template) ?? '?')}`,
  `ITEM TAGS: ${count(items.flatMap((i) => i.tags.map((t) => ({ t }))), (x) => x.t)}`,
  `HOUSES: ${houses.length} blueprints x 12 colourways (${count(houses, (h) => h.style)})`,
  'PLACES:',
  ...places.map((p) => `- ${p.emoji} ${p.name} [${p.district}${p.hidden ? ', hidden' : ''}]: ${p.floors.map((f) => `${f.name} (${f.items.length} things${f.hidden?.length ? `, ${f.hidden.length} secrets` : ''})`).join('; ')}`),
].join('\n');

const prompt = `You are checking a children's game against its designer's wishes. Her notes:
${readFileSync('prompts/notes.txt', 'utf8')}

What the game has now:
${digest}

Go through her notes wish by wish (split each line into separate wishes). For each, say whether the game meets it.
Answer with only a JSON array: [{"wish": "her words", "met": true/false, "evidence": "what in the game meets it, or what is missing"}]`;

mkdirSync('out', { recursive: true });
writeFileSync('out/coverage-digest.txt', digest);
let result: { wish: string; met: boolean; evidence: string }[] | null = null;
for (let i = 0; i < 3 && !result; i++) {
  const v = parseJson(await chat([{ role: 'user', content: prompt }], { temperature: 0.2 }));
  if (Array.isArray(v) && v.length >= 10 && v.every((x) => typeof x?.wish === 'string' && typeof x?.met === 'boolean' && typeof x?.evidence === 'string')) result = v;
}
if (!result) {
  console.log('no usable answer from the model');
  process.exit(1);
}
writeFileSync('out/coverage.json', JSON.stringify(result, null, 2));
const unmet = result.filter((r) => !r.met);
console.log(`${result.length} wishes, ${unmet.length} not met:`);
for (const r of unmet) console.log(`  ✗ ${r.wish} — ${r.evidence}`);
