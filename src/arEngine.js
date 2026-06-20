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
};

export function normalizeArScene(raw = {}) {
  const scene = raw && typeof raw === 'object' ? raw : {};
  const sceneType = Object.values(AR_SCENE_TYPES).includes(scene.sceneType)
    ? scene.sceneType
    : DEFAULT_AR_SCENE.sceneType;
  return {
    ...DEFAULT_AR_SCENE,
    ...scene,
    enabled: Boolean(scene.enabled),
    sceneType,
    title: String(scene.title || ''),
    description: String(scene.description || ''),
    assetType: Object.values(AR_ASSET_TYPES).includes(scene.assetType)
      ? scene.assetType
      : DEFAULT_AR_SCENE.assetType,
    assetUrl: String(scene.assetUrl || ''),
    audioUrl: String(scene.audioUrl || scene.assetUrl || ''),
    overlayText: String(scene.overlayText || ''),
    durationSeconds: Math.max(3, Number(scene.durationSeconds) || DEFAULT_AR_SCENE.durationSeconds),
    trigger: Object.values(AR_TRIGGERS).includes(scene.trigger)
      ? scene.trigger
      : DEFAULT_AR_SCENE.trigger,
    interaction: Object.values(AR_INTERACTIONS).includes(scene.interaction)
      ? scene.interaction
      : DEFAULT_AR_SCENE.interaction,
    atmosphere: Object.values(AR_ATMOSPHERES).includes(scene.atmosphere)
      ? scene.atmosphere
      : DEFAULT_AR_SCENE.atmosphere,
    jumpScare: Boolean(scene.jumpScare || sceneType === AR_SCENE_TYPES.JUMP_SCARE),
    revealText: String(scene.revealText || ''),
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
    arScene: normalizeArScene({ enabled: true, ...arScene }),
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
    arFinale: normalizeArScene({
      enabled: true,
      sceneType: AR_SCENE_TYPES.JUMP_SCARE,
      title: 'The Hollow Finale',
      description: 'A final whisper in the dark.',
      assetType: AR_ASSET_TYPES.NONE,
      audioUrl: '',
      overlayText: 'Thank you for finding me...',
      revealText: '...but you were not alone.',
      durationSeconds: 10,
      trigger: AR_TRIGGERS.FINDER_CAPTURE,
      interaction: AR_INTERACTIONS.TAP_REVEAL,
      atmosphere: AR_ATMOSPHERES.DARKNESS,
      jumpScare: true,
    }),
    clues: [
      mkClue(
        0,
        'The Gate',
        'Cross the gate where the path ends. Listen for static on the wind.',
        0,
        0,
        {
          sceneType: AR_SCENE_TYPES.GHOST,
          title: 'Ghost Appearance',
          atmosphere: AR_ATMOSPHERES.STATIC,
          overlayText: "You shouldn't have come here.",
          audioUrl: 'https://actions.google.com/sounds/v1/horror/ghost_whispers.ogg',
          trigger: AR_TRIGGERS.AFTER_CHECKIN,
          interaction: AR_INTERACTIONS.WATCH,
          durationSeconds: 9,
        }
      ),
      mkClue(
        1,
        'The Swing',
        'The chains move though no one sits there.',
        0.0004,
        0.0003,
        {
          sceneType: AR_SCENE_TYPES.MEMORY,
          title: 'Memory Flashback',
          atmosphere: AR_ATMOSPHERES.FOG,
          overlayText: 'The swing moved by itself.',
          assetType: AR_ASSET_TYPES.IMAGE,
          assetUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
          trigger: AR_TRIGGERS.AFTER_CHECKIN,
          interaction: AR_INTERACTIONS.WATCH,
          durationSeconds: 10,
        }
      ),
      mkClue(
        2,
        'The Diary',
        'Pages flutter under the lantern light.',
        0.0008,
        0.0006,
        {
          sceneType: AR_SCENE_TYPES.DIARY,
          title: 'Diary Page',
          atmosphere: AR_ATMOSPHERES.LANTERN,
          overlayText: 'A torn page appears...',
          revealText: "They told me they'd come back.",
          trigger: AR_TRIGGERS.AFTER_ANSWER,
          interaction: AR_INTERACTIONS.TAP_REVEAL,
          durationSeconds: 12,
        }
      ),
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
