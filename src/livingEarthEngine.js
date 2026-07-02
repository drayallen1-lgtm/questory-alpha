/**
 * Questory 2.0 — Phase 11: Living Earth
 * Presentation layer — translates existing discovery/world data into global Earth visualization.
 * Does NOT duplicate worldDiscoveryEngine logic.
 */
import {
  DISCOVERY_LEVELS,
  DISCOVERY_REGIONS,
  FOG_LAYERS,
  GLOBAL_GOALS,
  getWorldDiscoverySnapshot,
  zoomToDiscoveryLevel,
} from './worldDiscoveryEngine';
import { getLivingWorldSnapshot } from './livingWorldEngine';
import { getSocialDiscoverySnapshot } from './socialWorldEngine';
import { getQuestoryIdentitySnapshot } from './questoryIdentityEngine';
import { getLegendaryHuntSnapshot } from './legendaryHuntEngine';
import { getCurrentSeason } from './seasonEngine';
import { CREATOR_WORLDS } from './seasonEngine';
import { safeGetTime } from './dateUtils';

export const LIVING_EARTH_LIMITS = {
  MAX_PULSES: 25,
  MAX_DISCOVERY_EVENTS: 20,
  MAX_BOSS_BEACONS: 8,
  CACHE_TTL_MS: 60000,
};

export const EARTH_MODE_MAX_ZOOM = 2;
export const EARTH_MODE_EXIT_ZOOM = 2.5;
export const FULL_EARTH_MAX_ZOOM = 1;

export const FOG_VISUAL_COLORS = {
  [FOG_LAYERS.UNKNOWN]: { fill: '#374151', label: 'Unknown' },
  [FOG_LAYERS.RUMORED]: { fill: '#3b82f6', label: 'Rumored' },
  [FOG_LAYERS.EXPLORED]: { fill: '#22c55e', label: 'Explored' },
  [FOG_LAYERS.MASTERED]: { fill: '#eab308', label: 'Mastered' },
  legendary: { fill: '#f8fafc', label: 'Legendary', shimmer: true },
};

export const DEFAULT_LIVING_EARTH = {
  ceremoniesSeen: [],
  lastStreamTick: null,
};

/** Globe presentation markers — positions only; discovery % from worldDiscovery when linked */
export const GLOBE_CONTINENTS = [
  { id: 'north-america', label: 'North America', latitude: 45, longitude: -100, regionId: 'north-america' },
  { id: 'south-america', label: 'South America', latitude: -15, longitude: -60, regionId: null, demoPct: 4.2 },
  { id: 'europe', label: 'Europe', latitude: 50, longitude: 10, regionId: null, demoPct: 11.8 },
  { id: 'africa', label: 'Africa', latitude: 5, longitude: 20, regionId: null, demoPct: 3.1 },
  { id: 'asia', label: 'Asia', latitude: 34, longitude: 100, regionId: null, demoPct: 14.6 },
  { id: 'oceania', label: 'Oceania', latitude: -25, longitude: 135, regionId: null, demoPct: 6.4 },
  { id: 'antarctica', label: 'Antarctica', latitude: -78, longitude: 0, regionId: null, demoPct: 0.8 },
];

export const GLOBE_COUNTRIES = [
  { id: 'usa', label: 'United States', latitude: 39.8, longitude: -98.5, regionId: 'usa' },
  { id: 'brazil', label: 'Brazil', latitude: -10, longitude: -55, regionId: null, demoPct: 5.1 },
  { id: 'japan', label: 'Japan', latitude: 36, longitude: 138, regionId: null, demoPct: 22.4 },
  { id: 'france', label: 'France', latitude: 46, longitude: 2, regionId: null, demoPct: 19.2 },
];

const DISCOVERY_STREAM_SEED = [
  { id: 'stream-tokyo', label: 'Tokyo', text: '+12 discoveries', latitude: 35.6, longitude: 139.7 },
  { id: 'stream-paris', label: 'Paris', text: 'World Boss defeated', latitude: 48.8, longitude: 2.3 },
  { id: 'stream-kansas', label: 'Kansas', text: 'Reached 32%', latitude: 38.5, longitude: -98.5 },
  { id: 'stream-brazil', label: 'Brazil', text: 'Creator World unlocked', latitude: -10, longitude: -55 },
  { id: 'stream-london', label: 'London', text: '+8 explorers joined', latitude: 51.5, longitude: -0.1 },
];

