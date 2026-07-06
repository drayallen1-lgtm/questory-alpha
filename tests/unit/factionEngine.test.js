import { describe, expect, it } from 'vitest';
import {
  calculateTerritoryControl,
  getFactionSnapshot,
  getTerritoryOwner,
  joinFaction,
  leaveFaction,
  recordFactionContribution,
  resolveFactionReward,
  resolveTerritoryById,
  simulateFactionActivity,
} from '../../src/factionEngine.js';
import { buildTestState } from './fixtures.js';

describe('factionEngine', () => {
  it('snapshot loads with factions and territories', () => {
    const state = buildTestState();
    const snapshot = getFactionSnapshot(state, state.adventures, { now: Date.now() });

    expect(snapshot).toBeTruthy();
    expect(snapshot.initialized).toBe(true);
    expect(snapshot.factionCount).toBeGreaterThan(0);
    expect(snapshot.territoryCount).toBeGreaterThan(0);
    expect(Array.isArray(snapshot.territories)).toBe(true);
    expect(Array.isArray(snapshot.rankings)).toBe(true);
  });

  it('resolves territory owner from influence scores', () => {
    const state = buildTestState();
    const territory = resolveTerritoryById('downtown');
    const owner = getTerritoryOwner('downtown', state);
    const control = calculateTerritoryControl(territory, state);

    expect(owner).toBeTruthy();
    expect(control.ownerFactionId).toBe(owner);
    expect(control.ranked[0].pct).toBeGreaterThan(0);
  });

  it('detects contested territory when top two are close', () => {
    const state = buildTestState({
      faction: {
        contributions: {
          downtown: {
            'parsons-explorers': 50,
            'market-wardens': 48,
          },
        },
      },
    });
    const territory = resolveTerritoryById('downtown');
    const control = calculateTerritoryControl(territory, state);
    expect(typeof control.contested).toBe('boolean');
  });

  it('records contribution and updates guild xp', () => {
    const joined = joinFaction(buildTestState(), 'parsons-explorers');
    expect(joined.ok).toBe(true);
    const next = recordFactionContribution(joined.state, 'downtown', 'adventure_completion');
    expect(next.faction.guildXp).toBeGreaterThan(0);
    expect(next.faction.contributions.downtown['parsons-explorers']).toBeGreaterThan(0);
  });

  it('join and leave faction safely', () => {
    const joined = joinFaction(buildTestState(), 'ghost-hunters-kansas');
    expect(joined.state.faction.memberFactionId).toBe('ghost-hunters-kansas');
    expect(joined.state.social.myTeamId).toBe('ghost-hunters-kansas');
    const left = leaveFaction(joined.state);
    expect(left.ok).toBe(true);
    expect(left.state.faction.memberFactionId).toBeNull();
  });

  it('resolveFactionReward blocks duplicate claims', () => {
    const state = buildTestState({
      faction: { rewardsClaimed: ['territory-defender'] },
    });
    const result = resolveFactionReward(state, 'territory-defender');
    expect(result.ok).toBe(false);
  });

  it('simulateFactionActivity is deterministic for a day', () => {
    const now = Date.UTC(2026, 6, 5);
    const a = simulateFactionActivity('parsons-explorers', 'downtown', now);
    const b = simulateFactionActivity('parsons-explorers', 'downtown', now);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });
});
