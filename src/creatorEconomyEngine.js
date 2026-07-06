/**
 * Questory 2.0 — Phase 12: Creator Economy
 * Authoritative creator profiles, followers, revenue, analytics, and store catalog.
 * Extends economy.js / seasonEngine — does not replace them.
 */
import {
  CREATOR_PROFILES,
  getAdventureRating,
  getCreatorForAdventure,
  isPremiumAdventure,
  normalizeEconomy,
  PREMIUM_SPLIT,
  toggleFollowCreator,
} from './economy';
import { getAdventureProgress, ADVENTURE_STATUS } from './seed';
import { CREATOR_WORLDS, getCurrentSeason } from './seasonEngine';
import { HALL_OF_FAME_EXPLORERS } from './questoryIdentityEngine';
import { safeGetTime } from './dateUtils';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { applyFactionOnCreatorCompletion } from './factionEngine';

export const CREATOR_ECONOMY_LIMITS = {
  MAX_TIMELINE: 12,
  MAX_TRENDING: 8,
  MAX_STORE_ITEMS: 24,
  MAX_NOTIFICATIONS: 20,
};

export const ADVENTURE_ACCESS = {
  FREE: 'free',
  PREMIUM: 'premium',
  MEMBERS_ONLY: 'members_only',
  SPONSORED: 'sponsored',
  EVENT_EXCLUSIVE: 'event_exclusive',
  CREATOR_PASS: 'creator_pass',
};

export const VERIFICATION_TIERS = {
  VERIFIED: { id: 'verified', label: 'Verified', icon: '✓', className: 'creator-verified' },
  OFFICIAL_PARTNER: { id: 'official_partner', label: 'Official Partner', icon: '🤝', className: 'creator-partner' },
  FEATURED: { id: 'featured', label: 'Featured Creator', icon: '⭐', className: 'creator-featured' },
  HALL_OF_FAME: { id: 'hall_of_fame', label: 'Hall of Fame', icon: '🏛️', className: 'creator-hof' },
  FOUNDING: { id: 'founding', label: 'Founding Creator', icon: '🏔️', className: 'creator-founding' },
  SPONSORED: { id: 'sponsored', label: 'Sponsored Creator', icon: '💼', className: 'creator-sponsored' },
  TOP: { id: 'top', label: 'Top Creator', icon: '🔥', className: 'creator-top' },
  LEGENDARY: { id: 'legendary', label: 'Legendary Creator', icon: '👑', className: 'creator-legendary' },
};

export const CREATOR_RANKS = [
  { id: 'newcomer', label: 'Newcomer', minXp: 0, icon: '🌱' },
  { id: 'trail_builder', label: 'Trail Builder', minXp: 500, icon: '🥾' },
  { id: 'world_maker', label: 'World Maker', minXp: 1500, icon: '🗺️' },
  { id: 'master_creator', label: 'Master Creator', minXp: 4000, icon: '🎨' },
  { id: 'legendary_creator', label: 'Legendary Creator', minXp: 9000, icon: '👑' },
];

export const STORE_CATALOG = [
  { id: 'pack-rails', kind: 'adventure_pack', label: 'Iron Rails Pack', priceCoins: 400, icon: '🎒' },
  { id: 'pack-downtown', kind: 'map_pack', label: 'Downtown Map Pack', priceCoins: 250, icon: '🗺️' },
  { id: 'lore-book-1', kind: 'lore_book', label: 'Parsons Lore Vol. I', priceCoins: 180, icon: '📖' },
  { id: 'soundtrack-trail', kind: 'soundtrack', label: 'Trail Ambience', priceCoins: 120, icon: '🎵' },
  { id: 'collectible-lantern', kind: 'collectible', label: 'Lantern Relic Card', priceCoins: 300, icon: '✨' },
  { id: 'badge-creator-supporter', kind: 'badge', label: 'Creator Supporter Badge', priceCoins: 150, icon: '🏅' },
  { id: 'season-pass-s1', kind: 'season_pass', label: 'Founders Season Pass', priceCoins: 600, icon: '🎫' },
  { id: 'bundle-heritage', kind: 'bundle', label: 'Heritage Creator Bundle', priceCoins: 900, icon: '📦' },
  { id: 'merch-hat', kind: 'merch', label: 'Trail Cap (placeholder)', priceCoins: 0, icon: '🧢', placeholder: true },
  { id: 'reward-pack-starter', kind: 'reward_pack', label: 'Explorer Reward Pack', priceCoins: 200, icon: '🎁' },
];

