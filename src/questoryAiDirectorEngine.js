/**
 * Questory 2.0 — Phase 16: AI Director
 * Deterministic world-director — observes existing engines and recommends events.
 * Not an OpenAI API integration yet.
 */
import { safeGetTime } from './dateUtils';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { getFactionSnapshot } from './factionEngine';
import { getLegendaryHuntSnapshot, BOSS_STATUS } from './legendaryHuntEngine';
import { getMarketplaceSnapshot } from './marketplaceEngine';
import { getCreatorEconomySnapshot } from './creatorEconomyEngine';
import { getDynamicStorySnapshot } from './dynamicStoryEngine';
import { getPlayerProgressionSnapshot } from './playerProgressionEngine';
import { getWorldDiscoverySnapshot } from './worldDiscoveryEngine';
import { getQuestoryIdentitySnapshot } from './questoryIdentityEngine';

export const DIRECTOR_LIMITS = {
  MAX_DRAFTS: 20,
  MAX_TIMELINE: 12,
  MAX_OPPORTUNITIES: 12,
  MAX_SIGNALS: 24,
  MAX_EARTH_PULSES: 6,
  MAX_NPC_SUGGESTIONS: 4,
};

export const DIRECTOR_OPPORTUNITY_TYPES = {
  BOSS: 'boss',
  FACTION: 'faction',
  MARKET: 'market',
  CREATOR: 'creator',
  NPC: 'npc',
  DISCOVERY: 'discovery',
  GUILD_RALLY: 'guild_rally',
  SEASONAL: 'seasonal',
  WORLD_EVENT: 'world_event',
};

const PRIVATE_PAYLOAD_KEYS = new Set([
  'email',
  'userId',
  'user',
  'password',
  'token',
  'session',
  'claimHistory',
  'progress',
]);

