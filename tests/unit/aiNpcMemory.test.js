import { describe, expect, it } from 'vitest';
import {
  recordNpcEncounter,
  recordNpcMemory,
  getNpcMemoryRecord,
} from '../../src/aiNpcEngine.js';
import { buildTestState } from './fixtures.js';

describe('aiNpcEngine memory', () => {
  it('recordNpcEncounter updates memory without crashing', () => {
    const state = buildTestState();
    const npcId = 'iron-conductor';
    const next = recordNpcEncounter(state, npcId, {
      adventureId: 'union-depot-ghost',
      location: 'Union Depot',
    });
    const memory = getNpcMemoryRecord(next, npcId);
    expect(memory.lastSeen).toBeTruthy();
    expect(memory.encounters.length).toBeGreaterThan(0);
  });

  it('recordNpcMemory stores memory flags', () => {
    const state = buildTestState();
    const npcId = 'black-lantern-keeper';
    const next = recordNpcMemory(state, npcId, 'test-memory-key', {
      note: 'Saw the lantern flicker',
    });
    const memory = getNpcMemoryRecord(next, npcId);
    expect(memory.memoryFlags).toContain('test-memory-key');
  });
});
