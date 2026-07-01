/**
 * Questory 2.0 — Phase 10: Legendary Hunts & World Boss Evolution
 * Spawn timing, boss encounters, community progress, multi-stage hunts, rewards.
 */
import { getAdventureMapCenter } from './mapUtils';
import { getAdventureProgress } from './seed';
import { isAdventureClaimed } from './engagement';
import { computeCityCompletionPct } from './socialWorldEngine';
import { isNightTime } from './livingWorldEventsEngine';
import { normalizeCrafting } from './craftingEngine';
import { grantExplorerCurrency, CURRENCY_TYPES } from './explorerEconomyEngine';
import { safeGetTime } from './dateUtils';

export const LEGENDARY_HUNT_LIMITS = {
  MAX_ACTIVE_WORLD_BOSS: 1,
  MAX_REGIONAL_HUNTS: 3,
  MAX_RACE_MARKERS: 6,
  MAX_LIVE_NOTIFICATIONS: 12,
  MAX_TIMELINE_ENTRIES: 30,
};

export const BOSS_STATUS = {
  DORMANT: 'dormant',
  AWAKENING: 'awakening',
  ACTIVE: 'active',
  DEFEATED: 'defeated',
  COOLDOWN: 'cooldown',
};

export const HUNT_STAGE_ACTIONS = {
  FOG_REVEAL: 'fog_reveal',
  ADVENTURE_CLAIM: 'adventure_claim',
  AR_SCENE: 'ar_scene',
  RELIC: 'relic',
  CREATOR_WORLD: 'creator_world',
  SHRINE: 'shrine',
};

const STAGE_ACTION_POINTS = {
  [HUNT_STAGE_ACTIONS.FOG_REVEAL]: 5,
  [HUNT_STAGE_ACTIONS.ADVENTURE_CLAIM]: 15,
  [HUNT_STAGE_ACTIONS.AR_SCENE]: 8,
  [HUNT_STAGE_ACTIONS.RELIC]: 12,
  [HUNT_STAGE_ACTIONS.CREATOR_WORLD]: 10,
  [HUNT_STAGE_ACTIONS.SHRINE]: 20,
};

export const DEFAULT_LEGENDARY_HUNT = {
  joinedBossIds: [],
  bossProgress: {},
  defeatedBossIds: [],
  rewardsClaimed: [],
  lastAlertSeenId: null,
};