export const DEFAULT_AI_DIRECTOR = {
  drafts: [],
  timelineSeen: [],
  lastEvaluatedAt: null,
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function normalizeAiDirector(raw) {
  const base = { ...DEFAULT_AI_DIRECTOR, ...(raw || {}) };
  return {
    ...base,
    drafts: Array.isArray(base.drafts) ? base.drafts.slice(0, DIRECTOR_LIMITS.MAX_DRAFTS) : [],
    timelineSeen: Array.isArray(base.timelineSeen) ? base.timelineSeen : [],
  };
}

function countRecentClaims(state, days = 7) {
  const cutoff = Date.now() - days * 86400000;
  return Object.values(state?.progress || {}).filter((p) => {
    if (!p?.claimed || !p.claimedAt) return false;
    return safeGetTime(p.claimedAt) >= cutoff;
  }).length;
}

function fogDensityPct(state) {
  const revealed = state?.mapExploration?.revealed?.length || 0;
  return clamp(100 - revealed * 4, 12, 95);
}

export function evaluateDirectorSignals(state, adventures = [], now = Date.now()) {
  const signals = [];
  const progression = getPlayerProgressionSnapshot(state, adventures, { now });
  const faction = getFactionSnapshot(state, adventures, { now });
  const legendary = getLegendaryHuntSnapshot(state, adventures, { now });
  const marketplace = getMarketplaceSnapshot(state, adventures, { now });
  const creator = getCreatorEconomySnapshot(state, adventures, { now });
  const story = getDynamicStorySnapshot(state, adventures, { now });
  const discovery = getWorldDiscoverySnapshot({
    zoom: 12,
    state,
    adventures,
    fog: { revealed: state?.mapExploration?.revealed || [] },
    now,
  });
  const identity = getQuestoryIdentitySnapshot(state, adventures, { now });

  const recentClaims = countRecentClaims(state);
  if (recentClaims >= 2) {
    signals.push({
      id: 'player-momentum',
      kind: 'player',
      strength: clamp(recentClaims * 15, 30, 90),
      label: 'Player momentum rising',
      detail: `${recentClaims} recent adventure completions`,
    });
  }

  signals.push({
    id: 'player-level',
    kind: 'player',
    strength: clamp(progression.explorerLevel * 8, 10, 80),
    label: `Explorer level ${progression.explorerLevel}`,
    detail: `${progression.totalXp || 0} XP`,
  });

  if (faction.memberFactionId) {
    signals.push({
      id: 'guild-active',
      kind: 'player',
      strength: 55,
      label: `Guild: ${faction.memberFaction?.name || faction.memberFactionId}`,
      detail: `${faction.controlledByPlayer} territories influenced`,
    });
  }

  const cityPct = discovery.overallPct ?? discovery.cityPct ?? 0;
  signals.push({
    id: 'city-discovery',
    kind: 'world',
    strength: clamp(cityPct, 5, 100),
    label: `City discovery ${Math.round(cityPct)}%`,
    detail: discovery.level || 'neighborhood',
  });

  const fog = fogDensityPct(state);
  if (fog > 50) {
    signals.push({
      id: 'fog-dense',
      kind: 'world',
      strength: fog,
      label: 'Dense fog remains on the map',
      detail: `${fog}% unexplored pressure`,
    });
  }

  for (const war of faction.wars.slice(0, 3)) {
    signals.push({
      id: `faction-tension-${war.territoryId}`,
      kind: 'faction',
      strength: clamp(70 - war.gap * 3, 40, 95),
      label: `Contested: ${war.name}`,
      detail: `${war.leader} vs ${war.challenger}`,
      territoryId: war.territoryId,
    });
  }

  if (legendary.hasActiveBoss) {
    signals.push({
      id: 'boss-active',
      kind: 'boss',
      strength: 85,
      label: `${legendary.worldBoss?.name || 'World boss'} is active`,
      detail: legendary.worldBoss?.status || BOSS_STATUS.ACTIVE,
    });
  } else if (legendary.worldBoss?.communityProgress >= 60) {
    signals.push({
      id: 'boss-readiness',
      kind: 'boss',
      strength: clamp(legendary.worldBoss.communityProgress, 50, 95),
      label: 'Boss awakening readiness',
      detail: `${legendary.worldBoss.communityProgress}% community progress`,
    });
  }

  const trending = marketplace.trending?.[0] || marketplace.mostWanted?.[0];
  if (trending) {
    signals.push({
      id: `market-trend-${trending.itemId || trending.name}`,
      kind: 'market',
      strength: clamp(trending.demand || 60, 40, 95),
      label: `${trending.name || trending.label} trending`,
      detail: 'Market imbalance detected',
    });
  }

  const spotlight = creator.trendingCreators?.[0];
  if (spotlight) {
    signals.push({
      id: `creator-traction-${spotlight.id}`,
      kind: 'creator',
      strength: 60,
      label: `Creator traction: ${spotlight.name}`,
      detail: `${spotlight.totalPlays || 0} plays`,
    });
  }

  const staleArc = (story.arcs || []).find((a) => a.status === 'In Progress');
  if (staleArc) {
    signals.push({
      id: `story-arc-${staleArc.arcId}`,
      kind: 'story',
      strength: 55,
      label: `Unresolved arc: ${staleArc.title}`,
      detail: staleArc.status,
    });
  }

  const lowPlay = adventures
    .filter((a) => a.status === 'published' && (a.playersCompleted || 0) < 15)
    .slice(0, 2);
  for (const adv of lowPlay) {
    signals.push({
      id: `content-stale-${adv.id}`,
      kind: 'content',
      strength: 45,
      label: `Low plays: ${adv.title}`,
      detail: `${adv.playersCompleted || 0} completions`,
      adventureId: adv.id,
    });
  }

  if (identity.seasonProgress?.chapterPct >= 65) {
    signals.push({
      id: 'seasonal-chapter',
      kind: 'seasonal',
      strength: clamp(identity.seasonProgress.chapterPct, 50, 90),
      label: 'Season chapter nearing unlock',
      detail: `${identity.seasonProgress.chapterPct}% chapter progress`,
    });
  }

  return signals.slice(0, DIRECTOR_LIMITS.MAX_SIGNALS);
}

export function rankDirectorOpportunities(signals = [], state, adventures = [], now = Date.now()) {
  const faction = getFactionSnapshot(state, adventures, { now });
  const opportunities = [];

  const bossSig = signals.find((s) => s.id === 'boss-readiness' || s.id === 'boss-active');
  if (bossSig) {
    opportunities.push({
      id: 'opp-boss-awakening',
      type: DIRECTOR_OPPORTUNITY_TYPES.BOSS,
      urgency: bossSig.strength,
      confidence: bossSig.id === 'boss-active' ? 95 : 72,
      title: 'Boss awakening opportunity',
      reason: bossSig.detail,
      impact: 'Legendary hunt, Horror Crest atmosphere',
      systems: ['legendaryHunt', 'livingWorld', 'faction'],
      durationHours: 3,
      rewards: ['boss loot bonus', 'guild contribution'],
    });
  }

  for (const war of faction.wars.slice(0, 2)) {
    opportunities.push({
      id: `opp-faction-${war.territoryId}`,
      type: DIRECTOR_OPPORTUNITY_TYPES.FACTION,
      urgency: clamp(80 - war.gap * 4, 45, 90),
      confidence: 78,
      title: `Faction contest: ${war.name}`,
      reason: `${war.leader} and ${war.challenger} are within ${war.gap.toFixed(1)}% influence`,
      impact: 'Territory control, guild reputation',
      systems: ['faction', 'social', 'map'],
      durationHours: 48,
      rewards: ['guild tokens', 'territory bonus'],
      territoryId: war.territoryId,
    });
  }

  const marketSig = signals.find((s) => s.kind === 'market');
  if (marketSig) {
    opportunities.push({
      id: 'opp-market-shift',
      type: DIRECTOR_OPPORTUNITY_TYPES.MARKET,
      urgency: marketSig.strength,
      confidence: 70,
      title: 'Market shift opportunity',
      reason: marketSig.label,
      impact: 'Marketplace pricing, crafting demand',
      systems: ['marketplace', 'crafting'],
      durationHours: 24,
      rewards: ['trade reputation', 'coin bonus'],
    });
  }

  const creatorSig = signals.find((s) => s.kind === 'creator');
  if (creatorSig) {
    opportunities.push({
      id: 'opp-creator-spotlight',
      type: DIRECTOR_OPPORTUNITY_TYPES.CREATOR,
      urgency: 58,
      confidence: 65,
      title: 'Creator spotlight opportunity',
      reason: 'High completion but room for more follows',
      impact: 'Creator economy, social feed',
      systems: ['creatorEconomy', 'social'],
      durationHours: 72,
      rewards: ['creator XP', 'featured placement'],
    });
  }

  const horrorTerritory = faction.territories.find((t) => t.territoryId === 'horror-crest');
  if (horrorTerritory?.contested) {
    opportunities.push({
      id: 'opp-guild-rally-horror',
      type: DIRECTOR_OPPORTUNITY_TYPES.GUILD_RALLY,
      urgency: 68,
      confidence: 74,
      title: 'Guild rally near Horror Crest',
      reason: 'The Night Shift could rally explorers before influence shifts',
      impact: 'Faction wars, map banners',
      systems: ['faction', 'livingWorld'],
      durationHours: 12,
      territoryId: 'horror-crest',
    });
  }

  const lakeTerritory = faction.territories.find((t) => t.territoryId === 'lake-parsons');
  const cityPct = signals.find((s) => s.id === 'city-discovery')?.strength || 40;
  if (cityPct < 55) {
    opportunities.push({
      id: 'opp-discovery-lake',
      type: DIRECTOR_OPPORTUNITY_TYPES.DISCOVERY,
      urgency: clamp(100 - cityPct, 40, 85),
      confidence: 80,
      title: 'Weekend expedition opportunity',
      reason: `Lake Parsons discovery remains low — explorers could be drawn there`,
      impact: 'Fog reveal, world discovery',
      systems: ['worldDiscovery', 'mapExploration'],
      durationHours: 48,
      territoryId: 'lake-parsons',
    });
  }

  const seasonalSig = signals.find((s) => s.kind === 'seasonal');
  if (seasonalSig) {
    opportunities.push({
      id: 'opp-seasonal-chapter',
      type: DIRECTOR_OPPORTUNITY_TYPES.SEASONAL,
      urgency: seasonalSig.strength,
      confidence: 82,
      title: 'Seasonal chapter unlock',
      reason: seasonalSig.detail,
      impact: 'Questory identity, season narrative',
      systems: ['questoryIdentity', 'dynamicStory'],
      durationHours: 168,
    });
  }

  opportunities.push({
    id: 'opp-npc-depot-hook',
    type: DIRECTOR_OPPORTUNITY_TYPES.NPC,
    urgency: horrorTerritory?.contested ? 62 : 48,
    confidence: 75,
    title: 'NPC hook: Union Depot',
    reason: 'Groundskeeper should warn about depot activity after dark',
    impact: 'AI NPC dialogue, story beats',
    systems: ['aiNpc', 'dynamicStory'],
    durationHours: 6,
    npcId: 'groundskeeper',
  });

  return opportunities
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, DIRECTOR_LIMITS.MAX_OPPORTUNITIES);
}

