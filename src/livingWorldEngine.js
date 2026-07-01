/**
 * Living World — discovery heat, explorer simulation, timeline, pulses.
 * Uses real adventure/state data when available; seeded demo activity otherwise.
 */
import { getAdventureMapCenter } from './mapUtils';
import { hasLiveWorldEvent } from './mapDiscovery';
import { computeAdventureHeat, getHeatCategory } from './social';
import { safeGetWorldEventContext } from './worldEventEngine';
import {
  computeVisitHeatScore,
  getLivingWorldEventsSnapshot,
  getVisitHeatLevel,
} from './livingWorldEventsEngine';

export const LIVING_WORLD_LIMITS = {
  MAX_EXPLORER_DOTS: 12,
  MAX_PULSES: 8,
  MAX_TIMELINE: 10,
  MAX_HEAT_ZONES: 6,
  MAX_REVEALED_AREAS: 20,
};

export const HEAT_LEVELS = {
  COLD: 'cold',
  WARM: 'warm',
  HOT: 'hot',
  LEGENDARY: 'legendary',
};

const EXPLORER_NAMES = [
  'Maya', 'Jordan', 'Riley', 'Casey', 'Alex', 'Sam', 'Quinn', 'Drew',
  'Nova', 'Finn', 'Sky', 'Rowan',
];

const TEAM_NAMES = ['Team Blue', 'Night Shift', 'Parsons Explorers', 'Ghost Hunters'];

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** @returns {'cold'|'warm'|'hot'|'legendary'} */
export function computeHeatLevel(adventure, context = {}) {
  if (!adventure) return HEAT_LEVELS.COLD;
  const visitScore = computeVisitHeatScore(adventure, context.state);
  const score =
    visitScore ||
    Number(adventure.heatScore) ||
    (context.state ? computeAdventureHeat(adventure, context.state) : 0);
  const category = adventure.heatCategory || getHeatCategory(score);
  const visitLevel = getVisitHeatLevel(adventure, context.state);
  const nearby = context.nearbyExplorers ?? 0;
  const hasEvent = hasLiveWorldEvent(adventure, context.state);
  const featured = Boolean(adventure.isLegendaryHunt || adventure.isFounderHunt || adventure.heatCategory === 'legendary');

  if (featured || category === 'legendary' || visitLevel === HEAT_LEVELS.LEGENDARY || score >= 80) {
    return HEAT_LEVELS.LEGENDARY;
  }
  if (hasEvent || visitLevel === HEAT_LEVELS.HOT || score >= 50 || nearby >= 5) return HEAT_LEVELS.HOT;
  if (visitLevel === HEAT_LEVELS.WARM || score >= 25 || nearby >= 2 || adventure.playersCompleted > 10) {
    return HEAT_LEVELS.WARM;
  }
  return HEAT_LEVELS.COLD;
}

