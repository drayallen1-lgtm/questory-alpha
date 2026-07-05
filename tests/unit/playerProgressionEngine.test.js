import { describe, expect, it } from 'vitest';
import {
  applyProgressionOnVictory,
  getPlayerProgressionSnapshot,
} from '../../src/playerProgressionEngine.js';
import { buildTestState, getUnionDepotAdventure } from './fixtures.js';

describe('playerProgressionEngine', () => {
  it('XP snapshot returns level and ranks', () => {
    const state = buildTestState();
    const snapshot = getPlayerProgressionSnapshot(state, state.adventures);

    expect(snapshot.explorerLevel).toBeGreaterThanOrEqual(1);
    expect(snapshot.treasureHunterRank).toBeTruthy();
    expect(snapshot.cartographerRank).toBeTruthy();
    expect(snapshot.cityReputation).toBeTruthy();
  });

  it('victory progression does not crash', () => {
    const state = buildTestState();
    const adventure = getUnionDepotAdventure(state);
    const next = applyProgressionOnVictory(state, adventure, { isFirstFinder: false });
    expect(next.playerProgression).toBeTruthy();
  });
});
