// Little synthesized sounds (no audio files): one short tune per sound tag from the emotion data.
let ctx: AudioContext | null = null;

const TUNES: Record<string, { notes: number[]; wave: OscillatorType; step: number }> = {
  giggle: { notes: [880, 988, 880, 1047], wave: 'triangle', step: 0.07 },
  cheer: { notes: [523, 659, 784, 1047], wave: 'square', step: 0.09 },
  sigh: { notes: [440, 392, 330], wave: 'sine', step: 0.18 },
  gasp: { notes: [660, 990], wave: 'triangle', step: 0.08 },
  sniff: { notes: [392, 370, 392, 349], wave: 'sine', step: 0.12 },
  hmph: { notes: [220, 196], wave: 'sawtooth', step: 0.1 },
  yawn: { notes: [330, 294, 262, 247], wave: 'sine', step: 0.2 },
  kiss: { notes: [1319, 1568], wave: 'sine', step: 0.06 },
  ooh: { notes: [523, 587, 659], wave: 'sine', step: 0.15 },
  brr: { notes: [300, 320, 300, 320, 300], wave: 'square', step: 0.04 },
  pop: { notes: [700, 1200], wave: 'triangle', step: 0.04 },
  chomp: { notes: [200, 160], wave: 'square', step: 0.05 },
  tada: { notes: [523, 659, 784, 1047, 1319], wave: 'triangle', step: 0.08 },
};

export function playSound(tag: string): void {
  const tune = TUNES[tag];
  if (!tune) return;
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime;
    tune.notes.forEach((f, i) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain();
      o.type = tune.wave;
      o.frequency.value = f;
      const t = t0 + i * tune.step;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + tune.step * 0.95);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + tune.step);
    });
  } catch {
    // Sound is a nicety; never break play over it.
  }
}
