/**
 * Questory 2.0 — Phase 18: Webhook Engine
 * Draft-only outgoing webhook templates — no live HTTP.
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { EVENT_TYPES } from './eventBusEngine.js';

export const WEBHOOK_PROVIDERS = {
  STRIPE: 'stripe',
  DISCORD: 'discord',
  SLACK: 'slack',
  ZAPIER: 'zapier',
  TEAMS: 'teams',
  CUSTOM: 'custom_url',
};

export const WEBHOOK_LIMITS = {
  MAX_ENDPOINTS: 16,
  MAX_LOG: 40,
  MAX_DRAFTS: 20,
};

export const DEFAULT_WEBHOOKS = {
  endpoints: [],
  drafts: [],
  log: [],
};

export const WEBHOOK_TEMPLATES = {
  [WEBHOOK_PROVIDERS.STRIPE]: {
    label: 'Stripe',
    events: [EVENT_TYPES.WALLET_UPDATED, EVENT_TYPES.MARKETPLACE_PURCHASE],
    payloadShape: { type: 'payment_intent.succeeded', data: { object: {} } },
  },
  [WEBHOOK_PROVIDERS.DISCORD]: {
    label: 'Discord',
    events: [EVENT_TYPES.ADVENTURE_COMPLETED, EVENT_TYPES.BOSS_AWAKENED],
    payloadShape: { content: 'Questory event', embeds: [] },
  },
  [WEBHOOK_PROVIDERS.SLACK]: {
    label: 'Slack',
    events: [EVENT_TYPES.DIRECTOR_RECOMMENDATION, EVENT_TYPES.PARTNER_CAMPAIGN_STARTED],
    payloadShape: { text: 'Questory notification' },
  },
  [WEBHOOK_PROVIDERS.ZAPIER]: {
    label: 'Zapier',
    events: Object.values(EVENT_TYPES),
    payloadShape: { event: '', payload: {} },
  },
  [WEBHOOK_PROVIDERS.TEAMS]: {
    label: 'Microsoft Teams',
    events: [EVENT_TYPES.CLAIM_APPROVED, EVENT_TYPES.GUILD_JOINED],
    payloadShape: { title: 'Questory', text: '' },
  },
  [WEBHOOK_PROVIDERS.CUSTOM]: {
    label: 'Custom URL',
    events: Object.values(EVENT_TYPES),
    payloadShape: { event: '', data: {} },
  },
};

function seedEndpoints() {
  return [
    {
      id: 'wh-discord-alpha',
      provider: WEBHOOK_PROVIDERS.DISCORD,
      url: 'https://discord.com/api/webhooks/[DRAFT]',
      events: [EVENT_TYPES.ADVENTURE_COMPLETED],
      status: 'draft',
      simulated: true,
    },
    {
      id: 'wh-zapier-partner',
      provider: WEBHOOK_PROVIDERS.ZAPIER,
      url: 'https://hooks.zapier.com/[DRAFT]',
      events: [EVENT_TYPES.PARTNER_CAMPAIGN_STARTED],
      status: 'draft',
      simulated: true,
    },
  ];
}

export function normalizeWebhooks(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_WEBHOOKS };
  return {
    endpoints: Array.isArray(raw.endpoints) ? raw.endpoints.slice(0, WEBHOOK_LIMITS.MAX_ENDPOINTS) : [],
    drafts: Array.isArray(raw.drafts) ? raw.drafts.slice(0, WEBHOOK_LIMITS.MAX_DRAFTS) : [],
    log: Array.isArray(raw.log) ? raw.log.slice(0, WEBHOOK_LIMITS.MAX_LOG) : [],
  };
}

export function getWebhookSnapshot(state = null) {
  const stored = normalizeWebhooks(state?.webhooks);
  const endpoints = stored.endpoints.length > 0 ? stored.endpoints : seedEndpoints();
  return wrapEngineSnapshot({
    initialized: true,
    endpoints,
    drafts: stored.drafts,
    log: stored.log,
    templates: WEBHOOK_TEMPLATES,
    stats: {
      endpointCount: endpoints.length,
      draftCount: endpoints.filter((e) => e.status === 'draft').length,
      logCount: stored.log.length,
    },
    liveDispatchEnabled: false,
    simulated: true,
    stored,
  });
}

export function draftWebhookEndpoint(state, endpoint = {}) {
  const stored = normalizeWebhooks(state?.webhooks);
  const provider = endpoint.provider || WEBHOOK_PROVIDERS.CUSTOM;
  const template = WEBHOOK_TEMPLATES[provider] || WEBHOOK_TEMPLATES[WEBHOOK_PROVIDERS.CUSTOM];
  const entry = {
    id: endpoint.id || `wh-${Date.now()}`,
    provider,
    url: endpoint.url || '[DRAFT URL]',
    events: endpoint.events || template.events.slice(0, 3),
    status: 'draft',
    template: template.payloadShape,
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  return {
    ok: true,
    endpoint: entry,
    state: {
      ...state,
      webhooks: {
        ...stored,
        endpoints: [entry, ...stored.endpoints].slice(0, WEBHOOK_LIMITS.MAX_ENDPOINTS),
        drafts: [entry, ...stored.drafts].slice(0, WEBHOOK_LIMITS.MAX_DRAFTS),
      },
    },
  };
}

export function logWebhookDispatch(state, dispatch = {}) {
  const stored = normalizeWebhooks(state?.webhooks);
  const entry = {
    id: `whlog-${Date.now()}`,
    endpointId: dispatch.endpointId,
    eventType: dispatch.eventType || 'unknown',
    status: 'draft_logged',
    at: new Date().toISOString(),
    simulated: true,
    note: 'No HTTP dispatched — draft only',
  };
  return {
    ok: true,
    log: entry,
    state: {
      ...state,
      webhooks: {
        ...stored,
        log: [entry, ...stored.log].slice(0, WEBHOOK_LIMITS.MAX_LOG),
      },
    },
  };
}

export function buildWebhookPayload(provider, eventType, data = {}) {
  const template = WEBHOOK_TEMPLATES[provider] || WEBHOOK_TEMPLATES.custom_url;
  return {
    provider,
    eventType,
    template: template.payloadShape,
    data,
    draft: true,
  };
}
