import { getAdventureProgress } from './seed';

export const VISIBILITY_MODES = {
  HIDDEN: 'hidden',
  ANONYMOUS: 'anonymous',
  TEAM: 'team',
};

export const PLAY_MODES = {
  SOLO: 'solo',
  TEAM: 'team',
  BOTH: 'both',
};

export const HEAT_CATEGORIES = {
  TRENDING: 'trending',
  HAUNTED: 'haunted',
  COMPETITIVE: 'competitive',
  FAMILY: 'family',
  HIDDEN_GEM: 'hidden_gem',
};

export const SEASON_TIERS = [
  { id: 'bronze', label: 'Bronze Explorer', min: 0 },
  { id: 'silver', label: 'Silver Pathfinder', min: 500 },
  { id: 'gold', label: 'Gold Keeper', min: 1500 },
  { id: 'diamond', label: 'Diamond Legend', min: 4000 },
  { id: 'founder', label: 'Founder Elite', min: 10000 },
];

export const DEFAULT_SOCIAL = {
  myTeamId: null,
  teamMemberships: [],
  follows: [],
  challenges: [],
  comments: {},
  photos: [],
  stories: [],
  ghostRuns: [],
  ghostStats: {},
  visibility: VISIBILITY_MODES.TEAM,
  activityFeed: [],
  seasonPoints: 0,
  seasonTier: 'bronze',
  seasonId: '2026-q2',
  pinnedComments: {},
  mapPresence: { explorersNearby: 12, activeHunts: 4, teamsCompeting: 3 },
};

export const SEED_TEAMS = [
  {
    id: 'parsons-explorers',
    name: 'Parsons Explorers',
    banner: '🧭',
    motto: 'Every street has a story.',
    badge: 'Explorer Crest',
    isPublic: true,
    rank: 1,
    members: 24,
    completions: 186,
    points: 4200,
  },
  {
    id: 'ghost-hunters-kansas',
    name: 'Ghost Hunters of Kansas',
    banner: '👻',
    motto: 'We hunt what the daylight misses.',
    badge: 'Night Hunter',
    isPublic: true,
    rank: 2,
    members: 18,
    completions: 142,
    points: 3800,
  },
  {
    id: 'night-shift',
    name: 'The Night Shift',
    banner: '🌙',
    motto: 'After dark is when legends wake.',
    badge: 'Moon Trail',
    isPublic: true,
    rank: 3,
    members: 11,
    completions: 98,
    points: 2900,
  },
  {
    id: 'team-bigfoot',
    name: 'Team Bigfoot',
    banner: '🦶',
    motto: 'Leave prints, not spoilers.',
    badge: 'Cryptid Crew',
    isPublic: true,
    rank: 4,
    members: 31,
    completions: 210,
    points: 5100,
  },
  {
    id: 'family-quest-crew',
    name: 'Family Quest Crew',
    banner: '👨‍👩‍👧',
    motto: 'Adventure is better together.',
    badge: 'Family Trail',
    isPublic: false,
    rank: 5,
    members: 6,
    completions: 44,
    points: 1200,
  },
];

export const SEED_LIVE_EVENTS = [
  {
    id: 'midnight-ghost-walk',
    adventureId: 'union-depot-ghost',
    title: 'Midnight Ghost Walk',
    startsAt: '2026-06-20T20:00:00',
    endsAt: '2026-06-21T00:00:00',
    maxEntries: 50,
    participants: 32,
    exclusiveReward: 'Ghost Walker Badge',
    description: 'A after-dark team hunt through the depot district.',
  },
  {
    id: 'easter-egg-quest',
    adventureId: 'river-sentinel',
    title: 'Easter Egg Quest',
    startsAt: '2026-04-18T10:00:00',
    endsAt: '2026-04-18T18:00:00',
    maxEntries: 100,
    participants: 67,
    exclusiveReward: 'Spring Seeker Medallion',
    description: 'Family-friendly river trail with hidden egg clues.',
  },
  {
    id: 'founders-friday',
    adventureId: 'founders-parsons-lost',
    title: "Founder's Friday Live",
    startsAt: '2026-06-20T20:00:00',
    endsAt: '2026-06-20T23:00:00',
    maxEntries: 30,
    participants: 18,
    exclusiveReward: '500 Bonus Coins',
    description: 'Limited entry Founder Hunt — starts Friday at 8PM.',
  },
];

