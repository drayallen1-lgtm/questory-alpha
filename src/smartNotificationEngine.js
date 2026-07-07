/**
 * Questory V2 — Smart Notification Engine
 * Priority-ranked world notifications with quiet background stacking.
 */
import { REWARD_STATUS, isRedeemable } from './seed';
import { getLivingWorldSnapshot } from './livingWorldEngine';
import { getMarketplaceSnapshot } from './marketplaceEngine';
import { getFactionSnapshot } from './factionEngine';
import { getLegendaryHuntSnapshot } from './legendaryHuntEngine';
import { getSocialDiscoverySnapshot } from './socialWorldEngine';
import { buildWorldEventNotifications } from './livingWorldEventsEngine';
import { minutesUntilGuildWar } from './livingCityEngine';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const NOTIFICATION_PRIORITY = {
  CRITICAL: 'critical',
  ADVENTURE: 'adventure',
  NEARBY: 'nearby',
  BACKGROUND: 'background',
};

const PRIORITY_RANK = {
  [NOTIFICATION_PRIORITY.CRITICAL]: 0,
  [NOTIFICATION_PRIORITY.ADVENTURE]: 1,
  [NOTIFICATION_PRIORITY.NEARBY]: 2,
  [NOTIFICATION_PRIORITY.BACKGROUND]: 3,
};

