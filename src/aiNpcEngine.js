/**
 * Questory 2.0 — Phase 14: AI NPC Memory Engine
 * Long-term memory, relationships, dynamic dialogue, quest hooks, AI-ready prompt payloads.
 * Extends livingNpcEngine — does not replace it.
 */
import { normalizeWorld, SEED_NPCS } from './worldEngine';
import {
  getNpcProgressRecord,
  normalizeNpcProgress,
  recordNpcChoice as recordLivingNpcChoice,
  recordNpcDialogueSeen,
} from './livingNpcEngine';
import { getPlayerProgressionSnapshot } from './playerProgressionEngine';
import { getCodexSnapshot } from './codexEngine';
import { getLegendaryHuntSnapshot, BOSS_STATUS } from './legendaryHuntEngine';
import { getMarketplaceSnapshot } from './marketplaceEngine';
import { getCreatorEconomySnapshot } from './creatorEconomyEngine';
import { getCurrentSeason } from './seasonEngine';
import { safeGetWorldEventContext } from './worldEventEngine';
import { isNightTime } from './livingWorldEventsEngine';
import { safeGetTime } from './dateUtils';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const AI_NPC_LIMITS = {
  MAX_ENCOUNTERS: 40,
  MAX_MEMORY_FLAGS: 30,
  MAX_TIMELINE: 12,
  MAX_QUEST_HOOKS: 3,
};

export const RELATIONSHIP_LABELS = {
  stranger: 'Stranger',
  wary: 'Wary',
  acquaintance: 'Acquaintance',
  trusted: 'Trusted',
  ally: 'Ally',
  mentor: 'Mentor',
  rival: 'Rival',
  haunted: 'Haunted',
  legendary_bond: 'Legendary Bond',
};

export const QUEST_HOOK_TYPES = {
  FIND_RELIC: 'find_relic',
  VISIT_LOCATION: 'visit_location',
  COMPLETE_ADVENTURE: 'complete_adventure',
  REVEAL_FOG: 'reveal_fog',
  DEFEAT_BOSS: 'defeat_boss',
  CRAFT_ITEM: 'craft_item',
  TRADE_ITEM: 'trade_item',
  FOLLOW_CREATOR: 'follow_creator',
  COMPLETE_COLLECTION: 'complete_collection',
  HELP_GUILD: 'help_guild',
};

const NPC_ID_ALIASES = {
  'conductor-ghost': 'iron-conductor',
  'heritage-curator': 'parsons-historian',
  'grandpa-joe': 'marcus',
};

