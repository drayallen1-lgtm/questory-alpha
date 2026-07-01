/**
 * Phase 5 — Questory Identity
 * Global seasons, world boss, community events, AR reveals, creator worlds,
 * sponsored campaigns, hall of fame, city completion.
 */
import { getAdventureMapCenter } from './mapUtils';
import { usesArFinder } from './expansion';
import { getLeaderboard, isAdventureClaimed } from './engagement';
import { SPONSORED_LEADERBOARDS } from './economy';
import { safeGetWorldEventContext } from './worldEventEngine';
import { computeCityCompletionPct } from './socialWorldEngine';
import {
  CREATOR_WORLDS,
  CURRENT_SEASON,
  getCurrentSeason,
  getSeasonForAdventure,
  WORLD_BOSS_SCAFFOLD,
} from './seasonEngine';
import { safeGetTime } from './dateUtils';
import { resolveWorldBossFromLegendaryEngine } from './legendaryHuntEngine';

export const IDENTITY_LIMITS = {
  MAX_FEED: 8,
  MAX_BANNERS: 4,
  MAX_HALL_OF_FAME: 5,
  MAX_AR_MARKERS: 8,
};

export const HALL_OF_FAME_EXPLORERS = [
  { id: 'hof-sarah', name: 'Sarah J.', title: 'Keeper of Parsons', icon: '👑', adventures: 8, badges: 5 },
  { id: 'hof-marcus', name: 'Marcus T.', title: 'Rail District Legend', icon: '🏅', adventures: 6, badges: 4 },
  { id: 'hof-elena', name: 'Elena R.', title: 'Night Hunter', icon: '🌙', adventures: 5, badges: 3 },
  { id: 'hof-jake', name: 'Jake M.', title: 'Trail Blazer', icon: '🧭', adventures: 3, badges: 2 },
  { id: 'hof-nova', name: 'Nova K.', title: 'Founder Circle', icon: '🏔️', adventures: 4, badges: 4 },
];

export const SPONSORED_CAMPAIGNS = [
  {
    id: 'pepsi-summer-refresh',
    sponsorName: 'Pepsi',
    title: 'Summer Refresh Hunt',
    prize: '$50 Gift Card',
    adventureId: 'river-sentinel',
    icon: '🥤',
    active: true,
  },
  {
    id: 'dq-blizzard-rush',
    sponsorName: 'Dairy Queen Parsons',
    title: 'Blizzard Rush Weekend',
    prize: 'FREE SMALL BLIZZARD',
    adventureId: 'parsons-gold-rush',
    icon: '🍦',
    active: true,
  },
  {
    id: 'walmart-hidden-savings',
    sponsorName: 'Walmart',
    title: 'Hidden Savings Drop',
    prize: 'In-store coupon',
    adventureId: 'founders-parsons-lost',
    icon: '🛒',
    active: true,
  },
];

const BOSS_LINKED_IDS = [
  'union-depot-ghost',
  'iron-horse',
  'parsons-gold-rush',
  'river-sentinel',
  'founders-parsons-lost',
];

function daysBetween(startIso, endIso, now = Date.now()) {
  const end = safeGetTime(endIso);
  const start = safeGetTime(startIso);
  const nowMs = safeGetTime(now);
  if (nowMs > end) return 0;
  return Math.max(0, Math.ceil((end - nowMs) / 86400000));
}

function hoursRemaining(hours, seed = 'boss') {
  const slot = Math.floor(Date.now() / 3600000) % hours;
  return Math.max(1, hours - slot);
}

export function getSeasonProgress(state = null, now = Date.now()) {
  const season = getCurrentSeason();
  const start = safeGetTime(season.startDate);
  const end = safeGetTime(season.endDate);
  const nowMs = safeGetTime(now);
  const span = Math.max(1, end - start);
  const elapsed = Math.min(span, Math.max(0, nowMs - start));
  const pct = Math.round((elapsed / span) * 100);
  const daysLeft = daysBetween(season.startDate, season.endDate, nowMs);
  const seasonPoints = state?.social?.seasonPoints ?? 0;

  return {
    ...season,
    progressPct: pct,
    daysRemaining: daysLeft,
    seasonPoints,
    tier: state?.social?.seasonTier || 'bronze',
    label: `${season.badgeShort} · ${daysLeft} days left`,
  };
}

export function resolveWorldBoss(adventures = [], options = {}) {
  return resolveWorldBossFromLegendaryEngine(options.state, adventures, options);
}

