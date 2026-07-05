import { describe, expect, it, vi } from 'vitest';
import { toSafeDate, safeGetHours, safeGetTime, safeNowDate } from '../../src/dateUtils.js';

describe('dateUtils', () => {
  it('toSafeDate accepts valid ISO strings', () => {
    const d = toSafeDate('2024-06-15T12:00:00.000Z');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
  });

  it('toSafeDate accepts unix ms numbers', () => {
    const ms = Date.UTC(2024, 5, 15);
    expect(toSafeDate(ms).getTime()).toBe(ms);
  });

  it('toSafeDate returns fallback for invalid input', () => {
    const fallback = new Date('2020-01-01T00:00:00.000Z');
    expect(toSafeDate('not-a-date', fallback)).toBe(fallback);
    expect(toSafeDate(NaN, fallback)).toBe(fallback);
  });

  it('toSafeDate handles Firestore-like seconds objects', () => {
    const d = toSafeDate({ seconds: 1_700_000_000 });
    expect(d.getTime()).toBe(1_700_000_000_000);
  });

  it('safeGetHours and safeGetTime use fallback safely', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fallback = new Date('2024-01-01T15:00:00.000Z');
    expect(safeGetHours('bad', fallback)).toBe(fallback.getHours());
    expect(safeGetTime('bad', fallback)).toBe(fallback.getTime());
    vi.restoreAllMocks();
  });

  it('safeNowDate never throws', () => {
    const d = safeNowDate(undefined);
    expect(d).toBeInstanceOf(Date);
  });
});