export const AI_NPC_PROFILES = [
  {
    id: 'groundskeeper',
    name: 'The Groundskeeper',
    role: 'Depot Keeper',
    avatar: '🪦',
    personality: { tone: 'ominous', traits: ['watchful', 'protective'], voice: 'low and deliberate' },
    memoryRules: ['depot-lantern', 'black-lantern-whisper', 'union-depot-ghost'],
    relationshipCurve: { trustPerVisit: 4, betrayalPenalty: 15 },
    storyArcIds: ['black-lantern-arc', 'founder-trail-arc'],
    bossReactions: {
      'black-lantern': 'The Black Lantern is awake again. Stay off the rails after dark.',
      'iron-conductor': 'Steam on the platform — the Conductor is restless tonight.',
    },
    marketReactions: {
      'black-lantern-relic': 'Someone paid a fortune for that relic. Be careful who you trust.',
      'cursed-doll': 'The Cursed Doll is not meant to be sold.',
    },
    questHooks: [
      { type: QUEST_HOOK_TYPES.VISIT_LOCATION, target: 'union-depot-ghost', label: 'Find the old depot after sunset.', reward: { trust: 8, xp: 40 } },
      { type: QUEST_HOOK_TYPES.REVEAL_FOG, target: 'downtown', label: 'Reveal one more fog sector downtown.', reward: { trust: 6, coins: 25 } },
    ],
  },
  {
    id: 'iron-conductor',
    name: 'The Iron Conductor',
    role: 'Rail Phantom',
    avatar: '🚂',
    personality: { tone: 'mysterious', traits: ['formal', 'unyielding'], voice: 'echoing whistle' },
    memoryRules: ['iron-horse', 'rail_spike', 'platform_shadows'],
    relationshipCurve: { trustPerVisit: 5, betrayalPenalty: 12 },
    storyArcIds: ['iron-conductor-arc', 'black-lantern-arc'],
    bossReactions: {
      'iron-conductor': 'The rails remember every soul. I walk them tonight.',
      'black-lantern': 'Two legends cannot share one platform. Choose your hunt.',
    },
    marketReactions: {
      'iron-conductor-loot': 'Iron Conductor loot is trending — the rails feel it.',
    },
    questHooks: [
      { type: QUEST_HOOK_TYPES.COMPLETE_ADVENTURE, target: 'iron-horse', label: 'Complete the Iron Horse adventure.', reward: { trust: 10, codexEntry: 'conductor-trail' } },
      { type: QUEST_HOOK_TYPES.FIND_RELIC, target: 'conductor-spike', label: 'Bring me a Conductor Spike relic.', reward: { trust: 12, material: 'rail_spike' } },
    ],
  },
  {
    id: 'pastor-grace',
    name: 'Pastor Grace',
    role: 'Chapel Guide',
    avatar: '✝️',
    personality: { tone: 'warm', traits: ['compassionate', 'steadfast'], voice: 'gentle hymn' },
    memoryRules: ['chapel_cornerstone', 'sanctuary_clue'],
    relationshipCurve: { trustPerVisit: 6, betrayalPenalty: 20 },
    storyArcIds: ['parsons-heritage-arc', 'horror-crest-arc'],
    bossReactions: {
      'river-sentinel': 'The river runs high. Pray before you cross the bend.',
    },
    creatorWorldReactions: {
      'horror-crest': 'Some stories should be told with care. The Crest guides know this.',
    },
    questHooks: [
      { type: QUEST_HOOK_TYPES.COMPLETE_ADVENTURE, target: 'parsons-gold-rush', label: 'Walk the Parsons Heritage trail once more.', reward: { trust: 8, lorePage: 'grace-sermon' } },
      { type: QUEST_HOOK_TYPES.HELP_GUILD, target: 'guild', label: 'Help your guild clear fog near the chapel.', reward: { trust: 6, xp: 50 } },
    ],
  },
  {
    id: 'marcus',
    name: 'Marcus',
    role: 'Family Trail Guide',
    avatar: '👨‍👧',
    personality: { tone: 'friendly', traits: ['playful', 'loyal'], voice: 'warm storyteller' },
    memoryRules: ['family_trail', 'iron-horse'],
    relationshipCurve: { trustPerVisit: 7, betrayalPenalty: 10 },
    storyArcIds: ['founder-trail-arc', 'iron-conductor-arc'],
    questHooks: [
      { type: QUEST_HOOK_TYPES.COMPLETE_ADVENTURE, target: 'iron-horse', label: 'Finish the family iron horse hunt together.', reward: { trust: 10, coins: 40 } },
      { type: QUEST_HOOK_TYPES.COMPLETE_COLLECTION, target: 'parsons-legends', label: 'Complete the Parsons Legends collection.', reward: { trust: 15, marketToken: 1 } },
    ],
  },
  {
    id: 'parsons-historian',
    name: 'Parsons Historian',
    role: 'City Lorekeeper',
    avatar: '🏛',
    personality: { tone: 'scholarly', traits: ['curious', 'precise'], voice: 'measured lecture' },
    memoryRules: ['parsons-gold-rush', 'ledger_secret'],
    relationshipCurve: { trustPerVisit: 4, betrayalPenalty: 8 },
    storyArcIds: ['parsons-heritage-arc', 'founder-trail-arc'],
    marketReactions: {
      'parsons-map-fragment': 'A map fragment surfaced at market. Parsons history shifts again.',
    },
    questHooks: [
      { type: QUEST_HOOK_TYPES.FIND_RELIC, target: 'ancient-compass', label: 'Recover an Ancient Compass for the archive.', reward: { trust: 9, codexEntry: 'historian-compass' } },
      { type: QUEST_HOOK_TYPES.REVEAL_FOG, target: 'parsons', label: 'Reveal fog over three Parsons landmarks.', reward: { trust: 7, xp: 60 } },
    ],
  },
  {
    id: 'horror-crest-guide',
    name: 'Horror Crest Guide',
    role: 'Crest Storykeeper',
    avatar: '👻',
    personality: { tone: 'whisper', traits: ['unsettling', 'knowing'], voice: 'hushed warning' },
    memoryRules: ['horror_crest', 'midnight_lantern'],
    relationshipCurve: { trustPerVisit: 3, betrayalPenalty: 18 },
    storyArcIds: ['horror-crest-arc', 'black-lantern-arc'],
    bossReactions: {
      'black-lantern': 'The lantern hunts those who fear the dark. Do you?',
    },
    creatorWorldReactions: {
      'horror-crest': 'The Crest world breathes when explorers return.',
    },
    questHooks: [
      { type: QUEST_HOOK_TYPES.COMPLETE_ADVENTURE, target: 'any-horror', label: 'Complete any Horror Crest adventure.', reward: { trust: 12, craftingMaterial: 'fog_essence' } },
      { type: QUEST_HOOK_TYPES.FOLLOW_CREATOR, target: 'horror-crest', label: 'Follow the Horror Crest creator.', reward: { trust: 5, xp: 30 } },
    ],
  },
  {
    id: 'market-trader',
    name: 'Market Trader',
    role: 'Downtown Merchant',
    avatar: '🏪',
    personality: { tone: 'skeptical', traits: ['shrewd', 'observant'], voice: 'market banter' },
    memoryRules: ['market_sale', 'trade_reputation'],
    relationshipCurve: { trustPerVisit: 2, betrayalPenalty: 6 },
    storyArcIds: ['parsons-heritage-arc'],
    marketReactions: {
      'black-lantern-relic': 'I heard someone bought a Black Lantern Relic.',
      'phoenix-feather': 'Phoenix Feathers rarely surface. Bring me one if you find it.',
      'crystal-shard': 'Crystal Shards are moving fast this week.',
    },
    questHooks: [
      { type: QUEST_HOOK_TYPES.TRADE_ITEM, target: 'crystal-shard', label: 'Trade a Crystal Shard at the downtown market.', reward: { trust: 6, coins: 35 } },
      { type: QUEST_HOOK_TYPES.CRAFT_ITEM, target: 'fog-lens', label: 'Craft a Fog Lens for my traveling stock.', reward: { trust: 8, marketToken: 1 } },
    ],
  },
  {
    id: 'chapel-keeper',
    name: 'Chapel Keeper',
    role: 'Sanctuary Warden',
    avatar: '🕯️',
    personality: { tone: 'mysterious', traits: ['devoted', 'secretive'], voice: 'candlelit murmur' },
    memoryRules: ['sanctuary_boss', 'chapel_key'],
    relationshipCurve: { trustPerVisit: 5, betrayalPenalty: 14 },
    storyArcIds: ['horror-crest-arc', 'river-sentinel-arc'],
    bossReactions: {
      'river-sentinel': 'The Sentinel stirs where waters bend. The sanctuary holds a clue.',
      'black-lantern': 'Do not bring that lantern inside these walls.',
    },
    questHooks: [
      { type: QUEST_HOOK_TYPES.DEFEAT_BOSS, target: 'river-sentinel', label: 'Face the River Sentinel when the moon is full.', reward: { trust: 15, lorePage: 'sanctuary-clue' } },
      { type: QUEST_HOOK_TYPES.FIND_RELIC, target: 'ancient-key-vault', label: 'Bring me an Ancient Vault Key.', reward: { trust: 10, xp: 80 } },
    ],
  },
];