/** Intentional Phase 12+ future hooks — exported for Creator Dashboard UI. */
export const EXTENSION_HOOKS = {
  stripeConnect: { enabled: false, label: 'Stripe Connect payouts' },
  revenueSharing: { enabled: false, label: 'Revenue sharing splits' },
  subscriptions: { enabled: false, label: 'Paid subscriptions' },
  ads: { enabled: false, label: 'Brand ad placements' },
  brandSponsorships: { enabled: true, label: 'Sponsored campaigns (simulated)' },
  marketplace: { enabled: true, label: 'Global marketplace' },
  nftDisabledCollectibles: { enabled: true, label: 'Digital collectibles (no NFT)' },
  creatorTeams: { enabled: false, label: 'Creator teams' },
  creatorOrganizations: { enabled: false, label: 'Creator organizations' },
};

export const DEFAULT_CREATOR_ECONOMY = {
  subscriptions: [],
  favorites: [],
  storePurchases: [],
  tipsSent: [],
  notifications: [],
  creatorStats: {},
  studioXp: 0,
  lastVisitByCreator: {},
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function normalizeCreatorEconomy(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CREATOR_ECONOMY };
  return {
    subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions.slice(0, 40) : [],
    favorites: Array.isArray(raw.favorites) ? raw.favorites.slice(0, 40) : [],
    storePurchases: Array.isArray(raw.storePurchases) ? raw.storePurchases.slice(0, 60) : [],
    tipsSent: Array.isArray(raw.tipsSent) ? raw.tipsSent.slice(0, 40) : [],
    notifications: Array.isArray(raw.notifications) ? raw.notifications.slice(0, CREATOR_ECONOMY_LIMITS.MAX_NOTIFICATIONS) : [],
    creatorStats:
      raw.creatorStats && typeof raw.creatorStats === 'object' ? { ...raw.creatorStats } : {},
    studioXp: Math.max(0, Number(raw.studioXp) || 0),
    lastVisitByCreator:
      raw.lastVisitByCreator && typeof raw.lastVisitByCreator === 'object'
        ? { ...raw.lastVisitByCreator }
        : {},
  };
}

function resolveCreatorRank(xp = 0) {
  let rank = CREATOR_RANKS[0];
  for (const r of CREATOR_RANKS) {
    if (xp >= r.minXp) rank = r;
  }
  return rank;
}

function resolveCreatorLevel(xp = 0) {
  return Math.min(50, Math.floor(xp / 200) + 1);
}

function resolveVerificationBadges(creator, profile) {
  const badges = [];
  if (profile?.verified) badges.push(VERIFICATION_TIERS.VERIFIED);
  if (creator.id === 'questory-founders') badges.push(VERIFICATION_TIERS.FOUNDING);
  if (profile?.sponsorPartners?.length) badges.push(VERIFICATION_TIERS.SPONSORED);
  if (creator.totalPlays >= 5000) badges.push(VERIFICATION_TIERS.TOP);
  if (creator.totalPlays >= 10000) badges.push(VERIFICATION_TIERS.LEGENDARY);
  if (HALL_OF_FAME_EXPLORERS?.some((e) => e.creatorId === creator.id)) {
    badges.push(VERIFICATION_TIERS.HALL_OF_FAME);
  }
  if (creator.trending) badges.push(VERIFICATION_TIERS.FEATURED);
  return badges;
}

