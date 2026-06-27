import {
  AR_ASSET_TYPES,
  AR_ATMOSPHERES,
  AR_INTERACTIONS,
  AR_SCENE_TYPES,
  AR_TRIGGERS,
  normalizeArScene,
} from './arEngine';
import { HORROR_AUDIO, HORROR_IMAGES, libraryAssetForInsert } from './horrorAssets/catalog';
import { buildPackSceneTimeline } from './horrorTimelineDefaults.js';

export const MEDIA_BUCKET = 'questory-media';

export const ACCEPTED_IMAGE = 'image/jpeg,image/png,image/webp';
export const ACCEPTED_AUDIO = 'audio/mpeg,audio/wav,audio/ogg,audio/webm';
export const ACCEPTED_VIDEO = 'video/mp4,video/webm,video/quicktime';
export const ACCEPTED_MEDIA = `${ACCEPTED_IMAGE},${ACCEPTED_AUDIO},${ACCEPTED_VIDEO}`;

/** Built-in horror asset library — bundled local media, works offline */
export const HORROR_ASSET_LIBRARY = {
  ghosts: [
    { id: 'ghost-little-girl', title: 'Little Girl', type: 'image', icon: '👧', category: 'ghosts', offline: true, previewUrl: HORROR_IMAGES.littleGirl, assetUrl: HORROR_IMAGES.littleGirl },
    { id: 'ghost-shadow', title: 'Shadow Figure', type: 'image', icon: '👤', category: 'ghosts', offline: true, previewUrl: HORROR_IMAGES.shadowFigure, assetUrl: HORROR_IMAGES.shadowFigure },
    { id: 'ghost-woman-white', title: 'Woman in White', type: 'image', icon: '👻', category: 'ghosts', offline: true, previewUrl: HORROR_IMAGES.womanInWhite, assetUrl: HORROR_IMAGES.womanInWhite },
    { id: 'ghost-hooded', title: 'Hooded Watcher', type: 'image', icon: '🕴️', category: 'ghosts', offline: true, previewUrl: HORROR_IMAGES.hoodedWatcher, assetUrl: HORROR_IMAGES.hoodedWatcher },
  ],
  objects: [
    { id: 'obj-diary', title: 'Diary Page', type: 'image', icon: '📖', category: 'objects', offline: true, previewUrl: HORROR_IMAGES.diaryPage, assetUrl: HORROR_IMAGES.diaryPage },
    { id: 'obj-swing', title: 'Abandoned Swing', type: 'image', icon: '🛝', category: 'objects', offline: true, previewUrl: HORROR_IMAGES.abandonedSwing, assetUrl: HORROR_IMAGES.abandonedSwing },
    { id: 'obj-lantern', title: 'Black Lantern', type: 'image', icon: '🏮', category: 'objects', offline: true, previewUrl: HORROR_IMAGES.blackLantern, assetUrl: HORROR_IMAGES.blackLantern },
    { id: 'obj-dead-tree', title: 'Dead Tree', type: 'image', icon: '🌳', category: 'objects', offline: true, previewUrl: HORROR_IMAGES.deadTree, assetUrl: HORROR_IMAGES.deadTree },
    { id: 'obj-doll', title: 'Broken Doll', type: 'image', icon: '🪆', category: 'objects', offline: true, previewUrl: HORROR_IMAGES.littleGirl, assetUrl: HORROR_IMAGES.littleGirl },
    { id: 'obj-musicbox', title: 'Music Box', type: 'image', icon: '🎵', category: 'objects', offline: true, previewUrl: HORROR_IMAGES.blackLantern, assetUrl: HORROR_IMAGES.blackLantern },
    { id: 'obj-photo', title: 'Old Photograph', type: 'image', icon: '🖼️', category: 'objects', offline: true, previewUrl: HORROR_IMAGES.diaryPage, assetUrl: HORROR_IMAGES.diaryPage },
  ],
  atmospheres: [
    { id: 'atm-fog', title: 'Fog', type: 'image', icon: '🌫️', category: 'atmospheres', atmosphere: 'fog', offline: true, previewUrl: HORROR_IMAGES.shadowFigure, assetUrl: HORROR_IMAGES.shadowFigure },
    { id: 'atm-rain', title: 'Rain', type: 'image', icon: '🌧️', category: 'atmospheres', atmosphere: 'fog', offline: true, previewUrl: HORROR_IMAGES.deadTree, assetUrl: HORROR_IMAGES.deadTree },
    { id: 'atm-static', title: 'Static', type: 'image', icon: '📺', category: 'atmospheres', atmosphere: 'static', offline: true, previewUrl: HORROR_IMAGES.shadowFigure, assetUrl: HORROR_IMAGES.shadowFigure },
    { id: 'atm-red-moon', title: 'Red Moon', type: 'image', icon: '🌕', category: 'atmospheres', atmosphere: 'darkness', offline: true, previewUrl: HORROR_IMAGES.deadTree, assetUrl: HORROR_IMAGES.deadTree },
    { id: 'atm-flicker', title: 'Flickering Lights', type: 'image', icon: '💡', category: 'atmospheres', atmosphere: 'lantern', offline: true, previewUrl: HORROR_IMAGES.blackLantern, assetUrl: HORROR_IMAGES.blackLantern },
  ],
  animations: [
    { id: 'anim-swing', title: 'Swing Moving', type: 'animation', icon: '🛝', category: 'animations', offline: true, animated: true, previewUrl: HORROR_IMAGES.abandonedSwing, assetUrl: HORROR_IMAGES.abandonedSwing },
    { id: 'anim-lantern', title: 'Lantern Flickering', type: 'animation', icon: '🏮', category: 'animations', offline: true, animated: true, previewUrl: HORROR_IMAGES.blackLantern, assetUrl: HORROR_IMAGES.blackLantern, atmosphere: 'lantern' },
    { id: 'anim-ghost', title: 'Ghost Appearing', type: 'animation', icon: '👻', category: 'animations', offline: true, animated: true, previewUrl: HORROR_IMAGES.womanInWhite, assetUrl: HORROR_IMAGES.womanInWhite },
    { id: 'anim-tree', title: 'Tree Branches Moving', type: 'animation', icon: '🌳', category: 'animations', offline: true, animated: true, previewUrl: HORROR_IMAGES.deadTree, assetUrl: HORROR_IMAGES.deadTree, atmosphere: 'darkness' },
  ],
  audio: [
    { id: 'aud-laugh', title: 'Child Laughter', type: 'audio', icon: '😈', category: 'audio', offline: true, audioUrl: HORROR_AUDIO.childLaughter, previewUrl: HORROR_AUDIO.childLaughter },
    { id: 'aud-whisper', title: 'Whispering Voices', type: 'audio', icon: '🤫', category: 'audio', offline: true, audioUrl: HORROR_AUDIO.whisperingVoices, previewUrl: HORROR_AUDIO.whisperingVoices },
    { id: 'aud-wind', title: 'Wind Gusts', type: 'audio', icon: '🌬️', category: 'audio', offline: true, audioUrl: HORROR_AUDIO.windGusts, previewUrl: HORROR_AUDIO.windGusts },
    { id: 'aud-footsteps', title: 'Footsteps', type: 'audio', icon: '👣', category: 'audio', offline: true, audioUrl: HORROR_AUDIO.footsteps, previewUrl: HORROR_AUDIO.footsteps },
    { id: 'aud-musicbox', title: 'Music Box', type: 'audio', icon: '🎵', category: 'audio', offline: true, audioUrl: HORROR_AUDIO.musicBox, previewUrl: HORROR_AUDIO.musicBox },
    { id: 'aud-static', title: 'Static / Radio', type: 'audio', icon: '📻', category: 'audio', offline: true, audioUrl: HORROR_AUDIO.radioStatic, previewUrl: HORROR_AUDIO.radioStatic },
    { id: 'aud-swing', title: 'Swing Creak', type: 'audio', icon: '🛝', category: 'audio', offline: true, audioUrl: HORROR_AUDIO.swingCreak, previewUrl: HORROR_AUDIO.swingCreak },
    { id: 'aud-breath', title: 'Breathing', type: 'audio', icon: '😮‍💨', category: 'audio', offline: true, audioUrl: HORROR_AUDIO.whisperingVoices, previewUrl: HORROR_AUDIO.whisperingVoices },
  ],
};

