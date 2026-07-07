import { describe, expect, it } from 'vitest';
import { buildFloatingHudCards } from '../../src/floatingCardsEngine.js';

describe('floatingCardsEngine', () => {
  it('builds expandable HUD cards from engine snapshots', () => {
    const snapshot = buildFloatingHudCards({
      livingWorld: {
        timeline: [
          { id: 'a1', text: 'Quinn found a relic' },
          { id: 'a2', text: 'Michael started Iron Conductor' },
        ],
        presence: { explorersNearby: 4 },
      },
      marketplace: {
        listings: [{ id: 'l1' }, { id: 'l2' }],
        auctions: [{ id: 'au1' }],
        activityFeed: [{ id: 'm1', text: 'Lantern sold for 12,000 Coins' }],
      },
      faction: {
        wars: [{ territoryId: 't1', name: 'Downtown', leader: 'Ravens', challenger: 'Embers' }],
        contestedCount: 1,
      },
      worldDiscovery: {
        currentRegion: { label: 'Parsons', completionPercent: 42 },
        worldRegion: { animatedDisplayPercent: 22.7 },
      },
      earth: { globalGoals: [{ id: 'g1', label: 'Reach 25% World Discovery', icon: '🌍' }] },
    });

    expect(snapshot.cards.length).toBeGreaterThan(0);
    const explorer = snapshot.cards.find((c) => c.id === 'explorer');
    expect(explorer.metric).toBe(4);
    expect(explorer.items[0].text).toContain('Quinn');
    expect(snapshot.cards.find((c) => c.id === 'guild')?.title).toBe('Territory War');
    expect(snapshot.earthPct).toBe(22.7);
  });

  it('filters cards by progressive layer hud visibility', () => {
    const snapshot = buildFloatingHudCards({
      livingWorld: { timeline: [] },
      marketplace: {},
      faction: {},
      worldDiscovery: {},
      earth: {},
      layerSnapshot: { hudCards: { explorer: true, guild: false, earth: true } },
    });

    const ids = snapshot.cards.map((c) => c.id);
    expect(ids).toContain('explorer');
    expect(ids).not.toContain('guild');
    expect(ids).toContain('earth');
  });
});
