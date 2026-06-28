import { getAdventureProgress } from './seed';
import { computeCreatorAnalytics, DEFAULT_CREATOR_ANALYTICS } from './experience';
import { recordNpcDialogueSeen as recordLivingNpcDialogueSeen } from './livingNpcEngine';

export const WEATHER_TYPES = {
  CLEAR: 'clear',
  RAIN: 'rain',
  FOG: 'fog',
  SNOW: 'snow',
  NIGHT: 'night',
};

export const WEATHER_META = {
  clear: { label: 'Clear Skies', icon: '☀️', coinBonus: 0, radiusMultiplier: 1 },
  rain: { label: 'Rain', icon: '🌧', coinBonus: 5, radiusMultiplier: 1.1 },
  fog: { label: 'Fog', icon: '🌫', coinBonus: 0, radiusMultiplier: 1.15 },
  snow: { label: 'Snow', icon: '❄️', coinBonus: 10, radiusMultiplier: 1.05 },
  night: { label: 'Night Mode', icon: '🌙', coinBonus: 15, radiusMultiplier: 0.95 },
};

export const CREATOR_TITLES = [
  { min: 0, id: 'trail_guide', label: 'Trail Guide', icon: '🧭' },
  { min: 250, id: 'story_weaver', label: 'Story Weaver', icon: '📖' },
  { min: 750, id: 'world_builder', label: 'World Builder', icon: '🌍' },
  { min: 2000, id: 'legend_maker', label: 'Legend Maker', icon: '👑' },
  { min: 5000, id: 'questory_master', label: 'Questory Master', icon: '✨' },
];

export const SEED_CITY_EVENTS = [
  {
    id: 'parsons-summer-festival',
    city: 'Parsons',
    title: 'Parsons Summer Festival',
    desc: 'Double coins on downtown hunts this weekend.',
    icon: '🎪',
    bonus: { coinMultiplier: 2, badgeId: 'festival-explorer' },
    endsAt: '2026-08-15T23:59:59',
  },
  {
    id: 'ghost-walk-weekend',
    city: 'Parsons',
    title: 'Ghost Walk Weekend',
    desc: 'Haunted overlays and limited ghost badges.',
    icon: '👻',
    bonus: { coinBonus: 25, badgeId: 'ghost-walker' },
    endsAt: '2026-07-04T23:59:59',
  },
  {
    id: 'heritage-trail-day',
    city: 'Parsons',
    title: 'Heritage Trail Day',
    desc: 'Complete any Parsons Legends hunt for a bonus medallion stamp.',
    icon: '🏛',
    bonus: { coinBonus: 50, badgeId: 'heritage-day' },
    endsAt: '2026-09-01T23:59:59',
  },
];

export const SEASONAL_OVERLAYS = [
  {
    id: 'summer-2026',
    label: 'Summer of Discovery',
    theme: 'sunset',
    desc: 'Golden hour trails and festival energy across Kansas.',
    icon: '🌅',
    badgeId: 'summer-explorer-2026',
  },
  {
    id: 'autumn-2026',
    label: 'Autumn Lore',
    theme: 'harvest',
    desc: 'Fog rolls in. Hidden stories wake along the rails.',
    icon: '🍂',
    badgeId: 'autumn-lore-2026',
  },
];

export const LIMITED_EVENT_BADGES = [
  { id: 'festival-explorer', label: 'Festival Explorer', icon: '🎪', rarity: 'event' },
  { id: 'ghost-walker', label: 'Ghost Walker', icon: '👻', rarity: 'event' },
  { id: 'heritage-day', label: 'Heritage Keeper', icon: '🏛', rarity: 'event' },
  { id: 'summer-explorer-2026', label: 'Summer Explorer', icon: '🌅', rarity: 'seasonal' },
  { id: 'lantern-finder', label: 'Lantern Finder', icon: '🏮', rarity: 'ultra_rare' },
  { id: 'midnight-conductor', label: 'Midnight Conductor', icon: '🚂', rarity: 'ultra_rare' },
];