export function getCommunityCityEvents(state, adventures = []) {
  const eventContext = safeGetWorldEventContext(state, adventures);
  const events = [];

  if (eventContext?.primaryEvent) {
    events.push({
      id: `community-${eventContext.primaryEvent.id}`,
      title: eventContext.primaryEvent.title,
      description: eventContext.primaryEvent.banner || eventContext.primaryEvent.description,
      icon: eventContext.primaryEvent.icon || '🌍',
      kind: 'community',
      scope: 'city-wide',
    });
  }

  if (eventContext?.communityMilestones?.length) {
    eventContext.communityMilestones.slice(0, 2).forEach((m) => {
      events.push({
        id: m.id,
        title: m.title,
        description: m.body,
        icon: m.icon || '✨',
        kind: 'milestone',
        progress: m.threshold ? Math.round((m.current / m.threshold) * 100) : null,
      });
    });
  }

  if (!events.length) {
    events.push({
      id: 'community-weekend',
      title: 'Parsons Community Weekend',
      description: 'Explorers city-wide are unlocking bonus relics this weekend.',
      icon: '🔥',
      kind: 'community',
      scope: 'city-wide',
    });
  }

  return events.slice(0, 3);
}

export function getArTreasureMarkers(adventures = []) {
  return adventures
    .filter((a) => usesArFinder(a) || a.finderMode === 'ar_enhanced')
    .map((a) => {
      const center = getAdventureMapCenter(a);
      if (!center) return null;
      return {
        id: `ar-${a.id}`,
        adventureId: a.id,
        title: a.title,
        latitude: center.latitude,
        longitude: center.longitude,
        label: 'AR Treasure',
      };
    })
    .filter(Boolean)
    .slice(0, IDENTITY_LIMITS.MAX_AR_MARKERS);
}

export function getActiveSponsoredCampaigns(adventures = []) {
  return SPONSORED_CAMPAIGNS.filter((c) => c.active)
    .map((campaign) => {
      const adventure = adventures.find((a) => a.id === campaign.adventureId);
      const center = adventure ? getAdventureMapCenter(adventure) : null;
      return {
        ...campaign,
        adventureTitle: adventure?.title || campaign.title,
        latitude: center?.latitude ?? null,
        longitude: center?.longitude ?? null,
        isLive: Boolean(adventure?.isSponsoredDrop || adventure?.sponsorVerified),
      };
    })
    .slice(0, 4);
}

export function getHallOfFame(state = null) {
  const leaderboard = getLeaderboard('local', state || { engagement: {}, coins: 0 });
  return leaderboard.slice(0, IDENTITY_LIMITS.MAX_HALL_OF_FAME).map((row, i) => ({
    id: HALL_OF_FAME_EXPLORERS[i]?.id || `hof-${i}`,
    name: row.name,
    title: HALL_OF_FAME_EXPLORERS[i]?.title || 'Explorer',
    icon: HALL_OF_FAME_EXPLORERS[i]?.icon || '🏅',
    adventures: row.adventures ?? 0,
    badges: row.badges ?? 0,
    coins: row.coins ?? 0,
    isYou: Boolean(row.isYou),
    rank: i + 1,
  }));
}

export function getCreatorWorldsProgress(state, adventures = []) {
  const published = adventures.filter((a) => a.status === 'published');

  return CREATOR_WORLDS.map((world) => {
    const members = published.filter(
      (a) =>
        a.creatorProfileId === world.creatorWorldId ||
        a.creatorWorldId === world.creatorWorldId ||
        (world.creatorWorldId === 'parsons-heritage' && a.creatorProfileId === 'parsons-heritage')
    );
    const total = members.length || world.totalAdventures;
    const found = members.filter((a) => isAdventureClaimed(state, a.id)).length;
    const pct = total ? Math.round((found / total) * 100) : 0;

    return {
      ...world,
      adventureCount: total,
      completedCount: found,
      progressPct: pct,
      featuredAdventure: members[0] || null,
    };
  });
}

export function buildIdentityFeed(snapshot) {
  const feed = [];

  if (snapshot.boss?.status === 'active') {
    feed.push({
      id: 'identity-boss',
      kind: 'boss',
      minutesAgo: 2,
      text: `${snapshot.boss.title} — ${snapshot.boss.participantsEstimate} explorers joined the hunt`,
    });
  }

  snapshot.communityEvents.slice(0, 2).forEach((event) => {
    feed.push({
      id: `identity-${event.id}`,
      kind: 'community',
      minutesAgo: 6,
      text: event.title,
    });
  });

  snapshot.sponsoredCampaigns.slice(0, 1).forEach((c) => {
    feed.push({
      id: `identity-sponsor-${c.id}`,
      kind: 'sponsor',
      minutesAgo: 10,
      text: `${c.sponsorName} treasure campaign live — ${c.prize}`,
      adventureId: c.adventureId,
    });
  });

  snapshot.hallOfFame.slice(0, 2).forEach((explorer, i) => {
    feed.push({
      id: `identity-hof-${explorer.id}`,
      kind: 'hall',
      minutesAgo: 3 + i * 4,
      text: `${explorer.name} — ${explorer.title}`,
    });
  });

  if (snapshot.arMarkers.length) {
    feed.push({
      id: 'identity-ar',
      kind: 'ar',
      minutesAgo: 5,
      text: `${snapshot.arMarkers.length} AR treasure reveal${snapshot.arMarkers.length === 1 ? '' : 's'} active on the map`,
    });
  }

  feed.push({
    id: 'identity-city',
    kind: 'city',
    minutesAgo: 12,
    text: `Parsons is ${snapshot.cityPct}% explored by the community`,
  });

  return feed.slice(0, IDENTITY_LIMITS.MAX_FEED);
}

