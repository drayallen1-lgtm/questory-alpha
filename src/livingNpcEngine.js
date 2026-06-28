/**
 * Sweep 17 — Living NPC Engine
 * Memory, trust, return-visitor lines, and choice-driven dialogue resolution.
 */
import { normalizeWorld } from './worldEngine';

export const NPC_MOODS = {
  GUIDE: 'guide',
  HINT: 'hint',
  WARNING: 'warning',
  MYSTERIOUS: 'mysterious',
  CELEBRATION: 'celebration',
  SKEPTICAL: 'skeptical',
  FRIENDLY: 'friendly',
};

export const NPC_MOOD_LABELS = {
  guide: 'Guide',
  hint: 'Hint',
  warning: 'Warning',
  mysterious: 'Mysterious',
  celebration: 'Celebration',
  skeptical: 'Skeptical',
  friendly: 'Friendly',
};

const MEMORY_CALLBACKS = {
  porch_seen: 'Still thinking about the porch?',
  swing_found: 'The swing keeps moving when you look away.',
  lantern_seen: 'The lantern has not stopped flickering.',
  trail_started: 'Good — you started the trail.',
  trusted_npc: 'You chose to trust me last time.',
  hints_given: 'I have more hints if you listen.',
  treasure_started: 'The treasure hunt is alive again.',
};

const RETURN_LINES = {
  ominous: "You're back. I warned you.",
  warm: "You're back! Ready for another trail?",
  whisper: "You're back... the whispers remember you.",
  teacher: 'Welcome back, scholar.',
  default: "You're back.",
};

function clampTrust(v) {
  return Math.min(100, Math.max(0, Number(v) || 50));
}

export function defaultNpcProgress() {
  return {
    seenDialogues: [],
    visitCount: 0,
    trust: 50,
    memoryFlags: [],
    choices: {},
    lastPathId: null,
    lastSeenAt: null,
    adventures: {},
  };
}

export function normalizeNpcProgress(raw = {}) {
  const base = defaultNpcProgress();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    seenDialogues: Array.isArray(raw.seenDialogues) ? raw.seenDialogues : [],
    memoryFlags: Array.isArray(raw.memoryFlags) ? raw.memoryFlags : [],
    choices: raw.choices && typeof raw.choices === 'object' ? raw.choices : {},
    adventures: raw.adventures && typeof raw.adventures === 'object' ? raw.adventures : {},
    trust: clampTrust(raw.trust ?? base.trust),
  };
}

export function getNpcProgressRecord(state, npcId) {
  const world = normalizeWorld(state?.world);
  return normalizeNpcProgress(world.npcProgress[npcId]);
}

function adventureBucket(record, adventureId) {
  if (!adventureId) return { visitCount: record.visitCount || 0, completed: false };
  return normalizeNpcProgress(record.adventures[adventureId] || {});
}

export function isReturnVisitor(state, npcId, adventureId) {
  const record = getNpcProgressRecord(state, npcId);
  const bucket = adventureBucket(record, adventureId);
  return (bucket.visitCount || 0) > 0 || (record.visitCount || 0) > 0;
}

function personalityTone(personality = '') {
  const p = String(personality).toLowerCase();
  if (p.includes('ominous') || p.includes('silent')) return 'ominous';
  if (p.includes('warm') || p.includes('playful') || p.includes('friendly')) return 'warm';
  if (p.includes('whisper') || p.includes('unsettling')) return 'whisper';
  if (p.includes('teacher') || p.includes('precise') || p.includes('curious')) return 'teacher';
  return 'default';
}

export function getReturnVisitorLine(npc, state, adventureId) {
  if (!isReturnVisitor(state, npc.id, adventureId)) return null;
  const tone = personalityTone(npc.personality);
  return RETURN_LINES[tone] || RETURN_LINES.default;
}

export function getMemoryCallbackLine(npc, state) {
  const record = getNpcProgressRecord(state, npc.id);
  for (const key of record.memoryFlags) {
    if (MEMORY_CALLBACKS[key]) return MEMORY_CALLBACKS[key];
  }
  for (const key of npc.memoryKeys || []) {
    if (record.memoryFlags.includes(key) && MEMORY_CALLBACKS[key]) {
      return MEMORY_CALLBACKS[key];
    }
  }
  return null;
}

export function getTrustLabel(trust) {
  const t = clampTrust(trust);
  if (t >= 75) return 'Trusting';
  if (t >= 55) return 'Curious';
  if (t >= 35) return 'Cautious';
  return 'Wary';
}

function applyChoiceEffects(record, effects = {}) {
  let trust = record.trust;
  if (effects.trust != null) trust = clampTrust(trust + Number(effects.trust));
  const memoryFlags = [...record.memoryFlags];
  if (effects.memoryKey && !memoryFlags.includes(effects.memoryKey)) {
    memoryFlags.push(effects.memoryKey);
  }
  return { trust, memoryFlags };
}