export const HIDDEN_DISCOVERIES = [
  {
    id: 'depot-lantern',
    title: 'Hidden Lantern',
    desc: 'A flickering lantern appears only during fog at Union Depot.',
    icon: '🏮',
    badgeId: 'lantern-finder',
    unlockAdventureId: null,
    hint: 'Visit Union Depot Ghost during foggy weather.',
    linkedAdventureId: 'union-depot-ghost',
  },
  {
    id: 'black-lantern-whisper',
    title: 'Black Lantern Signal',
    desc: 'Ultra-rare whisper heard near the Neosho crossing.',
    icon: '🏮',
    badgeId: 'midnight-conductor',
    unlockAdventureId: 'neosho-legend',
    hint: 'Complete two Parsons hunts, then check the World tab.',
    requiresCompleted: 2,
  },
];

export const SECRET_COLLECTIONS = [
  {
    id: 'parsons-shadows',
    name: 'Parsons Shadows',
    desc: 'Secret medallions only found during world events.',
    badgeLabel: 'Shadow Keeper',
    requiredDiscoveries: ['depot-lantern', 'black-lantern-whisper'],
  },
];

export const SEED_NPCS = [
  {
    id: 'conductor-ghost',
    name: 'The Conductor',
    role: 'Story Guide',
    avatar: '🎩',
    adventureIds: ['union-depot-ghost'],
    voiceNoteUrl: '',
    dialogues: [
      {
        id: 'intro',
        text: 'The rails remember every soul who passed through. Listen — the benches hold a number.',
        mood: 'mysterious',
      },
      {
        id: 'branch',
        text: 'Brave the platform shadows, or search the archives. Your path chooses your ending.',
        mood: 'warning',
      },
    ],
  },
  {
    id: 'grandpa-joe',
    name: 'Grandpa Joe',
    role: 'Family Guide',
    avatar: '👴',
    adventureIds: ['iron-horse'],
    voiceNoteUrl: '',
    dialogues: [
      {
        id: 'intro',
        text: 'I hid something where the iron horse last stopped. Work together — family finds faster.',
        mood: 'warm',
      },
    ],
  },
  {
    id: 'heritage-curator',
    name: 'Heritage Curator',
    role: 'City Lorekeeper',
    avatar: '🏛',
    adventureIds: ['parsons-gold-rush'],
    dialogues: [
      {
        id: 'intro',
        text: 'Parsons holds more secrets than the ledger reveals. Return each season — the world changes.',
        mood: 'scholarly',
      },
    ],
  },
];

export const SEASON_NARRATIVES = [
  {
    id: '2026-summer',
    title: 'The Rails Remember',
    chapters: [
      { id: 'ch1', title: 'Whispers at the Depot', body: 'A conductor\'s ghost walks again. Three cities report lantern sightings.' },
      { id: 'ch2', title: 'The Black Lantern Moves', body: 'Legend says the lantern hops cities. Explorers who find it unlock a roaming hunt.' },
      { id: 'ch3', title: 'Founders Return', body: 'What was lost may yet be found — if the world reveals its hidden paths.' },
    ],
  },
];

export const GLOBAL_LORE_EVENTS = [
  {
    id: 'lantern-sighting',
    title: 'Lantern Sighted in Parsons',
    body: 'Players report a black lantern near the depot. The world feels alive.',
    icon: '🏮',
    activeUntil: '2026-12-31T23:59:59',
  },
  {
    id: 'summer-festival-live',
    title: 'Summer Festival Live',
    body: 'Double coins on downtown hunts through August.',
    icon: '🎪',
    activeUntil: '2026-08-15T23:59:59',
  },
];

export const DEFAULT_WORLD = {
  activeWeather: WEATHER_TYPES.CLEAR,
  weatherOverride: null,
  joinedEventIds: [],
  limitedBadgesEarned: [],
  activeBonuses: [],
  npcProgress: {},
  discoveriesFound: [],
  unlockedAdventureIds: [],
  secretCollectionProgress: {},
  seasonNarrativeChapter: 0,
  loreEventsSeen: [],
  lastWeatherChange: null,
  eventCompletions: {},
  eventRelicsEarned: [],
  worldNotificationsSeen: [],
  communityMilestonesSeen: [],
};

