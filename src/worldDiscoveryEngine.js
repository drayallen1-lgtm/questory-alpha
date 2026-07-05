/**
 * Phase 6 — The Discovered World
 * Authoritative exploration progress across geographic levels.
 * completionPercent = revealedAreas / totalAreas (not adventure completions).
 */
import { getAdventureMapCenter } from './mapUtils';
import { normalizeMapExploration } from './mapDiscovery';
import { usesArFinder } from './expansion';
import { CREATOR_WORLDS } from './seasonEngine';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const DISCOVERY_LEVELS = {
  NEIGHBORHOOD: 'neighborhood',
  CITY: 'city',
  COUNTY: 'county',
  STATE: 'state',
  COUNTRY: 'country',
  CONTINENT: 'continent',
  WORLD: 'world',
};

export const FOG_LAYERS = {
  UNKNOWN: 'unknown',
  RUMORED: 'rumored',
  EXPLORED: 'explored',
  MASTERED: 'mastered',
};

export const COMPLETION_TIERS = {
  GRAY: 'gray',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  DIAMOND: 'diamond',
  LEGENDARY: 'legendary',
};

export const CITY_MILESTONES = [25, 50, 75, 90, 100];

export const GLOBAL_GOALS = [
  { id: 'fog-100k', label: 'Reveal 100,000 fog tiles', target: 100000, current: 68420, icon: '🌫️' },
  { id: 'treasure-1m', label: 'Discover 1 million treasures', target: 1000000, current: 2411221, icon: '💎' },
  { id: 'antarctica', label: 'Complete Antarctica', target: 100, current: 12, icon: '🧊' },
  { id: 'world-25', label: 'Reach 25% World Discovery', target: 25, current: 18.42, icon: '🌍', isPercent: true },
];

export const DISCOVERY_BADGES = [
  { id: 'first-discoverer', label: 'First Discoverer', icon: '🥇' },
  { id: 'fog-breaker', label: 'Fog Breaker', icon: '🌫️' },
  { id: 'cartographer', label: 'Cartographer', icon: '🗺️' },
  { id: 'pathfinder', label: 'Pathfinder', icon: '🧭' },
  { id: 'legend-hunter', label: 'Legend Hunter', icon: '✨' },
  { id: 'world-revealer', label: 'World Revealer', icon: '🌍' },
];

const ZOOM_LEVEL_MAP = [
  { minZoom: 14, level: DISCOVERY_LEVELS.NEIGHBORHOOD },
  { minZoom: 12, level: DISCOVERY_LEVELS.CITY },
  { minZoom: 9, level: DISCOVERY_LEVELS.COUNTY },
  { minZoom: 7, level: DISCOVERY_LEVELS.STATE },
  { minZoom: 4, level: DISCOVERY_LEVELS.COUNTRY },
  { minZoom: 2, level: DISCOVERY_LEVELS.CONTINENT },
  { minZoom: 0, level: DISCOVERY_LEVELS.WORLD },
];

/** Region catalog — totals include active discoverable content only; unknown pools expand the world later */
export const DISCOVERY_REGIONS = {
  'parsons-neighborhood': {
    id: 'parsons-neighborhood',
    level: DISCOVERY_LEVELS.NEIGHBORHOOD,
    label: 'Downtown Parsons',
    parentId: 'parsons-ks',
    latitude: 37.3392,
    longitude: -95.261,
    totalAreas: 48,
    unknownPool: 8,
    secrets: 6,
    legendaries: 2,
  },
  'parsons-ks': {
    id: 'parsons-ks',
    level: DISCOVERY_LEVELS.CITY,
    label: 'Parsons',
    parentId: 'labette-county-ks',
    latitude: 37.3392,
    longitude: -95.261,
    totalAreas: 336,
    unknownPool: 42,
    secrets: 46,
    legendaries: 9,
    rank: 3,
  },
  'labette-county-ks': {
    id: 'labette-county-ks',
    level: DISCOVERY_LEVELS.COUNTY,
    label: 'Labette County',
    parentId: 'kansas',
    latitude: 37.25,
    longitude: -95.18,
    totalAreas: 890,
    unknownPool: 120,
    secrets: 88,
    legendaries: 14,
  },
  kansas: {
    id: 'kansas',
    level: DISCOVERY_LEVELS.STATE,
    label: 'Kansas',
    parentId: 'usa',
    latitude: 38.5,
    longitude: -98.5,
    totalAreas: 4200,
    unknownPool: 680,
    secrets: 520,
    legendaries: 48,
    citiesExplored: 44,
    citiesTotal: 196,
    rank: 18,
  },
  usa: {
    id: 'usa',
    level: DISCOVERY_LEVELS.COUNTRY,
    label: 'United States',
    parentId: 'north-america',
    latitude: 39.8,
    longitude: -98.5,
    totalAreas: 2840000,
    unknownPool: 420000,
    secrets: 180000,
    legendaries: 12000,
    rank: 4,
  },
  'north-america': {
    id: 'north-america',
    level: DISCOVERY_LEVELS.CONTINENT,
    label: 'North America',
    parentId: 'world',
    latitude: 45,
    longitude: -100,
    totalAreas: 9800000,
    unknownPool: 1200000,
    secrets: 640000,
    legendaries: 42000,
    rank: 2,
  },
  world: {
    id: 'world',
    level: DISCOVERY_LEVELS.WORLD,
    label: 'Earth',
    parentId: null,
    latitude: 20,
    longitude: 0,
    totalAreas: 14800000,
    unknownPool: 2100000,
    secrets: 980000,
    legendaries: 68000,
    explorers: 128441,
    countries: 189,
    rank: 1,
  },
};

