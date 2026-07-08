/**
 * Questory V2 — Map-first HUD (progressive disclosure, single focus)
 */
import { HUD_MODE_IDS } from './adaptiveHudEngine.js';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const MAP_FIRST_CONFIG = {
  WHISPER_FADE_MS: 3200,
  WELCOME_PULSE_MS: 3000,
  DECK_CARD_LIMIT: 6,
};

const MODE_FOCUS_ITEM = {
  [HUD_MODE_IDS.WALKING]: 'treasure',
  [HUD_MODE_IDS.DRIVING]: 'city',
  [HUD_MODE_IDS.ADVENTURE]: 'clues',
  [HUD_MODE_IDS.GUILD_WAR]: 'score',
  [HUD_MODE_IDS.WORLD]: null,
};

export function shouldShowExplorerActivity(livingWorld = {}) {
  const nearby = livingWorld.presence?.explorersNearby ?? livingWorld.explorerDots?.length ?? 0;
  const timeline = livingWorld.timeline || [];
  if (nearby > 0) return true;
  if (timeline.length >= 2) return true;
  return timeline.some((entry) => /joined|claimed|found|war|contested/i.test(entry.text || ''));
}

export function filterCardsForMapFirst(cards = [], options = {}) {
  const { livingWorld = {}, mode = HUD_MODE_IDS.WORLD } = options;
  let filtered = [...cards];

  if (!shouldShowExplorerActivity(livingWorld)) {
    filtered = filtered.filter((card) => card.id !== 'explorer');
  }

  if (mode === HUD_MODE_IDS.DRIVING) {
    filtered = filtered.filter((card) => ['earth', 'guild', 'liveHunt'].includes(card.id));
  }

  if (mode === HUD_MODE_IDS.ADVENTURE) {
    filtered = filtered.filter((card) => ['liveHunt', 'explorer'].includes(card.id));
  }

  return filtered;
}

export function resolveMapFirstFocusStrip(strip = [], mode = HUD_MODE_IDS.WORLD) {
  if (!strip?.length) return [];
  const focusId = MODE_FOCUS_ITEM[mode];
  if (!focusId) return [];
  const focus = strip.find((item) => item.id === focusId);
  return focus ? [focus] : [strip[0]];
}

export function resolveCompassFloat(strip = [], mode = HUD_MODE_IDS.WALKING) {
  if (mode !== HUD_MODE_IDS.WALKING) return null;
  const compass = strip.find((item) => item.id === 'compass');
  if (!compass) return null;
  return {
    id: 'compass',
    icon: compass.icon || '🧭',
    label: compass.value || compass.detail || 'Your trail',
    detail: compass.detail,
  };
}

export function getMapFirstHudLayout(options = {}) {
  const {
    mode = HUD_MODE_IDS.WORLD,
    strip = [],
    cards = [],
    livingWorld = {},
    deckOpen = false,
    expandedCardId = null,
  } = options;

  const filteredCards = filterCardsForMapFirst(cards, { livingWorld, mode }).slice(
    0,
    MAP_FIRST_CONFIG.DECK_CARD_LIMIT
  );
  const focusStrip = resolveMapFirstFocusStrip(strip, mode);
  const compassFloat = resolveCompassFloat(strip, mode);
  const showCardDeck = deckOpen || Boolean(expandedCardId);
  const showDeckToggle = !showCardDeck && filteredCards.length > 0;

  return wrapEngineSnapshot({
    mapFirst: true,
    focusStrip,
    focusVisible: focusStrip.length > 0,
    compassFloat,
    compassVisible: Boolean(compassFloat) && !deckOpen,
    filteredCards,
    showCardDeck,
    showDeckToggle,
    deckCardCount: filteredCards.length,
  });
}
