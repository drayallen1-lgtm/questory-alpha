import { describe, expect, it } from 'vitest';
import {
  createPartner,
  getPartnerSnapshot,
  recordPartnerCampaign,
  verifyPartner,
} from '../../src/partnerOperationsEngine.js';
import { buildTestState } from './fixtures.js';

describe('partnerOperationsEngine', () => {
  it('snapshot loads seed partners and campaigns', () => {
    const state = buildTestState();
    const snapshot = getPartnerSnapshot(state, state.adventures);

    expect(snapshot.initialized).toBe(true);
    expect(snapshot.stats.partnerCount).toBeGreaterThan(0);
    expect(snapshot.activeCampaigns.length).toBeGreaterThan(0);
    expect(snapshot.simulated).toBe(true);
  });

  it('createPartner adds custom partner', () => {
    const result = createPartner(buildTestState(), {
      name: 'Test Museum',
      type: 'museum',
    });
    expect(result.ok).toBe(true);
    expect(result.partner.verified).toBe(false);
  });

  it('verifyPartner marks partner verified', () => {
    const created = createPartner(buildTestState(), { name: 'Test City', type: 'city' });
    const result = verifyPartner(created.state, created.partner.id);
    expect(result.ok).toBe(true);
    expect(result.partner.verified).toBe(true);
  });

  it('recordPartnerCampaign stores campaign', () => {
    const result = recordPartnerCampaign(buildTestState(), {
      partnerId: 'parsons-tourism',
      title: 'Spring Hunt',
      budgetCents: 10000,
    });
    expect(result.ok).toBe(true);
    expect(result.state.partnerOps.campaigns.length).toBeGreaterThan(0);
  });
});
