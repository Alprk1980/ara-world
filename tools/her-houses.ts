// The places the user's daughter drew, as data: the mansion's back garden (and its garage and game room), her six-floor house, and cells at
// the police station. Items are laid out left to right along each floor from their real widths, so nothing overlaps;
// wall things (a big window) hang above. Re-running replaces these floors and houses.
//
//   node tools/her-houses.ts
import { readFileSync, writeFileSync } from 'node:fs';

type Placed = { item: string; x: number; y?: number };
type Room = { type: string; width: number };
type Floor = { name: string; outdoor?: boolean; wall: string; ground: string; width: number; items: Placed[]; rooms?: Room[] };

const templates = new Map((JSON.parse(readFileSync('src/data/templates.json', 'utf8')) as { id: string; size?: { w: number; h: number } }[]).map((t) => [t.id, t]));
const items = JSON.parse(readFileSync('src/data/items.json', 'utf8')) as { id: string; template: string }[];
const itemIds = new Set(items.map((i) => i.id));

/** An item of a template: its colourway `key` if there is one, else its first. */
function pick(template: string, key?: string): string {
  if (key && itemIds.has(`${template}_${key}`)) return `${template}_${key}`;
  const it = items.find((i) => i.template === template);
  if (!it) throw new Error(`no items for ${template}`);
  return it.id;
}
const widthOf = (id: string) => templates.get(items.find((i) => i.id === id)!.template)?.size?.w ?? 20;

/** Rooms left to right, each a list of things on the floor (and things for the wall, with a height). */
type RoomPlan = { type: string; floor: string[]; wall?: { item: string; y: number }[] };
function floor(name: string, wall: string, ground: string, plan: RoomPlan[], outdoor = false): Floor {
  const placed: Placed[] = [], rooms: Room[] = [];
  let x = 0;
  for (const r of plan) {
    const start = x;
    x += 24;
    const wallAt: number[] = [];
    for (const id of r.floor) {
      const w = widthOf(id);
      placed.push({ item: id, x: Math.round(x + w / 2) });
      wallAt.push(x + w / 2);
      x += w + 22;
    }
    x += 10;
    const width = Math.max(100, Math.round(x - start));
    x = start + width;
    // Wall things go evenly along the room, above the furniture.
    (r.wall ?? []).forEach((w, i, all) => placed.push({ item: w.item, x: Math.round(start + (width * (i + 1)) / (all.length + 1)), y: w.y }));
    rooms.push({ type: r.type, width });
  }
  const f: Floor = { name, ...(outdoor ? { outdoor } : {}), wall, ground, width: Math.max(240, x), items: placed, rooms };
  if (f.width > 1200) throw new Error(`${name} is ${f.width} wide (max 1200)`);
  if (f.width > x) rooms[rooms.length - 1].width += f.width - x;
  return f;
}

// ---------------------------------------------------------------- the mansion (her bird's-eye back garden)
const mansionFloors: Floor[] = [
  floor('Pool Garden', '#bfe6ff', '#8ce99a', [
    { type: 'pool', floor: [pick('beach_umbrella', 'sky'), pick('pool_lounger', 'lilac'), pick('pool_lounger', 'sky'), pick('heated_pool', 'blue')] },
    { type: 'garden', floor: [pick('bbq_grill', 'black'), pick('long_garden_table', 'wood'), pick('waterpark_snack_stand'), pick('pool_drink_cart')] },
  ], true),
  floor('Kids Garden', '#bfe6ff', '#8ce99a', [
    { type: 'garden', floor: [pick('garden_treehouse', 'wood'), pick('garden_swing_set'), pick('rainbow_slide'), pick('sandbox', 'wood')] },
    { type: 'pool', floor: [pick('waterpark_splash_pad'), pick('baby_slide', 'lilac')] },
  ], true),
  floor('Garage & Game Room', '#e8e4dc', '#9aa3ad', [
    { type: 'garage', floor: [pick('garage_door', 'white'), pick('cute_small_car'), pick('fire_station_tool_cabinet')] },
    { type: 'game_room', floor: [pick('arcade_machine', 'blue'), pick('arcade_machine', 'red'), pick('pool_table'), pick('velvet_sofa'), pick('painted_stool', 'purple')] },
  ]),
  floor('Grand Hall', '#fff3d6', '#c9a27a', [
    { type: 'living', floor: [pick('round_sofa'), pick('round_table', 'white'), pick('velvet_sofa')], wall: [{ item: pick('big_window', 'white'), y: 62 }] },
    { type: 'kitchen', floor: [pick('tall_fridge', 'steel'), pick('kitchen_table'), pick('painted_stool', 'red'), pick('painted_stool', 'yellow'), pick('painted_stool', 'blue')] },
  ]),
  floor('Bedrooms', '#f3e6ff', '#c9a27a', [
    { type: 'bedroom', floor: [pick('double_bed', 'gold'), pick('round_table', 'black')], wall: [{ item: pick('big_window', 'white'), y: 62 }] },
    { type: 'teen_room', floor: [pick('canopy_bed'), pick('arcade_machine', 'purple')] },
    { type: 'bathroom', floor: [pick('tinted_glass_shower', 'smoke'), pick('bubble_bathtub')] },
  ]),
  floor('Playroom Attic', '#ffe3ef', '#e8d2b8', [
    { type: 'playroom', floor: [pick('mall_toy_shelf'), pick('train_set'), pick('painted_stool', 'green')] },
    { type: 'nursery', floor: [pick('painted_cot', 'pink'), pick('daycare_changing_table'), pick('daycare_soft_blocks')] },
  ]),
];