export function normalizeLivingEarth(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LIVING_EARTH };
  return {
    ceremoniesSeen: Array.isArray(raw.ceremoniesSeen) ? raw.ceremoniesSeen.slice(0, 20) : [],
    lastStreamTick: raw.lastStreamTick || null,
  };
}

export function isEarthMode(zoom = 11) {
  return (Number(zoom) || 11) <= EARTH_MODE_MAX_ZOOM;
}

export function isEarthOverlayVisible(zoom = 11) {
  return (Number(zoom) || 11) <= EARTH_MODE_EXIT_ZOOM;
}

export function isFullEarthView(zoom = 11) {
  return (Number(zoom) || 11) <= FULL_EARTH_MAX_ZOOM;
}

export function fogLayerToVisual(fogLayer, completionTier) {
  if (completionTier === 'legendary') return FOG_VISUAL_COLORS.legendary;
  return FOG_VISUAL_COLORS[fogLayer] || FOG_VISUAL_COLORS[FOG_LAYERS.UNKNOWN];
}

export function latLngToGlobePosition(latitude, longitude) {
  const lat = Math.max(-85, Math.min(85, latitude));
  const lng = longitude;
  const x = 50 + (lng / 180) * 46;
  const y = 50 - (lat / 90) * 42;
  return {
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(6, Math.min(94, y)),
  };
}

function buildContinentMarkers(worldDiscovery, context) {
  const adjacent = worldDiscovery?.adjacentRegions || [];
  const regionMap = Object.fromEntries(adjacent.map((r) => [r.regionId, r]));

  return GLOBE_CONTINENTS.map((c) => {
    const linked = c.regionId ? DISCOVERY_REGIONS[c.regionId] : null;
    const progress = linked
      ? regionMap[c.regionId] ||
        worldDiscovery?.currentRegion?.regionId === c.regionId
        ? worldDiscovery.currentRegion
        : null
      : null;
    const pct = progress?.completionPercent ?? c.demoPct ?? 0;
    const fogLayer = progress?.fogLayer || (pct >= 50 ? FOG_LAYERS.MASTERED : pct >= 10 ? FOG_LAYERS.EXPLORED : FOG_LAYERS.RUMORED);
    const visual = fogLayerToVisual(fogLayer, progress?.completionTier);
    const pos = latLngToGlobePosition(c.latitude, c.longitude);
    return {
      ...c,
      completionPercent: pct,
      fogLayer,
      visual,
      position: pos,
      explorers: progress?.liveExplorerCount || Math.floor(1200 + pct * 400),
      pulse: pct > 0,
    };
  });
}

function buildCountryMarkers(worldDiscovery) {
  return GLOBE_COUNTRIES.map((c) => {
    const linked = c.regionId ? DISCOVERY_REGIONS[c.regionId] : null;
    let pct = c.demoPct ?? 0;
    let fogLayer = FOG_LAYERS.RUMORED;
    if (linked && worldDiscovery?.currentRegion?.regionId === c.regionId) {
      pct = worldDiscovery.currentRegion.completionPercent;
      fogLayer = worldDiscovery.currentRegion.fogLayer;
    } else if (c.regionId === 'usa' && worldDiscovery?.parentRegion) {
      pct = worldDiscovery.parentRegion.completionPercent ?? pct;
      fogLayer = worldDiscovery.parentRegion.fogLayer;
    }
    return {
      ...c,
      completionPercent: pct,
      fogLayer,
      visual: fogLayerToVisual(fogLayer, pct >= 80 ? 'legendary' : null),
      position: latLngToGlobePosition(c.latitude, c.longitude),
    };
  });
}