const FORBIDDEN_PROMPT_TOPICS = [
  'private player data',
  'real person impersonation',
  'explicit sexual content',
  'harmful instructions',
  'creator override lore',
];

export const DEFAULT_AI_NPC = {
  npcMemory: {},
  questOffers: {},
  timelineFeed: [],
  promptPreviewEnabled: false,
};

function clamp(v, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(v) || 0));
}

function resolveNpcId(npcId) {
  return NPC_ID_ALIASES[npcId] || npcId;
}

export function normalizeAiNpc(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_AI_NPC };
  return {
    npcMemory: raw.npcMemory && typeof raw.npcMemory === 'object' ? raw.npcMemory : {},
    questOffers: raw.questOffers && typeof raw.questOffers === 'object' ? raw.questOffers : {},
    timelineFeed: Array.isArray(raw.timelineFeed) ? raw.timelineFeed.slice(0, AI_NPC_LIMITS.MAX_TIMELINE) : [],
    promptPreviewEnabled: Boolean(raw.promptPreviewEnabled),
  };
}

export function getAiNpcProfile(npcId) {
  const id = resolveNpcId(npcId);
  return AI_NPC_PROFILES.find((p) => p.id === id) || null;
}

export function mergeNpcWithProfile(npc) {
  if (!npc) return null;
  const profile = getAiNpcProfile(npc.id);
  if (!profile) return npc;
  return {
    ...profile,
    ...npc,
    id: npc.id,
    name: npc.name || profile.name,
    role: npc.role || profile.role,
    avatar: npc.avatar || profile.avatar,
    personality: profile.personality,
    storyArcIds: profile.storyArcIds,
  };
}