// ---------------------------------------------------------------- her six-floor house (bottom to top)
const sixFloors: Floor[] = [
  floor('Back Garden', '#d4f4ff', '#7fd890', [
    { type: 'garden', floor: [pick('garden_swing_set'), pick('bbq_grill', 'red'), pick('long_garden_table', 'white'), pick('sandbox', 'green'), pick('garden_bench')] },
  ], true),
  floor('Front Room & Garage', '#ffe9d6', '#c9a27a', [
    { type: 'living', floor: [pick('velvet_sofa'), pick('round_table', 'wood')], wall: [{ item: pick('big_window', 'wood'), y: 62 }] },
    { type: 'playroom', floor: [pick('mall_toy_shelf'), pick('daycare_soft_blocks'), pick('painted_stool', 'orange')] },
    { type: 'garage', floor: [pick('garage_door', 'blue'), pick('cute_small_car')] },
  ]),
  floor('Snack Bar & Kids Room', '#fbe9dc', '#b98a5e', [
    { type: 'kitchen', floor: [pick('tall_fridge', 'pink'), pick('station_snack_cart'), pick('bar_stool'), pick('painted_stool', 'pink'), pick('painted_stool', 'yellow')] },
    { type: 'kids_room', floor: [pick('single_cozy_bed'), pick('painted_stool', 'blue')] },
  ]),
  floor('Guest Room & Lounge', '#eef2f7', '#c9a27a', [
    { type: 'bedroom', floor: [pick('double_bed', 'green'), pick('round_table', 'white')] },
    { type: 'living', floor: [pick('cloud_sofa'), pick('round_table', 'blue')], wall: [{ item: pick('big_window', 'white'), y: 62 }] },
    { type: 'balcony', floor: [pick('balcony_railing', 'white')] },
  ]),
  floor('Kids Bedroom', '#e6fff2', '#d9b38c', [
    { type: 'bathroom', floor: [pick('bubble_bathtub'), pick('painted_stool', 'green')] },
    { type: 'kids_room', floor: [pick('single_cozy_bed'), pick('painted_stool', 'red'), pick('double_bed', 'pink')] },
    { type: 'balcony', floor: [pick('balcony_railing', 'grey')] },
  ]),
  floor('Master Bedroom', '#f3e6ff', '#c9a27a', [
    { type: 'bathroom', floor: [pick('tinted_glass_shower', 'smoke'), pick('bubble_bathtub', 'gold')] },
    { type: 'bedroom', floor: [pick('double_bed', 'purple'), pick('round_table', 'black'), pick('painted_stool', 'purple')], wall: [{ item: pick('big_window', 'black'), y: 62 }] },
  ]),
  floor('Top Kitchen', '#fff6e0', '#e8d2b8', [
    { type: 'kitchen', floor: [pick('tall_fridge', 'steel'), pick('kitchen_table'), pick('painted_stool', 'red'), pick('painted_stool', 'blue'), pick('round_table', 'yellow')], wall: [{ item: pick('big_window', 'white'), y: 60 }, { item: pick('big_window', 'white'), y: 60 }] },
  ]),
];

const houses = JSON.parse(readFileSync('src/data/houses.json', 'utf8')) as { id: string; floors: Floor[] }[];
const mansion = houses.find((h) => h.id === 'sparkle_mansion')!;
mansion.floors = mansionFloors;
const six = { id: 'six_floor_house', name: 'Six Floor House', style: 'townhouse', roof: 'flat', exterior: { walls: '#f4efe6', roof: '#3a3a40', door: '#3a6ec0', trim: '#ffffff' }, floors: sixFloors };
const i = houses.findIndex((h) => h.id === six.id);
if (i >= 0) houses[i] = six;
else houses.push(six);
writeFileSync('src/data/houses.json', `${JSON.stringify(houses, null, 2)}\n`);

// ---------------------------------------------------------------- places
const places = JSON.parse(readFileSync('src/data/places.json', 'utf8')) as { id: string; floors: Floor[] }[];
const strip = (f: Floor): Floor => {
  const { rooms: _, ...rest } = f;
  return rest;
};
const putFloor = (placeId: string, f: Floor, at?: number) => {
  const p = places.find((x) => x.id === placeId)!;
  const j = p.floors.findIndex((x) => x.name === f.name);
  if (j >= 0) p.floors[j] = f;
  else p.floors.splice(at ?? p.floors.length, 0, f);
};
// The police station gets its cells.
putFloor('police_station', strip(floor('Cells', '#e3ecff', '#c9d6e8', [
  { type: 'living', floor: [pick('jail_cell', 'grey'), pick('jail_cell', 'blue'), pick('jail_cell', 'grey'), pick('police_desk'), pick('wooden_chair')] },
])));
// The mansion on the map gets the same back garden as the house.
const mp = places.find((x) => x.id === 'mansion')!;
const g = mp.floors.findIndex((x) => x.name === 'Garden' || x.name === 'Pool Garden');
if (g >= 0) mp.floors.splice(g, 1);
putFloor('mansion', strip(mansionFloors[0]), 1);
putFloor('mansion', strip(mansionFloors[1]), 2);
writeFileSync('src/data/places.json', `${JSON.stringify(places, null, 2)}\n`);

for (const f of [...mansionFloors, ...sixFloors]) console.log(`${f.name.padEnd(22)} ${String(f.width).padStart(5)} wide, ${f.items.length} things`);