const TOP_CITIES = [
  { id: 'paris', label: 'Paris', pct: 98, tier: COMPLETION_TIERS.LEGENDARY },
  { id: 'tokyo', label: 'Tokyo', pct: 96, tier: COMPLETION_TIERS.DIAMOND },
  { id: 'parsons-ks', label: 'Parsons', pct: 72, tier: COMPLETION_TIERS.GOLD },
  { id: 'london', label: 'London', pct: 89, tier: COMPLETION_TIERS.DIAMOND },
  { id: 'sydney', label: 'Sydney', pct: 81, tier: COMPLETION_TIERS.GOLD },
];

const SEED_FIRST_DISCOVERIES = [
  {
    id: 'first-downtown-parsons',
    areaLabel: 'Downtown Parsons',
    explorerName: 'Desiray Allen',
    discoveredAt: '2026-05-14',
    regionId: 'parsons-neighborhood',
  },
];

const HISTORIC_MILESTONES = [
  { id: 'hist-parsons-50', text: 'Parsons reached 50%.', kind: 'milestone', minutesAgo: 60 * 24 * 3 },
  { id: 'hist-ks-mo', text: 'Kansas surpassed Missouri.', kind: 'milestone', minutesAgo: 60 * 24 * 8 },
  { id: 'hist-na-5', text: 'North America crossed 5%.', kind: 'milestone', minutesAgo: 60 * 24 * 14 },
  { id: 'hist-world-18', text: 'World reached 18%.', kind: 'milestone', minutesAgo: 60 * 24 * 21 },
];