export const SEED_ACTIVITY = [
  { id: 'a1', type: 'creator', text: 'Parsons Heritage released a new hunt.', at: '2h ago' },
  { id: 'a2', type: 'team', text: 'Team Bigfoot earned Night Hunter badge.', at: '4h ago' },
  { id: 'a3', type: 'friend', text: 'Sarah J. completed Founder\'s Hunt.', at: '6h ago' },
  { id: 'a4', type: 'team', text: 'Parsons Explorers completed Union Depot Ghost in 18 min.', at: '1d ago' },
];

export function normalizeSocial(social = {}) {
  return {
    ...DEFAULT_SOCIAL,
    ...social,
    follows: Array.isArray(social.follows) ? social.follows : [],
    challenges: Array.isArray(social.challenges) ? social.challenges : [],
    photos: Array.isArray(social.photos) ? social.photos : [],
    stories: Array.isArray(social.stories) ? social.stories : [],
    ghostRuns: Array.isArray(social.ghostRuns) ? social.ghostRuns : [],
    comments: social.comments || {},
    ghostStats: social.ghostStats || {},
    pinnedComments: social.pinnedComments || {},
    mapPresence: { ...DEFAULT_SOCIAL.mapPresence, ...(social.mapPresence || {}) },
    activityFeed: Array.isArray(social.activityFeed) ? social.activityFeed : [],
    customTeams: Array.isArray(social.customTeams) ? social.customTeams : [],
  };
}

/** Record a map-visible social activity entry (completions, team events). */
export function recordSocialMapActivity(state, entry) {
  const social = normalizeSocial(state.social);
  const note = {
    id: entry.id || `activity-${Date.now()}`,
    kind: entry.kind || 'completion',
    text: entry.text,
    at: entry.at || new Date().toISOString(),
    minutesAgo: entry.minutesAgo ?? 1,
    adventureId: entry.adventureId || null,
    playerName: entry.playerName || null,
    teamId: entry.teamId || social.myTeamId || null,
  };
  return {
    ...state,
    social: {
      ...social,
      activityFeed: [note, ...social.activityFeed.filter((a) => a.id !== note.id)].slice(0, 40),
    },
  };
}

export function getSeasonTier(points) {
  let tier = SEASON_TIERS[0];
  for (const t of SEASON_TIERS) {
    if (points >= t.min) tier = t;
  }
  return tier;
}

export function computeAdventureHeat(adventure, state) {
  const comments = (state.social?.comments?.[adventure.id] || []).length;
  const photos = (state.social?.photos || []).filter((p) => p.adventureId === adventure.id).length;
  const completions = adventure.playersCompleted || 0;
  const rating = adventure.avgRating || 4;
  const teamActivity = (state.social?.activityFeed || []).filter((a) =>
    a.text?.includes(adventure.title)
  ).length;
  const score =
    completions * 2 +
    comments * 5 +
    photos * 8 +
    Math.round(rating * 10) +
    teamActivity * 3;
  return Math.min(100, score);
}

export function getHeatCategory(adventure) {
  if (adventure.isFounderHunt) return HEAT_CATEGORIES.COMPETITIVE;
  if (adventure.title?.toLowerCase().includes('ghost')) return HEAT_CATEGORIES.HAUNTED;
  if (adventure.difficulty <= 2) return HEAT_CATEGORIES.FAMILY;
  if ((adventure.playersCompleted || 0) < 15) return HEAT_CATEGORIES.HIDDEN_GEM;
  if ((adventure.playersCompleted || 0) > 30) return HEAT_CATEGORIES.TRENDING;
  return HEAT_CATEGORIES.TRENDING;
}

export function getHeatLabel(category) {
  const labels = {
    trending: '🔥 Trending',
    haunted: '👻 Haunted',
    competitive: '🏆 Competitive',
    family: '👨‍👩‍👧 Family',
    hidden_gem: '💎 Hidden Gems',
  };
  return labels[category] || '🔥 Trending';
}

