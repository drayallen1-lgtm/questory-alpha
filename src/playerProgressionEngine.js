/**
 * Questory 2.0 — Phase 8: Player Progression
 * Explorer level, hunter/cartographer ranks, city/creator/guild reputation, season rank.
 */
import { getAdventureProgress } from './seed';
import { getAllCollectionProgress, BADGE_DEFS } from './engagement';
import { getMyTeam, SEASON_TIERS, getSeasonTier } from './social';
import { computeCityCompletionPct, computeGuildProgress } from './socialWorldEngine';
import { getSeasonProgress } from './questoryIdentityEngine';
import { getCodexSnapshot } from './codexEngine';
import { CREATOR_WORLDS } from './seasonEngine';
import { SEED_NPCS } from './worldEngine';

export const PROGRESSION_LIMITS = {
  MAX_MILESTONES: 12,
  MAX_CREATOR_REPUTATIONS: 8,
};

export const XP_REWARDS = {
  ADVENTURE_COMPLETE: 120,
  LEGENDARY_HUNT: 200,
  FIRST_FINDER: 150,
  FOG_REVEAL: 25,
  DISCOVERY: 80,
  BADGE: 50,
  COLLECTION: 200,
  NPC_MET: 30,
  AR_SCENE: 20,
  STREAK_DAY: 15,
  WORLD_BOSS: 300,
};

export const TREASURE_HUNTER_RANKS = [
  { id: 'scout', label: 'Scout', icon: '🔭', minHunts: 0 },
  { id: 'trail_blazer', label: 'Trail Blazer', icon: '🥾', minHunts: 3 },
  { id: 'treasure_hunter', label: 'Treasure Hunter', icon: '💎', minHunts: 7 },
  { id: 'master_hunter', label: 'Master Hunter', icon: '🏆', minHunts: 13 },
  { id: 'legend_hunter', label: 'Legend Hunter', icon: '👑', minHunts: 21 },
];

export const CARTOGRAPHER_RANKS = [
  { id: 'wanderer', label: 'Wanderer', icon: '🚶', minExploration: 0 },
  { id: 'pathfinder', label: 'Pathfinder', icon: '🧭', minExploration: 3 },
  { id: 'surveyor', label: 'Surveyor', icon: '📐', minExploration: 8 },
  { id: 'master_cartographer', label: 'Master Cartographer', icon: '🗺️', minExploration: 13 },
  { id: 'world_cartographer', label: 'World Cartographer', icon: '🌍', minExploration: 21 },
];

export const REPUTATION_TIERS = [
  { id: 'stranger', label: 'Stranger', min: 0, icon: '👤' },
  { id: 'known', label: 'Known Explorer', min: 20, icon: '📍' },
  { id: 'respected', label: 'Respected', min: 40, icon: '⭐' },
  { id: 'honored', label: 'Honored', min: 60, icon: '🏅' },
  { id: 'legend', label: 'Local Legend', min: 80, icon: '👑' },
];

export const DEFAULT_PLAYER_PROGRESSION = {
  bonusXp: 0,
  milestonesSeen: [],
  lastLevelSeen: 1,
  reputationHighlights: {},
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function normalizePlayerProgression(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PLAYER_PROGRESSION };
  return {
    bonusXp: Math.max(0, Number(raw.bonusXp) || 0),
    milestonesSeen: Array.isArray(raw.milestonesSeen) ? raw.milestonesSeen.slice(0, 50) : [],
    lastLevelSeen: Math.max(1, Number(raw.lastLevelSeen) || 1),
    reputationHighlights:
      raw.reputationHighlights && typeof raw.reputationHighlights === 'object'
        ? { ...raw.reputationHighlights }
        : {},
  };
}

export function xpRequiredForLevel(level) {
  const lv = Math.max(1, level);
  return Math.floor(80 * Math.pow(lv - 1, 1.45) + (lv - 1) * 40);
}

export function levelFromXp(totalXp) {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= totalXp && level < 99) level += 1;
  return level;
}

function countCompletedAdventures(state, adventures) {
  return adventures.filter((a) => getAdventureProgress(state, a.id).claimed).length;
}

function countExplorationScore(state) {
  const fog = state?.mapExploration?.revealed?.length || 0;
  const first = state?.mapExploration?.firstDiscoveries?.length || 0;
  const discoveries = state?.world?.discoveriesFound?.length || 0;
  return fog + first * 2 + discoveries * 3;
}

function countNpcsMet(state) {
  const progress = state?.world?.npcProgress || {};
  return SEED_NPCS.filter((npc) => {
    const record = progress[npc.id];
    return (record?.visitCount || 0) > 0 || (record?.seenDialogues?.length || 0) > 0;
  }).length;
}

function countArScenes(state, adventures) {
  let total = 0;
  for (const adventure of adventures) {
    const progress = getAdventureProgress(state, adventure.id);
    total += progress.arScenesCompleted?.length || 0;
  }
  return total;
}

