import { describe, expect, it } from 'vitest';
import { getLegendaryHuntSnapshot } from '../../src/legendaryHuntEngine.js';
import { buildTestState } from './fixtures.js';

describe('legendaryHuntEngine', () => {
  it('snapshot loads with boss and hunt fields', () => {
    const state = buildTestState();
    const snapshot = getLegendaryHuntSnapshot(state, state.adventures, { now: Date.now() });

    expect(snapshot).toBeTruthy();
    expect(snapshot).toHaveProperty('worldBoss');
    expect(snapshot).toHaveProperty('hasActiveBoss');
    expect(Array.isArray(snapshot.races)).toBe(true);
    expect(Array.isArray(snapshot.timeline)).toBe(true);
  });
});
