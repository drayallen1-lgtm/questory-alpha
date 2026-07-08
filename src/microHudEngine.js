/**
 * Questory V3 — Micro HUD chips (compact, auto-hide, expand on tap)
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { NOTIFICATION_PRIORITY } from './smartNotificationEngine.js';

export const MICRO_CHIP_TTL_MS = 12_000;
export const MAX_MICRO_CHIPS = 2;

const CHIP_PRIORITY = {
  legendary: 0,
  auction: 1,
  guild: 2,
  market: 3,
  whisper: 4,
  adventure: 5,
};

export function buildLegendaryChip(legendaryHunt = {}) {
  if (!legendaryHunt.hasActiveBoss) return null;
  const boss = legendaryHunt.worldBoss;
  return {
    id: 'legendary',
    icon: '💎',
    shortLabel: boss?.name?.split(' ').slice(-2).join(' ') || 'Drop',
    expandedTitle: boss?.name || 'Legendary Drop',
    expandedBody: legendaryHunt.alerts?.[0]?.text || 'A legendary hunt is live nearby.',
    action: 'legendary-hunt',
    priority: CHIP_PRIORITY.legendary,
    ttlMs: MICRO_CHIP_TTL_MS,
  };
}

export function buildAuctionChip(marketplace = {}) {
  const ending = (marketplace.endingSoon || marketplace.auctions || []).find(
    (a) => a.endingSoon
  );
  if (!ending) return null;
  return {
    id: 'auction',
    icon: '🔨',
    shortLabel: 'Auction',
    expandedTitle: 'Auction ending',
    expandedBody: `${ending.name || ending.itemId} — bids closing soon.`,
    action: 'marketplace',
    venueId: 'legendary-auction',
    marketplaceTab: 'auctions',
    priority: CHIP_PRIORITY.auction,
    ttlMs: MICRO_CHIP_TTL_MS,
  };
}

export function buildGuildChip(faction = {}) {
  const war = faction.wars?.[0];
  if (!war && !(faction.contestedCount > 0)) return null;
  return {
    id: 'guild',
    icon: '⚔',
    shortLabel: 'War',
    expandedTitle: war?.name || 'Territory contested',
    expandedBody: war
      ? `${war.leader || '—'} leads · ${war.leaderPct || 50}%`
      : `${faction.contestedCount} territories active`,
    action: 'social',
    actionOptions: { socialTab: 'guild', guildTab: 'wars' },
    priority: CHIP_PRIORITY.guild,
    ttlMs: MICRO_CHIP_TTL_MS,
  };
}

export function buildMarketChip(marketplace = {}) {
  const live =
    (marketplace.auctions?.length || 0) + (marketplace.listings?.length || 0);
  if (live <= 0) return null;
  return {
    id: 'market',
    icon: '🏪',
    shortLabel: 'Market',
    expandedTitle: 'Market nearby',
    expandedBody: `${live} live listings downtown.`,
    action: 'map',
    venueId: 'downtown-market',
    marketplaceTab: 'featured',
    priority: CHIP_PRIORITY.market,
    ttlMs: MICRO_CHIP_TTL_MS,
  };
}

export function buildWhisperChip(whisper = null) {
  if (!whisper?.text) return null;
  const short =
    whisper.text.length > 28 ? `${whisper.text.slice(0, 26)}…` : whisper.text;
  return {
    id: `whisper-${whisper.id}`,
    icon: whisper.icon || '👻',
    shortLabel: short,
    expandedTitle: 'World whisper',
    expandedBody: whisper.text,
    action: whisper.action || 'map',
    adventureId: whisper.adventureId,
    priority: CHIP_PRIORITY.whisper,
    ttlMs: 8000,
  };
}

export function resolveMicroHudChips(options = {}) {
  const {
    legendaryHunt = {},
    marketplace = {},
    faction = {},
    whisper = null,
    notifications = [],
    mode = 'world',
  } = options;

  const candidates = [
    buildLegendaryChip(legendaryHunt),
    buildAuctionChip(marketplace),
    buildGuildChip(faction),
    mode !== 'driving' && mode !== 'adventure' ? buildMarketChip(marketplace) : null,
    buildWhisperChip(whisper),
  ].filter(Boolean);

  for (const note of notifications) {
    if (note.priority === NOTIFICATION_PRIORITY.CRITICAL && note.kind === 'legendary') {
      candidates.push({
        id: `alert-${note.id}`,
        icon: note.icon || '⚠',
        shortLabel: note.title || 'Alert',
        expandedTitle: note.title,
        expandedBody: note.text,
        action: note.action,
        priority: CHIP_PRIORITY.legendary - 1,
        ttlMs: MICRO_CHIP_TTL_MS,
      });
    }
  }

  const chips = [...candidates]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_MICRO_CHIPS);

  return wrapEngineSnapshot({
    chips,
    visible: chips.length > 0,
    chipCount: chips.length,
  });
}