export function defaultNpcMemory(npcId, playerId = 'local') {
  return {
    npcId: resolveNpcId(npcId),
    playerId,
    trust: 50,
    fear: 10,
    respect: 30,
    curiosity: 40,
    friendship: 20,
    rivalry: 0,
    memoryFlags: [],
    lastSeen: null,
    encounters: [],
    completedQuests: [],
    betrayals: 0,
    helpedPlayer: 0,
    worldEventReactions: {},
    marketReactions: {},
    bossReactions: {},
    creatorWorldReactions: {},
  };
}

export function normalizeNpcMemory(raw = {}, npcId) {
  const base = defaultNpcMemory(npcId);
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    npcId: resolveNpcId(npcId),
    trust: clamp(raw.trust ?? base.trust),
    fear: clamp(raw.fear ?? base.fear),
    respect: clamp(raw.respect ?? base.respect),
    curiosity: clamp(raw.curiosity ?? base.curiosity),
    friendship: clamp(raw.friendship ?? base.friendship),
    rivalry: clamp(raw.rivalry ?? base.rivalry),
    memoryFlags: Array.isArray(raw.memoryFlags) ? raw.memoryFlags.slice(0, AI_NPC_LIMITS.MAX_MEMORY_FLAGS) : [],
    encounters: Array.isArray(raw.encounters) ? raw.encounters.slice(0, AI_NPC_LIMITS.MAX_ENCOUNTERS) : [],
    completedQuests: Array.isArray(raw.completedQuests) ? raw.completedQuests : [],
    betrayals: Math.max(0, Number(raw.betrayals) || 0),
    helpedPlayer: Math.max(0, Number(raw.helpedPlayer) || 0),
    worldEventReactions: raw.worldEventReactions && typeof raw.worldEventReactions === 'object' ? raw.worldEventReactions : {},
    marketReactions: raw.marketReactions && typeof raw.marketReactions === 'object' ? raw.marketReactions : {},
    bossReactions: raw.bossReactions && typeof raw.bossReactions === 'object' ? raw.bossReactions : {},
    creatorWorldReactions:
      raw.creatorWorldReactions && typeof raw.creatorWorldReactions === 'object' ? raw.creatorWorldReactions : {},
  };
}

export function getNpcMemoryRecord(state, npcId) {
  const aiNpc = normalizeAiNpc(state?.aiNpc);
  const id = resolveNpcId(npcId);
  return normalizeNpcMemory(aiNpc.npcMemory[id], id);
}

function relationshipScore(memory) {
  const m = normalizeNpcMemory(memory);
  return (
    m.trust * 0.35 +
    m.friendship * 0.25 +
    m.respect * 0.2 +
    m.curiosity * 0.1 -
    m.fear * 0.15 -
    m.rivalry * 0.25 -
    m.betrayals * 8
  );
}

export function getNpcRelationshipLabel(memoryOrTrust) {
  if (typeof memoryOrTrust === 'number') {
    const t = clamp(memoryOrTrust);
    if (t >= 92) return RELATIONSHIP_LABELS.legendary_bond;
    if (t >= 78) return RELATIONSHIP_LABELS.mentor;
    if (t >= 65) return RELATIONSHIP_LABELS.ally;
    if (t >= 52) return RELATIONSHIP_LABELS.trusted;
    if (t >= 38) return RELATIONSHIP_LABELS.acquaintance;
    if (t >= 22) return RELATIONSHIP_LABELS.wary;
    return RELATIONSHIP_LABELS.stranger;
  }
  const memory = normalizeNpcMemory(memoryOrTrust);
  const score = relationshipScore(memory);
  if (memory.betrayals >= 2 && memory.fear >= 60) return RELATIONSHIP_LABELS.haunted;
  if (memory.rivalry >= 55) return RELATIONSHIP_LABELS.rival;
  if (score >= 85) return RELATIONSHIP_LABELS.legendary_bond;
  if (score >= 72 && memory.respect >= 60) return RELATIONSHIP_LABELS.mentor;
  if (score >= 58) return RELATIONSHIP_LABELS.ally;
  if (score >= 45) return RELATIONSHIP_LABELS.trusted;
  if (score >= 30) return RELATIONSHIP_LABELS.acquaintance;
  if (score >= 15 || memory.fear >= 45) return RELATIONSHIP_LABELS.wary;
  return RELATIONSHIP_LABELS.stranger;
}