export function normalizeWorld(world = {}) {
  return {
    ...DEFAULT_WORLD,
    ...world,
    joinedEventIds: Array.isArray(world.joinedEventIds) ? world.joinedEventIds : [],
    limitedBadgesEarned: Array.isArray(world.limitedBadgesEarned) ? world.limitedBadgesEarned : [],
    activeBonuses: Array.isArray(world.activeBonuses) ? world.activeBonuses : [],
    discoveriesFound: Array.isArray(world.discoveriesFound) ? world.discoveriesFound : [],
    unlockedAdventureIds: Array.isArray(world.unlockedAdventureIds) ? world.unlockedAdventureIds : [],
    loreEventsSeen: Array.isArray(world.loreEventsSeen) ? world.loreEventsSeen : [],
    eventCompletions:
      world.eventCompletions && typeof world.eventCompletions === 'object' ? world.eventCompletions : {},
    eventRelicsEarned: Array.isArray(world.eventRelicsEarned) ? world.eventRelicsEarned : [],
    worldNotificationsSeen: Array.isArray(world.worldNotificationsSeen)
      ? world.worldNotificationsSeen
      : [],
    communityMilestonesSeen: Array.isArray(world.communityMilestonesSeen)
      ? world.communityMilestonesSeen
      : [],
    npcProgress:
      world.npcProgress && typeof world.npcProgress === 'object' ? world.npcProgress : {},
    secretCollectionProgress:
      world.secretCollectionProgress && typeof world.secretCollectionProgress === 'object'
        ? world.secretCollectionProgress
        : {},
  };
}

export function normalizeWorldConfig(config = {}) {
  return {
    branchingEnabled: Boolean(config.branchingEnabled),
    alternateEndings: Array.isArray(config.alternateEndings) ? config.alternateEndings : [],
    npcs: Array.isArray(config.npcs) ? config.npcs : [],
    hiddenDiscoveryIds: Array.isArray(config.hiddenDiscoveryIds) ? config.hiddenDiscoveryIds : [],
    unlockRequirement: config.unlockRequirement || null,
    worldEventTags: Array.isArray(config.worldEventTags) ? config.worldEventTags : [],
    pathFinaleVariants:
      config.pathFinaleVariants && typeof config.pathFinaleVariants === 'object'
        ? config.pathFinaleVariants
        : {},
  };
}

export function normalizeBranchOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((o) => ({
    id: o.id,
    label: o.label,
    pathId: o.pathId,
  }));
}

export function mergeAdventureWorld(adventure) {
  const worldConfig = normalizeWorldConfig(adventure.worldConfig || adventure.world_config || {});
  return {
    ...adventure,
    worldConfig,
    clues: (adventure.clues || []).map((clue) => ({
      ...clue,
      branchOptions: normalizeBranchOptions(clue.branchOptions || clue.branch_options),
    })),
  };
}

import { getEffectiveWeather, getWorldEventContext } from './worldEventEngine';

export function getDemoWeather(state, adventures = []) {
  const world = normalizeWorld(state?.world);
  if (world.weatherOverride) return world.weatherOverride;
  const hour = new Date().getHours();
  let base = world.activeWeather || WEATHER_TYPES.CLEAR;
  if (hour >= 20 || hour < 6) base = WEATHER_TYPES.NIGHT;
  else {
    const day = new Date().getDate();
    if (day % 7 === 0) base = WEATHER_TYPES.FOG;
    else if (day % 5 === 0) base = WEATHER_TYPES.RAIN;
    else if (day % 11 === 0) base = WEATHER_TYPES.SNOW;
  }
  const context = getWorldEventContext(state, adventures);
  return getEffectiveWeather(state, base, context);
}

export function getWeatherEffects(weather) {
  return WEATHER_META[weather] || WEATHER_META.clear;
}

export function applyWeatherRadius(baseMeters, weather) {
  const meta = getWeatherEffects(weather);
  return Math.round(baseMeters * meta.radiusMultiplier);
}

