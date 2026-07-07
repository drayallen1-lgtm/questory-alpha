/**
 * Questory V2 — Living Earth Experience
 * Earth as more than a percentage: city pulses, guild control, global discoveries.
 */
import { latLngToGlobePosition } from './livingEarthEngine';
import { getCityDiscoveryRings } from './worldDiscoveryEngine';
import {
  buildEarthFactionMarkers,
  SEED_FACTIONS,
} from './factionEngine';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { safeGetTime } from './dateUtils';

export const GLOBAL_CITY_PULSES = [
  { id: 'paris', label: 'Paris', latitude: 48.8566, longitude: 2.3522, demoPct: 98, tier: 'legendary' },
  { id: 'tokyo', label: 'Tokyo', latitude: 35.6762, longitude: 139.6503, demoPct: 96, tier: 'diamond' },
  { id: 'london', label: 'London', latitude: 51.5074, longitude: -0.1278, demoPct: 89, tier: 'diamond' },
  { id: 'parsons-ks', label: 'Parsons', latitude: 37.3392, longitude: -95.261, tier: 'gold' },
  { id: 'sydney', label: 'Sydney', latitude: -33.8688, longitude: 151.2093, demoPct: 81, tier: 'gold' },
  { id: 'sao-paulo', label: 'São Paulo', latitude: -23.5505, longitude: -46.6333, demoPct: 74, tier: 'silver' },
  { id: 'cairo', label: 'Cairo', latitude: 30.0444, longitude: 31.2357, demoPct: 67, tier: 'silver' },
];

const FACTION_GLOBE_ANCHORS = {
  'parsons-explorers': { latitude: 37.34, longitude: -95.26 },
  'ghost-hunters-kansas': { latitude: 38.5, longitude: -96.8 },
  'night-shift': { latitude: 37.33, longitude: -95.25 },
  'heritage-keepers': { latitude: 39.1, longitude: -94.6 },
  'treasure-syndicate': { latitude: 36.8, longitude: -95.9 },
  'market-wardens': { latitude: 37.35, longitude: -95.27 },
  'black-lantern-watch': { latitude: 37.33, longitude: -95.27 },
};

function resolvePulseIntensity(completionPercent = 0, tier = null) {
  if (tier === 'legendary' || completionPercent >= 90) return 'legendary';
  if (completionPercent >= 70) return 'strong';
  if (completionPercent >= 35) return 'steady';
  return 'emerging';
}

export function buildEarthCityPulses(options = {}) {
  const {
    worldDiscovery = {},
    adventures = [],
    state = null,
    now = Date.now(),
  } = options;

  const context = { state, adventures, now };
  const discoveredCities = getCityDiscoveryRings(adventures, context);
  const discoveredById = Object.fromEntries(discoveredCities.map((city) => [city.id, city]));

  return GLOBAL_CITY_PULSES.map((seed) => {
    const linked = discoveredById[seed.id];
    const completionPercent = linked?.completionPercent ?? seed.demoPct ?? 24;
    const tier = linked?.tier || seed.tier || 'bronze';
    const intensity = resolvePulseIntensity(completionPercent, tier);
    const isHome =
      worldDiscovery?.currentRegion?.regionId === seed.id ||
      seed.id === 'parsons-ks';
    return {
      ...seed,
      completionPercent,
      tier,
      intensity,
      isHome,
      pulse: completionPercent > 0,
      explorers: Math.floor(80 + completionPercent * 12 + (isHome ? 40 : 0)),
      position: latLngToGlobePosition(seed.latitude, seed.longitude),
      className: `living-earth-city-pulse--${intensity}${isHome ? ' living-earth-city-pulse--home' : ''}`,
    };
  });
}

export function buildGuildControlLayers(options = {}) {
  const { state = null, faction = {}, now = Date.now() } = options;

  const influenceMarkers = (faction.factionMarkers || buildEarthFactionMarkers(state, now))
    .map((marker) => {
      const anchor =
        FACTION_GLOBE_ANCHORS[marker.factionId] ||
        FACTION_GLOBE_ANCHORS['parsons-explorers'];
      const factionMeta = SEED_FACTIONS.find((f) => f.factionId === marker.factionId);
      return {
        ...marker,
        emblem: marker.emblem || factionMeta?.emblem || '🛡️',
        color: marker.color || factionMeta?.color || '#94a3b8',
        latitude: anchor.latitude,
        longitude: anchor.longitude,
        position: latLngToGlobePosition(anchor.latitude, anchor.longitude),
        contested: (faction.contestedCount || 0) > 0 && marker.influencePct >= 20,
      };
    })
    .filter((marker) => marker.influencePct > 0)
    .slice(0, 6);

  const territoryZones = (faction.territories || [])
    .slice(0, 5)
    .map((view) => ({
      id: view.territoryId,
      label: view.name,
      ownerName: view.ownerName,
      ownerEmblem: view.ownerEmblem,
      ownerColor: view.ownerColor,
      contested: view.contested,
      controlPct: view.ranked?.[0]?.pct ?? 50,
      latitude: view.latitude,
      longitude: view.longitude,
      position: latLngToGlobePosition(view.latitude, view.longitude),
    }));

  const leadingFaction = influenceMarkers[0] || null;
  const contestedCount = faction.contestedCount || territoryZones.filter((z) => z.contested).length;

  return {
    influenceMarkers,
    territoryZones,
    leadingFaction,
    contestedCount,
    headline: leadingFaction
      ? `${leadingFaction.name} shapes ${leadingFaction.influencePct}% of known Earth`
      : 'Guilds are contesting the living world',
  };
}

