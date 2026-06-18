import { getAdventureProgress, ADVENTURE_STATUS } from './seed';

export const COIN_SPEND = {
  HINT: 50,
  SKIP_CLUE: 100,
  REVEAL_SEARCH_RADIUS: 75,
  PREMIUM_ADVENTURE: 250,
  EXCLUSIVE_MEDALLION: 500,
  EXTRA_ADVENTURE: 100,
};

export const PREMIUM_SPLIT = { creator: 0.7, platform: 0.3 };
export const FREE_ACTIVE_ADVENTURE_LIMIT = 2;

export const ADVENTURE_TIER = {
  STANDARD: 'standard',
  PREMIUM: 'premium',
};

export const DEFAULT_ECONOMY = {
  ratings: [],
  follows: [],
  premiumUnlocks: [],
  exclusiveMedallions: [],
  coinSpends: [],
  hintUnlocks: {},
  skippedClues: {},
  revealedSearchRadius: [],
  couponRedemptions: [],
  sponsorWallet: { balanceCredits: 0, currency: 'USD' },
  walletTransactions: [],
  seasonalProgress: {},
  creationSlotsPurchased: 0,
};

export const CREATOR_PROFILES = {
  'parsons-heritage': {
    id: 'parsons-heritage',
    name: 'Parsons Heritage',
    bio: 'Preserving railroad history through real-world treasure trails across Parsons, Kansas.',
    followers: 842,
    completions: 1241,
    rating: 4.9,
    reviewCount: 318,
    adventuresCreated: 12,
    badges: ['keeper-of-parsons', 'explorer'],
    sponsorPartners: ['Parsons Heritage Trail', 'Neosho River Council'],
    verified: true,
  },
  'questory-founders': {
    id: 'questory-founders',
    name: 'QUESTORY Founders',
    bio: 'The original trail builders behind Founder Hunts and legendary drops.',
    followers: 2104,
    completions: 3890,
    rating: 5.0,
    reviewCount: 412,
    adventuresCreated: 6,
    badges: ['founders-circle'],
    sponsorPartners: ['QUESTORY Founders'],
    verified: true,
  },
};

export const SEASONAL_EVENTS = [
  {
    id: 'parsons-summer-quest-2026',
    name: 'Parsons Summer Quest',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    badgeId: 'summer-explorer',
    badgeLabel: 'Summer Explorer Badge',
    coinReward: 500,
    sponsorName: 'Parsons Heritage Trail',
    description: 'Complete any Parsons hunt in July for exclusive rewards.',
    leaderboardReset: true,
    active: isSeasonActive('2026-07-01', '2026-07-31'),
  },
];

export const SPONSORED_LEADERBOARDS = [
  {
    id: 'pepsi-monthly',
    sponsorName: 'Pepsi',
    title: 'Most Adventures Completed This Month',
    prize: '$50 Gift Card',
    period: 'monthly',
    endsAt: '2026-06-30',
  },
  {
    id: 'dq-weekly',
    sponsorName: 'Dairy Queen Parsons',
    title: 'Weekly Trail Blazers',
    prize: 'FREE SMALL BLIZZARD',
    period: 'weekly',
    endsAt: '2026-06-22',
  },
];

function isSeasonActive(start, end) {
  const now = new Date();
  return now >= new Date(start) && now <= new Date(end);
}

export function normalizeEconomy(economy = {}) {
  return {
    ...DEFAULT_ECONOMY,
    ...economy,
    ratings: Array.isArray(economy.ratings) ? economy.ratings : [],
    follows: Array.isArray(economy.follows) ? economy.follows : [],
    premiumUnlocks: Array.isArray(economy.premiumUnlocks) ? economy.premiumUnlocks : [],
    exclusiveMedallions: Array.isArray(economy.exclusiveMedallions) ? economy.exclusiveMedallions : [],
    coinSpends: Array.isArray(economy.coinSpends) ? economy.coinSpends : [],
    couponRedemptions: Array.isArray(economy.couponRedemptions) ? economy.couponRedemptions : [],
    walletTransactions: Array.isArray(economy.walletTransactions) ? economy.walletTransactions : [],
    hintUnlocks: economy.hintUnlocks || {},
    skippedClues: economy.skippedClues || {},
    revealedSearchRadius: Array.isArray(economy.revealedSearchRadius)
      ? economy.revealedSearchRadius
      : [],
    sponsorWallet: { ...DEFAULT_ECONOMY.sponsorWallet, ...(economy.sponsorWallet || {}) },
    seasonalProgress: economy.seasonalProgress || {},
  };
}

