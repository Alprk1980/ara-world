// Shared vocabulary for every content kind. Validators and prompts both read from here,
// so the model is told exactly the lists it will be checked against.

export const AGE_GROUPS = ['baby', 'toddler', 'kid', 'teen', 'adult', 'elder'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

/** Clothes and hair: drawn to fill their slot frame on the body, not placed in the world. */
export const WEARABLE_CATEGORIES = ['hair', 'top', 'bottom', 'dress', 'socks', 'shoes', 'hat', 'glasses', 'bag'] as const;

/** Things that stand in a scene, get held, or get placed. */
export const OBJECT_CATEGORIES = [
  'furniture', 'decor', 'food', 'drink', 'school', 'toy', 'garden', 'halloween',
  'baby', 'elder', 'plant', 'animal', 'vehicle', 'makeup', 'sport',
] as const;

export const TEMPLATE_CATEGORIES = [...WEARABLE_CATEGORIES, ...OBJECT_CATEGORIES] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const isWearable = (c: string): boolean => (WEARABLE_CATEGORIES as readonly string[]).includes(c);

/** Colour slots a template may paint with; a recipe fills them with real colours. */
export const COLOR_SLOTS = ['main', 'trim', 'accent', 'outline'] as const;
/** Literal colours allowed besides the slots: white shine, dark eyes, glass and water (same in every colourway). */
export const FIXED_COLORS = ['none', '#ffffff', '#3a2a2a', '#cdeeff', '#7fd1ff'] as const;

/** Anchors each object category needs (points in the 256x256 canvas). */
export const REQUIRED_ANCHORS: Record<string, readonly string[]> = {
  food: ['base', 'grip'],
  drink: ['base', 'grip'],
  toy: ['base', 'grip'],
  school: ['base', 'grip'],
  makeup: ['base', 'grip'],
  sport: ['base', 'grip'],
  furniture: ['base'],
  decor: ['base'],
  garden: ['base'],
  halloween: ['base'],
  baby: ['base'],
  elder: ['base'],
  plant: ['base'],
  animal: ['base'],
  vehicle: ['base'],
};
export const OPTIONAL_ANCHORS = ['seat', 'grip', 'top'] as const;

/** World size bounds per object category, in units where an adult is 100 tall. */
export const SIZE_BOUNDS: Record<string, { min: number; max: number }> = {
  food: { min: 4, max: 30 },
  drink: { min: 4, max: 25 },
  toy: { min: 5, max: 60 },
  school: { min: 4, max: 40 },
  makeup: { min: 3, max: 20 },
  sport: { min: 5, max: 60 },
  furniture: { min: 15, max: 220 },
  decor: { min: 5, max: 150 },
  garden: { min: 10, max: 400 },
  halloween: { min: 5, max: 160 },
  baby: { min: 8, max: 120 },
  elder: { min: 8, max: 120 },
  plant: { min: 5, max: 400 },
  animal: { min: 5, max: 400 },
  vehicle: { min: 40, max: 1500 },
};