export function buildHeatZones(adventureMarkers = [], options = {}) {
  const { state = null, mapState = null, userLocation = null } = options;
  const ctx = { state: mapState || state };

  const zones = adventureMarkers
    .map((m) => {
      const level = computeHeatLevel(m.adventure, {
        ...ctx,
        nearbyExplorers: estimateNearbyExplorers(m.latitude, m.longitude, options.explorerDots),
      });
      if (level === HEAT_LEVELS.COLD) return null;
      return {
        id: m.id,
        adventureId: m.id,
        title: m.title,
        latitude: m.latitude,
        longitude: m.longitude,
        level,
        explorersNearby: estimateNearbyExplorers(m.latitude, m.longitude, options.explorerDots),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const order = { legendary: 4, hot: 3, warm: 2, cold: 1 };
      return (order[b.level] || 0) - (order[a.level] || 0);
    })
    .slice(0, LIVING_WORLD_LIMITS.MAX_HEAT_ZONES);

  return zones;
}

function estimateNearbyExplorers(lat, lng, dots = []) {
  if (!dots.length) return 0;
  return dots.filter((d) => {
    const dlat = (d.latitude - lat) * 111000;
    const dlng = (d.longitude - lng) * 111000 * Math.cos((lat * Math.PI) / 180);
    return Math.hypot(dlat, dlng) < 800;
  }).length;
}

/** Believable explorer dots — approximate positions, not real users. */
export function generateExplorerDots(adventures = [], options = {}) {
  const {
    centerLat = 37.3392,
    centerLng = -95.261,
    count = LIVING_WORLD_LIMITS.MAX_EXPLORER_DOTS,
    seed = 'parsons-alpha',
  } = options;

  const anchors = adventures
    .map((a) => getAdventureMapCenter(a))
    .filter(Boolean)
    .slice(0, 8);

  const dots = [];
  for (let i = 0; i < Math.min(count, LIVING_WORLD_LIMITS.MAX_EXPLORER_DOTS); i += 1) {
    const s = hashSeed(`${seed}-${i}`);
    const anchor = anchors[i % anchors.length] || { latitude: centerLat, longitude: centerLng };
    const jitterLat = (seededRandom(s) - 0.5) * 0.012;
    const jitterLng = (seededRandom(s + 1) - 0.5) * 0.015;
    dots.push({
      id: `explorer-${i}`,
      name: EXPLORER_NAMES[i % EXPLORER_NAMES.length],
      latitude: anchor.latitude + jitterLat,
      longitude: anchor.longitude + jitterLng,
      teamColor: ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24'][i % 4],
      phase: seededRandom(s + 2) * Math.PI * 2,
    });
  }
  return dots;
}

export function buildLivingPresence(adventures = [], state = null) {
  const base = state?.social?.mapPresence || {};
  const dots = generateExplorerDots(adventures);
  const activeHunts = adventures.filter((a) => computeHeatLevel(a, { state }) !== HEAT_LEVELS.COLD).length;

  return {
    explorersNearby: Math.max(base.explorersNearby ?? 0, dots.length + 3),
    activeHunts: Math.max(base.activeHunts ?? 0, Math.min(activeHunts, 9)),
    teamsCompeting: base.teamsCompeting ?? TEAM_NAMES.length,
    explorerDots: dots,
  };
}

export function buildTimelineEntries(adventures = [], options = {}) {
  const { state = null, eventContext = null } = options;
  const now = Date.now();
  const entries = [];

  const hotAdventures = adventures
    .filter((a) => computeHeatLevel(a, { state }) === HEAT_LEVELS.HOT || computeHeatLevel(a, { state }) === HEAT_LEVELS.LEGENDARY)
    .slice(0, 3);

  hotAdventures.forEach((a, i) => {
    entries.push({
      id: `heat-${a.id}`,
      minutesAgo: 4 + i * 2,
      text: `${a.title} became Hot`,
      kind: 'heat',
      adventureId: a.id,
    });
  });

  adventures.slice(0, 4).forEach((a, i) => {
    const name = EXPLORER_NAMES[(i + 2) % EXPLORER_NAMES.length];
    entries.push({
      id: `start-${a.id}`,
      minutesAgo: 2 + i * 3,
      text: `${name} entered ${a.title}`,
      kind: 'start',
      adventureId: a.id,
    });
  });

  if (adventures[1]) {
    entries.push({
      id: 'claim-iron',
      minutesAgo: 4,
      text: `Someone claimed ${adventures[1].title} 4 min ago`,
      kind: 'completion',
      adventureId: adventures[1].id,
    });
  }

  const horror = adventures.find((a) => /horror|whisper|hollow/i.test(a.title || ''));
  if (horror) {
    entries.push({
      id: 'near-horror',
      minutesAgo: 1,
      text: `3 explorers are near ${horror.title}`,
      kind: 'nearby',
      adventureId: horror.id,
    });
  }

  TEAM_NAMES.slice(0, 2).forEach((team, i) => {
    const a = adventures[i];
    if (!a) return;
    entries.push({
      id: `team-${i}`,
      minutesAgo: 5 + i,
      text: `${team} started ${a.title}`,
      kind: 'team',
      adventureId: a.id,
    });
  });

  if (eventContext?.primaryEvent) {
    entries.push({
      id: 'world-event',
      minutesAgo: 8,
      text: `${eventContext.primaryEvent.title || 'World event'} is active`,
      kind: 'event',
    });
  }

  const sponsored = adventures.find((a) => a.isSponsoredDrop || a.sponsorVerified);
  if (sponsored) {
    entries.push({
      id: 'sponsor',
      minutesAgo: 15,
      text: `${sponsored.sponsorName || 'Sponsored'} treasure is active`,
      kind: 'sponsor',
      adventureId: sponsored.id,
    });
  }

  entries.push({
    id: 'yesterday',
    minutesAgo: 60 * 24,
    text: '4 discoveries happened while you were away',
    kind: 'summary',
  });

  return entries
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, LIVING_WORLD_LIMITS.MAX_TIMELINE);
}

