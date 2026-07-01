/**
 * Phase 4 — Social Discovery
 * Territories, live races, completion feed, guild/city progress, map overlays.
 */
import { getAdventureMapCenter } from './mapUtils';
import { getAdventureProgress } from './seed';
import { getAllCollectionProgress, isAdventureClaimed } from './engagement';
import { getMyTeam, SEED_TEAMS } from './social';
import { safeGetTime, toSafeDate } from './dateUtils';

export const SOCIAL_DISCOVERY_LIMITS = {
  MAX_FEED: 12,
  MAX_TERRITORIES: 4,
  MAX_RACES: 3,
  MAX_TOASTS: 3,
  MAX_TERRITORY_OVERLAYS: 5,
};

/** Parsons area centroids for territory visualization */
export const TERRITORY_AREAS = {
  'downtown-parsons': {
    id: 'downtown-parsons',
    label: 'Downtown',
    latitude: 37.3392,
    longitude: -95.261,
    radiusM: 520,
  },
  'main-street': {
    id: 'main-street',
    label: 'Main Street',
    latitude: 37.3398,
    longitude: -95.2595,
    radiusM: 380,
  },
  'horror-crest': {
    id: 'horror-crest',
    label: 'Horror Crest',
    latitude: 37.3348,
    longitude: -95.264,
    radiusM: 450,
  },
  'railroad-district': {
    id: 'railroad-district',
    label: 'the Rail District',
    latitude: 37.338,
    longitude: -95.2625,
    radiusM: 420,
  },
  'lake-parsons': {
    id: 'lake-parsons',
    label: 'Lake Parsons',
    latitude: 37.334,
    longitude: -95.258,
    radiusM: 400,
  },
};

export const DEFAULT_TERRITORY_TEAMS = [
  {
    teamId: 'parsons-explorers',
    teamName: 'Parsons Explorers',
    teamColor: '#34d399',
    territoryControl: 0.42,
    controlledAreaIds: ['downtown-parsons', 'main-street'],
  },
  {
    teamId: 'ghost-hunters-kansas',
    teamName: 'Ghost Hunters of Kansas',
    teamColor: '#a78bfa',
    territoryControl: 0.31,
    controlledAreaIds: ['horror-crest', 'railroad-district'],
  },
  {
    teamId: 'night-shift',
    teamName: 'The Night Shift',
    teamColor: '#60a5fa',
    territoryControl: 0.27,
    controlledAreaIds: ['lake-parsons'],
  },
];

const DEMO_EXPLORER_NAMES = [
  'Alex', 'Maya', 'Jordan', 'Riley', 'Casey', 'Sam', 'Quinn', 'Nova', 'Finn', 'Sky', 'Drew', 'Rowan',
];

export const DEFAULT_LIVE_RACES = [
  {
    id: 'race-treasure-sprint',
    type: 'first_claim',
    title: 'Live Race',
    subtitle: 'First to claim treasure',
    adventureId: 'parsons-gold-rush',
    adventureTitle: 'Parsons Gold Rush',
    teamsCompeting: 3,
    explorersRacing: 3,
    prize: '500 coins + relic',
    countdownMinutes: 42,
    active: true,
  },
  {
    id: 'race-legendary-hunt',
    type: 'legendary_hunt',
    title: 'Timed Legendary Hunt',
    subtitle: 'Iron Horse expedition',
    adventureId: 'iron-horse',
    adventureTitle: 'Iron Horse',
    teamsCompeting: 2,
    explorersRacing: 2,
    prize: 'Founder badge',
    countdownMinutes: 118,
    active: true,
  },
  {
    id: 'race-black-lantern',
    type: 'first_claim',
    title: 'Black Lantern Sprint',
    subtitle: 'Three explorers racing',
    adventureId: 'union-depot-ghost',
    adventureTitle: 'Union Depot Ghost',
    teamsCompeting: 3,
    explorersRacing: 3,
    prize: 'Night Hunter badge',
    countdownMinutes: 28,
    active: true,
  },
];

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function minutesAgoFromIso(iso) {
  if (!iso) return 99;
  const ms = Date.now() - safeGetTime(iso);
  return Math.max(1, Math.round(ms / 60000));
}

function formatAreaLabel(areaId) {
  return TERRITORY_AREAS[areaId]?.label || areaId.replace(/-/g, ' ');
}

export function getTeamTerritories(options = {}) {
  const { state = null, showOnMap = true } = options;
  const myTeam = state ? getMyTeam(state) : null;

  return DEFAULT_TERRITORY_TEAMS.map((t) => ({
    ...t,
    showOnMap,
    isMyTeam: myTeam?.id === t.teamId,
    primaryAreaLabel: formatAreaLabel(t.controlledAreaIds?.[0]),
  }));
}