function buildNpcContext(state, adventures = [], options = {}) {
  const now = options.now || safeGetTime();
  const progression = getPlayerProgressionSnapshot(state, adventures);
  const codex = getCodexSnapshot(state, adventures);
  const legendaryHunt = getLegendaryHuntSnapshot(state, adventures, { now });
  const marketplace = getMarketplaceSnapshot(state, adventures, { now });
  const creatorEconomy = getCreatorEconomySnapshot(state, adventures, { now });
  const eventContext = safeGetWorldEventContext(state, adventures);
  const season = getCurrentSeason(now);
  const livingRecord = options.npcId ? getNpcProgressRecord(state, options.npcId) : null;
  const memory = options.npcId ? getNpcMemoryRecord(state, options.npcId) : null;

  const activeBoss = (legendaryHunt.activeBosses || []).find((b) => b.status === BOSS_STATUS.ACTIVE);
  const recentMarket = (marketplace.activityFeed || [])[0];
  const revealedFog = state?.mapExploration?.revealed?.length || 0;

  return {
    now,
    playerLevel: progression.explorerLevel,
    cityReputation: progression.cityReputation?.score || 0,
    guildReputation: progression.guildReputation?.score || 0,
    guildName: progression.guildReputation?.guildName || null,
    creatorReputations: progression.creatorReputations || [],
    completedAdventures: progression.stats?.completedHunts || 0,
    codexEntries: codex.stats?.unlockedTotal || 0,
    marketplaceActivity: recentMarket?.text || null,
    bossActive: activeBoss ? activeBoss.bossId : null,
    bossName: activeBoss?.name || null,
    season: season?.id || null,
    seasonLabel: season?.label || null,
    isNight: isNightTime(now),
    activeEvents: eventContext?.activeEvents || [],
    revealedFog,
    branchPath: livingRecord?.lastPathId || null,
    trust: memory?.trust ?? livingRecord?.trust ?? 50,
    memoryFlags: memory?.memoryFlags || livingRecord?.memoryFlags || [],
    relationship: memory ? getNpcRelationshipLabel(memory) : getNpcRelationshipLabel(livingRecord?.trust ?? 50),
    followedCreators: creatorEconomy.followedCreatorIds || [],
    adventure: options.adventure || null,
    progress: options.progress || null,
  };
}

const DIALOGUE_TEMPLATES = {
  lowTrust: 'I do not know if I should tell you this.',
  highTrust: "You've earned the truth.",
  bossActive: (name) => `${name} is awake again.`,
  marketReaction: (text) => text,
  cityReputation: (pct) => `Parsons knows your name now — ${pct}% of the city has seen your trail.`,
  guildReputation: (name) => `Your guild, ${name}, speaks well of you.`,
  returnVisitor: (name) => `${name} remembers your last visit.`,
  codexScholar: 'Your codex grows. Scholars notice.',
  seasonGreeting: (label) => `The ${label} season changes what I share.`,
  nightWarning: 'Night falls. Watch the rails.',
};

function pickDialogueModifiers(context, profile) {
  const lines = [];
  if (context.trust < 35) lines.push(DIALOGUE_TEMPLATES.lowTrust);
  if (context.trust >= 75) lines.push(DIALOGUE_TEMPLATES.highTrust);
  if (context.bossActive && profile?.bossReactions?.[context.bossActive]) {
    lines.push(profile.bossReactions[context.bossActive]);
  } else if (context.bossName) {
    lines.push(DIALOGUE_TEMPLATES.bossActive(context.bossName));
  }
  if (context.marketplaceActivity && profile?.marketReactions) {
    for (const [itemId, reaction] of Object.entries(profile.marketReactions)) {
      if (context.marketplaceActivity.toLowerCase().includes(itemId.replace(/-/g, ' ').split(' ')[0])) {
        lines.push(reaction);
        break;
      }
    }
  }
  if (context.cityReputation >= 40) {
    lines.push(DIALOGUE_TEMPLATES.cityReputation(context.cityReputation));
  }
  if (context.guildReputation >= 30 && context.guildName) {
    lines.push(DIALOGUE_TEMPLATES.guildReputation(context.guildName));
  }
  if (context.codexEntries >= 10) lines.push(DIALOGUE_TEMPLATES.codexScholar);
  if (context.seasonLabel) lines.push(DIALOGUE_TEMPLATES.seasonGreeting(context.seasonLabel));
  if (context.isNight) lines.push(DIALOGUE_TEMPLATES.nightWarning);
  if (profile?.creatorWorldReactions) {
    for (const [creatorId, reaction] of Object.entries(profile.creatorWorldReactions)) {
      if (context.followedCreators?.includes(creatorId)) {
        lines.push(reaction);
        break;
      }
    }
  }
  if (context.trust >= 55 && profile?.bossReactions && context.bossActive) {
    const hint = profile.bossReactions[context.bossActive];
    if (hint && !lines.includes(hint)) lines.push(hint);
  }
  return lines;
}

