/**
 * Questory 2.0 — Phase 17: Compliance Engine
 * KYC, tax, verification, and manual review — ready mode only (simulated).
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const KYC_STATUS = {
  NOT_STARTED: 'not_started',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  MANUAL_REVIEW: 'manual_review',
};

export const TAX_STATUS = {
  NOT_FILED: 'not_filed',
  ESTIMATE_READY: 'estimate_ready',
  DOCUMENTS_REQUESTED: 'documents_requested',
  COMPLIANT: 'compliant',
};

export const COMPLIANCE_LIMITS = {
  MAX_REVIEW_QUEUE: 20,
  MAX_BLOCKED: 15,
};

export const SUPPORTED_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'NZ', 'DE', 'FR', 'MX'];

export const DEFAULT_COMPLIANCE = {
  kycStatus: KYC_STATUS.NOT_STARTED,
  taxStatus: TAX_STATUS.ESTIMATE_READY,
  identityVerified: false,
  businessVerified: false,
  ageVerified: true,
  country: 'US',
  riskScore: 12,
  blocked: false,
  sanctionsChecked: false,
  manualReviewQueue: [],
  blockedAccounts: [],
  verificationHistory: [],
};

export function normalizeCompliance(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_COMPLIANCE };
  return {
    kycStatus: raw.kycStatus || KYC_STATUS.NOT_STARTED,
    taxStatus: raw.taxStatus || TAX_STATUS.ESTIMATE_READY,
    identityVerified: Boolean(raw.identityVerified),
    businessVerified: Boolean(raw.businessVerified),
    ageVerified: raw.ageVerified !== false,
    country: SUPPORTED_COUNTRIES.includes(raw.country) ? raw.country : 'US',
    riskScore: clamp(Number(raw.riskScore) || 12, 0, 100),
    blocked: Boolean(raw.blocked),
    sanctionsChecked: Boolean(raw.sanctionsChecked),
    manualReviewQueue: Array.isArray(raw.manualReviewQueue)
      ? raw.manualReviewQueue.slice(0, COMPLIANCE_LIMITS.MAX_REVIEW_QUEUE)
      : [],
    blockedAccounts: Array.isArray(raw.blockedAccounts)
      ? raw.blockedAccounts.slice(0, COMPLIANCE_LIMITS.MAX_BLOCKED)
      : [],
    verificationHistory: Array.isArray(raw.verificationHistory) ? raw.verificationHistory.slice(0, 20) : [],
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function buildSeedReviewQueue() {
  return [
    {
      id: 'review-creator-kyc',
      subjectType: 'creator',
      subjectId: 'horror-crest',
      reason: 'Identity document pending',
      status: 'open',
      priority: 'medium',
      simulated: true,
    },
    {
      id: 'review-partner-tax',
      subjectType: 'partner',
      subjectId: 'parsons-tourism',
      reason: 'W-9 form requested',
      status: 'open',
      priority: 'low',
      simulated: true,
    },
  ];
}

export function getComplianceSnapshot(state = null, options = {}) {
  const stored = normalizeCompliance(state?.compliance);
  const manualReviewQueue =
    stored.manualReviewQueue.length > 0 ? stored.manualReviewQueue : buildSeedReviewQueue();

  const verificationBadge =
    stored.identityVerified && stored.businessVerified
      ? 'verified_partner'
      : stored.identityVerified
        ? 'identity_verified'
        : stored.kycStatus === KYC_STATUS.PENDING
          ? 'pending'
          : 'unverified';

  return wrapEngineSnapshot({
    initialized: true,
    kycStatus: stored.kycStatus,
    taxStatus: stored.taxStatus,
    identityVerified: stored.identityVerified,
    businessVerified: stored.businessVerified,
    ageVerified: stored.ageVerified,
    country: stored.country,
    countrySupported: SUPPORTED_COUNTRIES.includes(stored.country),
    riskScore: stored.riskScore,
    blocked: stored.blocked,
    sanctionsChecked: stored.sanctionsChecked,
    sanctionsPlaceholder: 'Screening hook ready — no live sanctions API',
    manualReviewQueue,
    blockedAccounts: stored.blockedAccounts,
    verificationBadge,
    stats: {
      openReviews: manualReviewQueue.filter((r) => r.status === 'open').length,
      blockedCount: stored.blockedAccounts.length,
    },
    simulated: true,
    liveVerificationEnabled: false,
    stored,
  });
}

export function queueManualReview(state, review = {}) {
  const stored = normalizeCompliance(state?.compliance);
  const entry = {
    id: review.id || `review-${Date.now()}`,
    subjectType: review.subjectType || 'user',
    subjectId: review.subjectId || 'unknown',
    reason: review.reason || 'Manual review required',
    status: 'open',
    priority: review.priority || 'medium',
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  return {
    ok: true,
    review: entry,
    state: {
      ...state,
      compliance: {
        ...stored,
        manualReviewQueue: [entry, ...stored.manualReviewQueue].slice(0, COMPLIANCE_LIMITS.MAX_REVIEW_QUEUE),
      },
    },
  };
}

export function updateKycStatus(state, status) {
  const stored = normalizeCompliance(state?.compliance);
  const valid = Object.values(KYC_STATUS).includes(status);
  if (!valid) return { ok: false, message: 'Invalid KYC status.', state };
  return {
    ok: true,
    state: {
      ...state,
      compliance: {
        ...stored,
        kycStatus: status,
        identityVerified: status === KYC_STATUS.VERIFIED,
      },
    },
  };
}

export function blockAccount(state, accountId, reason = 'Policy violation') {
  const stored = normalizeCompliance(state?.compliance);
  const entry = { accountId, reason, blockedAt: new Date().toISOString(), simulated: true };
  return {
    ok: true,
    state: {
      ...state,
      compliance: {
        ...stored,
        blockedAccounts: [entry, ...stored.blockedAccounts.filter((b) => b.accountId !== accountId)].slice(
          0,
          COMPLIANCE_LIMITS.MAX_BLOCKED
        ),
      },
    },
  };
}
