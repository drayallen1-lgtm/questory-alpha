import { ADVENTURE_STATUS, generateClaimCode, getAdventureProgress } from './seed';
import { ADVENTURE_TEMPLATES, buildTemplateClues, buildTemplateStory, getScalePreset } from './templates';
import { CLAIM_METHOD } from './claimSystem';
import { FINDER_MODES } from './expansion';
import { END_RULES } from './rewardInventory';
import { buildQuickCreateAdventure, publishQuickAdventure } from './invitation';
import { trackCreatePublished } from './stability';
import { followEntity } from './social';
import { computeCreatorAnalytics } from './experience';
import { HIDDEN_DISCOVERIES } from './worldEngine';

export const REFERRAL_REWARDS = {
  friend_signup: { label: 'Friend signs up', coins: 100 },
  friend_first_hunt: { label: 'Friend completes first hunt', coins: 250 },
  friend_first_adventure: { label: 'Friend creates first adventure', coins: 500 },
  friend_premium: { label: 'Friend becomes Premium', coins: 2000 },
  sponsor_campaign: { label: 'Sponsor launches campaign', coins: 0, cashCents: 2500 },
};

export const GROWTH_ACHIEVEMENTS = [
  { id: 'explorer', icon: '🧭', label: 'Explorer', desc: 'Complete 10 adventures.', metric: 'adventuresCompleted', threshold: 10 },
  { id: 'traveler', icon: '✈️', label: 'Traveler', desc: 'Hunt in 5 cities.', metric: 'citiesVisited', threshold: 5 },
  { id: 'nightwalker', icon: '🌙', label: 'Nightwalker', desc: 'Complete 5 night hunts.', metric: 'nightHunts', threshold: 5 },
  { id: 'fearless', icon: '👻', label: 'Fearless', desc: 'Complete 10 horror hunts.', metric: 'horrorHunts', threshold: 10 },
  { id: 'shepherd', icon: '⛪', label: 'Shepherd', desc: 'Complete 5 church adventures.', metric: 'churchHunts', threshold: 5 },
  { id: 'founder', icon: '🏆', label: 'Founder', desc: 'Be among the first 100 creators.', metric: 'adventuresCreated', threshold: 1, founderOnly: true },
];

export const TONIGHT_THEMES = [
  { id: 'family', label: 'Family Night', icon: '👨‍👩‍👧', audience: 'family', template: ADVENTURE_TEMPLATES.FAMILY_FUN, location: 'backyard' },
  { id: 'date', label: 'Date Night', icon: '💕', audience: 'couples', template: ADVENTURE_TEMPLATES.DATE_NIGHT, location: 'neighborhood' },
  { id: 'scary', label: 'Scary Night', icon: '👻', audience: 'friends', template: ADVENTURE_TEMPLATES.HORROR, location: 'neighborhood' },
  { id: 'kids', label: 'Kids Party', icon: '🎈', audience: 'kids', template: ADVENTURE_TEMPLATES.FAMILY_FUN, location: 'backyard' },
  { id: 'church', label: 'Church Event', icon: '⛪', audience: 'church', template: ADVENTURE_TEMPLATES.CHURCH, location: 'city' },
  { id: 'school', label: 'School Activity', icon: '📚', audience: 'students', template: ADVENTURE_TEMPLATES.EDUCATIONAL, location: 'school' },
  { id: 'sponsor', label: 'Sponsor Promotion', icon: '🏪', audience: 'customers', template: ADVENTURE_TEMPLATES.SPONSOR, location: 'city' },
];

export const SEED_WEEKEND_EVENTS = [
  { id: 'fri-ghost-walk', day: 'Friday', title: 'Parsons Ghost Walk', adventureId: 'union-depot-ghost', time: '8:00 PM', sponsor: 'Parsons Heritage' },
  { id: 'sat-dq-quest', day: 'Saturday', title: 'DQ Summer Quest', adventureId: null, time: '10:00 AM', sponsor: 'Dairy Queen' },
  { id: 'sun-bible-quest', day: 'Sunday', title: 'Bible Quest', adventureId: null, time: '2:00 PM', sponsor: 'Community Church' },
];

export const SEED_FOLLOWING_FEED = [
  { id: 'ff1', category: 'friends', text: 'Sarah completed Union Depot Ghost', at: '2h ago', adventureId: 'union-depot-ghost' },
  { id: 'ff2', category: 'creators', text: 'Parsons Heritage released a new hunt', at: '5h ago', creatorId: 'parsons-heritage' },
  { id: 'ff3', category: 'sponsors', text: 'DQ Summer Quest starts Friday', at: '1d ago', sponsor: 'Dairy Queen' },
];

