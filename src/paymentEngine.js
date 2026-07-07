/**
 * Questory 2.0 — Phase 17: Real Economy, Payments & Partner Operations
 * Simulated payment ledger — ready for Stripe / Connect / Apple Pay / Google Pay later.
 * NO live money movement. Extends economy.js / marketplace / creator economy — does not replace them.
 */
import { safeGetTime } from './dateUtils';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const PAYMENT_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
  HELD: 'held',
  MANUAL_REVIEW: 'manual_review',
};

export const WALLET_TYPES = {
  EXPLORER: 'explorer',
  CREATOR: 'creator',
  PARTNER: 'partner',
  SPONSOR: 'sponsor',
  TREASURY: 'treasury',
  GUILD: 'guild',
  SEASON: 'season',
};

export const PAYMENT_LIMITS = {
  MAX_TRANSACTIONS: 80,
  MAX_PENDING: 30,
  MAX_PAYOUTS: 40,
  MAX_SETTLEMENTS: 24,
  MAX_REFUNDS: 30,
  MAX_DISPUTES: 20,
  MAX_CHARGES: 60,
};

/** Stripe / Connect readiness — hooks only, no live keys. */
export const STRIPE_EXTENSION_HOOKS = {
  checkout: { enabled: false, label: 'Stripe Checkout', mode: 'ready' },
  connect: { enabled: false, label: 'Stripe Connect', mode: 'ready' },
  expressAccounts: { enabled: false, label: 'Express Accounts', mode: 'ready' },
  onboarding: { enabled: false, label: 'Account onboarding', mode: 'ready' },
  payoutSchedules: { enabled: false, label: 'Payout schedules', mode: 'ready' },
  webhooks: { enabled: false, label: 'Webhook events', mode: 'ready' },
  transferGroups: { enabled: false, label: 'Transfer groups', mode: 'ready' },
  applePay: { enabled: false, label: 'Apple Pay', mode: 'ready' },
  googlePay: { enabled: false, label: 'Google Pay', mode: 'ready' },
};

export const PAYOUT_RULES = {
  creator: { minCents: 2500, holdDays: 7, feePct: 8, label: 'Creator payouts' },
  partner: { minCents: 5000, holdDays: 14, feePct: 5, label: 'Partner settlements' },
  sponsor: { minCents: 10000, holdDays: 3, feePct: 3, label: 'Sponsor settlements' },
  marketplace: { minCents: 1500, holdDays: 5, feePct: 10, label: 'Marketplace seller payouts' },
  guild: { minCents: 0, holdDays: 0, feePct: 0, label: 'Guild prize pools (simulated coins)' },
  season: { minCents: 0, holdDays: 0, feePct: 0, label: 'Season prize pools (simulated coins)' },
};

const EMPTY_WALLET = {
  available: 0,
  reserved: 0,
  pending: 0,
  earned: 0,
  spent: 0,
  withdrawable: 0,
};

export const DEFAULT_PAYMENT = {
  accounts: [],
  wallets: {},
  transactions: [],
  pendingPayments: [],
  pendingPayouts: [],
  settlements: [],
  refunds: [],
  disputes: [],
  charges: [],
  partnerRevenue: [],
  fees: [],
  taxEstimates: [],
  lastSettlementAt: null,
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function centsFromCoins(coins) {
  return Math.round(Math.max(0, Number(coins) || 0) * 100);
}

function coinsFromCents(cents) {
  return Math.round(Math.max(0, Number(cents) || 0)) / 100;
}

export function normalizeWallet(raw = {}) {
  return {
    available: Math.max(0, Number(raw.available) || 0),
    reserved: Math.max(0, Number(raw.reserved) || 0),
    pending: Math.max(0, Number(raw.pending) || 0),
    earned: Math.max(0, Number(raw.earned) || 0),
    spent: Math.max(0, Number(raw.spent) || 0),
    withdrawable: Math.max(0, Number(raw.withdrawable) || 0),
  };
}

export function normalizePayment(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PAYMENT };
  const wallets = {};
  for (const type of Object.values(WALLET_TYPES)) {
    wallets[type] = normalizeWallet(raw.wallets?.[type]);
  }
  return {
    accounts: Array.isArray(raw.accounts) ? raw.accounts.slice(0, 20) : [],
    wallets,
    transactions: Array.isArray(raw.transactions) ? raw.transactions.slice(0, PAYMENT_LIMITS.MAX_TRANSACTIONS) : [],
    pendingPayments: Array.isArray(raw.pendingPayments) ? raw.pendingPayments.slice(0, PAYMENT_LIMITS.MAX_PENDING) : [],
    pendingPayouts: Array.isArray(raw.pendingPayouts) ? raw.pendingPayouts.slice(0, PAYMENT_LIMITS.MAX_PAYOUTS) : [],
    settlements: Array.isArray(raw.settlements) ? raw.settlements.slice(0, PAYMENT_LIMITS.MAX_SETTLEMENTS) : [],
    refunds: Array.isArray(raw.refunds) ? raw.refunds.slice(0, PAYMENT_LIMITS.MAX_REFUNDS) : [],
    disputes: Array.isArray(raw.disputes) ? raw.disputes.slice(0, PAYMENT_LIMITS.MAX_DISPUTES) : [],
    charges: Array.isArray(raw.charges) ? raw.charges.slice(0, PAYMENT_LIMITS.MAX_CHARGES) : [],
    partnerRevenue: Array.isArray(raw.partnerRevenue) ? raw.partnerRevenue.slice(0, 40) : [],
    fees: Array.isArray(raw.fees) ? raw.fees.slice(0, 40) : [],
    taxEstimates: Array.isArray(raw.taxEstimates) ? raw.taxEstimates.slice(0, 20) : [],
    lastSettlementAt: raw.lastSettlementAt || null,
  };
}

