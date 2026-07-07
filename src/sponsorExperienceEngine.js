/**
 * Questory V2 — Sponsor Experience (outcome-focused campaign home)
 */
import { getSponsorAnalytics } from './economy';
import { getPublishedAdventures } from './seed';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const SPONSOR_TAB_IDS = {
  OVERVIEW: 'overview',
  LAUNCH: 'launch',
  CAMPAIGNS: 'campaigns',
  ANALYTICS: 'analytics',
  REWARDS: 'rewards',
};

export const SPONSOR_TAB_ORDER = [
  SPONSOR_TAB_IDS.OVERVIEW,
  SPONSOR_TAB_IDS.LAUNCH,
  SPONSOR_TAB_IDS.CAMPAIGNS,
  SPONSOR_TAB_IDS.ANALYTICS,
  SPONSOR_TAB_IDS.REWARDS,
];

export const SPONSOR_TAB_LABELS = {
  [SPONSOR_TAB_IDS.OVERVIEW]: 'Overview',
  [SPONSOR_TAB_IDS.LAUNCH]: 'Launch',
  [SPONSOR_TAB_IDS.CAMPAIGNS]: 'Campaigns',
  [SPONSOR_TAB_IDS.ANALYTICS]: 'Analytics',
  [SPONSOR_TAB_IDS.REWARDS]: 'Rewards',
};

export const CAMPAIGN_TYPE_IDS = {
  LAUNCH_PROMOTION: 'launch_promotion',
  BUSINESS_ADVENTURE: 'business_adventure',
  CITY_CAMPAIGN: 'city_campaign',
  CUSTOMER_HUNT: 'customer_hunt',
  QUEST_CAMPAIGN: 'quest_campaign',
};

export const CAMPAIGN_TYPE_ORDER = [
  CAMPAIGN_TYPE_IDS.LAUNCH_PROMOTION,
  CAMPAIGN_TYPE_IDS.BUSINESS_ADVENTURE,
  CAMPAIGN_TYPE_IDS.CITY_CAMPAIGN,
  CAMPAIGN_TYPE_IDS.CUSTOMER_HUNT,
  CAMPAIGN_TYPE_IDS.QUEST_CAMPAIGN,
];

const LEGACY_SPONSOR_TAB_ALIASES = {
  express: SPONSOR_TAB_IDS.LAUNCH,
  dashboard: SPONSOR_TAB_IDS.OVERVIEW,
};

export const CAMPAIGN_TYPES = {
  [CAMPAIGN_TYPE_IDS.LAUNCH_PROMOTION]: {
    id: CAMPAIGN_TYPE_IDS.LAUNCH_PROMOTION,
    icon: '🚀',
    label: 'Launch Promotion',
    outcome: 'Fill your opening week with explorers',
    description: 'Light up the map with a limited-time offer hunters can claim in person.',
    defaultCoupon: 'Grand opening reward',
    clueCount: 3,
    titleSuffix: 'Launch Promotion',
  },
  [CAMPAIGN_TYPE_IDS.BUSINESS_ADVENTURE]: {
    id: CAMPAIGN_TYPE_IDS.BUSINESS_ADVENTURE,
    icon: '🏪',
    label: 'Business Adventure',
    outcome: 'Turn your storefront into a destination',
    description: 'Guide customers through a branded trail that ends at your door.',
    defaultCoupon: 'Visit reward',
    clueCount: 3,
    titleSuffix: 'Business Adventure',
  },
  [CAMPAIGN_TYPE_IDS.CITY_CAMPAIGN]: {
    id: CAMPAIGN_TYPE_IDS.CITY_CAMPAIGN,
    icon: '🌆',
    label: 'City Campaign',
    outcome: 'Make downtown glow for your brand',
    description: 'Sponsor a neighborhood trail that pulls explorers across the city.',
    defaultCoupon: 'Downtown perk',
    clueCount: 4,
    titleSuffix: 'City Campaign',
  },
  [CAMPAIGN_TYPE_IDS.CUSTOMER_HUNT]: {
    id: CAMPAIGN_TYPE_IDS.CUSTOMER_HUNT,
    icon: '🎯',
    label: 'Customer Hunt',
    outcome: 'Reward every hunter who walks through your door',
    description: 'Coupon drops for explorers who complete your in-person hunt.',
    defaultCoupon: 'Customer exclusive',
    clueCount: 3,
    titleSuffix: 'Customer Hunt',
  },
  [CAMPAIGN_TYPE_IDS.QUEST_CAMPAIGN]: {
    id: CAMPAIGN_TYPE_IDS.QUEST_CAMPAIGN,
    icon: '⚔',
    label: 'Quest Campaign',
    outcome: 'Launch a multi-stop story players remember',
    description: 'Build a quest trail with chapters, rewards, and shareable moments.',
    defaultCoupon: 'Quest reward',
    clueCount: 5,
    titleSuffix: 'Quest Campaign',
  },
};