export function generateDirectorRecommendations(state, adventures = [], now = Date.now()) {
  const signals = evaluateDirectorSignals(state, adventures, now);
  return rankDirectorOpportunities(signals, state, adventures, now);
}

export function generateWorldEventPitch(state, adventures = [], opportunity = null, now = Date.now()) {
  const opp = opportunity || generateDirectorRecommendations(state, adventures, now)[0];
  if (!opp) return null;
  return {
    type: DIRECTOR_OPPORTUNITY_TYPES.WORLD_EVENT,
    title: opp.title,
    reason: opp.reason,
    impact: opp.impact,
    durationHours: opp.durationHours || 24,
    rewards: opp.rewards || [],
    fantasyCopy: `The world stirs — ${opp.reason.toLowerCase()}`,
    safe: true,
  };
}

export function generateNpcPromptSuggestion(npcId, state, adventures = [], now = Date.now()) {
  const suggestions = {
    groundskeeper: 'Too many explorers are digging around the depot tonight. Watch the rails.',
    'market-trader': 'Crystal Shards are moving fast. Someone knows something.',
    'pastor-grace': 'The chapel feels busy — Heritage Keepers bring calm when they hold the district.',
    'iron-conductor': 'The whistle echoes again. The Black Lantern hungers for company.',
  };
  const text = suggestions[npcId];
  if (!text) return null;
  return {
    npcId,
    suggestedHook: text,
    mood: 'warning',
    confidence: 72,
    canonical: false,
  };
}

