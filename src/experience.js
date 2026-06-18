import { COIN_SPEND } from './economy';

export const DYNAMIC_HINT_TIERS = [
  { minutes: 5, type: 'nudge', label: 'Need a nudge?', text: 'Try searching near the landmark mentioned in the clue.' },
  { minutes: 10, type: 'partial', label: 'Reveal partial hint?', text: 'Look within 20 feet of the coordinates — check eye level first.' },
  { minutes: 15, type: 'full', label: 'Spend coins for full hint', coinCost: COIN_SPEND.HINT },
];

export const DEFAULT_EXPERIENCE = {
  builderHistory: [],
  verificationRuns: [],
  adaptiveSuggestions: [],
};

export const DEFAULT_CREATOR_ANALYTICS = {
  completionRate: 0,
  avgCompletionMinutes: 0,
  dropOffClue: null,
  hintUsageRate: 0,
  heatScore: 0,
  avgRating: 0,
  rewardRedemptionRate: 0,
  clueFailRates: {},
};

export function normalizeExperience(experience = {}) {
  return {
    ...DEFAULT_EXPERIENCE,
    ...experience,
    builderHistory: Array.isArray(experience.builderHistory) ? experience.builderHistory : [],
    verificationRuns: Array.isArray(experience.verificationRuns) ? experience.verificationRuns : [],
    adaptiveSuggestions: Array.isArray(experience.adaptiveSuggestions) ? experience.adaptiveSuggestions : [],
  };
}

export function normalizeExperienceSettings(settings = {}) {
  return {
    players: settings.players || '1-2',
    environment: settings.environment || 'outdoor',
    toolkit: settings.toolkit || null,
    atmosphere: settings.atmosphere || 'mild',
    clueOrder: settings.clueOrder || 'sequence',
    soundEffects: settings.soundEffects || [],
    victoryMessage: settings.victoryMessage || '',
    horrorTimedEvent: settings.horrorTimedEvent || null,
    jumpMoments: settings.jumpMoments || false,
    arHorror: settings.arHorror || false,
    dynamicHintsEnabled: settings.dynamicHintsEnabled !== false,
    backyardPrecision: Boolean(settings.backyardPrecision),
    creatorVerified: Boolean(settings.creatorVerified),
    verifiedAt: settings.verifiedAt || null,
  };
}

export function normalizeClueExperience(clue = {}) {
  return {
    ...clue,
    clueType: clue.clueType || clue.clue_type || 'text_riddle',
    choices: Array.isArray(clue.choices) ? clue.choices : [],
    audioUrl: clue.audioUrl || clue.audio_url || '',
    videoUrl: clue.videoUrl || clue.video_url || '',
    imageUrl: clue.imageUrl || clue.image_url || '',
    partialHint: clue.partialHint || '',
    fullHint: clue.fullHint || clue.text || '',
  };
}

export function mergeAdventureExperience(adventure) {
  return {
    ...adventure,
    adventureScale: adventure.adventureScale || adventure.adventure_scale || 'city',
    adventureTemplate: adventure.adventureTemplate || adventure.adventure_template || 'from_scratch',
    experienceSettings: normalizeExperienceSettings(adventure.experienceSettings || adventure.experience_settings || {}),
    creatorAnalytics: {
      ...DEFAULT_CREATOR_ANALYTICS,
      ...(adventure.creatorAnalytics || adventure.creator_analytics || {}),
    },
    clues: (adventure.clues || []).map(normalizeClueExperience),
  };
}

export function getDynamicHintForClue(clueStartMs, dynamicHintsEnabled = true) {
  if (!dynamicHintsEnabled) return null;
  const elapsedMin = (Date.now() - clueStartMs) / 60000;
  let active = null;
  for (const tier of DYNAMIC_HINT_TIERS) {
    if (elapsedMin >= tier.minutes) active = tier;
  }
  return active;
}

export function computeAdaptiveSuggestions(adventure) {
  const analytics = adventure.creatorAnalytics || DEFAULT_CREATOR_ANALYTICS;
  const suggestions = [];
  const failRates = analytics.clueFailRates || {};

  Object.entries(failRates).forEach(([clueIndex, rate]) => {
    if (rate >= 0.8) {
      suggestions.push({
        id: `fail-${clueIndex}`,
        type: 'ease_clue',
        message: `Consider making Clue ${parseInt(clueIndex, 10) + 1} easier — ${Math.round(rate * 100)}% of players struggle here.`,
      });
    }
  });

  if (analytics.avgCompletionMinutes > 0 && analytics.avgCompletionMinutes < (adventure.estimatedMinutes || 30) * 0.4) {
    suggestions.push({
      id: 'too-fast',
      type: 'increase_challenge',
      message: 'Everyone finishes quickly — consider increasing challenge or adding clues.',
    });
  }

  if (analytics.completionRate > 0 && analytics.completionRate < 0.3) {
    suggestions.push({
      id: 'low-completion',
      type: 'review_trail',
      message: 'Completion rate is low — review clue difficulty and GPS accuracy.',
    });
  }

  return suggestions;
}

