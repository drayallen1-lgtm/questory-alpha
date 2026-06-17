export const STORAGE_KEY = 'questoryAlpha';

export const REWARD_STATUS = {
  ACTIVE: 'active',
  REDEEMED: 'redeemed',
  EXPIRED: 'expired',
};

export const ADVENTURE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

/** Readable auto-generated final claim code (e.g. QUEST-4821). */
export function generateClaimCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `QUEST-${num}`;
}

import {
  CLAIM_METHOD,
  CLAIM_METHOD_OPTIONS,
  normalizeClaimMethod,
  usesFinderMode,
} from './finderMode';

export { CLAIM_METHOD, CLAIM_METHOD_OPTIONS, normalizeClaimMethod, usesFinderMode };

export const defaultState = {
  coins: 0,
  entries: 0,
  screen: 'home',
  selectedAdventureId: null,
  progress: {},
  rewards: [],
  claimHistory: [],
  victoryCertificate: null,
  adminPreview: false,
  adminTab: 'drafts',
  adventures: [
    {
      id: 'parsons-gold-rush',
      title: 'The Parsons Gold Rush',
      location: 'Parsons, Kansas',
      sponsor: 'Parsons Heritage Trail',
      sponsorInfo: {
        name: 'Parsons Heritage Trail',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Parsons_Kansas_Logo.png/120px-Parsons_Kansas_Logo.png',
        website: 'https://www.parsonsks.com',
      },
      distance: '0.8 mi',
      prize: 'Legendary Medallion + Local Rewards',
      status: 'published',
      difficulty: 3,
      claimCode: 'PARSONS128',
      claimMethod: 'secret_code',
      qrClaimValue: 'PARSONS128',
      finderSearchRadiusM: 200,
      finderCaptureBaseM: 25,
      rewardCoins: 50,
      potEntries: 5,
      story:
        'A railroad conductor vanished before cashing his final paycheck. Legend says he left behind a hidden medallion somewhere in Parsons. Follow the clues. Unlock the trail. Claim the treasure.',
      clues: [
        {
          id: 'clue-1',
          title: 'Depot Echo',
          text: 'Where iron rails crossed and travelers waited beneath the clock tower, find the name of the vanished conductor carved in memory.',
          latitude: 37.3392,
          longitude: -95.261,
          radiusMeters: 500,
        },
        {
          id: 'clue-2',
          title: 'Main Street Ledger',
          text: 'Walk the brick line where shops keep old ledger books. Count the windows between the bakery and the bookstore — that number is your key.',
          latitude: 37.3405,
          longitude: -95.263,
          radiusMeters: 500,
        },
        {
          id: 'clue-3',
          title: 'River Bridge Signal',
          text: 'Cross the bridge where the Neosho runs slow. Look for the rusted signal post pointing east — the medallion waits beyond the last rivet.',
          latitude: 37.3348,
          longitude: -95.2545,
          radiusMeters: 500,
        },
      ],
      bonusFinds: [
        {
          id: 'bonus-1',
          afterStep: 0,
          title: "Conductor's Token",
          desc: 'A brass platform token hidden near the old depot bench.',
          icon: '🎫',
          coins: 10,
          type: 'bonus',
        },
        {
          id: 'bonus-2',
          afterStep: 1,
          title: 'Main Street Perk',
          desc: '20% off at Parsons Diner — reward for sharp eyes.',
          icon: '🍔',
          type: 'coupon',
          couponCode: 'PARSONS20',
        },
      ],
      finalRewards: [
        {
          type: 'medallion',
          icon: '🥇',
          title: 'Parsons Conductor Medallion #128',
          desc: 'Verified virtual medallion from The Parsons Gold Rush',
          valueLabel: 'Legendary Collectible',
          redemptionInstructions:
            'Your medallion is saved in your Questory Vault. Share your proof card to show you completed the trail.',
          expirationDays: 0,
        },
        {
          type: 'coupon',
          icon: '☕',
          title: 'Heritage Coffee Coupon',
          desc: 'Redeem a free drink at Main Street Roasters',
          valueLabel: 'Free drink',
          redemptionInstructions:
            'Visit Main Street Roasters in downtown Parsons. Show this coupon in your Vault before ordering.',
          expirationDays: 30,
        },
        {
          type: 'physical',
          icon: '📦',
          title: 'Legendary Drop Entry',
          desc: 'Eligible for the physical Parsons medallion draw',
          valueLabel: 'Limited drop entry',
          redemptionInstructions:
            'Winners are contacted by Parsons Heritage Trail. Keep notifications on in Questory.',
          expirationDays: 90,
        },
      ],
    },
    {
      id: 'neosho-legend',
      title: 'The Neosho Legend',
      location: 'Parsons, Kansas',
      sponsor: 'QUESTORY Legendary Drop',
      sponsorInfo: {
        name: 'QUESTORY Legendary Drop',
        logoUrl: '',
        website: 'https://questory.app',
      },
      distance: 'Coming Soon',
      prize: 'Physical legendary medallion',
      status: 'archived',
      difficulty: 5,
      claimCode: 'NEOSHO',
      story: 'A second trail along the Neosho River unlocks soon.',
      clues: [],
      bonusFinds: [],
      finalRewards: [],
    },
  ],
};

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const rewards = (saved.rewards || []).map(normalizeReward);
    const screen = saved.screen === 'victory' ? 'home' : saved.screen;
    return {
      ...defaultState,
      ...saved,
      screen: screen || defaultState.screen,
      adventures: mergeAdventures(saved.adventures),
      rewards,
      victoryCertificate: null,
      adminPreview: false,
      claimHistory: buildClaimHistory(rewards, saved.claimHistory),
    };
  } catch {
    return { ...defaultState };
  }
}

