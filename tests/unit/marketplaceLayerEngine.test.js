import { describe, expect, it } from 'vitest';
import {
  MARKETPLACE_TAB_IDS,
  buildMarketVenueOverlays,
  buildVenueCard,
  getMarketplaceLayerSnapshot,
  resolveMarketplaceTab,
  resolveMarketplaceVenue,
} from '../../src/marketplaceLayerEngine.js';
import { buildTestState } from './fixtures.js';

describe('marketplaceLayerEngine', () => {
  it('resolves primary world venues', () => {
    expect(resolveMarketplaceVenue('downtown-market')?.label).toBe('Downtown Market');
    expect(resolveMarketplaceVenue('creator-bazaar')?.kind).toBe('creator');
    expect(resolveMarketplaceVenue('legendary-auction')?.kind).toBe('auction');
    expect(resolveMarketplaceVenue('traveling-merchant')?.kind).toBe('merchant');
  });

  it('maps venue kinds to marketplace tabs', () => {
    expect(resolveMarketplaceTab(null, null, { venue: { kind: 'auction' } })).toBe(
      MARKETPLACE_TAB_IDS.AUCTIONS
    );
    expect(resolveMarketplaceTab(null, null, { venue: { kind: 'creator' } })).toBe(
      MARKETPLACE_TAB_IDS.CREATOR
    );
  });

  it('builds venue cards with live inventory previews', () => {
    const snapshot = getMarketplaceLayerSnapshot(buildTestState(), buildTestState().adventures);
    const downtown = buildVenueCard(
      resolveMarketplaceVenue('downtown-market'),
      snapshot.marketplace
    );
    expect(downtown.items.length).toBeGreaterThan(0);
    expect(downtown.liveCount).toBeGreaterThan(0);
    expect(downtown.ctaLabel).toBe('Browse Market');
  });

  it('exposes primary map overlays for the living world layer', () => {
    const snapshot = getMarketplaceLayerSnapshot(buildTestState(), buildTestState().adventures, {
      primaryOnly: true,
    });
    expect(snapshot.venues).toHaveLength(4);
    expect(buildMarketVenueOverlays(snapshot.marketplace, { primaryOnly: true })).toHaveLength(4);
    expect(snapshot.venues.map((venue) => venue.id)).toEqual([
      'downtown-market',
      'creator-bazaar',
      'legendary-auction',
      'traveling-merchant',
    ]);
  });

  it('deep links marketplace tab from selected venue state', () => {
    const state = {
      ...buildTestState(),
      marketplaceVenueId: 'legendary-auction',
    };
    const snapshot = getMarketplaceLayerSnapshot(state, state.adventures);
    expect(snapshot.tab).toBe(MARKETPLACE_TAB_IDS.AUCTIONS);
    expect(snapshot.selectedVenue?.id).toBe('legendary-auction');
  });
});
