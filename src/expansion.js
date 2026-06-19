import { hasPremiumUnlock, isPremiumAdventure } from './economy';

export const FINDER_MODES = {
  TRADITIONAL: 'traditional',
  FINDER: 'finder',
  AR_ENHANCED: 'ar_enhanced',
};

export const AR_ASSET_TYPES = {
  GHOST_LANTERN: 'ghost_lantern',
  HIDDEN_COIN: 'hidden_coin',
  ANCIENT_ARTIFACT: 'ancient_artifact',
  SPONSOR_MASCOT: 'sponsor_mascot',
  SEASONAL: 'seasonal',
  FOUNDER_RELIC: 'founder_relic',
};

export const AR_ASSET_LABELS = {
  ghost_lantern: '👻 Floating Ghost Lantern',
  hidden_coin: '🪙 Hidden Coins',
  ancient_artifact: '🏺 Ancient Artifact',
  sponsor_mascot: '🎭 Sponsor Mascot',
  seasonal: '🎃 Seasonal Collectible',
  founder_relic: '👑 Founder Relic',
};

export const SUBSCRIPTION_TIER = {
  FREE: 'free',
  PREMIUM: 'premium',
};

export const PREMIUM_PRICE_MONTHLY = 7.99;

export const PREMIUM_BENEFITS = [
  'Unlimited premium hunts',
  'Exclusive medallions',
  'Monthly coin drops (+500)',
  'Early access to legendary hunts',
  'Premium passport themes',
  'Founder-only events',
  'Double streak bonuses',
];

export const NATIONAL_REGIONS = [
  { id: 'kansas', label: 'Kansas', cities: ['Parsons', 'Wichita', 'Kansas City'] },
  { id: 'missouri', label: 'Missouri', cities: ['Kansas City', 'St. Louis', 'Springfield'] },
  { id: 'oklahoma', label: 'Oklahoma', cities: ['Tulsa', 'Oklahoma City', 'Norman'] },
  { id: 'texas', label: 'Texas', cities: ['Dallas', 'Austin', 'Houston'] },
  { id: 'colorado', label: 'Colorado', cities: ['Denver', 'Boulder', 'Colorado Springs'] },
];

export const LEGENDARY_HUNT_TYPES = {
  LOST_LEDGER: 'lost_ledger',
  FOUNDER_RELIC: 'founder_relic',
  MIDNIGHT_TRAIN: 'midnight_train',
  BLACK_LANTERN: 'black_lantern',
};

export const LEGENDARY_HUNT_META = {
  lost_ledger: {
    label: 'The Lost Ledger',
    desc: 'Once a year. A single legendary trail appears.',
    icon: '📜',
    frequency: 'Annual',
  },
  founder_relic: {
    label: 'The Founder Relic',
    desc: 'Only 100 explorers will ever obtain it.',
    icon: '👑',
    frequency: 'Limited · 100 total',
  },
  midnight_train: {
    label: 'Midnight Train',
    desc: 'Live event. One weekend only.',
    icon: '🚂',
    frequency: 'Weekend only',
  },
  black_lantern: {
    label: 'The Black Lantern',
    desc: 'Moves cities. Nobody knows where next.',
    icon: '🏮',
    frequency: 'Roaming',
  },
};

export const SPONSORED_CITY_DROPS = [
  {
    id: 'mcdonalds-golden-fry',
    sponsor: "McDonald's",
    title: "Ronald's Lost Golden Fry",
    reward: 'Free medium fries',
    budget: 100,
    radiusMiles: 15,
    durationDays: 14,
    adventureId: 'union-depot-ghost',
    icon: '🍟',
  },
  {
    id: 'pepsi-summer-refresh',
    sponsor: 'Pepsi',
    title: 'The Summer Refresh Hunt',
    reward: 'Free 20oz Pepsi',
    budget: 250,
    radiusMiles: 25,
    durationDays: 21,
    adventureId: 'river-sentinel',
    icon: '🥤',
  },
  {
    id: 'dq-blizzard-rush',
    sponsor: 'Dairy Queen',
    title: 'Blizzard Rush Weekend',
    reward: 'Buy one get one Blizzard',
    budget: 150,
    radiusMiles: 10,
    durationDays: 3,
    adventureId: 'iron-horse',
    icon: '🍦',
  },
  {
    id: 'walmart-hidden-savings',
    sponsor: 'Walmart',
    title: 'Hidden Savings Adventure',
    reward: '$5 off $25 purchase',
    budget: 500,
    radiusMiles: 30,
    durationDays: 30,
    adventureId: 'parsons-gold-rush',
    icon: '🛒',
  },
];

