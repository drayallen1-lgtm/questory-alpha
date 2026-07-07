/**
 * Questory V2 — Ambient World Director
 * Game-master whispers on the living world map (not admin-only).
 */
import { getAdventureProgress } from './seed';
import { getAiDirectorSnapshot, DIRECTOR_OPPORTUNITY_TYPES } from './questoryAiDirectorEngine';
import { getFactionSnapshot } from './factionEngine';
import { getLegendaryHuntSnapshot } from './legendaryHuntEngine';
import { getLivingWorldSnapshot } from './livingWorldEngine';
import { getWorldDiscoverySnapshot } from './worldDiscoveryEngine';
import { getDynamicStorySnapshot } from './dynamicStoryEngine';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { safeGetTime } from './dateUtils';

export const AMBIENT_DIRECTOR_LIMITS = {
  MAX_WHISPERS: 6,
  ROTATION_MS: 9000,
};

export const DEFAULT_AMBIENT_DIRECTOR = {
  dismissedIds: [],
  lastWhisperId: null,
  lastSeenAt: null,
};

export const WHISPER_TONES = {
  CURIOUS: 'curious',
  OMINOUS: 'ominous',
  STRATEGIC: 'strategic',
  MYSTERY: 'mystery',
  GUIDE: 'guide',
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function normalizeAmbientDirector(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_AMBIENT_DIRECTOR };
  return {
    dismissedIds: Array.isArray(raw.dismissedIds) ? raw.dismissedIds.slice(0, 24) : [],
    lastWhisperId: raw.lastWhisperId || null,
    lastSeenAt: raw.lastSeenAt || null,
  };
}

function hasRiverExploration(state, adventures = []) {
  const riverAdventures = adventures.filter(
    (adventure) =>
      /river/i.test(adventure.title || '') ||
      /river/i.test(adventure.location || '') ||
      (adventure.latitude != null &&
        adventure.longitude != null &&
        adventure.longitude > -95.255 &&
        adventure.longitude < -95.252)
  );
  if (!riverAdventures.length) return false;
  return riverAdventures.some((adventure) => {
    const progress = getAdventureProgress(state, adventure.id);
    return (progress?.step || 0) > 0 || progress?.claimed;
  });
}

function findNearbyMystery(state, adventures = []) {
  return adventures.find((adventure) => {
    const progress = getAdventureProgress(state, adventure.id);
    return (progress?.step || 0) > 0 && !progress?.claimed;
  });
}

function opportunityToWhisper(opportunity, context = {}) {
  if (!opportunity) return null;

  const map = {
    [DIRECTOR_OPPORTUNITY_TYPES.DISCOVERY]: {
      id: `whisper-director-${opportunity.id}`,
      text: "I've noticed explorers keep drifting toward Lake Parsons — you haven't followed yet.",
      icon: '🧭',
      tone: WHISPER_TONES.CURIOUS,
      priority: 72,
      action: 'map',
      flyTarget: { latitude: 37.334, longitude: -95.258, zoom: 13 },
    },
    [DIRECTOR_OPPORTUNITY_TYPES.FACTION]: {
      id: `whisper-director-${opportunity.id}`,
      text: 'Your guild could take downtown.',
      icon: '⚔',
      tone: WHISPER_TONES.STRATEGIC,
      priority: 80,
      action: 'social',
      actionOptions: { socialTab: 'guild', guildTab: 'wars' },
    },
    [DIRECTOR_OPPORTUNITY_TYPES.GUILD_RALLY]: {
      id: `whisper-director-${opportunity.id}`,
      text: 'Rally your squad — influence is shifting tonight.',
      icon: '🛡️',
      tone: WHISPER_TONES.STRATEGIC,
      priority: 78,
      action: 'social',
      actionOptions: { socialTab: 'guild', guildTab: 'wars' },
    },
    [DIRECTOR_OPPORTUNITY_TYPES.BOSS]: {
      id: `whisper-director-${opportunity.id}`,
      text: 'Ghost activity is rising tonight.',
      icon: '👻',
      tone: WHISPER_TONES.OMINOUS,
      priority: 86,
      action: 'legendary-hunt',
    },
    [DIRECTOR_OPPORTUNITY_TYPES.NPC]: {
      id: `whisper-director-${opportunity.id}`,
      text: "There's an unsolved mystery nearby.",
      icon: '🗺️',
      tone: WHISPER_TONES.MYSTERY,
      priority: 74,
      action: 'map',
      flyTarget: { latitude: 37.338, longitude: -95.2625, zoom: 14 },
    },
    [DIRECTOR_OPPORTUNITY_TYPES.MARKET]: {
      id: `whisper-director-${opportunity.id}`,
      text: 'Merchants are whispering about shifting prices downtown.',
      icon: '🏪',
      tone: WHISPER_TONES.GUIDE,
      priority: 58,
      action: 'marketplace',
      actionOptions: { marketplaceVenueId: 'downtown-market', marketplaceTab: 'featured' },
    },
    [DIRECTOR_OPPORTUNITY_TYPES.CREATOR]: {
      id: `whisper-director-${opportunity.id}`,
      text: 'A creator trail is gaining heat — the Bazaar is buzzing.',
      icon: '✨',
      tone: WHISPER_TONES.GUIDE,
      priority: 56,
      action: 'create',
      actionOptions: { launchStep: 'describe' },
    },
    [DIRECTOR_OPPORTUNITY_TYPES.SEASONAL]: {
      id: `whisper-director-${opportunity.id}`,
      text: 'The season chapter is close — the world is leaning toward a new beat.',
      icon: '📜',
      tone: WHISPER_TONES.GUIDE,
      priority: 54,
      action: 'codex',
    },
  };

  const base = map[opportunity.type];
  if (!base) return null;

  if (opportunity.type === DIRECTOR_OPPORTUNITY_TYPES.FACTION && context.faction?.wars?.[0]) {
    const war = context.faction.wars[0];
    if (war.territoryId !== 'downtown') {
      return {
        ...base,
        text: `Your guild could contest ${war.name}.`,
      };
    }
  }

  return base;
}

