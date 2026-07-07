import { describe, expect, it } from 'vitest';
import {
  buildAnimatedGlobalDiscoveries,
  buildEarthCityPulses,
  buildGuildControlLayers,
  buildPlanetStory,
  getLivingEarthExperienceSnapshot,
} from '../../src/livingEarthExperienceEngine.js';
import { buildTestState } from './fixtures.js';
import { getFactionSnapshot } from '../../src/factionEngine.js';
import { getWorldDiscoverySnapshot } from '../../src/worldDiscoveryEngine.js';

describe('livingEarthExperienceEngine', () => {
  it('builds pulsing city markers with globe positions', () => {
    const state = buildTestState();
    const worldDiscovery = getWorldDiscoverySnapshot({ zoom: 12, state, adventures: state.adventures });
    const pulses = buildEarthCityPulses({
      worldDiscovery,
      adventures: state.adventures,
      state,
    });

    expect(pulses.length).toBeGreaterThanOrEqual(5);
    expect(pulses.find((city) => city.id === 'parsons-ks')?.pulse).toBe(true);
    expect(pulses[0].position.x).toBeGreaterThan(0);
    expect(pulses[0].position.y).toBeGreaterThan(0);
  });

  it('exposes guild control influence on the globe', () => {
    const state = buildTestState();
    const faction = getFactionSnapshot(state, state.adventures);
    const guildControl = buildGuildControlLayers({ state, faction });

    expect(guildControl.influenceMarkers.length).toBeGreaterThan(0);
    expect(guildControl.territoryZones.length).toBeGreaterThan(0);
    expect(guildControl.headline).toContain('%');
  });

  it('animates global discoveries with staggered delays', () => {
    const discoveries = buildAnimatedGlobalDiscoveries({
      discoveryStream: [{ id: 'a', label: 'Tokyo', text: '+12 discoveries' }],
      timelineEntries: [{ id: 'b', text: 'Guild war heating up', kind: 'faction' }],
      now: Date.now(),
    });

    expect(discoveries).toHaveLength(2);
    expect(discoveries[0].animationDelayMs).toBeGreaterThanOrEqual(0);
    expect(discoveries[1].kind).toBe('faction');
  });

  it('frames the planet story beyond a percentage', () => {
    const story = buildPlanetStory({
      worldDiscovery: {
        worldRegion: { completionPercent: 22.7, todayDelta: 0.04 },
        currentRegion: { label: 'Parsons', completionPercent: 72 },
      },
      cityPulses: [{ label: 'Parsons', completionPercent: 72, isHome: true }],
      guildControl: { leadingFaction: { name: 'PEG', emblem: '🧭', influencePct: 34 } },
      faction: { memberFaction: { name: 'Parsons Explorers Guild' } },
    });

    expect(story.headline).toBeTruthy();
    expect(story.subline).toContain('Parsons');
    expect(story.playerImpact).toContain('Parsons Explorers Guild');
  });

  it('returns a composed living earth experience snapshot', () => {
    const state = buildTestState();
    const worldDiscovery = getWorldDiscoverySnapshot({ zoom: 1, state, adventures: state.adventures });
    const faction = getFactionSnapshot(state, state.adventures);
    const snapshot = getLivingEarthExperienceSnapshot({
      state,
      adventures: state.adventures,
      worldDiscovery,
      faction,
      livingEarth: { discoveryStream: [{ id: 's1', text: 'Paris +8 discoveries' }] },
    });

    expect(snapshot.cityPulses.length).toBeGreaterThan(0);
    expect(snapshot.planetStory.headline).toBeTruthy();
    expect(snapshot.earthCard.items.length).toBeGreaterThan(2);
    expect(snapshot.className).toContain('living-earth-experience');
  });
});
