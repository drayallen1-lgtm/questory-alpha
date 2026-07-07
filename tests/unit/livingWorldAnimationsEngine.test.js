import { describe, expect, it } from 'vitest';
import {
  WORLD_ANIMATION_IDS,
  buildWorldAnimationClassName,
  getLivingWorldAnimationsSnapshot,
} from '../../src/livingWorldAnimationsEngine.js';

const baseLayers = {
  discovery: { visible: true, opacity: 0.9 },
  explorer: { visible: true, opacity: 0.9 },
  guild: { visible: true, opacity: 0.9 },
  marketplace: { visible: true, opacity: 0.9 },
  earth: { visible: true, opacity: 0.9 },
};

describe('livingWorldAnimationsEngine', () => {
  it('activates layer-aware world animations', () => {
    const snapshot = getLivingWorldAnimationsSnapshot({
      layerSnapshot: { layers: baseLayers },
      livingWorld: { fogDecayLevel: 0.4, explorerDots: [{ id: 'e1' }], revealedCount: 2 },
      worldDiscovery: { currentRegion: { completionPercent: 24 } },
      faction: { contestedCount: 1, mapOverlays: [{ contested: true }] },
      legendaryHunt: { hasActiveBoss: true },
      marketplaceVenueCount: 3,
      earthOverlayVisible: true,
    });

    expect(snapshot.animations[WORLD_ANIMATION_IDS.DISCOVERY_SPREAD]).toBe(true);
    expect(snapshot.animations[WORLD_ANIMATION_IDS.GUILD_PULSE]).toBe(true);
    expect(snapshot.animations[WORLD_ANIMATION_IDS.MARKET_SHIMMER]).toBe(true);
    expect(snapshot.animations[WORLD_ANIMATION_IDS.TREASURE_GLOW]).toBe(true);
    expect(snapshot.className).toContain('world-anim-guild-pulse-on');
    expect(snapshot.activeCount).toBeGreaterThan(4);
  });

  it('disables animations when reduced motion is requested', () => {
    const snapshot = getLivingWorldAnimationsSnapshot({
      layerSnapshot: { layers: baseLayers },
      livingWorld: { explorerDots: [{ id: 'e1' }] },
      faction: { contestedCount: 2 },
      legendaryHunt: { hasActiveBoss: true },
      marketplaceVenueCount: 2,
      reducedMotion: true,
    });

    expect(snapshot.activeCount).toBe(0);
    expect(buildWorldAnimationClassName(snapshot.animations)).toBe('');
  });

  it('only shimmers markets when venues are visible on the map layer', () => {
    const snapshot = getLivingWorldAnimationsSnapshot({
      layerSnapshot: { layers: { ...baseLayers, marketplace: { visible: true, opacity: 1 } } },
      marketplaceVenueCount: 0,
    });
    expect(snapshot.animations[WORLD_ANIMATION_IDS.MARKET_SHIMMER]).toBe(false);
  });
});
