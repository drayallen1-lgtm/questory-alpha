import { HORROR_AUDIO, HORROR_IMAGES } from './horrorAssets/catalog';
import { normalizeSceneDialogueFields, sanitizeDialogueField } from './dialogueExtract';
import {
  getTimelineDuration,
  normalizeTimeline,
  resolveSceneTimeline,
} from './timelineEngine';
import { buildDefaultHorrorTimeline } from './horrorTimelineDefaults.js';

export const AR_SCENE_TYPES = {
  GHOST: 'ghost',
  OBJECT: 'object',
  DIARY: 'diary',
  JUMP_SCARE: 'jump_scare',
  PORTAL: 'portal',
  MEMORY: 'memory',
  CUSTOM: 'custom',
};

export const AR_SCENE_TYPE_LABELS = {
  ghost: 'Ghost Appearance',
  object: 'Floating Object',
  diary: 'Diary Page',
  jump_scare: 'Jump Scare',
  portal: 'Portal',
  memory: 'Memory Flashback',
  custom: 'Custom',
};

export const AR_ASSET_TYPES = {
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  MODEL: 'model',
  NONE: 'none',
};

export const AR_TRIGGERS = {
  ON_ARRIVAL: 'on_arrival',
  AFTER_CHECKIN: 'after_checkin',
  AFTER_ANSWER: 'after_answer',
  FINDER_CAPTURE: 'finder_capture',
};

export const AR_INTERACTIONS = {
  WATCH: 'watch',
  TAP_REVEAL: 'tap_to_reveal',
  TAP_COLLECT: 'tap_to_collect',
  CHOICE: 'choice',
};

export const AR_ATMOSPHERES = {
  NONE: 'none',
  FOG: 'fog',
  STATIC: 'static',
  DARKNESS: 'darkness',
  FLASH: 'flash',
  LANTERN: 'lantern',
};

export const DEFAULT_AR_SCENE = {
  enabled: false,
  sceneType: AR_SCENE_TYPES.GHOST,
  title: '',
  description: '',
  assetType: AR_ASSET_TYPES.NONE,
  assetUrl: '',
  audioUrl: '',
  overlayText: '',
  durationSeconds: 8,
  trigger: AR_TRIGGERS.AFTER_CHECKIN,
  interaction: AR_INTERACTIONS.WATCH,
  atmosphere: AR_ATMOSPHERES.NONE,
  jumpScare: false,
  revealText: '',
  thumbnailUrl: '',
  allowReplay: true,
  mediaAssetId: null,
  timeline: [],
  silhouette: false,
};

export function normalizeArScene(raw = {}) {
  const scene = raw && typeof raw === 'object' ? raw : {};
  const { _dialoguePrompt, ...sceneFields } = scene;
  const sceneType = Object.values(AR_SCENE_TYPES).includes(sceneFields.sceneType)
    ? sceneFields.sceneType
    : DEFAULT_AR_SCENE.sceneType;
  const dialogue = normalizeSceneDialogueFields(sceneFields, _dialoguePrompt);
  const baseScene = {
    ...DEFAULT_AR_SCENE,
    ...sceneFields,
    enabled: Boolean(scene.enabled),
    sceneType,
    title: sanitizeDialogueField(scene.title),
    description: dialogue.description,
    assetType: Object.values(AR_ASSET_TYPES).includes(sceneFields.assetType)
      ? sceneFields.assetType
      : DEFAULT_AR_SCENE.assetType,
    assetUrl: String(sceneFields.assetUrl || ''),
    audioUrl: String(sceneFields.audioUrl || sceneFields.assetUrl || ''),
    overlayText: dialogue.overlayText,
    trigger: Object.values(AR_TRIGGERS).includes(sceneFields.trigger)
      ? sceneFields.trigger
      : DEFAULT_AR_SCENE.trigger,
    interaction: Object.values(AR_INTERACTIONS).includes(sceneFields.interaction)
      ? sceneFields.interaction
      : DEFAULT_AR_SCENE.interaction,
    atmosphere: Object.values(AR_ATMOSPHERES).includes(sceneFields.atmosphere)
      ? sceneFields.atmosphere
      : DEFAULT_AR_SCENE.atmosphere,
    jumpScare: Boolean(sceneFields.jumpScare || sceneType === AR_SCENE_TYPES.JUMP_SCARE),
    revealText: dialogue.revealText,
    thumbnailUrl: String(sceneFields.thumbnailUrl || ''),
    allowReplay: sceneFields.allowReplay !== false,
    mediaAssetId: sceneFields.mediaAssetId || null,
    silhouette: Boolean(sceneFields.silhouette),
    durationSeconds: Math.max(3, Number(sceneFields.durationSeconds) || DEFAULT_AR_SCENE.durationSeconds),
    cinematicEntityId: sceneFields.cinematicEntityId || null,
    cinematicEntityLabel: String(sceneFields.cinematicEntityLabel || ''),
    particleLayers: Array.isArray(sceneFields.particleLayers) ? sceneFields.particleLayers : [],
    safeForKids: Boolean(sceneFields.safeForKids),
  };
  const customTimeline = normalizeTimeline(sceneFields.timeline);
  const timeline = customTimeline.length ? customTimeline : resolveSceneTimeline(baseScene);
  const durationSeconds = getTimelineDuration(
    timeline,
    baseScene.durationSeconds
  );
  return {
    ...baseScene,
    timeline,
    durationSeconds,
  };
}