export function generateFactionConflictSuggestion(state, adventures = [], now = Date.now()) {
  const faction = getFactionSnapshot(state, adventures, { now });
  const war = faction.wars[0];
  if (!war) return null;
  return {
    territoryId: war.territoryId,
    title: war.name,
    leader: war.leader,
    challenger: war.challenger,
    gap: war.gap,
    pitch: `${war.challenger} is contesting ${war.name} — only ${war.gap.toFixed(1)}% separates the guilds.`,
    fantasyCopy: `Influence wavers over ${war.name}.`,
  };
}

export function generateBossAwakeningSuggestion(state, adventures = [], now = Date.now()) {
  const legendary = getLegendaryHuntSnapshot(state, adventures, { now });
  const boss = legendary.worldBoss;
  if (!boss) return null;
  const ready = legendary.hasActiveBoss || (boss.communityProgress || 0) >= 55;
  if (!ready) return null;
  return {
    bossId: boss.bossId,
    name: boss.name,
    status: boss.status,
    communityProgress: boss.communityProgress,
    pitch: legendary.hasActiveBoss
      ? `${boss.name} is already awakening.`
      : `The ${boss.name} is close to awakening because Horror Crest activity spiked.`,
    fantasyCopy: `A legend stirs beneath Horror Crest.`,
    guildBonus: legendary.guildBossBonus?.lootBonus || 0,
  };
}