/** Demo targets aligned with product vision — blended with live reveal data */
const DEMO_COMPLETION_TARGETS = {
  'parsons-neighborhood': 68,
  'parsons-ks': 72,
  'labette-county-ks': 58,
  kansas: 31,
  usa: 12,
  'north-america': 5,
  world: 18.42,
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededCount(seed, min, max) {
  return min + (hashSeed(seed) % (max - min + 1));
}

export function zoomToDiscoveryLevel(zoom = 11) {
  const z = Number(zoom) || 11;
  for (const entry of ZOOM_LEVEL_MAP) {
    if (z >= entry.minZoom) return entry.level;
  }
  return DISCOVERY_LEVELS.WORLD;
}

export function levelToRegionId(level, fallbackCityId = 'parsons-ks') {
  switch (level) {
    case DISCOVERY_LEVELS.NEIGHBORHOOD:
      return 'parsons-neighborhood';
    case DISCOVERY_LEVELS.CITY:
      return fallbackCityId;
    case DISCOVERY_LEVELS.COUNTY:
      return 'labette-county-ks';
    case DISCOVERY_LEVELS.STATE:
      return 'kansas';
    case DISCOVERY_LEVELS.COUNTRY:
      return 'usa';
    case DISCOVERY_LEVELS.CONTINENT:
      return 'north-america';
    default:
      return 'world';
  }
}

export function getCompletionTier(pct) {
  if (pct >= 95) return COMPLETION_TIERS.LEGENDARY;
  if (pct >= 85) return COMPLETION_TIERS.DIAMOND;
  if (pct >= 70) return COMPLETION_TIERS.GOLD;
  if (pct >= 50) return COMPLETION_TIERS.SILVER;
  if (pct >= 25) return COMPLETION_TIERS.BRONZE;
  return COMPLETION_TIERS.GRAY;
}

export function getFogEvolutionLayer(pct, revealedLocally = false) {
  if (pct >= 90) return FOG_LAYERS.MASTERED;
  if (pct >= 40 || revealedLocally) return FOG_LAYERS.EXPLORED;
  if (pct >= 10) return FOG_LAYERS.RUMORED;
  return FOG_LAYERS.UNKNOWN;
}

export function formatProgressBar(pct, width = 10) {
  const clamped = Math.min(100, Math.max(0, pct));
  const filled = Math.round((clamped / 100) * width);
  return `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, width - filled))}`;
}

export function formatDiscoveryPercent(pct, decimals = 0) {
  if (decimals > 0) return pct.toFixed(decimals);
  return `${Math.round(pct)}`;
}

function countLocalRevealedAreas(state, adventures = []) {
  const exploration = normalizeMapExploration(state?.mapExploration);
  const userReveals = exploration.revealed?.length ?? 0;

  let objectReveals = 0;
  for (const adventure of adventures) {
    if (!getAdventureMapCenter(adventure)) continue;
    if (adventure.status !== 'published') continue;
    objectReveals += 1;
    if (usesArFinder(adventure)) objectReveals += 1;
    if (adventure.isLegendaryHunt) objectReveals += 2;
    if (adventure.isSponsoredDrop) objectReveals += 1;
  }

  return userReveals * 3 + Math.min(objectReveals, 24);
}

function computeRegionProgress(region, context = {}) {
  const { state = null, adventures = [], now = Date.now(), includeUnknown = false } = context;
  const dateKey = new Date(now).toDateString();
  const seed = hashSeed(`${region.id}-${dateKey}`);

  const localRevealed = countLocalRevealedAreas(state, adventures);
  const communityBoost = seededCount(`${region.id}-community`, 1800, 2600);
  const communityToday = seededCount(`${region.id}-today-${dateKey}`, 90, 160);

  const scale =
    region.level === DISCOVERY_LEVELS.WORLD
      ? 1
      : region.level === DISCOVERY_LEVELS.CONTINENT
        ? 0.15
        : region.level === DISCOVERY_LEVELS.COUNTRY
          ? 0.04
          : region.level === DISCOVERY_LEVELS.STATE
            ? 0.12
            : region.level === DISCOVERY_LEVELS.COUNTY
              ? 0.35
              : region.level === DISCOVERY_LEVELS.NEIGHBORHOOD
                ? 0.55
                : 0.72;

  const baseRevealed = Math.round(communityBoost * scale) + localRevealed;
  const unknownActive = includeUnknown ? region.unknownPool : 0;
  const totalAreas = region.totalAreas + unknownActive;
  const revealedAreas = Math.min(totalAreas - 1, baseRevealed);
  const hiddenAreas = region.unknownPool;
  const completionPercent = totalAreas > 0 ? (revealedAreas / totalAreas) * 100 : 0;

  const discoverableObjects = Math.round(totalAreas * 0.42);
  const completedObjects = Math.round(revealedAreas * 0.38);
  const secretObjects = region.secrets ?? Math.round(totalAreas * 0.12);
  const legendaryObjects = region.legendaries ?? Math.round(totalAreas * 0.02);
  const secretsRemaining = Math.max(0, secretObjects - Math.round(revealedAreas * 0.08));
  const legendariesFound = Math.min(legendaryObjects, Math.round(revealedAreas * 0.015));

  const todayDelta = seededCount(`${region.id}-delta-${dateKey}`, 1, 3) / 10;

  const target = DEMO_COMPLETION_TARGETS[region.id];
  const blendedPercent =
    target != null
      ? Math.min(99.9, target + localRevealed * 0.15 + todayDelta)
      : completionPercent;

  return {
    regionId: region.id,
    level: region.level,
    label: region.label,
    totalAreas,
    revealedAreas: target != null ? Math.round((blendedPercent / 100) * totalAreas) : revealedAreas,
    hiddenAreas,
    unknownPool: region.unknownPool,
    discoverableObjects,
    completedObjects,
    secretObjects,
    legendaryObjects,
    secretsRemaining,
    legendariesFound,
    completionPercent: blendedPercent,
    completionTier: getCompletionTier(completionPercent),
    fogLayer: getFogEvolutionLayer(completionPercent, localRevealed > 0),
    discoveries: Math.round(
      (target != null ? blendedPercent : completionPercent) *
        (region.level === DISCOVERY_LEVELS.WORLD ? 130000 : region.level === DISCOVERY_LEVELS.CITY ? 33.5 : 7.2)
    ),
    liveExplorerCount: communityToday,
    todayDelta,
    animatedDisplayPercent: completionPercent,
  };
}

export function getAnimatedWorldPercent(basePct, now = Date.now()) {
  const slot = Math.floor(now / 180000);
  const micro = (hashSeed(`world-anim-${slot}`) % 30) / 1000;
  return Math.min(99.999, basePct + micro);
}

export function getAdjacentRegionIds(regionId) {
  const region = DISCOVERY_REGIONS[regionId];
  if (!region) return [];
  const ids = [];
  if (region.parentId) ids.push(region.parentId);
  Object.values(DISCOVERY_REGIONS).forEach((r) => {
    if (r.parentId === regionId) ids.push(r.id);
  });
  return ids;
}

export function buildDiscoveryTimelineEntries(snapshot) {
  const entries = [...HISTORIC_MILESTONES];

  if (snapshot.currentRegion?.completionPercent >= 50) {
    entries.unshift({
      id: `live-${snapshot.currentRegion.regionId}-50`,
      text: `${snapshot.currentRegion.label} is past 50% discovered.`,
      kind: 'milestone',
      minutesAgo: 45,
    });
  }

  snapshot.milestones?.forEach((m) => {
    entries.unshift({
      id: `milestone-${m.regionId}-${m.threshold}`,
      text: `${m.label} reached ${m.threshold}%!`,
      kind: 'ceremony',
      minutesAgo: 2,
    });
  });

  if (snapshot.animatedDelta > 0) {
    entries.unshift({
      id: 'world-delta-live',
      text: `World discovery ticked +${snapshot.animatedDelta.toFixed(3)}%`,
      kind: 'world',
      minutesAgo: 1,
    });
  }

  return entries.slice(0, 12);
}

export function detectCityMilestones(regionProgress, previousMilestones = []) {
  const crossed = [];
  const prev = new Set(previousMilestones.map((m) => `${m.regionId}-${m.threshold}`));
  for (const threshold of CITY_MILESTONES) {
    if (regionProgress.completionPercent >= threshold) {
      const key = `${regionProgress.regionId}-${threshold}`;
      if (!prev.has(key)) {
        crossed.push({
          regionId: regionProgress.regionId,
          label: regionProgress.label,
          threshold,
          tier: getCompletionTier(threshold),
        });
      }
    }
  }
  return crossed;
}

export function getDiscoveryLeaderboards() {
  return {
    cities: TOP_CITIES,
    states: [
      { label: 'California', pct: 34 },
      { label: 'Kansas', pct: 31 },
      { label: 'Missouri', pct: 28 },
    ],
    countries: [
      { label: 'United States', pct: 12 },
      { label: 'Canada', pct: 9 },
      { label: 'Mexico', pct: 7 },
    ],
    guilds: [
      { label: 'Parsons Explorers', pct: 87 },
      { label: 'Ghost Hunters of Kansas', pct: 72 },
    ],
    creatorWorlds: CREATOR_WORLDS.map((w) => ({
      label: w.worldTitle,
      pct: seededCount(w.creatorWorldId, 40, 88),
    })),
    explorers: [
      { label: 'Sarah J.', discoveries: 2840 },
      { label: 'Desiray Allen', discoveries: 2410 },
      { label: 'Marcus T.', discoveries: 1920 },
    ],
  };
}

export function getFirstDiscoveries(state = null) {
  const stored = state?.mapExploration?.firstDiscoveries || [];
  return [...SEED_FIRST_DISCOVERIES, ...stored].slice(0, 8);
}

export function recordFirstDiscovery(state, payload) {
  const exploration = normalizeMapExploration(state?.mapExploration);
  const firstDiscoveries = Array.isArray(exploration.firstDiscoveries)
    ? exploration.firstDiscoveries
    : [];
  const exists = firstDiscoveries.some((d) => d.areaLabel === payload.areaLabel);
  if (exists) return state;
  return {
    ...state,
    mapExploration: {
      ...exploration,
      firstDiscoveries: [
        ...firstDiscoveries,
        {
          id: payload.id || `first-${Date.now()}`,
          areaLabel: payload.areaLabel,
          explorerName: payload.explorerName || state?.playerName || 'Explorer',
          discoveredAt: payload.discoveredAt || new Date().toISOString(),
          regionId: payload.regionId || 'parsons-neighborhood',
        },
      ].slice(0, 20),
    },
  };
}

export function getCityDiscoveryRings(adventures = [], context = {}) {
  return Object.values(DISCOVERY_REGIONS)
    .filter((r) => r.level === DISCOVERY_LEVELS.CITY && r.latitude != null)
    .map((region) => {
      const progress = computeRegionProgress(region, context);
      return {
        id: region.id,
        label: region.label,
        latitude: region.latitude,
        longitude: region.longitude,
        completionPercent: progress.completionPercent,
        tier: progress.completionTier,
        fogLayer: progress.fogLayer,
      };
    });
}

export function getWorldDiscoverySnapshot(options = {}) {
  const {
    viewport = null,
    zoom = 11,
    state = null,
    adventures = [],
    fog = null,
    claims = null,
    creatorWorlds = null,
    seasons = null,
    bosses = null,
    now = Date.now(),
    previousMilestones = [],
    includeUnknown = false,
  } = options;

  const level = zoomToDiscoveryLevel(zoom);
  const regionId = levelToRegionId(level);
  const region = DISCOVERY_REGIONS[regionId] || DISCOVERY_REGIONS['parsons-ks'];
  const context = { state, adventures, now, includeUnknown };

  const currentRegion = computeRegionProgress(region, context);
  const parentRegion = region.parentId
    ? computeRegionProgress(DISCOVERY_REGIONS[region.parentId], context)
    : null;
  const worldRegion = computeRegionProgress(DISCOVERY_REGIONS.world, context);

  const worldBase = worldRegion.completionPercent;
  const animatedDisplayPercent =
    level === DISCOVERY_LEVELS.WORLD
      ? getAnimatedWorldPercent(worldBase, now)
      : currentRegion.completionPercent;

  const animatedDelta =
    level === DISCOVERY_LEVELS.WORLD
      ? animatedDisplayPercent - worldBase
      : currentRegion.todayDelta;

  const milestones = detectCityMilestones(currentRegion, previousMilestones);
  const leaderboards = getDiscoveryLeaderboards();
  const firstDiscoveries = getFirstDiscoveries(state);
  const cityRings = getCityDiscoveryRings(adventures, context);
  const adjacentRegions = getAdjacentRegionIds(regionId).map((id) =>
    computeRegionProgress(DISCOVERY_REGIONS[id], context)
  );

  const ceremony =
    milestones.length > 0
      ? {
          title: `${milestones[0].label} reached ${milestones[0].threshold}%!`,
          message: 'The community unlocked bonus XP and a special hunt.',
          icon: '🎉',
        }
      : null;

  const snapshot = {
    viewport,
    zoom,
    level,
    currentRegion: {
      ...currentRegion,
      animatedDisplayPercent,
      progressBar: formatProgressBar(currentRegion.completionPercent),
      rank: region.rank ?? null,
      citiesExplored: region.citiesExplored,
      citiesRemaining: region.citiesTotal
        ? region.citiesTotal - (region.citiesExplored || 0)
        : null,
      explorers: region.explorers ?? worldRegion.liveExplorerCount,
      countries: region.countries,
    },
    parentRegion,
    worldRegion: {
      ...worldRegion,
      animatedDisplayPercent: getAnimatedWorldPercent(worldBase, now),
      progressBar: formatProgressBar(worldBase, 10),
      explorers: DISCOVERY_REGIONS.world.explorers,
      countries: DISCOVERY_REGIONS.world.countries,
      discoveries: 2411221,
    },
    completionPercent: currentRegion.completionPercent,
    progressBar: formatProgressBar(currentRegion.completionPercent),
    remainingSecrets: currentRegion.secretsRemaining,
    liveExplorerCount: currentRegion.liveExplorerCount,
    cityRank: leaderboards.cities.find((c) => c.label === currentRegion.label)?.pct
      ? leaderboards.cities.findIndex((c) => c.label === currentRegion.label) + 1
      : region.rank,
    stateRank: DISCOVERY_REGIONS.kansas.rank,
    countryRank: DISCOVERY_REGIONS.usa.rank,
    worldRank: 1,
    animatedDelta,
    milestones,
    ceremony,
    globalGoals: GLOBAL_GOALS,
    leaderboards,
    firstDiscoveries,
    cityRings,
    adjacentRegions,
    badges: DISCOVERY_BADGES,
    unknownPool: region.unknownPool,
    fogEvolution: currentRegion.fogLayer,
  };

  snapshot.timelineEntries = buildDiscoveryTimelineEntries(snapshot);
  return wrapEngineSnapshot(snapshot);
}
