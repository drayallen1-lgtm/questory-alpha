import { describe, expect, it } from 'vitest';
import {
  API_NAMESPACES,
  createApiKey,
  getApiNamespace,
  getPlatformApiSnapshot,
} from '../../src/platformApiEngine.js';
import { buildTestState } from './fixtures.js';

describe('platformApiEngine', () => {
  it('snapshot loads all namespaces read-only', () => {
    const state = buildTestState();
    const snapshot = getPlatformApiSnapshot(state, state.adventures);

    expect(snapshot.initialized).toBe(true);
    expect(snapshot.readOnly).toBe(true);
    expect(snapshot.liveIntegrationsEnabled).toBe(false);
    expect(snapshot.stats.namespaceCount).toBe(12);
    expect(snapshot.namespaces[API_NAMESPACES.ADVENTURES].length).toBeGreaterThan(0);
  });

  it('getApiNamespace returns adventure data', () => {
    const state = buildTestState();
    const result = getApiNamespace(state, API_NAMESPACES.PLAYERS, state.adventures);
    expect(result.ok).toBe(true);
    expect(result.data).toHaveProperty('coins');
  });

  it('createApiKey does not mutate gameplay progress', () => {
    const state = buildTestState();
    const before = JSON.stringify(state.progress);
    const result = createApiKey(state, { label: 'Test' });
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result.state.progress)).toBe(before);
  });
});