export function getActiveSeasonalOverlay() {
  const month = new Date().getMonth();
  return month >= 5 && month <= 8 ? SEASONAL_OVERLAYS[0] : SEASONAL_OVERLAYS[1];
}

export function getCityEventsForCity(city) {
  const normalized = String(city || '').trim().toLowerCase();
  return SEED_CITY_EVENTS.filter((e) => e.city.toLowerCase() === normalized);
}

export function joinCityEvent(state, eventId) {
  const world = normalizeWorld(state.world);
  if (world.joinedEventIds.includes(eventId)) {
    return { ok: false, message: 'Already joined this event.', state };
  }
  const event = SEED_CITY_EVENTS.find((e) => e.id === eventId);
  if (!event) return { ok: false, message: 'Event not found.', state };
  const nextWorld = normalizeWorld({
    ...world,
    joinedEventIds: [...world.joinedEventIds, eventId],
    activeBonuses: [
      ...world.activeBonuses,
      { id: event.id, type: 'city_event', bonus: event.bonus, joinedAt: new Date().toISOString() },
    ],
  });
  return {
    ok: true,
    message: `Joined ${event.title}! Bonuses active.`,
    state: { ...state, world: nextWorld },
  };
}

export function claimEventBadge(state, badgeId) {
  const world = normalizeWorld(state.world);
  if (world.limitedBadgesEarned.includes(badgeId)) {
    return { ok: false, message: 'Badge already earned.', state };
  }
  const badge = LIMITED_EVENT_BADGES.find((b) => b.id === badgeId);
  if (!badge) return { ok: false, message: 'Badge not found.', state };
  return {
    ok: true,
    message: `Earned ${badge.label}!`,
    state: {
      ...state,
      world: normalizeWorld({
        ...world,
        limitedBadgesEarned: [...world.limitedBadgesEarned, badgeId],
      }),
    },
  };
}

export function setWeatherOverride(state, weather) {
  return {
    ...state,
    world: normalizeWorld({
      ...normalizeWorld(state.world),
      weatherOverride: weather,
      lastWeatherChange: new Date().toISOString(),
    }),
  };
}

export function getNpcsForAdventure(adventure) {
  const config = normalizeWorldConfig(adventure?.worldConfig);
  const embedded = config.npcs || [];
  const global = SEED_NPCS.filter(
    (npc) =>
      npc.adventureIds?.includes(adventure?.id) &&
      !embedded.some((e) => e.id === npc.id)
  );
  return [...embedded, ...global];
}

export function getNpcDialogue(npc, dialogueId = 'intro') {
  const dialogues = npc?.dialogues || [];
  return dialogues.find((d) => d.id === dialogueId) || dialogues[0] || null;
}

export function markNpcDialogueSeen(state, npcId, dialogueId, adventureId) {
  return recordLivingNpcDialogueSeen(state, npcId, dialogueId, adventureId);
}

export function selectBranchPath(state, adventureId, pathId, clueIndex) {
  const progress = getAdventureProgress(state, adventureId);
  return {
    ...state,
    progress: {
      ...state.progress,
      [adventureId]: {
        ...progress,
        pathId,
        branchChoices: { ...(progress.branchChoices || {}), [clueIndex]: pathId },
      },
    },
  };
}

export function resolveAdventureEnding(adventure, progress) {
  const config = normalizeWorldConfig(adventure.worldConfig);
  if (!config.branchingEnabled || !progress.pathId) {
    return { id: 'default', title: adventure.title, pathId: null };
  }
  const ending =
    config.alternateEndings.find((e) => e.pathId === progress.pathId) ||
    config.alternateEndings[0];
  return ending || { id: 'default', title: adventure.title, pathId: progress.pathId };
}

export function applyEndingRewards(adventure, progress) {
  const ending = resolveAdventureEnding(adventure, progress);
  if (!ending?.medallionTitle && !ending?.bonusCoins) return adventure;
  const rewards = [...(adventure.finalRewards || [])];
  if (rewards.length && ending.medallionTitle) {
    rewards[0] = {
      ...rewards[0],
      title: ending.medallionTitle,
      desc: ending.description || rewards[0].desc,
    };
  }
  return { ...adventure, finalRewards: rewards, resolvedEnding: ending };
}