export const CREATOR_STOREFRONT = [
  {
    id: 'hunt-starter',
    type: 'hunt',
    title: 'Starter Hunt',
    price: 4.99,
    creatorId: 'parsons-heritage',
    desc: 'Single premium trail with medallion reward.',
  },
  {
    id: 'hunt-premium',
    type: 'hunt',
    title: 'Premium Hunt Pack',
    price: 9.99,
    creatorId: 'parsons-heritage',
    desc: 'Three hunts + exclusive coupon bundle.',
  },
  {
    id: 'hunt-legendary',
    type: 'hunt',
    title: 'Legendary Hunt Experience',
    price: 19.99,
    creatorId: 'questory-founders',
    desc: 'Full legendary trail with AR medallion.',
  },
  {
    id: 'collection-parsons',
    type: 'collection',
    title: 'Parsons Legends Pack',
    price: 14.99,
    creatorId: 'parsons-heritage',
    desc: 'Complete collection access + badge.',
  },
  {
    id: 'collection-ghost',
    type: 'collection',
    title: 'Kansas Ghost Trails',
    price: 12.99,
    creatorId: 'parsons-heritage',
    desc: 'All haunted trails in southeast Kansas.',
  },
  {
    id: 'collection-route66',
    type: 'collection',
    title: 'Route 66 Series',
    price: 24.99,
    creatorId: 'questory-founders',
    desc: 'Cross-state Route 66 adventure bundle.',
  },
];

export const MARKETPLACE_TEMPLATES = [
  { id: 'starter', label: 'Starter Drop', budget: 100, radiusMiles: 15, durationDays: 14 },
  { id: 'growth', label: 'Growth Campaign', budget: 250, radiusMiles: 25, durationDays: 21 },
  { id: 'citywide', label: 'Citywide Blitz', budget: 500, radiusMiles: 30, durationDays: 30 },
];

export const STUDIOS_PARTNERS = [
  {
    id: 'parsons-heritage',
    name: 'Parsons Heritage',
    verified: true,
    revenueShare: 0.7,
    featured: true,
    collections: 3,
    hunts: 12,
    rating: 4.9,
  },
  {
    id: 'questory-founders',
    name: 'QUESTORY Founders',
    verified: true,
    revenueShare: 0.75,
    featured: true,
    collections: 2,
    hunts: 6,
    rating: 5.0,
  },
  {
    id: 'route66-collective',
    name: 'Route 66 Collective',
    verified: true,
    revenueShare: 0.65,
    featured: false,
    collections: 1,
    hunts: 8,
    rating: 4.7,
  },
];

export const DEFAULT_EXPANSION = {
  subscription: {
    tier: SUBSCRIPTION_TIER.FREE,
    status: 'inactive',
    startedAt: null,
    expiresAt: null,
    monthlyCoinDropClaimed: false,
  },
  cashWallet: {
    balanceCents: 0,
    stripeConnected: false,
    stripeAccountId: null,
    earnings: [],
    withdrawals: [],
  },
  purchasedProducts: [],
  legendaryClaims: [],
  passport: {
    regionsVisited: ['Kansas'],
    nationalUnlocked: false,
    stamps: [],
    theme: 'classic',
  },
  marketplaceCampaigns: [],
  arCaptures: [],
};

export function normalizeExpansion(expansion = {}) {
  return {
    ...DEFAULT_EXPANSION,
    ...expansion,
    subscription: { ...DEFAULT_EXPANSION.subscription, ...(expansion.subscription || {}) },
    cashWallet: {
      ...DEFAULT_EXPANSION.cashWallet,
      ...(expansion.cashWallet || {}),
      earnings: Array.isArray(expansion.cashWallet?.earnings) ? expansion.cashWallet.earnings : [],
      withdrawals: Array.isArray(expansion.cashWallet?.withdrawals)
        ? expansion.cashWallet.withdrawals
        : [],
    },
    purchasedProducts: Array.isArray(expansion.purchasedProducts) ? expansion.purchasedProducts : [],
    legendaryClaims: Array.isArray(expansion.legendaryClaims) ? expansion.legendaryClaims : [],
    passport: { ...DEFAULT_EXPANSION.passport, ...(expansion.passport || {}) },
    marketplaceCampaigns: Array.isArray(expansion.marketplaceCampaigns)
      ? expansion.marketplaceCampaigns
      : [],
    arCaptures: Array.isArray(expansion.arCaptures) ? expansion.arCaptures : [],
  };
}

