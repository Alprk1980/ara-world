// Which backdrop each floor gets: chosen from the place (or house) and the floor's own name, so a hospital looks clean
// and clinical, a beach has the sea, a classroom has bunting and a pinboard, and so on.

export const INDOOR = ['home', 'fancy', 'shop', 'clinic', 'school', 'cafe', 'pub', 'office', 'station', 'aquarium', 'barn', 'garage', 'police', 'post', 'candy', 'spooky', 'space', 'cloud', 'nursery', 'gym', 'salon'] as const;
export const OUTDOOR = ['park', 'beach', 'snow', 'sky', 'pool', 'city', 'rails', 'savanna', 'fun', 'stadium', 'garden', 'candy', 'night', 'runway', 'rooftop', 'spooky', 'farm'] as const;
export type Theme = { indoor: boolean; kind: string; wall: string; floor: string; accent: string };

const PLACE_INDOOR: Record<string, string> = {
  post_office: 'post', train_station: 'station', bus_station: 'station', airport: 'station', kingdom_in_the_clouds: 'cloud',
  snowboarding_place: 'barn', school: 'school', daycare: 'nursery', hospital: 'clinic', vets: 'clinic', fire_station: 'garage',
  police_station: 'police', pools: 'cafe', zoo: 'cafe', aquarium: 'aquarium', theme_park: 'cafe', rollercoaster_place: 'shop',
  waterpark: 'gym', malls: 'shop', places_to_eat: 'cafe', sports_arena: 'gym', football_stadium: 'gym', school_shopping_place: 'shop',
  old_people_home: 'home', supermarket: 'shop', eye_opticians: 'shop', hair_dressers: 'salon', makeup_shop: 'salon', hotels: 'fancy',
  sweets_shop: 'candy', toy_shop: 'shop', restaurant: 'cafe', offices: 'office', cafe: 'cafe', pub: 'pub', stables: 'barn',
  pet_shop: 'shop', paint_shop: 'shop', secret_garden: 'home', cloud_swing_set: 'cloud', secret_beach_house: 'home',
  secret_mansion: 'fancy', secret_beach: 'home', starry_observatory: 'space', halloween_house: 'spooky', mansion: 'fancy',
  beach_house: 'home', secret_treehouse: 'barn', secret_candy_cave: 'candy', secret_pet_garden: 'barn',
};
const PLACE_OUTDOOR: Record<string, string> = {
  post_office: 'city', train_station: 'rails', bus_station: 'city', airport: 'runway', kingdom_in_the_clouds: 'sky',
  snowboarding_place: 'snow', school: 'park', daycare: 'garden', hospital: 'rooftop', fire_station: 'city', police_station: 'city',
  pools: 'pool', zoo: 'savanna', aquarium: 'beach', theme_park: 'fun', rollercoaster_place: 'fun', waterpark: 'pool', malls: 'rooftop',
  sports_arena: 'stadium', football_stadium: 'stadium', old_people_home: 'garden', hotels: 'rooftop', restaurant: 'garden', offices: 'rooftop',
  vets: 'park', cafe: 'garden', pub: 'garden', stables: 'farm', pet_shop: 'park', paint_shop: 'city', secret_garden: 'garden',
  cloud_swing_set: 'sky', secret_beach_house: 'beach', secret_mansion: 'garden', secret_beach: 'beach', starry_observatory: 'night',
  halloween_house: 'spooky', mansion: 'garden', beach_house: 'beach', secret_treehouse: 'park', secret_candy_cave: 'candy', secret_pet_garden: 'farm',
};
// Floor names that say more than the place does (checked first).
const BY_NAME: [RegExp, string][] = [
  [/snack|caf[eé]|food|dining|restaurant/i, 'cafe'], [/tank|tunnel|touch pool/i, 'aquarium'], [/guest|bedroom|nursery|attic/i, 'home'],
  [/locker/i, 'gym'], [/vip|first class|lounge/i, 'fancy'], [/hay loft|tack/i, 'barn'], [/candy loft/i, 'candy'],
  [/slope|snow/i, 'snow'], [/platform/i, 'rails'], [/departure|runway/i, 'runway'], [/roof/i, 'rooftop'], [/pool|wave|splash/i, 'pool'],
  [/stand|field|track/i, 'stadium'], [/shore|dune|beach|deck/i, 'beach'], [/cloud|sky|star|moon/i, 'sky'], [/meadow|garden|patio|yard|porch/i, 'garden'],
  [/paddock|pony field|farmyard|pumpkin patch/i, 'farm'],
];