export const WORLD_BOSSES = [
  {
    bossId: 'black-lantern',
    name: 'The Black Lantern',
    icon: '🏮',
    story:
      'A phantom conductor’s lantern flickers downtown. When it burns purple, the city belongs to the hunt.',
    difficulty: 'legendary',
    recommendedLevel: 8,
    requiredItems: ['fog_lens'],
    spawnConditions: { night: true, minCityPct: 15, tags: ['horror', 'halloween'] },
    seasonalTag: 'halloween',
    durationHours: 3,
    cooldownHours: 168,
    rotationPriority: 100,
    linkedAdventureIds: ['union-depot-ghost', 'neosho-legend', 'parsons-gold-rush'],
    latitude: 37.3392,
    longitude: -95.261,
    rewards: {
      bossLoot: [{ id: 'legendary-lantern-relic', name: 'Legendary Lantern Relic', icon: '🏮' }],
      worldShards: 5,
      craftingMaterials: { lantern_ember: 3, phoenix_feather: 1 },
      seasonalTokens: 25,
      codexEntry: 'boss-black-lantern',
      hallOfFame: true,
    },
    lore: 'The Black Lantern appears when fog thickens and rails remember the lost.',
    music: 'lantern_theme',
    arFinaleSceneId: 'boss-black-lantern-finale',
    mapAtmosphere: 'purple-fog',
    stages: [
      { id: 'shrines', label: 'Reveal shrines', goal: 25, action: HUNT_STAGE_ACTIONS.SHRINE },
      { id: 'relics', label: 'Gather relics', goal: 35, action: HUNT_STAGE_ACTIONS.RELIC },
      { id: 'unlock', label: 'Unlock boss', goal: 50, action: HUNT_STAGE_ACTIONS.ADVENTURE_CLAIM },
      { id: 'ar-finale', label: 'AR finale', goal: 75, action: HUNT_STAGE_ACTIONS.AR_SCENE },
      { id: 'claim', label: 'Claim legendary reward', goal: 100, action: HUNT_STAGE_ACTIONS.ADVENTURE_CLAIM },
    ],
  },
  {
    bossId: 'iron-conductor',
    name: 'The Iron Conductor',
    icon: '🚂',
    story: 'Steam and steel awaken along the rail district. The Conductor demands tribute from every platform.',
    difficulty: 'hard',
    recommendedLevel: 6,
    requiredItems: [],
    spawnConditions: { minCityPct: 10, tags: ['rail', 'history'] },
    seasonalTag: null,
    durationHours: 4,
    cooldownHours: 120,
    rotationPriority: 80,
    linkedAdventureIds: ['iron-horse', 'union-depot-ghost'],
    latitude: 37.338,
    longitude: -95.2625,
    rewards: {
      bossLoot: [{ id: 'conductor-spike', name: 'Conductor Spike Relic', icon: '🔩' }],
      worldShards: 3,
      craftingMaterials: { rail_spike: 4, ancient_coin: 2 },
      seasonalTokens: 15,
      codexEntry: 'boss-iron-conductor',
    },
    lore: 'He walks the rails at dusk, counting every explorer who passes.',
    music: 'rail_theme',
    arFinaleSceneId: 'boss-iron-conductor-finale',
    mapAtmosphere: 'storm',
    stages: [
      { id: 'tracks', label: 'Clear rail fog', goal: 30, action: HUNT_STAGE_ACTIONS.FOG_REVEAL },
      { id: 'hunts', label: 'Complete rail hunts', goal: 60, action: HUNT_STAGE_ACTIONS.ADVENTURE_CLAIM },
      { id: 'finale', label: 'AR finale', goal: 100, action: HUNT_STAGE_ACTIONS.AR_SCENE },
    ],
  },
  {
    bossId: 'river-sentinel',
    name: 'The River Sentinel',
    icon: '🌊',
    story: 'Something ancient stirs where the Neosho bends. The Sentinel guards waters explorers have forgotten.',
    difficulty: 'hard',
    recommendedLevel: 5,
    requiredItems: ['explorer_compass'],
    spawnConditions: { minCityPct: 20, fullMoon: true },
    seasonalTag: 'summer',
    durationHours: 5,
    cooldownHours: 168,
    rotationPriority: 70,
    linkedAdventureIds: ['river-sentinel', 'neosho-legend'],
    latitude: 37.334,
    longitude: -95.258,
    rewards: {
      bossLoot: [{ id: 'sentinel-pearl', name: 'Sentinel Pearl', icon: '💠' }],
      worldShards: 4,
      craftingMaterials: { crystal_shard: 2, fog_essence: 3 },
      seasonalTokens: 18,
      codexEntry: 'boss-river-sentinel',
    },
    lore: 'The Sentinel rises when the moon is full and the river runs high.',
    music: 'river_theme',
    arFinaleSceneId: 'boss-river-sentinel-finale',
    mapAtmosphere: 'mist',
    stages: [
      { id: 'shore', label: 'Reveal shoreline', goal: 25, action: HUNT_STAGE_ACTIONS.FOG_REVEAL },
      { id: 'relics', label: 'Gather river relics', goal: 50, action: HUNT_STAGE_ACTIONS.RELIC },
      { id: 'claim', label: 'Defeat the Sentinel', goal: 100, action: HUNT_STAGE_ACTIONS.ADVENTURE_CLAIM },
    ],
  },
  {
    bossId: 'hollow-king',
    name: 'The Hollow King',
    icon: '👻',
    story: 'Horror Crest crowns a ruler of whispers. Only guilds united can break his fog.',
    difficulty: 'legendary',
    recommendedLevel: 10,
    requiredItems: ['fog_lens', 'explorer_compass'],
    spawnConditions: { night: true, minCityPct: 25, guild: true },
    seasonalTag: 'halloween',
    durationHours: 3,
    cooldownHours: 336,
    rotationPriority: 90,
    linkedAdventureIds: ['union-depot-ghost', 'neosho-legend'],
    latitude: 37.3348,
    longitude: -95.264,
    rewards: {
      bossLoot: [{ id: 'hollow-crown', name: 'Hollow Crown Relic', icon: '👑' }],
      worldShards: 6,
      craftingMaterials: { lantern_ember: 2, phoenix_feather: 2 },
      seasonalTokens: 30,
      codexEntry: 'boss-hollow-king',
      hallOfFame: true,
    },
    lore: 'The Hollow King feeds on fear and fog. Guild banners weaken his grip.',
    music: 'horror_theme',
    arFinaleSceneId: 'boss-hollow-king-finale',
    mapAtmosphere: 'purple-fog',
    stages: [
      { id: 'guild', label: 'Guild contribution', goal: 30, action: HUNT_STAGE_ACTIONS.CREATOR_WORLD },
      { id: 'shrines', label: 'Clear Horror Crest shrines', goal: 55, action: HUNT_STAGE_ACTIONS.SHRINE },
      { id: 'finale', label: 'AR finale', goal: 100, action: HUNT_STAGE_ACTIONS.AR_SCENE },
    ],
  },
  {
    bossId: 'forgotten-miner',
    name: 'The Forgotten Miner',
    icon: '⛏️',
    story: 'Deep beneath Parsons, a miner still searches for the vein that started it all.',
    difficulty: 'medium',
    recommendedLevel: 4,
    requiredItems: [],
    spawnConditions: { minCityPct: 8, tags: ['history', 'founder'] },
    seasonalTag: 'founder',
    durationHours: 6,
    cooldownHours: 168,
    rotationPriority: 60,
    linkedAdventureIds: ['founders-parsons-lost', 'parsons-gold-rush'],
    latitude: 37.3398,
    longitude: -95.2595,
    rewards: {
      bossLoot: [{ id: 'miner-lantern', name: "Miner's Lantern", icon: '🪔' }],
      worldShards: 2,
      craftingMaterials: { ancient_coin: 4, rail_spike: 2 },
      seasonalTokens: 12,
      codexEntry: 'boss-forgotten-miner',
    },
    lore: 'Founder anniversaries wake the miner from his eternal shift.',
    music: 'mine_theme',
    arFinaleSceneId: 'boss-forgotten-miner-finale',
    mapAtmosphere: 'ember',
    stages: [
      { id: 'vein', label: 'Map the vein', goal: 35, action: HUNT_STAGE_ACTIONS.FOG_REVEAL },
      { id: 'ledger', label: 'Recover ledgers', goal: 70, action: HUNT_STAGE_ACTIONS.ADVENTURE_CLAIM },
      { id: 'claim', label: 'Claim miner relic', goal: 100, action: HUNT_STAGE_ACTIONS.RELIC },
    ],
  },
  {
    bossId: 'chapel-keeper',
    name: 'The Chapel Keeper',
    icon: '⛪',
    story: 'Heritage Row’s chapel holds a keeper who blesses explorers — or tests them.',
    difficulty: 'medium',
    recommendedLevel: 5,
    requiredItems: [],
    spawnConditions: { minCityPct: 12, tags: ['church', 'heritage'] },
    seasonalTag: 'spring',
    durationHours: 4,
    cooldownHours: 120,
    rotationPriority: 65,
    linkedAdventureIds: ['parsons-gold-rush', 'founders-parsons-lost'],
    latitude: 37.3405,
    longitude: -95.2605,
    rewards: {
      bossLoot: [{ id: 'chapel-chalice', name: 'Chapel Chalice', icon: '🏆' }],
      worldShards: 3,
      craftingMaterials: { fog_essence: 2, crystal_shard: 1 },
      seasonalTokens: 14,
      codexEntry: 'boss-chapel-keeper',
    },
    lore: 'Spring bloom awakens the Keeper to judge who walks Heritage Row with honor.',
    music: 'chapel_theme',
    arFinaleSceneId: 'boss-chapel-keeper-finale',
    mapAtmosphere: 'light-pulse',
    stages: [
      { id: 'heritage', label: 'Heritage fog clears', goal: 30, action: HUNT_STAGE_ACTIONS.FOG_REVEAL },
      { id: 'worlds', label: 'Creator world progress', goal: 60, action: HUNT_STAGE_ACTIONS.CREATOR_WORLD },
      { id: 'blessing', label: 'Receive blessing', goal: 100, action: HUNT_STAGE_ACTIONS.ADVENTURE_CLAIM },
    ],
  },
];