export function getRankedAdventures(adventures, state, category = null) {
  const published = adventures.filter((a) => a.status === 'published');
  const scored = published.map((a) => ({
    adventure: a,
    heat: computeAdventureHeat(a, state),
    category: getHeatCategory(a),
  }));
  const filtered = category ? scored.filter((s) => s.category === category) : scored;
  return filtered.sort((a, b) => b.heat - a.heat);
}

export function joinTeam(state, teamId) {
  const social = normalizeSocial(state.social);
  if (social.myTeamId === teamId) return state;
  const memberships = [...new Set([...social.teamMemberships, teamId])];
  return {
    ...state,
    social: { ...social, myTeamId: teamId, teamMemberships: memberships },
  };
}

export function createTeam(state, { name, motto, banner, isPublic }) {
  const id = `team-${Date.now()}`;
  const team = {
    id,
    name: name.trim() || 'New Quest Team',
    banner: banner || '🏴',
    motto: motto?.trim() || 'Adventure awaits.',
    badge: 'Team Crest',
    isPublic: isPublic !== false,
    rank: 99,
    members: 1,
    completions: 0,
    points: 0,
  };
  return joinTeam(
    {
      ...state,
      social: {
        ...normalizeSocial(state.social),
        customTeams: [...(state.social?.customTeams || []), team],
      },
    },
    id
  );
}

export function getAllTeams(state) {
  const custom = state.social?.customTeams || [];
  return [...SEED_TEAMS, ...custom];
}

export function getMyTeam(state) {
  const teams = getAllTeams(state);
  return teams.find((t) => t.id === state.social?.myTeamId) || null;
}

export function addComment(state, adventureId, text, author = 'You') {
  const social = normalizeSocial(state.social);
  const entry = {
    id: `comment-${Date.now()}`,
    adventureId,
    author,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    likes: 0,
  };
  const existing = social.comments[adventureId] || [];
  return {
    ...state,
    social: {
      ...social,
      comments: { ...social.comments, [adventureId]: [...existing, entry] },
    },
  };
}

export function pinComment(state, adventureId, commentId) {
  const social = normalizeSocial(state.social);
  return {
    ...state,
    social: {
      ...social,
      pinnedComments: { ...social.pinnedComments, [adventureId]: commentId },
    },
  };
}