export function buildIdentityBanners(snapshot) {
  const banners = [];

  if (snapshot.season) {
    banners.push({
      id: 'identity-season',
      icon: snapshot.season.badgeIcon,
      text: `${snapshot.season.title} · ${snapshot.season.daysRemaining} days left`,
      kind: 'season',
      priority: 92,
      ttlMs: 12000,
    });
  }

  if (snapshot.boss?.status === 'active') {
    banners.push({
      id: 'identity-boss-banner',
      icon: '🏮',
      text: `World Boss: ${snapshot.boss.title} · ${snapshot.boss.hoursRemaining}h left`,
      kind: 'boss',
      priority: 96,
      ttlMs: 14000,
    });
  }

  const campaign = snapshot.sponsoredCampaigns.find((c) => c.isLive) || snapshot.sponsoredCampaigns[0];
  if (campaign) {
    banners.push({
      id: `identity-campaign-${campaign.id}`,
      icon: campaign.icon,
      text: `${campaign.sponsorName}: ${campaign.title}`,
      kind: 'sponsor',
      priority: 84,
      ttlMs: 11000,
      adventureId: campaign.adventureId,
    });
  }

  const arCount = snapshot.arMarkers.length;
  if (arCount > 0) {
    banners.push({
      id: 'identity-ar-banner',
      icon: '📱',
      text: `${arCount} AR treasure reveal${arCount === 1 ? '' : 's'} shimmer on the map`,
      kind: 'ar',
      priority: 78,
      ttlMs: 10000,
    });
  }

  return banners.slice(0, IDENTITY_LIMITS.MAX_BANNERS);
}

export function getQuestoryIdentitySnapshot(state, adventures = [], options = {}) {
  const { now = Date.now() } = options;
  const season = getSeasonProgress(state, now);
  const boss = resolveWorldBoss(adventures, { state, now });
  const communityEvents = getCommunityCityEvents(state, adventures);
  const arMarkers = getArTreasureMarkers(adventures);
  const sponsoredCampaigns = getActiveSponsoredCampaigns(adventures);
  const hallOfFame = getHallOfFame(state);
  const creatorWorlds = getCreatorWorldsProgress(state, adventures);
  const cityPct = computeCityCompletionPct(state, adventures);
  const sponsoredLeaderboards = SPONSORED_LEADERBOARDS.slice(0, 2);

  const snapshot = {
    season,
    boss,
    communityEvents,
    arMarkers,
    sponsoredCampaigns,
    sponsoredLeaderboards,
    hallOfFame,
    creatorWorlds,
    cityPct,
    cityLabel: 'Parsons',
    now,
  };

  return {
    ...snapshot,
    feed: buildIdentityFeed(snapshot),
    banners: buildIdentityBanners(snapshot),
    bossMarker:
      boss.status === 'active' && boss.latitude != null
        ? {
            id: boss.id,
            latitude: boss.latitude,
            longitude: boss.longitude,
            progress: boss.communityProgress,
            hoursRemaining: boss.hoursRemaining,
            title: boss.title,
          }
        : null,
  };
}

export function getAdventureIdentityChips(adventure) {
  if (!adventure) return [];
  const chips = [];
  const seasonInfo = getSeasonForAdventure(adventure);

  if (seasonInfo?.creatorWorld) {
    chips.push({
      id: 'creator-world',
      label: seasonInfo.creatorWorld.worldTitle,
      icon: '🎨',
      kind: 'creator',
    });
  }

  if (usesArFinder(adventure) || adventure.finderMode === 'ar_enhanced') {
    chips.push({ id: 'ar-reveal', label: 'AR Treasure Reveal', icon: '📱', kind: 'ar' });
  }

  const campaign = SPONSORED_CAMPAIGNS.find((c) => c.adventureId === adventure.id);
  if (campaign || adventure.isSponsoredDrop || adventure.sponsorVerified) {
    chips.push({
      id: 'sponsored',
      label: campaign?.sponsorName || adventure.sponsorName || 'Sponsored Drop',
      icon: campaign?.icon || '✨',
      kind: 'sponsor',
    });
  }

  if (adventure.isFounderHunt || adventure.isLegendaryHunt || seasonInfo?.isSeasonal) {
    chips.push({
      id: 'seasonal',
      label: CURRENT_SEASON.themeLabel,
      icon: CURRENT_SEASON.badgeIcon,
      kind: 'season',
    });
  }

  if (BOSS_LINKED_IDS.includes(adventure.id)) {
    chips.push({ id: 'world-boss', label: 'World Boss Link', icon: '🏮', kind: 'boss' });
  }

  return chips;
}