function meetsRecommendedLevel(state, adventures, recommendedLevel) {
  const completed = adventures.filter((a) => isAdventureClaimed(state, a.id)).length;
  const badges = state?.engagement?.badges?.length || 0;
  const fog = state?.mapExploration?.revealed?.length || 0;
  const approxLevel = Math.max(1, Math.floor(completed * 1.2 + badges * 0.5 + fog * 0.1));
  return approxLevel >= (recommendedLevel || 1);
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function isFullMoon(now = Date.now()) {
  const day = Math.floor(safeGetTime(now) / 86400000);
  return day % 28 < 3;
}

function isHalloweenSeason(now = Date.now()) {
  const month = new Date(safeGetTime(now)).getMonth();
  return month === 9 || month === 10;
}

export function normalizeLegendaryHunt(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LEGENDARY_HUNT };
  return {
    joinedBossIds: Array.isArray(raw.joinedBossIds) ? raw.joinedBossIds.slice(0, 10) : [],
    bossProgress:
      raw.bossProgress && typeof raw.bossProgress === 'object' ? { ...raw.bossProgress } : {},
    defeatedBossIds: Array.isArray(raw.defeatedBossIds) ? raw.defeatedBossIds.slice(0, 20) : [],
    rewardsClaimed: Array.isArray(raw.rewardsClaimed) ? raw.rewardsClaimed.slice(0, 20) : [],
    lastAlertSeenId: raw.lastAlertSeenId || null,
  };
}