export function buildAnimatedGlobalDiscoveries(options = {}) {
  const {
    discoveryStream = [],
    timelineEntries = [],
    now = Date.now(),
  } = options;

  const minute = Math.floor(safeGetTime(now) / 60000);

  const streamItems = discoveryStream.map((item, index) => ({
    id: item.id || `stream-${index}`,
    label: item.label || item.text,
    text: item.text || item.label,
    kind: item.kind || 'discovery',
    impact: /boss|legendary/i.test(item.text || '') ? 'legendary' : 'normal',
    animationDelayMs: (index * 420 + (minute % 7) * 90) % 2800,
    position: item.position,
    opacity: item.opacity ?? 0.85,
  }));

  const timelineItems = timelineEntries.slice(0, 6).map((entry, index) => ({
    id: entry.id || `timeline-${index}`,
    label: entry.label || entry.text,
    text: entry.text || entry.label,
    kind: entry.kind || 'event',
    impact: entry.kind === 'faction' || entry.kind === 'boss' ? 'war' : 'normal',
    animationDelayMs: ((index + streamItems.length) * 360 + (minute % 5) * 120) % 2800,
    icon: entry.icon,
  }));

  return [...streamItems, ...timelineItems].slice(0, 14);
}

export function buildPlanetStory(options = {}) {
  const {
    worldDiscovery = {},
    faction = {},
    cityPulses = [],
    guildControl = {},
  } = options;

  const pct =
    worldDiscovery?.worldRegion?.animatedDisplayPercent ??
    worldDiscovery?.worldRegion?.completionPercent ??
    18.4;
  const delta =
    worldDiscovery?.worldRegion?.todayDelta ??
    worldDiscovery?.animatedDelta ??
    0.03;
  const homeCity = cityPulses.find((city) => city.isHome) || cityPulses[0];
  const playerGuild = faction.memberFaction?.name || faction.guildName;

  let headline = "You're changing the planet.";
  if (pct < 20) headline = 'Earth is still mostly uncharted.';
  else if (pct >= 50) headline = 'Half the planet glows with explorer light.';

  const sublineParts = [
    `+${Number(delta).toFixed(2)}% discovered today`,
    homeCity ? `${homeCity.label} pulses at ${Math.round(homeCity.completionPercent)}%` : null,
    guildControl.leadingFaction
      ? `${guildControl.leadingFaction.emblem} ${guildControl.leadingFaction.name} leads`
      : null,
  ].filter(Boolean);

  return {
    headline,
    subline: sublineParts.join(' · '),
    playerImpact: playerGuild
      ? `${playerGuild} is leaving footprints on the living Earth`
      : 'Every discovery you make shifts the global map',
    completionPercent: pct,
    delta,
  };
}

export function buildEarthFloatingCard(options = {}) {
  const {
    planetStory = {},
    cityPulses = [],
    guildControl = {},
    globalDiscoveries = [],
    earthPct = 0,
    worldDiscovery = {},
  } = options;

  const cityLabel = worldDiscovery.currentRegion?.label || 'Your city';
  const cityPct = worldDiscovery.currentRegion?.completionPercent;

  return {
    metric: `${Number(earthPct).toFixed(1)}%`,
    metricLabel: planetStory.headline || 'living planet',
    items: [
      {
        id: 'planet-story',
        text: planetStory.subline || planetStory.playerImpact || 'Global discoveries are spreading',
      },
      {
        id: 'home-city',
        text: `${cityLabel}${cityPct != null ? ` · ${Math.round(cityPct)}% discovered` : ''}`,
      },
      ...cityPulses
        .filter((city) => city.pulse)
        .slice(0, 2)
        .map((city) => ({
          id: `city-${city.id}`,
          text: `${city.label} pulses · ${Math.round(city.completionPercent)}% · ${city.explorers} explorers`,
        })),
      ...(guildControl.contestedCount
        ? [
            {
              id: 'guild-control',
              text: `⚔ ${guildControl.contestedCount} territories contested · ${guildControl.headline}`,
            },
          ]
        : guildControl.leadingFaction
          ? [
              {
                id: 'guild-control',
                text: `${guildControl.leadingFaction.emblem} ${guildControl.headline}`,
              },
            ]
          : []),
      ...globalDiscoveries.slice(0, 2).map((item) => ({
        id: item.id,
        text: item.text || item.label,
      })),
    ],
  };
}

export function getLivingEarthExperienceSnapshot(options = {}) {
  const {
    state = null,
    adventures = [],
    worldDiscovery = {},
    faction = {},
    livingEarth = {},
    now = Date.now(),
  } = options;

  const earthPct =
    worldDiscovery?.worldRegion?.animatedDisplayPercent ??
    worldDiscovery?.worldRegion?.completionPercent ??
    livingEarth?.worldHud?.completionPercent ??
    0;

  const cityPulses = buildEarthCityPulses({ worldDiscovery, adventures, state, now });
  const guildControl = buildGuildControlLayers({ state, faction, now });
  const globalDiscoveries = buildAnimatedGlobalDiscoveries({
    discoveryStream: livingEarth.discoveryStream || [],
    timelineEntries: livingEarth.timelineEntries || [],
    now,
  });
  const planetStory = buildPlanetStory({
    worldDiscovery,
    faction,
    cityPulses,
    guildControl,
  });
  const earthCard = buildEarthFloatingCard({
    planetStory,
    cityPulses,
    guildControl,
    globalDiscoveries,
    earthPct,
    worldDiscovery,
  });

  return wrapEngineSnapshot({
    cityPulses,
    guildControl,
    globalDiscoveries,
    planetStory,
    earthCard,
    className: guildControl.contestedCount
      ? 'living-earth-experience--contested'
      : 'living-earth-experience--alive',
  });
}