export function recordNpcDialogueSeen(state, npcId, dialogueId, adventureId) {
  const world = normalizeWorld(state.world);
  const record = normalizeNpcProgress(world.npcProgress[npcId]);
  const seen = record.seenDialogues.includes(dialogueId)
    ? record.seenDialogues
    : [...record.seenDialogues, dialogueId];

  const adventures = { ...record.adventures };
  if (adventureId) {
    const bucket = normalizeNpcProgress(adventures[adventureId]);
    adventures[adventureId] = {
      ...bucket,
      visitCount: (bucket.visitCount || 0) + 1,
      lastSeenAt: new Date().toISOString(),
    };
  }

  return {
    ...state,
    world: normalizeWorld({
      ...world,
      npcProgress: {
        ...world.npcProgress,
        [npcId]: {
          ...record,
          seenDialogues: seen,
          visitCount: (record.visitCount || 0) + 1,
          lastSeenAt: new Date().toISOString(),
          adventures,
        },
      },
    }),
  };
}

export function recordNpcChoice(state, npcId, dialogueId, choice, adventureId, progress) {
  const world = normalizeWorld(state.world);
  const record = normalizeNpcProgress(world.npcProgress[npcId]);
  const { trust, memoryFlags } = applyChoiceEffects(record, choice?.effects || {});

  return {
    ...state,
    world: normalizeWorld({
      ...world,
      npcProgress: {
        ...world.npcProgress,
        [npcId]: {
          ...record,
          trust,
          memoryFlags,
          choices: { ...record.choices, [dialogueId]: choice.id },
          lastPathId: progress?.pathId || record.lastPathId,
          lastSeenAt: new Date().toISOString(),
        },
      },
    }),
  };
}

export function recordLivingNpcVictory(state, adventure) {
  if (!adventure?.id) return state;
  const npcs = adventure.worldConfig?.npcs || [];
  if (!npcs.length) return state;

  let next = state;
  for (const npc of npcs) {
    const world = normalizeWorld(next.world);
    const record = normalizeNpcProgress(world.npcProgress[npc.id]);
    const memoryFlags = [...record.memoryFlags];
    for (const key of npc.memoryKeys || []) {
      if (!memoryFlags.includes(key)) memoryFlags.push(key);
    }
    if (!memoryFlags.includes(`completed_${adventure.id}`)) {
      memoryFlags.push(`completed_${adventure.id}`);
    }

    const adventures = {
      ...record.adventures,
      [adventure.id]: {
        ...normalizeNpcProgress(record.adventures[adventure.id]),
        completed: true,
        completedAt: new Date().toISOString(),
        visitCount: (record.adventures[adventure.id]?.visitCount || record.visitCount || 0) + 1,
      },
    };

    next = {
      ...next,
      world: normalizeWorld({
        ...world,
        npcProgress: {
          ...world.npcProgress,
          [npc.id]: {
            ...record,
            memoryFlags,
            adventures,
            trust: clampTrust(record.trust + 8),
          },
        },
      }),
    };
  }
  return next;
}

export function resolveLivingNpcPresentation({
  npc,
  dialogue,
  dialogueId,
  state,
  adventure,
  progress,
}) {
  if (!npc || !dialogue) return null;

  const record = getNpcProgressRecord(state, npc.id);
  const adventureId = adventure?.id;
  const greeting = getReturnVisitorLine(npc, state, adventureId);
  const memoryLine = getMemoryCallbackLine(npc, state);
  const chosenChoiceId = record.choices[dialogueId];
  const selectedChoice = (dialogue.choices || []).find((c) => c.id === chosenChoiceId);

  let text = dialogue.text;
  if (selectedChoice?.response) {
    text = selectedChoice.response;
  } else if (selectedChoice?.nextLine) {
    text = `${dialogue.text} ${selectedChoice.nextLine}`;
  }

  if (progress?.pathId && dialogue.pathFlavors?.[progress.pathId]) {
    text = `${text} ${dialogue.pathFlavors[progress.pathId]}`;
  }

  const trust = record.trust;
  const needsChoice = Boolean(
    dialogue.choices?.length && !chosenChoiceId && !record.seenDialogues.includes(dialogueId)
  );

  return {
    npc,
    dialogue,
    dialogueId,
    text,
    mood: dialogue.mood || NPC_MOODS.GUIDE,
    moodLabel: NPC_MOOD_LABELS[dialogue.mood] || 'Guide',
    greeting,
    memoryLine,
    trust,
    trustLabel: getTrustLabel(trust),
    choices: needsChoice ? dialogue.choices : [],
    selectedChoiceId: chosenChoiceId || null,
    seen: record.seenDialogues.includes(dialogueId),
    isReturnVisitor: Boolean(greeting),
  };
}

export const LIVING_NPC_ENGINE = {
  version: '1.0',
  label: 'Living NPC Engine',
};