export function createVaultReward({
  id,
  type,
  icon,
  title,
  desc,
  valueLabel,
  redemptionInstructions,
  expirationDays,
  adventureId,
  adventureTitle,
  sponsorName,
  sponsorLogoUrl,
  sponsorWebsite,
  claimedAt,
}) {
  const now = claimedAt || new Date().toISOString();
  const reward = {
    id,
    type,
    icon,
    title,
    desc,
    valueLabel: valueLabel || '',
    redemptionInstructions: redemptionInstructions || '',
    adventureId,
    adventureTitle,
    sponsorName: sponsorName || '',
    sponsorLogoUrl: sponsorLogoUrl || '',
    sponsorWebsite: sponsorWebsite || '',
    status: REWARD_STATUS.ACTIVE,
    claimedAt: now,
    redeemedAt: null,
  };
  const days = Number(expirationDays);
  if (days > 0) {
    const expires = new Date(now);
    expires.setDate(expires.getDate() + days);
    reward.expiresAt = expires.toISOString();
  } else if (type === 'coupon' || type === 'bonus') {
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 30);
    reward.expiresAt = expires.toISOString();
  }
  return reward;
}

export function normalizeReward(reward) {
  const base = {
    status: REWARD_STATUS.ACTIVE,
    claimedAt: reward.claimedAt || null,
    redeemedAt: reward.redeemedAt || null,
    adventureId: reward.adventureId || null,
    ...reward,
  };
  if (
    base.status === REWARD_STATUS.ACTIVE &&
    base.expiresAt &&
    new Date(base.expiresAt) < new Date()
  ) {
    base.status = REWARD_STATUS.EXPIRED;
  }
  return base;
}

export function buildClaimHistory(rewards, existing = []) {
  const certificates = (existing || []).filter((e) => e.kind === 'certificate');
  const fromRewards = rewards
    .filter((r) => r.claimedAt)
    .map((r) => ({
      id: r.id,
      kind: 'reward',
      adventureName: r.adventureTitle || 'Unknown Adventure',
      rewardName: r.title,
      type: r.type,
      claimedAt: r.claimedAt,
      redeemedAt: r.redeemedAt || null,
      status: r.status,
      sponsorName: r.sponsorName || '',
      sponsorLogoUrl: r.sponsorLogoUrl || '',
      sponsorWebsite: r.sponsorWebsite || '',
    }));
  const ids = new Set(fromRewards.map((e) => e.id));
  const legacy = (existing || []).filter(
    (e) => e.kind !== 'certificate' && !ids.has(e.id)
  );
  return [...certificates, ...fromRewards, ...legacy].sort(
    (a, b) => new Date(b.claimedAt) - new Date(a.claimedAt)
  );
}

