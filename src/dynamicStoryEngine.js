/**
 * Questory 2.0 — Phase 14: Dynamic Story Engine
 * Story arcs, beats, world-event reactions, player-specific callbacks.
 */
import { getNpcMemoryRecord, getAiNpcProfile, AI_NPC_PROFILES } from './aiNpcEngine';
import { getLegendaryHuntSnapshot, BOSS_STATUS } from './legendaryHuntEngine';
import { getCodexSnapshot } from './codexEngine';
import { getPlayerProgressionSnapshot } from './playerProgressionEngine';
import { safeGetTime } from './dateUtils';

export const STORY_ARC_STATUS = {
  LOCKED: 'Locked',
  AVAILABLE: 'Available',
  IN_PROGRESS: 'In Progress',
  REVEALED: 'Revealed',
  COMPLETED: 'Completed',
  EPILOGUE: 'Epilogue',
};

export const STORY_ARCS = [
  {
    arcId: 'black-lantern-arc',
    title: 'Black Lantern Arc',
    npcIds: ['groundskeeper', 'iron-conductor', 'horror-crest-guide'],
    chapters: [
      { id: 'ch1', title: 'First Flicker', body: 'A purple flame appears downtown. The Groundskeeper warns you away.' },
      { id: 'ch2', title: 'Rails Remember', body: 'The Iron Conductor speaks of a lantern that hunts explorers.' },
      { id: 'ch3', title: 'The Hunt Begins', body: 'Fog thickens. The Black Lantern arc opens.' },
      { id: 'epilogue', title: 'Ember Aftermath', body: 'The lantern sleeps — for now.' },
    ],
    requiredDiscoveries: ['depot-lantern', 'black-lantern-whisper'],
    requiredBosses: ['black-lantern'],
    requiredNpcTrust: { groundskeeper: 40, 'iron-conductor': 35 },
    unlockedLore: ['lantern-origin', 'conductor-oath'],
  },
  {
    arcId: 'iron-conductor-arc',
    title: 'Iron Conductor Arc',
    npcIds: ['iron-conductor', 'marcus', 'groundskeeper'],
    chapters: [
      { id: 'ch1', title: 'Platform Whistle', body: 'Steam rises at Union Depot. A phantom conductor counts souls.' },
      { id: 'ch2', title: 'Family Rails', body: 'Marcus recalls stories his grandfather told on these tracks.' },
      { id: 'ch3', title: 'Tribute Walk', body: 'Complete rail hunts to appease the Conductor.' },
      { id: 'epilogue', title: 'Last Departure', body: 'The whistle fades until the rails call again.' },
    ],
    requiredDiscoveries: ['rail-spike'],
    requiredBosses: ['iron-conductor'],
    requiredNpcTrust: { 'iron-conductor': 45 },
    unlockedLore: ['rail-ghost', 'depot-clock'],
  },
  {
    arcId: 'river-sentinel-arc',
    title: 'River Sentinel Arc',
    npcIds: ['chapel-keeper', 'pastor-grace'],
    chapters: [
      { id: 'ch1', title: 'Bend in the Neosho', body: 'Waters rise. The Chapel Keeper guards an old clue.' },
      { id: 'ch2', title: 'Sanctuary Warning', body: 'Pastor Grace prays for those who face the Sentinel.' },
      { id: 'ch3', title: 'Moonlit Crossing', body: 'The Sentinel rises when the moon is full.' },
      { id: 'epilogue', title: 'Still Waters', body: 'The river settles. The arc rests.' },
    ],
    requiredDiscoveries: ['river-bend'],
    requiredBosses: ['river-sentinel'],
    requiredNpcTrust: { 'chapel-keeper': 50 },
    unlockedLore: ['sentinel-pearl', 'neosho-bend'],
  },
  {
    arcId: 'founder-trail-arc',
    title: 'Founder Trail Arc',
    npcIds: ['marcus', 'groundskeeper', 'parsons-historian'],
    chapters: [
      { id: 'ch1', title: 'Founders Walk', body: 'Parsons founders left markers only patient explorers find.' },
      { id: 'ch2', title: 'Ledger Echo', body: 'The Historian cross-references your codex with city records.' },
      { id: 'ch3', title: 'Trail Crown', body: 'Complete founder hunts to seal the arc.' },
      { id: 'epilogue', title: 'Names Carved', body: 'Your name joins the founder trail.' },
    ],
    requiredDiscoveries: [],
    requiredBosses: [],
    requiredNpcTrust: { 'parsons-historian': 40, marcus: 35 },
    unlockedLore: ['founder-markers', 'parsons-ledger'],
  },
  {
    arcId: 'horror-crest-arc',
    title: 'Horror Crest Arc',
    npcIds: ['horror-crest-guide', 'pastor-grace', 'chapel-keeper'],
    chapters: [
      { id: 'ch1', title: 'Crest Whispers', body: 'The Horror Crest Guide opens a darker collection.' },
      { id: 'ch2', title: 'Sanctuary Line', body: 'Grace and the Keeper disagree on how far to follow the Crest.' },
      { id: 'ch3', title: 'Midnight Hunt', body: 'Complete horror adventures before the lantern returns.' },
      { id: 'epilogue', title: 'Crest Sealed', body: 'The Crest sleeps until next season.' },
    ],
    requiredDiscoveries: ['midnight-lantern'],
    requiredBosses: [],
    requiredNpcTrust: { 'horror-crest-guide': 45 },
    unlockedLore: ['crest-oath', 'midnight-rule'],
  },
  {
    arcId: 'parsons-heritage-arc',
    title: 'Parsons Heritage Arc',
    npcIds: ['parsons-historian', 'pastor-grace', 'market-trader'],
    chapters: [
      { id: 'ch1', title: 'City Ledger', body: 'Parsons remembers every explorer who maps its streets.' },
      { id: 'ch2', title: 'Market Tales', body: 'The Trader shares rumors the Historian verifies.' },
      { id: 'ch3', title: 'Heritage Crown', body: 'City reputation unlocks the heritage finale.' },
      { id: 'epilogue', title: 'Keeper Title', body: 'Parsons claims you as a heritage keeper.' },
    ],
    requiredDiscoveries: [],
    requiredBosses: [],
    requiredNpcTrust: { 'parsons-historian': 50, 'pastor-grace': 40 },
    unlockedLore: ['parsons-heritage', 'city-ledger'],
  },
];

