/**
 * Questory 2.0 — Phase 17: Partner Operations
 * Cities, museums, sponsors, creators — campaign and revenue tracking (simulated).
 */
import { safeGetTime } from './dateUtils';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { recordPartnerRevenue } from './paymentEngine.js';

export const PARTNER_TYPES = {
  CITY: 'city',
  MUSEUM: 'museum',
  TOURISM_BOARD: 'tourism_board',
  SCHOOL: 'school',
  UNIVERSITY: 'university',
  HISTORICAL_SOCIETY: 'historical_society',
  SPONSOR: 'sponsor',
  CREATOR: 'creator',
  BRAND: 'brand',
  STORE: 'store',
  PARK: 'park',
};

export const PARTNER_LIMITS = {
  MAX_PARTNERS: 24,
  MAX_CAMPAIGNS: 30,
  MAX_ANALYTICS: 40,
  MAX_INVOICES: 24,
};

export const SEED_PARTNERS = [
  {
    id: 'parsons-city',
    type: PARTNER_TYPES.CITY,
    name: 'City of Parsons',
    region: 'Kansas',
    verified: true,
    icon: '🏛️',
    contactEmail: 'partners@parsons.gov',
  },
  {
    id: 'parsons-museum',
    type: PARTNER_TYPES.MUSEUM,
    name: 'Parsons Historical Museum',
    region: 'Kansas',
    verified: true,
    icon: '🏺',
  },
  {
    id: 'parsons-tourism',
    type: PARTNER_TYPES.TOURISM_BOARD,
    name: 'Parsons Tourism Board',
    region: 'Kansas',
    verified: true,
    icon: '🗺️',
  },
  {
    id: 'usd-503',
    type: PARTNER_TYPES.SCHOOL,
    name: 'USD 503 Schools',
    region: 'Kansas',
    verified: false,
    icon: '🎓',
  },
  {
    id: 'labette-community',
    type: PARTNER_TYPES.UNIVERSITY,
    name: 'Labette Community College',
    region: 'Kansas',
    verified: true,
    icon: '📚',
  },
  {
    id: 'heritage-society',
    type: PARTNER_TYPES.HISTORICAL_SOCIETY,
    name: 'Southeast Kansas Heritage Society',
    region: 'Kansas',
    verified: true,
    icon: '📜',
  },
  {
    id: 'downtown-market',
    type: PARTNER_TYPES.SPONSOR,
    name: 'Downtown Market',
    region: 'Parsons',
    verified: true,
    icon: '🏪',
  },
  {
    id: 'parsons-heritage',
    type: PARTNER_TYPES.CREATOR,
    name: 'Parsons Heritage Trails',
    region: 'Parsons',
    verified: true,
    icon: '✨',
  },
  {
    id: 'iron-rails-brand',
    type: PARTNER_TYPES.BRAND,
    name: 'Iron Rails Brewing',
    region: 'Parsons',
    verified: true,
    icon: '🍺',
  },
  {
    id: 'lake-parsons-park',
    type: PARTNER_TYPES.PARK,
    name: 'Lake Parsons Park',
    region: 'Kansas',
    verified: true,
    icon: '🌲',
  },
];

export const DEFAULT_PARTNER_OPS = {
  partners: [],
  campaigns: [],
  analytics: [],
  rewards: [],
  invoices: [],
  settlements: [],
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function normalizePartnerOps(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PARTNER_OPS };
  return {
    partners: Array.isArray(raw.partners) ? raw.partners.slice(0, PARTNER_LIMITS.MAX_PARTNERS) : [],
    campaigns: Array.isArray(raw.campaigns) ? raw.campaigns.slice(0, PARTNER_LIMITS.MAX_CAMPAIGNS) : [],
    analytics: Array.isArray(raw.analytics) ? raw.analytics.slice(0, PARTNER_LIMITS.MAX_ANALYTICS) : [],
    rewards: Array.isArray(raw.rewards) ? raw.rewards.slice(0, 30) : [],
    invoices: Array.isArray(raw.invoices) ? raw.invoices.slice(0, PARTNER_LIMITS.MAX_INVOICES) : [],
    settlements: Array.isArray(raw.settlements) ? raw.settlements.slice(0, 20) : [],
  };
}

