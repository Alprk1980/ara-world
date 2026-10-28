import { describe, expect, it } from 'vitest';
import { prizesToOpen, todayKey } from './postbox.ts';

const day = (m: number, d: number) => new Date(2026, m - 1, d, 10);
const key = (m: number, d: number) => todayKey(day(m, d)).key;

describe('post box prizes', () => {
  it('gives one prize on the very first visit', () => {
    expect(prizesToOpen([], day(10, 28)).map((p) => p.key)).toEqual([key(10, 28)]);
  });
  it('gives one prize when yesterday was opened', () => {
    expect(prizesToOpen([key(10, 27)], day(10, 28))).toHaveLength(1);
  });
  it('gives two prizes the day after a missed day', () => {
    expect(prizesToOpen([key(10, 26)], day(10, 28)).map((p) => p.key)).toEqual([key(10, 27), key(10, 28)]);
  });
  it('never gives more than two, however many days were missed', () => {
    expect(prizesToOpen([key(9, 1)], day(10, 28))).toHaveLength(2);
  });
  it('gives nothing more once today is opened', () => {
    expect(prizesToOpen([key(10, 26), key(10, 27), key(10, 28)], day(10, 28))).toEqual([]);
  });
  it('catches up across the new year', () => {
    expect(prizesToOpen([todayKey(new Date(2025, 11, 30)).key], new Date(2026, 0, 1)).map((p) => p.key)).toEqual([todayKey(new Date(2025, 11, 31)).key, todayKey(new Date(2026, 0, 1)).key]);
  });
});
