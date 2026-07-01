/**
 * Phase 3 — Living World Events
 * Reactive world simulation: fog decay, discovery trails, visit heat,
 * legendary drops, night-only visibility, seasonal rotation, ambient activity.
 */
import { getAdventureMapCenter } from './mapUtils';
import { hasLiveWorldEvent, applyFogDecay, buildDiscoveryTrail, computeFogReturnOpacity } from './mapDiscovery';
import { safeGetWorldEventContext } from './worldEventEngine';
import { getCurrentSeason } from './seasonEngine';

const HEAT_LEVELS = {
  COLD: 'cold',
  WARM: 'warm',
  HOT: 'hot',
  LEGENDARY: 'legendary',
};

export const WORLD_EVENT_LIMITS = {
  MAX_TRAIL_POINTS: 12,
  MAX_AMBIENT_BANNERS: 5,
  MAX_NOTIFICATIONS: 4,
  FOG_RETURN_DAYS: 5,
  TRAIL_FADE_HOURS: 48,
  LEGENDARY_ROTATION_HOURS: 4,
};

const AREA_LABELS = [
  { match: /downtown|main.?street|square/i, label: 'Downtown' },
  { match: /depot|rail|iron/i, label: 'the Rail District' },
  { match: /lake|parsons lake/i, label: 'Lake Parsons' },
  { match: /hollow|whisper|lantern/i, label: 'Horror Crest' },
  { match: /church|heritage/i, label: 'Heritage Row' },
];

const EXPLORER_NAMES = [
  'Alex', 'Maya', 'Jordan', 'Riley', 'Casey', 'Sam', 'Quinn', 'Nova', 'Finn', 'Sky',
];

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededCount(seed, min, max) {
  const span = max - min + 1;
  return min + (hashSeed(seed) % span);
}

export function isNightTime(now = new Date()) {
  const hour = now.getHours();
  return hour >= 19 || hour < 6;
}

export function inferNightOnlyAdventure(adventure) {
  if (!adventure) return false;
  if (adventure.nightOnly || adventure.playWindow === 'night') return true;
  const tags = adventure.worldConfig?.worldEventTags || adventure.tags || [];
  if (tags.some((t) => /night/i.test(String(t)))) return true;
  const title = `${adventure.title || ''} ${adventure.template || ''}`;
  return /whisper|hollow|lantern|midnight|ghost ride/i.test(title);
}

export function inferSeasonalTag(adventure) {
  if (!adventure) return null;
  if (adventure.seasonalTag) return adventure.seasonalTag;
  const tags = adventure.worldConfig?.worldEventTags || [];
  const hit = tags.find((t) => /halloween|christmas|easter|summer|winter|founder/i.test(String(t)));
  if (hit) return hit;
  const title = adventure.title || '';
  if (/hollow|whisper|lantern/i.test(title)) return 'halloween';
  if (/founder|iron horse/i.test(title)) return 'founder_event';
  return null;
}

export function isSeasonalAdventureActive(adventure, eventContext, now = new Date()) {
  const tag = inferSeasonalTag(adventure);
  if (!tag) return true;
  const activeType = eventContext?.primaryEvent?.type || eventContext?.primaryEvent?.id || '';
  if (!activeType) {
    const month = now.getMonth() + 1;
    if (tag === 'halloween') return month >= 10 || month <= 11;
    if (tag === 'christmas') return month === 12 || month === 1;
    if (tag === 'summer') return month >= 6 && month <= 8;
    return true;
  }
  return new RegExp(tag.replace('_', '[_ ]?'), 'i').test(activeType) || hasLiveWorldEvent(adventure, { mapExploration: {} });
}

export function isAdventureMapVisible(adventure, options = {}) {
  const { now = new Date(), eventContext = null, includeNightOnly = true } = options;
  if (!adventure) return false;

  if (!isSeasonalAdventureActive(adventure, eventContext, now)) return false;

  const nightOnly = inferNightOnlyAdventure(adventure);
  if (nightOnly && includeNightOnly && !isNightTime(now)) return false;

  return true;
}

export function resolveAreaLabel(adventure) {
  const text = `${adventure?.location || ''} ${adventure?.title || ''}`;
  for (const area of AREA_LABELS) {
    if (area.match.test(text)) return area.label;
  }
  return adventure?.location?.split(',')[0]?.trim() || 'the area';
}

