/**
 * Sweep 16 — Adaptive Audio Director
 * Maps gameplay + finder state → layered ambient stems with dynamic intensity.
 */
import { HORROR_AUDIO } from './horrorAssets/catalog';
import { FINDER_PHASE } from './finderMode';
import { ADVENTURE_TEMPLATES } from './templates';

export const ADAPTIVE_AUDIO_PHASES = {
  IDLE: 'idle',
  SEARCH: 'search',
  APPROACH: 'approach',
  TENSION: 'tension',
  REVEAL: 'reveal',
  AR_STING: 'ar_sting',
  VICTORY: 'victory',
};

export const ADAPTIVE_PHASE_LABELS = {
  idle: 'Ambient',
  search: 'Searching',
  approach: 'Signal growing',
  tension: 'Tension rising',
  reveal: 'Reveal',
  ar_sting: 'Cinematic moment',
  victory: 'Victory',
};

export const MOOD_AUDIO_MAP = {
  wind: HORROR_AUDIO.windGusts,
  heartbeat: HORROR_AUDIO.heartbeat,
  footsteps: HORROR_AUDIO.footsteps,
  musicbox: HORROR_AUDIO.musicBox,
  static: HORROR_AUDIO.radioStatic,
  whisper: HORROR_AUDIO.whisperingVoices,
  strings: HORROR_AUDIO.whisperingVoices,
  scream: HORROR_AUDIO.scream,
  laugh: HORROR_AUDIO.childLaughter,
  birds: HORROR_AUDIO.windGusts,
  bells: HORROR_AUDIO.musicBox,
  playful_drums: HORROR_AUDIO.footsteps,
  celebration: HORROR_AUDIO.musicBox,
  fanfare: HORROR_AUDIO.musicBox,
  creak: HORROR_AUDIO.swingCreak,
};

const DEFAULT_MOODS = {
  horror: { search: 'wind', tension: 'heartbeat', reveal: 'strings', victory: 'fanfare' },
  family: { search: 'birds', tension: 'playful_drums', reveal: 'bells', victory: 'celebration' },
  learning: { search: 'footsteps', tension: 'musicbox', reveal: 'bells', victory: 'celebration' },
  generic: { search: 'wind', tension: 'footsteps', reveal: 'musicbox', victory: 'fanfare' },
};

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function resolveMoodUrl(assetKey) {
  if (!assetKey) return '';
  return MOOD_AUDIO_MAP[assetKey] || '';
}

function templateBucket(adventure) {
  const template =
    adventure?.adventureTemplate ||
    adventure?.template ||
    adventure?.experienceSettings?.adventureTemplate;
  if (template === ADVENTURE_TEMPLATES.HORROR) return 'horror';
  if (template === ADVENTURE_TEMPLATES.FAMILY_FUN || template === ADVENTURE_TEMPLATES.BIRTHDAY) {
    return 'family';
  }
  if (
    template === ADVENTURE_TEMPLATES.EDUCATIONAL ||
    template === ADVENTURE_TEMPLATES.CHURCH
  ) {
    return 'learning';
  }
  if (adventure?.experienceSettings?.arHorror) return 'horror';
  return 'generic';
}

export function getAudioMoodForAdventure(adventure) {
  const custom = adventure?.experienceSettings?.audioMood;
  const eventMood = adventure?._worldEvent?.audioMood;
  const base = { ...DEFAULT_MOODS[templateBucket(adventure)] };
  if (custom && typeof custom === 'object') Object.assign(base, custom);
  if (eventMood && typeof eventMood === 'object') Object.assign(base, eventMood);
  return base;
}

export function hasAdaptiveAudio(adventure) {
  if (!adventure) return false;
  if (adventure.experienceSettings?.audioMood) return true;
  if (adventure.experienceSettings?.directorGenerated) return true;
  const bucket = templateBucket(adventure);
  return bucket === 'horror' || bucket === 'family' || bucket === 'learning';
}

/**
 * @param {object} ctx
 * @returns {import('./adaptiveAudioDirector').AdaptiveAudioContext}
 */
export function resolveAdaptiveAudioContext(ctx = {}) {
  const {
    claimed = false,
    atClaim = false,
    awaitingFinder = false,
    medallionTapped = false,
    finderPhase = null,
    signalPercent = 0,
    arActive = false,
    clueIndex = 0,
    totalClues = 1,
    onFinderScreen = false,
  } = ctx;

  const signal = clamp01(Number(signalPercent) / 100);
  const clueProgress = totalClues > 0 ? clamp01(clueIndex / totalClues) : 0;

  if (claimed) {
    return { phase: ADAPTIVE_AUDIO_PHASES.VICTORY, signal, clueProgress, intensity: 1 };
  }

  if (arActive) {
    return { phase: ADAPTIVE_AUDIO_PHASES.AR_STING, signal, clueProgress, intensity: 0.85 };
  }

  if (medallionTapped && atClaim) {
    return { phase: ADAPTIVE_AUDIO_PHASES.REVEAL, signal: 1, clueProgress: 1, intensity: 0.9 };
  }

  if (onFinderScreen || awaitingFinder) {
    if (finderPhase === FINDER_PHASE.CAPTURE_READY) {
      return { phase: ADAPTIVE_AUDIO_PHASES.TENSION, signal: 1, clueProgress: 1, intensity: 1 };
    }
    if (finderPhase === FINDER_PHASE.SEARCH_ACTIVE) {
      const intensity = 0.35 + signal * 0.55;
      const phase =
        signal >= 0.55 ? ADAPTIVE_AUDIO_PHASES.APPROACH : ADAPTIVE_AUDIO_PHASES.SEARCH;
      return { phase, signal, clueProgress: 1, intensity };
    }
    if (finderPhase === FINDER_PHASE.OUTSIDE_SEARCH) {
      return {
        phase: ADAPTIVE_AUDIO_PHASES.SEARCH,
        signal: 0,
        clueProgress: 1,
        intensity: 0.2,
      };
    }
    if (awaitingFinder) {
      return {
        phase: ADAPTIVE_AUDIO_PHASES.TENSION,
        signal,
        clueProgress: 1,
        intensity: 0.45,
      };
    }
  }

  if (atClaim) {
    return {
      phase: ADAPTIVE_AUDIO_PHASES.TENSION,
      signal,
      clueProgress: 1,
      intensity: 0.55,
    };
  }

  const intensity = 0.18 + clueProgress * 0.35;
  return {
    phase: ADAPTIVE_AUDIO_PHASES.SEARCH,
    signal,
    clueProgress,
    intensity,
  };
}

