import {
  AR_ASSET_TYPES,
  AR_ATMOSPHERES,
  AR_INTERACTIONS,
  AR_SCENE_TYPES,
  AR_TRIGGERS,
  normalizeArScene,
} from './arEngine';
import { HORROR_AUDIO, HORROR_IMAGES } from './horrorAssets/catalog';

/** Built-in AR finale presets — one tap fills visuals, audio, overlay, duration, atmosphere */
export const FINALE_THEMES = {
  horror_crest: {
    id: 'horror_crest',
    label: 'Horror Crest',
    desc: 'Crest reveal · static burst · jump scare',
    arTheme: 'horror',
    scene: {
      enabled: true,
      sceneType: AR_SCENE_TYPES.JUMP_SCARE,
      title: 'Horror Crest',
      description: 'An ancient crest burns into view.',
      assetType: AR_ASSET_TYPES.IMAGE,
      assetUrl: HORROR_IMAGES.hoodedWatcher,
      thumbnailUrl: HORROR_IMAGES.hoodedWatcher,
      audioUrl: HORROR_AUDIO.radioStatic,
      overlayText: 'The crest remembers every soul that passed.',
      revealText: 'You are marked.',
      durationSeconds: 12,
      trigger: AR_TRIGGERS.FINDER_CAPTURE,
      interaction: AR_INTERACTIONS.TAP_REVEAL,
      atmosphere: AR_ATMOSPHERES.STATIC,
      jumpScare: true,
      allowReplay: true,
    },
  },
  paranormal_signal: {
    id: 'paranormal_signal',
    label: 'Paranormal Signal',
    desc: 'Static interference · whispering voices',
    arTheme: 'horror',
    scene: {
      enabled: true,
      sceneType: AR_SCENE_TYPES.MEMORY,
      title: 'Paranormal Signal',
      description: 'Your camera picks up a signal that should not exist.',
      assetType: AR_ASSET_TYPES.IMAGE,
      assetUrl: HORROR_IMAGES.shadowFigure,
      thumbnailUrl: HORROR_IMAGES.shadowFigure,
      audioUrl: HORROR_AUDIO.whisperingVoices,
      overlayText: '…can you hear them?',
      revealText: 'The signal is coming from inside the hunt.',
      durationSeconds: 14,
      trigger: AR_TRIGGERS.FINDER_CAPTURE,
      interaction: AR_INTERACTIONS.WATCH,
      atmosphere: AR_ATMOSPHERES.STATIC,
      jumpScare: false,
      allowReplay: true,
    },
  },
  black_lantern: {
    id: 'black_lantern',
    label: 'Black Lantern',
    desc: 'Lantern flicker · wind · burning finale',
    arTheme: 'horror',
    scene: {
      enabled: true,
      sceneType: AR_SCENE_TYPES.JUMP_SCARE,
      title: 'Black Lantern Finale',
      description: 'The flame goes out — then everything ignites.',
      assetType: AR_ASSET_TYPES.IMAGE,
      assetUrl: HORROR_IMAGES.blackLantern,
      thumbnailUrl: HORROR_IMAGES.blackLantern,
      audioUrl: HORROR_AUDIO.windGusts,
      overlayText: 'The lantern dances without wind.',
      revealText: 'Run.',
      durationSeconds: 11,
      trigger: AR_TRIGGERS.FINDER_CAPTURE,
      interaction: AR_INTERACTIONS.TAP_REVEAL,
      atmosphere: AR_ATMOSPHERES.LANTERN,
      jumpScare: true,
      allowReplay: true,
    },
  },
  midnight_train: {
    id: 'midnight_train',
    label: 'Midnight Train',
    desc: 'Conductor shadow · footsteps · ghost passenger',
    arTheme: 'horror',
    scene: {
      enabled: true,
      sceneType: AR_SCENE_TYPES.GHOST,
      title: 'Midnight Train',
      description: 'The last train leaves without you on the manifest.',
      assetType: AR_ASSET_TYPES.IMAGE,
      assetUrl: HORROR_IMAGES.womanInWhite,
      thumbnailUrl: HORROR_IMAGES.womanInWhite,
      audioUrl: HORROR_AUDIO.footsteps,
      overlayText: 'Mind the gap.',
      revealText: 'You are not on the manifest.',
      durationSeconds: 13,
      trigger: AR_TRIGGERS.FINDER_CAPTURE,
      interaction: AR_INTERACTIONS.WATCH,
      atmosphere: AR_ATMOSPHERES.FOG,
      jumpScare: true,
      allowReplay: true,
    },
  },
  forgotten_souls: {
    id: 'forgotten_souls',
    label: 'Forgotten Souls',
    desc: 'Dead tree · child laugh · hollow whisper',
    arTheme: 'horror',
    scene: {
      enabled: true,
      sceneType: AR_SCENE_TYPES.JUMP_SCARE,
      title: 'Forgotten Souls',
      description: 'Something at the tree line has been waiting.',
      assetType: AR_ASSET_TYPES.IMAGE,
      assetUrl: HORROR_IMAGES.deadTree,
      thumbnailUrl: HORROR_IMAGES.deadTree,
      audioUrl: HORROR_AUDIO.childLaughter,
      overlayText: "Thank you for finding me…",
      revealText: "…but you were not alone.",
      durationSeconds: 15,
      trigger: AR_TRIGGERS.FINDER_CAPTURE,
      interaction: AR_INTERACTIONS.TAP_REVEAL,
      atmosphere: AR_ATMOSPHERES.DARKNESS,
      jumpScare: true,
      allowReplay: true,
    },
  },
};

export const FINALE_THEME_LIST = Object.values(FINALE_THEMES);

export function getFinaleTheme(themeId) {
  return FINALE_THEMES[themeId] || null;
}

export function applyFinaleTheme(themeId) {
  const theme = getFinaleTheme(themeId);
  if (!theme) return { arFinale: normalizeArScene({ enabled: false }), arTheme: 'none' };
  return {
    arFinale: normalizeArScene(theme.scene),
    arTheme: theme.arTheme || 'horror',
    finaleThemeId: theme.id,
  };
}

export function detectFinaleThemeId(arFinale, arTheme) {
  if (!arFinale?.enabled) return null;
  for (const theme of FINALE_THEME_LIST) {
    const s = theme.scene;
    if (
      arFinale.title === s.title &&
      arFinale.assetUrl === s.assetUrl &&
      arFinale.overlayText === s.overlayText
    ) {
      return theme.id;
    }
  }
  if (arTheme && arTheme !== 'none') return null;
  return null;
}