export const DEFAULT_DYNAMIC_STORY = {
  arcs: {},
  beatsSeen: [],
  lastSummaryAt: null,
};

function arcProgressKey(arcId) {
  return arcId;
}

export function normalizeDynamicStory(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_DYNAMIC_STORY };
  return {
    arcs: raw.arcs && typeof raw.arcs === 'object' ? raw.arcs : {},
    beatsSeen: Array.isArray(raw.beatsSeen) ? raw.beatsSeen.slice(0, 80) : [],
    lastSummaryAt: raw.lastSummaryAt || null,
  };
}

function getArcProgress(state, arcId) {
  const stored = normalizeDynamicStory(state?.dynamicStory);
  const base = stored.arcs[arcId] || {
    arcId,
    currentChapter: 0,
    status: STORY_ARC_STATUS.LOCKED,
    beatsCompleted: [],
    unlockedLore: [],
  };
  return { ...base, arcId };
}

function discoveriesMet(state, required = []) {
  const found = new Set(state?.world?.discoveriesFound || []);
  return required.every((id) => found.has(id));
}

function bossesMet(state, adventures, required = [], now) {
  if (!required.length) return true;
  const hunt = getLegendaryHuntSnapshot(state, adventures, { now });
  const defeated = new Set(hunt.defeatedBossIds || state?.legendaryHunt?.defeatedBossIds || []);
  return required.some((id) => defeated.has(id));
}