function buildDiscoveryStream(now = Date.now()) {
  const minute = Math.floor(safeGetTime(now) / 60000);
  return DISCOVERY_STREAM_SEED.map((item, i) => {
    const opacity = 0.35 + ((minute + i) % 5) * 0.12;
    const pos = latLngToGlobePosition(item.latitude, item.longitude);
    return {
      ...item,
      position: pos,
      opacity: Math.min(1, opacity),
      ageMs: (minute % 30) * 1000 + i * 800,
    };
  }).slice(0, LIVING_EARTH_LIMITS.MAX_DISCOVERY_EVENTS);
}

function buildBossBeacons(legendarySnapshot) {
  const beacons = [];
  const boss = legendarySnapshot?.worldBoss;
  if (boss?.latitude != null && legendarySnapshot?.hasActiveBoss) {
    beacons.push({
      id: `beacon-${boss.bossId}`,
      bossId: boss.bossId,
      label: boss.name,
      icon: boss.icon,
      latitude: boss.latitude,
      longitude: boss.longitude,
      position: latLngToGlobePosition(boss.latitude, boss.longitude),
      hoursRemaining: boss.hoursRemaining,
      participants: boss.participants,
      communityProgress: boss.communityProgress,
    });
  }
  return beacons.slice(0, LIVING_EARTH_LIMITS.MAX_BOSS_BEACONS);
}

function buildCreatorWorldMarkers(identity) {
  return (identity?.creatorWorlds || CREATOR_WORLDS).map((world, i) => ({
    id: world.creatorWorldId || world.id,
    label: world.worldTitle || world.label,
    latitude: 37.34 + (i % 3) * 0.8,
    longitude: -95.26 + i * 1.2,
    position: latLngToGlobePosition(37.34 + (i % 3) * 0.8, -95.26 + i * 1.2),
    progressPct: world.progressPct ?? 0,
    creatorName: world.creatorName,
  }));
}

function resolveSeasonAtmosphere(now = Date.now()) {
  const season = getCurrentSeason();
  const month = new Date(safeGetTime(now)).getMonth();
  if (month === 9 || month === 10) return { id: 'halloween', className: 'earth-season-halloween', label: 'Halloween' };
  if (month === 11 || month === 0) return { id: 'winter', className: 'earth-season-winter', label: 'Winter' };
  if (month >= 5 && month <= 7) return { id: 'summer', className: 'earth-season-summer', label: 'Summer' };
  if (month >= 2 && month <= 4) return { id: 'spring', className: 'earth-season-spring', label: 'Spring' };
  if (season.theme === 'founders') return { id: 'founder', className: 'earth-season-founder', label: 'Founder Season' };
  return { id: 'default', className: '', label: season.themeLabel };
}

function buildWorldHud(worldDiscovery, legendarySnapshot, identity) {
  const world = worldDiscovery?.worldRegion || worldDiscovery?.currentRegion;
  const pct = world?.animatedDisplayPercent ?? world?.completionPercent ?? 18.42;
  return {
    label: 'EARTH',
    completionPercent: pct,
    progressBar: world?.progressBar || '████░░░░░░',
    discoveries: world?.discoveries ?? 2411221,
    explorers: world?.explorers ?? identity?.boss?.participants ?? 128441,
    countries: world?.countries ?? 189,
    activeBosses: legendarySnapshot?.hasActiveBoss ? 1 : 0,
  };
}

function buildEarthCeremonies(worldDiscovery, stored) {
  const ceremonies = [];
  const worldPct = worldDiscovery?.worldRegion?.completionPercent ?? 0;
  const milestones = [
    { id: 'earth-20', threshold: 20, label: 'Earth', pct: worldPct },
    { id: 'na-10', threshold: 10, label: 'North America', pct: 5 },
    { id: 'kansas-50', threshold: 50, label: 'Kansas', pct: worldDiscovery?.currentRegion?.label === 'Kansas' ? worldDiscovery.currentRegion.completionPercent : 31 },
  ];
  for (const m of milestones) {
    if (m.pct >= m.threshold && !stored.ceremoniesSeen.includes(m.id)) {
      ceremonies.push({
        id: m.id,
        title: `${m.label} reached ${m.threshold}%!`,
        icon: '🎉',
      });
    }
  }
  return ceremonies;
}