function seedPaymentAccounts() {
  return [
    {
      id: 'acct-explorer-sim',
      kind: 'explorer',
      provider: 'simulated',
      connectStatus: 'not_connected',
      payoutsEnabled: false,
      label: 'Explorer Wallet Account',
    },
    {
      id: 'acct-creator-parsons',
      kind: 'creator',
      provider: 'stripe_connect_ready',
      connectStatus: 'onboarding_required',
      payoutsEnabled: false,
      label: 'Parsons Heritage Creator',
      creatorId: 'parsons-heritage',
    },
    {
      id: 'acct-partner-tourism',
      kind: 'partner',
      provider: 'stripe_connect_ready',
      connectStatus: 'verified',
      payoutsEnabled: false,
      label: 'Parsons Tourism Board',
      partnerId: 'parsons-tourism',
    },
    {
      id: 'acct-treasury',
      kind: 'treasury',
      provider: 'simulated',
      connectStatus: 'internal',
      payoutsEnabled: false,
      label: 'Questory Treasury',
    },
  ];
}

function deriveSeedWallets(state) {
  const coins = Math.max(0, Number(state?.coins) || 0);
  const marketplace = state?.marketplace || {};
  const sales = Array.isArray(marketplace.sales) ? marketplace.sales : [];
  const purchases = Array.isArray(marketplace.purchases) ? marketplace.purchases : [];
  const creatorEconomy = state?.creatorEconomy || {};
  const tips = Array.isArray(creatorEconomy.tipsSent) ? creatorEconomy.tipsSent : [];
  const storePurchases = Array.isArray(creatorEconomy.storePurchases) ? creatorEconomy.storePurchases : [];
  const faction = state?.faction || {};
  const guildXp = Math.max(0, Number(faction.guildXp) || 0);

  const marketEarned = sales.reduce((s, x) => s + (Number(x.priceCoins) || 0), 0);
  const marketSpent = purchases.reduce((s, x) => s + (Number(x.priceCoins) || 0), 0);
  const creatorEarned = tips.reduce((s, x) => s + (Number(x.amount) || 0), 0) + storePurchases.length * 45;
  const sponsorEarned = hashSeed('sponsor-seed') % 1200 + 400;

  return {
    [WALLET_TYPES.EXPLORER]: {
      available: coins,
      reserved: Math.round(coins * 0.05),
      pending: Math.round(marketSpent * 0.1),
      earned: coins + marketEarned,
      spent: marketSpent,
      withdrawable: 0,
    },
    [WALLET_TYPES.CREATOR]: {
      available: creatorEarned,
      reserved: Math.round(creatorEarned * 0.15),
      pending: Math.round(creatorEarned * 0.2),
      earned: creatorEarned + 320,
      spent: 0,
      withdrawable: Math.max(0, creatorEarned - Math.round(creatorEarned * 0.35)),
    },
    [WALLET_TYPES.PARTNER]: {
      available: 680,
      reserved: 120,
      pending: 240,
      earned: 1240,
      spent: 0,
      withdrawable: 560,
    },
    [WALLET_TYPES.SPONSOR]: {
      available: sponsorEarned,
      reserved: 200,
      pending: 0,
      earned: sponsorEarned + 800,
      spent: 400,
      withdrawable: 0,
    },
    [WALLET_TYPES.TREASURY]: {
      available: 125000,
      reserved: 8200,
      pending: 3400,
      earned: 125000,
      spent: 18400,
      withdrawable: 0,
    },
    [WALLET_TYPES.GUILD]: {
      available: guildXp * 2,
      reserved: Math.round(guildXp * 0.1),
      pending: 0,
      earned: guildXp * 2,
      spent: 0,
      withdrawable: 0,
    },
    [WALLET_TYPES.SEASON]: {
      available: 4500,
      reserved: 900,
      pending: 600,
      earned: 4500,
      spent: 1200,
      withdrawable: 0,
    },
  };
}