function resolveAdventureAccess(adventure) {
  if (adventure?.accessTier) return adventure.accessTier;
  if (adventure?.isFounderHunt) return ADVENTURE_ACCESS.EVENT_EXCLUSIVE;
  if (adventure?.isSponsoredDrop || adventure?.sponsorVerified) return ADVENTURE_ACCESS.SPONSORED;
  if (isPremiumAdventure(adventure)) return ADVENTURE_ACCESS.PREMIUM;
  if (adventure?.membersOnly) return ADVENTURE_ACCESS.MEMBERS_ONLY;
  if (adventure?.creatorPassRequired) return ADVENTURE_ACCESS.CREATOR_PASS;
  return ADVENTURE_ACCESS.FREE;
}

function adventuresForCreator(creatorId, adventures = []) {
  return adventures.filter(
    (a) =>
      a.creatorProfileId === creatorId ||
      a.creatorId === creatorId ||
      a.creatorWorldId === creatorId
  );
}

function buildCreatorWorld(creatorId, adventures = []) {
  const world = CREATOR_WORLDS.find((w) => w.creatorWorldId === creatorId);
  const creatorAdventures = adventuresForCreator(creatorId, adventures);
  const completed = creatorAdventures.filter((a) => (a.playersCompleted || 0) > 0).length;
  const total = creatorAdventures.length || world?.totalAdventures || 1;
  return {
    hubId: creatorId,
    worldTitle: world?.worldTitle || `${CREATOR_PROFILES[creatorId]?.name || 'Creator'} World`,
    theme: world?.theme || 'exploration',
    collections: [...new Set(creatorAdventures.map((a) => a.collectionName).filter(Boolean))],
    storyArcs: world?.featuredSeries ? [world.featuredSeries] : [],
    bosses: creatorAdventures.filter((a) => a.isLegendaryHunt).map((a) => a.title),
    npcs: [],
    lore: world?.theme ? [`${world.theme} lore arc`] : [],
    achievements: ['First 100 plays', 'Community milestone'],
    creatorPass: { available: true, priceCoins: 350, perks: ['Members-only hunts', 'Early releases'] },
    completionPct: Math.round((completed / total) * 100),
    collectibles: ['Trail medallion', 'Season relic'],
    leaderboard: creatorAdventures
      .slice()
      .sort((a, b) => (b.playersCompleted || 0) - (a.playersCompleted || 0))
      .slice(0, 5)
      .map((a) => ({ id: a.id, label: a.title, plays: a.playersCompleted || 0 })),
  };
}

function buildCreatorAnalytics(creatorId, adventures = [], stored = {}, now = Date.now()) {
  const creatorAdventures = adventuresForCreator(creatorId, adventures);
  const stats = stored[creatorId] || {};
  const totalPlays = creatorAdventures.reduce((s, a) => s + (a.playersCompleted || 0), 0);
  const seed = hashSeed(creatorId);
  const daily = stats.dailyPlayers ?? 12 + (seed % 40) + Math.floor(totalPlays / 50);
  const weekly = stats.weeklyPlayers ?? daily * 5 + (seed % 80);
  const monthly = stats.monthlyPlayers ?? weekly * 4 + (seed % 200);
  const completionPct = stats.completionPct ?? Math.min(92, 55 + (seed % 30));
  const abandonPct = stats.abandonPct ?? Math.max(5, 18 - (seed % 10));
  const revenueTotal = stats.revenueTotal ?? Math.round(totalPlays * 2.4 + (stats.premiumRevenue || 0));

  return {
    dailyPlayers: daily,
    weeklyPlayers: weekly,
    monthlyPlayers: monthly,
    completionPct,
    abandonPct,
    avgPlayMinutes: stats.avgPlayMinutes ?? 22 + (seed % 18),
    revenue: {
      total: revenueTotal,
      premium: stats.premiumRevenue ?? Math.round(revenueTotal * 0.55),
      tips: stats.tipsRevenue ?? Math.round(revenueTotal * 0.12),
      subscriptions: stats.subscriptionRevenue ?? Math.round(revenueTotal * 0.18),
      simulated: true,
    },
    followersGained: stats.followersGained ?? 8 + (seed % 20),
    subscriberGrowth: stats.subscriberGrowth ?? 2 + (seed % 6),
    topAdventures: creatorAdventures
      .slice()
      .sort((a, b) => (b.playersCompleted || 0) - (a.playersCompleted || 0))
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        label: a.title,
        plays: a.playersCompleted || 0,
        completionPct: Math.min(95, 40 + hashSeed(a.id) % 50),
      })),
    heatMap: creatorAdventures.slice(0, 4).map((a, i) => ({
      id: `heat-${a.id}`,
      label: a.title,
      intensity: Math.min(100, (a.playersCompleted || 0) * 2 + i * 10),
    })),
    discoveryMap: [{ country: 'USA', city: 'Parsons', sessions: monthly }],
    countryTraffic: [{ country: 'USA', pct: 78 }, { country: 'Canada', pct: 12 }],
    cityTraffic: [{ city: 'Parsons', pct: 64 }, { city: 'Kansas City', pct: 14 }],
    repeatPlayers: stats.repeatPlayers ?? Math.round(monthly * 0.22),
    reputation: buildCreatorReputation(creatorId, adventures, stats),
  };
}