export const SEED_GROWTH_NOTIFICATIONS = [
  { id: 'gn1', category: 'friends', text: 'Marcus beat your score on Union Depot Ghost.', at: new Date(Date.now() - 3600000).toISOString(), read: false },
  { id: 'gn2', category: 'collections', text: '1 adventure left to complete Parsons Legends.', at: new Date(Date.now() - 7200000).toISOString(), read: false },
  { id: 'gn3', category: 'rewards', text: '12 Founder Hunt rewards remain.', at: new Date(Date.now() - 86400000).toISOString(), read: false },
  { id: 'gn4', category: 'sponsors', text: 'Your coupon expires tomorrow.', at: new Date(Date.now() - 43200000).toISOString(), read: false },
  { id: 'gn5', category: 'world', text: 'The Black Lantern has awakened.', at: new Date(Date.now() - 1800000).toISOString(), read: false },
];

export const QUEST_CODE_SEEDS = {
  'union-depot-ghost': 'GHOST-DEPOT',
  'parsons-gold-rush': 'HIDDEN-LEDGER',
  'founders-parsons-lost': 'FOUNDERS-FRI',
  'neosho-legend': 'NEOSHO-LEGEND',
  'iron-horse': 'IRON-HORSE',
  'demo-missing-birthday-gift': 'BDAY-DEMO',
};

export const DEFAULT_GROWTH = {
  referralCode: null,
  invitesSent: [],
  referralEvents: [],
  referralStats: {
    invited: 0,
    completedHunts: 0,
    adventuresCreated: 0,
    premiumFriends: 0,
    coinsEarned: 0,
  },
  notifications: [],
  achievementsUnlocked: [],
  questCodeHistory: [],
  remixesCreated: [],
  createTonightCount: 0,
  adventureViews: {},
  adventureStarts: {},
  growthStats: {
    citiesVisited: new Set(),
    nightHunts: 0,
    horrorHunts: 0,
    churchHunts: 0,
    adventuresCreated: 0,
  },
};

export function normalizeGrowth(growth = {}) {
  const stats = growth.growthStats || {};
  return {
    ...DEFAULT_GROWTH,
    ...growth,
    invitesSent: Array.isArray(growth.invitesSent) ? growth.invitesSent : [],
    referralEvents: Array.isArray(growth.referralEvents) ? growth.referralEvents : [],
    referralStats: { ...DEFAULT_GROWTH.referralStats, ...(growth.referralStats || {}) },
    notifications: Array.isArray(growth.notifications) ? growth.notifications : [],
    achievementsUnlocked: Array.isArray(growth.achievementsUnlocked) ? growth.achievementsUnlocked : [],
    questCodeHistory: Array.isArray(growth.questCodeHistory) ? growth.questCodeHistory : [],
    remixesCreated: Array.isArray(growth.remixesCreated) ? growth.remixesCreated : [],
    adventureViews: growth.adventureViews || {},
    adventureStarts: growth.adventureStarts || {},
    growthStats: {
      citiesVisited: Array.isArray(stats.citiesVisited) ? stats.citiesVisited : [],
      nightHunts: stats.nightHunts || 0,
      horrorHunts: stats.horrorHunts || 0,
      churchHunts: stats.churchHunts || 0,
      adventuresCreated: stats.adventuresCreated || 0,
    },
  };
}

