/**
 * Questory 2.0 — Phase 15: Dynamic Factions, Guilds & Territory Wars
 * Faction influence, territory control, guild identity, seasonal wars.
 */
import { safeGetTime } from './dateUtils';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const FACTION_LIMITS = {
  MAX_TIMELINE: 16,
  MAX_TERRITORIES: 12,
  MAX_EARTH_MARKERS: 8,
  MAX_ALLIANCES: 4,
};

export const CONTRIBUTION_WEIGHTS = {
  adventure_completion: 10,
  boss_contribution: 25,
  legendary_relic: 30,
  creator_world: 18,
  marketplace_sale: 5,
  npc_quest: 8,
  fog_reveal: 6,
  crafting: 4,
  guild_expedition: 12,
};

export const CONTROL_RULES = {
  CONTESTED_GAP_PCT: 10,
  FLIP_LEAD_PCT: 15,
  DAILY_DECAY: 0.03,
};

export const GUILD_RANKS = [
  { id: 'initiate', label: 'Initiate', minXp: 0 },
  { id: 'scout', label: 'Scout', minXp: 100 },
  { id: 'veteran', label: 'Veteran', minXp: 350 },
  { id: 'captain', label: 'Captain', minXp: 800 },
  { id: 'warden', label: 'Warden', minXp: 1500 },
  { id: 'founder', label: 'Founder', minXp: 3000 },
];

export const SEED_FACTIONS = [
  {
    factionId: 'parsons-explorers',
    name: 'Parsons Explorers Guild',
    tag: 'PEG',
    emblem: '🧭',
    color: '#34d399',
    level: 6,
    reputation: 4200,
    seasonScore: 1840,
    members: 48,
    motto: 'Every street has a story.',
    rivals: ['treasure-syndicate'],
    alliances: ['heritage-keepers'],
  },
  {
    factionId: 'ghost-hunters-kansas',
    name: 'Ghost Hunters of Kansas',
    tag: 'GHK',
    emblem: '👻',
    color: '#a78bfa',
    level: 5,
    reputation: 3800,
    seasonScore: 1620,
    members: 36,
    motto: 'We hunt what daylight misses.',
    rivals: ['black-lantern-watch'],
    alliances: ['night-shift'],
  },
  {
    factionId: 'night-shift',
    name: 'The Night Shift',
    tag: 'NSF',
    emblem: '🌙',
    color: '#60a5fa',
    level: 4,
    reputation: 2900,
    seasonScore: 1180,
    members: 28,
    motto: 'After dark is when legends wake.',
    rivals: ['market-wardens'],
    alliances: ['ghost-hunters-kansas'],
  },
  {
    factionId: 'heritage-keepers',
    name: 'Heritage Keepers',
    tag: 'HKR',
    emblem: '🏛️',
    color: '#fbbf24',
    level: 5,
    reputation: 3400,
    seasonScore: 1410,
    members: 32,
    motto: 'Guard the stories that built Parsons.',
    rivals: ['treasure-syndicate'],
    alliances: ['parsons-explorers'],
  },
  {
    factionId: 'treasure-syndicate',
    name: 'Treasure Syndicate',
    tag: 'TSY',
    emblem: '💰',
    color: '#f472b6',
    level: 4,
    reputation: 2600,
    seasonScore: 980,
    members: 22,
    motto: 'Fortune favors the bold.',
    rivals: ['parsons-explorers', 'heritage-keepers'],
    alliances: [],
  },
  {
    factionId: 'market-wardens',
    name: 'Market Wardens',
    tag: 'MWD',
    emblem: '🛡️',
    color: '#38bdf8',
    level: 3,
    reputation: 2100,
    seasonScore: 760,
    members: 18,
    motto: 'Fair trade keeps the city alive.',
    rivals: ['night-shift'],
    alliances: ['heritage-keepers'],
  },
  {
    factionId: 'black-lantern-watch',
    name: 'Black Lantern Watch',
    tag: 'BLW',
    emblem: '🏮',
    color: '#fb923c',
    level: 5,
    reputation: 3600,
    seasonScore: 1550,
    members: 30,
    motto: 'Light the path through the dark.',
    rivals: ['ghost-hunters-kansas'],
    alliances: [],
  },
];

