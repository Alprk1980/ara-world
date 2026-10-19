import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KINDS } from './kinds.ts';

// Placeholders the generator fills itself; colour slots stay in the template prompt on purpose.
const GENERIC = ['count', 'ask', 'existing'];
const SLOTS = ['main', 'trim', 'accent', 'outline'];
const ASKS: Record<string, string> = { item: 'a,b', daily: '10' };

describe('prompts', () => {
  for (const [name, kind] of Object.entries(KINDS)) {
    if (name === 'place') continue; // needs a plan entry; covered when the pipeline runs
    it(`${name}: every placeholder is filled`, () => {
      const vars = kind.vars?.(ASKS[name] ?? '') ?? {};
      const left = [...readFileSync(kind.prompt, 'utf8').matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).filter((k) => !(k in vars) && !GENERIC.includes(k) && !SLOTS.includes(k));
      expect(left).toEqual([]);
    });
  }
});