function buildCreatorReputation(creatorId, adventures = [], stats = {}) {
  const creatorAdventures = adventuresForCreator(creatorId, adventures);
  const ratings = creatorAdventures.map((a) => getAdventureRating(a.id, { economy: { ratings: [] } }, a).avg);
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : CREATOR_PROFILES[creatorId]?.rating ?? 4.8;
  const completionRate = stats.completionPct ?? 68;
  return {
    adventureQuality: Math.min(100, Math.round(avgRating * 18)),
    completionRate,
    avgRating,
    reports: stats.reports ?? 0,
    communityScore: Math.min(100, 60 + hashSeed(creatorId) % 35),
    responseTimeHours: stats.responseTimeHours ?? 4 + (hashSeed(creatorId) % 8),
    updateFrequency: stats.updateFrequency ?? 'weekly',
    playerRetention: Math.min(100, 45 + hashSeed(`${creatorId}-ret`) % 40),
    bossParticipation: stats.bossParticipation ?? hashSeed(creatorId) % 30,
    seasonParticipation: stats.seasonParticipation ?? 72,
  };
}

function buildCreatorProfile(creatorId, state, adventures = [], options = {}) {
  const profile = CREATOR_PROFILES[creatorId] || Object.values(CREATOR_PROFILES)[0];
  const economy = normalizeEconomy(state?.economy);
  const stored = normalizeCreatorEconomy(state?.creatorEconomy);
  const creatorAdventures = adventuresForCreator(creatorId, adventures);
  const published = creatorAdventures.filter((a) => a.status === ADVENTURE_STATUS.PUBLISHED);
  const totalPlays = creatorAdventures.reduce((s, a) => s + (a.playersCompleted || 0), 0);
  const totalDiscoveries = creatorAdventures.reduce((s, a) => s + (a.fogTilesRevealed || 0), 0);
  const xp = (stored.creatorStats[creatorId]?.xp ?? 0) + profile.completions * 2 + totalPlays;
  const rank = resolveCreatorRank(xp);
  const level = resolveCreatorLevel(xp);
  const following = economy.follows.includes(creatorId);
  const subscribed = stored.subscriptions.includes(creatorId);
  const favorited = stored.favorites.includes(creatorId);
  const ratings = published.map((a) => getAdventureRating(a.id, state, a));
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r.avg, 0) / ratings.length) * 10) / 10
      : profile.rating;
  const completionPct =
    published.length > 0
      ? Math.round(
          published.reduce((s, a) => s + Math.min(100, (a.playersCompleted || 0) * 3), 0) /
            published.length
        )
      : 0;
  const newest = published
    .slice()
    .sort((a, b) => safeGetTime(b.updatedAt || b.createdAt) - safeGetTime(a.updatedAt || a.createdAt))[0];
  const trending = totalPlays >= 100 || creatorId === 'questory-founders';

  const creator = {
    id: creatorId,
    name: profile.name,
    avatar: profile.avatar || '🧭',
    banner: profile.banner || 'linear-gradient(135deg, #0f172a, #1e3a5f)',
    bio: profile.bio,
    followers: profile.followers + economy.follows.filter((id) => id === creatorId).length,
    subscribers: Math.round(profile.followers * 0.08) + stored.subscriptions.filter((id) => id === creatorId).length,
    following: economy.follows.length,
    level,
    rank,
    xp,
    verified: profile.verified,
    verificationBadges: [],
    explorerRank: rank.label,
    creatorRank: rank,
    worldsCreated: CREATOR_WORLDS.filter((w) => w.creatorWorldId === creatorId).length || (creatorId ? 1 : 0),
    activeAdventures: published.length,
    totalDiscoveries,
    totalPlays,
    completionPct,
    avgRating,
    treasuresFound: Math.round(totalPlays * 0.7),
    bossesCreated: creatorAdventures.filter((a) => a.isLegendaryHunt).length,
    reputation: buildCreatorReputation(creatorId, adventures, stored.creatorStats[creatorId]),
    sponsorLevel: profile.sponsorPartners?.length ? 'partner' : 'community',
    newestRelease: newest ? { id: newest.id, title: newest.title, at: newest.updatedAt } : null,
    trending,
    hallOfFamePosition: HALL_OF_FAME_EXPLORERS?.findIndex((e) => e.creatorId === creatorId) + 1 || null,
    isFollowing: following,
    isSubscribed: subscribed,
    isFavorite: favorited,
    world: buildCreatorWorld(creatorId, adventures),
    analytics: buildCreatorAnalytics(creatorId, adventures, stored.creatorStats, options.now),
    adventures: published.map((a) => ({
      id: a.id,
      title: a.title,
      access: resolveAdventureAccess(a),
      plays: a.playersCompleted || 0,
      premium: isPremiumAdventure(a),
    })),
    badges: profile.badges || [],
    sponsorPartners: profile.sponsorPartners || [],
  };
  creator.verificationBadges = resolveVerificationBadges(creator, profile);
  return creator;
}