export function buildAmbientWhispers(options = {}) {
  const {
    state = null,
    adventures = [],
    director = {},
    faction = {},
    legendaryHunt = {},
    livingWorld = {},
    worldDiscovery = {},
    story = {},
    layerSnapshot = null,
    hudContext = null,
    now = Date.now(),
  } = options;

  const stored = normalizeAmbientDirector(state?.ambientDirector);
  const zoom = hudContext?.zoom ?? layerSnapshot?.zoom ?? 11;
  const whispers = [];

  if (zoom >= 10 && !hasRiverExploration(state, adventures)) {
    whispers.push({
      id: 'whisper-river-unexplored',
      text: "I've noticed you've never explored the river.",
      icon: '🌊',
      tone: WHISPER_TONES.CURIOUS,
      priority: 79,
      action: 'map',
      flyTarget: { latitude: 37.3365, longitude: -95.256, zoom: 13 },
    });
  }

  if (livingWorld.nightMode || legendaryHunt.hasActiveBoss) {
    whispers.push({
      id: 'whisper-ghost-rising',
      text: 'Ghost activity is rising tonight.',
      icon: '👻',
      tone: WHISPER_TONES.OMINOUS,
      priority: 88,
      action: 'legendary-hunt',
    });
  }

  const downtownWar = faction.wars?.find((war) => war.territoryId === 'downtown');
  if (downtownWar || (faction.memberFactionId && faction.contestedCount > 0)) {
    whispers.push({
      id: 'whisper-guild-downtown',
      text: 'Your guild could take downtown.',
      icon: '⚔',
      tone: WHISPER_TONES.STRATEGIC,
      priority: 84,
      action: 'social',
      actionOptions: { socialTab: 'guild', guildTab: 'wars' },
    });
  }

  const mysteryAdventure = findNearbyMystery(state, adventures);
  if (mysteryAdventure) {
    whispers.push({
      id: `whisper-mystery-${mysteryAdventure.id}`,
      text: "There's an unsolved mystery nearby.",
      icon: '🗺️',
      tone: WHISPER_TONES.MYSTERY,
      priority: 83,
      action: 'play',
      adventureId: mysteryAdventure.id,
    });
  }

  const staleArc = (story.arcs || []).find((arc) => arc.status === 'In Progress');
  if (staleArc) {
    whispers.push({
      id: `whisper-arc-${staleArc.arcId}`,
      text: `The story "${staleArc.title}" still has threads left open.`,
      icon: '📖',
      tone: WHISPER_TONES.MYSTERY,
      priority: 70,
      action: 'social',
      actionOptions: { socialTab: 'stories' },
    });
  }

  const fogPct = 100 - (state?.mapExploration?.revealed?.length || 0) * 4;
  if (fogPct > 55 && zoom >= 11) {
    whispers.push({
      id: 'whisper-fog-nearby',
      text: 'Dense fog hides something just off your usual path.',
      icon: '🌫️',
      tone: WHISPER_TONES.CURIOUS,
      priority: 66,
      action: 'map',
    });
  }

  if ((worldDiscovery.overallPct || worldDiscovery.cityPct || 0) < 55) {
    whispers.push({
      id: 'whisper-city-uncharted',
      text: `${worldDiscovery.currentRegion?.label || 'This city'} still has quiet streets waiting.`,
      icon: '🏙️',
      tone: WHISPER_TONES.GUIDE,
      priority: 62,
      action: 'map',
    });
  }

  for (const opportunity of director.opportunities || []) {
    const whisper = opportunityToWhisper(opportunity, { faction, legendaryHunt });
    if (whisper && !whispers.some((entry) => entry.id === whisper.id)) {
      whispers.push(whisper);
    }
  }

  for (const entry of director.timeline || []) {
    if (!entry.text) continue;
    const id = `whisper-timeline-${entry.id}`;
    if (whispers.some((w) => w.id === id)) continue;
    whispers.push({
      id,
      text: entry.text,
      icon: '🎬',
      tone: WHISPER_TONES.GUIDE,
      priority: 52,
      action: null,
    });
  }

  return whispers
    .filter((whisper) => !stored.dismissedIds.includes(whisper.id))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, AMBIENT_DIRECTOR_LIMITS.MAX_WHISPERS);
}