function getBossProgressRecord(state, bossId) {
  const hunt = normalizeLegendaryHunt(state?.legendaryHunt);
  const record = hunt.bossProgress[bossId] || {};
  return {
    contribution: Math.max(0, Number(record.contribution) || 0),
    communityPoints: Math.max(0, Number(record.communityPoints) || 0),
    currentStage: Math.max(0, Number(record.currentStage) || 0),
    arFinaleSeen: Boolean(record.arFinaleSeen),
  };
}

export function evaluateSpawnConditions(boss, state, adventures = [], now = Date.now()) {
  const cond = boss.spawnConditions || {};
  const cityPct = computeCityCompletionPct(state, adventures);

  if (cond.minCityPct != null && cityPct < cond.minCityPct) return false;
  if (cond.night && !isNightTime(now)) return false;
  if (cond.fullMoon && !isFullMoon(now)) return false;
  if (cond.guild && !state?.social?.myTeamId) return false;
  if (cond.halloween && !isHalloweenSeason(now)) return false;

  const hunt = normalizeLegendaryHunt(state?.legendaryHunt);
  if (hunt.defeatedBossIds.includes(boss.bossId)) {
    const defeatedAt = hunt.bossProgress[boss.bossId]?.defeatedAt;
    if (defeatedAt) {
      const cooldownMs = (boss.cooldownHours || 72) * 3600000;
      if (safeGetTime(now) - safeGetTime(defeatedAt) < cooldownMs) return false;
    }
  }

  return true;
}

function getRotationBoss(state, adventures, now) {
  const eligible = WORLD_BOSSES.filter((b) => evaluateSpawnConditions(b, state, adventures, now));
  if (!eligible.length) return WORLD_BOSSES[0];

  if (isHalloweenSeason(now)) {
    const lantern = eligible.find((b) => b.bossId === 'black-lantern');
    if (lantern) return lantern;
  }

  const week = Math.floor(safeGetTime(now) / 604800000);
  const sorted = [...eligible].sort((a, b) => (b.rotationPriority || 0) - (a.rotationPriority || 0));
  return sorted[week % sorted.length];
}

function computeBossWindow(boss, now = Date.now()) {
  const nowMs = safeGetTime(now);
  const duration = boss.durationHours || 3;
  const hoursLeft = Math.max(1, duration - (Math.floor(nowMs / 3600000) % duration));
  const cycleMin = Math.floor(nowMs / 60000) % 30;
  const status = cycleMin < 4 ? BOSS_STATUS.AWAKENING : BOSS_STATUS.ACTIVE;
  return {
    status,
    hoursRemaining: hoursLeft,
    minutesRemaining: hoursLeft * 60,
    windowStart: nowMs,
  };
}

function resolveBossLocation(boss, adventures) {
  const linked = adventures.filter((a) => boss.linkedAdventureIds?.includes(a.id));
  const centers = linked.map((a) => getAdventureMapCenter(a)).filter(Boolean);
  if (centers.length) {
    return {
      latitude: centers.reduce((s, c) => s + c.latitude, 0) / centers.length,
      longitude: centers.reduce((s, c) => s + c.longitude, 0) / centers.length,
    };
  }
  return { latitude: boss.latitude, longitude: boss.longitude };
}

function computeCommunityProgress(boss, state, adventures, now) {
  const linked = adventures.filter((a) => boss.linkedAdventureIds?.includes(a.id));
  const claimed = linked.filter((a) => isAdventureClaimed(state, a.id)).length;
  const base = linked.length ? (claimed / linked.length) * 40 : 0;
  const fog = Math.min(20, (state?.mapExploration?.revealed?.length || 0) * 2);
  const playerRecord = getBossProgressRecord(state, boss.bossId);
  const communitySim = 18 + (hashSeed(`${boss.bossId}-${new Date(now).toDateString()}`) % 22);
  const joinedBoost = normalizeLegendaryHunt(state?.legendaryHunt).joinedBossIds.includes(boss.bossId)
    ? 5
    : 0;

  return Math.min(
    100,
    Math.round(base + fog + communitySim + playerRecord.communityPoints * 0.3 + joinedBoost)
  );
}

