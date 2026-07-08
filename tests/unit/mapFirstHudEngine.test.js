import { describe, expect, it } from 'vitest';
import {
  filterCardsForMapFirst,
  getMapFirstHudLayout,
  resolveMapFirstFocusStrip,
  shouldShowExplorerActivity,
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
});
