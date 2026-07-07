/**
 * Questory 2.0 — Phase 17: Risk Engine
 * Fraud and abuse detection — advisory only, no auto enforcement.
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const RISK_LIMITS = {
  MAX_ALERTS: 24,
};

export const DEFAULT_RISK = {
  alerts: [],
  lastScannedAt: null,
  overallLevel: RISK_LEVELS.LOW,
};

export function normalizeRisk(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_RISK };
  return {
    alerts: Array.isArray(raw.alerts) ? raw.alerts.slice(0, RISK_LIMITS.MAX_ALERTS) : [],
    lastScannedAt: raw.lastScannedAt || null,
    overallLevel: Object.values(RISK_LEVELS).includes(raw.overallLevel) ? raw.overallLevel : RISK_LEVELS.LOW,
  };
}

function levelRank(level) {
  const order = { low: 0, medium: 1, high: 2, critical: 3 };
  return order[level] ?? 0;
}

function maxLevel(alerts) {
  if (!alerts.length) return RISK_LEVELS.LOW;
  return alerts.reduce((max, a) => (levelRank(a.level) > levelRank(max) ? a.level : max), RISK_LEVELS.LOW);
}

function detectDuplicateClaims(state) {
  const history = state?.claimHistory || [];
  const codes = history.map((h) => h.code || h.claimCode).filter(Boolean);
  const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (dupes.length === 0) return null;
  return {
    id: 'risk-duplicate-claims',
    kind: 'duplicate_claims',
    level: RISK_LEVELS.HIGH,
    label: 'Duplicate claim codes detected',
    detail: `${dupes.length} repeated entries in claim history`,
  };
}

function detectRewardFarming(state) {
  const progress = state?.progress || {};
  const rapid = Object.values(progress).filter((p) => p?.claimed && p?.bonuses?.length > 4);
  if (rapid.length === 0) return null;
  return {
    id: 'risk-reward-farming',
    kind: 'reward_farming',
    level: RISK_LEVELS.MEDIUM,
    label: 'Unusual bonus accumulation',
    detail: `${rapid.length} adventures with stacked bonuses`,
  };
}

function detectDuplicateListings(state) {
  const listings = state?.marketplace?.listings || [];
  const ids = listings.map((l) => l.itemId);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length === 0) return null;
  return {
    id: 'risk-duplicate-listings',
    kind: 'duplicate_listings',
    level: RISK_LEVELS.MEDIUM,
    label: 'Duplicate marketplace listings',
    detail: `${dupes.length} duplicate item listings`,
  };
}

function detectRefundRate(state) {
  const refunds = state?.payment?.refunds || [];
  const charges = state?.payment?.charges || [];
  if (charges.length < 3) return null;
  const rate = refunds.length / Math.max(charges.length, 1);
  if (rate < 0.25) return null;
  return {
    id: 'risk-refund-rate',
    kind: 'high_refund_rate',
    level: rate > 0.5 ? RISK_LEVELS.HIGH : RISK_LEVELS.MEDIUM,
    label: 'Elevated refund rate',
    detail: `${Math.round(rate * 100)}% refund ratio (simulated)`,
  };
}

function detectPaymentAnomalies(state) {
  const pending = state?.payment?.pendingPayments || [];
  const large = pending.filter((p) => (p.amountCents || 0) > 100000);
  if (large.length === 0) return null;
  return {
    id: 'risk-payment-anomaly',
    kind: 'payment_anomaly',
    level: RISK_LEVELS.HIGH,
    label: 'Large pending payments flagged',
    detail: `${large.length} payments over $1,000`,
  };
}

function detectCreatorActivity(state) {
  const tips = state?.creatorEconomy?.tipsSent || [];
  const recent = tips.filter((t) => {
    const at = new Date(t.at || t.createdAt || 0).getTime();
    return Date.now() - at < 3600000;
  });
  if (recent.length < 8) return null;
  return {
    id: 'risk-creator-activity',
    kind: 'suspicious_creator_activity',
    level: RISK_LEVELS.MEDIUM,
    label: 'Burst of creator tips',
    detail: `${recent.length} tips in the last hour`,
  };
}

function detectGpsAnomalies(state) {
  const metrics = state?.firstTimeMetrics || {};
  if (!metrics.gpsDenied && !metrics.locationSkipped) return null;
  return {
    id: 'risk-gps-anomaly',
    kind: 'fake_gps',
    level: RISK_LEVELS.LOW,
    label: 'GPS reliability concern',
    detail: 'Location services denied or skipped during onboarding',
  };
}

function detectMultiAccount(state) {
  const growth = state?.growth?.referrals || [];
  if (growth.length < 5) return null;
  const sameDay = growth.filter((r) => {
    const at = new Date(r.createdAt || 0).getTime();
    return Date.now() - at < 86400000;
  });
  if (sameDay.length < 4) return null;
  return {
    id: 'risk-multi-account',
    kind: 'multi_account_abuse',
    level: RISK_LEVELS.MEDIUM,
    label: 'Rapid referral cluster',
    detail: `${sameDay.length} referrals in 24h`,
  };
}

function detectRapidAccounts(state) {
  const onboarding = state?.onboarding || {};
  if (!onboarding.completedAt) return null;
  const completed = new Date(onboarding.completedAt).getTime();
  if (Date.now() - completed > 3600000) return null;
  const claims = Object.values(state?.progress || {}).filter((p) => p?.claimed).length;
  if (claims < 2) return null;
  return {
    id: 'risk-rapid-account',
    kind: 'rapid_account_creation',
    level: RISK_LEVELS.MEDIUM,
    label: 'Fast account progression',
    detail: 'Multiple claims within first hour',
  };
}

export function evaluateRiskSignals(state = null) {
  const detectors = [
    detectDuplicateClaims,
    detectRewardFarming,
    detectDuplicateListings,
    detectRefundRate,
    detectPaymentAnomalies,
    detectCreatorActivity,
    detectGpsAnomalies,
    detectMultiAccount,
    detectRapidAccounts,
  ];
  return detectors.map((fn) => fn(state)).filter(Boolean);
}

export function getRiskSnapshot(state = null, options = {}) {
  const now = options.now ?? Date.now();
  const stored = normalizeRisk(state?.risk);
  const detected = evaluateRiskSignals(state);
  const seedAlerts =
    detected.length > 0
      ? detected
      : [
          {
            id: 'risk-seed-market-velocity',
            kind: 'market_velocity',
            level: RISK_LEVELS.LOW,
            label: 'Market velocity normal',
            detail: 'No anomalies in simulated payment flow',
          },
        ];
  const alerts = stored.alerts.length > 0 ? stored.alerts : seedAlerts;
  const overallLevel = maxLevel(alerts);

  return wrapEngineSnapshot({
    initialized: true,
    alerts,
    overallLevel,
    criticalCount: alerts.filter((a) => a.level === RISK_LEVELS.CRITICAL).length,
    highCount: alerts.filter((a) => a.level === RISK_LEVELS.HIGH).length,
    mediumCount: alerts.filter((a) => a.level === RISK_LEVELS.MEDIUM).length,
    lowCount: alerts.filter((a) => a.level === RISK_LEVELS.LOW).length,
    lastScannedAt: stored.lastScannedAt || new Date(now).toISOString(),
    simulated: true,
    autoEnforcementEnabled: false,
    stored,
  });
}

export function recordRiskAlert(state, alert = {}) {
  const stored = normalizeRisk(state?.risk);
  const entry = {
    id: alert.id || `alert-${Date.now()}`,
    kind: alert.kind || 'manual',
    level: alert.level || RISK_LEVELS.MEDIUM,
    label: alert.label || 'Risk alert',
    detail: alert.detail || '',
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  const alerts = [entry, ...stored.alerts].slice(0, RISK_LIMITS.MAX_ALERTS);
  return {
    ok: true,
    alert: entry,
    state: {
      ...state,
      risk: {
        ...stored,
        alerts,
        overallLevel: maxLevel(alerts),
        lastScannedAt: new Date().toISOString(),
      },
    },
  };
}