function resolveCurrentStage(boss, communityProgress) {
  const stages = boss.stages || [];
  let current = stages[0] || null;
  for (const stage of stages) {
    if (communityProgress >= stage.goal) current = stage;
  }
  return current;
}

function buildBossEncounter(boss, state, adventures, now, options = {}) {
  const window = computeBossWindow(boss, now);
  const hunt = normalizeLegendaryHunt(state?.legendaryHunt);
  const communityProgress = computeCommunityProgress(boss, state, adventures, now);
  const location = resolveBossLocation(boss, adventures);
  const participants =
    127 +
    hunt.joinedBossIds.length * 12 +
    (hashSeed(boss.bossId) % 90) +
    Math.floor(communityProgress * 1.5);
  const currentStage = resolveCurrentStage(boss, communityProgress);
  const stageIndex = (boss.stages || []).findIndex((s) => s.id === currentStage?.id);

  let status = window.status;
  if (communityProgress >= 100) status = BOSS_STATUS.DEFEATED;
  else if (hunt.defeatedBossIds.includes(boss.bossId) && communityProgress >= 100) {
    status = BOSS_STATUS.DEFEATED;
  }

  const crafting = normalizeCrafting(state?.crafting);
  const missingItems = (boss.requiredItems || []).filter((id) => !crafting.craftedIds.includes(id));
  const meetsLevel = meetsRecommendedLevel(state, adventures, boss.recommendedLevel);

  return {
    bossId: boss.bossId,
    id: boss.bossId,
    name: boss.name,
    title: `${boss.name} has awakened`,
    icon: boss.icon,
    story: boss.story,
    difficulty: boss.difficulty,
    recommendedLevel: boss.recommendedLevel,
    requiredItems: boss.requiredItems || [],
    missingItems,
    meetsLevel,
    spawnConditions: boss.spawnConditions,
    rewards: boss.rewards,
    lore: boss.lore,
    music: boss.music,
    arFinaleSceneId: boss.arFinaleSceneId,
    linkedAdventureIds: boss.linkedAdventureIds || [],
    linkedCount: (boss.linkedAdventureIds || []).length,
    stages: boss.stages || [],
    currentStage,
    stageIndex: Math.max(0, stageIndex),
    communityProgress,
    remainingTime: window.minutesRemaining,
    hoursRemaining: window.hoursRemaining,
    minutesRemaining: window.minutesRemaining,
    participants,
    participantsEstimate: participants,
    status,
    mapAtmosphere: boss.mapAtmosphere,
    seasonalTag: boss.seasonalTag,
    description: boss.story,
    rewardLabel: boss.rewards?.bossLoot?.[0]?.name || 'Legendary Relic',
    subtitle: boss.difficulty === 'legendary' ? 'Legendary World Boss' : 'Regional Legendary Hunt',
    latitude: location.latitude,
    longitude: location.longitude,
    joined: hunt.joinedBossIds.includes(boss.bossId),
    defeated: hunt.defeatedBossIds.includes(boss.bossId),
    rewardClaimed: hunt.rewardsClaimed.includes(boss.bossId),
    playerContribution: getBossProgressRecord(state, boss.bossId).contribution,
    canJoin: missingItems.length === 0 && meetsLevel && !hunt.joinedBossIds.includes(boss.bossId),
  };
}

export function resolveActiveWorldBoss(state, adventures = [], options = {}) {
  const now = options.now ?? Date.now();
  const bossDef = getRotationBoss(state, adventures, now);
  return buildBossEncounter(bossDef, state, adventures, now, options);
}

export function resolveRegionalLegendaryHunts(state, adventures = [], options = {}) {
  const now = options.now ?? Date.now();
  const activeBoss = resolveActiveWorldBoss(state, adventures, { now });
  const activeId = activeBoss.bossId;

  return WORLD_BOSSES.filter((b) => b.bossId !== activeId)
    .slice(0, LEGENDARY_HUNT_LIMITS.MAX_REGIONAL_HUNTS)
    .map((b) => buildBossEncounter(b, state, adventures, now, options))
    .filter((e) => e.status === BOSS_STATUS.DORMANT || e.communityProgress < 100)
    .slice(0, LEGENDARY_HUNT_LIMITS.MAX_REGIONAL_HUNTS);
}

