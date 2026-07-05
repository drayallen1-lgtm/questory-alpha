import { describe, expect, it } from 'vitest';
import { runClaimTreasure } from '../../src/claimFlow.js';
import { buildTestState, buildClaimReadyProgress, getUnionDepotAdventure } from './fixtures.js';

describe('claimFlow', () => {
  it('wrong code fails gracefully', async () => {
    const state = buildTestState({
      progress: { 'union-depot-ghost': buildClaimReadyProgress() },
    });
    const adventure = getUnionDepotAdventure(state);

    const result = await runClaimTreasure({
      state,
      adventure,
      code: 'WRONG-CODE',
      options: {},
      user: null,
      isSupabaseMode: false,
      claimLimitedRewardRemote: null,
    });

    expect(result.response?.ok).toBe(false);
    expect(result.response?.success).toBe(false);
    expect(result.applyToState).toBeUndefined();
  });

  it('DEPOTGHOST succeeds for Union Depot Ghost', async () => {
    const state = buildTestState({
      progress: { 'union-depot-ghost': buildClaimReadyProgress() },
    });
    const adventure = getUnionDepotAdventure(state);

    const result = await runClaimTreasure({
      state,
      adventure,
      code: 'DEPOTGHOST',
      options: {},
      user: null,
      isSupabaseMode: false,
      claimLimitedRewardRemote: null,
    });

    expect(result.response?.ok).toBe(true);
    expect(typeof result.applyToState).toBe('function');
    const next = result.applyToState(state);
    expect(next.progress['union-depot-ghost'].claimed).toBe(true);
  });

  it('duplicate claim is blocked', async () => {
    const state = buildTestState({
      progress: {
        'union-depot-ghost': { ...buildClaimReadyProgress(), claimed: true },
      },
    });
    const adventure = getUnionDepotAdventure(state);

    const result = await runClaimTreasure({
      state,
      adventure,
      code: 'DEPOTGHOST',
      options: {},
      user: null,
      isSupabaseMode: false,
      claimLimitedRewardRemote: null,
    });

    expect(result.response?.ok).toBe(false);
    expect(result.response?.message).toMatch(/already claimed/i);
  });
});