export function generateMarketShiftSuggestion(state, adventures = [], now = Date.now()) {
  const marketplace = getMarketplaceSnapshot(state, adventures, { now });
  const item = marketplace.trending?.[0] || marketplace.mostWanted?.[0];
  if (!item) return null;
  return {
    itemId: item.itemId || item.id,
    name: item.name || item.label,
    pitch: `${item.name || item.label} is trending because crafting demand increased.`,
    fantasyCopy: 'Merchants whisper about shifting prices downtown.',
    demand: item.demand,
  };
}

export function generateCreatorOpportunitySuggestion(state, adventures = [], now = Date.now()) {
  const creator = getCreatorEconomySnapshot(state, adventures, { now });
  const c = creator.trendingCreators?.[0] || creator.creators?.[0];
  if (!c) return null;
  const plays = c.totalPlays || 0;
  const follows = c.followerCount || c.followers || 0;
  return {
    creatorId: c.id,
    name: c.name,
    pitch:
      plays > 50 && follows < 20
        ? `${c.name} has high completion but low follows — suggest a creator spotlight.`
        : `${c.name} is gaining traction in Parsons.`,
    fantasyCopy: `Creators gather attention near the Bazaar.`,
    plays,
    follows,
  };
}

function sanitizePayload(value, depth = 0) {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => sanitizePayload(v, depth + 1));
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (PRIVATE_PAYLOAD_KEYS.has(key)) continue;
    if (key.toLowerCase().includes('email')) continue;
    if (key.toLowerCase().includes('password')) continue;
    out[key] = sanitizePayload(val, depth + 1);
  }
  return out;
}

export function buildDirectorPromptPayload(state, adventures = [], options = {}) {
  const now = options.now || Date.now();
  const signals = evaluateDirectorSignals(state, adventures, now);
  const recommendations = generateDirectorRecommendations(state, adventures, now);
  const progression = getPlayerProgressionSnapshot(state, adventures, { now });

  return sanitizePayload({
    version: '1.0',
    generatedAt: new Date(now).toISOString(),
    world: {
      cityDiscoveryPct: signals.find((s) => s.id === 'city-discovery')?.strength,
      fogDensityPct: fogDensityPct(state),
      bossActive: Boolean(getLegendaryHuntSnapshot(state, adventures, { now }).hasActiveBoss),
      contestedTerritories: getFactionSnapshot(state, adventures, { now }).contestedCount,
    },
    player: {
      explorerLevel: progression.explorerLevel,
      guildTag: state?.faction?.memberFactionId || null,
      recentClaims: countRecentClaims(state),
      hasCrafted: (state?.crafting?.craftedIds || []).length > 0,
    },
    signals: signals.map((s) => ({ id: s.id, kind: s.kind, strength: s.strength, label: s.label })),
    topRecommendations: recommendations.slice(0, 5).map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      urgency: r.urgency,
      confidence: r.confidence,
    })),
    guardrails: {
      noRealWorldDanger: true,
      noPrivateUserData: true,
      draftOnly: true,
      noPaymentManipulation: true,
    },
  });
}