function mergeWallets(stored, state) {
  const seed = deriveSeedWallets(state);
  const merged = {};
  for (const type of Object.values(WALLET_TYPES)) {
    const base = normalizeWallet(seed[type]);
    const saved = normalizeWallet(stored.wallets?.[type]);
    merged[type] = {
      available: saved.available || base.available,
      reserved: saved.reserved || base.reserved,
      pending: saved.pending || base.pending,
      earned: Math.max(saved.earned, base.earned),
      spent: Math.max(saved.spent, base.spent),
      withdrawable: saved.withdrawable || base.withdrawable,
    };
  }
  return merged;
}

function buildSeedTransactions(state, now) {
  const day = new Date(now).toISOString().slice(0, 10);
  return [
    {
      id: `tx-seed-market-${day}`,
      kind: 'marketplace_sale',
      walletType: WALLET_TYPES.EXPLORER,
      amountCents: 450,
      status: PAYMENT_STATUS.COMPLETED,
      label: 'Downtown Market purchase',
      createdAt: new Date(now - 86400000).toISOString(),
      simulated: true,
    },
    {
      id: `tx-seed-creator-${day}`,
      kind: 'creator_tip',
      walletType: WALLET_TYPES.CREATOR,
      amountCents: 500,
      status: PAYMENT_STATUS.COMPLETED,
      label: 'Creator tip — Parsons Heritage',
      createdAt: new Date(now - 172800000).toISOString(),
      simulated: true,
    },
    {
      id: `tx-seed-sponsor-${day}`,
      kind: 'sponsor_campaign',
      walletType: WALLET_TYPES.SPONSOR,
      amountCents: 25000,
      status: PAYMENT_STATUS.PENDING,
      label: 'Weekend expedition sponsorship',
      createdAt: new Date(now - 3600000).toISOString(),
      simulated: true,
    },
  ];
}

function buildSeedPendingPayouts(now) {
  return [
    {
      id: 'payout-creator-1',
      recipientType: 'creator',
      recipientId: 'parsons-heritage',
      amountCents: 4200,
      status: PAYMENT_STATUS.PENDING,
      rule: PAYOUT_RULES.creator,
      scheduledAt: new Date(now + 86400000 * 3).toISOString(),
      simulated: true,
    },
    {
      id: 'payout-partner-1',
      recipientType: 'partner',
      recipientId: 'parsons-tourism',
      amountCents: 8900,
      status: PAYMENT_STATUS.PROCESSING,
      rule: PAYOUT_RULES.partner,
      scheduledAt: new Date(now + 86400000 * 7).toISOString(),
      simulated: true,
    },
  ];
}

function buildTreasurySummary(wallets) {
  const treasury = wallets[WALLET_TYPES.TREASURY] || EMPTY_WALLET;
  const totalPending = Object.values(wallets).reduce((s, w) => s + w.pending, 0);
  const totalReserved = Object.values(wallets).reduce((s, w) => s + w.reserved, 0);
  return {
    treasuryAvailable: treasury.available,
    treasuryReserved: treasury.reserved,
    platformPending: totalPending,
    platformReserved: totalReserved,
    simulated: true,
  };
}

export function getWalletSummary(state, walletType = WALLET_TYPES.EXPLORER) {
  const payment = normalizePayment(state?.payment);
  const wallets = mergeWallets(payment, state);
  const wallet = wallets[walletType] || { ...EMPTY_WALLET };
  return {
    walletType,
    wallet,
    totalBalance: wallet.available + wallet.pending + wallet.reserved,
    canWithdraw: wallet.withdrawable > 0 && STRIPE_EXTENSION_HOOKS.connect.enabled === false,
    simulated: true,
  };
}