export function emptyArScene() {
  return normalizeArScene({ enabled: false });
}

export function getArSceneId(adventureId, clueOrFinaleId, kind = 'clue') {
  return `${adventureId}:${kind}:${clueOrFinaleId}`;
}

export function getClueArScene(clue) {
  if (!clue) return emptyArScene();
  return normalizeArScene(clue.arScene || clue.ar_scene || {});
}


export function getAdventureArFinale(adventure) {
  if (!adventure) return emptyArScene();
  return normalizeArScene(adventure.arFinale || adventure.ar_finale || {});
}

export function isArSceneComplete(progress, sceneId) {
  const completed = progress?.arScenesCompleted || [];
  return completed.includes(sceneId);
}

export function markArSceneComplete(state, adventureId, sceneId) {
  const progress = state.progress?.[adventureId] || {};
  const completed = Array.isArray(progress.arScenesCompleted) ? progress.arScenesCompleted : [];
  if (completed.includes(sceneId)) return state;
  return {
    ...state,
    progress: {
      ...state.progress,
      [adventureId]: {
        ...progress,
        arScenesCompleted: [...completed, sceneId],
      },
    },
  };
}

export function shouldPlayArScene(scene, progress, sceneId, { forceReplay = false } = {}) {
  if (!scene?.enabled) return false;
  if (forceReplay) return true;
  return !isArSceneComplete(progress, sceneId);
}

export function matchesArTrigger(scene, trigger) {
  if (!scene?.enabled) return false;
  if (scene.trigger === trigger) return true;
  if (
    trigger === AR_TRIGGERS.AFTER_CHECKIN &&
    scene.trigger === AR_TRIGGERS.ON_ARRIVAL
  ) {
    return true;
  }
  return false;
}

export function hasCinematicAr(adventure) {
  const finale = getAdventureArFinale(adventure);
  if (finale.enabled) return true;
  return (adventure?.clues || []).some((c) => getClueArScene(c).enabled);
}

/** Attach default cinematic timeline when none provided */
function withHorrorTimeline(fields) {
  const base = { enabled: true, ...fields };
  if (base.timeline?.length) return normalizeArScene(base);
  const { timeline, durationSeconds } = buildDefaultHorrorTimeline({
    durationSeconds: base.durationSeconds || 8,
    overlayText: base.overlayText,
    revealText: base.revealText,
    sceneType: base.sceneType,
    atmosphere: base.atmosphere,
    jumpScare: base.jumpScare,
    isGhost: base.sceneType === AR_SCENE_TYPES.GHOST,
    hasAsset: Boolean(base.assetUrl),
    silhouette: base.silhouette,
    position: fields.position,
    extraAmbience: fields.extraAmbience,
    audioLayers: fields.audioLayers || [],
  });
  return normalizeArScene({ ...base, timeline, durationSeconds });
}