export function buildDiscoveryPulses(adventures = [], options = {}) {
  const { trigger = null, heatZones = [], legendaryDrop = null } = options;
  const pulses = [];

  if (trigger) {
    pulses.push({
      id: trigger.id || `pulse-${Date.now()}`,
      latitude: trigger.latitude,
      longitude: trigger.longitude,
      label: trigger.label,
      kind: trigger.kind || 'discovered',
      createdAt: Date.now(),
    });
  }

  if (legendaryDrop?.latitude != null) {
    pulses.push({
      id: `legendary-pulse-${legendaryDrop.adventureId}`,
      latitude: legendaryDrop.latitude,
      longitude: legendaryDrop.longitude,
      label: 'Legendary Drop',
      kind: 'legendary',
      createdAt: Date.now() - 2000,
    });
  }

  heatZones
    .filter((z) => z.level === HEAT_LEVELS.HOT || z.level === HEAT_LEVELS.LEGENDARY)
    .slice(0, 3)
    .forEach((z) => {
      pulses.push({
        id: `heat-pulse-${z.id}`,
        latitude: z.latitude,
        longitude: z.longitude,
        label: z.level === HEAT_LEVELS.LEGENDARY ? 'Legendary active' : 'Hot zone',
        kind: 'heat',
        createdAt: Date.now() - 5000,
      });
    });

  return pulses.slice(0, LIVING_WORLD_LIMITS.MAX_PULSES);
}

export function getWorldAtmosphereClass(eventContext) {
  const type = eventContext?.primaryEvent?.type || eventContext?.primaryEvent?.id || '';
  if (/halloween|friday_13/i.test(type)) return 'living-world-atmosphere-halloween';
  if (/double_coin/i.test(type)) return 'living-world-atmosphere-coins';
  if (/founder/i.test(type)) return 'living-world-atmosphere-founder';
  if (/christmas|winter/i.test(type)) return 'living-world-atmosphere-winter';
  return '';
}

export function formatHeatTooltip(zone) {
  if (!zone) return '';
  const labels = { warm: 'Warm', hot: 'Hot zone', legendary: 'Legendary hunt' };
  const label = labels[zone.level] || 'Active';
  const explorers = zone.explorersNearby > 0 ? ` · ${zone.explorersNearby} explorers nearby` : '';
  return `${label}${explorers}`;
}

export function getLivingWorldSnapshot(adventures = [], options = {}) {
  const {
    state = null,
    adventureMarkers = [],
    userLocation = null,
    pulseTrigger = null,
    now = Date.now(),
  } = options;
  const eventContext = safeGetWorldEventContext(state, adventures);
  const events = getLivingWorldEventsSnapshot(adventures, { state, now, eventContext });
  const presence = buildLivingPresence(adventures, state);
  const explorerDots = presence.explorerDots;
  const heatZones = buildHeatZones(adventureMarkers, {
    state,
    mapState: state,
    userLocation,
    explorerDots,
  });
  const timeline = buildTimelineEntries(adventures, { state, eventContext });
  const pulses = buildDiscoveryPulses(adventures, {
    trigger: pulseTrigger,
    heatZones,
    legendaryDrop: events.legendaryDrop,
  });
  const revealedCount = events.exploration?.revealed?.length ?? 0;
  const atmosphereClass = [
    getWorldAtmosphereClass(eventContext),
    events.nightMode ? 'living-world-atmosphere-night' : '',
    events.legendaryDrop ? 'living-world-atmosphere-legendary' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    presence,
    explorerDots,
    heatZones,
    timeline,
    pulses,
    eventContext,
    revealedCount,
    atmosphereClass,
    ...events,
  };
}