function buildTimelineFeed(creators, now = Date.now()) {
  const entries = [];
  for (const c of creators.slice(0, 4)) {
    if (c.newestRelease) {
      entries.push({
        id: `creator-release-${c.id}`,
        kind: 'creator',
        icon: '🎬',
        text: `${c.name} released ${c.newestRelease.title}`,
        creatorId: c.id,
        at: c.newestRelease.at || new Date(safeGetTime(now)).toISOString(),
      });
    }
    if (c.totalPlays >= 1000) {
      entries.push({
        id: `creator-plays-${c.id}`,
        kind: 'creator',
        icon: '📈',
        text: `${c.name} reached ${c.totalPlays.toLocaleString()} plays`,
        creatorId: c.id,
      });
    }
    if (c.verificationBadges.some((b) => b.id === 'verified')) {
      entries.push({
        id: `creator-verified-${c.id}`,
        kind: 'creator',
        icon: '✓',
        text: `${c.name} is Verified`,
        creatorId: c.id,
      });
    }
  }
  entries.push({
    id: 'creator-sponsored-campaign',
    kind: 'creator',
    icon: '💼',
    text: 'New sponsored campaign — Parsons Heritage Trail',
    creatorId: 'parsons-heritage',
  });
  return entries.slice(0, CREATOR_ECONOMY_LIMITS.MAX_TIMELINE);
}

