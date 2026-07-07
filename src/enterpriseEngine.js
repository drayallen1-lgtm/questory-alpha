/**
 * Questory 2.0 — Phase 18: Enterprise Engine
 * Organizations, teams, roles, SSO placeholders, audit logs.
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const ENTERPRISE_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  CREATOR: 'creator',
  ANALYST: 'analyst',
  VIEWER: 'viewer',
};

export const ENTERPRISE_LIMITS = {
  MAX_ORGS: 8,
  MAX_TEAMS: 20,
  MAX_AUDIT: 50,
  MAX_LOCATIONS: 24,
};

export const DEFAULT_ENTERPRISE = {
  organizations: [],
  activeOrgId: null,
  auditLog: [],
};

export const SEED_ORGANIZATION = {
  id: 'org-parsons-tourism',
  name: 'Parsons Tourism Alliance',
  slug: 'parsons-tourism',
  plan: 'enterprise',
  ssoEnabled: false,
  ssoProvider: null,
  teams: [
    { id: 'team-ops', name: 'Operations', department: 'Operations', memberCount: 4 },
    { id: 'team-content', name: 'Content Studio', department: 'Creative', memberCount: 6 },
  ],
  departments: ['Operations', 'Creative', 'Partnerships', 'Analytics'],
  locations: [
    { id: 'loc-depot', label: 'Union Depot', city: 'Parsons', state: 'Kansas' },
    { id: 'loc-downtown', label: 'Downtown Parsons', city: 'Parsons', state: 'Kansas' },
  ],
  roleHierarchy: [
    ENTERPRISE_ROLES.OWNER,
    ENTERPRISE_ROLES.ADMIN,
    ENTERPRISE_ROLES.MANAGER,
    ENTERPRISE_ROLES.CREATOR,
    ENTERPRISE_ROLES.ANALYST,
    ENTERPRISE_ROLES.VIEWER,
  ],
  settings: {
    requireMfa: false,
    auditRetentionDays: 90,
    allowApiKeys: true,
  },
  simulated: true,
};

export function normalizeEnterprise(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ENTERPRISE };
  return {
    organizations: Array.isArray(raw.organizations) ? raw.organizations.slice(0, ENTERPRISE_LIMITS.MAX_ORGS) : [],
    activeOrgId: raw.activeOrgId || null,
    auditLog: Array.isArray(raw.auditLog) ? raw.auditLog.slice(0, ENTERPRISE_LIMITS.MAX_AUDIT) : [],
  };
}

function mergeOrganizations(stored) {
  const custom = stored.organizations || [];
  const hasSeed = custom.some((o) => o.id === SEED_ORGANIZATION.id);
  return hasSeed ? custom : [SEED_ORGANIZATION, ...custom].slice(0, ENTERPRISE_LIMITS.MAX_ORGS);
}

export function getEnterpriseSnapshot(state = null) {
  const stored = normalizeEnterprise(state?.enterprise);
  const organizations = mergeOrganizations(stored);
  const activeOrg =
    organizations.find((o) => o.id === stored.activeOrgId) || organizations[0] || null;
  const auditLog =
    stored.auditLog.length > 0
      ? stored.auditLog
      : [
          {
            id: 'audit-seed-1',
            action: 'org.created',
            actor: 'system',
            at: new Date().toISOString(),
            simulated: true,
          },
        ];

  return wrapEngineSnapshot({
    initialized: true,
    organizations,
    activeOrg,
    auditLog,
    ssoPlaceholder: 'SAML/OIDC SSO ready — not connected',
    stats: {
      orgCount: organizations.length,
      teamCount: activeOrg?.teams?.length || 0,
      locationCount: activeOrg?.locations?.length || 0,
      auditCount: auditLog.length,
    },
    simulated: true,
    liveSsoEnabled: false,
    stored,
  });
}

export function createOrganization(state, org = {}) {
  const stored = normalizeEnterprise(state?.enterprise);
  const entry = {
    id: org.id || `org-${Date.now()}`,
    name: org.name || 'New Organization',
    slug: org.slug || 'new-org',
    plan: org.plan || 'team',
    ssoEnabled: false,
    teams: [],
    departments: [],
    locations: [],
    roleHierarchy: Object.values(ENTERPRISE_ROLES),
    settings: { requireMfa: false, auditRetentionDays: 30, allowApiKeys: true },
    simulated: true,
  };
  return {
    ok: true,
    organization: entry,
    state: {
      ...state,
      enterprise: {
        ...stored,
        organizations: [entry, ...stored.organizations].slice(0, ENTERPRISE_LIMITS.MAX_ORGS),
        activeOrgId: entry.id,
      },
    },
  };
}

export function recordAuditEvent(state, event = {}) {
  const stored = normalizeEnterprise(state?.enterprise);
  const entry = {
    id: `audit-${Date.now()}`,
    action: event.action || 'unknown',
    actor: event.actor || 'system',
    detail: event.detail || '',
    at: new Date().toISOString(),
    simulated: true,
  };
  return {
    ...state,
    enterprise: {
      ...stored,
      auditLog: [entry, ...stored.auditLog].slice(0, ENTERPRISE_LIMITS.MAX_AUDIT),
    },
  };
}

export function setActiveOrganization(state, orgId) {
  const stored = normalizeEnterprise(state?.enterprise);
  const orgs = mergeOrganizations(stored);
  if (!orgs.some((o) => o.id === orgId)) {
    return { ok: false, message: 'Organization not found.', state };
  }
  return {
    ok: true,
    state: { ...state, enterprise: { ...stored, activeOrgId: orgId } },
  };
}