export function isAdventureUnlocked(state, adventure) {
  const req = adventure?.worldConfig?.unlockRequirement;
  if (!req) return true;
  const world = normalizeWorld(state.world);
  if (req.type === 'discovery') {
    return world.discoveriesFound.includes(req.discoveryId);
  }
  if (req.type === 'adventures_completed') {
    return (state.engagement?.adventuresCompleted || 0) >= (req.count || 1);
  }
  return world.unlockedAdventureIds.includes(adventure.id);
}

export function attemptDiscovery(state, discoveryId, context = {}) {
  const world = normalizeWorld(state.world);
  if (world.discoveriesFound.includes(discoveryId)) {
    return { ok: false, message: 'Already discovered.', state };
  }
  const discovery = HIDDEN_DISCOVERIES.find((d) => d.id === discoveryId);
  if (!discovery) return { ok: false, message: 'Unknown discovery.', state };

  if (discovery.requiresCompleted != null) {
    const completed = state.engagement?.adventuresCompleted || 0;
    if (completed < discovery.requiresCompleted) {
      return {
        ok: false,
        message: `Complete ${discovery.requiresCompleted} adventures first.`,
        state,
      };
    }
  }

  if (discovery.linkedAdventureId && context.weather) {
    if (discovery.id === 'depot-lantern' && context.weather !== WEATHER_TYPES.FOG) {
      return { ok: false, message: 'The lantern only appears in fog. Check the Weather tab.', state };
    }
  }

  let next = {
    ...state,
    world: normalizeWorld({
      ...world,
      discoveriesFound: [...world.discoveriesFound, discoveryId],
      unlockedAdventureIds: discovery.unlockAdventureId
        ? [...world.unlockedAdventureIds, discovery.unlockAdventureId]
        : world.unlockedAdventureIds,
    }),
  };

  if (discovery.badgeId) {
    const badgeResult = claimEventBadge(next, discovery.badgeId);
    if (badgeResult.ok) next = badgeResult.state;
  }

  return {
    ok: true,
    message: `Discovery unlocked: ${discovery.title}!`,
    discovery,
    state: next,
  };
}

export function computeCreatorPrestigeScore(adventures, creatorId) {
  const creatorAdventures = adventures.filter(
    (a) => a.creatorProfileId === creatorId || a.creatorId === creatorId
  );
  if (!creatorAdventures.length) return 0;
  return creatorAdventures.reduce((sum, a) => {
    const completions = a.playersCompleted || 0;
    const rating = a.avgRating || 4;
    const heat = a.heatScore || 0;
    const verified = a.experienceSettings?.creatorVerified ? 200 : 0;
    return sum + completions * 10 + rating * 50 + heat * 2 + verified;
  }, 0);
}

export function getCreatorTitle(score) {
  let title = CREATOR_TITLES[0];
  for (const t of CREATOR_TITLES) {
    if (score >= t.min) title = t;
  }
  return title;
}