export function generateQuestCode(adventure) {
  if (adventure.questCode) return adventure.questCode;
  if (QUEST_CODE_SEEDS[adventure.id]) return QUEST_CODE_SEEDS[adventure.id];
  const slug = (adventure.title || adventure.id || 'QUEST')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 16);
  if (slug.length >= 6) return slug;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}`;
}

export function mergeAdventureGrowth(adventure) {
  const questCode = generateQuestCode(adventure);
  const growthAnalytics = adventure.growthAnalytics || {};
  return {
    ...adventure,
    questCode,
    remixOf: adventure.remixOf || null,
    remixCredit: adventure.remixCredit || null,
    growthAnalytics: {
      views: growthAnalytics.views ?? (adventure.playersCompleted || 0) * 3 + 120,
      started: growthAnalytics.started ?? Math.max(adventure.playersCompleted || 0, 50),
      completed: growthAnalytics.completed ?? (adventure.playersCompleted || 0),
      shares: growthAnalytics.shares ?? Math.round((adventure.playersCompleted || 0) * 0.4),
      mostSharedAsset: growthAnalytics.mostSharedAsset || 'Victory Certificate',
      dropOffClue: growthAnalytics.dropOffClue ?? adventure.creatorAnalytics?.dropOffClue ?? null,
    },
  };
}

export function getOrCreateReferralCode(state) {
  const growth = normalizeGrowth(state.growth);
  if (growth.referralCode) return growth.referralCode;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = `QST-${Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}`;
  return code;
}

export function ensureReferralCode(state) {
  const growth = normalizeGrowth(state.growth);
  if (growth.referralCode) return state;
  return {
    ...state,
    growth: { ...growth, referralCode: getOrCreateReferralCode(state) },
  };
}

export function buildReferralLink(code) {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://questory.app';
  return `${base}?ref=${code}`;
}

export function trackReferralInvite(state, channel = 'link') {
  const withCode = ensureReferralCode(state);
  const growth = normalizeGrowth(withCode.growth);
  const invite = {
    id: `invite-${Date.now()}`,
    channel,
    at: new Date().toISOString(),
  };
  return {
    ...withCode,
    growth: {
      ...growth,
      invitesSent: [...growth.invitesSent, invite],
      referralStats: {
        ...growth.referralStats,
        invited: growth.invitesSent.length + 1,
      },
    },
  };
}

export function awardReferralAction(state, actionId, friendName = 'Friend') {
  const reward = REFERRAL_REWARDS[actionId];
  if (!reward) return { ok: false, message: 'Unknown referral action.' };

  const growth = normalizeGrowth(state.growth);
  const eventKey = `${actionId}:${friendName}`;
  if (growth.referralEvents.some((e) => e.key === eventKey)) {
    return { ok: false, message: 'Referral reward already claimed for this friend.' };
  }

  const event = {
    id: `ref-${Date.now()}`,
    key: eventKey,
    actionId,
    friendName,
    coins: reward.coins || 0,
    cashCents: reward.cashCents || 0,
    at: new Date().toISOString(),
  };

  const stats = { ...growth.referralStats };
  stats.coinsEarned = (stats.coinsEarned || 0) + (reward.coins || 0);
  if (actionId === 'friend_signup') stats.invited = (stats.invited || 0) + 1;
  if (actionId === 'friend_first_hunt') stats.completedHunts = (stats.completedHunts || 0) + 1;
  if (actionId === 'friend_first_adventure') stats.adventuresCreated = (stats.adventuresCreated || 0) + 1;
  if (actionId === 'friend_premium') stats.premiumFriends = (stats.premiumFriends || 0) + 1;

  let nextState = {
    ...state,
    coins: state.coins + (reward.coins || 0),
    growth: {
      ...growth,
      referralEvents: [...growth.referralEvents, event],
      referralStats: stats,
    },
  };

  if (reward.cashCents) {
    const wallet = nextState.expansion?.cashWallet || { balanceCents: 0, earnings: [] };
    nextState = {
      ...nextState,
      expansion: {
        ...nextState.expansion,
        cashWallet: {
          ...wallet,
          balanceCents: (wallet.balanceCents || 0) + reward.cashCents,
          earnings: [
            ...(wallet.earnings || []),
            { id: event.id, adventureTitle: 'Referral bonus', amountCents: reward.cashCents, at: event.at },
          ],
        },
      },
    };
  }

  return { ok: true, message: `+${reward.coins || 0} coins for ${reward.label}!`, state: nextState, coins: reward.coins };
}

/** Demo helper — simulate a friend completing signup + first hunt for referral dashboard testing. */
export function simulateReferralFriend(state, friendName = 'Alex') {
  let s = trackReferralInvite(state, 'demo');
  const signup = awardReferralAction(s, 'friend_signup', friendName);
  if (!signup.ok) return signup;
  s = signup.state;
  return awardReferralAction(s, 'friend_first_hunt', friendName);
}

export function getReferralDashboard(state) {
  const growth = normalizeGrowth(state.growth);
  return {
    code: growth.referralCode || getOrCreateReferralCode(state),
    invited: growth.referralStats.invited || growth.invitesSent.length,
    completedHunts: growth.referralStats.completedHunts || 0,
    coinsEarned: growth.referralStats.coinsEarned || 0,
    events: growth.referralEvents.slice(-10).reverse(),
  };
}

export function lookupAdventureByQuestCode(adventures, code) {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
  return adventures.find((a) => {
    const merged = mergeAdventureGrowth(a);
    return (
      merged.questCode?.toUpperCase().replace(/\s+/g, '') === normalized ||
      merged.claimCode?.toUpperCase().replace(/\s+/g, '') === normalized
    );
  });
}

export function joinByQuestCode(state, code, adventures) {
  const adventure = lookupAdventureByQuestCode(adventures, code);
  if (!adventure) {
    return { ok: false, message: 'Quest code not found. Check the code and try again.' };
  }
  if (adventure.status !== ADVENTURE_STATUS.PUBLISHED) {
    return { ok: false, message: 'This adventure is not available yet.' };
  }
  const growth = normalizeGrowth(state.growth);
  const entry = {
    code: code.trim().toUpperCase(),
    adventureId: adventure.id,
    at: new Date().toISOString(),
  };
  return {
    ok: true,
    message: `Joined ${adventure.title}!`,
    adventureId: adventure.id,
    state: {
      ...state,
      growth: {
        ...growth,
        questCodeHistory: [...growth.questCodeHistory, entry],
      },
    },
  };
}

export function getNeighborhoodSummary(adventures, state) {
  const published = adventures.filter((a) => a.status === ADVENTURE_STATUS.PUBLISHED && !a.isDemoAdventure);
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = published.filter((a) => {
    const created = a.createdAt ? new Date(a.createdAt).getTime() : Date.now() - 86400000;
    return created >= weekAgo || (a.playersCompleted || 0) > 0;
  }).length;

  const endingSoon = published.filter((a) => a.endRule && a.endRule !== 'no_end_date').length;
  const discoveriesFound = (state.world?.discoveriesFound || []).length;
  const hiddenRemaining = HIDDEN_DISCOVERIES.filter(
    (d) => !(state.world?.discoveriesFound || []).includes(d.id)
  ).length;

  return {
    adventuresThisWeek: Math.max(thisWeek, published.length > 0 ? Math.min(3, published.length) : 0),
    endingSoon: endingSoon || (published.length > 1 ? 2 : 0),
    hiddenDiscoveries: hiddenRemaining || 1,
    totalNearby: published.length,
  };
}

export function getFollowingFeed(state, adventures) {
  const items = [...SEED_FOLLOWING_FEED];
  const follows = state.social?.follows || [];

  for (const f of follows) {
    items.unshift({
      id: `follow-${f.id}-${Date.now()}`,
      category: f.type === 'creator' ? 'creators' : f.type === 'sponsor' ? 'sponsors' : 'friends',
      text: `Following ${f.name} — new activity`,
      at: 'now',
    });
  }

  const completed = Object.entries(state.progress || {})
    .filter(([, p]) => p.claimed)
    .slice(-3);
  for (const [adventureId] of completed) {
    const adv = adventures.find((a) => a.id === adventureId);
    if (adv) {
      items.unshift({
        id: `you-${adventureId}`,
        category: 'friends',
        text: `You completed ${adv.title}`,
        at: 'recently',
        adventureId,
      });
    }
  }

  return items.slice(0, 15);
}

export function getNotifications(state) {
  const growth = normalizeGrowth(state.growth);
  const stored = growth.notifications.length ? growth.notifications : SEED_GROWTH_NOTIFICATIONS;
  return stored.map((n) => ({ ...n, read: n.read ?? false }));
}

export function getUnreadNotificationCount(state) {
  return getNotifications(state).filter((n) => !n.read).length;
}

export function pushNotification(state, notification) {
  const growth = normalizeGrowth(state.growth);
  const note = {
    id: notification.id || `notif-${Date.now()}`,
    category: notification.category || 'friends',
    text: notification.text,
    at: notification.at || new Date().toISOString(),
    read: false,
  };
  const existing = growth.notifications.length ? growth.notifications : [...SEED_GROWTH_NOTIFICATIONS];
  return {
    ...state,
    growth: {
      ...growth,
      notifications: [note, ...existing.filter((n) => n.id !== note.id)].slice(0, 50),
    },
  };
}

export function markNotificationsRead(state) {
  const growth = normalizeGrowth(state.growth);
  const notes = getNotifications(state).map((n) => ({ ...n, read: true }));
  return { ...state, growth: { ...growth, notifications: notes } };
}

export function checkScoreBeatNotification(state, adventure, completionMinutes) {
  const seedScores = {
    'union-depot-ghost': 22,
    'parsons-gold-rush': 28,
  };
  const benchmark = seedScores[adventure.id] || adventure.estimatedMinutes || 30;
  if (completionMinutes < benchmark) return state;
  return pushNotification(state, {
    category: 'friends',
    text: `Marcus beat your score on ${adventure.title}.`,
  });
}

export function remixAdventure(state, sourceAdventure, remixTitle) {
  const source = mergeAdventureGrowth(sourceAdventure);
  const title = remixTitle?.trim() || `${source.title} Remix`;
  const claimCode = generateClaimCode();
  const id = `remix-${Date.now()}`;

  const remixed = {
    ...source,
    id,
    title,
    claimCode,
    qrClaimValue: claimCode,
    questCode: generateQuestCode({ title, id }),
    status: ADVENTURE_STATUS.PUBLISHED,
    playersCompleted: 0,
    remixOf: source.id,
    remixCredit: {
      originalId: source.id,
      originalTitle: source.title,
      creatorId: source.creatorProfileId || source.creatorId || 'original-creator',
      creatorName: source.sponsorInfo?.name || source.sponsor || 'Original Creator',
    },
    story: `${title} — a remix of "${source.title}". ${source.story || ''}`.trim(),
    clues: (source.clues || []).map((c, i) => ({
      ...c,
      id: `${id}-clue-${i}`,
    })),
    createdAt: new Date().toISOString(),
  };

  const growth = normalizeGrowth(state.growth);
  return {
    ok: true,
    message: `"${title}" published!`,
    adventure: remixed,
    state: {
      ...state,
      adventures: [remixed, ...state.adventures],
      growth: {
        ...growth,
        remixesCreated: [...growth.remixesCreated, { id, sourceId: source.id, title, at: new Date().toISOString() }],
        growthStats: {
          ...growth.growthStats,
          adventuresCreated: (growth.growthStats.adventuresCreated || 0) + 1,
        },
      },
    },
  };
}

export function getAchievementProgress(state, adventures) {
  const engagement = state.engagement || {};
  const growth = normalizeGrowth(state.growth);
  const cities = new Set();
  for (const adv of adventures) {
    const p = getAdventureProgress(state, adv.id);
    if (p.claimed && adv.city) cities.add(adv.city);
  }
  (growth.growthStats.citiesVisited || []).forEach((c) => cities.add(c));

  return {
    adventuresCompleted: engagement.adventuresCompleted || 0,
    citiesVisited: cities.size,
    nightHunts: growth.growthStats.nightHunts || 0,
    horrorHunts: growth.growthStats.horrorHunts || 0,
    churchHunts: growth.growthStats.churchHunts || 0,
    adventuresCreated: growth.growthStats.adventuresCreated || state.firstTimeMetrics?.adventuresCreatedCount || 0,
  };
}

export function checkAchievements(state, adventures) {
  const progress = getAchievementProgress(state, adventures);
  const growth = normalizeGrowth(state.growth);
  const unlocked = [...growth.achievementsUnlocked];
  let nextState = state;
  const newlyUnlocked = [];

  for (const ach of GROWTH_ACHIEVEMENTS) {
    if (unlocked.includes(ach.id)) continue;
    const value = progress[ach.metric] || 0;
    if (value >= ach.threshold) {
      unlocked.push(ach.id);
      newlyUnlocked.push(ach);
      nextState = pushNotification(nextState, {
        category: 'rewards',
        text: `Achievement unlocked: ${ach.label}!`,
      });
    }
  }

  if (!newlyUnlocked.length) return { state: nextState, newlyUnlocked: [] };

  return {
    state: {
      ...nextState,
      growth: { ...normalizeGrowth(nextState.growth), achievementsUnlocked: unlocked },
      engagement: {
        ...nextState.engagement,
        badges: [
          ...(nextState.engagement?.badges || []),
          ...newlyUnlocked.map((a) => ({ id: a.id, label: a.label, icon: a.icon, earnedAt: new Date().toISOString() })),
        ],
      },
    },
    newlyUnlocked,
  };
}

export function recordCompletionGrowthStats(state, adventure) {
  const growth = normalizeGrowth(state.growth);
  const stats = { ...growth.growthStats };
  const title = (adventure.title || '').toLowerCase();
  const template = adventure.adventureTemplate || '';

  if (title.includes('ghost') || title.includes('horror') || template === 'horror') {
    stats.horrorHunts = (stats.horrorHunts || 0) + 1;
  }
  if (template === 'church' || title.includes('church') || title.includes('bible')) {
    stats.churchHunts = (stats.churchHunts || 0) + 1;
  }
  if (adventure.experienceSettings?.atmosphere === 'dark' || title.includes('night') || title.includes('midnight')) {
    stats.nightHunts = (stats.nightHunts || 0) + 1;
  }
  const cities = [...(stats.citiesVisited || [])];
  if (adventure.city && !cities.includes(adventure.city)) cities.push(adventure.city);

  return {
    ...state,
    growth: { ...growth, growthStats: { ...stats, citiesVisited: cities } },
  };
}

export function createTonightAdventure(state, themeId, options = {}) {
  const theme = TONIGHT_THEMES.find((t) => t.id === themeId);
  if (!theme) return { ok: false, message: 'Unknown theme.' };

  const titles = {
    family: 'Tonight: Family Treasure Hunt',
    date: 'Tonight: Date Night Quest',
    scary: 'Tonight: Backyard Horror Hunt',
    kids: 'Tonight: Kids Party Hunt',
    church: 'Tonight: Youth Group Quest',
    school: 'Tonight: Classroom Adventure',
    sponsor: 'Tonight: Local Business Quest',
  };

  const adventure = buildQuickCreateAdventure(
    {
      audience: theme.audience,
      template: theme.template,
      location: theme.location,
      clueCount: 3,
      rewardType: 'badge',
      title: titles[themeId] || `Tonight: ${theme.label}`,
      publish: true,
    },
    options
  );
  adventure.questCode = generateQuestCode(adventure);

  const published = trackCreatePublished(publishQuickAdventure(state, adventure, options));
  const growth = normalizeGrowth(published.growth);

  return {
    ok: true,
    message: `${theme.label} adventure ready! Invite sent.`,
    adventure,
    state: {
      ...published,
      growth: {
        ...growth,
        createTonightCount: (growth.createTonightCount || 0) + 1,
        growthStats: {
          ...growth.growthStats,
          adventuresCreated: (growth.growthStats.adventuresCreated || 0) + 1,
        },
      },
      pendingInviteAdventureId: adventure.id,
      screen: options.goToInvite ? 'invite' : published.screen,
    },
  };
}

export function computeGrowthCreatorAnalytics(adventure, state) {
  const base = computeCreatorAnalytics(adventure, state);
  const ga = mergeAdventureGrowth(adventure).growthAnalytics;
  const views = ga.views || Math.round((adventure.playersCompleted || 0) * 2.4 + 100);
  const started = ga.started || Math.max(adventure.playersCompleted || 0, Math.round(views * 0.64));
  const completed = ga.completed || adventure.playersCompleted || 0;
  const completionRate = started ? completed / started : base.completionRate;

  return {
    views,
    started,
    completed,
    completionRate,
    avgCompletionMinutes: base.avgCompletionMinutes || adventure.estimatedMinutes || 27,
    dropOffClue: ga.dropOffClue ?? base.dropOffClue ?? 3,
    mostShared: ga.mostSharedAsset || 'Victory Certificate',
    avgRating: base.avgRating,
    heatScore: base.heatScore,
  };
}

export function recordAdventureView(state, adventureId) {
  const growth = normalizeGrowth(state.growth);
  const views = { ...growth.adventureViews };
  views[adventureId] = (views[adventureId] || 0) + 1;
  return { ...state, growth: { ...growth, adventureViews: views } };
}

export function recordAdventureStart(state, adventureId) {
  const growth = normalizeGrowth(state.growth);
  const starts = { ...growth.adventureStarts };
  starts[adventureId] = (starts[adventureId] || 0) + 1;
  return { ...state, growth: { ...growth, adventureStarts: starts } };
}

export function followCreatorFromFeed(state, creatorId, creatorName) {
  return followEntity(state, 'creator', creatorId, creatorName);
}

export function getWeekendCalendar() {
  return SEED_WEEKEND_EVENTS;
}

export function buildQuestCodeFlyer(adventure) {
  const merged = mergeAdventureGrowth(adventure);
  return `Use code: ${merged.questCode}\n\n${adventure.title}\n${adventure.location || ''}\n\nJoin on Questory!`;
}

export function applyGrowthOnCompletion(state, adventure) {
  let s = recordCompletionGrowthStats(state, adventure);
  const minutes = adventure.estimatedMinutes || 27;
  s = checkScoreBeatNotification(s, adventure, minutes);
  const { state: withAchievements } = checkAchievements(s, s.adventures);
  return withAchievements;
}
