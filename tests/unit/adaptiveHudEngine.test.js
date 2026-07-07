import { describe, expect, it } from 'vitest';
import {
  HUD_MODE_IDS,
  buildAdaptiveHudStrip,
  getAdaptiveHudSnapshot,
  prioritizeHudCards,
  resolveHudMode,
} from '../../src/adaptiveHudEngine.js';
import { buildTestState } from './fixtures.js';

describe('adaptiveHudEngine', () => {
  it('selects walking mode at street zoom', () => {
    expect(
      resolveHudMode({
        layerSnapshot: { zoom: 12, streetLevel: true, layers: { guild: { visible: false } } },
        faction: {},
      })
    ).toBe(HUD_MODE_IDS.WALKING);
  });

  it('selects driving mode when zoomed out regionally', () => {
    expect(
      resolveHudMode({
        layerSnapshot: { zoom: 8, regionalLevel: true, layers: {} },
        faction: {},
      })
    ).toBe(HUD_MODE_IDS.DRIVING);
  });

  it('builds walking strip with treasure, compass, and distance', () => {
    const strip = buildAdaptiveHudStrip(HUD_MODE_IDS.WALKING, {
      hudContext: { distanceM: 80, selectedAdventureTitle: 'Union Depot' },
      legendaryHunt: { hasActiveBoss: true, worldBoss: { name: 'Iron Conductor' } },
      worldDiscovery: { currentRegion: { label: 'Downtown Parsons' } },
    });
    expect(strip).toHaveLength(3);
    expect(strip[0].label).toBe('Nearby Treasure');
    expect(strip[2].value).toContain('ft');
  });

  it('prioritizes guild cards during guild war mode', () => {
    const cards = [
      { id: 'marketplace' },
      { id: 'guild' },
      { id: 'earth' },
      { id: 'explorer' },
    ];
    const ordered = prioritizeHudCards(cards, HUD_MODE_IDS.GUILD_WAR);
    expect(ordered[0].id).toBe('guild');
  });

  it('exposes adaptive snapshot for adventure play', () => {
    const state = buildTestState();
    const adventure = state.adventures[0];
    const snapshot = getAdaptiveHudSnapshot({
      state: {
        ...state,
        screen: 'play',
        selectedAdventureId: adventure.id,
        progress: {
          ...state.progress,
          [adventure.id]: { ...state.progress[adventure.id], step: 1 },
        },
      },
      adventures: state.adventures,
      hudContext: { zoom: 12, selectedAdventureId: adventure.id },
      cards: [{ id: 'explorer' }, { id: 'liveHunt' }, { id: 'earth' }],
    });
    expect(snapshot.mode).toBe(HUD_MODE_IDS.ADVENTURE);
    expect(snapshot.strip.some((item) => item.id === 'clues')).toBe(true);
    expect(snapshot.stripVisible).toBe(true);
  });
});