export function getLegendaryHuntSnapshot(state, adventures = [], options = {}) {
  const now = options.now ?? Date.now();
  const worldBoss = resolveActiveWorldBoss(state, adventures, { now });
  const regionalHunts = resolveRegionalLegendaryHunts(state, adventures, { now });
  const hunt = normalizeLegendaryHunt(state?.legendaryHunt);

  const races = buildLegendaryRaceMarkers(worldBoss, regionalHunts, adventures);
  const alerts = buildLegendaryAlerts(worldBoss, hunt);
  const timeline = buildLegendaryTimelineEntries(worldBoss, regionalHunts, now);
  const atmosphere = getLegendaryMapAtmosphere(worldBoss);

  return {
    worldBoss,
    regionalHunts,
    activeBoss: worldBoss,
    races: races.slice(0, LEGENDARY_HUNT_LIMITS.MAX_RACE_MARKERS),
    alerts: alerts.slice(0, LEGENDARY_HUNT_LIMITS.MAX_LIVE_NOTIFICATIONS),
    timeline: timeline.slice(0, LEGENDARY_HUNT_LIMITS.MAX_TIMELINE_ENTRIES),
    atmosphere,
    hunt,
    hasActiveBoss:
      worldBoss.status === BOSS_STATUS.ACTIVE || worldBoss.status === BOSS_STATUS.AWAKENING,
  };
}

export function getLegendaryMapAtmosphere(worldBoss) {
  if (!worldBoss) return { className: '', alertLevel: 'none' };
  if (worldBoss.status !== BOSS_STATUS.ACTIVE && worldBoss.status !== BOSS_STATUS.AWAKENING) {
    return { className: '', alertLevel: 'none' };
  }
  const map = {
    'purple-fog': 'legendary-atmosphere-purple-fog',
    storm: 'legendary-atmosphere-storm',
    mist: 'legendary-atmosphere-mist',
    ember: 'legendary-atmosphere-ember',
    'light-pulse': 'legendary-atmosphere-light',
  };
  return {
    className: map[worldBoss.mapAtmosphere] || 'legendary-atmosphere-purple-fog',
    alertLevel: worldBoss.status === BOSS_STATUS.AWAKENING ? 'awakening' : 'active',
    bossId: worldBoss.bossId,
    music: worldBoss.music,
  };
}

export function buildLegendaryAlerts(worldBoss, hunt) {
  const alerts = [];
  if (
    worldBoss.status === BOSS_STATUS.ACTIVE ||
    worldBoss.status === BOSS_STATUS.AWAKENING
  ) {
    alerts.push({
      id: `legendary-alert-${worldBoss.bossId}`,
      icon: '⚠️',
      title: `${worldBoss.name.toUpperCase()} HAS AWAKENED`,
      body: `Only ${worldBoss.hoursRemaining} hour${worldBoss.hoursRemaining === 1 ? '' : 's'} remain.`,
      sub: `Join ${worldBoss.participants} explorers.`,
      reward: worldBoss.rewardLabel,
      kind: 'legendary-boss',
      priority: 100,
      bossId: worldBoss.bossId,
      ttlMs: 20000,
    });
  }
  if (worldBoss.communityProgress >= 100 && !hunt.rewardsClaimed.includes(worldBoss.bossId)) {
    alerts.push({
      id: `legendary-defeated-${worldBoss.bossId}`,
      icon: '🏆',
      title: `${worldBoss.name} defeated!`,
      body: 'Claim your legendary reward before the window closes.',
      kind: 'legendary-victory',
      priority: 98,
      bossId: worldBoss.bossId,
      ttlMs: 30000,
    });
  }
  return alerts;
}

export function buildLegendaryTimelineEntries(worldBoss, regionalHunts, now = Date.now()) {
  const entries = [];
  if (worldBoss.status === BOSS_STATUS.AWAKENING) {
    entries.push({
      id: `tl-boss-awakening-${worldBoss.bossId}`,
      kind: 'boss',
      text: `${worldBoss.icon} ${worldBoss.name} is awakening…`,
      minutesAgo: 1,
    });
  } else if (worldBoss.status === BOSS_STATUS.ACTIVE) {
    entries.push({
      id: `tl-boss-active-${worldBoss.bossId}`,
      kind: 'boss',
      text: `${worldBoss.participants} explorers joined the ${worldBoss.name} hunt`,
      minutesAgo: 2,
    });
  }
  regionalHunts.slice(0, 2).forEach((h, i) => {
    entries.push({
      id: `tl-regional-${h.bossId}`,
      kind: 'event',
      text: `${h.icon} ${h.name} stirs — ${h.communityProgress}% community progress`,
      minutesAgo: 5 + i * 3,
    });
  });
  return entries;
}

