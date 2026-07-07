/**
 * Questory V2 — World Experience (analytics hooks, audio hooks, empty states, performance)
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const WORLD_ANALYTICS_EVENTS = {
  MAP_OPEN: 'map_open',
  CARD_EXPAND: 'card_expand',
  CARD_VIEW_ALL: 'card_view_all',
  GUILD_JOIN: 'guild_join',
  ADVENTURE_START: 'adventure_start',
  ADVENTURE_COMPLETE: 'adventure_complete',
  EARTH_ZOOM: 'earth_zoom',
  MARKETPLACE_VISIT: 'marketplace_visit',
  SPONSOR_LAUNCH: 'sponsor_launch',
  DIRECTOR_WHISPER: 'director_whisper',
  DIRECTOR_WHISPER_CLICK: 'director_whisper_click',
  NOTIFICATION_OPEN: 'notification_open',
  WORLD_RECOVERY: 'world_recovery',
};

export const WORLD_AUDIO_EVENTS = {
  TREASURE_FOUND: 'treasureFound',
  GUILD_WAR: 'guildWar',
  MARKETPLACE: 'marketplace',
  NOTIFICATION: 'notification',
  EARTH_PULSE: 'earthPulse',
  DISCOVERY: 'discovery',
  LEGENDARY: 'legendary',
  NPC: 'npc',
  DIRECTOR_WHISPER: 'directorWhisper',
};

export const PERFORMANCE_THRESHOLDS = {
  MAX_HUD_CARDS: 8,
  MAX_VISIBLE_LAYERS: 9,
  MAX_AMBIENT_ANIMATIONS: 14,
  MAX_HUD_REFRESH_MS: 48,
  MAX_MAP_RENDER_MS: 150,
  MAX_WORLD_UPDATE_MS: 80,
  MIN_TOUCH_TARGET_PX: 44,
};

export const DEFAULT_WORLD_ANALYTICS = {
  counters: {},
  lastEventAt: null,
};

export const DEFAULT_WORLD_EXPERIENCE = {
  offlineMode: false,
  lastError: null,
};

const EMPTY_STATE_COPY = {
  explorer: {
    title: 'The city is quiet…',
    body: 'Be the first explorer here.',
    cta: 'Start an adventure',
    action: 'create',
  },
  guild: {
    title: 'No guild joined yet',
    body: 'Find your people.',
    cta: 'Join a guild',
    action: 'social',
    actionOptions: { socialTab: 'guild', guildTab: 'recruitment' },
  },
  marketplace: {
    title: 'Merchants are resting',
    body: 'Downtown will stir when explorers return.',
    cta: 'Browse the map',
    action: 'map',
  },
  liveHunt: {
    title: 'The hunt sleeps',
    body: 'Watch the map pulse — legends awaken without warning.',
    cta: 'Open legendary hunts',
    action: 'legendary-hunt',
  },
  earth: {
    title: 'Earth awaits discovery',
    body: 'Every street you walk shifts the living planet.',
    cta: 'Zoom the world',
    action: 'world',
  },
  creator: {
    title: 'No creator trail yet',
    body: 'Describe an idea — the Director will shape the path.',
    cta: 'Launch an adventure',
    action: 'create',
    actionOptions: { launchStep: 'describe' },
  },
  sponsor: {
    title: 'Downtown is listening',
    body: 'Light up foot traffic with a sponsor hunt.',
    cta: 'Launch a promotion',
    action: 'sponsor',
    actionOptions: { sponsorTab: 'launch' },
  },
};

export function normalizeWorldAnalytics(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_WORLD_ANALYTICS };
  return {
    counters: { ...(raw.counters || {}) },
    lastEventAt: raw.lastEventAt || null,
  };
}

export function trackWorldEvent(state, eventId, payload = {}) {
  const analytics = normalizeWorldAnalytics(state?.worldAnalytics);
  const count = analytics.counters[eventId] || 0;
  return {
    ...state,
    worldAnalytics: {
      ...analytics,
      counters: { ...analytics.counters, [eventId]: count + 1 },
      lastEventAt: new Date().toISOString(),
      lastEventId: eventId,
      lastPayload: payload,
    },
  };
}

export function emitWorldAudio(eventId, payload = {}) {
  if (typeof window === 'undefined') return;
  const bus = window.questoryWorldAudio;
  if (!bus || typeof bus !== 'object') return;
  const handler = bus[eventId];
  if (typeof handler === 'function') {
    try {
      handler(payload);
    } catch {
      /* audio hooks are optional */
    }
  }
}

export function resolveEmptyState(cardId, context = {}) {
  const base = EMPTY_STATE_COPY[cardId];
  if (!base) {
    return {
      title: 'The world is quiet…',
      body: 'Something will stir soon.',
      cta: null,
      action: null,
    };
  }
  if (cardId === 'guild' && context.hasGuild) {
    return {
      title: 'Your guild is holding the line',
      body: 'Rally the squad when territories contest.',
      cta: 'View wars',
      action: 'social',
      actionOptions: { socialTab: 'guild', guildTab: 'wars' },
    };
  }
  return { ...base };
}