export function computeVisitHeatScore(adventure, state = null) {
  if (!adventure) return 0;
  const completed = Number(adventure.playersCompleted) || 0;
  const base = Number(adventure.heatScore) || completed * 4;
  const seed = hashSeed(`${adventure.id}-${new Date().toDateString()}`);
  const dailyVisitors = seededCount(`${adventure.id}-visitors`, 2, 28);
  const recentBoost = completed > 15 ? 25 : completed > 5 ? 12 : 0;
  const eventBoost = hasLiveWorldEvent(adventure, state) ? 15 : 0;
  return base + dailyVisitors + recentBoost + eventBoost + (seed % 8);
}

export function getVisitHeatLevel(adventure, state = null) {
  const score = computeVisitHeatScore(adventure, state);
  if (score >= 80 || adventure?.isLegendaryHunt) return HEAT_LEVELS.LEGENDARY;
  if (score >= 50) return HEAT_LEVELS.HOT;
  if (score >= 25) return HEAT_LEVELS.WARM;
  return HEAT_LEVELS.COLD;
}

export function getActiveLegendaryDrop(adventures = [], now = Date.now()) {
  const legendaries = adventures.filter((a) => a.isLegendaryHunt || a.heatCategory === 'legendary');
  if (!legendaries.length) return null;

  const slotHours = WORLD_EVENT_LIMITS.LEGENDARY_ROTATION_HOURS;
  const slot = Math.floor(now / (slotHours * 3600000)) % legendaries.length;
  const adventure = legendaries[slot];
  const center = getAdventureMapCenter(adventure);
  if (!center) return null;

  const slotStart = Math.floor(now / (slotHours * 3600000)) * slotHours * 3600000;
  const endsAt = slotStart + slotHours * 3600000;

  return {
    id: `legendary-drop-${adventure.id}-${slot}`,
    adventureId: adventure.id,
    title: adventure.title,
    label: 'Legendary Drop',
    message: `💎 ${adventure.title} — Legendary Drop active now`,
    latitude: center.latitude,
    longitude: center.longitude,
    spawnedAt: slotStart,
    endsAt,
    minutesLeft: Math.max(1, Math.round((endsAt - now) / 60000)),
  };
}