export function normalizeFinderMode(mode) {
  const value = String(mode || FINDER_MODES.FINDER).toLowerCase();
  if (value === 'traditional' || value === 'gps') return FINDER_MODES.TRADITIONAL;
  if (value === 'ar' || value === 'ar_enhanced') return FINDER_MODES.AR_ENHANCED;
  return FINDER_MODES.FINDER;
}

export function usesArFinder(adventure) {
  return normalizeFinderMode(adventure?.finderMode) === FINDER_MODES.AR_ENHANCED;
}

export function usesFinderFlow(adventure) {
  const mode = normalizeFinderMode(adventure?.finderMode);
  return mode === FINDER_MODES.FINDER || mode === FINDER_MODES.AR_ENHANCED;
}

export function isPremiumSubscriber(state) {
  const sub = normalizeExpansion(state.expansion).subscription;
  return sub.tier === SUBSCRIPTION_TIER.PREMIUM && sub.status === 'active';
}

export function canAccessPremiumHunt(state, adventure) {
  if (!isPremiumAdventure(adventure)) return true;
  if (isPremiumSubscriber(state)) return true;
  return hasPremiumUnlock(state, adventure.id);
}

export function subscribeToPremium(state) {
  const expansion = normalizeExpansion(state.expansion);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return {
    ...state,
    coins: state.coins + 500,
    expansion: {
      ...expansion,
      subscription: {
        tier: SUBSCRIPTION_TIER.PREMIUM,
        status: 'active',
        startedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        monthlyCoinDropClaimed: true,
      },
    },
  };
}

export function cancelPremium(state) {
  const expansion = normalizeExpansion(state.expansion);
  return {
    ...state,
    expansion: {
      ...expansion,
      subscription: {
        ...expansion.subscription,
        status: 'cancelled',
        tier: SUBSCRIPTION_TIER.FREE,
      },
    },
  };
}

export function connectStripeWallet(state) {
  const expansion = normalizeExpansion(state.expansion);
  return {
    ...state,
    expansion: {
      ...expansion,
      cashWallet: {
        ...expansion.cashWallet,
        stripeConnected: true,
        stripeAccountId: `acct_demo_${Date.now()}`,
      },
    },
  };
}

export function withdrawCash(state, amountCents) {
  const expansion = normalizeExpansion(state.expansion);
  const wallet = expansion.cashWallet;
  if (!wallet.stripeConnected) return { ok: false, message: 'Connect Stripe Express first.' };
  if (amountCents > wallet.balanceCents) return { ok: false, message: 'Insufficient balance.' };
  const withdrawal = {
    id: `wd-${Date.now()}`,
    amountCents,
    status: 'processing',
    createdAt: new Date().toISOString(),
  };
  return {
    ok: true,
    state: {
      ...state,
      expansion: {
        ...expansion,
        cashWallet: {
          ...wallet,
          balanceCents: wallet.balanceCents - amountCents,
          withdrawals: [withdrawal, ...wallet.withdrawals],
        },
      },
    },
  };
}

export function recordCashPrize(state, adventure, placement) {
  const expansion = normalizeExpansion(state.expansion);
  const pool = adventure.cashPrizePool || 0;
  if (!pool) return state;

  const payouts = adventure.cashPayouts || { first: 0.6, second: 0.3, random: 0.1 };
  let amount = 0;
  if (placement === 1) amount = Math.round(pool * payouts.first * 100);
  else if (placement === 2) amount = Math.round(pool * payouts.second * 100);
  else amount = Math.round(pool * payouts.random * 100);

  const earning = {
    id: `earn-${Date.now()}`,
    adventureId: adventure.id,
    adventureTitle: adventure.title,
    placement,
    amountCents: amount,
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    expansion: {
      ...expansion,
      cashWallet: {
        ...expansion.cashWallet,
        balanceCents: expansion.cashWallet.balanceCents + amount,
        earnings: [earning, ...expansion.cashWallet.earnings],
      },
    },
  };
}