export function getPaymentSnapshot(state = null, adventures = [], options = {}) {
  const now = options.now ?? Date.now();
  const stored = normalizePayment(state?.payment);
  const wallets = mergeWallets(stored, state);
  const accounts = stored.accounts.length > 0 ? stored.accounts : seedPaymentAccounts();
  const transactions =
    stored.transactions.length > 0 ? stored.transactions : buildSeedTransactions(state, now);
  const pendingPayouts =
    stored.pendingPayouts.length > 0 ? stored.pendingPayouts : buildSeedPendingPayouts(now);
  const pendingPayments = stored.pendingPayments.filter(
    (p) => p.status === PAYMENT_STATUS.PENDING || p.status === PAYMENT_STATUS.PROCESSING
  );
  const refundQueue = stored.refunds.filter(
    (r) => r.status === PAYMENT_STATUS.PENDING || r.status === PAYMENT_STATUS.MANUAL_REVIEW
  );
  const disputeQueue = stored.disputes.filter(
    (d) => d.status === PAYMENT_STATUS.DISPUTED || d.status === PAYMENT_STATUS.MANUAL_REVIEW
  );
  const settlementQueue = [
    ...stored.settlements.filter((s) => s.status !== PAYMENT_STATUS.COMPLETED),
    ...pendingPayouts.filter((p) => p.status === PAYMENT_STATUS.PROCESSING),
  ];
  const treasury = buildTreasurySummary(wallets);

  return wrapEngineSnapshot({
    initialized: true,
    wallets,
    accounts,
    transactions,
    pendingPayments,
    pendingPayouts,
    settlements: stored.settlements,
    refunds: stored.refunds,
    disputes: stored.disputes,
    charges: stored.charges,
    partnerRevenue: stored.partnerRevenue,
    fees: stored.fees,
    taxEstimates: stored.taxEstimates.length
      ? stored.taxEstimates
      : [{ id: 'tax-est-q2', period: 'Q2', estimatedCents: 12400, status: 'estimate', simulated: true }],
    treasury,
    settlementQueue,
    refundQueue,
    disputeQueue,
    manualReviewQueue: transactions.filter((t) => t.status === PAYMENT_STATUS.MANUAL_REVIEW),
    stats: {
      transactionCount: transactions.length,
      pendingPayoutCount: pendingPayouts.length,
      pendingPaymentCount: pendingPayments.length,
      refundQueueCount: refundQueue.length,
      disputeCount: disputeQueue.length,
      settlementQueueCount: settlementQueue.length,
    },
    payoutRules: PAYOUT_RULES,
    stripeHooks: STRIPE_EXTENSION_HOOKS,
    simulated: true,
    livePaymentsEnabled: false,
    stored,
  });
}

function appendTransaction(stored, entry) {
  return {
    ...stored,
    transactions: [{ ...entry, id: entry.id || `tx-${Date.now()}` }, ...stored.transactions].slice(
      0,
      PAYMENT_LIMITS.MAX_TRANSACTIONS
    ),
  };
}

function updateWallet(stored, walletType, delta) {
  const wallets = { ...stored.wallets };
  const current = normalizeWallet(wallets[walletType] || deriveSeedWallets({})[walletType]);
  wallets[walletType] = {
    ...current,
    available: Math.max(0, current.available + (delta.available || 0)),
    pending: Math.max(0, current.pending + (delta.pending || 0)),
    reserved: Math.max(0, current.reserved + (delta.reserved || 0)),
    earned: Math.max(0, current.earned + (delta.earned || 0)),
    spent: Math.max(0, current.spent + (delta.spent || 0)),
    withdrawable: Math.max(0, current.withdrawable + (delta.withdrawable || 0)),
  };
  return { ...stored, wallets };
}

export function createPendingPayment(state, payment = {}) {
  const stored = normalizePayment(state?.payment);
  const amountCents = Math.max(0, Number(payment.amountCents) || 0);
  if (amountCents <= 0) return { ok: false, message: 'Invalid payment amount.', state };

  const entry = {
    id: payment.id || `pay-pending-${Date.now()}`,
    kind: payment.kind || 'generic',
    amountCents,
    currency: payment.currency || 'USD',
    status: PAYMENT_STATUS.PENDING,
    walletType: payment.walletType || WALLET_TYPES.EXPLORER,
    label: payment.label || 'Pending payment',
    createdAt: new Date().toISOString(),
    simulated: true,
    metadata: payment.metadata || {},
  };

  let next = {
    ...stored,
    pendingPayments: [entry, ...stored.pendingPayments].slice(0, PAYMENT_LIMITS.MAX_PENDING),
  };
  next = updateWallet(next, entry.walletType, { pending: coinsFromCents(amountCents) });

  return {
    ok: true,
    message: 'Pending payment recorded (simulated).',
    payment: entry,
    state: { ...state, payment: next },
  };
}

