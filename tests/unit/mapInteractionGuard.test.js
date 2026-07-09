import { describe, expect, it } from 'vitest';
import {
  isMapInteractiveClickTarget,
  resolveAdventureMarkerPayload,
} from '../../src/mapInteractionGuard.js';

describe('mapInteractionGuard', () => {
  it('ignores marker, card, and button clicks for background dismiss', () => {
    const pin = document.createElement('button');
    pin.className = 'questory-pin';
    document.body.appendChild(pin);

    const card = document.createElement('div');
    card.className = 'map-pin-card';
    const closeBtn = document.createElement('button');
    card.appendChild(closeBtn);
    document.body.appendChild(card);

    expect(isMapInteractiveClickTarget(pin)).toBe(true);
    expect(isMapInteractiveClickTarget(closeBtn)).toBe(true);
    expect(isMapInteractiveClickTarget(document.createElement('a'))).toBe(true);

    const canvas = document.createElement('canvas');
    expect(isMapInteractiveClickTarget(canvas)).toBe(false);

    pin.remove();
    card.remove();
  });

  it('resolves adventure marker payload for card open', () => {
    const adventure = { id: 'adv-1', title: 'Test' };
    expect(resolveAdventureMarkerPayload(adventure, null)).toEqual({
      adventure,
      id: 'adv-1',
    });
    expect(resolveAdventureMarkerPayload(adventure, { id: 'adv-1', distanceM: 120 })).toEqual({
      id: 'adv-1',
      distanceM: 120,
    });
    expect(resolveAdventureMarkerPayload(null, null)).toBeNull();
  });
});