export const SEED_TERRITORIES = [
  {
    territoryId: 'downtown',
    name: 'Downtown',
    type: 'district',
    latitude: 37.3392,
    longitude: -95.261,
    radius: 520,
    baseInfluence: {
      'parsons-explorers': 42,
      'market-wardens': 28,
      'heritage-keepers': 18,
    },
    rewards: { coins: 50, guildTokens: 2 },
    marketModifier: { sellerRep: 0.05, listingFee: -0.02 },
    bossModifier: null,
    creatorWorldModifier: null,
  },
  {
    territoryId: 'union-depot',
    name: 'Union Depot',
    type: 'landmark',
    latitude: 37.338,
    longitude: -95.2625,
    radius: 420,
    baseInfluence: {
      'ghost-hunters-kansas': 38,
      'black-lantern-watch': 32,
      'parsons-explorers': 20,
    },
    rewards: { coins: 40, relicChance: 0.05 },
    marketModifier: null,
    bossModifier: { lootBonus: 0.08 },
    creatorWorldModifier: null,
  },
  {
    territoryId: 'horror-crest',
    name: 'Horror Crest',
    type: 'district',
    latitude: 37.3348,
    longitude: -95.264,
    radius: 450,
    baseInfluence: {
      'ghost-hunters-kansas': 44,
      'black-lantern-watch': 30,
      'night-shift': 16,
    },
    rewards: { coins: 55, bossLootBonus: 0.1 },
    marketModifier: null,
    bossModifier: { lootBonus: 0.1 },
    creatorWorldModifier: { horrorBoost: 0.12 },
  },
  {
    territoryId: 'lake-parsons',
    name: 'Lake Parsons',
    type: 'district',
    latitude: 37.334,
    longitude: -95.258,
    radius: 400,
    baseInfluence: {
      'night-shift': 40,
      'parsons-explorers': 30,
      'heritage-keepers': 18,
    },
    rewards: { coins: 35, xp: 25 },
    marketModifier: null,
    bossModifier: null,
    creatorWorldModifier: null,
  },
  {
    territoryId: 'river-district',
    name: 'River District',
    type: 'district',
    latitude: 37.3365,
    longitude: -95.256,
    radius: 380,
    baseInfluence: {
      'heritage-keepers': 36,
      'parsons-explorers': 34,
      'market-wardens': 20,
    },
    rewards: { coins: 30, craftingMaterial: 1 },
    marketModifier: null,
    bossModifier: null,
    creatorWorldModifier: null,
  },
  {
    territoryId: 'creator-bazaar',
    name: 'Creator Bazaar',
    type: 'creator_world',
    latitude: 37.341,
    longitude: -95.255,
    radius: 360,
    baseInfluence: {
      'treasure-syndicate': 35,
      'parsons-explorers': 32,
      'heritage-keepers': 22,
    },
    rewards: { guildTokens: 3, creatorBoost: 0.08 },
    marketModifier: { rareTrend: 0.06 },
    bossModifier: null,
    creatorWorldModifier: { completionBoost: 0.1 },
  },
  {
    territoryId: 'downtown-market',
    name: 'Downtown Market',
    type: 'marketplace',
    latitude: 37.3392,
    longitude: -95.261,
    radius: 300,
    baseInfluence: {
      'market-wardens': 48,
      'treasure-syndicate': 28,
      'parsons-explorers': 14,
    },
    rewards: { coins: 25, marketDiscount: 0.05 },
    marketModifier: { sellerRep: 0.05, listingFee: -0.03, inventoryQuality: 0.04 },
    bossModifier: null,
    creatorWorldModifier: null,
  },
  {
    territoryId: 'legendary-auction',
    name: 'Legendary Auction',
    type: 'marketplace',
    latitude: 37.3375,
    longitude: -95.268,
    radius: 320,
    baseInfluence: {
      'treasure-syndicate': 42,
      'black-lantern-watch': 26,
      'ghost-hunters-kansas': 20,
    },
    rewards: { coins: 60, bossLootValue: 0.08 },
    marketModifier: { rareTrend: 0.1, bossLootValue: 0.06 },
    bossModifier: null,
    creatorWorldModifier: null,
  },
  {
    territoryId: 'black-lantern-arena',
    name: 'Black Lantern Arena',
    type: 'boss_arena',
    latitude: 37.3355,
    longitude: -95.2635,
    radius: 350,
    baseInfluence: {
      'black-lantern-watch': 46,
      'ghost-hunters-kansas': 32,
      'night-shift': 12,
    },
    rewards: { bossLootBonus: 0.12, guildTokens: 2 },
    marketModifier: null,
    bossModifier: { lootBonus: 0.12, guildContribution: 0.15 },
    creatorWorldModifier: null,
  },
  {
    territoryId: 'weekend-event-zone',
    name: 'Weekend Rally Grounds',
    type: 'event',
    latitude: 37.342,
    longitude: -95.265,
    radius: 340,
    baseInfluence: {
      'parsons-explorers': 30,
      'night-shift': 28,
      'treasure-syndicate': 24,
    },
    rewards: { seasonScore: 50, coins: 40 },
    marketModifier: null,
    bossModifier: null,
    creatorWorldModifier: null,
  },
];