export function resolveSponsorTab(tab, state = null, options = {}) {
  const raw = tab || state?.sponsorTab || (state?.quickSponsor ? SPONSOR_TAB_IDS.LAUNCH : null);
  const normalized = LEGACY_SPONSOR_TAB_ALIASES[raw] || raw;
  if (SPONSOR_TAB_ORDER.includes(normalized)) return normalized;
  if (options.campaignType) return SPONSOR_TAB_IDS.LAUNCH;
  return SPONSOR_TAB_IDS.OVERVIEW;
}

export function resolveCampaignType(type, state = null, options = {}) {
  const raw = type || state?.sponsorCampaignType || options.campaignType;
  if (CAMPAIGN_TYPE_ORDER.includes(raw)) return raw;
  return CAMPAIGN_TYPE_IDS.LAUNCH_PROMOTION;
}

export function buildCampaignLaunchForm(campaignType, form = {}) {
  const campaign = CAMPAIGN_TYPES[resolveCampaignType(campaignType)];
  const businessName = form.businessName?.trim() || 'Local Business';
  return {
    businessName,
    couponValue: form.couponValue?.trim() || campaign.defaultCoupon,
    durationDays: String(form.durationDays || '14'),
    city: form.city?.trim() || 'Parsons',
    campaignType: campaign.id,
    title: `${businessName} ${campaign.titleSuffix}`,
    story: `${campaign.outcome}. ${campaign.description}`,
    clueCount: campaign.clueCount,
  };
}

export function listSponsorCampaigns(adventures = [], sponsorName = '') {
  return getPublishedAdventures(adventures).filter(
    (adventure) =>
      adventure.sponsor === sponsorName || adventure.sponsorInfo?.name === sponsorName
  );
}

export function getSponsorHomeSnapshot(state, adventures = [], options = {}) {
  const sponsorName =
    options.sponsorName ||
    state?.economy?.sponsorProfile?.businessName ||
    "McDonald's Parsons";
  const tab = resolveSponsorTab(options.tab, state, options);
  const campaignType = resolveCampaignType(options.campaignType, state, options);
  const analytics = getSponsorAnalytics(adventures, state, sponsorName);
  const campaigns = listSponsorCampaigns(adventures, sponsorName);
  const wallet = state?.economy?.sponsorWallet || { balanceCredits: 0 };

  return wrapEngineSnapshot({
    tab,
    tabs: SPONSOR_TAB_ORDER.map((id) => ({
      id,
      label: SPONSOR_TAB_LABELS[id],
    })),
    campaignType,
    campaignTypes: CAMPAIGN_TYPE_ORDER.map((id) => CAMPAIGN_TYPES[id]),
    selectedCampaign: CAMPAIGN_TYPES[campaignType],
    sponsorName,
    analytics,
    campaigns,
    campaignCount: campaigns.length,
    wallet,
    outcomes: CAMPAIGN_TYPE_ORDER.map((id) => ({
      id,
      label: CAMPAIGN_TYPES[id].label,
      outcome: CAMPAIGN_TYPES[id].outcome,
      icon: CAMPAIGN_TYPES[id].icon,
    })),
  });
}