export function buildLegendaryRaceMarkers(worldBoss, regionalHunts, adventures = []) {
  const races = [];
  if (worldBoss.status === BOSS_STATUS.ACTIVE || worldBoss.status === BOSS_STATUS.AWAKENING) {
    races.push({
      id: `race-boss-${worldBoss.bossId}`,
      type: 'legendary_hunt',
      title: 'Legendary Hunt Race',
      subtitle: `First 100 players — ${worldBoss.name}`,
      adventureId: worldBoss.linkedAdventureIds?.[0],
      adventureTitle: worldBoss.name,
      teamsCompeting: 4,
      explorersRacing: Math.min(100, worldBoss.participants),
      prize: worldBoss.rewardLabel,
      countdownMinutes: worldBoss.minutesRemaining || worldBoss.hoursRemaining * 60,
      active: true,
      latitude: worldBoss.latitude,
      longitude: worldBoss.longitude,
      bossId: worldBoss.bossId,
    });
  }
  regionalHunts.forEach((h) => {
    if (h.linkedAdventureIds?.[0]) {
      const adv = adventures.find((a) => a.id === h.linkedAdventureIds[0]);
      const center = adv ? getAdventureMapCenter(adv) : null;
      races.push({
        id: `race-regional-${h.bossId}`,
        type: 'legendary_hunt',
        title: h.name,
        subtitle: 'Regional legendary hunt',
        adventureId: h.linkedAdventureIds[0],
        adventureTitle: adv?.title || h.name,
        teamsCompeting: 2,
        explorersRacing: Math.max(12, Math.floor(h.participants / 10)),
        prize: h.rewardLabel,
        countdownMinutes: 180,
        active: h.status === BOSS_STATUS.DORMANT,
        latitude: center?.latitude ?? h.latitude,
        longitude: center?.longitude ?? h.longitude,
        bossId: h.bossId,
      });
    }
  });
  return races.slice(0, LEGENDARY_HUNT_LIMITS.MAX_RACE_MARKERS);
}

export function canJoinLegendaryHunt(state, bossId, adventures = []) {
  const boss = WORLD_BOSSES.find((b) => b.bossId === bossId);
  if (!boss) return { ok: false, reason: 'Unknown boss' };
  const encounter = buildBossEncounter(boss, state, adventures);
  if (encounter.joined) return { ok: false, reason: 'Already joined', alreadyJoined: true };
  if (!encounter.meetsLevel) {
    return { ok: false, reason: `Requires Explorer Lv. ${boss.recommendedLevel}` };
  }
  if (encounter.missingItems.length) {
    return { ok: false, reason: 'Missing crafted items', missingItems: encounter.missingItems };
  }
  if (encounter.status !== BOSS_STATUS.ACTIVE && encounter.status !== BOSS_STATUS.AWAKENING) {
    return { ok: false, reason: 'Boss is not active' };
  }
  return { ok: true };
}

export function joinLegendaryHunt(state, bossId) {
  const check = canJoinLegendaryHunt(state, bossId, state?.adventures || []);
  if (!check.ok) return { ok: false, ...check, state };
  const hunt = normalizeLegendaryHunt(state.legendaryHunt);
  return {
    ok: true,
    state: {
      ...state,
      legendaryHunt: {
        ...hunt,
        joinedBossIds: [...new Set([...hunt.joinedBossIds, bossId])],
      },
    },
  };
}

export function recordLegendaryHuntAction(state, actionType, context = {}) {
  const bossId = context.bossId || resolveActiveWorldBoss(state, state?.adventures || []).bossId;
  const boss = WORLD_BOSSES.find((b) => b.bossId === bossId);
  if (!boss) return state;

  const points = STAGE_ACTION_POINTS[actionType] || 5;
  const hunt = normalizeLegendaryHunt(state.legendaryHunt);
  if (!hunt.joinedBossIds.includes(bossId)) return state;

  const prev = getBossProgressRecord(state, bossId);
  const contribution = prev.contribution + points;
  const communityPoints = prev.communityPoints + Math.floor(points * 0.5);

  let next = {
    ...state,
    legendaryHunt: {
      ...hunt,
      bossProgress: {
        ...hunt.bossProgress,
        [bossId]: {
          ...prev,
          contribution,
          communityPoints,
        },
      },
    },
  };

  const encounter = buildBossEncounter(boss, next, next.adventures || []);
  if (encounter.communityProgress >= 100 && !hunt.defeatedBossIds.includes(bossId)) {
    next = {
      ...next,
      legendaryHunt: {
        ...normalizeLegendaryHunt(next.legendaryHunt),
        defeatedBossIds: [...hunt.defeatedBossIds, bossId],
        bossProgress: {
          ...normalizeLegendaryHunt(next.legendaryHunt).bossProgress,
          [bossId]: {
            ...getBossProgressRecord(next, bossId),
            defeatedAt: new Date().toISOString(),
          },
        },
      },
    };
  }

  return next;
}