// Wall, floor and accent colours per theme (indoor) or sky, ground and accent (outdoor).
const COLOURS: Record<string, [string, string, string]> = {
  home: ['#ffe3ef', '#d9b38c', '#ff8fb8'], fancy: ['#f3e6ff', '#c9a27a', '#d4a017'], shop: ['#fff6e0', '#e8d2b8', '#ff9f43'],
  clinic: ['#eefbf6', '#dfeef2', '#ff6b6b'], school: ['#fff3d6', '#c9a27a', '#7fb8ff'], cafe: ['#fbe9dc', '#b98a5e', '#c2557a'],
  pub: ['#e8d0b4', '#8a5a3c', '#3fa66b'], office: ['#eef2f7', '#cfd8e8', '#7fb8ff'], station: ['#eaf4ff', '#d8dde6', '#3a6ea5'],
  aquarium: ['#7fc4ff', '#2f5f8f', '#ffd36e'], barn: ['#d9a877', '#a8774f', '#c4502a'], garage: ['#f2c6b8', '#9aa3ad', '#e63946'],
  police: ['#e3ecff', '#c9d6e8', '#3a6ea5'], post: ['#ffe9e3', '#d9b38c', '#e63946'], candy: ['#ffd6ec', '#ffb3c7', '#7fd1c7'],
  spooky: ['#cdb4f0', '#7b5aa6', '#ff9f43'], space: ['#2a2f6b', '#4a3f7a', '#ffd36e'], cloud: ['#f6ecff', '#ffffff', '#b197fc'],
  nursery: ['#e6fff2', '#ffd6a5', '#ff8fb8'], gym: ['#e9f5ff', '#e0b98a', '#ff9f43'], salon: ['#ffe8f4', '#f4d6e2', '#d94f8b'],
  // outdoor: sky, ground, accent
  park: ['#bfe6ff', '#8ce99a', '#ff8fb8'], beach: ['#a9e4ff', '#f6e3b4', '#ff9f43'], snow: ['#d6ecff', '#f4f8ff', '#3a6ea5'],
  sky: ['#ffe3f6', '#ffffff', '#b197fc'], pool: ['#bfe6ff', '#e6f7ff', '#7fd1ff'], city: ['#cfe8ff', '#b8c0cc', '#ffd36e'],
  rails: ['#cfe8ff', '#b8b0a8', '#8a5a3c'], savanna: ['#ffe8b8', '#e0c068', '#c4502a'], fun: ['#ffe6f3', '#8ce99a', '#b197fc'],
  stadium: ['#bfe6ff', '#5cc86a', '#ffffff'], garden: ['#d4f4ff', '#7fd890', '#ff8fb8'], night: ['#1d2350', '#4a3f7a', '#ffd36e'],
  runway: ['#cfe8ff', '#9aa3ad', '#ffd36e'], rooftop: ['#cfe8ff', '#c9b8a8', '#3fa66b'], farm: ['#d4f0ff', '#9be37a', '#c4502a'],
};

export function themeFor(placeId: string, floorName: string, outdoor: boolean, houseStyle?: string): Theme {
  const set = new Set<string>(outdoor ? OUTDOOR : INDOOR);
  let kind = BY_NAME.find(([re, k]) => re.test(floorName) && set.has(k))?.[1];
  // Places with a strong outdoor identity keep it over a generic floor name (a zoo meadow is savanna, not a garden).
  const strong = new Set(['savanna', 'farm', 'beach', 'snow', 'sky', 'candy', 'spooky', 'night', 'city', 'rails', 'runway']);
  if (outdoor && kind === 'garden' && strong.has(PLACE_OUTDOOR[placeId] ?? '')) kind = PLACE_OUTDOOR[placeId];
  if (!kind) {
    if (houseStyle) kind = outdoor ? (houseStyle === 'beach' ? 'beach' : houseStyle === 'spooky_cute' ? 'spooky' : houseStyle === 'farmhouse' ? 'farm' : 'garden') : houseStyle === 'mansion' || houseStyle === 'castle' ? 'fancy' : houseStyle === 'spooky_cute' ? 'spooky' : houseStyle === 'cabin' || houseStyle === 'treehouse' ? 'barn' : 'home';
    else kind = (outdoor ? PLACE_OUTDOOR : PLACE_INDOOR)[placeId] ?? (outdoor ? 'park' : 'home');
  }
  if (outdoor && kind === 'spooky') kind = 'spooky';
  const [wall, floor, accent] = COLOURS[outdoor && kind === 'candy' ? 'candy' : kind] ?? COLOURS[outdoor ? 'park' : 'home'];
  return { indoor: !outdoor, kind, wall, floor, accent };
}
