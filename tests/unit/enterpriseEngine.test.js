import { describe, expect, it } from 'vitest';
import {
  createOrganization,
  getEnterpriseSnapshot,
  recordAuditEvent,
} from '../../src/enterpriseEngine.js';
import { buildTestState } from './fixtures.js';

describe('enterpriseEngine', () => {
  it('snapshot loads seed organization', () => {
    const snapshot = getEnterpriseSnapshot(buildTestState());
    expect(snapshot.initialized).toBe(true);
    expect(snapshot.stats.orgCount).toBeGreaterThan(0);
    expect(snapshot.liveSsoEnabled).toBe(false);
  });

  it('createOrganization adds org', () => {
    const result = createOrganization(buildTestState(), { name: 'Test Org', slug: 'test' });
    expect(result.ok).toBe(true);
    expect(result.state.enterprise.organizations.length).toBeGreaterThan(0);
  });

  it('recordAuditEvent appends log', () => {
    const next = recordAuditEvent(buildTestState(), { action: 'test.action' });
    expect(next.enterprise.auditLog.length).toBeGreaterThan(0);
  });
});