export function computeExplorerXp(state, adventures = []) {
  const engagement = state?.engagement || {};
  const completed = countCompletedAdventures(state, adventures);
  const fog = state?.mapExploration?.revealed?.length || 0;
  const discoveries = state?.world?.discoveriesFound?.length || 0;
  const badges = engagement.badges?.length || 0;
  const collections = engagement.collectionsCompleted?.length || 0;
  const streak = engagement.streak?.count || 0;
  const npcMet = countNpcsMet(state);
  const arScenes = countArScenes(state, adventures);
  const bonusXp = normalizePlayerProgression(state?.playerProgression).bonusXp;

  return (
    completed * XP_REWARDS.ADVENTURE_COMPLETE +
    fog * XP_REWARDS.FOG_REVEAL +
    discoveries * XP_REWARDS.DISCOVERY +
    badges * XP_REWARDS.BADGE +
    collections * XP_REWARDS.COLLECTION +
    streak * XP_REWARDS.STREAK_DAY +
    npcMet * XP_REWARDS.NPC_MET +
    arScenes * XP_REWARDS.AR_SCENE +
    bonusXp
  );
}

function resolveRank(ranks, value, key) {
  let current = ranks[0];
  let next = ranks[1] || null;
  for (let i = 0; i < ranks.length; i += 1) {
    if (value >= ranks[i][key]) {
      current = ranks[i];
      next = ranks[i + 1] || null;
    }
  }
  const span = next ? next[key] - current[key] : 1;
  const progress = next
    ? Math.min(100, Math.round(((value - current[key]) / Math.max(1, span)) * 100))
    : 100;
  return {
    ...current,
    value,
    nextRank: next,
    progressPct: progress,
    remaining: next ? Math.max(0, next[key] - value) : 0,
  };
}

function reputationTier(score) {
  let tier = REPUTATION_TIERS[0];
  for (const t of REPUTATION_TIERS) {
    if (score >= t.min) tier = t;
  }
  const next = REPUTATION_TIERS[REPUTATION_TIERS.indexOf(tier) + 1];
  return {
    ...tier,
    score,
    nextTier: next || null,
    progressPct: next
      ? Math.min(100, Math.round(((score - tier.min) / (next.min - tier.min)) * 100))
      : 100,
  };
}

function buildCityReputation(state, adventures) {
  const score = computeCityCompletionPct(state, adventures);
  const tier = reputationTier(score);
  return {
    id: 'parsons-ks',
    label: 'Parsons Reputation',
    city: 'Parsons',
    state: 'Kansas',
    icon: '🏙️',
    score,
    tier,
    subtitle: `${tier.label} · ${score}% city standing`,
  };
}

function buildCreatorReputations(state, adventures) {
  return CREATOR_WORLDS.map((world) => {
    const inWorld = adventures.filter(
      (a) =>
        a.creatorWorldId === world.creatorWorldId ||
        a.creatorProfileId === world.creatorWorldId
    );
    const total = inWorld.length || world.totalAdventures || 1;
    const completed = inWorld.filter((a) => getAdventureProgress(state, a.id).claimed).length;
    const entered = inWorld.some((a) => {
      const p = getAdventureProgress(state, a.id);
      return p.claimed || p.step > 0;
    });
    const score = entered ? Math.min(100, Math.round((completed / total) * 100) + (entered ? 8 : 0)) : 0;
    return {
      id: world.creatorWorldId,
      label: `${world.creatorName} Reputation`,
      worldTitle: world.worldTitle,
      icon: '🌍',
      score,
      tier: reputationTier(score),
      subtitle: `${completed}/${total} adventures · ${world.featuredSeries}`,
      completed,
      total,
    };
  });
}

function buildGuildReputation(state, adventures) {
  const guild = computeGuildProgress(state, adventures);
  const myTeam = getMyTeam(state);
  const score = Math.min(100, guild.pct + (myTeam ? Math.max(0, 20 - myTeam.rank * 2) : 0));
  return {
    id: myTeam?.id || 'parsons-guild',
    label: 'Guild Reputation',
    guildName: guild.label,
    icon: myTeam?.banner || '🛡️',
    score,
    tier: reputationTier(score),
    subtitle: guild.subtitle,
    teamRank: myTeam?.rank ?? null,
  };
}

function buildSeasonRank(state) {
  const points = state?.social?.seasonPoints || 0;
  const tier = getSeasonTier(points);
  const tierDef = SEASON_TIERS.find((t) => t.id === tier.id) || SEASON_TIERS[0];
  const next = SEASON_TIERS[SEASON_TIERS.indexOf(tierDef) + 1];
  const season = getSeasonProgress(state);
  return {
    points,
    tier: tierDef,
    nextTier: next || null,
    progressPct: next ? Math.min(100, Math.round((points / next.min) * 100)) : 100,
    remaining: next ? Math.max(0, next.min - points) : 0,
    seasonTitle: season.title,
    daysRemaining: season.daysRemaining,
  };
}