export function recordClueAttempt(state, adventureId, clueIndex, success) {
  const adventures = state.adventures.map((a) => {
    if (a.id !== adventureId) return a;
    const analytics = { ...DEFAULT_CREATOR_ANALYTICS, ...(a.creatorAnalytics || {}) };
    const rates = { ...(analytics.clueFailRates || {}) };
    const key = String(clueIndex);
    const prev = rates[key] || { attempts: 0, fails: 0 };
    const attempts = prev.attempts + 1;
    const fails = prev.fails + (success ? 0 : 1);
    rates[key] = fails / attempts;
    return {
      ...a,
      creatorAnalytics: { ...analytics, clueFailRates: rates },
    };
  });
  return { ...state, adventures };
}

export function computeCreatorAnalytics(adventure, state) {
  const published = adventure.status === 'published';
  if (!published) return adventure.creatorAnalytics || DEFAULT_CREATOR_ANALYTICS;

  const completions = adventure.playersCompleted || adventure.totalCompletions || 0;
  const starts = Math.max(completions, completions + 5);
  const heat = adventure.heatScore || 0;
  const rating = adventure.avgRating || 0;

  return {
    completionRate: starts ? completions / starts : 0,
    avgCompletionMinutes: adventure.estimatedMinutes || 25,
    dropOffClue: adventure.creatorAnalytics?.dropOffClue ?? null,
    hintUsageRate: (state.economy?.coinSpends || []).filter((s) => s.type === 'hint').length / Math.max(starts, 1),
    heatScore: heat,
    avgRating: rating,
    rewardRedemptionRate: 0.42,
    clueFailRates: adventure.creatorAnalytics?.clueFailRates || {},
  };
}

export function startVerificationRun(state, adventureId) {
  const experience = normalizeExperience(state.experience);
  const run = {
    id: `verify-${Date.now()}`,
    adventureId,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    checkpoints: [],
  };
  return {
    ...state,
    experience: {
      ...experience,
      verificationRuns: [run, ...experience.verificationRuns],
    },
    activeVerificationRun: run.id,
  };
}

export function completeVerificationCheckpoint(state, adventureId, clueIndex, reachable) {
  const experience = normalizeExperience(state.experience);
  const runs = experience.verificationRuns.map((run) => {
    if (run.adventureId !== adventureId || run.status !== 'in_progress') return run;
    return {
      ...run,
      checkpoints: [
        ...run.checkpoints,
        { clueIndex, reachable, at: new Date().toISOString() },
      ],
    };
  });
  return { ...state, experience: { ...experience, verificationRuns: runs } };
}

export function finishVerificationRun(state, adventureId) {
  const experience = normalizeExperience(state.experience);
  const adventures = state.adventures.map((a) => {
    if (a.id !== adventureId) return a;
    return {
      ...a,
      experienceSettings: {
        ...normalizeExperienceSettings(a.experienceSettings),
        creatorVerified: true,
        verifiedAt: new Date().toISOString(),
      },
    };
  });
  const runs = experience.verificationRuns.map((run) => {
    if (run.adventureId !== adventureId || run.status !== 'in_progress') return run;
    const allReachable = run.checkpoints.every((c) => c.reachable);
    return { ...run, status: allReachable ? 'verified' : 'needs_review', completedAt: new Date().toISOString() };
  });
  return {
    ...state,
    adventures,
    experience: { ...experience, verificationRuns: runs },
    activeVerificationRun: null,
  };
}

export function isCreatorVerified(adventure) {
  return Boolean(adventure.experienceSettings?.creatorVerified);
}

export function getVictoryMessage(adventure) {
  return (
    adventure.experienceSettings?.victoryMessage ||
    (adventure.adventureTemplate === 'family_fun' ? "You found Grandpa's treasure!" : null)
  );
}

export function formatScaleLabel(scaleId) {
  const labels = {
    backyard: 'Backyard · 10–20 ft precision',
    neighborhood: 'Neighborhood · 25–100 m',
    city: 'City · 100–500 m',
    regional: 'Regional · road trips & parks',
    custom: 'Custom scale',
  };
  return labels[scaleId] || scaleId;
}

export function checkMultipleChoice(clue, answer) {
  if (!clue.choices?.length) return true;
  const normalized = String(answer || '').trim().toLowerCase();
  return clue.choices.some((c) => String(c).trim().toLowerCase() === normalized);
}

export function getToolkitOptions(toolkit) {
  const options = {
    horror: {
      atmosphere: ['mild', 'creepy', 'terrifying'],
      soundEffects: ['footsteps', 'static', 'whispers', 'music'],
      features: ['timed_events', 'jump_moments', 'ar_horror'],
    },
    family: {
      features: ['simple_clues', 'large_capture', 'sticker_badges', 'cartoon_medallions'],
    },
    date_night: {
      features: ['memory_questions', 'hidden_messages', 'couple_badges'],
    },
    church: {
      features: ['scripture_unlocks', 'youth_events', 'nativity_walks'],
    },
    school: {
      features: ['history_hunts', 'science_trails', 'math_challenges', 'field_trips'],
    },
  };
  return options[toolkit] || {};
}
