// Gentle background music made on the fly (no audio files): a soft pentatonic melody over a slow bass, looping.
// Starts on the Play button (browsers only allow sound after a tap); the 🎵 button turns it off and on.
import { load, save } from '../app/save.ts';

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16]; // major pentatonic, two octaves
const ROOT = 392; // G4
const BASS = [0, -5, -3, -7]; // G, D, E, C (semitones from G3)
const BEAT = 0.42; // seconds

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let nextTime = 0;
let step = 0;
let on = true;

const hz = (base: number, semis: number) => base * Math.pow(2, semis / 12);

function note(freq: number, start: number, len: number, type: OscillatorType, vol: number): void {
  if (!ctx || !gain) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, start + len);
  o.connect(g).connect(gain);
  o.start(start);
  o.stop(start + len + 0.05);
}

/** Schedule the next couple of seconds of music (called a few times a second). */
function schedule(): void {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + 1.5) {
    const bar = Math.floor(step / 8) % BASS.length;
    if (step % 8 === 0) note(hz(ROOT / 2, BASS[bar]), nextTime, BEAT * 7.5, 'sine', 0.09);
    // A wandering melody that mostly steps, sometimes rests.
    if (Math.random() > 0.22) {
      const idx = Math.max(0, Math.min(SCALE.length - 1, (step * 3 + bar * 2 + (Math.random() < 0.5 ? 0 : 1)) % SCALE.length));
      note(hz(ROOT, SCALE[idx]), nextTime, BEAT * (Math.random() < 0.3 ? 1.8 : 0.9), 'triangle', 0.05);
    }
    nextTime += BEAT;
    step++;
  }
}

export async function startMusic(): Promise<void> {
  on = await load('music', true);
  if (!on) return;
  try {
    ctx ??= new AudioContext();
    await ctx.resume();
    if (!gain) {
      gain = ctx.createGain();
      gain.gain.value = 0.6;
      gain.connect(ctx.destination);
    }
    if (timer === undefined) {
      nextTime = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 250);
    }
  } catch {
    // No sound available: play on silently.
  }
}

export function musicOn(): boolean {
  return on;
}

export async function toggleMusic(): Promise<boolean> {
  on = !on;
  await save('music', on);
  if (on) await startMusic();
  else {
    clearInterval(timer);
    timer = undefined;
  }
  return on;
}
