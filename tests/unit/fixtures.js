import { defaultState, STORAGE_KEY } from '../../src/seed.js';

export { STORAGE_KEY };

export function buildTestState(overrides = {}) {
  return {
    ...defaultState,
    ...overrides,
    progress: { ...defaultState.progress, ...(overrides.progress || {}) },
    world: { ...defaultState.world, ...(overrides.world || {}) },
  };
}

export function getUnionDepotAdventure(state) {
  return (state.adventures || []).find((a) => a.id === 'union-depot-ghost') || null;
}

export function buildClaimReadyProgress(adventureId = 'union-depot-ghost', clueCount = 2) {
  return {
    step: clueCount,
    claimed: false,
    bonuses: [],
    medallionTapped: false,
    pathId: 'ghost',
    branchCommittedAt: new Date().toISOString(),
  };
}