export const LIBRARY_CATEGORIES = [
  { id: 'ghosts', label: 'Ghosts' },
  { id: 'objects', label: 'Objects' },
  { id: 'atmospheres', label: 'Atmospheres' },
  { id: 'animations', label: 'Animations' },
  { id: 'audio', label: 'Audio' },
];

export const HORROR_QUICK_PACKS = {
  whispering_hollow: {
    id: 'whispering_hollow',
    label: 'Whispering Hollow Pack',
    desc: 'Porch Scare · Diary Page · Hollow Finale',
    scenes: [
      {
        title: 'Porch Scare',
        description: 'A presence gathers near the swing.',
        overlayText: "Don't look back.",
        sceneType: AR_SCENE_TYPES.GHOST,
        atmosphere: AR_ATMOSPHERES.FOG,
        trigger: AR_TRIGGERS.AFTER_CHECKIN,
        assetId: 'ghost-little-girl',
        audioId: 'aud-swing',
        durationSeconds: 8,
      },
      {
        title: 'Diary Page',
        description: 'Paper glows in the lantern light.',
        overlayText: "They told me they'd come back.",
        revealText: 'The ink is still wet.',
        sceneType: AR_SCENE_TYPES.DIARY,
        atmosphere: AR_ATMOSPHERES.LANTERN,
        trigger: AR_TRIGGERS.AFTER_ANSWER,
        assetId: 'obj-diary',
        durationSeconds: 8,
      },
      {
        title: 'Hollow Finale',
        description: 'Branches stir above the oldest tree.',
        overlayText: 'Thank you for finding me...',
        revealText: '...but you were not alone.',
        sceneType: AR_SCENE_TYPES.JUMP_SCARE,
        atmosphere: AR_ATMOSPHERES.DARKNESS,
        trigger: AR_TRIGGERS.FINDER_CAPTURE,
        assetId: 'obj-dead-tree',
        audioId: 'aud-laugh',
        jumpScare: true,
        isFinale: true,
        durationSeconds: 10,
      },
    ],
  },
  black_lantern: {
    id: 'black_lantern',
    label: 'Black Lantern Pack',
    desc: 'Lantern flicker · Hooded watcher · Burning finale',
    scenes: [
      {
        title: 'Lantern Flicker',
        description: 'The flame dances without wind.',
        overlayText: 'The flame dances without wind.',
        sceneType: AR_SCENE_TYPES.OBJECT,
        atmosphere: AR_ATMOSPHERES.LANTERN,
        trigger: AR_TRIGGERS.AFTER_CHECKIN,
        assetId: 'obj-lantern',
        audioId: 'aud-wind',
        durationSeconds: 8,
      },
      {
        title: 'Hooded Watcher',
        description: 'A figure waits in the dark.',
        overlayText: 'It has been watching.',
        sceneType: AR_SCENE_TYPES.GHOST,
        atmosphere: AR_ATMOSPHERES.DARKNESS,
        trigger: AR_TRIGGERS.AFTER_ANSWER,
        assetId: 'ghost-hooded',
        audioId: 'aud-breath',
        silhouette: true,
        durationSeconds: 9,
      },
      {
        title: 'Burning Finale',
        description: 'Light erupts without mercy.',
        overlayText: 'Run.',
        sceneType: AR_SCENE_TYPES.JUMP_SCARE,
        atmosphere: AR_ATMOSPHERES.FLASH,
        trigger: AR_TRIGGERS.FINDER_CAPTURE,
        jumpScare: true,
        isFinale: true,
        assetId: 'obj-lantern',
        durationSeconds: 9,
      },
    ],
  },
  midnight_train: {
    id: 'midnight_train',
    label: 'Midnight Train Pack',
    desc: 'Conductor · Station static · Ghost passenger',
    scenes: [
      {
        title: 'The Conductor',
        description: 'Footsteps echo on an empty platform.',
        overlayText: 'Tickets, please.',
        sceneType: AR_SCENE_TYPES.GHOST,
        atmosphere: AR_ATMOSPHERES.FOG,
        trigger: AR_TRIGGERS.AFTER_CHECKIN,
        assetId: 'ghost-hooded',
        audioId: 'aud-footsteps',
        silhouette: true,
        durationSeconds: 8,
      },
      {
        title: 'Station Whispers',
        description: 'Static crawls across the air.',
        overlayText: 'The platform is empty.',
        sceneType: AR_SCENE_TYPES.MEMORY,
        atmosphere: AR_ATMOSPHERES.STATIC,
        trigger: AR_TRIGGERS.AFTER_ANSWER,
        assetId: 'atm-static',
        audioId: 'aud-whisper',
        durationSeconds: 8,
      },
      {
        title: 'Ghost Passenger',
        description: 'Something boards without a ticket.',
        overlayText: 'Mind the gap.',
        revealText: 'You are not on the manifest.',
        sceneType: AR_SCENE_TYPES.JUMP_SCARE,
        atmosphere: AR_ATMOSPHERES.DARKNESS,
        trigger: AR_TRIGGERS.FINDER_CAPTURE,
        assetId: 'ghost-woman-white',
        jumpScare: true,
        isFinale: true,
        durationSeconds: 9,
      },
    ],
  },
};