function stableHash(input = '') {
  return String(input)
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

export function normalizeSmartNotification(raw = {}) {
  const priority = raw.priority || NOTIFICATION_PRIORITY.BACKGROUND;
  return {
    id: raw.id || `notif-${priority}-${Date.now()}`,
    priority,
    title: raw.title || '',
    text: raw.text || raw.body || '',
    icon: raw.icon || '🔔',
    minutesLeft: raw.minutesLeft ?? null,
    action: raw.action || null,
    kind: raw.kind || priority,
    createdAt: raw.createdAt ?? Date.now(),
    urgency: raw.urgency ?? PRIORITY_RANK[priority] ?? 3,
  };
}

export function compareNotifications(a, b) {
  const rankA = PRIORITY_RANK[a.priority] ?? 9;
  const rankB = PRIORITY_RANK[b.priority] ?? 9;
  if (rankA !== rankB) return rankA - rankB;
  if (a.minutesLeft != null && b.minutesLeft != null) return a.minutesLeft - b.minutesLeft;
  return (b.urgency ?? 0) - (a.urgency ?? 0);
}

export function partitionNotificationStack(notifications = []) {
  const sorted = [...notifications].sort(compareNotifications);
  const prominent = sorted.filter((n) => n.priority !== NOTIFICATION_PRIORITY.BACKGROUND).slice(0, 2);
  const stacked = sorted.filter((n) => n.priority === NOTIFICATION_PRIORITY.BACKGROUND);
  return { sorted, prominent, stacked };
}

function buildTreasureExpiryNotifications(state, now = Date.now()) {
  const rewards = (state?.rewards || []).filter(
    (r) => isRedeemable(r) && r.status === REWARD_STATUS.ACTIVE && r.expiresAt
  );
  return rewards
    .map((reward) => {
      const msLeft = new Date(reward.expiresAt).getTime() - now;
      const minutesLeft = Math.ceil(msLeft / 60000);
      if (minutesLeft <= 0 || minutesLeft > 45) return null;
      return normalizeSmartNotification({
        id: `treasure-exp-${reward.id}`,
        priority: NOTIFICATION_PRIORITY.CRITICAL,
        title: 'Treasure expiring',
        text: `Treasure expires in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}`,
        icon: '⏳',
        minutesLeft,
        action: 'vault',
        urgency: 100 - minutesLeft,
      });
    })
    .filter(Boolean);
}

function buildLegendaryCriticalNotifications(adventures, now) {
  return buildWorldEventNotifications(adventures, { now }).map((note) =>
    normalizeSmartNotification({
      id: note.id,
      priority: NOTIFICATION_PRIORITY.CRITICAL,
      title: note.title,
      text: note.body,
      icon: note.icon || '💎',
      action: 'legendary-hunt',
      kind: note.kind || 'legendary',
      urgency: 90,
    })
  );
}

function buildAuctionCriticalNotifications(marketplace) {
  return (marketplace.endingSoon || []).slice(0, 2).map((auction) =>
    normalizeSmartNotification({
      id: `auction-${auction.id}`,
      priority: NOTIFICATION_PRIORITY.CRITICAL,
      title: 'Auction ending',
      text: `${auction.name || auction.itemId} ends in ${auction.minutesLeft || 'a few'} minutes`,
      icon: '🔨',
      minutesLeft: auction.minutesLeft,
      action: 'marketplace',
      urgency: 85,
    })
  );
}

function buildAdventureNotifications(legendaryHunt, livingWorld) {
  const items = [];
  for (const alert of (legendaryHunt.alerts || []).slice(0, 2)) {
    items.push(
      normalizeSmartNotification({
        id: alert.id,
        priority: NOTIFICATION_PRIORITY.ADVENTURE,
        title: alert.title || 'Live hunt',
        text: alert.text || alert.body || alert.title,
        icon: alert.icon || '⚠️',
        action: 'legendary-hunt',
        kind: 'legendary',
        urgency: 80,
      })
    );
  }
  const hot = (livingWorld.timeline || []).find((e) => e.kind === 'heat' || e.kind === 'start');
  if (hot) {
    items.push(
      normalizeSmartNotification({
        id: `adventure-${hot.id}`,
        priority: NOTIFICATION_PRIORITY.ADVENTURE,
        title: 'Adventure heating up',
        text: hot.text || hot.label,
        icon: '🔥',
        action: 'map',
        urgency: 70,
      })
    );
  }
  return items;
}

function buildNearbyNotifications(livingWorld, faction, socialToasts, now) {
  const items = [];
  const dots = livingWorld.explorerDots || [];
  if (dots.length) {
    const feet = 40 + (stableHash(dots[0].id || dots[0].name || 'x') % 120);
    items.push(
      normalizeSmartNotification({
        id: 'nearby-explorer-distance',
        priority: NOTIFICATION_PRIORITY.NEARBY,
        title: 'Explorer nearby',
        text: `Explorer ${feet} feet away`,
        icon: '👣',
        action: 'social',
        urgency: 75,
      })
    );
  }

  for (const toast of socialToasts.slice(0, 2)) {
    if (toast.kind === 'nearby' || toast.kind === 'race') {
      items.push(
        normalizeSmartNotification({
          id: toast.id,
          priority: NOTIFICATION_PRIORITY.NEARBY,
          title: toast.title,
          text: toast.body || toast.text,
          icon: toast.icon || '🔥',
          action: toast.kind === 'race' ? 'map' : 'social',
          kind: toast.kind,
          urgency: 68,
        })
      );
    }
  }

  const war = faction.wars?.[0];
  if (war) {
    const mins = minutesUntilGuildWar(war.territoryId, now);
    items.push(
      normalizeSmartNotification({
        id: `guild-war-soon-${war.territoryId}`,
        priority: NOTIFICATION_PRIORITY.NEARBY,
        title: 'Territory war',
        text: `Guild war begins in ${mins} minute${mins === 1 ? '' : 's'}`,
        icon: '⚔',
        action: 'social',
        minutesLeft: mins,
        urgency: 72,
      })
    );
  }

  return items;
}

function buildBackgroundNotifications(marketplace, livingWorld, faction) {
  const items = [];
  for (const entry of (marketplace.activityFeed || []).slice(0, 4)) {
    items.push(
      normalizeSmartNotification({
        id: `market-${entry.id}`,
        priority: NOTIFICATION_PRIORITY.BACKGROUND,
        title: 'Marketplace',
        text: entry.text || 'Market prices updated',
        icon: entry.icon || '🏪',
        action: 'marketplace',
        kind: 'market',
        urgency: 30,
      })
    );
  }

  for (const entry of (livingWorld.timeline || []).slice(0, 2)) {
    if (entry.kind === 'faction' || entry.kind === 'payment') {
      items.push(
        normalizeSmartNotification({
          id: `bg-${entry.id}`,
          priority: NOTIFICATION_PRIORITY.BACKGROUND,
          title: 'World update',
          text: entry.text || entry.label,
          icon: '🌍',
          urgency: 20,
        })
      );
    }
  }

  if (faction.lastEvent?.text) {
    items.push(
      normalizeSmartNotification({
        id: `faction-bg-${faction.lastEvent.id || 'last'}`,
        priority: NOTIFICATION_PRIORITY.BACKGROUND,
        title: 'Guild activity',
        text: faction.lastEvent.text,
        icon: '⚔',
        action: 'social',
        urgency: 25,
      })
    );
  }

  return items;
}

export function collectSmartNotifications(options = {}) {
  const {
    state = null,
    adventures = [],
    livingWorld = null,
    marketplace = null,
    faction = null,
    legendaryHunt = null,
    socialToasts = [],
    extra = [],
    now = Date.now(),
  } = options;

  const world = livingWorld || getLivingWorldSnapshot(adventures, { state, now });
  const market = marketplace || getMarketplaceSnapshot(state, adventures, { now });
  const guild = faction || getFactionSnapshot(state, adventures, { now });
  const legendary = legendaryHunt || getLegendaryHuntSnapshot(state, adventures, { now });

  const seen = new Set();
  const merged = [
    ...buildTreasureExpiryNotifications(state, now),
    ...buildLegendaryCriticalNotifications(adventures, now),
    ...buildAuctionCriticalNotifications(market),
    ...buildAdventureNotifications(legendary, world),
    ...buildNearbyNotifications(world, guild, socialToasts, now),
    ...buildBackgroundNotifications(market, world, guild),
    ...extra.map(normalizeSmartNotification),
  ].filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return merged.sort(compareNotifications);
}

/**
 * @param {object} options
 */
export function getSmartNotificationSnapshot(options = {}) {
  const {
    state = null,
    adventures = [],
    now = Date.now(),
    layerSnapshot = null,
    socialToasts = null,
    extra = [],
  } = options;

  const social =
    socialToasts ||
    getSocialDiscoverySnapshot(state, adventures, { now }).toasts ||
    [];

  const notifications = collectSmartNotifications({
    state,
    adventures,
    socialToasts: social,
    extra,
    now,
  });

  const { prominent, stacked, sorted } = partitionNotificationStack(notifications);
  const visible =
    layerSnapshot?.hudCards?.notifications !== false &&
    (layerSnapshot?.layers?.explorer?.visible !== false ||
      layerSnapshot?.layers?.discovery?.visible !== false ||
      !layerSnapshot);

  return wrapEngineSnapshot({
    visible,
    notifications: sorted,
    prominent,
    stacked,
    stackCount: stacked.length,
    hasCritical: prominent.some((n) => n.priority === NOTIFICATION_PRIORITY.CRITICAL),
    hasStack: stacked.length > 0,
  });
}
