// "When person clicked emojis show, when emoji pressed avatar feels that emotion."
export const EYES = ['open', 'happy', 'closed', 'wide', 'sad', 'wink', 'hearts', 'stars', 'sleepy', 'angry'] as const;
export const MOUTHS = ['smile', 'grin', 'open', 'frown', 'o', 'flat', 'tongue', 'wobbly', 'kiss'] as const;
export const MOTIONS = ['bounce', 'shake', 'jump', 'droop', 'spin', 'wiggle', 'sway', 'shiver', 'none'] as const;
export const SOUNDS = ['giggle', 'cheer', 'sigh', 'gasp', 'sniff', 'hmph', 'yawn', 'kiss', 'ooh', 'brr', 'none'] as const;

export type Emotion = {
  id: string;
  emoji: string;
  name: string;
  face: { eyes: string; mouth: string; brows: number; blush: boolean; tears: boolean };
  motion: string;
  sound: string;
  /** Seconds the feeling lasts before the face relaxes. */
  seconds: number;
};

export function emotionErrors(e: Emotion, all: readonly Emotion[]): string[] {
  const id = typeof e?.id === 'string' ? e.id : '?';
  const out: string[] = [];
  const err = (m: string) => out.push(`${id}: ${m}`);
  const oneOf = (v: unknown, list: readonly string[], f: string) => {
    if (!list.includes(v as string)) err(`${f}: one of ${list.join(', ')}`);
  };
  if (typeof e?.id !== 'string' || !/^[a-z][a-z_]{1,23}$/.test(e.id)) err('id: snake_case');
  else if (all.some((o) => o !== e && o.id === e.id)) err('id already exists');
  if (all.some((o) => o !== e && o.emoji === e.emoji)) err(`emoji ${e.emoji} already used`);
  if (typeof e?.emoji !== 'string' || [...e.emoji].length > 3 || /[a-z0-9]/i.test(e.emoji)) err('emoji: one emoji');
  if (typeof e?.name !== 'string' || e.name.length < 2 || e.name.length > 16) err('name: 2-16 characters');
  oneOf(e?.face?.eyes, EYES, 'face.eyes');
  oneOf(e?.face?.mouth, MOUTHS, 'face.mouth');
  if (typeof e?.face?.brows !== 'number' || e.face.brows < -1 || e.face.brows > 1) err('face.brows: -1 (worried/angry down) to 1 (raised)');
  if (typeof e?.face?.blush !== 'boolean' || typeof e?.face?.tears !== 'boolean') err('face.blush and face.tears: true or false');
  oneOf(e?.motion, MOTIONS, 'motion');
  oneOf(e?.sound, SOUNDS, 'sound');
  if (typeof e?.seconds !== 'number' || e.seconds < 1 || e.seconds > 6) err('seconds: 1-6');
  return out;
}