function progressionGuildName(context) {
  return context.guildName || 'your explorers';
}

export function generateNpcDialogue(npc, state, adventures = [], options = {}) {
  const merged = mergeNpcWithProfile(npc);
  if (!merged) return { text: '', mood: 'guide', modifiers: [] };

  const context = buildNpcContext(state, adventures, {
    ...options,
    npcId: merged.id,
    adventure: options.adventure,
  });
  context.guildName = getPlayerProgressionSnapshot(state, adventures).guildReputation?.guildName;

  const baseText = options.baseText || merged.dialogues?.[0]?.text || `I am ${merged.name}. The trail remembers.`;
  const modifiers = pickDialogueModifiers(context, merged);
  const memoryLine = context.memoryFlags.length
    ? `I still recall: ${context.memoryFlags.slice(-1)[0].replace(/_/g, ' ')}.`
    : null;

  let text = baseText;
  if (modifiers.length) text = `${modifiers[0]} ${text}`;
  if (memoryLine && context.trust >= 45) text = `${memoryLine} ${text}`;

  const mood =
    context.trust < 30 ? 'warning' : context.bossActive ? 'mysterious' : merged.dialogues?.[0]?.mood || 'guide';

  return {
    text: text.trim(),
    mood,
    modifiers,
    relationship: context.relationship,
    trust: context.trust,
    context,
  };
}

export function generateNpcQuestHook(npc, state, adventures = [], options = {}) {
  const merged = mergeNpcWithProfile(npc);
  if (!merged?.questHooks?.length) return null;

  const memory = getNpcMemoryRecord(state, merged.id);
  const context = buildNpcContext(state, adventures, { npcId: merged.id, ...options });

  const available = merged.questHooks.filter((hook) => {
    const key = `${hook.type}:${hook.target}`;
    return !memory.completedQuests.includes(key);
  });
  if (!available.length) return null;

  const trustIndex = Math.min(
    available.length - 1,
    Math.floor(context.trust / 30) + (context.completedAdventures > 3 ? 1 : 0)
  );
  const hook = available[trustIndex] || available[0];

  return {
    id: `quest-${merged.id}-${hook.type}-${hook.target}`,
    npcId: merged.id,
    type: hook.type,
    target: hook.target,
    label: hook.label,
    reward: hook.reward || { trust: 5 },
    relationshipRequired: context.trust >= 25 ? 'acquaintance' : 'stranger',
  };
}

function pushTimelineEntry(aiNpc, entry) {
  const feed = [{ ...entry, at: entry.at || new Date().toISOString() }, ...aiNpc.timelineFeed].slice(
    0,
    AI_NPC_LIMITS.MAX_TIMELINE
  );
  return { ...aiNpc, timelineFeed: feed };
}

export function recordNpcEncounter(state, npcId, context = {}) {
  const id = resolveNpcId(npcId);
  const aiNpc = normalizeAiNpc(state?.aiNpc);
  const memory = getNpcMemoryRecord(state, id);
  const profile = getAiNpcProfile(id);
  const now = new Date().toISOString();

  const encounter = {
    at: now,
    adventureId: context.adventureId || null,
    dialogueId: context.dialogueId || null,
    location: context.location || null,
  };

  const nextMemory = normalizeNpcMemory(
    {
      ...memory,
      lastSeen: now,
      encounters: [encounter, ...memory.encounters].slice(0, AI_NPC_LIMITS.MAX_ENCOUNTERS),
      trust: clamp(memory.trust + (profile?.relationshipCurve?.trustPerVisit || 2)),
      curiosity: clamp(memory.curiosity + 3),
    },
    id
  );

  let nextAiNpc = {
    ...aiNpc,
    npcMemory: { ...aiNpc.npcMemory, [id]: nextMemory },
  };

  const profileName = profile?.name || id;
  nextAiNpc = pushTimelineEntry(nextAiNpc, {
    id: `npc-enc-${id}-${Date.now()}`,
    kind: 'npc',
    icon: profile?.avatar || '👤',
    text: `${profileName} is looking for someone${context.location ? ` near ${context.location}` : ' on the trail'}.`,
    minutesAgo: 0,
    npcId: id,
  });

  let next = {
    ...state,
    aiNpc: nextAiNpc,
  };

  if (context.dialogueId) {
    next = recordNpcDialogueSeen(next, npcId, context.dialogueId, context.adventureId);
  }

  return next;
}