export function getCreatorEconomySnapshot(state = null, adventures = [], options = {}) {
  const now = options.now ?? Date.now();
  const stored = normalizeCreatorEconomy(state?.creatorEconomy);
  const economy = normalizeEconomy(state?.economy);
  const creatorIds = [
    ...new Set([
      ...Object.keys(CREATOR_PROFILES),
      ...CREATOR_WORLDS.map((w) => w.creatorWorldId),
      ...economy.follows,
    ]),
  ].filter(Boolean);

  const creators = creatorIds.map((id) => buildCreatorProfile(id, state, adventures, { now }));
  const trendingCreators = creators
    .filter((c) => c.trending)
    .sort((a, b) => b.totalPlays - a.totalPlays)
    .slice(0, CREATOR_ECONOMY_LIMITS.MAX_TRENDING);
  const rankings = creators
    .slice()
    .sort((a, b) => b.totalPlays - a.totalPlays)
    .map((c, i) => ({ rank: i + 1, creatorId: c.id, name: c.name, totalPlays: c.totalPlays }));

  const followedCreators = creators.filter((c) => economy.follows.includes(c.id));
  const subscribedCreators = creators.filter((c) => stored.subscriptions.includes(c.id));
  const favoriteWorlds = CREATOR_WORLDS.filter((w) => stored.favorites.includes(w.creatorWorldId));

  return wrapEngineSnapshot({
    creators,
    creatorById: Object.fromEntries(creators.map((c) => [c.id, c])),
    following: economy.follows,
    subscriptions: stored.subscriptions,
    favorites: stored.favorites,
    followedCreators,
    subscribedCreators,
    favoriteWorlds,
    trendingCreators,
    rankings,
    storeCatalog: STORE_CATALOG.slice(0, CREATOR_ECONOMY_LIMITS.MAX_STORE_ITEMS),
    ownedStoreItems: stored.storePurchases,
    premiumOwnership: economy.premiumUnlocks,
    timelineFeed: buildTimelineFeed(creators, now),
    socialFeed: buildSocialCreatorFeed(creators, economy, stored),
    notifications: stored.notifications,
    extensionHooks: EXTENSION_HOOKS,
    season: getCurrentSeason(),
    studioXp: stored.studioXp,
    studioRank: resolveCreatorRank(stored.studioXp),
    activeCreatorId: options.creatorId || creatorIds[0],
    dashboard: buildDashboardSnapshot(creators[0], stored, adventures),
  });
}

function buildSocialCreatorFeed(creators, economy, stored) {
  const items = [];
  if (economy.follows.length) {
    items.push({
      id: 'friend-follows',
      icon: '👥',
      text: `You follow ${economy.follows.length} creator${economy.follows.length === 1 ? '' : 's'}`,
    });
  }
  items.push({
    id: 'livestream-placeholder',
    icon: '📡',
    text: 'Creator livestream — coming soon',
    placeholder: true,
  });
  for (const c of creators.filter((cr) => cr.trending).slice(0, 3)) {
    items.push({
      id: `milestone-${c.id}`,
      icon: c.rank.icon,
      text: `${c.name} · ${c.rank.label}`,
      creatorId: c.id,
    });
  }
  return items.slice(0, 8);
}

function buildDashboardSnapshot(primaryCreator, stored, adventures) {
  if (!primaryCreator) return null;
  return {
    overview: {
      totalPlays: primaryCreator.totalPlays,
      followers: primaryCreator.followers,
      subscribers: primaryCreator.subscribers,
      revenue: primaryCreator.analytics.revenue.total,
      level: primaryCreator.level,
      rank: primaryCreator.rank,
    },
    analytics: primaryCreator.analytics,
    worlds: [primaryCreator.world],
    adventures: primaryCreator.adventures,
    verification: primaryCreator.verificationBadges,
    storeCatalog: STORE_CATALOG,
    ownedItems: stored.storePurchases,
  };
}

export function followCreator(state, creatorId) {
  if (!creatorId) return state;
  const next = toggleFollowCreator(state, creatorId);
  const stored = normalizeCreatorEconomy(next.creatorEconomy);
  const following = normalizeEconomy(next.economy).follows.includes(creatorId);
  const notification = {
    id: `notif-follow-${creatorId}-${Date.now()}`,
    kind: following ? 'follow' : 'unfollow',
    creatorId,
    text: following ? `You followed ${CREATOR_PROFILES[creatorId]?.name || 'a creator'}` : 'Unfollowed creator',
    at: new Date().toISOString(),
    read: false,
  };
  return {
    ...next,
    creatorEconomy: {
      ...stored,
      notifications: [notification, ...stored.notifications].slice(0, CREATOR_ECONOMY_LIMITS.MAX_NOTIFICATIONS),
    },
  };
}