/**
 * @typedef {object} AdaptiveAudioLayer
 * @property {string} id
 * @property {string} url
 * @property {number} volume
 * @property {boolean} loop
 * @property {number} fadeMs
 */

/**
 * @param {object} adventure
 * @param {ReturnType<typeof resolveAdaptiveAudioContext>} audioCtx
 * @returns {{ enabled: boolean, phase: string, label: string, intensity: number, layers: AdaptiveAudioLayer[] }}
 */
export function buildAdaptiveAudioPlan(adventure, audioCtx) {
  if (!hasAdaptiveAudio(adventure)) {
    return { enabled: false, phase: ADAPTIVE_AUDIO_PHASES.IDLE, label: '', intensity: 0, layers: [] };
  }

  const mood = getAudioMoodForAdventure(adventure);
  const { phase, signal, intensity } = audioCtx;
  const layers = [];

  const searchUrl = resolveMoodUrl(mood.search);
  const tensionUrl = resolveMoodUrl(mood.tension);
  const revealUrl = resolveMoodUrl(mood.reveal);
  const victoryUrl = resolveMoodUrl(mood.victory);

  if (phase === ADAPTIVE_AUDIO_PHASES.VICTORY && victoryUrl) {
    layers.push({
      id: 'victory',
      url: victoryUrl,
      volume: 0.55,
      loop: false,
      fadeMs: 600,
    });
    return {
      enabled: true,
      phase,
      label: ADAPTIVE_PHASE_LABELS.victory,
      intensity: 1,
      layers,
    };
  }

  if (phase === ADAPTIVE_AUDIO_PHASES.AR_STING && revealUrl) {
    if (searchUrl) {
      layers.push({
        id: 'ambience',
        url: searchUrl,
        volume: 0.12,
        loop: true,
        fadeMs: 400,
      });
    }
    layers.push({
      id: 'ar-sting',
      url: revealUrl,
      volume: 0.48,
      loop: false,
      fadeMs: 300,
    });
    if (mood.tension === 'heartbeat' && HORROR_AUDIO.heartbeat) {
      layers.push({
        id: 'heartbeat',
        url: HORROR_AUDIO.heartbeat,
        volume: 0.28,
        loop: true,
        fadeMs: 500,
      });
    }
    return {
      enabled: true,
      phase,
      label: ADAPTIVE_PHASE_LABELS.ar_sting,
      intensity,
      layers,
    };
  }

  if (phase === ADAPTIVE_AUDIO_PHASES.REVEAL) {
    if (revealUrl) {
      layers.push({
        id: 'reveal',
        url: revealUrl,
        volume: 0.42,
        loop: false,
        fadeMs: 500,
      });
    }
    return {
      enabled: true,
      phase,
      label: ADAPTIVE_PHASE_LABELS.reveal,
      intensity,
      layers,
    };
  }

  if (searchUrl) {
    const ambVol =
      phase === ADAPTIVE_AUDIO_PHASES.SEARCH
        ? 0.14 + intensity * 0.12
        : 0.1 + intensity * 0.08;
    layers.push({
      id: 'ambience',
      url: searchUrl,
      volume: clamp01(ambVol),
      loop: true,
      fadeMs: 900,
    });
  }

  if (
    tensionUrl &&
    (phase === ADAPTIVE_AUDIO_PHASES.TENSION ||
      phase === ADAPTIVE_AUDIO_PHASES.APPROACH ||
      phase === ADAPTIVE_AUDIO_PHASES.REVEAL)
  ) {
    const tensionVol =
      phase === ADAPTIVE_AUDIO_PHASES.TENSION
        ? 0.22 + signal * 0.38
        : 0.08 + signal * 0.28;
    layers.push({
      id: 'tension',
      url: tensionUrl,
      volume: clamp01(tensionVol),
      loop: true,
      fadeMs: 1100,
    });
  }

  if (
    mood.tension === 'heartbeat' &&
    HORROR_AUDIO.heartbeat &&
    (phase === ADAPTIVE_AUDIO_PHASES.TENSION || (phase === ADAPTIVE_AUDIO_PHASES.APPROACH && signal >= 0.5))
  ) {
    layers.push({
      id: 'heartbeat',
      url: HORROR_AUDIO.heartbeat,
      volume: clamp01(0.1 + signal * 0.35),
      loop: true,
      fadeMs: 800,
    });
  }

  const label = ADAPTIVE_PHASE_LABELS[phase] || ADAPTIVE_PHASE_LABELS.search;

  return {
    enabled: layers.length > 0,
    phase,
    label,
    intensity: clamp01(intensity),
    layers,
  };
}

export const ADAPTIVE_AUDIO_ENGINE = {
  version: '1.0',
  label: 'Adaptive Audio Director',
};
