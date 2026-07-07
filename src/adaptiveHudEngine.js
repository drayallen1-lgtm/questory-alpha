/**
 * Questory V2 — Adaptive HUD
 * Context-aware HUD modes: walking, driving, adventure, guild war, world.
 */
import { getAdventureProgress } from './seed';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const HUD_MODE_IDS = {
  WORLD: 'world',
  WALKING: 'walking',
  DRIVING: 'driving',
  ADVENTURE: 'adventure',
  GUILD_WAR: 'guildWar',
};

export const HUD_MODE_LABELS = {
  [HUD_MODE_IDS.WORLD]: 'World',
  [HUD_MODE_IDS.WALKING]: 'Walking',
  [HUD_MODE_IDS.DRIVING]: 'Driving',
  [HUD_MODE_IDS.ADVENTURE]: 'Adventure',
  [HUD_MODE_IDS.GUILD_WAR]: 'Guild War',
};

const MODE_CARD_PRIORITY = {
  [HUD_MODE_IDS.WORLD]: ['explorer', 'earth', 'liveHunt', 'guild', 'marketplace', 'sponsor', 'creator'],
  [HUD_MODE_IDS.WALKING]: ['liveHunt', 'explorer', 'marketplace', 'guild', 'earth'],
  [HUD_MODE_IDS.DRIVING]: ['earth', 'explorer', 'guild', 'liveHunt'],
  [HUD_MODE_IDS.ADVENTURE]: ['liveHunt', 'explorer'],
  [HUD_MODE_IDS.GUILD_WAR]: ['guild', 'explorer', 'earth', 'liveHunt'],
};

const MODE_CARD_LIMIT = {
  [HUD_MODE_IDS.WORLD]: 7,
  [HUD_MODE_IDS.WALKING]: 4,
  [HUD_MODE_IDS.DRIVING]: 3,
  [HUD_MODE_IDS.ADVENTURE]: 2,
  [HUD_MODE_IDS.GUILD_WAR]: 4,
};

function formatDistanceImperial(meters) {
  if (meters == null || Number.isNaN(meters)) return '—';
  const feet = meters * 3.28084;
  if (feet < 528) return `${Math.round(feet)} ft`;
  return `${(feet / 5280).toFixed(1)} mi`;
}

function resolveActiveAdventure(state, adventures, hudContext = {}) {
  const adventureId =
    hudContext.selectedAdventureId ||
    (state?.screen === 'play' ? state?.selectedAdventureId : null);
  if (!adventureId) return null;
  const adventure = adventures.find((entry) => entry.id === adventureId);
  if (!adventure) return null;
  const progress = getAdventureProgress(state, adventureId);
  return { adventure, progress };
}

export function resolveHudMode(options = {}) {
  const {
    layerSnapshot = null,
    faction = {},
    state = null,
    hudContext = {},
    adventures = [],
  } = options;

  const zoom = hudContext.zoom ?? layerSnapshot?.zoom ?? 11;
  const guildVisible = Boolean(layerSnapshot?.layers?.guild?.visible);
  const contested =
    (faction.contestedCount || 0) > 0 || (faction.wars || []).length > 0;
  const activeAdventure = resolveActiveAdventure(state, adventures, hudContext);

  if (contested && guildVisible && !hudContext.selectedAdventureId) {
    return HUD_MODE_IDS.GUILD_WAR;
  }

  if (
    activeAdventure &&
    (state?.screen === 'play' || activeAdventure.progress.step > 0 || hudContext.adventureFocus)
  ) {
    return HUD_MODE_IDS.ADVENTURE;
  }

  if (zoom < 9 || layerSnapshot?.regionalLevel) {
    return HUD_MODE_IDS.DRIVING;
  }

  if (zoom >= 10 || layerSnapshot?.streetLevel || hudContext.selectedAdventureId) {
    return HUD_MODE_IDS.WALKING;
  }

  return HUD_MODE_IDS.WORLD;
}