export function normalizeAdventureTier(tier) {
  return tier === ADVENTURE_TIER.PREMIUM ? ADVENTURE_TIER.PREMIUM : ADVENTURE_TIER.STANDARD;
}

export function getPremiumCost(adventure) {
  return adventure?.premiumCoinCost ?? COIN_SPEND.PREMIUM_ADVENTURE;
}

export function isPremiumAdventure(adventure) {
  return normalizeAdventureTier(adventure?.tier) === ADVENTURE_TIER.PREMIUM;
}

export function hasPremiumUnlock(state, adventureId) {
  return (state.economy?.premiumUnlocks || []).includes(adventureId);
}

export function countActiveAdventures(adventures, creatorId) {
  if (!creatorId) {
    return adventures.filter(
      (a) => a.status === ADVENTURE_STATUS.PUBLISHED || a.status === ADVENTURE_STATUS.DRAFT
    ).length;
  }
  return adventures.filter(
    (a) =>
      a.creatorId === creatorId &&
      (a.status === ADVENTURE_STATUS.PUBLISHED || a.status === ADVENTURE_STATUS.DRAFT)
  ).length;
}

export function canCreateAdventure(state, { isAdmin, isSponsor, userId }) {
  if (isAdmin || isSponsor) return { ok: true };
  const limit = FREE_ACTIVE_ADVENTURE_LIMIT + (state.economy?.creationSlotsPurchased || 0);
  const active = countActiveAdventures(state.adventures, userId);
  if (active < limit) return { ok: true, remaining: limit - active };
  return {
    ok: false,
    cost: COIN_SPEND.EXTRA_ADVENTURE,
    message: `Free limit: ${FREE_ACTIVE_ADVENTURE_LIMIT} active adventures. Spend ${COIN_SPEND.EXTRA_ADVENTURE} coins for another slot.`,
  };
}

export function spendCoins(state, amount, spendType, meta = {}) {
  if (state.coins < amount) {
    return { ok: false, message: `Need ${amount} coins. You have ${state.coins}.` };
  }
  const entry = {
    id: `spend-${Date.now()}`,
    type: spendType,
    amount,
    meta,
    at: new Date().toISOString(),
  };
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - amount,
      economy: {
        ...normalizeEconomy(state.economy),
        coinSpends: [...normalizeEconomy(state.economy).coinSpends, entry],
      },
    },
  };
}

export function purchasePremiumUnlock(state, adventure) {
  if (!isPremiumAdventure(adventure)) return { ok: true, state };
  if (hasPremiumUnlock(state, adventure.id)) return { ok: true, state };
  const cost = getPremiumCost(adventure);
  const spend = spendCoins(state, cost, 'premium_unlock', { adventureId: adventure.id });
  if (!spend.ok) return spend;
  const creatorShare = Math.round(cost * PREMIUM_SPLIT.creator);
  const platformShare = cost - creatorShare;
  const unlock = {
    id: `unlock-${Date.now()}`,
    adventureId: adventure.id,
    coinsSpent: cost,
    creatorShare,
    platformShare,
    at: new Date().toISOString(),
  };
  return {
    ok: true,
    state: {
      ...spend.state,
      economy: {
        ...spend.state.economy,
        premiumUnlocks: [...spend.state.economy.premiumUnlocks, adventure.id],
        walletTransactions: [
          ...spend.state.economy.walletTransactions,
          { ...unlock, kind: 'premium_unlock' },
        ],
      },
    },
    creatorShare,
    platformShare,
  };
}

export function purchaseHint(state, adventureId, clueIndex) {
  const key = `${adventureId}:${clueIndex}`;
  const economy = normalizeEconomy(state.economy);
  if (economy.hintUnlocks[key]) return { ok: true, state, hint: economy.hintUnlocks[key] };
  const spend = spendCoins(state, COIN_SPEND.HINT, 'hint', { adventureId, clueIndex });
  if (!spend.ok) return spend;
  const hint = 'Follow the signal toward the marked coordinates. Check nearby landmarks.';
  return {
    ok: true,
    hint,
    state: {
      ...spend.state,
      economy: {
        ...spend.state.economy,
        hintUnlocks: { ...spend.state.economy.hintUnlocks, [key]: hint },
      },
    },
  };
}

