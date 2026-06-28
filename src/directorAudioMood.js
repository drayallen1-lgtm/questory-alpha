/**
 * Sweep 14.3 / 16 — Director mood hooks (legacy API + adaptive audio bridge).
 */
import {
  ADAPTIVE_AUDIO_PHASES,
  ADAPTIVE_PHASE_LABELS,
  MOOD_AUDIO_MAP,
  buildAdaptiveAudioPlan,
  getAudioMoodForAdventure,
  hasAdaptiveAudio,
  resolveAdaptiveAudioContext,
} from './adaptiveAudioDirector';
import { isDirectorAdventure } from './directorRuntime';

export { MOOD_AUDIO_MAP };

export const MOOD_LABELS = ADAPTIVE_PHASE_LABELS;

/** @deprecated Use buildAdaptiveAudioPlan — kept for summaries */
export function getDirectorMoodCue(adventure, phaseKey) {
  if (!hasAdaptiveAudio(adventure) && !isDirectorAdventure(adventure)) return null;

  const mood = getAudioMoodForAdventure(adventure);
  const assetKey = mood[phaseKey];
  if (!assetKey) return null;

  const ctx = resolveAdaptiveAudioContext({
    claimed: phaseKey === 'victory',
    atClaim: phaseKey === 'tension' || phaseKey === 'reveal',
    awaitingFinder: phaseKey === 'tension',
    medallionTapped: phaseKey === 'reveal',
    arActive: phaseKey === 'reveal',
  });
  const plan = buildAdaptiveAudioPlan(adventure, ctx);
  const primary = plan.layers[0];

  return {
    phase: phaseKey,
    assetKey,
    label: MOOD_LABELS[phaseKey] || plan.label || phaseKey,
    audioUrl: primary?.url || MOOD_AUDIO_MAP[assetKey] || null,
    volume: primary?.volume ?? 0.25,
  };
}

/** Map AdventurePlay state to legacy mood phase key. */
export function resolveDirectorMoodPhase({ claimed, atClaim, awaitingFinder, medallionTapped }) {
  if (claimed) return 'victory';
  if (awaitingFinder) return 'tension';
  if (atClaim && medallionTapped) return 'reveal';
  if (atClaim) return 'tension';
  return 'search';
}

export {
  hasAdaptiveAudio,
  resolveAdaptiveAudioContext,
  buildAdaptiveAudioPlan,
  ADAPTIVE_AUDIO_PHASES,
};
