import { describe, expect, it } from 'vitest';
import { getCraftingBonuses, getCraftingSnapshot } from '../../src/craftingEngine.js';
import { buildTestState } from './fixtures.js';

describe('craftingEngine bonuses', () => {
  it('returns zero bonuses with no crafted artifacts', () => {
    const state = buildTestState();
    const bonuses = getCraftingBonuses(state);
    expect(bonuses.discoveryRadiusPct).toBe(0);
    expect(bonuses.fogRevealRadiusPct).toBe(0);
  });

  it('sums recipe effect bonuses from crafted ids', () => {
    const state = buildTestState({
      crafting: { craftedIds: ['explorer_compass'], materialsSpent: {} },
    });
    const bonuses = getCraftingBonuses(state);
    expect(bonuses.discoveryRadiusPct).toBeGreaterThan(0);
  });

  it('snapshot includes bonus percentages', () => {
    const state = buildTestState({
      crafting: { craftedIds: ['explorer_compass'], materialsSpent: {} },
    });
    const snapshot = getCraftingSnapshot(state, state.adventures);
    expect(snapshot.discoveryRadiusPct).toBeGreaterThan(0);
    expect(snapshot.bonuses.discoveryRadiusPct).toBeGreaterThan(0);
  });
});