export function purchaseStorefrontProduct(state, product) {
  const expansion = normalizeExpansion(state.expansion);
  if (expansion.purchasedProducts.includes(product.id)) {
    return { ok: false, message: 'You already own this.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      expansion: {
        ...expansion,
        purchasedProducts: [...expansion.purchasedProducts, product.id],
      },
    },
  };
}

export function launchMarketplaceCampaign(state, template, { reward, sponsorName }) {
  const name = sponsorName?.trim();
  if (!name) {
    return { ok: false, message: 'Enter your business name to launch a campaign.' };
  }
  const expansion = normalizeExpansion(state.expansion);
  const campaign = {
    id: `campaign-${Date.now()}`,
    templateId: template.id,
    sponsorName: name,
    reward: reward?.trim() || 'Special offer',
    budget: template.budget,
    radiusMiles: template.radiusMiles,
    durationDays: template.durationDays,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  return {
    ok: true,
    message: `${template.label} campaign launched for ${name}!`,
    state: {
      ...state,
      expansion: {
        ...expansion,
        marketplaceCampaigns: [campaign, ...expansion.marketplaceCampaigns],
      },
    },
  };
}

export function isLegendaryHunt(adventure) {
  return Boolean(adventure?.isLegendaryHunt || adventure?.legendaryType);
}

export function getLegendaryMeta(adventure) {
  const type = adventure?.legendaryType || LEGENDARY_HUNT_TYPES.LOST_LEDGER;
  return LEGENDARY_HUNT_META[type] || LEGENDARY_HUNT_META.lost_ledger;
}

export function claimLegendaryHunt(state, adventure) {
  if (!isLegendaryHunt(adventure)) return state;
  const expansion = normalizeExpansion(state.expansion);
  if (expansion.legendaryClaims.includes(adventure.id)) return state;
  return {
    ...state,
    expansion: {
      ...expansion,
      legendaryClaims: [...expansion.legendaryClaims, adventure.id],
    },
  };
}

export function recordArCapture(state, adventureId) {
  const expansion = normalizeExpansion(state.expansion);
  if (expansion.arCaptures.includes(adventureId)) return state;
  return {
    ...state,
    expansion: {
      ...expansion,
      arCaptures: [...expansion.arCaptures, adventureId],
    },
  };
}

export function addPassportStamp(state, region, city) {
  const expansion = normalizeExpansion(state.expansion);
  const stampKey = `${region}:${city}`;
  const stamps = expansion.passport.stamps.includes(stampKey)
    ? expansion.passport.stamps
    : [...expansion.passport.stamps, stampKey];
  const regionsVisited = expansion.passport.regionsVisited.includes(region)
    ? expansion.passport.regionsVisited
    : [...expansion.passport.regionsVisited, region];
  const nationalUnlocked = regionsVisited.length >= 3;
  return {
    ...state,
    expansion: {
      ...expansion,
      passport: { ...expansion.passport, stamps, regionsVisited, nationalUnlocked },
    },
  };
}

export function getNationalPassportView(state) {
  const expansion = normalizeExpansion(state.expansion);
  const visited = new Set(expansion.passport.regionsVisited);
  const stamped = new Set(expansion.passport.stamps);

  return NATIONAL_REGIONS.map((region) => ({
    ...region,
    visited: visited.has(region.label),
    cities: region.cities.map((city) => ({
      name: city,
      stamped: stamped.has(`${region.label}:${city}`),
    })),
  }));
}

export function getCashHuntLabel(adventure) {
  const pool = adventure?.cashPrizePool;
  if (!pool) return null;
  return `$${pool} Prize Pool`;
}

export function formatCents(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getSponsoredDropForAdventure(adventureId) {
  return SPONSORED_CITY_DROPS.find((d) => d.adventureId === adventureId) || null;
}

export function getStorefrontForCreator(creatorId) {
  return CREATOR_STOREFRONT.filter((p) => p.creatorId === creatorId);
}

export function getStreakMultiplier(state) {
  return isPremiumSubscriber(state) ? 2 : 1;
}

export function applyExpansionOnCompletion(state, adventure, placement = 1) {
  let next = addPassportStamp(
    state,
    adventure.state || adventure.region || 'Kansas',
    adventure.city || 'Unknown'
  );

  if (isLegendaryHunt(adventure)) {
    next = claimLegendaryHunt(next, adventure);
  }

  if (adventure.cashPrizePool) {
    next = recordCashPrize(next, adventure, placement);
  }

  return next;
}
