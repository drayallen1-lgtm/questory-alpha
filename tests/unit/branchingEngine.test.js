import { describe, expect, it } from 'vitest';
import { commitBranchPath } from '../../src/branchingEngine.js';
import { buildTestState, getUnionDepotAdventure } from './fixtures.js';

describe('branchingEngine', () => {
  it('commitBranchPath does not crash with invalid input', () => {
    const state = buildTestState();
    expect(commitBranchPath(null, null, null, 0)).toBeNull();
    expect(commitBranchPath(state, null, 'ghost', 0)).toBe(state);
    expect(commitBranchPath(state, { id: 'x' }, null, 0)).toBe(state);
  });

  it('valid branch path persists on adventure progress', () => {
    const state = buildTestState();
    const adventure = getUnionDepotAdventure(state);
    expect(adventure).toBeTruthy();

    const next = commitBranchPath(state, adventure, 'ghost', 0);
    expect(next.progress[adventure.id].pathId).toBe('ghost');
    expect(next.progress[adventure.id].pathLabel).toBeTruthy();
  });
});
