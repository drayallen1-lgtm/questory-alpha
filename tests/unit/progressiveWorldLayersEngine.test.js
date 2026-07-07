import { describe, expect, it } from 'vitest';
import {
  WORLD_LAYER_IDS,
  streetLayerOpacity,
  regionalLayerOpacity,
  earthLayerOpacity,
  getProgressiveLayerSnapshot,
} from '../../src/progressiveWorldLayersEngine.js';

describe('progressiveWorldLayersEngine', () => {
  it('street zoom shows cities and discovery, hides earth', () => {
    const snap = getProgressiveLayerSnapshot({ zoom: 12 });
    expect(snap.layers.cities.visible).toBe(true);
    expect(snap.layers.discovery.visible).toBe(true);
    expect(snap.layers.earth.opacity).toBeLessThan(0.2);
  });

  it('global zoom reveals earth and guild layers', () => {
    const snap = getProgressiveLayerSnapshot({
      zoom: 2,
      earthOverlayVisible: true,
      fullEarth: true,
    });
    expect(snap.layers.earth.visible).toBe(true);
    expect(snap.layers.earth.opacity).toBeGreaterThan(0.9);
    expect(snap.layers.cities.visible).toBe(false);
  });

  it('regional zoom favors guild over street marketplace', () => {
    const snap = getProgressiveLayerSnapshot({ zoom: 7 });
    expect(snap.layers.guild.opacity).toBeGreaterThan(snap.layers.marketplace.opacity);
    expect(snap.regionalLevel).toBe(true);
  });

  it('street layer opacity peaks when zoomed in', () => {
    const close = streetLayerOpacity(12, { minZoom: 5, enter: 9, full: 11 });
    const far = streetLayerOpacity(5, { minZoom: 5, enter: 9, full: 11 });
    expect(close).toBe(1);
    expect(far).toBe(0);
  });

  it('regional layer opacity peaks at mid zoom', () => {
    const peak = regionalLayerOpacity(6.5, { minZoom: 2.5, peak: 6.5, maxZoom: 11 });
    const street = regionalLayerOpacity(12, { minZoom: 2.5, peak: 6.5, maxZoom: 11 });
    expect(peak).toBe(1);
    expect(street).toBe(0);
  });

  it('earth opacity increases as zoom decreases', () => {
    const close = earthLayerOpacity(11);
    const far = earthLayerOpacity(2, { earthOverlayVisible: true, fullEarth: true });
    expect(far).toBeGreaterThan(close);
  });

  it('exposes hud card visibility flags', () => {
    const snap = getProgressiveLayerSnapshot({ zoom: 11 });
    expect(typeof snap.hudCards.explorer).toBe('boolean');
    expect(typeof snap.hudCards.earth).toBe('boolean');
    expect(snap.dominantLayer).toBeTruthy();
    expect(snap.className).toContain(`world-layer-${WORLD_LAYER_IDS.MAP}-on`);
  });
});