export function recordNpcChoice(state, npcId, dialogueId, choice, adventureId, progress) {
  let next = recordLivingNpcChoice(state, npcId, dialogueId, choice, adventureId, progress);
  const id = resolveNpcId(npcId);
  const aiNpc = normalizeAiNpc(next.aiNpc);
  const memory = getNpcMemoryRecord(next, id);
  const effects = choice?.effects || {};

  let trust = memory.trust;
  let fear = memory.fear;
  let respect = memory.respect;
  let friendship = memory.friendship;
  let rivalry = memory.rivalry;
  let betrayals = memory.betrayals;
  let helpedPlayer = memory.helpedPlayer;
  const memoryFlags = [...memory.memoryFlags];

  if (effects.trust != null) trust = clamp(trust + Number(effects.trust));
  if (effects.fear != null) fear = clamp(fear + Number(effects.fear));
  if (effects.respect != null) respect = clamp(respect + Number(effects.respect));
  if (effects.friendship != null) friendship = clamp(friendship + Number(effects.friendship));
  if (effects.rivalry != null) rivalry = clamp(rivalry + Number(effects.rivalry));
  if (effects.betrayal) betrayals += 1;
  if (effects.helped) helpedPlayer += 1;
  if (effects.memoryKey && !memoryFlags.includes(effects.memoryKey)) {
    memoryFlags.push(effects.memoryKey);
  }

  const nextMemory = normalizeNpcMemory(
    {
      ...memory,
      trust,
      fear,
      respect,
      friendship,
      rivalry,
      betrayals,
      helpedPlayer,
      memoryFlags,
      lastSeen: new Date().toISOString(),
    },
    id
  );

  return {
    ...next,
    aiNpc: {
      ...aiNpc,
      npcMemory: { ...aiNpc.npcMemory, [id]: nextMemory },
    },
  };
}

export function recordNpcMemory(state, npcId, memoryKey, data = {}) {
  const id = resolveNpcId(npcId);
  const aiNpc = normalizeAiNpc(state?.aiNpc);
  const memory = getNpcMemoryRecord(state, id);
  const memoryFlags = [...memory.memoryFlags];
  if (memoryKey && !memoryFlags.includes(memoryKey)) memoryFlags.push(memoryKey);

  const bucket = data.bucket || 'worldEventReactions';
  const reactions = { ...memory[bucket], [memoryKey]: data.note || memoryKey };

  return {
    ...state,
    aiNpc: {
      ...aiNpc,
      npcMemory: {
        ...aiNpc.npcMemory,
        [id]: normalizeNpcMemory({ ...memory, memoryFlags, [bucket]: reactions }, id),
      },
    },
  };
}

export function recordAiNpcVictory(state, adventure) {
  if (!adventure?.id) return state;
  const npcs = adventure.worldConfig?.npcs || [];
  const seedNpcs = SEED_NPCS.filter((n) => n.adventureIds?.includes(adventure.id));
  const allNpcs = [...npcs, ...seedNpcs];
  if (!allNpcs.length) return state;

  let next = state;
  for (const npc of allNpcs) {
    const profile = getAiNpcProfile(npc.id);
    const id = resolveNpcId(npc.id);
    next = recordNpcMemory(next, id, `completed_${adventure.id}`, {
      note: `Completed ${adventure.title}`,
      bucket: 'worldEventReactions',
    });
    if (profile) {
      const memory = getNpcMemoryRecord(next, id);
      next = {
        ...next,
        aiNpc: {
          ...normalizeAiNpc(next.aiNpc),
          npcMemory: {
            ...normalizeAiNpc(next.aiNpc).npcMemory,
            [id]: normalizeNpcMemory(
              {
                ...memory,
                trust: clamp(memory.trust + 8),
                respect: clamp(memory.respect + 5),
                friendship: clamp(memory.friendship + 4),
              },
              id
            ),
          },
        },
      };
    }
  }
  return next;
}

