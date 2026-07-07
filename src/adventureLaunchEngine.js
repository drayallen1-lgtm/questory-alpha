/**
 * Questory V2 — Adventure Launch Experience
 * Magic create flow: Describe → AI Director → Preview → Publish
 */
import { generateFullAdventureFromPrompt, getDirectorSuggestions } from './adventureDirector';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const LAUNCH_STEP_IDS = {
  DESCRIBE: 'describe',
  DIRECTOR: 'director',
  PREVIEW: 'preview',
  PUBLISH: 'publish',
};

export const LAUNCH_STEP_ORDER = [
  LAUNCH_STEP_IDS.DESCRIBE,
  LAUNCH_STEP_IDS.DIRECTOR,
  LAUNCH_STEP_IDS.PREVIEW,
  LAUNCH_STEP_IDS.PUBLISH,
];

export const LAUNCH_STEP_LABELS = {
  [LAUNCH_STEP_IDS.DESCRIBE]: 'Describe',
  [LAUNCH_STEP_IDS.DIRECTOR]: 'AI Director',
  [LAUNCH_STEP_IDS.PREVIEW]: 'Preview',
  [LAUNCH_STEP_IDS.PUBLISH]: 'Publish',
};

export function resolveLaunchStep(step, state = null, options = {}) {
  const raw = step || state?.launchStep;
  if (LAUNCH_STEP_ORDER.includes(raw)) return raw;
  if (options.hasDraft) return LAUNCH_STEP_IDS.PREVIEW;
  if (options.hasPrompt) return LAUNCH_STEP_IDS.DIRECTOR;
  return LAUNCH_STEP_IDS.DESCRIBE;
}

export function buildLaunchSuggestions() {
  return getDirectorSuggestions().slice(0, 6);
}

export function generateLaunchDraft(prompt, options = {}) {
  return generateFullAdventureFromPrompt(prompt, options);
}

export function buildLaunchPreview(draft) {
  if (!draft?.ok) {
    return {
      ready: false,
      message: draft?.message || 'Generate an adventure to preview it.',
    };
  }

  const clues = (draft.clues || []).map((clue, index) => ({
    id: clue.id || `preview-clue-${index}`,
    title: clue.title || `Clue ${index + 1}`,
    text: clue.text || '',
    latitude: clue.latitude,
    longitude: clue.longitude,
    radiusMeters: clue.radiusMeters,
    icon: index === 0 ? '🚩' : index === (draft.clues?.length || 1) - 1 ? '🏆' : '📍',
  }));

  const rewards = (draft.rewards || [])
    .filter((reward) => reward.enabled !== false)
    .map((reward) => ({
      id: reward.type,
      icon: reward.icon || '🎁',
      label: reward.title || reward.type,
      detail: reward.valueLabel || reward.desc || '',
    }));

  return {
    ready: true,
    title: draft.meta?.title || 'Untitled Adventure',
    story: draft.meta?.story || '',
    location: draft.meta?.location || 'Your City',
    estimatedMinutes: draft.meta?.estimatedMinutes || 25,
    clueCount: clues.length,
    clues,
    rewards,
    template: draft.meta?.adventureTemplate || 'scratch',
    scale: draft.meta?.adventureScale || 'neighborhood',
    summary: draft.summary || '',
    characters: draft.blueprint?.characters?.map((c) => c.name).filter(Boolean) || [],
  };
}

export function getAdventureLaunchSnapshot(state = null, options = {}) {
  const prompt = options.prompt ?? state?.launchPrompt ?? '';
  const draft = options.draft ?? null;
  const step = resolveLaunchStep(options.step, state, {
    hasDraft: Boolean(draft?.ok),
    hasPrompt: Boolean(prompt?.trim()),
  });

  return wrapEngineSnapshot({
    step,
    steps: LAUNCH_STEP_ORDER.map((id) => ({
      id,
      label: LAUNCH_STEP_LABELS[id],
      complete:
        id === LAUNCH_STEP_IDS.DESCRIBE
          ? Boolean(prompt?.trim())
          : id === LAUNCH_STEP_IDS.DIRECTOR
            ? Boolean(draft?.ok)
            : id === LAUNCH_STEP_IDS.PREVIEW
              ? Boolean(draft?.ok)
              : false,
    })),
    prompt,
    suggestions: buildLaunchSuggestions(),
    draft,
    preview: buildLaunchPreview(draft),
    advancedMode: Boolean(state?.createAdvanced),
    editing: Boolean(state?.editingAdventureId),
  });
}

export function launchDraftToSaveOverrides(draft) {
  if (!draft?.ok) return null;
  return {
    meta: draft.meta,
    clues: draft.clues,
    rewards: draft.rewards,
    adventureTemplate: draft.meta?.adventureTemplate,
    adventureScale: draft.meta?.adventureScale,
    experienceSettings: draft.meta?.experienceSettings,
    arFinale: draft.arFinale,
    arTheme: draft.arTheme,
    worldConfig: draft.worldConfig,
  };
}