export function buildAdaptiveHudStrip(mode, options = {}) {
  const {
    hudContext = {},
    faction = {},
    legendaryHunt = {},
    livingWorld = {},
    worldDiscovery = {},
    activeAdventure = null,
    adventures = [],
  } = options;

  if (mode === HUD_MODE_IDS.WALKING) {
    const treasureLabel = legendaryHunt.hasActiveBoss
      ? legendaryHunt.worldBoss?.name || 'Legendary treasure'
      : 'Scanning for rewards';
    return [
      {
        id: 'treasure',
        icon: legendaryHunt.hasActiveBoss ? '💎' : '🧭',
        label: 'Nearby Treasure',
        value: treasureLabel,
      },
      {
        id: 'compass',
        icon: '🧭',
        label: 'Compass',
        value: worldDiscovery.currentRegion?.label || 'Your trail',
        detail: hudContext.bearing || 'Follow the map pulse',
      },
      {
        id: 'distance',
        icon: '📍',
        label: 'Distance',
        value: formatDistanceImperial(hudContext.distanceM),
        detail: hudContext.selectedAdventureTitle || 'Next stop ahead',
      },
    ];
  }

  if (mode === HUD_MODE_IDS.DRIVING) {
    const nearbyCount = adventures.filter((adventure) => adventure.latitude != null).length;
    return [
      {
        id: 'scan',
        icon: '🛣️',
        label: 'Regional Scan',
        value: `${nearbyCount} adventures`,
        detail: 'Markers enlarged for drive-by play',
      },
      {
        id: 'city',
        icon: '🌆',
        label: 'City',
        value: worldDiscovery.currentRegion?.label || 'Region',
        detail: 'Zoom in when you arrive',
      },
    ];
  }

  if (mode === HUD_MODE_IDS.ADVENTURE && activeAdventure) {
    const { adventure, progress } = activeAdventure;
    const clueCount = adventure.clues?.length || 0;
    const step = Math.min(progress.step || 0, clueCount || 1);
    const minutes = adventure.estimatedMinutes || 25;
    const elapsedPct = clueCount ? Math.round((step / clueCount) * 100) : 0;
    return [
      {
        id: 'clues',
        icon: '🗺️',
        label: 'Clues',
        value: `${step}/${clueCount || '—'}`,
        detail: adventure.clues?.[step]?.title || 'Next clue ready',
      },
      {
        id: 'progress',
        icon: '⏱️',
        label: 'Progress',
        value: `${elapsedPct}%`,
        detail: `${minutes} min trail`,
      },
      {
        id: 'timer',
        icon: '⏳',
        label: 'Timer',
        value: `${Math.max(1, minutes - Math.round((elapsedPct / 100) * minutes))} min`,
        detail: progress.claimed ? 'Claim ready' : 'Keep exploring',
      },
    ];
  }

  if (mode === HUD_MODE_IDS.GUILD_WAR) {
    const war = faction.wars?.[0];
    const territory = faction.focusedTerritory?.areaLabel || war?.name || 'Downtown';
    return [
      {
        id: 'score',
        icon: '⚔',
        label: 'War Score',
        value: war ? `${war.leaderPct || 50}%` : `${faction.contestedCount || 1} active`,
        detail: war ? `${war.leader || '—'} leads` : 'Territories contested',
      },
      {
        id: 'territory',
        icon: '🏳️',
        label: 'Territory',
        value: territory,
        detail: war?.challenger ? `vs ${war.challenger}` : 'Hold the line',
      },
      {
        id: 'squad',
        icon: '🛡️',
        label: 'Squad',
        value: faction.guildRank || faction.memberFaction?.name || 'Guild',
        detail: `${livingWorld.presence?.explorersNearby || 0} nearby`,
      },
    ];
  }

  return [];
}

export function prioritizeHudCards(cards = [], mode = HUD_MODE_IDS.WORLD) {
  const order = MODE_CARD_PRIORITY[mode] || MODE_CARD_PRIORITY[HUD_MODE_IDS.WORLD];
  const limit = MODE_CARD_LIMIT[mode] ?? cards.length;
  const ranked = [...cards].sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
  return ranked.slice(0, limit);
}

export function getAdaptiveHudSnapshot(options = {}) {
  const {
    state = null,
    adventures = [],
    layerSnapshot = null,
    hudContext = {},
    faction = {},
    legendaryHunt = {},
    livingWorld = {},
    worldDiscovery = {},
    cards = [],
  } = options;

  const activeAdventure = resolveActiveAdventure(state, adventures, hudContext);
  const mode = resolveHudMode({
    layerSnapshot,
    faction,
    state,
    hudContext: {
      ...hudContext,
      adventureFocus: Boolean(activeAdventure?.progress?.step),
    },
    adventures,
  });

  const strip = buildAdaptiveHudStrip(mode, {
    hudContext,
    faction,
    legendaryHunt,
    livingWorld,
    worldDiscovery,
    activeAdventure,
    adventures,
  });

  const prioritizedCards = prioritizeHudCards(cards, mode);
  const simplified = mode === HUD_MODE_IDS.DRIVING || mode === HUD_MODE_IDS.ADVENTURE;

  return wrapEngineSnapshot({
    mode,
    label: HUD_MODE_LABELS[mode],
    strip,
    stripVisible: strip.length > 0 && mode !== HUD_MODE_IDS.WORLD,
    cards: prioritizedCards,
    simplified,
    mapMarkerScale: mode === HUD_MODE_IDS.DRIVING ? 1.18 : 1,
    className: `floating-hud--${mode}`,
    mapClassName: mode === HUD_MODE_IDS.DRIVING ? 'map-stage-hud-driving' : '',
  });
}