export function getFeaturedCreators(adventures) {
  const byCreator = {};
  adventures.forEach((a) => {
    const id = a.creatorProfileId || a.creatorId || 'unknown';
    if (!byCreator[id]) {
      byCreator[id] = { id, adventures: [], score: 0 };
    }
    byCreator[id].adventures.push(a);
  });
  return Object.values(byCreator)
    .map((c) => ({ ...c, score: computeCreatorPrestigeScore(adventures, c.id) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function getDropOffReport(adventure, state) {
  const analytics = adventure.creatorAnalytics || DEFAULT_CREATOR_ANALYTICS;
  const failRates = analytics.clueFailRates || {};
  const clues = adventure.clues || [];
  const drops = clues.map((clue, index) => ({
    clueIndex: index,
    title: clue.title || `Clue ${index + 1}`,
    failRate: failRates[index] ?? failRates[String(index)] ?? 0,
    severity:
      (failRates[index] ?? failRates[String(index)] ?? 0) >= 0.7
        ? 'high'
        : (failRates[index] ?? failRates[String(index)] ?? 0) >= 0.4
          ? 'medium'
          : 'low',
  }));
  const worst = [...drops].sort((a, b) => b.failRate - a.failRate)[0];
  return {
    drops,
    worstClue: worst?.failRate > 0 ? worst : null,
    completionRate: analytics.completionRate || 0,
    avgMinutes: analytics.avgCompletionMinutes || 0,
  };
}

export function getCreatorRecommendations(adventure) {
  const analytics = adventure.creatorAnalytics || DEFAULT_CREATOR_ANALYTICS;
  const report = getDropOffReport(adventure, {});
  const recs = [];

  if (report.worstClue && report.worstClue.failRate >= 0.5) {
    recs.push({
      id: 'drop-off',
      priority: 'high',
      text: `Clue "${report.worstClue.title}" loses ${Math.round(report.worstClue.failRate * 100)}% of players — add a partial hint or widen GPS radius.`,
    });
  }
  if (analytics.completionRate > 0 && analytics.completionRate < 0.35) {
    recs.push({
      id: 'completion',
      priority: 'high',
      text: 'Completion rate is below 35%. Consider a Smart Builder backyard scale test walk.',
    });
  }
  if (analytics.hintUsageRate > 0.6) {
    recs.push({
      id: 'hints',
      priority: 'medium',
      text: 'High hint usage — clues may be too cryptic for the chosen scale.',
    });
  }
  if ((adventure.worldConfig?.npcs?.length || 0) === 0) {
    recs.push({
      id: 'npc',
      priority: 'low',
      text: 'Add an NPC story guide to increase emotional engagement and return visits.',
    });
  }
  if (!adventure.worldConfig?.branchingEnabled) {
    recs.push({
      id: 'branch',
      priority: 'low',
      text: 'Branching paths can boost replay value — try alternate endings on your next hunt.',
    });
  }
  return recs;
}

export function getActiveNarrative() {
  return SEASON_NARRATIVES[0];
}

export function getLoreBanners(state) {
  const world = normalizeWorld(state?.world);
  return GLOBAL_LORE_EVENTS.filter((e) => !world.loreEventsSeen.includes(e.id));
}

export function markLoreSeen(state, loreId) {
  const world = normalizeWorld(state.world);
  if (world.loreEventsSeen.includes(loreId)) return state;
  return {
    ...state,
    world: normalizeWorld({
      ...world,
      loreEventsSeen: [...world.loreEventsSeen, loreId],
    }),
  };
}

export function advanceNarrativeChapter(state) {
  const narrative = getActiveNarrative();
  const world = normalizeWorld(state.world);
  const next = Math.min(world.seasonNarrativeChapter + 1, narrative.chapters.length - 1);
  return {
    ...state,
    world: normalizeWorld({ ...world, seasonNarrativeChapter: next }),
  };
}

export function getSecretCollectionProgress(state) {
  const world = normalizeWorld(state.world);
  return SECRET_COLLECTIONS.map((col) => {
    const found = col.requiredDiscoveries.filter((id) => world.discoveriesFound.includes(id)).length;
    return {
      ...col,
      found,
      total: col.requiredDiscoveries.length,
      pct: Math.round((found / col.requiredDiscoveries.length) * 100),
      complete: found >= col.requiredDiscoveries.length,
    };
  });
}

export function getActiveEventBonuses(state) {
  const world = normalizeWorld(state.world);
  return world.activeBonuses.filter((b) => world.joinedEventIds.includes(b.id));
}

export function getCoinBonusForWeather(state, adventure) {
  const weather = getDemoWeather(state);
  const meta = getWeatherEffects(weather);
  let bonus = meta.coinBonus || 0;
  getActiveEventBonuses(state).forEach((b) => {
    bonus += b.bonus?.coinBonus || 0;
  });
  const cityEvents = getCityEventsForCity(adventure?.city);
  const world = normalizeWorld(state.world);
  cityEvents.forEach((e) => {
    if (world.joinedEventIds.includes(e.id)) {
      bonus += e.bonus?.coinBonus || 0;
    }
  });
  return bonus;
}