export function resolveActiveWhisper(whispers = [], options = {}) {
  if (!whispers.length) return null;
  const { now = Date.now(), stored = DEFAULT_AMBIENT_DIRECTOR } = options;
  const slot = Math.floor(safeGetTime(now) / AMBIENT_DIRECTOR_LIMITS.ROTATION_MS);
  const index = (slot + hashSeed(stored.lastWhisperId || 'questory')) % whispers.length;
  return whispers[index] || whispers[0];
}

export function isAmbientDirectorVisible(options = {}) {
  const { layerSnapshot = null, hudContext = null, whisperCount = 0 } = options;
  const zoom = hudContext?.zoom ?? layerSnapshot?.zoom ?? 11;
  if (whisperCount <= 0) return false;
  if (layerSnapshot?.fullEarth || layerSnapshot?.earthOverlayVisible) return false;
  return zoom >= 9;
}

export function dismissAmbientWhisper(state, whisperId) {
  const stored = normalizeAmbientDirector(state?.ambientDirector);
  return {
    ...state,
    ambientDirector: {
      ...stored,
      dismissedIds: [...new Set([...stored.dismissedIds, whisperId])].slice(0, 24),
      lastWhisperId: whisperId,
      lastSeenAt: new Date().toISOString(),
    },
  };
}

export function markAmbientWhisperSeen(state, whisperId) {
  const stored = normalizeAmbientDirector(state?.ambientDirector);
  return {
    ...state,
    ambientDirector: {
      ...stored,
      lastWhisperId: whisperId,
      lastSeenAt: new Date().toISOString(),
    },
  };
}

export function getAmbientWorldDirectorSnapshot(options = {}) {
  const {
    state = null,
    adventures = [],
    layerSnapshot = null,
    hudContext = null,
    now = Date.now(),
  } = options;

  const director = options.director || getAiDirectorSnapshot(state, adventures, { now });
  const faction = options.faction || getFactionSnapshot(state, adventures, { now });
  const legendaryHunt =
    options.legendaryHunt || getLegendaryHuntSnapshot(state, adventures, { now });
  const livingWorld =
    options.livingWorld || getLivingWorldSnapshot(adventures, { state, now });
  const worldDiscovery =
    options.worldDiscovery ||
    getWorldDiscoverySnapshot({
      zoom: hudContext?.zoom ?? layerSnapshot?.zoom ?? 11,
      state,
      adventures,
      now,
    });
  const story = options.story || getDynamicStorySnapshot(state, adventures, { now });
  const stored = normalizeAmbientDirector(state?.ambientDirector);

  const whispers = buildAmbientWhispers({
    state,
    adventures,
    director,
    faction,
    legendaryHunt,
    livingWorld,
    worldDiscovery,
    story,
    layerSnapshot,
    hudContext,
    now,
  });

  const activeWhisper = resolveActiveWhisper(whispers, { now, stored });
  const visible = isAmbientDirectorVisible({
    layerSnapshot,
    hudContext,
    whisperCount: whispers.length,
  });

  return wrapEngineSnapshot({
    whispers,
    activeWhisper,
    whisperCount: whispers.length,
    visible,
    rotationMs: AMBIENT_DIRECTOR_LIMITS.ROTATION_MS,
    label: 'World Director',
    className: visible ? 'ambient-director-visible' : 'ambient-director-hidden',
    tone: activeWhisper?.tone || WHISPER_TONES.GUIDE,
  });
}