export function addPhotoMemory(state, adventureId, caption, dataUrl = null) {
  const social = normalizeSocial(state.social);
  const photo = {
    id: `photo-${Date.now()}`,
    adventureId,
    caption: caption?.trim() || 'Victory memory',
    dataUrl,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  return {
    ...state,
    social: {
      ...social,
      photos: [...social.photos, photo],
      stories: [
        ...social.stories,
        {
          id: `story-${Date.now()}`,
          type: 'photo',
          adventureId,
          text: caption || 'Victory!',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    },
  };
}

export function addStory(state, text, type = 'victory') {
  const social = normalizeSocial(state.social);
  const story = {
    id: `story-${Date.now()}`,
    type,
    text,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  return { ...state, social: { ...social, stories: [story, ...social.stories] } };
}

export function getActiveStories(state) {
  const now = Date.now();
  return (state.social?.stories || []).filter((s) => new Date(s.expiresAt).getTime() > now);
}

export function followEntity(state, type, id, name) {
  const social = normalizeSocial(state.social);
  const key = `${type}:${id}`;
  if (social.follows.some((f) => f.key === key)) return state;
  return {
    ...state,
    social: {
      ...social,
      follows: [...social.follows, { key, type, id, name, followedAt: new Date().toISOString() }],
    },
  };
}

export function createChallenge(state, targetName, adventureId, metric = 'time') {
  const social = normalizeSocial(state.social);
  const challenge = {
    id: `challenge-${Date.now()}`,
    from: 'You',
    to: targetName,
    adventureId,
    metric,
    status: 'pending',
    createdAt: new Date().toISOString(),
    prize: { coins: 50, badge: 'Challenge Victor' },
  };
  return {
    ...state,
    social: { ...social, challenges: [...social.challenges, challenge] },
  };
}

export function recordGhostRun(state, adventureId, clueIndex, durationMs, direction = null) {
  const social = normalizeSocial(state.social);
  const key = `${adventureId}:${clueIndex}`;
  const stats = social.ghostStats[adventureId] || { clues: {} };
  const clueStats = stats.clues[clueIndex] || { times: [], directions: {} };
  const times = [...clueStats.times, durationMs];
  const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
  const directions = { ...clueStats.directions };
  if (direction) directions[direction] = (directions[direction] || 0) + 1;

  const ghostRun = {
    id: `ghost-${Date.now()}`,
    adventureId,
    clueIndex,
    durationMs,
    direction,
    at: new Date().toISOString(),
  };

  return {
    ...state,
    social: {
      ...social,
      ghostRuns: [...social.ghostRuns, ghostRun],
      ghostStats: {
        ...social.ghostStats,
        [adventureId]: {
          clues: {
            ...stats.clues,
            [clueIndex]: { times, avgMs, directions },
          },
        },
      },
    },
  };
}

export function getGhostHint(state, adventureId, clueIndex) {
  const stats = state.social?.ghostStats?.[adventureId]?.clues?.[clueIndex];
  if (!stats || !stats.times?.length) {
    return SEED_GHOST_HINTS[`${adventureId}:${clueIndex}`] || null;
  }
  const secs = Math.round(stats.avgMs / 1000);
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  const timeStr = mins > 0 ? `${mins}m ${rem}s` : `${secs}s`;
  const dirs = Object.entries(stats.directions || {}).sort((a, b) => b[1] - a[1]);
  if (dirs.length) {
    const pct = Math.round((dirs[0][1] / stats.times.length) * 100);
    return `${pct}% of explorers searched ${dirs[0][0]}.`;
  }
  return `Explorers completed this clue in ~${timeStr} on average.`;
}

const SEED_GHOST_HINTS = {
  'union-depot-ghost:0': '83% of explorers searched east along the platform.',
  'parsons-gold-rush:0': 'Explorer completed this clue in 4m 21s.',
  'iron-horse:0': 'Most explorers followed the rails north first.',
};

export function addSeasonPoints(state, points) {
  const social = normalizeSocial(state.social);
  const seasonPoints = (social.seasonPoints || 0) + points;
  const tier = getSeasonTier(seasonPoints).id;
  return {
    ...state,
    social: { ...social, seasonPoints, seasonTier: tier },
  };
}

export function getLiveEventCountdown(startsAt) {
  const diff = new Date(startsAt).getTime() - Date.now();
  if (diff <= 0) return { live: true, label: 'Live now' };
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return { live: false, label: `${hours}h ${mins}m` };
}

export function getPersonalizedFeed(state, adventures) {
  const base = [...SEED_ACTIVITY];
  const follows = state.social?.follows || [];
  for (const f of follows) {
    base.unshift({
      id: `follow-${f.id}`,
      type: f.type,
      text: `Following ${f.name} — new activity`,
      at: 'now',
    });
  }
  const team = getMyTeam(state);
  if (team) {
    base.unshift({
      id: 'my-team',
      type: 'team',
      text: `${team.name} is ranked #${team.rank} this season.`,
      at: 'now',
    });
  }
  return base.slice(0, 12);
}

export function supportsTeamPlay(adventure) {
  const mode = adventure?.playMode || PLAY_MODES.BOTH;
  return mode === PLAY_MODES.TEAM || mode === PLAY_MODES.BOTH;
}

export function getTeamProgress(state, adventureId) {
  const p = getAdventureProgress(state, adventureId);
  return p.teamStep ?? p.step;
}

export function advanceTeamProgress(state, adventureId) {
  const p = getAdventureProgress(state, adventureId);
  const step = Math.min((p.teamStep ?? p.step) + 1, 99);
  return {
    ...state,
    progress: {
      ...state.progress,
      [adventureId]: { ...p, teamStep: step, step: Math.max(p.step, step) },
    },
  };
}