export function unfollowCreator(state, creatorId) {
  const economy = normalizeEconomy(state?.economy);
  if (!economy.follows.includes(creatorId)) return state;
  return followCreator(state, creatorId);
}

export function subscribeCreator(state, creatorId) {
  const stored = normalizeCreatorEconomy(state?.creatorEconomy);
  const subscriptions = stored.subscriptions.includes(creatorId)
    ? stored.subscriptions.filter((id) => id !== creatorId)
    : [...stored.subscriptions, creatorId];
  return {
    ...state,
    creatorEconomy: {
      ...stored,
      subscriptions,
      notifications: [
        {
          id: `notif-sub-${creatorId}-${Date.now()}`,
          kind: 'subscription',
          creatorId,
          text: subscriptions.includes(creatorId)
            ? `Subscribed to ${CREATOR_PROFILES[creatorId]?.name || 'creator'}`
            : 'Subscription cancelled',
          at: new Date().toISOString(),
          read: false,
        },
        ...stored.notifications,
      ].slice(0, CREATOR_ECONOMY_LIMITS.MAX_NOTIFICATIONS),
    },
  };
}

export function toggleFavoriteCreator(state, creatorId) {
  const stored = normalizeCreatorEconomy(state?.creatorEconomy);
  const favorites = stored.favorites.includes(creatorId)
    ? stored.favorites.filter((id) => id !== creatorId)
    : [...stored.favorites, creatorId];
  return { ...state, creatorEconomy: { ...stored, favorites } };
}

export function recordCreatorVisit(state, creatorId) {
  if (!creatorId) return state;
  const stored = normalizeCreatorEconomy(state?.creatorEconomy);
  return {
    ...state,
    creatorEconomy: {
      ...stored,
      lastVisitByCreator: { ...stored.lastVisitByCreator, [creatorId]: new Date().toISOString() },
    },
  };
}

function bumpCreatorStat(state, creatorId, patch) {
  const stored = normalizeCreatorEconomy(state?.creatorEconomy);
  const prev = stored.creatorStats[creatorId] || {};
  return {
    ...stored,
    creatorStats: {
      ...stored.creatorStats,
      [creatorId]: { ...prev, ...patch },
    },
  };
}

export function recordCreatorCompletion(state, adventure, options = {}) {
  const creatorId = adventure?.creatorProfileId || adventure?.creatorId;
  if (!creatorId) return state;
  const stored = bumpCreatorStat(state, creatorId, {
    completions: (state?.creatorEconomy?.creatorStats?.[creatorId]?.completions || 0) + 1,
    dailyPlayers: (state?.creatorEconomy?.creatorStats?.[creatorId]?.dailyPlayers || 12) + 1,
  });
  const withXp = awardCreatorXP({ ...state, creatorEconomy: stored }, creatorId, 25, 'completion');
  return applyFactionOnCreatorCompletion(withXp, 'creator-bazaar');
}

export function recordCreatorRevenue(state, creatorId, amount, kind = 'premium') {
  if (!creatorId || !amount) return state;
  const stored = normalizeCreatorEconomy(state?.creatorEconomy);
  const prev = stored.creatorStats[creatorId] || {};
  const key = kind === 'tip' ? 'tipsRevenue' : kind === 'subscription' ? 'subscriptionRevenue' : 'premiumRevenue';
  const stored2 = {
    ...stored,
    creatorStats: {
      ...stored.creatorStats,
      [creatorId]: {
        ...prev,
        [key]: (prev[key] || 0) + amount,
        revenueTotal: (prev.revenueTotal || 0) + amount,
      },
    },
  };
  return awardCreatorXP({ ...state, creatorEconomy: stored2 }, creatorId, Math.round(amount / 10), kind);
}