export function getLiveRaceEvents(adventures = []) {
  return DEFAULT_LIVE_RACES.filter((r) => r.active)
    .slice(0, SOCIAL_DISCOVERY_LIMITS.MAX_RACES)
    .map((race) => {
      const adventure = adventures.find((a) => a.id === race.adventureId);
      const center = adventure ? getAdventureMapCenter(adventure) : null;
      return {
        ...race,
        adventureTitle: adventure?.title || race.adventureTitle,
        latitude: center?.latitude ?? null,
        longitude: center?.longitude ?? null,
      };
    });
}

export function buildTerritoryOverlays(territories = []) {
  const overlays = [];
  for (const team of territories) {
    for (const areaId of team.controlledAreaIds || []) {
      const area = TERRITORY_AREAS[areaId];
      if (!area) continue;
      overlays.push({
        id: `${team.teamId}-${areaId}`,
        teamId: team.teamId,
        teamName: team.teamName,
        teamColor: team.teamColor,
        areaId,
        areaLabel: area.label,
        latitude: area.latitude,
        longitude: area.longitude,
        radiusM: area.radiusM,
        control: team.territoryControl,
        opacity: 0.12 + team.territoryControl * 0.18,
      });
    }
  }
  return overlays.slice(0, SOCIAL_DISCOVERY_LIMITS.MAX_TERRITORY_OVERLAYS);
}

export function buildRaceMarkers(races = []) {
  return races
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      id: r.id,
      adventureId: r.adventureId,
      title: r.adventureTitle,
      latitude: r.latitude,
      longitude: r.longitude,
      explorersRacing: r.explorersRacing || r.teamsCompeting,
      countdownMinutes: r.countdownMinutes,
      prize: r.prize,
    }));
}

export function computeCityCompletionPct(state, adventures = []) {
  const published = adventures.filter((a) => a.status === 'published' && getAdventureMapCenter(a));
  const total = published.length;
  if (!total) return 0;

  const claimed = published.filter((a) => isAdventureClaimed(state, a.id)).length;
  const revealed = state?.mapExploration?.revealed?.length ?? 0;
  const revealedWeight = Math.min(revealed, 20) / 20;
  const claimedPct = (claimed / total) * 100;
  const explorePct = revealedWeight * 35;
  const communityBoost = Math.min(15, hashSeed('parsons-guild') % 16);

  return Math.min(99, Math.round(claimedPct * 0.55 + explorePct + communityBoost));
}

export function computeGuildProgress(state, adventures = []) {
  const myTeam = getMyTeam(state);
  const collections = getAllCollectionProgress(state, adventures);
  const topCollection = collections.sort((a, b) => b.pct - a.pct)[0];
  const cityPct = computeCityCompletionPct(state, adventures);

  if (myTeam) {
    return {
      label: myTeam.name,
      pct: Math.max(cityPct, topCollection?.pct ?? 0),
      kind: 'team',
      teamId: myTeam.id,
      subtitle: `Rank #${myTeam.rank} · ${myTeam.members} members`,
    };
  }

  if (topCollection?.total > 0) {
    return {
      label: topCollection.name,
      pct: topCollection.pct,
      kind: 'collection',
      collectionId: topCollection.collectionId,
      subtitle: `${topCollection.found}/${topCollection.total} adventures`,
    };
  }

  return {
    label: 'Parsons Explorers Guild',
    pct: cityPct,
    kind: 'city',
    subtitle: 'Community map progress',
  };
}