/** Ready-made horror AR preset — "The Whispering Hollow" */
export function buildWhisperingHollowPreset(baseLat = 37.34, baseLng = -95.26) {
  const mkClue = (index, title, text, latOff, lngOff, arScene) => ({
    id: `wh-clue-${index + 1}`,
    title,
    text,
    latitude: baseLat + latOff,
    longitude: baseLng + lngOff,
    radiusMeters: 40,
    bonusRewardText: '',
    clueType: 'text_riddle',
    choices: [],
    audioUrl: arScene.audioUrl || '',
    videoUrl: '',
    imageUrl: arScene.assetUrl || '',
    arScene,
  });

  const porchScene = withHorrorTimeline({
    sceneType: AR_SCENE_TYPES.GHOST,
    title: 'Porch Scare',
    description: 'A presence gathers near the swing.',
    atmosphere: AR_ATMOSPHERES.FOG,
    overlayText: "Don't look back.",
    audioUrl: HORROR_AUDIO.swingCreak,
    assetType: AR_ASSET_TYPES.IMAGE,
    assetUrl: HORROR_IMAGES.littleGirl,
    thumbnailUrl: HORROR_IMAGES.littleGirl,
    mediaAssetId: 'ghost-little-girl',
    trigger: AR_TRIGGERS.AFTER_CHECKIN,
    interaction: AR_INTERACTIONS.WATCH,
    durationSeconds: 8,
    extraAmbience: { asset: 'creak', time: 2, volume: 0.58, track: 'sfx-creak' },
  });

  const diaryScene = withHorrorTimeline({
    sceneType: AR_SCENE_TYPES.DIARY,
    title: 'Diary Page',
    description: 'Paper glows in the lantern light.',
    atmosphere: AR_ATMOSPHERES.LANTERN,
    overlayText: "They told me they'd come back.",
    revealText: 'The ink is still wet.',
    assetType: AR_ASSET_TYPES.IMAGE,
    assetUrl: HORROR_IMAGES.diaryPage,
    thumbnailUrl: HORROR_IMAGES.diaryPage,
    mediaAssetId: 'obj-diary',
    trigger: AR_TRIGGERS.AFTER_ANSWER,
    interaction: AR_INTERACTIONS.TAP_REVEAL,
    durationSeconds: 8,
    isGhost: false,
    extraAmbience: { asset: 'musicbox', time: 1.2, volume: 0.32, track: 'sfx-music' },
  });

  const treeScene = withHorrorTimeline({
    sceneType: AR_SCENE_TYPES.OBJECT,
    title: 'The Oldest Tree',
    description: 'Branches stir against the sky.',
    atmosphere: AR_ATMOSPHERES.STATIC,
    overlayText: 'Something moves above you.',
    assetType: AR_ASSET_TYPES.IMAGE,
    assetUrl: HORROR_IMAGES.deadTree,
    thumbnailUrl: HORROR_IMAGES.deadTree,
    mediaAssetId: 'obj-dead-tree',
    trigger: AR_TRIGGERS.AFTER_ANSWER,
    interaction: AR_INTERACTIONS.WATCH,
    durationSeconds: 8,
    position: 'far',
    extraAmbience: { asset: 'static', time: 0.8, volume: 0.38, track: 'sfx-static' },
    audioLayers: [{ asset: 'wind', time: 0, volume: 0.22, track: 'amb-wind-2', loop: true }],
  });

  const finaleScene = withHorrorTimeline({
    sceneType: AR_SCENE_TYPES.JUMP_SCARE,
    title: 'The Hollow Finale',
    description: 'A final whisper in the dark.',
    assetType: AR_ASSET_TYPES.IMAGE,
    assetUrl: HORROR_IMAGES.deadTree,
    thumbnailUrl: HORROR_IMAGES.deadTree,
    audioUrl: HORROR_AUDIO.childLaughter,
    overlayText: 'Thank you for finding me...',
    revealText: '...but you were not alone.',
    durationSeconds: 10,
    trigger: AR_TRIGGERS.FINDER_CAPTURE,
    interaction: AR_INTERACTIONS.TAP_REVEAL,
    atmosphere: AR_ATMOSPHERES.DARKNESS,
    jumpScare: true,
    extraAmbience: { asset: 'static', time: 0.8, volume: 0.4, track: 'sfx-static' },
    audioLayers: [{ asset: 'laugh', time: 7, volume: 0.5, track: 'sfx-laugh' }],
  });

  return {
    meta: {
      title: 'The Whispering Hollow',
      story:
        'An old swing set creaks in an empty yard. A diary waits in the dark. Something else is watching.',
      finderMode: 'ar_enhanced',
      arAssetType: 'ghost_lantern',
    },
    arTheme: 'horror',
    arFinale: finaleScene,
    clues: [
      mkClue(0, 'The Swing Set', 'The chains creak though no one sits there.', 0, 0, porchScene),
      mkClue(1, 'The Flower Pot', 'Soil scattered. Something passed through here.', 0.0004, 0.0003, diaryScene),
      mkClue(2, 'The Oldest Tree', 'Carved initials fade under lantern light.', 0.0008, 0.0006, treeScene),
    ],
  };
}

export function applyWhisperingHollowToCreateForm({ setMeta, setClues, setMetaAr, clues }) {
  const baseLat = clues[0]?.latitude ? parseFloat(clues[0].latitude) : 37.34;
  const baseLng = clues[0]?.longitude ? parseFloat(clues[0].longitude) : -95.26;
  const preset = buildWhisperingHollowPreset(
    Number.isFinite(baseLat) ? baseLat : 37.34,
    Number.isFinite(baseLng) ? baseLng : -95.26
  );
  setMeta((m) => ({
    ...m,
    title: preset.meta.title,
    story: preset.meta.story,
    finderMode: preset.meta.finderMode,
    arAssetType: preset.meta.arAssetType,
  }));
  setClues(preset.clues);
  if (setMetaAr) {
    setMetaAr({ arFinale: preset.arFinale, arTheme: preset.arTheme });
  }
  return preset;
}