export function awardCreatorXP(state, creatorId, amount = 10, reason = 'activity') {
  const stored = normalizeCreatorEconomy(state?.creatorEconomy);
  const prev = stored.creatorStats[creatorId] || {};
  const xp = (prev.xp || 0) + amount;
  return {
    ...state,
    creatorEconomy: {
      ...stored,
      studioXp: stored.studioXp + Math.round(amount * 0.5),
      creatorStats: {
        ...stored.creatorStats,
        [creatorId]: { ...prev, xp, lastXpReason: reason, lastXpAt: new Date().toISOString() },
      },
    },
  };
}

export function simulateStorePurchase(state, itemId) {
  const item = STORE_CATALOG.find((i) => i.id === itemId);
  if (!item || item.placeholder) return { ok: false, message: 'Item unavailable' };
  if (state.coins < item.priceCoins) {
    return { ok: false, message: `Need ${item.priceCoins} coins` };
  }
  const stored = normalizeCreatorEconomy(state?.creatorEconomy);
  if (stored.storePurchases.some((p) => p.itemId === itemId)) {
    return { ok: true, state, item, duplicate: true };
  }
  const purchase = { itemId, at: new Date().toISOString(), priceCoins: item.priceCoins };
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - item.priceCoins,
      creatorEconomy: {
        ...stored,
        storePurchases: [...stored.storePurchases, purchase],
      },
    },
    item,
  };
}

export function resolveCreatorPinOverlays(adventure, state = null) {
  if (!adventure || !state) return [];
  const creator = getCreatorForAdventure(adventure);
  const economy = normalizeEconomy(state.economy);
  const stored = normalizeCreatorEconomy(state.creatorEconomy);
  const overlays = [];
  const add = (id, def) => {
    overlays.push({ id, ...def, priority: def.priority ?? 6 });
  };

  if (creator?.verified) {
    add('creator_verified', { icon: '✓', ring: 'verified', animation: 'pulse', label: 'Verified' });
  }
  if (economy.follows.includes(creator?.id)) {
    add('creator_followed', { icon: '❤️', ring: 'follow', animation: 'float', label: 'Following' });
  }
  if (stored.subscriptions.includes(creator?.id)) {
    add('creator_subscriber', { icon: '⭐', ring: 'gold', animation: 'shimmer', label: 'Subscriber' });
  }
  if (adventure?.isSponsoredDrop || adventure?.sponsorVerified) {
    add('creator_sponsored', { icon: '💼', ring: 'sponsor', animation: 'pulse', label: 'Sponsored' });
  }
  if (CREATOR_WORLDS.some((w) => w.creatorWorldId === creator?.id)) {
    add('creator_world', { icon: '🌍', ring: 'world', animation: 'bounce', label: 'Creator World' });
  }
  if ((adventure?.playersCompleted || 0) >= 30 || adventure?.heatCategory === 'trending') {
    add('creator_trending', { icon: '📈', ring: 'fire', animation: 'shimmer', label: 'Trending' });
  }
  if (creator?.id === 'questory-founders') {
    add('creator_hof', { icon: '🏛️', ring: 'legendary', animation: 'pulse', label: 'Hall of Fame' });
  }
  return overlays;
}

export function getCreatorForAdventureProfile(adventure, state, adventures = []) {
  const creator = getCreatorForAdventure(adventure);
  const snapshot = getCreatorEconomySnapshot(state, adventures);
  return snapshot.creatorById[creator?.id] || buildCreatorProfile(creator?.id, state, adventures);
}

export function recordPremiumPurchaseForCreator(state, adventure, creatorShare) {
  const creatorId = adventure?.creatorProfileId || adventure?.creatorId;
  if (!creatorId || !creatorShare) return state;
  return recordCreatorRevenue(state, creatorId, creatorShare, 'premium');
}

export { resolveAdventureAccess, PREMIUM_SPLIT };