export function recordPayment(state, paymentId, updates = {}) {
  const stored = normalizePayment(state?.payment);
  const idx = stored.pendingPayments.findIndex((p) => p.id === paymentId);
  if (idx < 0) return { ok: false, message: 'Payment not found.', state };

  const existing = stored.pendingPayments[idx];
  const completed = {
    ...existing,
    ...updates,
    status: updates.status || PAYMENT_STATUS.COMPLETED,
    completedAt: new Date().toISOString(),
    simulated: true,
  };

  const pendingPayments = stored.pendingPayments.filter((p) => p.id !== paymentId);
  let next = appendTransaction(stored, {
    ...completed,
    kind: completed.kind || 'payment',
  });
  next = { ...next, pendingPayments, charges: [{ ...completed, id: `chg-${completed.id}` }, ...next.charges].slice(0, PAYMENT_LIMITS.MAX_CHARGES) };
  next = updateWallet(next, completed.walletType, {
    pending: -coinsFromCents(completed.amountCents),
    available: coinsFromCents(completed.amountCents),
    earned: coinsFromCents(completed.amountCents),
  });

  return { ok: true, message: 'Payment recorded (simulated).', payment: completed, state: { ...state, payment: next } };
}

export function recordRefund(state, refund = {}) {
  const stored = normalizePayment(state?.payment);
  const amountCents = Math.max(0, Number(refund.amountCents) || 0);
  const entry = {
    id: refund.id || `refund-${Date.now()}`,
    chargeId: refund.chargeId || null,
    amountCents,
    status: refund.status || PAYMENT_STATUS.PENDING,
    reason: refund.reason || 'Customer request',
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  const next = {
    ...stored,
    refunds: [entry, ...stored.refunds].slice(0, PAYMENT_LIMITS.MAX_REFUNDS),
  };
  return { ok: true, message: 'Refund queued (simulated).', refund: entry, state: { ...state, payment: next } };
}

export function recordSettlement(state, settlement = {}) {
  const stored = normalizePayment(state?.payment);
  const entry = {
    id: settlement.id || `settlement-${Date.now()}`,
    batchLabel: settlement.batchLabel || 'Simulated settlement batch',
    amountCents: Math.max(0, Number(settlement.amountCents) || 0),
    recipientCount: settlement.recipientCount || 1,
    status: settlement.status || PAYMENT_STATUS.PROCESSING,
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  const next = {
    ...stored,
    settlements: [entry, ...stored.settlements].slice(0, PAYMENT_LIMITS.MAX_SETTLEMENTS),
    lastSettlementAt: entry.createdAt,
  };
  return { ok: true, message: 'Settlement batch recorded (simulated).', settlement: entry, state: { ...state, payment: next } };
}

export function recordCreatorPayout(state, creatorId = 'parsons-heritage', amountCents = 0) {
  const stored = normalizePayment(state?.payment);
  const cents = Math.max(0, Number(amountCents) || 0);
  const entry = {
    id: `payout-creator-${Date.now()}`,
    recipientType: 'creator',
    recipientId: creatorId,
    amountCents: cents || 4200,
    status: PAYMENT_STATUS.PENDING,
    rule: PAYOUT_RULES.creator,
    scheduledAt: new Date(Date.now() + 86400000 * PAYOUT_RULES.creator.holdDays).toISOString(),
    simulated: true,
  };
  let next = {
    ...stored,
    pendingPayouts: [entry, ...stored.pendingPayouts].slice(0, PAYMENT_LIMITS.MAX_PAYOUTS),
  };
  next = updateWallet(next, WALLET_TYPES.CREATOR, {
    pending: coinsFromCents(entry.amountCents),
    withdrawable: -coinsFromCents(entry.amountCents),
  });
  return { ok: true, message: 'Creator payout queued (simulated).', payout: entry, state: { ...state, payment: next } };
}

export function recordSponsorPayment(state, sponsor = {}) {
  const stored = normalizePayment(state?.payment);
  const amountCents = Math.max(0, Number(sponsor.amountCents) || 25000);
  const entry = {
    id: sponsor.id || `sponsor-pay-${Date.now()}`,
    kind: 'sponsor_campaign',
    sponsorId: sponsor.sponsorId || 'downtown-market',
    amountCents,
    status: PAYMENT_STATUS.PENDING,
    label: sponsor.label || 'Sponsor campaign payment',
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  let next = appendTransaction(stored, entry);
  next = {
    ...next,
    pendingPayments: [entry, ...next.pendingPayments].slice(0, PAYMENT_LIMITS.MAX_PENDING),
  };
  next = updateWallet(next, WALLET_TYPES.SPONSOR, { pending: coinsFromCents(amountCents), spent: coinsFromCents(amountCents * 0.1) });
  return { ok: true, message: 'Sponsor payment recorded (simulated).', payment: entry, state: { ...state, payment: next } };
}

export function recordPartnerRevenue(state, revenue = {}) {
  const stored = normalizePayment(state?.payment);
  const amountCents = Math.max(0, Number(revenue.amountCents) || 0);
  const entry = {
    id: revenue.id || `partner-rev-${Date.now()}`,
    partnerId: revenue.partnerId || 'parsons-tourism',
    campaignId: revenue.campaignId || null,
    amountCents,
    sharePct: revenue.sharePct || 15,
    status: PAYMENT_STATUS.COMPLETED,
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  let next = {
    ...stored,
    partnerRevenue: [entry, ...stored.partnerRevenue].slice(0, 40),
  };
  next = updateWallet(next, WALLET_TYPES.PARTNER, {
    available: coinsFromCents(amountCents),
    earned: coinsFromCents(amountCents),
  });
  next = appendTransaction(next, {
    ...entry,
    kind: 'partner_revenue',
    walletType: WALLET_TYPES.PARTNER,
    label: `Partner revenue — ${entry.partnerId}`,
    status: PAYMENT_STATUS.COMPLETED,
  });
  return { ok: true, message: 'Partner revenue recorded (simulated).', revenue: entry, state: { ...state, payment: next } };
}

export function buildPaymentTimeline(state, adventures = [], now = Date.now()) {
  const snapshot = getPaymentSnapshot(state, adventures, { now });
  const entries = [];

  if (snapshot.stats.pendingPayoutCount > 0) {
    entries.push({
      id: 'pay-timeline-payouts',
      text: `${snapshot.stats.pendingPayoutCount} creator and partner payouts are processing.`,
      kind: 'payment',
      at: new Date(now).toISOString(),
    });
  }

  const sponsorTx = snapshot.transactions.find((t) => t.kind === 'sponsor_campaign');
  if (sponsorTx) {
    entries.push({
      id: 'pay-timeline-sponsor',
      text: 'The Downtown Market sponsored a new hunt.',
      kind: 'sponsor',
      at: sponsorTx.createdAt,
    });
  }

  entries.push({
    id: 'pay-timeline-tourism',
    text: 'Parsons Tourism funded a weekend expedition.',
    kind: 'partner',
    at: new Date(now - 7200000).toISOString(),
  });

  const creatorWallet = snapshot.wallets[WALLET_TYPES.CREATOR];
  if (creatorWallet?.pending > 100) {
    entries.push({
      id: 'pay-timeline-creator-rewards',
      text: 'Creator rewards have doubled this weekend.',
      kind: 'creator',
      at: new Date(now - 3600000).toISOString(),
    });
  }

  return entries.slice(0, 6);
}

export function buildMarketplaceWalletFields(state, adventures = [], options = {}) {
  const summary = getWalletSummary(state, WALLET_TYPES.EXPLORER);
  const creator = getWalletSummary(state, WALLET_TYPES.CREATOR);
  const marketplace = state?.marketplace || {};
  const pendingSales = (marketplace.sales || []).filter((s) => s.status === 'pending').length;
  const heldBalance = summary.wallet.reserved + creator.wallet.pending;

  return {
    sellerBalance: creator.wallet.available,
    pendingSales: pendingSales || creator.wallet.pending,
    heldBalance,
    refundStatus: (state?.payment?.refunds || []).length > 0 ? 'refunds_active' : 'clear',
    taxEstimateCents: 1240,
    receipts: (marketplace.purchases || []).slice(0, 5).map((p, i) => ({
      id: p.id || `receipt-${i}`,
      label: p.itemName || p.name || 'Marketplace purchase',
      amountCoins: p.priceCoins || 0,
      at: p.purchasedAt || new Date().toISOString(),
      simulated: true,
    })),
    simulated: true,
  };
}
