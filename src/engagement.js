import { getAdventureProgress } from './seed';

export const COIN_REWARDS = {
  ADVENTURE_COMPLETE: 50,
  COLLECTION_COMPLETE: 500,
  FIRST_FINDER: 100,
  DAILY_LOGIN: 10,
  FOUNDER_HUNT: 10000,
  STREAK_BONUS: 20,
};

export const BADGE_DEFS = {
  explorer: {
    id: 'explorer',
    label: 'Explorer',
    icon: '🧭',
    desc: 'Complete 5 hunts',
  },
  pathfinder: {
    id: 'pathfinder',
    label: 'Pathfinder',
    icon: '🥾',
    desc: 'Walk 10 miles',
  },
  'keeper-of-parsons': {
    id: 'keeper-of-parsons',
    label: 'Keeper of Parsons',
    icon: '🏆',
    desc: 'Complete Parsons Legends',
  },
  'night-hunter': {
    id: 'night-hunter',
    label: 'Night Hunter',
    icon: '🌙',
    desc: 'Capture after sunset',
  },
  'first-finder': {
    id: 'first-finder',
    label: 'First Finder',
    icon: '🥇',
    desc: 'First to complete an adventure',
  },
  'founders-circle': {
    id: 'founders-circle',
    label: "Founder's Circle",
    icon: '👑',
    desc: "Find a Founder's Hunt",
  },
  'found-what-was-lost': {
    id: 'found-what-was-lost',
    label: 'Found What Was Lost',
    icon: '✨',
    desc: "Complete a Founder's Hunt",
  },
};

export const COLLECTION_DEFS = {
  'parsons-legends': {
    id: 'parsons-legends',
    name: 'Parsons Legends',
    city: 'Parsons',
    state: 'Kansas',
    region: 'Kansas',
    badgeId: 'keeper-of-parsons',
    badgeLabel: 'Keeper of Parsons Badge',
    rewardCoins: 500,
    exclusiveMedallion: 'Parsons Legends Exclusive Medallion',
  },
  'union-depot-ghost': {
    id: 'union-depot-ghost',
    name: 'Union Depot Ghost',
    city: 'Parsons',
    state: 'Kansas',
    region: 'Kansas',
    badgeId: 'depot-ghost',
    badgeLabel: 'Depot Ghost Badge',
    rewardCoins: 400,
    exclusiveMedallion: 'Depot Ghost Medallion',
  },
  'the-iron-horse': {
    id: 'the-iron-horse',
    name: 'The Iron Horse',
    city: 'Parsons',
    state: 'Kansas',
    region: 'Kansas',
    badgeId: 'iron-horse',
    badgeLabel: 'Iron Horse Badge',
    rewardCoins: 400,
    exclusiveMedallion: 'Iron Horse Medallion',
  },
  'the-hidden-ledger': {
    id: 'the-hidden-ledger',
    name: 'The Hidden Ledger',
    city: 'Parsons',
    state: 'Kansas',
    region: 'Kansas',
    badgeId: 'hidden-ledger',
    badgeLabel: 'Hidden Ledger Badge',
    rewardCoins: 400,
    exclusiveMedallion: 'Hidden Ledger Medallion',
  },
  'river-sentinel': {
    id: 'river-sentinel',
    name: 'River Sentinel',
    city: 'Parsons',
    state: 'Kansas',
    region: 'Kansas',
    badgeId: 'river-sentinel',
    badgeLabel: 'River Sentinel Badge',
    rewardCoins: 400,
    exclusiveMedallion: 'River Sentinel Medallion',
  },
};

const DEMO_LEADERBOARD = [
  { name: 'Sarah J.', coins: 2840, collections: 2, badges: 5, adventures: 8, miles: 12.4, founderHunts: 1 },
  { name: 'Marcus T.', coins: 1920, collections: 1, badges: 4, adventures: 6, miles: 9.1, founderHunts: 0 },
  { name: 'Elena R.', coins: 1650, collections: 1, badges: 3, adventures: 5, miles: 7.8, founderHunts: 0 },
  { name: 'Jake M.', coins: 980, collections: 0, badges: 2, adventures: 3, miles: 4.2, founderHunts: 0 },
];

export const DEFAULT_ENGAGEMENT = {
  badges: [],
  streak: { count: 0, lastLoginDate: null },
  milesWalked: 0,
  adventuresCompleted: 0,
  founderHuntsCompleted: 0,
  collectionsCompleted: [],
  firstFinderAdventures: [],
  completedCollectionRewards: [],
};

export function normalizeEngagement(engagement = {}) {
  return {
    ...DEFAULT_ENGAGEMENT,
    ...engagement,
    badges: Array.isArray(engagement.badges) ? engagement.badges : [],
    streak: {
      ...DEFAULT_ENGAGEMENT.streak,
      ...(engagement.streak || {}),
    },
    collectionsCompleted: Array.isArray(engagement.collectionsCompleted)
      ? engagement.collectionsCompleted
      : [],
    firstFinderAdventures: Array.isArray(engagement.firstFinderAdventures)
      ? engagement.firstFinderAdventures
      : [],
    completedCollectionRewards: Array.isArray(engagement.completedCollectionRewards)
      ? engagement.completedCollectionRewards
      : [],
  };
}