/** Future marketplace — scaffold only */
export const MARKETPLACE_ASSETS_SCAFFOLD = [
  { id: 'mp-victorian', title: 'Victorian Haunting Pack', priceCoins: 250, status: 'coming_soon' },
  { id: 'mp-crypt', title: 'Crypt Whispers Sound Collection', priceCoins: 150, status: 'coming_soon' },
  { id: 'mp-finale-pack', title: 'AR Finale Bundle Vol. 1', priceCoins: 400, status: 'coming_soon' },
];

export function flattenLibraryAssets() {
  return Object.values(HORROR_ASSET_LIBRARY).flat();
}

export function findLibraryAsset(assetId) {
  return flattenLibraryAssets().find((a) => a.id === assetId) || null;
}

export function normalizeMediaAsset(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: String(raw.id || `media-${Date.now()}`),
    type: raw.type || 'image',
    title: String(raw.title || 'Untitled'),
    category: raw.category || 'upload',
    publicUrl: String(raw.publicUrl || raw.public_url || ''),
    storagePath: raw.storagePath || raw.storage_path || null,
    thumbnailUrl: raw.thumbnailUrl || raw.thumbnail_url || raw.publicUrl || raw.public_url || null,
    source: raw.source || 'upload',
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

export function normalizeMediaManifest(manifest) {
  if (!Array.isArray(manifest)) return [];
  return manifest.map(normalizeMediaAsset).filter(Boolean);
}

export function detectMediaType(file) {
  if (!file?.type) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'image';
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function insertAssetIntoScene(scene, asset) {
  const resolved = asset?.offline || asset?.source === 'library' ? libraryAssetForInsert(asset) : asset;
  const base = normalizeArScene(scene);
  const next = { ...base, enabled: true, title: base.title || resolved.title };
  const mediaType = resolved.type === 'animation' ? 'image' : resolved.type;
  if (mediaType === 'audio') {
    next.assetType = AR_ASSET_TYPES.NONE;
    next.audioUrl = resolved.audioUrl || resolved.publicUrl || resolved.assetUrl || '';
    next.thumbnailUrl = resolved.icon || '🔊';
  } else if (mediaType === 'video') {
    next.assetType = AR_ASSET_TYPES.VIDEO;
    next.assetUrl = resolved.publicUrl || resolved.assetUrl || '';
    next.thumbnailUrl = resolved.previewUrl || resolved.thumbnailUrl || next.assetUrl;
  } else {
    next.assetType = AR_ASSET_TYPES.IMAGE;
    next.assetUrl = resolved.assetUrl || resolved.publicUrl || resolved.previewUrl || '';
    next.thumbnailUrl = resolved.previewUrl || next.assetUrl;
  }
  if (resolved.atmosphere) next.atmosphere = resolved.atmosphere;
  if (resolved.mediaAssetId) next.mediaAssetId = resolved.mediaAssetId;
  else if (resolved.id) next.mediaAssetId = resolved.id;
  return normalizeArScene(next);
}

export function sceneFromPackDefinition(def, libraryAsset, audioAsset, packMeta = {}) {
  let scene = normalizeArScene({
    enabled: true,
    title: def.title,
    description: def.description || '',
    overlayText: def.overlayText || '',
    revealText: def.revealText || '',
    sceneType: def.sceneType || AR_SCENE_TYPES.GHOST,
    atmosphere: def.atmosphere || AR_ATMOSPHERES.FOG,
    trigger: def.trigger || AR_TRIGGERS.AFTER_CHECKIN,
    interaction: def.interaction || AR_INTERACTIONS.WATCH,
    durationSeconds: def.durationSeconds || 8,
    jumpScare: Boolean(def.jumpScare),
    silhouette: Boolean(def.silhouette),
  });
  if (libraryAsset) scene = insertAssetIntoScene(scene, libraryAssetForInsert(libraryAsset));
  if (audioAsset?.audioUrl) scene = { ...scene, audioUrl: audioAsset.audioUrl };

  const { timeline, durationSeconds } = buildPackSceneTimeline(
    { ...def, ...packMeta },
    { visual: libraryAsset, audio: audioAsset }
  );
  return normalizeArScene({ ...scene, timeline, durationSeconds });
}

export function applyHorrorPack(packId, { clues, setClues, setArFinale, clueIndex = 0 }) {
  const pack = HORROR_QUICK_PACKS[packId];
  if (!pack) return { ok: false, message: 'Pack not found.' };

  const clueScenes = pack.scenes.filter((s) => !s.isFinale);
  const finaleDef = pack.scenes.find((s) => s.isFinale);

  const nextClues = [...(clues || [])];
  while (nextClues.length < clueScenes.length) {
    nextClues.push({
      id: `pack-clue-${Date.now()}-${nextClues.length}`,
      title: '',
      text: '',
      latitude: nextClues[0]?.latitude || '37.34',
      longitude: nextClues[0]?.longitude || '-95.26',
      radiusMeters: '40',
      clueType: 'text_riddle',
      choices: [],
      arScene: normalizeArScene({ enabled: false }),
    });
  }

  clueScenes.forEach((def, i) => {
    const asset = def.assetId ? findLibraryAsset(def.assetId) : null;
    const audio = def.audioId ? findLibraryAsset(def.audioId) : null;
    const arScene = sceneFromPackDefinition(def, asset, audio, {
      packId,
      packIndex: i,
      isFinale: false,
    });
    nextClues[i] = {
      ...nextClues[i],
      title: nextClues[i].title || def.title,
      text: nextClues[i].text || def.description || def.overlayText,
      arScene,
    };
  });

  setClues?.(nextClues);

  if (finaleDef && setArFinale) {
    const asset = finaleDef.assetId ? findLibraryAsset(finaleDef.assetId) : null;
    const audio = finaleDef.audioId ? findLibraryAsset(finaleDef.audioId) : null;
    setArFinale(
      sceneFromPackDefinition(finaleDef, asset, audio, {
        packId,
        packIndex: clueScenes.length,
        isFinale: true,
      })
    );
  }

  return { ok: true, message: `${pack.label} inserted.` };
}

export function getSceneThumbnail(scene) {
  const s = normalizeArScene(scene);
  if (s.thumbnailUrl) return s.thumbnailUrl;
  if (s.assetType === AR_ASSET_TYPES.IMAGE && s.assetUrl) return s.assetUrl;
  const icons = {
    ghost: '👻',
    object: '✨',
    diary: '📖',
    jump_scare: '⚡',
    portal: '🌀',
    memory: '🎞',
    custom: '🎬',
  };
  return icons[s.sceneType] || '🎬';
}

export function triggerLabel(trigger) {
  const map = {
    on_arrival: 'On Arrival',
    after_checkin: 'After Check-In',
    after_answer: 'After Answer',
    finder_capture: 'Finder Capture',
  };
  return map[trigger] || trigger;
}

export function appendToManifest(manifest, asset) {
  const normalized = normalizeMediaAsset(asset);
  if (!normalized?.publicUrl) return manifest;
  const list = normalizeMediaManifest(manifest);
  if (list.some((a) => a.id === normalized.id)) return list;
  return [normalized, ...list];
}

/** @deprecated use AI_SCENE_GENERATOR from aiSceneGenerator.js */
export const AI_SCENE_GENERATE_SCAFFOLD = {
  enabled: true,
  label: 'Generate Scene',
  placeholderPrompt: 'A little girl standing beneath a rusted swing at dusk.',
};
