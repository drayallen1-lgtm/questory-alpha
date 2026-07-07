/**
 * Questory 2.0 — Phase 18: Event Bus
 * Central publish/subscribe — in-memory, no external brokers yet.
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const EVENT_TYPES = {
  ADVENTURE_STARTED: 'AdventureStarted',
  ADVENTURE_COMPLETED: 'AdventureCompleted',
  CLAIM_SUBMITTED: 'ClaimSubmitted',
  CLAIM_APPROVED: 'ClaimApproved',
  GUILD_JOINED: 'GuildJoined',
  FACTION_CHANGED: 'FactionChanged',
  MARKETPLACE_PURCHASE: 'MarketplacePurchase',
  WALLET_UPDATED: 'WalletUpdated',
  CREATOR_FOLLOWED: 'CreatorFollowed',
  BOSS_AWAKENED: 'BossAwakened',
  DIRECTOR_RECOMMENDATION: 'DirectorRecommendation',
  PARTNER_CAMPAIGN_STARTED: 'PartnerCampaignStarted',
  PLAYER_LOGIN: 'PlayerLogin',
  WEBHOOK_DISPATCHED: 'WebhookDispatched',
};

export const EVENT_LIMITS = {
  MAX_HISTORY: 60,
  MAX_SUBSCRIBERS: 24,
};

export const DEFAULT_EVENT_BUS = {
  history: [],
  subscriberCount: 0,
};

const _subscribers = [];

export function normalizeEventBus(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_EVENT_BUS };
  return {
    history: Array.isArray(raw.history) ? raw.history.slice(0, EVENT_LIMITS.MAX_HISTORY) : [],
    subscriberCount: Math.max(0, Number(raw.subscriberCount) || 0),
  };
}

export function publishEvent(state, type, payload = {}) {
  const stored = normalizeEventBus(state?.eventBus);
  const entry = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    payload: sanitizePayload(payload),
    at: new Date().toISOString(),
    simulated: true,
  };
  const nextState = {
    ...state,
    eventBus: {
      ...stored,
      history: [entry, ...stored.history].slice(0, EVENT_LIMITS.MAX_HISTORY),
    },
  };
  _subscribers.slice(0, EVENT_LIMITS.MAX_SUBSCRIBERS).forEach((fn) => {
    try {
      fn(entry, nextState);
    } catch {
      /* ignore */
    }
  });
  return { event: entry, state: nextState };
}

export function subscribeToEvents(handler) {
  if (typeof handler === 'function') _subscribers.push(handler);
  return () => {
    const idx = _subscribers.indexOf(handler);
    if (idx >= 0) _subscribers.splice(idx, 1);
  };
}

function sanitizePayload(payload) {
  const json = JSON.stringify(payload || {});
  return JSON.parse(json.replace(/playerEmail|userId|password/gi, '[redacted]'));
}

export function getEventBusSnapshot(state = null, options = {}) {
  const stored = normalizeEventBus(state?.eventBus);
  const recent = stored.history.slice(0, options.limit || 20);
  const byType = {};
  for (const e of recent) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }
  return wrapEngineSnapshot({
    initialized: true,
    history: recent,
    stats: {
      total: stored.history.length,
      byType,
      subscriberCount: _subscribers.length,
    },
    eventTypes: Object.values(EVENT_TYPES),
    simulated: true,
    stored,
  });
}

export function replayEvent(state, eventId) {
  const stored = normalizeEventBus(state?.eventBus);
  const event = stored.history.find((e) => e.id === eventId);
  if (!event) return { ok: false, message: 'Event not found.', state };
  return { ok: true, event, state };
}