export function getCollectionId(adventure) {
  return adventure?.collectionId || adventure?.collection_id || null;
}

export function getCollectionDef(collectionId) {
  return collectionId ? COLLECTION_DEFS[collectionId] || null : null;
}

export function getAdventureCollectionIds(adventure) {
  const ids = adventure?.collectionIds || [];
  const single = getCollectionId(adventure);
  const merged = single ? [single, ...ids] : ids;
  return [...new Set(merged.filter(Boolean))];
}

export function getAdventuresInCollection(adventures, collectionId) {
  return adventures.filter((a) => getAdventureCollectionIds(a).includes(collectionId));
}

export function isAdventureClaimed(state, adventureId) {
  return Boolean(getAdventureProgress(state, adventureId).claimed);
}

export function getCollectionProgress(state, adventures, collectionId) {
  const def = getCollectionDef(collectionId);
  const members = getAdventuresInCollection(adventures, collectionId).filter(
    (a) => a.status === 'published'
  );
  const total = members.length;
  const found = members.filter((a) => isAdventureClaimed(state, a.id)).length;
  const pct = total ? Math.round((found / total) * 100) : 0;
  return {
    ...def,
    collectionId,
    total,
    found,
    pct,
    complete: total > 0 && found >= total,
    adventures: members,
  };
}

export function getAllCollectionProgress(state, adventures) {
  const ids = new Set();
  for (const a of adventures) {
    for (const id of getAdventureCollectionIds(a)) ids.add(id);
  }
  return [...ids].map((id) => getCollectionProgress(state, adventures, id));
}

export function getNearCompleteCollections(state, adventures, threshold = 1) {
  return getAllCollectionProgress(state, adventures)
    .filter((c) => c.total > 0 && !c.complete && c.total - c.found <= threshold)
    .sort((a, b) => b.pct - a.pct);
}

export function parseMilesEstimate(adventure) {
  const raw = adventure?.milesEstimate ?? adventure?.distance;
  if (typeof raw === 'number') return raw;
  const str = String(raw || '');
  const mi = str.match(/([\d.]+)\s*mi/i);
  if (mi) return parseFloat(mi[1]);
  return 0.8;
}

export function getGreetingName(auth, state) {
  return (
    auth?.profile?.display_name?.split(' ')[0] ||
    auth?.user?.email?.split('@')[0] ||
    state?.playerName ||
    'Explorer'
  );
}

export function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function applyDailyLogin(state) {
  const engagement = normalizeEngagement(state.engagement);
  const today = todayKey();
  const yesterday = yesterdayKey();
  const { lastLoginDate, count } = engagement.streak;
  let coinsEarned = 0;
  let nextStreak = count;

  if (lastLoginDate === today) {
    return { state, coinsEarned: 0, streak: engagement.streak };
  }

  if (lastLoginDate === yesterday) {
    nextStreak = count + 1;
  } else {
    nextStreak = 1;
  }

  coinsEarned = COIN_REWARDS.DAILY_LOGIN;
  const nextEngagement = {
    ...engagement,
    streak: { count: nextStreak, lastLoginDate: today },
  };

  return {
    state: {
      ...state,
      coins: state.coins + coinsEarned,
      engagement: nextEngagement,
    },
    coinsEarned,
    streak: nextEngagement.streak,
  };
}

function addBadge(engagement, badgeId) {
  if (engagement.badges.includes(badgeId)) return engagement;
  return { ...engagement, badges: [...engagement.badges, badgeId] };
}

function isNightHunt() {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 6;
}

export function evaluateBadges(engagement, context = {}) {
  let next = { ...engagement };

  if (context.adventuresCompleted >= 5) {
    next = addBadge(next, 'explorer');
  }
  if (context.milesWalked >= 10) {
    next = addBadge(next, 'pathfinder');
  }
  if (context.collectionComplete === 'parsons-legends') {
    next = addBadge(next, 'keeper-of-parsons');
  }
  if (context.nightCapture) {
    next = addBadge(next, 'night-hunter');
  }
  if (context.firstFinder) {
    next = addBadge(next, 'first-finder');
  }
  if (context.founderHuntComplete) {
    next = addBadge(next, 'founders-circle');
    next = addBadge(next, 'found-what-was-lost');
  }

  return next;
}