export function purchaseSkipClue(state, adventureId, clueIndex) {
  const economy = normalizeEconomy(state.economy);
  const skipped = economy.skippedClues[adventureId] || [];
  if (skipped.includes(clueIndex)) return { ok: true, state };
  const spend = spendCoins(state, COIN_SPEND.SKIP_CLUE, 'skip_clue', { adventureId, clueIndex });
  if (!spend.ok) return spend;
  return {
    ok: true,
    state: {
      ...spend.state,
      economy: {
        ...spend.state.economy,
        skippedClues: {
          ...spend.state.economy.skippedClues,
          [adventureId]: [...skipped, clueIndex],
        },
      },
    },
  };
}

export function purchaseRevealSearchRadius(state, adventureId) {
  const economy = normalizeEconomy(state.economy);
  if (economy.revealedSearchRadius.includes(adventureId)) return { ok: true, state };
  const spend = spendCoins(state, COIN_SPEND.REVEAL_SEARCH_RADIUS, 'reveal_search', { adventureId });
  if (!spend.ok) return spend;
  return {
    ok: true,
    state: {
      ...spend.state,
      economy: {
        ...spend.state.economy,
        revealedSearchRadius: [...spend.state.economy.revealedSearchRadius, adventureId],
      },
    },
  };
}

export function purchaseExtraAdventureSlot(state) {
  const spend = spendCoins(state, COIN_SPEND.EXTRA_ADVENTURE, 'extra_adventure_slot');
  if (!spend.ok) return spend;
  return {
    ok: true,
    state: {
      ...spend.state,
      economy: {
        ...spend.state.economy,
        creationSlotsPurchased: (spend.state.economy.creationSlotsPurchased || 0) + 1,
      },
    },
  };
}

