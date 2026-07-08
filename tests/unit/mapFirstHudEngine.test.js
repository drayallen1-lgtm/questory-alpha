import { describe, expect, it } from 'vitest';
import {
  filterCardsForMapFirst,
  getMapFirstHudLayout,
  resolveMapFirstFocusStrip,
  resolveMarketChip,
  shouldShowExplorerActivity,
  shouldShowMarketChip,
} from '../../src/mapFirstHudEngine.js';
import { HUD_MODE_IDS } from '../../src/adaptiveHudEngine.js';

describe('mapFirstHudEngine', () => {
  it('hides explorer card when no nearby activity', () => {
    expect(shouldShowExplorerActivity({ presence: { explorersNearby: 0 }, timeline: [] })).toBe(
      false
    );
    const cards = filterCardsForMapFirst(
      [{ id: 'explorer' }, { id: 'earth' }],
      { livingWorld: { presence: { explorersNearby: 0 }, timeline: [] } }
    );
    expect(cards.map((c) => c.id)).toEqual(['earth']);
  });

  it('shows one focus strip item for walking mode', () => {
    const strip = [
      { id: 'treasure', label: 'Nearby Treasure', value: 'Iron Conductor' },
      { id: 'compass', label: 'Compass', value: 'Downtown' },
      { id: 'distance', label: 'Distance', value: '80 ft' },
    ];
    const focus = resolveMapFirstFocusStrip(strip, HUD_MODE_IDS.WALKING);
    expect(focus).toHaveLength(1);
    expect(focus[0].id).toBe('treasure');
  });

  it('keeps card deck collapsed until opened', () => {
    const layout = getMapFirstHudLayout({
      mode: HUD_MODE_IDS.WALKING,
      strip: [{ id: 'treasure', label: 'Nearby Treasure', value: 'Boss' }],
      cards: [{ id: 'earth' }, { id: 'guild' }],
      livingWorld: { presence: { explorersNearby: 2 }, timeline: [] },
      deckOpen: false,
      expandedCardId: null,
    });
    expect(layout.showCardDeck).toBe(false);
    expect(layout.showDeckToggle).toBe(true);
    expect(layout.focusVisible).toBe(true);
  });

  it('never renders marketplace as a HUD deck card (map-native only)', () => {
    const cards = filterCardsForMapFirst(
      [{ id: 'marketplace' }, { id: 'earth' }, { id: 'guild' }],
      { livingWorld: { presence: { explorersNearby: 2 }, timeline: [] } }
    );
    expect(cards.map((c) => c.id)).not.toContain('marketplace');
  });

  it('shows a compact market chip when activity is nearby', () => {
    const marketplace = { listings: [{ id: 'l1' }], auctions: [{ id: 'a1' }] };
    expect(shouldShowMarketChip({ marketplace, mode: HUD_MODE_IDS.WORLD })).toBe(true);
    const chip = resolveMarketChip({ marketplace, mode: HUD_MODE_IDS.WORLD });
    expect(chip.venueId).toBe('downtown-market');
    expect(chip.tab).toBe('featured');
    expect(chip.count).toBe(2);
  });

  it('hides the market chip while driving or with the deck open', () => {
    const marketplace = { listings: [{ id: 'l1' }] };
    expect(shouldShowMarketChip({ marketplace, mode: HUD_MODE_IDS.DRIVING })).toBe(false);
    expect(shouldShowMarketChip({ marketplace, mode: HUD_MODE_IDS.WORLD, deckOpen: true })).toBe(
      false
    );
    expect(shouldShowMarketChip({ marketplace: {}, mode: HUD_MODE_IDS.WORLD })).toBe(false);
  });

  it('exposes the market chip through the layout snapshot', () => {
    const layout = getMapFirstHudLayout({
      mode: HUD_MODE_IDS.WORLD,
      strip: [],
      cards: [{ id: 'marketplace' }, { id: 'earth' }],
      livingWorld: { presence: { explorersNearby: 2 }, timeline: [] },
      marketplace: { listings: [{ id: 'l1' }] },
      deckOpen: false,
      expandedCardId: null,
    });
    expect(layout.marketChipVisible).toBe(true);
    expect(layout.filteredCards.map((c) => c.id)).not.toContain('marketplace');
  });
});
