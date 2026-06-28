/**
 * Sweep 14.3 — Adaptive audio mood hooks for Director adventures.
 * Maps gameplay phase → ambient cue (lightweight precursor to Sweep 16).
 */
import { HORROR_AUDIO } from './horrorAssets/catalog';
import { isDirectorAdventure } from './directorRuntime';

export const MOOD_AUDIO_MAP = {
  wind: HORROR_AUDIO.windGusts,
  heartbeat: HORROR_AUDIO.heartbeat,
  footsteps: HORROR_AUDIO.footsteps,
  musicbox: HORROR_AUDIO.musicBox,
  static: HORROR_AUDIO.radioStatic,
  whisper: HORROR_AUDIO.whisperingVoices,
  birds: null,
  bells: HORROR_AUDIO.musicBox,
  playful_drums: HORROR_AUDIO.footsteps,
  celebration: HORROR_AUDIO.musicBox,
  fanfare: HORROR_AUDIO.musicBox,
  strings: HORROR_AUDIO.whisperingVoices,
};

export const MOOD_LABELS = {
  search: 'Searching',
  tension: 'Tension rising',
  reveal: 'Reveal',
  victory: 'Victory',
};

/**
 * Resolve mood cue for current play context.
 * @param {object} adventure
 * @param {'search'|'tension'|'reveal'|'victory'} phaseKey
 */
export function getDirectorMoodCue(adventure, phaseKey) {
  if (!isDirectorAdventure(adventure)) return null;

  const mood = adventure.experienceSettings?.audioMood;
  if (!mood) return null;

  const assetKey = mood[phaseKey];
  if (!assetKey) return null;

  const audioUrl = MOOD_AUDIO_MAP[assetKey] || null;

  return {
    phase: phaseKey,
    assetKey,
    label: MOOD_LABELS[phaseKey] || phaseKey,
    audioUrl,
    volume: phaseKey === 'tension' ? 0.35 : phaseKey === 'victory' ? 0.5 : 0.25,
  };
}

/** Map AdventurePlay state to mood phase key. */
export function resolveDirectorMoodPhase({ claimed, atClaim, awaitingFinder, medallionTapped }) {
  if (claimed) return 'victory';
  if (awaitingFinder) return 'tension';
  if (atClaim && medallionTapped) return 'reveal';
  if (atClaim) return 'tension';
  return 'search';
}