export function upsertCertificate(history, certificate) {
  const without = (history || []).filter(
    (e) => !(e.kind === 'certificate' && e.adventureId === certificate.adventureId)
  );
  return [...without, certificate].sort(
    (a, b) => new Date(b.claimedAt) - new Date(a.claimedAt)
  );
}

export function isRedeemable(reward) {
  return (
    reward.status === REWARD_STATUS.ACTIVE &&
    (reward.type === 'medallion' || reward.type === 'coupon' || reward.type === 'bonus')
  );
}

export function syncClaimHistory(rewards) {
  return buildClaimHistory(rewards);
}

function mergeAdventures(saved) {
  if (!saved?.length) return defaultState.adventures;
  const seedIds = new Set(defaultState.adventures.map((a) => a.id));
  const custom = saved.filter((a) => !seedIds.has(a.id)).map(normalizeAdventure);
  return defaultState.adventures.map((seed) => {
    const override = saved.find((a) => a.id === seed.id);
    if (!override) return seed;
    return normalizeAdventure({
      ...seed,
      ...override,
      clues: seed.clues.length ? seed.clues : override.clues,
      sponsorInfo: seed.sponsorInfo || override.sponsorInfo,
      finalRewards: seed.finalRewards.length ? seed.finalRewards : override.finalRewards,
    });
  }).concat(custom);
}

export function migrateAdventureStatus(status) {
  if (status === 'live') return ADVENTURE_STATUS.PUBLISHED;
  if (status === 'locked') return ADVENTURE_STATUS.ARCHIVED;
  if (Object.values(ADVENTURE_STATUS).includes(status)) return status;
  return ADVENTURE_STATUS.DRAFT;
}

export function adventureStatusLabel(status) {
  if (status === ADVENTURE_STATUS.PUBLISHED) return 'Published';
  if (status === ADVENTURE_STATUS.ARCHIVED) return 'Archived';
  return 'Draft';
}

export function getPublishedAdventures(adventures) {
  return adventures.filter((a) => a.status === ADVENTURE_STATUS.PUBLISHED);
}

export function isAdventurePlayable(adventure, adminPreview = false) {
  return adventure.status === ADVENTURE_STATUS.PUBLISHED || adminPreview;
}

export function normalizeAdventure(adventure) {
  const sponsorInfo = adventure.sponsorInfo || {
    name: adventure.sponsor || 'Questory Partner',
    logoUrl: '',
    website: '',
  };
  return {
    ...adventure,
    sponsor: sponsorInfo.name,
    sponsorInfo,
    status: migrateAdventureStatus(adventure.status),
    claimMethod: normalizeClaimMethod(adventure.claimMethod),
    qrClaimValue: adventure.qrClaimValue || adventure.claimCode || '',
    finderSearchRadiusM: adventure.finderSearchRadiusM ?? 200,
    finderCaptureBaseM: adventure.finderCaptureBaseM ?? 25,
  };
}

export function getSponsorInfo(adventure) {
  if (!adventure) {
    return { name: 'Questory Partner', logoUrl: '', website: '' };
  }
  return adventure.sponsorInfo || {
    name: adventure.sponsor || 'Questory Partner',
    logoUrl: '',
    website: '',
  };
}

export const REWARD_TYPE_OPTIONS = [
  { type: 'medallion', label: 'Virtual Medallion', icon: '🏅' },
  { type: 'coupon', label: 'Sponsor Coupon', icon: '🎟' },
  { type: 'physical', label: 'Physical Legendary Drop', icon: '📦' },
];

export function getAdventureProgress(state, adventureId) {
  return (
    state.progress[adventureId] || {
      step: 0,
      claimed: false,
      bonuses: [],
      medallionTapped: false,
      finderUnlocked: false,
    }
  );
}

export function rewardTypeLabel(type) {
  if (type === 'medallion') return 'Virtual Medallion';
  if (type === 'coupon') return 'Sponsor Coupon';
  if (type === 'physical') return 'Legendary Drop';
  return 'Bonus Find';
}

export function rewardStatusLabel(status) {
  if (status === REWARD_STATUS.REDEEMED) return 'Redeemed';
  if (status === REWARD_STATUS.EXPIRED) return 'Expired';
  return 'Active';
}

export function formatTimestamp(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