export const DEFAULT_FACTION = {
  memberFactionId: null,
  joinedAt: null,
  reputation: 0,
  guildXp: 0,
  guildRank: 'initiate',
  guildTokens: 0,
  contributions: {},
  territoryVisits: [],
  timelineSeen: [],
  rewardsClaimed: [],
  titles: [],
  seasonScore: 0,
  lastActivityAt: null,
  warSeasonId: '2026-q2-war',
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function normalizeFaction(raw) {
  const base = { ...DEFAULT_FACTION, ...(raw || {}) };
  return {
    ...base,
    contributions: { ...(base.contributions || {}) },
    territoryVisits: Array.isArray(base.territoryVisits) ? base.territoryVisits : [],
    timelineSeen: Array.isArray(base.timelineSeen) ? base.timelineSeen : [],
    rewardsClaimed: Array.isArray(base.rewardsClaimed) ? base.rewardsClaimed : [],
    titles: Array.isArray(base.titles) ? base.titles : [],
  };
}

export function resolveFactionById(factionId) {
  return SEED_FACTIONS.find((f) => f.factionId === factionId) || null;
}

export function resolveTerritoryById(territoryId) {
  return SEED_TERRITORIES.find((t) => t.territoryId === territoryId) || null;
}

export function simulateFactionActivity(factionId, territoryId, now = Date.now()) {
  const day = Math.floor(safeGetTime(now) / 86400000);
  const seed = hashSeed(`faction-activity:${factionId}:${territoryId}:${day}`);
  return 5 + (seed % 16);
}

function applyDailyDecay(scores, now = Date.now()) {
  const day = Math.floor(safeGetTime(now) / 86400000);
  const decayFactor = 1 - CONTROL_RULES.DAILY_DECAY;
  const out = {};
  for (const [factionId, score] of Object.entries(scores)) {
    const seed = hashSeed(`decay:${factionId}:${day}`);
    const jitter = 0.98 + (seed % 5) * 0.005;
    out[factionId] = Math.max(1, Math.round(score * decayFactor * jitter * 10) / 10);
  }
  return out;
}

function mergeInfluenceScores(territory, state, now = Date.now()) {
  const scores = { ...territory.baseInfluence };
  const playerContribs = state?.faction?.contributions?.[territory.territoryId] || {};
  for (const [factionId, amount] of Object.entries(playerContribs)) {
    scores[factionId] = (scores[factionId] || 0) + amount;
  }
  for (const faction of SEED_FACTIONS) {
    const simulated = simulateFactionActivity(faction.factionId, territory.territoryId, now);
    scores[faction.factionId] = (scores[faction.factionId] || 0) + simulated * 0.4;
  }
  return applyDailyDecay(scores, now);
}

export function calculateTerritoryControl(territory, state, now = Date.now()) {
  const influenceScores = mergeInfluenceScores(territory, state, now);
  const total = Object.values(influenceScores).reduce((sum, v) => sum + v, 0) || 1;
  const ranked = Object.entries(influenceScores)
    .map(([factionId, score]) => ({
      factionId,
      score,
      pct: Math.round((score / total) * 1000) / 10,
      faction: resolveFactionById(factionId),
    }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const second = ranked[1];
  const contested =
    top && second ? top.pct - second.pct <= CONTROL_RULES.CONTESTED_GAP_PCT : false;
  const challengerLead = second && top ? top.pct - second.pct : 100;
  const flipPending = contested && challengerLead >= CONTROL_RULES.FLIP_LEAD_PCT;

  const stability = contested
    ? Math.max(20, 100 - (CONTROL_RULES.CONTESTED_GAP_PCT - challengerLead) * 4)
    : Math.min(100, 60 + (top?.pct || 0) * 0.4);

  return {
    territoryId: territory.territoryId,
    influenceScores,
    ranked,
    ownerFactionId: top?.factionId || null,
    ownerPct: top?.pct || 0,
    contested,
    flipPending,
    stability: Math.round(stability),
  };
}

export function getTerritoryOwner(territoryId, state, now = Date.now()) {
  const territory = resolveTerritoryById(territoryId);
  if (!territory) return null;
  const control = calculateTerritoryControl(territory, state, now);
  return control.ownerFactionId;
}

function buildTerritoryView(territory, state, now = Date.now()) {
  const control = calculateTerritoryControl(territory, state, now);
  const owner = resolveFactionById(control.ownerFactionId);
  return {
    ...territory,
    ownerFactionId: control.ownerFactionId,
    ownerName: owner?.name || 'Unclaimed',
    ownerColor: owner?.color || '#64748b',
    ownerEmblem: owner?.emblem || '🏳️',
    influenceScores: control.influenceScores,
    ranked: control.ranked,
    contested: control.contested,
    flipPending: control.flipPending,
    stability: control.stability,
    activeEvents: control.contested ? ['territory_contest'] : [],
  };
}

export function getFactionStanding(state, factionId = state?.faction?.memberFactionId) {
  if (!factionId) return null;
  const faction = resolveFactionById(factionId);
  if (!faction) return null;
  const territories = SEED_TERRITORIES.map((t) => buildTerritoryView(t, state));
  const controlled = territories.filter((t) => t.ownerFactionId === factionId);
  return {
    factionId,
    name: faction.name,
    tag: faction.tag,
    emblem: faction.emblem,
    color: faction.color,
    reputation: faction.reputation + (state?.faction?.reputation || 0),
    seasonScore: faction.seasonScore + (state?.faction?.seasonScore || 0),
    territoriesControlled: controlled.length,
    controlledTerritories: controlled.map((t) => t.territoryId),
    rank: SEED_FACTIONS.findIndex((f) => f.factionId === factionId) + 1,
  };
}

export function buildFactionTimeline(state, adventures = [], now = Date.now()) {
  const entries = [];
  const memberId = state?.faction?.memberFactionId;

  for (const territory of SEED_TERRITORIES.slice(0, FACTION_LIMITS.MAX_TERRITORIES)) {
    const view = buildTerritoryView(territory, state, now);
    const owner = resolveFactionById(view.ownerFactionId);
    if (!owner) continue;
    const minutesAgo = 15 + (hashSeed(territory.territoryId) % 180);
    if (view.contested) {
      const challenger = view.ranked[1]?.faction;
      entries.push({
        id: `faction-contest-${territory.territoryId}`,
        kind: 'faction_contest',
        minutesAgo,
        text: `${challenger?.name || 'A rival guild'} is contesting ${territory.name}.`,
        territoryId: territory.territoryId,
        factionId: view.ownerFactionId,
      });
    } else {
      entries.push({
        id: `faction-control-${territory.territoryId}`,
        kind: 'faction_control',
        minutesAgo,
        text: `${owner.name} influences ${territory.name}.`,
        territoryId: territory.territoryId,
        factionId: view.ownerFactionId,
      });
    }
  }

  if (memberId) {
    const standing = getFactionStanding(state, memberId);
    entries.unshift({
      id: 'faction-my-guild',
      kind: 'faction_guild',
      minutesAgo: 5,
      text: `Your guild controls ${standing?.territoriesControlled || 0} territories this season.`,
      factionId: memberId,
    });
  }

  const simulated = [
    {
      id: 'faction-sim-raid',
      kind: 'faction_raid',
      minutesAgo: 42,
      text: 'The Night Shift started a rally near Lake Parsons.',
      factionId: 'night-shift',
      territoryId: 'lake-parsons',
    },
    {
      id: 'faction-sim-defend',
      kind: 'faction_defend',
      minutesAgo: 68,
      text: 'Parsons Explorers Guild is defending Downtown.',
      factionId: 'parsons-explorers',
      territoryId: 'downtown',
    },
    {
      id: 'faction-sim-market',
      kind: 'faction_market',
      minutesAgo: 95,
      text: 'Treasure Syndicate is contesting the Creator Bazaar.',
      factionId: 'treasure-syndicate',
      territoryId: 'creator-bazaar',
    },
  ];

  return [...entries, ...simulated]
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, FACTION_LIMITS.MAX_TIMELINE);
}

export function getFactionTimeline(state, adventures = [], now = Date.now()) {
  return buildFactionTimeline(state, adventures, now);
}

function resolveGuildRank(guildXp) {
  let rank = GUILD_RANKS[0];
  for (const r of GUILD_RANKS) {
    if (guildXp >= r.minXp) rank = r;
  }
  return rank;
}

export function joinFaction(state, factionId) {
  const faction = resolveFactionById(factionId);
  if (!faction) {
    return { ok: false, message: 'Guild not found.', state };
  }
  const next = normalizeFaction(state.faction);
  const joinedAt = new Date().toISOString();
  return {
    ok: true,
    message: `Joined ${faction.name}!`,
    state: {
      ...state,
      faction: {
        ...next,
        memberFactionId: factionId,
        joinedAt,
        lastActivityAt: joinedAt,
      },
      social: {
        ...state.social,
        myTeamId: factionId,
      },
    },
  };
}

export function leaveFaction(state) {
  const memberId = state?.faction?.memberFactionId;
  if (!memberId) {
    return { ok: false, message: 'You are not in a guild.', state };
  }
  const next = normalizeFaction(state.faction);
  return {
    ok: true,
    message: 'Left guild.',
    state: {
      ...state,
      faction: {
        ...next,
        memberFactionId: null,
        joinedAt: null,
      },
      social: {
        ...state.social,
        myTeamId: null,
      },
    },
  };
}

export function recordFactionContribution(state, territoryId, kind = 'adventure_completion', amount) {
  const territory = resolveTerritoryById(territoryId);
  if (!territory) return state;
  const factionId = state?.faction?.memberFactionId;
  if (!factionId) return state;

  const weight = amount ?? CONTRIBUTION_WEIGHTS[kind] ?? 5;
  const next = normalizeFaction(state.faction);
  const territoryContribs = { ...(next.contributions[territoryId] || {}) };
  territoryContribs[factionId] = (territoryContribs[factionId] || 0) + weight;

  const guildXp = next.guildXp + Math.round(weight * 0.8);
  const rank = resolveGuildRank(guildXp);

  return {
    ...state,
    faction: {
      ...next,
      contributions: {
        ...next.contributions,
        [territoryId]: territoryContribs,
      },
      guildXp,
      guildRank: rank.id,
      reputation: next.reputation + Math.round(weight * 0.5),
      seasonScore: next.seasonScore + Math.round(weight * 0.6),
      guildTokens: next.guildTokens + (weight >= 20 ? 1 : 0),
      lastActivityAt: new Date().toISOString(),
    },
  };
}

export function resolveFactionReward(state, rewardId) {
  const next = normalizeFaction(state.faction);
  if (next.rewardsClaimed.includes(rewardId)) {
    return { ok: false, message: 'Reward already claimed.', state, coins: 0 };
  }
  const rewards = {
    'territory-defender': { coins: 75, title: 'Defender' },
    'territory-raider': { coins: 60, title: 'Raider' },
    'guild-season-bronze': { coins: 100, guildTokens: 3 },
    'guild-season-silver': { coins: 200, guildTokens: 5 },
  };
  const reward = rewards[rewardId];
  if (!reward) {
    return { ok: false, message: 'Unknown reward.', state, coins: 0 };
  }
  const titles = reward.title && !next.titles.includes(reward.title)
    ? [...next.titles, reward.title]
    : next.titles;
  return {
    ok: true,
    message: 'Guild reward claimed!',
    coins: reward.coins || 0,
    guildTokens: reward.guildTokens || 0,
    state: {
      ...state,
      coins: (state.coins || 0) + (reward.coins || 0),
      faction: {
        ...next,
        rewardsClaimed: [...next.rewardsClaimed, rewardId],
        guildTokens: next.guildTokens + (reward.guildTokens || 0),
        titles,
      },
    },
  };
}

function inferTerritoryForAdventure(adventure) {
  if (!adventure) return 'downtown';
  const id = adventure.id || '';
  if (id.includes('ghost') || id.includes('horror') || id.includes('lantern')) return 'horror-crest';
  if (id.includes('depot') || id.includes('rail')) return 'union-depot';
  if (id.includes('lake') || id.includes('river')) return 'lake-parsons';
  if (adventure.collectionId === 'parsons-legends') return 'downtown';
  return 'downtown';
}

export function applyFactionOnVictory(state, adventure) {
  const territoryId = inferTerritoryForAdventure(adventure);
  return recordFactionContribution(state, territoryId, 'adventure_completion');
}

export function applyFactionOnMapReveal(state, territoryId = 'downtown') {
  return recordFactionContribution(state, territoryId, 'fog_reveal');
}

export function applyFactionOnBossContribution(state, territoryId = 'black-lantern-arena') {
  return recordFactionContribution(state, territoryId, 'boss_contribution');
}

export function applyFactionOnMarketActivity(state, territoryId = 'downtown-market') {
  return recordFactionContribution(state, territoryId, 'marketplace_sale');
}

export function applyFactionOnNpcQuest(state, territoryId = 'downtown') {
  return recordFactionContribution(state, territoryId, 'npc_quest');
}

export function applyFactionOnCreatorCompletion(state, territoryId = 'creator-bazaar') {
  return recordFactionContribution(state, territoryId, 'creator_world');
}

export function buildFactionMapOverlays(state, now = Date.now()) {
  return SEED_TERRITORIES.map((territory) => {
    const view = buildTerritoryView(territory, state, now);
    return {
      id: `faction-${territory.territoryId}`,
      territoryId: territory.territoryId,
      areaLabel: territory.name,
      latitude: territory.latitude,
      longitude: territory.longitude,
      radiusM: territory.radius,
      teamColor: view.ownerColor,
      teamName: view.ownerName,
      emblem: view.ownerEmblem,
      opacity: view.contested ? 0.28 : 0.22,
      contested: view.contested,
      factionId: view.ownerFactionId,
    };
  });
}

export function buildEarthFactionMarkers(state, now = Date.now()) {
  const totals = {};
  for (const faction of SEED_FACTIONS) {
    totals[faction.factionId] = 0;
  }
  for (const territory of SEED_TERRITORIES) {
    const control = calculateTerritoryControl(territory, state, now);
    if (control.ownerFactionId) {
      totals[control.ownerFactionId] = (totals[control.ownerFactionId] || 0) + control.ownerPct;
    }
  }
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0) || 1;
  return SEED_FACTIONS.slice(0, FACTION_LIMITS.MAX_EARTH_MARKERS).map((faction) => ({
    factionId: faction.factionId,
    name: faction.name,
    emblem: faction.emblem,
    color: faction.color,
    influencePct: Math.round((totals[faction.factionId] / grandTotal) * 100),
    label: `${faction.name} ${Math.round((totals[faction.factionId] / grandTotal) * 100)}%`,
  }));
}

export function getTerritoryModifierForVenue(venueId, state, now = Date.now()) {
  const venueMap = {
    'downtown-market': 'downtown-market',
    'creator-bazaar': 'creator-bazaar',
    'legendary-auction': 'legendary-auction',
  };
  const territoryId = venueMap[venueId];
  if (!territoryId) return null;
  const territory = resolveTerritoryById(territoryId);
  if (!territory) return null;
  const view = buildTerritoryView(territory, state, now);
  const memberId = state?.faction?.memberFactionId;
  const isMemberOwner = memberId && view.ownerFactionId === memberId;
  return {
    territoryId,
    ownerFactionId: view.ownerFactionId,
    ownerName: view.ownerName,
    marketModifier: territory.marketModifier,
    memberBonus: isMemberOwner,
    contested: view.contested,
  };
}

export function getBossTerritoryBonus(state, bossId, now = Date.now()) {
  const arenaTerritory = resolveTerritoryById('black-lantern-arena');
  const horrorTerritory = resolveTerritoryById('horror-crest');
  const memberId = state?.faction?.memberFactionId;
  let bonus = 0;
  let label = null;

  for (const territory of [arenaTerritory, horrorTerritory]) {
    if (!territory) continue;
    const view = buildTerritoryView(territory, state, now);
    if (memberId && view.ownerFactionId === memberId && territory.bossModifier?.lootBonus) {
      bonus = Math.max(bonus, territory.bossModifier.lootBonus);
      label = `${view.ownerName} controls ${territory.name}`;
    }
  }

  return { lootBonus: bonus, label, bossId };
}

export function getFactionSnapshot(state, adventures = [], { now = Date.now() } = {}) {
  const factionState = normalizeFaction(state?.faction);
  const memberFaction = resolveFactionById(factionState.memberFactionId);
  const territories = SEED_TERRITORIES.map((t) => buildTerritoryView(t, state, now));
  const contestedCount = territories.filter((t) => t.contested).length;
  const controlledByPlayer = memberFaction
    ? territories.filter((t) => t.ownerFactionId === memberFaction.factionId).length
    : 0;

  const rankings = SEED_FACTIONS.map((f) => {
    const standing = getFactionStanding(state, f.factionId);
    return {
      ...f,
      territoriesControlled: standing?.territoriesControlled || 0,
      totalSeasonScore: standing?.seasonScore || f.seasonScore,
    };
  }).sort((a, b) => b.totalSeasonScore - a.totalSeasonScore);

  const timeline = buildFactionTimeline(state, adventures, now);
  const mapOverlays = buildFactionMapOverlays(state, now);
  const earthMarkers = buildEarthFactionMarkers(state, now);
  const guildRank = resolveGuildRank(factionState.guildXp);

  const wars = territories
    .filter((t) => t.contested)
    .map((t) => ({
      territoryId: t.territoryId,
      name: t.name,
      leader: t.ranked[0]?.faction?.name,
      challenger: t.ranked[1]?.faction?.name,
      gap: t.ranked[0] && t.ranked[1] ? t.ranked[0].pct - t.ranked[1].pct : 0,
    }));

  const seasonEndsAt = new Date(safeGetTime(now) + 14 * 86400000).toISOString();

  return wrapEngineSnapshot({
    initialized: true,
    memberFaction,
    memberFactionId: factionState.memberFactionId,
    guildRank: guildRank.label,
    guildXp: factionState.guildXp,
    reputation: factionState.reputation,
    seasonScore: factionState.seasonScore,
    guildTokens: factionState.guildTokens,
    titles: factionState.titles,
    factions: SEED_FACTIONS,
    territories,
    rankings,
    timeline,
    mapOverlays,
    earthMarkers,
    wars,
    contestedCount,
    controlledByPlayer,
    territoryCount: territories.length,
    factionCount: SEED_FACTIONS.length,
    season: {
      id: factionState.warSeasonId,
      label: 'Territory War Season',
      endsAt: seasonEndsAt,
      activeTerritories: territories.filter((t) => t.contested || t.flipPending).length,
    },
    lastEvent: timeline[0] || null,
  });
}