function buildSeedCampaigns(now) {
  return [
    {
      id: 'camp-weekend-expedition',
      partnerId: 'parsons-tourism',
      title: 'Weekend Expedition Fund',
      status: 'active',
      budgetCents: 50000,
      spentCents: 12400,
      adventureIds: ['parsons-gold-rush', 'union-depot-ghost'],
      startsAt: new Date(now - 86400000 * 5).toISOString(),
      endsAt: new Date(now + 86400000 * 9).toISOString(),
      simulated: true,
    },
    {
      id: 'camp-downtown-hunt',
      partnerId: 'downtown-market',
      title: 'Downtown Hunt Sponsorship',
      status: 'active',
      budgetCents: 25000,
      spentCents: 8200,
      adventureIds: ['parsons-gold-rush'],
      startsAt: new Date(now - 86400000 * 2).toISOString(),
      endsAt: new Date(now + 86400000 * 14).toISOString(),
      simulated: true,
    },
  ];
}

function buildPartnerAnalytics(partnerId, now) {
  const seed = hashSeed(partnerId + new Date(now).toISOString().slice(0, 7));
  return {
    partnerId,
    adventureTraffic: 120 + (seed % 180),
    discoveryViews: 400 + (seed % 600),
    couponsRedeemed: 12 + (seed % 40),
    rewardRedemptions: 8 + (seed % 24),
    revenueCents: 2400 + (seed % 8000),
    period: new Date(now).toISOString().slice(0, 7),
    simulated: true,
  };
}