export function applyLegendaryHuntOnVictory(state, adventure, context = {}) {
  const snapshot = getLegendaryHuntSnapshot(state, state?.adventures || []);
  if (!snapshot.hasActiveBoss) return state;

  const boss = snapshot.worldBoss;
  const isLinked = boss.linkedAdventureIds?.includes(adventure?.id);
  if (!isLinked && !context.forceBossAction) return state;

  let next = recordLegendaryHuntAction(state, HUNT_STAGE_ACTIONS.ADVENTURE_CLAIM, {
    bossId: boss.bossId,
  });

  if (adventure?.creatorWorldId || adventure?.creatorProfileId) {
    next = recordLegendaryHuntAction(next, HUNT_STAGE_ACTIONS.CREATOR_WORLD, { bossId: boss.bossId });
  }

  const p = getAdventureProgress(next, adventure.id);
  if (p.arScenesCompleted?.length) {
    next = recordLegendaryHuntAction(next, HUNT_STAGE_ACTIONS.AR_SCENE, { bossId: boss.bossId });
  }

  return next;
}

export function applyLegendaryHuntOnMapReveal(state, adventure) {
  const snapshot = getLegendaryHuntSnapshot(state, state?.adventures || []);
  if (!snapshot.hasActiveBoss) return state;
  return recordLegendaryHuntAction(state, HUNT_STAGE_ACTIONS.FOG_REVEAL, {
    bossId: snapshot.worldBoss.bossId,
  });
}

export function claimLegendaryBossReward(state, bossId) {
  const boss = WORLD_BOSSES.find((b) => b.bossId === bossId);
  if (!boss) return { ok: false, reason: 'Unknown boss', state };
  const hunt = normalizeLegendaryHunt(state.legendaryHunt);
  if (!hunt.defeatedBossIds.includes(bossId) && computeCommunityProgress(boss, state, state?.adventures || []) < 100) {
    return { ok: false, reason: 'Boss not yet defeated', state };
  }
  if (hunt.rewardsClaimed.includes(bossId)) {
    return { ok: false, reason: 'Already claimed', state };
  }

  let next = {
    ...state,
    legendaryHunt: {
      ...hunt,
      rewardsClaimed: [...hunt.rewardsClaimed, bossId],
    },
  };

  const rewards = boss.rewards || {};
  if (rewards.worldShards) {
    const grant = grantExplorerCurrency(next, CURRENCY_TYPES.WORLD_SHARDS, rewards.worldShards, bossId);
    next = grant.state;
  }
  if (rewards.seasonalTokens) {
    const grant = grantExplorerCurrency(next, CURRENCY_TYPES.SEASONAL_TOKENS, rewards.seasonalTokens, bossId);
    next = grant.state;
  }
  if (rewards.bossLoot?.length) {
    const economy = next.explorerEconomy || {};
    next = {
      ...next,
      explorerEconomy: {
        ...economy,
        bossLoot: [...(economy.bossLoot || []), ...rewards.bossLoot].slice(0, 20),
      },
    };
  }
  if (rewards.craftingMaterials) {
    const economy = next.explorerEconomy || {};
    const materials = { ...(economy.craftingMaterials || {}) };
    for (const [id, qty] of Object.entries(rewards.craftingMaterials)) {
      materials[id] = (materials[id] || 0) + qty;
    }
    next = {
      ...next,
      explorerEconomy: { ...economy, craftingMaterials: materials },
    };
  }

  return { ok: true, state: next, rewards: boss.rewards };
}

export function markLegendaryAlertSeen(state, alertId) {
  const hunt = normalizeLegendaryHunt(state.legendaryHunt);
  return {
    ...state,
    legendaryHunt: { ...hunt, lastAlertSeenId: alertId },
  };
}

export function markLegendaryArFinaleSeen(state, bossId) {
  const hunt = normalizeLegendaryHunt(state.legendaryHunt);
  const prev = getBossProgressRecord(state, bossId);
  return {
    ...state,
    legendaryHunt: {
      ...hunt,
      bossProgress: {
        ...hunt.bossProgress,
        [bossId]: { ...prev, arFinaleSeen: true },
      },
    },
  };
}

/** Back-compat wrapper for questoryIdentityEngine.resolveWorldBoss */
export function resolveWorldBossFromLegendaryEngine(state, adventures = [], options = {}) {
  const boss = resolveActiveWorldBoss(state, adventures, options);
  return {
    ...boss,
    status:
      boss.status === BOSS_STATUS.DEFEATED
        ? 'defeated'
        : boss.status === BOSS_STATUS.DORMANT || boss.status === BOSS_STATUS.COOLDOWN
          ? 'ended'
          : boss.status,
  };
}
