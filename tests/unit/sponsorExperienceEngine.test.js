import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_TYPE_IDS,
  SPONSOR_TAB_IDS,
  buildCampaignLaunchForm,
  getSponsorHomeSnapshot,
  resolveCampaignType,
  resolveSponsorTab,
} from '../../src/sponsorExperienceEngine.js';
import { buildTestState } from './fixtures.js';

describe('sponsorExperienceEngine', () => {
  it('exposes sponsor home tabs', () => {
    expect(resolveSponsorTab(null, buildTestState())).toBe(SPONSOR_TAB_IDS.OVERVIEW);
    expect(resolveSponsorTab('express', buildTestState())).toBe(SPONSOR_TAB_IDS.LAUNCH);
  });

  it('resolves campaign types with outcome-focused defaults', () => {
    expect(resolveCampaignType('customer_hunt')).toBe(CAMPAIGN_TYPE_IDS.CUSTOMER_HUNT);
    const form = buildCampaignLaunchForm(CAMPAIGN_TYPE_IDS.CITY_CAMPAIGN, {
      businessName: 'Downtown Books',
      couponValue: '10% off',
    });
    expect(form.title).toContain('City Campaign');
    expect(form.story).toContain('downtown');
    expect(form.clueCount).toBe(4);
  });

  it('builds sponsor home snapshot with campaign catalog', () => {
    const snapshot = getSponsorHomeSnapshot(buildTestState(), buildTestState().adventures, {
      tab: SPONSOR_TAB_IDS.LAUNCH,
      campaignType: CAMPAIGN_TYPE_IDS.QUEST_CAMPAIGN,
      sponsorName: 'Main Street Coffee',
    });
    expect(snapshot.tabs).toHaveLength(5);
    expect(snapshot.campaignTypes).toHaveLength(5);
    expect(snapshot.selectedCampaign.label).toBe('Quest Campaign');
    expect(snapshot.outcomes[0].outcome).toBeTruthy();
  });
});