export function buildCompletionFeed(state, adventures = [], options = {}) {
  const { max = 8, now = Date.now() } = options;
  const feed = [];
  const seen = new Set();

  const activity = state?.social?.activityFeed || [];
  for (const entry of activity) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    feed.push({
      id: entry.id,
      text: entry.text,
      kind: entry.kind || 'completion',
      minutesAgo: entry.minutesAgo ?? minutesAgoFromIso(entry.at),
      adventureId: entry.adventureId,
      playerName: entry.playerName,
    });
  }

  for (const adventure of adventures) {
    const progress = getAdventureProgress(state, adventure.id);
    if (!progress.claimed || !progress.claimedAt) continue;
    const id = `claimed-${adventure.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const name = progress.claimedBy || 'You';
    feed.push({
      id,
      text: `${name} completed ${adventure.title}`,
      kind: 'completion',
      minutesAgo: minutesAgoFromIso(progress.claimedAt),
      adventureId: adventure.id,
      playerName: name,
    });
  }

  const dateKey = toSafeDate(now).toDateString();
  adventures.slice(0, 6).forEach((adventure, i) => {
    const name = DEMO_EXPLORER_NAMES[(hashSeed(`${adventure.id}-${dateKey}`) + i) % DEMO_EXPLORER_NAMES.length];
    const mins = 1 + (hashSeed(`${name}-${adventure.id}`) % 12);
    const id = `demo-complete-${adventure.id}`;
    if (seen.has(id)) return;
    if (feed.some((f) => f.adventureId === adventure.id && f.kind === 'completion')) return;
    seen.add(id);
    feed.push({
      id,
      text: `${name} completed ${adventure.title} ${mins} min ago`,
      kind: 'completion',
      minutesAgo: mins,
      adventureId: adventure.id,
      playerName: name,
    });
  });

  return feed
    .sort((a, b) => (a.minutesAgo ?? 99) - (b.minutesAgo ?? 99))
    .slice(0, max);
}

export function buildSocialDiscoveryFeed(adventures = [], options = {}) {
  const {
    state = null,
    timeline = [],
    territories = [],
    races = [],
    guild = null,
    completions = [],
  } = options;
  const feed = [];
  const seen = new Set();

  const push = (entry) => {
    if (!entry?.id || seen.has(entry.id)) return;
    seen.add(entry.id);
    feed.push(entry);
  };

  completions.slice(0, 4).forEach((entry) => {
    push({
      id: `social-${entry.id}`,
      text: entry.text,
      kind: entry.kind || 'completion',
      minutesAgo: entry.minutesAgo,
      adventureId: entry.adventureId,
    });
  });

  races.slice(0, 2).forEach((race) => {
    const count = race.explorersRacing || race.teamsCompeting;
    push({
      id: `race-feed-${race.id}`,
      text: `${count} explorers are racing to ${race.adventureTitle || 'the treasure'}.`,
      kind: 'race',
      minutesAgo: 1,
      adventureId: race.adventureId,
    });
  });

  territories.slice(0, 3).forEach((team) => {
    const area = team.primaryAreaLabel || formatAreaLabel(team.controlledAreaIds?.[0]);
    push({
      id: `territory-${team.teamId}`,
      text: `${team.teamName} controls ${area}.`,
      kind: 'territory',
      minutesAgo: 3,
      teamId: team.teamId,
    });
  });

  if (guild) {
    push({
      id: 'guild-progress',
      text: `${guild.label} has discovered ${guild.pct}% of Parsons.`,
      kind: 'guild',
      minutesAgo: 8,
    });
  }

  timeline
    .filter((e) => ['team', 'nearby', 'heat'].includes(e.kind))
    .slice(0, 3)
    .forEach((entry) => {
      push({
        id: `social-${entry.id}`,
        text: entry.text,
        kind: entry.kind,
        minutesAgo: entry.minutesAgo,
        adventureId: entry.adventureId,
      });
    });

  return feed.slice(0, SOCIAL_DISCOVERY_LIMITS.MAX_FEED);
}

export function buildSocialActivityToasts(feed = []) {
  return feed
    .filter((e) => ['completion', 'team', 'nearby', 'race'].includes(e.kind))
    .slice(0, SOCIAL_DISCOVERY_LIMITS.MAX_TOASTS)
    .map((e) => ({
      id: `toast-${e.id}`,
      title: e.kind === 'race' ? 'Live Race' : e.kind === 'completion' ? 'Explorer Activity' : 'World Activity',
      body: e.text,
      icon: e.kind === 'race' ? '⚡' : e.kind === 'completion' ? '👣' : '🔥',
      kind: e.kind,
      minutesAgo: e.minutesAgo,
    }));
}

export function buildRaceActivityBanners(races = []) {
  return races.slice(0, 2).map((race) => ({
    id: `race-banner-${race.id}`,
    icon: '⚡',
    text: `${race.explorersRacing || race.teamsCompeting} explorers racing to ${race.adventureTitle} · ${race.countdownMinutes}m left`,
    kind: 'race',
    priority: 88,
    ttlMs: 11000,
    adventureId: race.adventureId,
  }));
}

export function getSocialDiscoverySnapshot(state, adventures = [], options = {}) {
  const { timeline = [], now = Date.now() } = options;
  const territories = getTeamTerritories({ state, showOnMap: true });
  const races = getLiveRaceEvents(adventures);
  const guild = computeGuildProgress(state, adventures);
  const completions = buildCompletionFeed(state, adventures, { now });
  const feed = buildSocialDiscoveryFeed(adventures, {
    state,
    timeline,
    territories,
    races,
    guild,
    completions,
  });
  const toasts = buildSocialActivityToasts(feed);
  const territoryOverlays = buildTerritoryOverlays(territories);
  const raceMarkers = buildRaceMarkers(races);
  const myTeam = getMyTeam(state);
  const cityPct = computeCityCompletionPct(state, adventures);

  const controllingTeam = territories[0];
  const primaryRace = races[0];

  return {
    feed,
    toasts,
    completions,
    territories,
    territoryOverlays,
    races,
    raceMarkers,
    guild,
    cityPct,
    myTeam,
    controllingTeam,
    primaryRace,
    explorersRacing: races.reduce((sum, r) => sum + (r.explorersRacing || 0), 0),
    presenceBoost: {
      teamsCompeting: Math.max(state?.social?.mapPresence?.teamsCompeting ?? 0, races.length),
      activeHunts: Math.max(
        state?.social?.mapPresence?.activeHunts ?? 0,
        races.length + completions.filter((c) => c.minutesAgo <= 15).length
      ),
    },
  };
}

export function resolveTeamById(teamId) {
  return SEED_TEAMS.find((t) => t.id === teamId) || null;
}