export function buildDirectorTimeline(state, adventures = [], now = Date.now()) {
  const recommendations = generateDirectorRecommendations(state, adventures, now);
  const day = Math.floor(safeGetTime(now) / 86400000);

  const entries = recommendations.slice(0, 5).map((rec, i) => {
    const fantasyMap = {
      [DIRECTOR_OPPORTUNITY_TYPES.BOSS]: `A legend stirs near Horror Crest.`,
      [DIRECTOR_OPPORTUNITY_TYPES.FACTION]: `Influence wavers over ${rec.territoryId?.replace(/-/g, ' ') || 'the city'}.`,
      [DIRECTOR_OPPORTUNITY_TYPES.MARKET]: `Merchants whisper about shifting prices downtown.`,
      [DIRECTOR_OPPORTUNITY_TYPES.CREATOR]: `Creators gather attention near the Bazaar.`,
      [DIRECTOR_OPPORTUNITY_TYPES.DISCOVERY]: `Explorers are being drawn toward Lake Parsons.`,
      [DIRECTOR_OPPORTUNITY_TYPES.GUILD_RALLY]: `Guild banners rise near Horror Crest.`,
      [DIRECTOR_OPPORTUNITY_TYPES.SEASONAL]: `The season chapter nears its next beat.`,
      [DIRECTOR_OPPORTUNITY_TYPES.NPC]: `Old voices warn travelers near the depot.`,
      [DIRECTOR_OPPORTUNITY_TYPES.WORLD_EVENT]: `The world stirs with new possibility.`,
    };
    return {
      id: `director-tl-${rec.id}-${day}`,
      kind: 'director',
      minutesAgo: 8 + i * 14 + (hashSeed(rec.id) % 12),
      text: fantasyMap[rec.type] || rec.reason,
      opportunityId: rec.id,
      type: rec.type,
    };
  });

  if (recommendations.some((r) => r.type === DIRECTOR_OPPORTUNITY_TYPES.DISCOVERY)) {
    entries.unshift({
      id: `director-tl-discovery-${day}`,
      kind: 'director',
      minutesAgo: 3,
      text: 'Explorers are being drawn toward Lake Parsons.',
      type: DIRECTOR_OPPORTUNITY_TYPES.DISCOVERY,
    });
  }

  return entries.slice(0, DIRECTOR_LIMITS.MAX_TIMELINE);
}

export function buildDirectorEarthPulses(state, adventures = [], now = Date.now()) {
  const faction = getFactionSnapshot(state, adventures, { now });
  const legendary = getLegendaryHuntSnapshot(state, adventures, { now });
  const pulses = [];

  if (faction.contestedCount > 0) {
    pulses.push({
      id: 'earth-faction-tension',
      label: 'Kansas faction tension rising',
      kind: 'faction',
      region: 'Kansas',
      strength: clamp(faction.contestedCount * 20, 30, 90),
    });
  }

  if (legendary.hasActiveBoss) {
    pulses.push({
      id: 'earth-boss-readiness',
      label: 'North America boss readiness',
      kind: 'boss',
      region: 'North America',
      strength: 85,
    });
  }

  const creator = getCreatorEconomySnapshot(state, adventures, { now });
  if (creator.trendingCreators?.length) {
    pulses.push({
      id: 'earth-creator-surge',
      label: 'Creator surge in Parsons',
      kind: 'creator',
      region: 'Kansas',
      strength: 55,
    });
  }

  const discovery = getWorldDiscoverySnapshot({
    zoom: 8,
    state,
    adventures,
    fog: { revealed: state?.mapExploration?.revealed || [] },
    now,
  });
  if ((discovery.overallPct || 0) < 50) {
    pulses.push({
      id: 'earth-discovery-spike',
      label: 'Discovery spike possible near Lake Parsons',
      kind: 'discovery',
      region: 'Kansas',
      strength: 48,
    });
  }

  return pulses.slice(0, DIRECTOR_LIMITS.MAX_EARTH_PULSES);
}

export function getDirectorNpcSuggestions(state, adventures = [], now = Date.now()) {
  const npcIds = ['groundskeeper', 'market-trader', 'pastor-grace', 'iron-conductor'];
  return npcIds
    .map((id) => generateNpcPromptSuggestion(id, state, adventures, now))
    .filter(Boolean)
    .slice(0, DIRECTOR_LIMITS.MAX_NPC_SUGGESTIONS);
}