function buildMilestones(snapshot) {
  const milestones = [];
  if (snapshot.explorerLevel >= 5) {
    milestones.push({ id: 'level-5', label: 'Reached Explorer Level 5', icon: '⭐' });
  }
  if (snapshot.explorerLevel >= 10) {
    milestones.push({ id: 'level-10', label: 'Reached Explorer Level 10', icon: '🌟' });
  }
  if (snapshot.treasureHunterRank.id === 'master_hunter') {
    milestones.push({ id: 'master-hunter', label: 'Master Hunter rank achieved', icon: '🏆' });
  }
  if (snapshot.cartographerRank.id === 'master_cartographer') {
    milestones.push({ id: 'master-cartographer', label: 'Master Cartographer rank achieved', icon: '🗺️' });
  }
  if (snapshot.cityReputation.score >= 60) {
    milestones.push({ id: 'parsons-honored', label: 'Honored in Parsons', icon: '🏙️' });
  }
  if (snapshot.seasonRank.tier.id === 'gold' || snapshot.seasonRank.tier.id === 'diamond') {
    milestones.push({ id: 'season-gold', label: 'Gold season tier reached', icon: '🏔️' });
  }
  return milestones.slice(0, PROGRESSION_LIMITS.MAX_MILESTONES);
}

export function getPlayerProgressionSnapshot(state, adventures = [], options = {}) {
  const stored = normalizePlayerProgression(state?.playerProgression);
  const totalXp = computeExplorerXp(state, adventures);
  const explorerLevel = levelFromXp(totalXp);
  const currentLevelFloor = xpRequiredForLevel(explorerLevel);
  const nextLevelFloor = xpRequiredForLevel(explorerLevel + 1);
  const levelSpan = Math.max(1, nextLevelFloor - currentLevelFloor);
  const levelProgressPct = Math.min(
    100,
    Math.round(((totalXp - currentLevelFloor) / levelSpan) * 100)
  );
  const xpToNextLevel = Math.max(0, nextLevelFloor - totalXp);

  const completedHunts = countCompletedAdventures(state, adventures);
  const explorationScore = countExplorationScore(state);

  const treasureHunterRank = resolveRank(TREASURE_HUNTER_RANKS, completedHunts, 'minHunts');
  const cartographerRank = resolveRank(CARTOGRAPHER_RANKS, explorationScore, 'minExploration');

  const cityReputation = buildCityReputation(state, adventures);
  const creatorReputations = buildCreatorReputations(state, adventures);
  const guildReputation = buildGuildReputation(state, adventures);
  const seasonRank = buildSeasonRank(state);

  const codex = getCodexSnapshot(state, adventures);
  const collections = getAllCollectionProgress(state, adventures);
  const badges = (state?.engagement?.badges || [])
    .map((id) => BADGE_DEFS[id])
    .filter(Boolean);

  const snapshot = {
    explorerLevel,
    totalXp,
    levelProgressPct,
    xpToNextLevel,
    currentLevelFloor,
    nextLevelFloor,
    treasureHunterRank,
    cartographerRank,
    cityReputation,
    creatorReputations,
    guildReputation,
    seasonRank,
    reputations: [cityReputation, guildReputation, ...creatorReputations],
    stats: {
      completedHunts,
      explorationScore,
      fogReveals: state?.mapExploration?.revealed?.length || 0,
      discoveries: state?.world?.discoveriesFound?.length || 0,
      codexPct: codex.stats.overallPct,
      collectionsComplete: collections.filter((c) => c.complete).length,
      badgesEarned: badges.length,
      streak: state?.engagement?.streak?.count || 0,
    },
    badges,
    stored,
    leveledUp: explorerLevel > stored.lastLevelSeen,
  };

  snapshot.milestones = buildMilestones(snapshot);
  snapshot.newMilestones = snapshot.milestones.filter(
    (m) => !stored.milestonesSeen.includes(m.id)
  );

  return snapshot;
}

export function applyProgressionOnVictory(state, adventure, context = {}) {
  const prog = normalizePlayerProgression(state.playerProgression);
  let bonus = XP_REWARDS.ADVENTURE_COMPLETE;
  if (adventure?.isLegendaryHunt) bonus += XP_REWARDS.LEGENDARY_HUNT;
  if (adventure?.isFounderHunt) bonus += 80;
  if (context.isFirstFinder) bonus += XP_REWARDS.FIRST_FINDER;
  if (context.worldBoss) bonus += XP_REWARDS.WORLD_BOSS;

  return {
    ...state,
    playerProgression: {
      ...prog,
      bonusXp: prog.bonusXp + Math.floor(bonus * 0.15),
    },
  };
}

export function markProgressionLevelSeen(state) {
  const snapshot = getPlayerProgressionSnapshot(state, state?.adventures || []);
  const prog = normalizePlayerProgression(state.playerProgression);
  return {
    ...state,
    playerProgression: {
      ...prog,
      lastLevelSeen: snapshot.explorerLevel,
      milestonesSeen: [
        ...new Set([...prog.milestonesSeen, ...snapshot.milestones.map((m) => m.id)]),
      ].slice(0, 50),
    },
  };
}

export function grantBonusXp(state, amount, source = '') {
  const prog = normalizePlayerProgression(state.playerProgression);
  return {
    ...state,
    playerProgression: {
      ...prog,
      bonusXp: prog.bonusXp + Math.max(0, amount),
      reputationHighlights: {
        ...prog.reputationHighlights,
        [source || 'bonus']: Date.now(),
      },
    },
  };
}