export function buildNpcPromptPayload({ npc, player, world, adventure, history, constraints = {} }) {
  const merged = mergeNpcWithProfile(npc);
  const safePlayer = {
    level: player?.level || 1,
    reputationTier: player?.reputationTier || 'stranger',
    completedAdventures: player?.completedAdventures || 0,
    codexEntries: player?.codexEntries || 0,
  };

  return {
    version: '1.0',
    npc: {
      id: merged?.id,
      name: merged?.name,
      role: merged?.role,
      personality: merged?.personality || {},
      canonicalLore: merged?.memoryRules || [],
    },
    relationship: history?.relationship || RELATIONSHIP_LABELS.stranger,
    trust: history?.trust ?? 50,
    memoryFlags: (history?.memoryFlags || []).slice(0, 10),
    player: safePlayer,
    world: {
      season: world?.season || null,
      bossActive: world?.bossActive || null,
      activeEvents: (world?.activeEvents || []).map((e) => e.id).slice(0, 5),
      marketplacePulse: world?.marketplaceActivity || null,
    },
    adventure: adventure
      ? { id: adventure.id, title: adventure.title, tags: adventure.tags || [] }
      : null,
    storyArc: constraints.storyArc || null,
    allowedTone: constraints.allowedTone || merged?.personality?.tone || 'guide',
    forbiddenContent: [...FORBIDDEN_PROMPT_TOPICS, ...(constraints.forbidden || [])],
    dialogueLength: constraints.dialogueLength || 'short',
    questOptions: (merged?.questHooks || []).slice(0, 3).map((q) => q.label),
    guardrails: {
      noPrivateData: true,
      noRealPersonImpersonation: true,
      respectCanonicalLore: true,
      deterministicFallback: true,
    },
  };
}

export function buildNpcTimelineFeed(state, adventures = [], options = {}) {
  const aiNpc = normalizeAiNpc(state?.aiNpc);
  const now = options.now || safeGetTime();
  const legendaryHunt = getLegendaryHuntSnapshot(state, adventures, { now });
  const entries = [...aiNpc.timelineFeed];

  for (const profile of AI_NPC_PROFILES) {
    const memory = getNpcMemoryRecord(state, profile.id);
    if (!memory.lastSeen && memory.encounters.length === 0) continue;

    const activeBoss = (legendaryHunt.activeBosses || []).find((b) => b.status === BOSS_STATUS.ACTIVE);
    if (activeBoss && profile.bossReactions?.[activeBoss.bossId]) {
      entries.push({
        id: `npc-boss-${profile.id}-${activeBoss.bossId}`,
        kind: 'npc',
        icon: profile.avatar,
        text: profile.bossReactions[activeBoss.bossId],
        minutesAgo: 3,
        npcId: profile.id,
      });
    }
  }

  return entries
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
    .slice(0, AI_NPC_LIMITS.MAX_TIMELINE);
}

export function getAiNpcSnapshot(state, adventures = [], options = {}) {
  const aiNpc = normalizeAiNpc(state?.aiNpc);
  const now = options.now || safeGetTime();
  const context = buildNpcContext(state, adventures, { now });

  const profiles = AI_NPC_PROFILES.map((profile) => {
    const memory = getNpcMemoryRecord(state, profile.id);
    const living = getNpcProgressRecord(state, profile.id);
    const mergedTrust = Math.round((memory.trust + (living.trust || 50)) / 2);
    return {
      ...profile,
      memory,
      relationship: getNpcRelationshipLabel(memory),
      trust: mergedTrust,
      met: Boolean(memory.lastSeen || living.visitCount > 0),
      dialogue: generateNpcDialogue(profile, state, adventures, { now }),
      questHook: generateNpcQuestHook(profile, state, adventures, { now }),
    };
  });

  return wrapEngineSnapshot({
    profiles,
    npcMemory: aiNpc.npcMemory,
    questOffers: aiNpc.questOffers,
    timelineFeed: buildNpcTimelineFeed(state, adventures, { now }),
    context,
    promptPreviewEnabled: aiNpc.promptPreviewEnabled,
  });
}

export const AI_NPC_ENGINE = {
  version: '1.0',
  label: 'AI NPC Memory Engine',
};
