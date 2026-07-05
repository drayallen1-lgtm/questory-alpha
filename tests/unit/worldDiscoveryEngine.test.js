import { describe, expect, it } from 'vitest';
import { getWorldDiscoverySnapshot } from '../../src/worldDiscoveryEngine.js';
import { buildTestState } from './fixtures.js';

describe('worldDiscoveryEngine', () => {
  it('snapshot returns city/state/world progress fields', () => {
    const state = buildTestState();
    const snapshot = getWorldDiscoverySnapshot({
      zoom: 12,
      state,
      adventures: state.adventures,
      fog: { revealed: state.mapExploration?.revealed || [] },
      now: Date.now(),
    });

    expect(snapshot).toBeTruthy();
    expect(snapshot.level).toBeTruthy();
    expect(typeof snapshot.overallPct === 'number' || snapshot.overallPct == null).toBe(true);
  });

  it('percentages stay within 0–100 when present', () => {
    const state = buildTestState();
    const snapshot = getWorldDiscoverySnapshot({
      zoom: 8,
      state,
      adventures: state.adventures,
      fog: { revealed: [] },
      now: Date.now(),
    });

    const pctFields = [
      snapshot.overallPct,
      snapshot.cityPct,
      snapshot.statePct,
      snapshot.countryPct,
    ].filter((v) => typeof v === 'number');

    for (const pct of pctFields) {
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });
});
