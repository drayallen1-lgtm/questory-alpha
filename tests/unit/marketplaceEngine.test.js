import { describe, expect, it } from 'vitest';
import {
  getMarketplaceSnapshot,
  purchaseListing,
} from '../../src/marketplaceEngine.js';
import { buildTestState } from './fixtures.js';

describe('marketplaceEngine', () => {
  it('marketplace snapshot loads', () => {
    const state = buildTestState({ coins: 500 });
    const snapshot = getMarketplaceSnapshot(state, state.adventures, { now: Date.now() });

    expect(snapshot).toBeTruthy();
    expect(Array.isArray(snapshot.listings)).toBe(true);
    expect(snapshot.stats).toBeTruthy();
  });

  it('listing purchase with invalid id returns safely', () => {
    const state = buildTestState({ coins: 500 });
    const result = purchaseListing(state, 'missing-listing-id', state.adventures);

    expect(result.ok).toBe(false);
    expect(result.message).toBeTruthy();
    expect(result.state).toBeUndefined();
  });
});