export function enrichCardsWithEmptyStates(cards = [], context = {}) {
  return cards.map((card) => {
    const placeholder = card.items?.length === 1 && card.items[0].id === 'empty';
    const genericEmpty =
      card.items?.length === 1 &&
      /no |quiet|nothing|calm/i.test(card.items[0].text || '');
    if (!placeholder && !genericEmpty) return card;

    const story = resolveEmptyState(card.id, context);
    return {
      ...card,
      metricLabel: story.title,
      items: [
        { id: `${card.id}-story`, text: story.body },
        ...(story.cta ? [{ id: `${card.id}-cta`, text: story.cta, action: story.action, actionOptions: story.actionOptions }] : []),
      ],
    };
  });
}

export function assessWorldPerformance(metrics = {}) {
  const warnings = [];
  const {
    hudCardCount = 0,
    visibleLayerCount = 0,
    animationCount = 0,
    hudRefreshMs = 0,
    mapRenderMs = 0,
    worldUpdateMs = 0,
  } = metrics;

  if (hudCardCount > PERFORMANCE_THRESHOLDS.MAX_HUD_CARDS) {
    warnings.push(`HUD shows ${hudCardCount} cards (max ${PERFORMANCE_THRESHOLDS.MAX_HUD_CARDS})`);
  }
  if (visibleLayerCount > PERFORMANCE_THRESHOLDS.MAX_VISIBLE_LAYERS) {
    warnings.push(`Too many visible layers (${visibleLayerCount})`);
  }
  if (animationCount > PERFORMANCE_THRESHOLDS.MAX_AMBIENT_ANIMATIONS) {
    warnings.push(`High animation count (${animationCount})`);
  }
  if (hudRefreshMs > PERFORMANCE_THRESHOLDS.MAX_HUD_REFRESH_MS) {
    warnings.push(`HUD refresh slow (${hudRefreshMs}ms)`);
  }
  if (mapRenderMs > PERFORMANCE_THRESHOLDS.MAX_MAP_RENDER_MS) {
    warnings.push(`Map render slow (${mapRenderMs}ms)`);
  }
  if (worldUpdateMs > PERFORMANCE_THRESHOLDS.MAX_WORLD_UPDATE_MS) {
    warnings.push(`World update slow (${worldUpdateMs}ms)`);
  }

  return {
    healthy: warnings.length === 0,
    warnings,
    thresholds: PERFORMANCE_THRESHOLDS,
  };
}

export function getWorldPerformanceSnapshot(options = {}) {
  const {
    layerSnapshot = null,
    hudCardCount = 0,
    hudRefreshMs = 0,
    mapRenderMs = 0,
    worldUpdateMs = 0,
  } = options;

  const visibleLayerCount = layerSnapshot?.layers
    ? Object.values(layerSnapshot.layers).filter((l) => l?.visible).length
    : 0;
  const animationCount = layerSnapshot?.animations?.activeCount || 0;

  const assessment = assessWorldPerformance({
    hudCardCount,
    visibleLayerCount,
    animationCount,
    hudRefreshMs,
    mapRenderMs,
    worldUpdateMs,
  });

  return wrapEngineSnapshot({
    hudCardCount,
    visibleLayerCount,
    animationCount,
    hudRefreshMs,
    mapRenderMs,
    worldUpdateMs,
    ...assessment,
  });
}

export function normalizeWorldExperience(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_WORLD_EXPERIENCE };
  return {
    offlineMode: Boolean(raw.offlineMode),
    lastError: raw.lastError || null,
  };
}

export function setWorldError(state, message) {
  return {
    ...state,
    worldExperience: {
      ...normalizeWorldExperience(state?.worldExperience),
      lastError: message || getWorldRecoveryMessage(),
    },
  };
}

export function clearWorldError(state) {
  return {
    ...state,
    worldExperience: {
      ...normalizeWorldExperience(state?.worldExperience),
      lastError: null,
    },
  };
}

export function enableWorldOfflineMode(state) {
  return {
    ...state,
    worldExperience: {
      ...normalizeWorldExperience(state?.worldExperience),
      offlineMode: true,
      lastError: null,
    },
  };
}

export function getWorldRecoveryMessage(error = null) {
  if (!error) return "The world couldn't update right now.";
  const message = typeof error === 'string' ? error : error?.message || '';
  if (/network|fetch|offline/i.test(message)) {
    return 'The world is offline — your progress is safe locally.';
  }
  if (/timeout/i.test(message)) {
    return 'The map is taking longer than usual to wake up.';
  }
  return "The world couldn't update right now.";
}