export function getLivingEarthSnapshot(options = {}) {
  const {
    state = null,
    adventures = [],
    zoom = 11,
    now = Date.now(),
    fog = null,
    worldDiscovery: worldDiscoveryIn = null,
    previousMilestones = [],
  } = options;

  const level = zoomToDiscoveryLevel(zoom);
  const overlayVisible = isEarthOverlayVisible(zoom);
  const earthMode = overlayVisible;
  const fullEarth = isFullEarthView(zoom);
  const stored = normalizeLivingEarth(state?.livingEarth);

  const worldDiscovery =
    worldDiscoveryIn ||
    getWorldDiscoverySnapshot({
      zoom,
      state,
      adventures,
      fog,
      now,
      previousMilestones,
    });

  const livingWorld = getLivingWorldSnapshot(adventures, {
    state,
    now,
  });

  const identity = getQuestoryIdentitySnapshot(state, adventures, { now });
  const legendaryHunt = getLegendaryHuntSnapshot(state, adventures, { now });
  const social = getSocialDiscoverySnapshot(state, adventures, { now });

  const continents = buildContinentMarkers(worldDiscovery, { state, adventures, now });
  const countries = buildCountryMarkers(worldDiscovery);
  const discoveryStream = buildDiscoveryStream(now);
  const bossBeacons = buildBossBeacons(legendaryHunt);
  const creatorWorlds = buildCreatorWorldMarkers(identity);
  const seasonAtmosphere = resolveSeasonAtmosphere(now);
  const worldHud = buildWorldHud(worldDiscovery, legendaryHunt, identity);
  const ceremonies = buildEarthCeremonies(worldDiscovery, stored);
  const globalGoals = GLOBAL_GOALS;

  const pulses = [
    ...discoveryStream.slice(0, 12).map((s) => ({ ...s, kind: 'discovery' })),
    ...bossBeacons.map((b) => ({ ...b, kind: 'boss', text: b.label })),
  ].slice(0, LIVING_EARTH_LIMITS.MAX_PULSES);

  return {
    earthMode,
    overlayVisible,
    fullEarth,
    level,
    zoom,
    worldHud,
    continents,
    countries,
    discoveryStream,
    bossBeacons,
    creatorWorlds,
    pulses,
    seasonAtmosphere,
    globalGoals,
    ceremonies,
    worldDiscovery,
    liveExplorerCount: worldDiscovery.liveExplorerCount || social?.presenceBoost?.activeHunts || 0,
    timelineEntries: worldDiscovery.timelineEntries || [],
    heatZones: livingWorld.heatZones?.slice(0, 4) || [],
    stored,
    flyTargets: {
      parsons: { latitude: 37.3392, longitude: -95.261, zoom: 12 },
      kansas: { latitude: 38.5, longitude: -98.5, zoom: 7 },
      usa: { latitude: 39.8, longitude: -98.5, zoom: 4 },
      world: { latitude: 20, longitude: 0, zoom: 1 },
    },
  };
}

export function markEarthCeremonySeen(state, ceremonyId) {
  const stored = normalizeLivingEarth(state?.livingEarth);
  return {
    ...state,
    livingEarth: {
      ...stored,
      ceremoniesSeen: [...new Set([...stored.ceremoniesSeen, ceremonyId])].slice(0, 20),
    },
  };
}

export function getRegionFlyTarget(regionId) {
  const region = DISCOVERY_REGIONS[regionId];
  if (!region?.latitude) return null;
  const zoomMap = {
    [DISCOVERY_LEVELS.NEIGHBORHOOD]: 14,
    [DISCOVERY_LEVELS.CITY]: 12,
    [DISCOVERY_LEVELS.COUNTY]: 10,
    [DISCOVERY_LEVELS.STATE]: 7,
    [DISCOVERY_LEVELS.COUNTRY]: 4,
    [DISCOVERY_LEVELS.CONTINENT]: 2,
    [DISCOVERY_LEVELS.WORLD]: 1,
  };
  return {
    latitude: region.latitude,
    longitude: region.longitude,
    zoom: zoomMap[region.level] ?? 10,
    label: region.label,
  };
}
