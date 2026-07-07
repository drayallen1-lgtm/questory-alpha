/**
 * Questory 2.0 — Phase 18: Open Questory Platform
 * Versioned read-only API layer — normalized snapshots only, no direct mutations.
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { levelFromXp, computeExplorerXp } from './playerProgressionEngine';
import { getFactionSnapshot } from './factionEngine';
import { getMarketplaceSnapshot } from './marketplaceEngine';
import { getWorldDiscoverySnapshot } from './worldDiscoveryEngine';
import { getLivingWorldSnapshot } from './livingWorldEngine';
import { getPartnerSnapshot } from './partnerOperationsEngine';
import { getPaymentSnapshot } from './paymentEngine';
import { getCreatorEconomySnapshot } from './creatorEconomyEngine';

export const API_VERSION = 'v1';

export const API_NAMESPACES = {
  ADVENTURES: 'adventures',
  PLAYERS: 'players',
  WALLETS: 'wallets',
  CREATORS: 'creators',
  GUILDS: 'guilds',
  FACTIONS: 'factions',
  MARKETPLACE: 'marketplace',
  DISCOVERIES: 'discoveries',
  LIVINGWORLD: 'livingworld',
  DIRECTOR: 'director',
  PARTNERS: 'partners',
  PAYMENTS: 'payments',
};

export const PLATFORM_LIMITS = {
  MAX_API_KEYS: 12,
  MAX_REQUEST_LOG: 40,
};

export const DEFAULT_PLATFORM = {
  apiKeys: [],
  requestLog: [],
  sdkSessions: [],
  activeVersion: API_VERSION,
};

function sanitizeAdventure(adv) {
  if (!adv) return null;
  return {
    id: adv.id,
    title: adv.title,
    location: adv.location,
    city: adv.city,
    state: adv.state,
    status: adv.status,
    tier: adv.tier,
    estimatedMinutes: adv.estimatedMinutes,
    playersCompleted: adv.playersCompleted,
    avgRating: adv.avgRating,
    creatorProfileId: adv.creatorProfileId,
    heatCategory: adv.heatCategory,
  };
}

function buildPlayerSnapshot(state, adventures) {
  const totalXp = computeExplorerXp(state, adventures);
  const progress = state?.progress || {};
  const claimed = Object.entries(progress)
    .filter(([, p]) => p?.claimed)
    .map(([id]) => id);
  return {
    coins: state?.coins ?? 0,
    explorerLevel: levelFromXp(totalXp),
    totalXp,
    claimedAdventureIds: claimed,
    screen: state?.screen || 'home',
  };
}

export function normalizePlatform(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PLATFORM };
  return {
    apiKeys: Array.isArray(raw.apiKeys) ? raw.apiKeys.slice(0, PLATFORM_LIMITS.MAX_API_KEYS) : [],
    requestLog: Array.isArray(raw.requestLog) ? raw.requestLog.slice(0, PLATFORM_LIMITS.MAX_REQUEST_LOG) : [],
    sdkSessions: Array.isArray(raw.sdkSessions) ? raw.sdkSessions.slice(0, 20) : [],
    activeVersion: raw.activeVersion || API_VERSION,
  };
}

function seedApiKeys() {
  return [
    {
      id: 'key-alpha-dev',
      label: 'Questory Alpha Dev',
      prefix: 'qst_live_',
      scopes: Object.values(API_NAMESPACES),
      createdAt: new Date().toISOString(),
      status: 'active',
      simulated: true,
    },
    {
      id: 'key-partner-read',
      label: 'Partner Read-Only',
      prefix: 'qst_test_',
      scopes: ['adventures', 'discoveries', 'partners'],
      createdAt: new Date().toISOString(),
      status: 'active',
      simulated: true,
    },
  ];
}

export function getPlatformApiSnapshot(state = null, adventures = [], options = {}) {
  const now = options.now ?? Date.now();
  const stored = normalizePlatform(state?.platform);
  const fog = { revealed: state?.mapExploration?.revealed || [] };

  const namespaces = {
    [API_NAMESPACES.ADVENTURES]: (adventures || [])
      .filter((a) => a.status === 'published' || options.includeDrafts)
      .map(sanitizeAdventure),
    [API_NAMESPACES.PLAYERS]: buildPlayerSnapshot(state, adventures),
    [API_NAMESPACES.WALLETS]: getPaymentSnapshot(state, adventures, { now }).wallets,
    [API_NAMESPACES.CREATORS]: getCreatorEconomySnapshot(state, adventures, { now }).creators?.slice(0, 12) || [],
    [API_NAMESPACES.GUILDS]: getFactionSnapshot(state, adventures, { now }).factions || [],
    [API_NAMESPACES.FACTIONS]: {
      territories: getFactionSnapshot(state, adventures, { now }).territories?.slice(0, 10) || [],
      memberFactionId: state?.faction?.memberFactionId || null,
    },
    [API_NAMESPACES.MARKETPLACE]: {
      stats: getMarketplaceSnapshot(state, adventures, { now }).stats,
      listingCount: getMarketplaceSnapshot(state, adventures, { now }).listings?.length || 0,
      venues: getMarketplaceSnapshot(state, adventures, { now }).venues,
    },
    [API_NAMESPACES.DISCOVERIES]: getWorldDiscoverySnapshot({
      zoom: 12,
      state,
      adventures,
      fog,
      now,
    }),
    [API_NAMESPACES.LIVINGWORLD]: {
      timeline: getLivingWorldSnapshot(adventures, { state, now }).timeline?.slice(0, 8) || [],
      heatZones: getLivingWorldSnapshot(adventures, { state, now }).heatZones?.slice(0, 6) || [],
    },
    [API_NAMESPACES.DIRECTOR]: {
      draftCount: state?.aiDirector?.drafts?.length || 0,
      lastEvaluatedAt: state?.aiDirector?.lastEvaluatedAt || null,
      readOnly: true,
    },
    [API_NAMESPACES.PARTNERS]: getPartnerSnapshot(state, adventures, { now }).partners?.slice(0, 10) || [],
    [API_NAMESPACES.PAYMENTS]: {
      treasury: getPaymentSnapshot(state, adventures, { now }).treasury,
      stats: getPaymentSnapshot(state, adventures, { now }).stats,
      simulated: true,
    },
  };

  const apiKeys = stored.apiKeys.length > 0 ? stored.apiKeys : seedApiKeys();

  return wrapEngineSnapshot({
    initialized: true,
    version: API_VERSION,
    namespaces,
    apiKeys,
    requestLog: stored.requestLog,
    stats: {
      namespaceCount: Object.keys(namespaces).length,
      adventureCount: namespaces.adventures.length,
      apiKeyCount: apiKeys.length,
    },
    readOnly: true,
    liveIntegrationsEnabled: false,
    stored,
  });
}

export function getApiNamespace(state, namespace, adventures = [], options = {}) {
  const snapshot = getPlatformApiSnapshot(state, adventures, options);
  const data = snapshot.namespaces[namespace];
  if (!data) {
    return { ok: false, version: API_VERSION, namespace, error: 'Unknown namespace' };
  }
  return { ok: true, version: API_VERSION, namespace, data, readOnly: true };
}

export function recordApiRequest(state, request = {}) {
  const stored = normalizePlatform(state?.platform);
  const entry = {
    id: `req-${Date.now()}`,
    namespace: request.namespace || 'unknown',
    method: request.method || 'GET',
    at: new Date().toISOString(),
    status: 200,
    simulated: true,
  };
  return {
    ...state,
    platform: {
      ...stored,
      requestLog: [entry, ...stored.requestLog].slice(0, PLATFORM_LIMITS.MAX_REQUEST_LOG),
    },
  };
}

export function createApiKey(state, key = {}) {
  const stored = normalizePlatform(state?.platform);
  const entry = {
    id: key.id || `key-${Date.now()}`,
    label: key.label || 'API Key',
    prefix: key.prefix || 'qst_test_',
    scopes: key.scopes || ['adventures', 'players'],
    createdAt: new Date().toISOString(),
    status: 'active',
    simulated: true,
  };
  return {
    ok: true,
    key: entry,
    state: {
      ...state,
      platform: {
        ...stored,
        apiKeys: [entry, ...stored.apiKeys].slice(0, PLATFORM_LIMITS.MAX_API_KEYS),
      },
    },
  };
}

export function buildApiSchema() {
  return {
    version: API_VERSION,
    namespaces: Object.values(API_NAMESPACES).map((ns) => ({
      id: ns,
      methods: ['GET'],
      mutations: false,
    })),
  };
}