export function enrichCouponReward(reward, adventure) {
  if (reward.type !== 'coupon' && reward.type !== 'bonus') return reward;
  const qrPayload = `QST-${reward.id}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return {
    ...reward,
    couponCode: reward.couponCode || qrPayload.slice(-8),
    qrPayload,
    terms:
      reward.terms ||
      'One per customer. Present QR code to sponsor staff. Cannot combine with other offers.',
    redeemLocation: reward.redeemLocation || adventure?.location || '',
    quantityRemaining: reward.quantityRemaining ?? 999,
  };
}

export function redeemCouponByQr(state, qrPayload) {
  const reward = state.rewards.find(
    (r) => r.qrPayload === qrPayload && (r.type === 'coupon' || r.type === 'bonus')
  );
  if (!reward) return { ok: false, message: 'Invalid or unknown coupon QR code.' };
  if (reward.status === 'redeemed') return { ok: false, message: 'Coupon already redeemed.' };
  if (reward.expiresAt && new Date(reward.expiresAt) < new Date()) {
    return { ok: false, message: 'Coupon has expired.' };
  }
  const redemption = {
    id: `redemption-${Date.now()}`,
    rewardId: reward.id,
    qrPayload,
    redeemedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    reward,
    state: {
      ...state,
      rewards: state.rewards.map((r) =>
        r.id === reward.id
          ? { ...r, status: 'redeemed', redeemedAt: redemption.redeemedAt }
          : r
      ),
      economy: {
        ...normalizeEconomy(state.economy),
        couponRedemptions: [...normalizeEconomy(state.economy).couponRedemptions, redemption],
      },
    },
  };
}

export function submitRating(state, adventureId, rating, review = '') {
  const economy = normalizeEconomy(state.economy);
  const existing = economy.ratings.findIndex((r) => r.adventureId === adventureId);
  const entry = {
    adventureId,
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    review: review.trim(),
    createdAt: new Date().toISOString(),
  };
  const ratings =
    existing >= 0
      ? economy.ratings.map((r, i) => (i === existing ? entry : r))
      : [...economy.ratings, entry];
  return {
    ...state,
    economy: { ...economy, ratings },
  };
}

export function getAdventureRating(adventureId, state, adventure) {
  const ratings = (state.economy?.ratings || []).filter((r) => r.adventureId === adventureId);
  if (ratings.length) {
    const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
    return { avg: Math.round(avg * 10) / 10, count: ratings.length };
  }
  return {
    avg: adventure?.avgRating ?? 4.8,
    count: adventure?.reviewCount ?? 0,
  };
}

export function toggleFollowCreator(state, creatorId) {
  const economy = normalizeEconomy(state.economy);
  const follows = economy.follows.includes(creatorId)
    ? economy.follows.filter((id) => id !== creatorId)
    : [...economy.follows, creatorId];
  return { ...state, economy: { ...economy, follows } };
}

export function getCreatorForAdventure(adventure) {
  const creatorId = adventure?.creatorProfileId || adventure?.creatorId;
  if (creatorId && CREATOR_PROFILES[creatorId]) return CREATOR_PROFILES[creatorId];
  if (adventure?.sponsorInfo?.name?.includes('Heritage')) return CREATOR_PROFILES['parsons-heritage'];
  if (adventure?.isFounderHunt) return CREATOR_PROFILES['questory-founders'];
  return CREATOR_PROFILES['parsons-heritage'];
}

export function getSponsorAnalytics(adventures, state, sponsorName) {
  const sponsored = adventures.filter(
    (a) =>
      a.sponsorInfo?.name === sponsorName ||
      a.sponsor === sponsorName ||
      a.sponsorUserId === sponsorName
  );
  const completions = sponsored.reduce((s, a) => s + (a.playersCompleted || 0), 0);
  const coupons = (state.rewards || []).filter(
    (r) =>
      (r.type === 'coupon' || r.type === 'bonus') &&
      (r.sponsorName === sponsorName || sponsored.some((a) => a.id === r.adventureId))
  );
  const redeemed = coupons.filter((r) => r.status === 'redeemed').length;
  const opens = completions + Math.round(completions * 1.4);
  return {
    sponsorName,
    activeAdventures: sponsored.filter((a) => a.status === 'published').length,
    completedHunts: completions,
    couponsRedeemed: redeemed,
    couponsIssued: coupons.length,
    footTraffic: redeemed,
    questorySpend: Math.round(completions * 1.06),
    estimatedRevenue: redeemed * 20,
    adventureOpens: opens,
    firstTimeVisitors: Math.round(redeemed * 0.62),
    repeatVisitors: Math.round(redeemed * 0.38),
  };
}

export function depositSponsorCredits(state, amount, note = 'Sponsor deposit') {
  const economy = normalizeEconomy(state.economy);
  const wallet = {
    ...economy.sponsorWallet,
    balanceCredits: (economy.sponsorWallet.balanceCredits || 0) + amount,
  };
  const tx = {
    id: `tx-${Date.now()}`,
    kind: 'deposit',
    amount,
    note,
    at: new Date().toISOString(),
  };
  return {
    ...state,
    economy: {
      ...economy,
      sponsorWallet: wallet,
      walletTransactions: [...economy.walletTransactions, tx],
    },
  };
}

export function applySeasonalProgress(state, adventure) {
  const active = SEASONAL_EVENTS.find((e) => e.active);
  if (!active) return state;
  const economy = normalizeEconomy(state.economy);
  if (economy.seasonalProgress[active.id]) return state;
  return {
    ...state,
    coins: state.coins + active.coinReward,
    economy: {
      ...economy,
      seasonalProgress: { ...economy.seasonalProgress, [active.id]: new Date().toISOString() },
    },
  };
}

export function groupVaultRewards(rewards, state, adventures) {
  const medallions = rewards.filter((r) => r.type === 'medallion');
  const coupons = rewards.filter((r) => r.type === 'coupon' || r.type === 'bonus');
  const certificates = (state.claimHistory || []).filter((e) => e.kind === 'certificate');
  const collections = (state.engagement?.completedCollectionRewards || []).map((cr) => ({
    id: cr.collectionId,
    title: cr.medallion,
    type: 'collection',
    icon: '🏆',
  }));
  const founder = rewards.filter((r) => r.title?.includes('Found') || r.icon === '👑');
  const premium = rewards.filter((r) =>
    adventures.some((a) => a.id === r.adventureId && isPremiumAdventure(a))
  );
  return { medallions, coupons, certificates, collections, founder, premium };
}

export function isSponsorVerified(adventure) {
  return Boolean(adventure?.sponsorInfo?.verified || adventure?.sponsorVerified);
}
