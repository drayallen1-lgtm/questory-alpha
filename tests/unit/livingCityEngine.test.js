import { describe, expect, it } from 'vitest';
import {
  CITY_PERSONALITIES,
  buildCityPulseLines,
  computeCityExplorerCount,
  getLivingCitySnapshot,
  isLivingCityVisible,
  minutesUntilGuildWar,
  resolveCityPersonality,
} from '../../src/livingCityEngine.js';
import { buildTestState } from './fixtures.js';

describe('livingCityEngine', () => {
  it('resolves Parsons personality', () => {
    const personality = resolveCityPersonality('parsons-ks');
    expect(personality.name).toBe('Parsons');
    expect(CITY_PERSONALITIES['parsons-ks'].landmarks).toContain('Union Depot');
  });

  it('shows city view at street zoom, hides at globe zoom', () => {
    expect(isLivingCityVisible(12, { streetLevel: true })).toBe(true);
    expect(isLivingCityVisible(2, { globalLevel: true, layers: { earth: { opacity: 0.9 } } })).toBe(
      false
    );
  });

  it('builds Parsons-style pulse lines from engine context', () => {
    const personality = resolveCityPersonality('parsons-ks');
    const pulses = buildCityPulseLines({
      personality,
      livingWorld: { presence: { explorersNearby: 12 }, nightMode: true },
      marketplace: { listings: [{ id: 'l1' }], venues: [{ id: 'v1' }] },
      faction: {
        wars: [{ territoryId: 'downtown', name: 'Downtown', leader: 'Ravens', challenger: 'Embers', gap: 4 }],
      },
      worldDiscovery: { currentRegion: { todayDelta: 0.03 } },
      adventures: [{ adventureTemplate: 'horror', city: 'Parsons', sponsor: 'Parsons Heritage Trail' }],
      recommendations: [{ id: 'r1', type: 'discovery', territoryId: 'union-depot', title: 'Discovery' }],
      state: buildTestState(),
      now: Date.now(),
    });

    const texts = pulses.map((p) => p.text);
    expect(texts.some((t) => t.includes('explorers nearby'))).toBe(true);
    expect(texts.some((t) => t.includes('Ghost activity'))).toBe(true);
    expect(texts.some((t) => t.includes('merchants active'))).toBe(true);
    expect(texts.some((t) => t.includes('AI Director recommends'))).toBe(true);
    expect(texts.some((t) => t.includes('Guild War begins'))).toBe(true);
    expect(texts.some((t) => t.includes('Earth progress'))).toBe(true);
    expect(texts.some((t) => t.includes('promotion nearby'))).toBe(true);
  });

  it('snapshot is visible for Parsons at city zoom', () => {
    const state = buildTestState();
    const snapshot = getLivingCitySnapshot({
      state,
      adventures: state.adventures,
      zoom: 12,
      layerSnapshot: { streetLevel: true, zoom: 12 },
      now: Date.now(),
    });

    expect(snapshot.visible).toBe(true);
    expect(snapshot.cityName).toBeTruthy();
    expect(snapshot.pulses.length).toBeGreaterThan(3);
    expect(computeCityExplorerCount(resolveCityPersonality('parsons-ks'), { presence: { explorersNearby: 10 } }))
      .toBeGreaterThan(140);
  });

  it('guild war countdown stays in a reasonable window', () => {
    const mins = minutesUntilGuildWar('downtown', Date.now());
    expect(mins).toBeGreaterThanOrEqual(5);
    expect(mins).toBeLessThanOrEqual(42);
  });
});