export function applyAdventureCompletion(state, adventure, adventures) {
  const engagement = normalizeEngagement(state.engagement);
  const miles = parseMilesEstimate(adventure);
  const isFounder = Boolean(adventure.isFounderHunt);
  const isFirstFinder =
    !adventure.firstFinderName &&
    !engagement.firstFinderAdventures.includes(adventure.id);

  let coins = COIN_REWARDS.ADVENTURE_COMPLETE;
  if (adventure.rewardCoins > 0) coins = Math.max(coins, adventure.rewardCoins);
  if (isFounder) coins += COIN_REWARDS.FOUNDER_HUNT;
  if (isFirstFinder) coins += COIN_REWARDS.FIRST_FINDER;

  const adventuresCompleted = engagement.adventuresCompleted + 1;
  const founderHuntsCompleted = engagement.founderHuntsCompleted + (isFounder ? 1 : 0);
  const milesWalked = engagement.milesWalked + miles;

  let nextEngagement = {
    ...engagement,
    adventuresCompleted,
    founderHuntsCompleted,
    milesWalked,
    firstFinderAdventures: isFirstFinder
      ? [...engagement.firstFinderAdventures, adventure.id]
      : engagement.firstFinderAdventures,
  };

  const collectionIds = getAdventureCollectionIds(adventure);
  const newlyCompletedCollections = [];
  const collectionRewards = [];

  for (const collectionId of collectionIds) {
    const progress = getCollectionProgress(
      { ...state, progress: { ...state.progress, [adventure.id]: { claimed: true } } },
      adventures,
      collectionId
    );
    if (
      progress.complete &&
      !engagement.collectionsCompleted.includes(collectionId)
    ) {
      newlyCompletedCollections.push(collectionId);
      const def = getCollectionDef(collectionId);
      if (def) {
        collectionRewards.push({
          collectionId,
          coins: def.rewardCoins || COIN_REWARDS.COLLECTION_COMPLETE,
          medallion: def.exclusiveMedallion,
          badgeId: def.badgeId,
        });
        coins += def.rewardCoins || COIN_REWARDS.COLLECTION_COMPLETE;
      }
    }
  }

  nextEngagement = {
    ...nextEngagement,
    collectionsCompleted: [
      ...nextEngagement.collectionsCompleted,
      ...newlyCompletedCollections,
    ],
    completedCollectionRewards: [
      ...nextEngagement.completedCollectionRewards,
      ...collectionRewards,
    ],
  };

  nextEngagement = evaluateBadges(nextEngagement, {
    adventuresCompleted,
    milesWalked,
    collectionComplete: newlyCompletedCollections.includes('parsons-legends')
      ? 'parsons-legends'
      : null,
    nightCapture: isNightHunt(),
    firstFinder: isFirstFinder,
    founderHuntComplete: isFounder,
  });

  return {
    coins,
    engagement: nextEngagement,
    isFirstFinder,
    newlyCompletedCollections,
    collectionRewards,
    isFounder,
  };
}

export function getPassportData(state, adventures) {
  const published = adventures.filter((a) => a.status === 'published');
  const regions = {};

  for (const adventure of published) {
    const collectionIds = getAdventureCollectionIds(adventure);
    for (const collectionId of collectionIds) {
      const def = getCollectionDef(collectionId);
      if (!def) continue;
      const region = def.region || def.state || 'National';
      const city = def.city || adventure.city || 'Unknown';
      if (!regions[region]) regions[region] = {};
      if (!regions[region][city]) {
        regions[region][city] = { city, region, collections: [] };
      }
      const existing = regions[region][city].collections.find((c) => c.id === collectionId);
      if (!existing) {
        regions[region][city].collections.push(
          getCollectionProgress(state, adventures, collectionId)
        );
      }
    }
  }

  return Object.entries(regions).map(([region, cities]) => ({
    region,
    cities: Object.values(cities).map((cityData) => ({
      ...cityData,
      found: cityData.collections.reduce((sum, c) => sum + c.found, 0),
      total: cityData.collections.reduce((sum, c) => sum + c.total, 0),
    })),
  }));
}

export function getUserLeaderboardStats(state) {
  const engagement = normalizeEngagement(state.engagement);
  const collections = engagement.collectionsCompleted.length;
  return {
    name: 'You',
    isYou: true,
    coins: state.coins,
    collections,
    badges: engagement.badges.length,
    adventures: engagement.adventuresCompleted,
    miles: Math.round(engagement.milesWalked * 10) / 10,
    founderHunts: engagement.founderHuntsCompleted,
  };
}

export function getLeaderboard(scope, state) {
  const you = getUserLeaderboardStats(state);
  const pool = [...DEMO_LEADERBOARD, you];
  const sorted = [...pool].sort((a, b) => b.coins - a.coins);

  if (scope === 'local') return sorted.slice(0, 8);
  if (scope === 'state') return sorted.map((r) => ({ ...r, coins: Math.round(r.coins * 1.2) }));
  return sorted.map((r) => ({ ...r, coins: Math.round(r.coins * 2.5) }));
}

export function countPublishedHunts(adventures) {
  return adventures.filter((a) => a.status === 'published').length;
}

export function formatDifficulty(difficulty) {
  const n = Math.min(5, Math.max(1, Number(difficulty) || 3));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function formatEstimatedTime(minutes) {
  const m = Number(minutes) || 25;
  return `${m} min`;
}
