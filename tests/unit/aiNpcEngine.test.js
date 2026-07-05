import { describe, expect, it } from 'vitest';
import {
  generateNpcDialogue,
  getAiNpcSnapshot,
  getNpcRelationshipLabel,
} from '../../src/aiNpcEngine.js';
import { buildTestState } from './fixtures.js';

describe('aiNpcEngine', () => {
  it('NPC snapshot loads', () => {
    const state = buildTestState();
    const snapshot = getAiNpcSnapshot(state, state.adventures, { now: Date.now() });

    expect(snapshot).toBeTruthy();
    expect(Array.isArray(snapshot.profiles)).toBe(true);
    expect(snapshot.profiles.length).toBeGreaterThan(0);
  });

  it('dialogue generation returns safe string', () => {
    const state = buildTestState();
    const npc = { id: 'groundskeeper', name: 'Groundskeeper', dialogues: [{ text: 'Hello.' }] };
    const result = generateNpcDialogue(npc, state, state.adventures);

    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).not.toMatch(/password|api[_-]?key|secret token/i);
  });

  it('relationship label resolves', () => {
    expect(getNpcRelationshipLabel(10)).toBeTruthy();
    expect(getNpcRelationshipLabel({ trust: 80, friendship: 70, respect: 60, fear: 5, rivalry: 0, betrayals: 0 })).toBeTruthy();
  });
});