export function createPartner(state, partner = {}) {
  const stored = normalizePartnerOps(state?.partnerOps);
  if (!partner.name || !partner.type) {
    return { ok: false, message: 'Partner name and type required.', state };
  }
  const entry = {
    id: partner.id || `partner-${Date.now()}`,
    type: partner.type,
    name: partner.name,
    region: partner.region || 'Unknown',
    verified: false,
    icon: partner.icon || '🤝',
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  return {
    ok: true,
    message: 'Partner created (simulated).',
    partner: entry,
    state: {
      ...state,
      partnerOps: { ...stored, partners: [entry, ...stored.partners].slice(0, PARTNER_LIMITS.MAX_PARTNERS) },
    },
  };
}

export function verifyPartner(state, partnerId) {
  const stored = normalizePartnerOps(state?.partnerOps);
  const partners = mergePartners(stored, state);
  const idx = partners.findIndex((p) => p.id === partnerId);
  if (idx < 0) return { ok: false, message: 'Partner not found.', state };

  const updated = { ...partners[idx], verified: true, verifiedAt: new Date().toISOString() };
  const custom = stored.partners.filter((p) => p.id !== partnerId);
  return {
    ok: true,
    message: 'Partner verified (simulated).',
    partner: updated,
    state: { ...state, partnerOps: { ...stored, partners: [updated, ...custom] } },
  };
}

export function recordPartnerCampaign(state, campaign = {}) {
  const stored = normalizePartnerOps(state?.partnerOps);
  const entry = {
    id: campaign.id || `camp-${Date.now()}`,
    partnerId: campaign.partnerId || 'parsons-tourism',
    title: campaign.title || 'Partner campaign',
    status: campaign.status || 'draft',
    budgetCents: Math.max(0, Number(campaign.budgetCents) || 0),
    spentCents: 0,
    adventureIds: campaign.adventureIds || [],
    startsAt: campaign.startsAt || new Date().toISOString(),
    endsAt: campaign.endsAt || new Date(Date.now() + 86400000 * 30).toISOString(),
    simulated: true,
  };
  return {
    ok: true,
    message: 'Campaign recorded (simulated).',
    campaign: entry,
    state: {
      ...state,
      partnerOps: { ...stored, campaigns: [entry, ...stored.campaigns].slice(0, PARTNER_LIMITS.MAX_CAMPAIGNS) },
    },
  };
}

export function recordPartnerReward(state, reward = {}) {
  const stored = normalizePartnerOps(state?.partnerOps);
  const entry = {
    id: reward.id || `reward-${Date.now()}`,
    partnerId: reward.partnerId,
    label: reward.label || 'Partner reward',
    redeemedCount: reward.redeemedCount || 0,
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  return {
    ok: true,
    message: 'Partner reward recorded.',
    reward: entry,
    state: {
      ...state,
      partnerOps: { ...stored, rewards: [entry, ...stored.rewards].slice(0, 30) },
    },
  };
}

export function recordPartnerAnalytics(state, partnerId, metrics = {}) {
  const stored = normalizePartnerOps(state?.partnerOps);
  const entry = {
    ...buildPartnerAnalytics(partnerId, Date.now()),
    ...metrics,
    recordedAt: new Date().toISOString(),
  };
  const filtered = stored.analytics.filter((a) => a.partnerId !== partnerId);
  return {
    ok: true,
    analytics: entry,
    state: {
      ...state,
      partnerOps: { ...stored, analytics: [entry, ...filtered].slice(0, PARTNER_LIMITS.MAX_ANALYTICS) },
    },
  };
}

function mergePartners(stored, state) {
  const custom = stored.partners || [];
  const seed = SEED_PARTNERS.map((p) => {
    const override = custom.find((c) => c.id === p.id);
    return override ? { ...p, ...override } : p;
  });
  const extra = custom.filter((c) => !SEED_PARTNERS.some((s) => s.id === c.id));
  return [...seed, ...extra].slice(0, PARTNER_LIMITS.MAX_PARTNERS);
}

export function getPartnerSnapshot(state = null, adventures = [], options = {}) {
  const now = options.now ?? Date.now();
  const stored = normalizePartnerOps(state?.partnerOps);
  const partners = mergePartners(stored, state);
  const campaigns =
    stored.campaigns.length > 0 ? stored.campaigns : buildSeedCampaigns(now);
  const partnerId = options.partnerId || 'parsons-tourism';
  const analytics =
    stored.analytics.length > 0
      ? stored.analytics
      : partners.slice(0, 5).map((p) => buildPartnerAnalytics(p.id, now));

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const invoices = stored.invoices.length
    ? stored.invoices
    : [
        {
          id: 'inv-tourism-q2',
          partnerId: 'parsons-tourism',
          amountCents: 12400,
          status: 'sent',
          dueAt: new Date(now + 86400000 * 14).toISOString(),
          simulated: true,
        },
      ];

  return wrapEngineSnapshot({
    initialized: true,
    partners,
    campaigns,
    activeCampaigns,
    analytics,
    analyticsForPartner: analytics.find((a) => a.partnerId === partnerId) || buildPartnerAnalytics(partnerId, now),
    rewards: stored.rewards,
    invoices,
    settlements: stored.settlements,
    stats: {
      partnerCount: partners.length,
      verifiedCount: partners.filter((p) => p.verified).length,
      activeCampaignCount: activeCampaigns.length,
      totalBudgetCents: activeCampaigns.reduce((s, c) => s + (c.budgetCents || 0), 0),
    },
    simulated: true,
    stored,
  });
}

/** Delegates to paymentEngine — keeps partner revenue in payment ledger. */
export function recordPartnerRevenueEntry(state, revenue = {}) {
  return recordPartnerRevenue(state, revenue);
}

export function buildPartnerSettlementHistory(state) {
  const payment = state?.payment?.settlements || [];
  const partner = state?.partnerOps?.settlements || [];
  return [...payment, ...partner].slice(0, 12).map((s, i) => ({
    id: s.id || `settle-${i}`,
    label: s.batchLabel || s.label || 'Settlement batch',
    amountCents: s.amountCents || 0,
    status: s.status || 'completed',
    at: s.createdAt || new Date().toISOString(),
    simulated: true,
  }));
}