function npcTrustMet(state, required = {}) {
  return Object.entries(required).every(([npcId, minTrust]) => {
    const memory = getNpcMemoryRecord(state, npcId);
    return memory.trust >= minTrust;
  });
}

function resolveArcStatus(arc, progress, state, adventures, now) {
  if (progress.status === STORY_ARC_STATUS.COMPLETED || progress.status === STORY_ARC_STATUS.EPILOGUE) {
    return progress.status;
  }

  const discoveriesOk = discoveriesMet(state, arc.requiredDiscoveries);
  const bossesOk = bossesMet(state, adventures, arc.requiredBosses, now);
  const trustOk = npcTrustMet(state, arc.requiredNpcTrust);

  if (progress.currentChapter >= arc.chapters.length) {
    return bossesOk ? STORY_ARC_STATUS.EPILOGUE : STORY_ARC_STATUS.COMPLETED;
  }

  if (progress.currentChapter > 0) return STORY_ARC_STATUS.IN_PROGRESS;

  if (discoveriesOk || trustOk || bossesOk) return STORY_ARC_STATUS.AVAILABLE;

  const progression = getPlayerProgressionSnapshot(state, adventures);
  if (progression.stats?.completedHunts >= 2) return STORY_ARC_STATUS.AVAILABLE;

  return STORY_ARC_STATUS.LOCKED;
}

export function getStoryArcProgress(state, arcId, adventures = [], options = {}) {
  const arc = STORY_ARCS.find((a) => a.arcId === arcId);
  if (!arc) return null;
  const progress = getArcProgress(state, arcId);
  const now = options.now || safeGetTime();
  const status = resolveArcStatus(arc, progress, state, adventures, now);
  const chapter = arc.chapters[Math.min(progress.currentChapter, arc.chapters.length - 1)];

  return {
    ...progress,
    title: arc.title,
    status,
    chapter,
    chaptersTotal: arc.chapters.length,
    pct: Math.round((progress.currentChapter / arc.chapters.length) * 100),
    npcIds: arc.npcIds,
    unlockedLore: [...new Set([...(progress.unlockedLore || []), ...arc.unlockedLore])],
  };
}

export function advanceStoryArc(state, arcId, options = {}) {
  const arc = STORY_ARCS.find((a) => a.arcId === arcId);
  if (!arc) return state;

  const stored = normalizeDynamicStory(state?.dynamicStory);
  const progress = getArcProgress(state, arcId);
  const nextChapter = Math.min(progress.currentChapter + 1, arc.chapters.length);
  const chapter = arc.chapters[nextChapter - 1];

  const beatsCompleted = chapter
    ? [...new Set([...(progress.beatsCompleted || []), chapter.id])]
    : progress.beatsCompleted || [];

  const status =
    nextChapter >= arc.chapters.length ? STORY_ARC_STATUS.COMPLETED : STORY_ARC_STATUS.IN_PROGRESS;

  return {
    ...state,
    dynamicStory: {
      ...stored,
      arcs: {
        ...stored.arcs,
        [arcId]: {
          ...progress,
          currentChapter: nextChapter,
          status,
          beatsCompleted,
          unlockedLore: [...new Set([...(progress.unlockedLore || []), ...(chapter ? arc.unlockedLore : [])])],
          advancedAt: new Date().toISOString(),
        },
      },
    },
  };
}

export function recordStoryBeat(state, beatId, context = {}) {
  const stored = normalizeDynamicStory(state?.dynamicStory);
  const beatsSeen = stored.beatsSeen.includes(beatId)
    ? stored.beatsSeen
    : [...stored.beatsSeen, beatId];

  let next = {
    ...state,
    dynamicStory: { ...stored, beatsSeen },
  };

  if (context.arcId) {
    next = advanceStoryArc(next, context.arcId, context);
  }

  return next;
}

