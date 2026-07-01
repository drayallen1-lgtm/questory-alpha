/**
 * Season metadata — Questory universe identity scaffold.
 */

export const CURRENT_SEASON = {
  seasonId: 'founders-trail-s1',
  title: 'Season 1 — Founders Trail',
  theme: 'founders',
  themeLabel: 'Founders Trail',
  startDate: '2026-01-01',
  endDate: '2026-09-30',
  featuredAdventureIds: [],
  seasonalRelics: ['founder-coin', 'community-torch'],
  seasonalBadges: ['founder-weekend'],
  badgeIcon: '🏔️',
  badgeShort: 'S1',
};

export const WORLD_BOSS_SCAFFOLD = {
  id: 'black-lantern-parsons',
  title: 'The Black Lantern awakens',
  subtitle: 'City-wide limited event',
  description: 'A city-wide hunt tied to multiple downtown adventures. Rewards unlock when explorers complete linked trails.',
  status: 'teaser',
  linkedAdventureIds: [],
  rewardLabel: 'Founder Chest',
  endsInHours: 72,
};

export const CREATOR_WORLDS = [
  {
    creatorWorldId: 'parsons-heritage',
    creatorName: 'Parsons Heritage',
    worldTitle: 'Parsons Heritage Trail',
    theme: 'history',
    featuredSeries: 'Iron & Rails',
    sponsor: null,
    coverArt: null,
    totalAdventures: 8,
  },
  {
    creatorWorldId: 'horror-crest',
    creatorName: 'Horror Crest Collective',
    worldTitle: 'Horror Crest',
    theme: 'horror',
    featuredSeries: 'Whispers',
    sponsor: null,
    totalAdventures: 5,
  },
];

export function getCurrentSeason() {
  return { ...CURRENT_SEASON };
}

export function getSeasonForAdventure(adventure) {
  if (!adventure) return null;
  const world = CREATOR_WORLDS.find(
    (w) => w.creatorWorldId === adventure.creatorProfileId || w.creatorWorldId === adventure.creatorWorldId
  );
  return {
    season: CURRENT_SEASON,
    creatorWorld: world || null,
    isFeatured: CURRENT_SEASON.featuredAdventureIds.includes(adventure.id),
    isSeasonal: Boolean(adventure.isFounderHunt || adventure.isLegendaryHunt),
  };
}

export function getSeasonMapBadge() {
  return {
    label: CURRENT_SEASON.badgeShort,
    title: CURRENT_SEASON.title,
    icon: CURRENT_SEASON.badgeIcon,
  };
}

export function getWorldBossTeaser() {
  return { ...WORLD_BOSS_SCAFFOLD };
}

export function getCreatorWorldLabel(adventure) {
  const info = getSeasonForAdventure(adventure);
  if (info?.creatorWorld) {
    return `Part of ${info.creatorWorld.worldTitle}`;
  }
  if (adventure?.creatorProfileId === 'parsons-heritage') {
    return 'Part of Parsons Heritage Trail';
  }
  return null;
}
