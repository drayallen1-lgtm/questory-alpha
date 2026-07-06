import { describe, expect, it } from 'vitest';
import {
  buildDirectorPromptPayload,
  draftDirectorEvent,
  evaluateDirectorSignals,
  generateBossAwakeningSuggestion,
  generateDirectorRecommendations,
  getAiDirectorSnapshot,
  rankDirectorOpportunities,
} from '../../src/questoryAiDirectorEngine.js';
import { buildTestState } from './fixtures.js';

describe('questoryAiDirectorEngine', () => {
  it('snapshot loads with signals and opportunities', () => {
    const state = buildTestState();
    const snapshot = getAiDirectorSnapshot(state, state.adventures, { now: Date.now() });

    expect(snapshot).toBeTruthy();
    expect(snapshot.initialized).toBe(true);
    expect(snapshot.signalCount).toBeGreaterThan(0);
    expect(Array.isArray(snapshot.signals)).toBe(true);
    expect(Array.isArray(snapshot.opportunities)).toBe(true);
    expect(snapshot.worldHealth).toBeGreaterThan(0);
  });

  it('signals generate safely without private fields', () => {
    const state = buildTestState({ playerEmail: 'secret@test.com' });
    const signals = evaluateDirectorSignals(state, state.adventures);

    expect(signals.length).toBeGreaterThan(0);
    const json = JSON.stringify(signals);
    expect(json).not.toContain('secret@test.com');
    expect(json).not.toContain('playerEmail');
  });

  it('opportunities rank by urgency', () => {
    const state = buildTestState();
    const signals = evaluateDirectorSignals(state, state.adventures);
    const opps = rankDirectorOpportunities(signals, state, state.adventures);

    expect(opps.length).toBeGreaterThan(0);
    for (let i = 1; i < opps.length; i += 1) {
      expect(opps[i - 1].urgency).toBeGreaterThanOrEqual(opps[i].urgency);
    }
  });

  it('boss suggestion returns deterministic structure', () => {
    const state = buildTestState();
    const suggestion = generateBossAwakeningSuggestion(state, state.adventures);

    if (suggestion) {
      expect(suggestion).toHaveProperty('bossId');
      expect(suggestion).toHaveProperty('pitch');
      expect(suggestion).toHaveProperty('fantasyCopy');
    }
  });

  it('market draft does not mutate major world state', () => {
    const state = buildTestState();
    const before = JSON.stringify(state.progress);
    const result = draftDirectorEvent(state, 'market_shift');
    if (result.ok) {
      expect(JSON.stringify(result.state.progress)).toBe(before);
      expect(result.state.aiDirector.drafts.length).toBeGreaterThan(0);
    }
  });

  it('prompt payload excludes private fields', () => {
    const state = buildTestState({
      progress: { 'union-depot-ghost': { step: 2, claimed: true, claimedAt: new Date().toISOString() } },
    });
    const payload = buildDirectorPromptPayload(state, state.adventures);
    const json = JSON.stringify(payload);

    expect(payload.guardrails.noPrivateUserData).toBe(true);
    expect(json).not.toContain('claimHistory');
    expect(payload.player).toBeTruthy();
    expect(payload.signals.length).toBeGreaterThan(0);
  });

  it('generateDirectorRecommendations returns typed opportunities', () => {
    const state = buildTestState();
    const recs = generateDirectorRecommendations(state, state.adventures);

    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toHaveProperty('type');
    expect(recs[0]).toHaveProperty('urgency');
    expect(recs[0]).toHaveProperty('confidence');
  });
});