const DRAFT_BUILDERS = {
  world_event: (state, adventures, now) => generateWorldEventPitch(state, adventures, null, now),
  npc_hook: (state, adventures, now, extra) =>
    generateNpcPromptSuggestion(extra?.npcId || 'groundskeeper', state, adventures, now),
  boss_alert: (state, adventures, now) => generateBossAwakeningSuggestion(state, adventures, now),
  faction_rally: (state, adventures, now) => generateFactionConflictSuggestion(state, adventures, now),
  market_shift: (state, adventures, now) => generateMarketShiftSuggestion(state, adventures, now),
  creator_spotlight: (state, adventures, now) =>
    generateCreatorOpportunitySuggestion(state, adventures, now),
};

export function draftDirectorEvent(state, draftType, extra = {}) {
  const now = Date.now();
  const adventures = state?.adventures || [];
  const builder = DRAFT_BUILDERS[draftType];
  if (!builder) {
    return { ok: false, message: 'Unknown draft type.', state };
  }
  const payload = builder(state, adventures, now, extra);
  if (!payload) {
    return { ok: false, message: 'No opportunity available for this draft.', state };
  }
  const director = normalizeAiDirector(state.aiDirector);
  const draft = {
    id: `draft-${draftType}-${now}`,
    type: draftType,
    createdAt: new Date(now).toISOString(),
    status: 'draft',
    payload: sanitizePayload(payload),
    ...extra,
  };
  return {
    ok: true,
    message: 'Director draft saved.',
    draft,
    state: {
      ...state,
      aiDirector: {
        ...director,
        drafts: [draft, ...director.drafts].slice(0, DIRECTOR_LIMITS.MAX_DRAFTS),
        lastEvaluatedAt: new Date(now).toISOString(),
      },
    },
  };
}

export function getAiDirectorSnapshot(state, adventures = [], { now = Date.now() } = {}) {
  const director = normalizeAiDirector(state?.aiDirector);
  const signals = evaluateDirectorSignals(state, adventures, now);
  const opportunities = rankDirectorOpportunities(signals, state, adventures, now);
  const recommendations = opportunities;
  const timeline = buildDirectorTimeline(state, adventures, now);
  const earthPulses = buildDirectorEarthPulses(state, adventures, now);
  const npcSuggestions = getDirectorNpcSuggestions(state, adventures, now);
  const promptPayload = buildDirectorPromptPayload(state, adventures, { now });

  const urgencyScore =
    recommendations.length > 0
      ? Math.round(recommendations.reduce((s, r) => s + r.urgency, 0) / recommendations.length)
      : 0;
  const confidenceScore =
    recommendations.length > 0
      ? Math.round(recommendations.reduce((s, r) => s + r.confidence, 0) / recommendations.length)
      : 0;

  const worldHealth = clamp(
    100 -
      (signals.filter((s) => s.kind === 'faction').length * 8 +
        (signals.find((s) => s.id === 'fog-dense') ? 12 : 0)),
    35,
    98
  );

  return wrapEngineSnapshot({
    initialized: true,
    worldHealth,
    urgencyScore,
    confidenceScore,
    signals,
    signalCount: signals.length,
    opportunities,
    opportunityCount: opportunities.length,
    recommendations,
    topRecommendation: recommendations[0] || null,
    timeline,
    earthPulses,
    npcSuggestions,
    drafts: director.drafts,
    draftCount: director.drafts.length,
    promptPayload,
    lastEvaluatedAt: director.lastEvaluatedAt,
    bossSuggestion: generateBossAwakeningSuggestion(state, adventures, now),
    factionSuggestion: generateFactionConflictSuggestion(state, adventures, now),
    marketSuggestion: generateMarketShiftSuggestion(state, adventures, now),
    creatorSuggestion: generateCreatorOpportunitySuggestion(state, adventures, now),
  });
}