export function resolveStoryBeatForAdventure(state, adventure, options = {}) {
  if (!adventure?.id) return state;
  const tags = adventure.tags || [];
  const collectionId = adventure.collectionId || '';
  let next = state;

  for (const arc of STORY_ARCS) {
    const linked =
      tags.some((t) => arc.arcId.includes(t)) ||
      (arc.arcId === 'parsons-heritage-arc' && collectionId.includes('parsons')) ||
      (arc.arcId === 'horror-crest-arc' && (tags.includes('horror') || collectionId.includes('horror'))) ||
      (arc.arcId === 'iron-conductor-arc' && tags.includes('rail')) ||
      (arc.arcId === 'black-lantern-arc' && adventure.isLegendaryHunt);

    if (linked) {
      next = recordStoryBeat(next, `adventure-${adventure.id}`, { arcId: arc.arcId });
    }
  }

  return next;
}

export function generateStorySummary(state, adventures = [], options = {}) {
  const now = options.now || safeGetTime();
  const arcs = STORY_ARCS.map((arc) => getStoryArcProgress(state, arc.arcId, adventures, { now })).filter(Boolean);
  const active = arcs.filter(
    (a) => a.status === STORY_ARC_STATUS.IN_PROGRESS || a.status === STORY_ARC_STATUS.REVEALED
  );
  const completed = arcs.filter((a) => a.status === STORY_ARC_STATUS.COMPLETED || a.status === STORY_ARC_STATUS.EPILOGUE);

  const headline = active[0]
    ? `${active[0].title}: ${active[0].chapter?.title || 'In progress'}`
    : completed.length
      ? `${completed.length} story arcs completed`
      : 'Story arcs await your trail';

  return {
    headline,
    activeArcs: active,
    completedCount: completed.length,
    totalArcs: STORY_ARCS.length,
    generatedAt: now,
  };
}

export function getNpcStoryArcs(state, npcId, adventures = [], options = {}) {
  const profile = getAiNpcProfile(npcId);
  const arcIds = profile?.storyArcIds || [];
  return arcIds
    .map((id) => getStoryArcProgress(state, id, adventures, options))
    .filter(Boolean);
}

export function getDynamicStorySnapshot(state, adventures = [], options = {}) {
  const now = options.now || safeGetTime();
  const stored = normalizeDynamicStory(state?.dynamicStory);
  const arcs = STORY_ARCS.map((arc) => getStoryArcProgress(state, arc.arcId, adventures, { now }));
  const summary = generateStorySummary(state, adventures, { now });
  const legendaryHunt = getLegendaryHuntSnapshot(state, adventures, { now });
  const activeBoss = (legendaryHunt.activeBosses || []).find((b) => b.status === BOSS_STATUS.ACTIVE);

  const worldReactions = [];
  if (activeBoss) {
    for (const arc of STORY_ARCS) {
      if (arc.requiredBosses?.includes(activeBoss.bossId)) {
        worldReactions.push({
          id: `story-boss-${arc.arcId}`,
          arcId: arc.arcId,
          text: `${arc.title} reacts to ${activeBoss.name}.`,
        });
      }
    }
  }

  const npcStoryLinks = AI_NPC_PROFILES.map((profile) => ({
    npcId: profile.id,
    name: profile.name,
    arcs: getNpcStoryArcs(state, profile.id, adventures, { now }),
  }));

  return {
    arcs,
    summary,
    stored,
    worldReactions,
    npcStoryLinks,
    beatsSeen: stored.beatsSeen,
    timelineFeed: arcs
      .filter((a) => a.status === STORY_ARC_STATUS.IN_PROGRESS)
      .map((a) => ({
        id: `story-${a.arcId}`,
        kind: 'story',
        icon: '📖',
        text: `${a.title}: ${a.chapter?.title || 'Chapter open'}`,
        minutesAgo: 4,
      }))
      .slice(0, 6),
  };
}

export const DYNAMIC_STORY_ENGINE = {
  version: '1.0',
  label: 'Dynamic Story Engine',
};