export function buildAmbientActivityBanners(adventures = [], options = {}) {
  const {
    state = null,
    now = Date.now(),
    eventContext = null,
    userRevealed = [],
  } = options;
  const banners = [];
  const dateKey = new Date(now).toDateString();

  const downtown = adventures.find((a) => /downtown|main/i.test(`${a.location} ${a.title}`));
  const areaLabel = downtown ? resolveAreaLabel(downtown) : 'Downtown';
  const uncoverCount = seededCount(`uncover-${areaLabel}-${dateKey}`, 8, 16);
  banners.push({
    id: `ambient-uncover-${dateKey}`,
    icon: '🔥',
    text: `${uncoverCount} explorers just uncovered ${areaLabel}.`,
    kind: 'uncover',
    priority: 90,
    ttlMs: 12000,
  });

  const hotAdventure = adventures
    .map((a) => ({ a, score: computeVisitHeatScore(a, state) }))
    .sort((x, y) => y.score - x.score)[0]?.a;

  if (hotAdventure && computeVisitHeatScore(hotAdventure, state) >= 40) {
    const visitors = seededCount(`hot-${hotAdventure.id}`, 18, 48);
    banners.push({
      id: `ambient-hot-${hotAdventure.id}`,
      icon: '⚡',
      text: `${hotAdventure.title} is Hot — ${visitors} explorers visited today.`,
      kind: 'heat',
      priority: 85,
      adventureId: hotAdventure.id,
      ttlMs: 14000,
    });
  }

  const legendary = getActiveLegendaryDrop(adventures, now);
  if (legendary) {
    banners.push({
      id: legendary.id,
      icon: '💎',
      text: legendary.message,
      kind: 'legendary',
      priority: 95,
      adventureId: legendary.adventureId,
      ttlMs: 16000,
    });
  }

  if (isNightTime(now)) {
    const nightAdventures = adventures.filter(inferNightOnlyAdventure);
    if (nightAdventures.length) {
      banners.push({
        id: `ambient-night-${dateKey}`,
        icon: '🌙',
        text: `${nightAdventures.length} night-only adventure${nightAdventures.length === 1 ? '' : 's'} awakened after sunset.`,
        kind: 'night',
        priority: 80,
        ttlMs: 12000,
      });
    }
  }

  if (eventContext?.primaryEvent) {
    banners.push({
      id: `ambient-season-${eventContext.primaryEvent.id}`,
      icon: eventContext.primaryEvent.icon || '🎃',
      text: `${eventContext.primaryEvent.title} — seasonal adventures are rotating in.`,
      kind: 'seasonal',
      priority: 75,
      ttlMs: 13000,
    });
  } else {
    const season = getCurrentSeason();
    banners.push({
      id: `ambient-season-${season.seasonId}`,
      icon: season.badgeIcon,
      text: `${season.title} — holiday trails rotate automatically.`,
      kind: 'seasonal',
      priority: 70,
      ttlMs: 11000,
    });
  }

  const decaying = userRevealed.filter(
    (r) => computeFogReturnOpacity(r.revealedAt, now) > 0.35
  );
  if (decaying.length) {
    banners.push({
      id: `ambient-fog-${dateKey}`,
      icon: '🌧️',
      text: `Fog is slowly returning to ${decaying.length} older explored area${decaying.length === 1 ? '' : 's'}.`,
      kind: 'fog',
      priority: 65,
      ttlMs: 10000,
    });
  }

  const recentName = EXPLORER_NAMES[hashSeed(dateKey) % EXPLORER_NAMES.length];
  const recentAdventure = adventures[hashSeed(`recent-${dateKey}`) % Math.max(1, adventures.length)];
  if (recentAdventure) {
    const mins = seededCount(`complete-${recentAdventure.id}`, 1, 8);
    banners.push({
      id: `ambient-complete-${recentAdventure.id}`,
      icon: '👣',
      text: `${recentName} completed ${recentAdventure.title} ${mins} min ago.`,
      kind: 'social',
      priority: 60,
      ttlMs: 9000,
    });
  }

  return banners
    .sort((a, b) => b.priority - a.priority)
    .slice(0, WORLD_EVENT_LIMITS.MAX_AMBIENT_BANNERS);
}

export function buildWorldEventNotifications(adventures = [], options = {}) {
  const { now = Date.now() } = options;
  const notifications = [];
  const legendary = getActiveLegendaryDrop(adventures, now);
  if (legendary) {
    notifications.push({
      id: `notify-${legendary.id}`,
      title: 'Legendary Drop',
      body: `${legendary.title} is live for ${legendary.minutesLeft} more minutes.`,
      icon: '💎',
      kind: 'legendary',
      adventureId: legendary.adventureId,
    });
  }
  return notifications.slice(0, WORLD_EVENT_LIMITS.MAX_NOTIFICATIONS);
}

export function getLivingWorldEventsSnapshot(adventures = [], options = {}) {
  const {
    state = null,
    now = Date.now(),
    eventContext = safeGetWorldEventContext(state, adventures),
  } = options;

  const exploration = applyFogDecay(state?.mapExploration, now);
  const discoveryTrail = buildDiscoveryTrail(state?.mapExploration, now);
  const ambientBanners = buildAmbientActivityBanners(adventures, {
    state,
    now,
    eventContext,
    userRevealed: exploration.revealed,
  });
  const legendaryDrop = getActiveLegendaryDrop(adventures, now);
  const notifications = buildWorldEventNotifications(adventures, { now });
  const nightMode = isNightTime(now);
  const visibleAdventureIds = adventures
    .filter((a) => isAdventureMapVisible(a, { now, eventContext }))
    .map((a) => a.id);

  const fogDecayLevel =
    exploration.revealed.length > 0
      ? exploration.revealed.reduce((sum, r) => sum + (r.fogOpacity || 0), 0) /
        exploration.revealed.length
      : 0;

  const seasonalActiveIds = adventures
    .filter((a) => isSeasonalAdventureActive(a, eventContext, now))
    .map((a) => a.id);

  return {
    exploration,
    discoveryTrail,
    ambientBanners,
    legendaryDrop,
    notifications,
    nightMode,
    visibleAdventureIds,
    seasonalActiveIds,
    fogDecayLevel,
    eventContext,
    now,
  };
}
