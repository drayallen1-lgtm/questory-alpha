import {
  AR_ASSET_TYPES,
  AR_ATMOSPHERES,
  AR_INTERACTIONS,
  AR_SCENE_TYPES,
  AR_TRIGGERS,
  normalizeArScene,
} from './arEngine';

export const MEDIA_BUCKET = 'questory-media';

export const ACCEPTED_IMAGE = 'image/jpeg,image/png,image/webp';
export const ACCEPTED_AUDIO = 'audio/mpeg,audio/wav,audio/ogg,audio/webm';
export const ACCEPTED_VIDEO = 'video/mp4,video/webm,video/quicktime';
export const ACCEPTED_MEDIA = `${ACCEPTED_IMAGE},${ACCEPTED_AUDIO},${ACCEPTED_VIDEO}`;

const UNSPLASH = (id, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Built-in horror asset library — preview + insert without external tools */
export const HORROR_ASSET_LIBRARY = {
  ghosts: [
    { id: 'ghost-little-girl', title: 'Little Girl', type: 'image', icon: '👧', category: 'ghosts', previewUrl: UNSPLASH('photo-1502082553048-f009c6714b9f'), assetUrl: UNSPLASH('photo-1502082553048-f009c6714b9f') },
    { id: 'ghost-shadow', title: 'Shadow Figure', type: 'image', icon: '👤', category: 'ghosts', previewUrl: UNSPLASH('photo-1509245858183-667081d04493'), assetUrl: UNSPLASH('photo-1509245858183-667081d04493') },
    { id: 'ghost-woman-white', title: 'Woman in White', type: 'image', icon: '👻', category: 'ghosts', previewUrl: UNSPLASH('photo-1518709268805-4e9042af2179'), assetUrl: UNSPLASH('photo-1518709268805-4e9042af2179') },
    { id: 'ghost-hooded', title: 'Hooded Watcher', type: 'image', icon: '🕴️', category: 'ghosts', previewUrl: UNSPLASH('photo-1478762598-61571f944d9c'), assetUrl: UNSPLASH('photo-1478762598-61571f944d9c') },
  ],
  objects: [
    { id: 'obj-lantern', title: 'Lantern', type: 'image', icon: '🏮', category: 'objects', previewUrl: UNSPLASH('photo-1513828583688-c52646db9a9a'), assetUrl: UNSPLASH('photo-1513828583688-c52646db9a9a') },
    { id: 'obj-diary', title: 'Diary', type: 'image', icon: '📖', category: 'objects', previewUrl: UNSPLASH('photo-1456513080510-7bf3a84b82f8'), assetUrl: UNSPLASH('photo-1456513080510-7bf3a84b82f8') },
    { id: 'obj-swing', title: 'Swing Set', type: 'image', icon: '🛝', category: 'objects', previewUrl: UNSPLASH('photo-1506905925346-21bda4d32df4'), assetUrl: UNSPLASH('photo-1506905925346-21bda4d32df4') },
    { id: 'obj-doll', title: 'Broken Doll', type: 'image', icon: '🪆', category: 'objects', previewUrl: UNSPLASH('photo-1515488042361-8840035648fe'), assetUrl: UNSPLASH('photo-1515488042361-8840035648fe') },
    { id: 'obj-musicbox', title: 'Music Box', type: 'image', icon: '🎵', category: 'objects', previewUrl: UNSPLASH('photo-1511379938549-c1f69419868d'), assetUrl: UNSPLASH('photo-1511379938549-c1f69419868d') },
    { id: 'obj-photo', title: 'Old Photograph', type: 'image', icon: '🖼️', category: 'objects', previewUrl: UNSPLASH('photo-1520637836862-4ea5b4abcd72'), assetUrl: UNSPLASH('photo-1520637836862-4ea5b4abcd72') },
  ],
  atmospheres: [
    { id: 'atm-fog', title: 'Fog', type: 'image', icon: '🌫️', category: 'atmospheres', atmosphere: 'fog', previewUrl: UNSPLASH('photo-1482192597424-481fb7927a63'), assetUrl: UNSPLASH('photo-1482192597424-481fb7927a63') },
    { id: 'atm-rain', title: 'Rain', type: 'image', icon: '🌧️', category: 'atmospheres', atmosphere: 'fog', previewUrl: UNSPLASH('photo-1428908728789-d2bad25fd093'), assetUrl: UNSPLASH('photo-1428908728789-d2bad25fd093') },
    { id: 'atm-static', title: 'Static', type: 'image', icon: '📺', category: 'atmospheres', atmosphere: 'static', previewUrl: UNSPLASH('photo-1618005182384-a83a8bd57fbe'), assetUrl: UNSPLASH('photo-1618005182384-a83a8bd57fbe') },
    { id: 'atm-red-moon', title: 'Red Moon', type: 'image', icon: '🌕', category: 'atmospheres', atmosphere: 'darkness', previewUrl: UNSPLASH('photo-1444703686981-a3f2bd446725'), assetUrl: UNSPLASH('photo-1444703686981-a3f2bd446725') },
    { id: 'atm-flicker', title: 'Flickering Lights', type: 'image', icon: '💡', category: 'atmospheres', atmosphere: 'lantern', previewUrl: UNSPLASH('photo-1513828583688-c52646db9a9a'), assetUrl: UNSPLASH('photo-1513828583688-c52646db9a9a') },
  ],
  audio: [
    { id: 'aud-whisper', title: 'Whispering', type: 'audio', icon: '🤫', category: 'audio', audioUrl: 'https://actions.google.com/sounds/v1/horror/ghost_whispers.ogg', previewUrl: null },
    { id: 'aud-footsteps', title: 'Footsteps', type: 'audio', icon: '👣', category: 'audio', audioUrl: 'https://actions.google.com/sounds/v1/foley/footsteps_on_stairs.ogg', previewUrl: null },
    { id: 'aud-swing', title: 'Swing Creak', type: 'audio', icon: '🛝', category: 'audio', audioUrl: 'https://actions.google.com/sounds/v1/impacts/crash.ogg', previewUrl: null },
    { id: 'aud-laugh', title: 'Child Laugh', type: 'audio', icon: '😈', category: 'audio', audioUrl: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg', previewUrl: null },
    { id: 'aud-breath', title: 'Breathing', type: 'audio', icon: '😮‍💨', category: 'audio', audioUrl: 'https://actions.google.com/sounds/v1/human_sounds/breath.ogg', previewUrl: null },
    { id: 'aud-wind', title: 'Wind', type: 'audio', icon: '🌬️', category: 'audio', audioUrl: 'https://actions.google.com/sounds/v1/weather/wind.ogg', previewUrl: null },
  ],
};

export const LIBRARY_CATEGORIES = [
  { id: 'ghosts', label: 'Ghosts' },
  { id: 'objects', label: 'Objects' },
  { id: 'atmospheres', label: 'Atmospheres' },
  { id: 'audio', label: 'Audio' },
];

export const HORROR_QUICK_PACKS = {
  whispering_hollow: {
    id: 'whispering_hollow',
    label: 'Whispering Hollow Pack',
    desc: 'Swing Set ghost · Diary page · Tree finale',
    scenes: [
      { title: 'The Girl Appears', overlayText: "You shouldn't have come here.", description: 'Whispers from the swing...', sceneType: AR_SCENE_TYPES.GHOST, atmosphere: AR_ATMOSPHERES.STATIC, trigger: AR_TRIGGERS.AFTER_CHECKIN, assetId: 'obj-swing', audioId: 'aud-whisper' },
      { title: 'Diary Page', overlayText: 'A torn page appears...', revealText: "They told me they'd come back.", sceneType: AR_SCENE_TYPES.DIARY, atmosphere: AR_ATMOSPHERES.LANTERN, trigger: AR_TRIGGERS.AFTER_ANSWER, assetId: 'obj-diary' },
      { title: 'Tree Finale', overlayText: 'Thank you for finding me...', revealText: '...but you were not alone.', sceneType: AR_SCENE_TYPES.JUMP_SCARE, atmosphere: AR_ATMOSPHERES.DARKNESS, trigger: AR_TRIGGERS.FINDER_CAPTURE, assetId: 'ghost-hooded', jumpScare: true, isFinale: true },
    ],
  },
  black_lantern: {
    id: 'black_lantern',
    label: 'Black Lantern Pack',
    desc: 'Lantern flicker · Hooded figure · Burning finale',
    scenes: [
      { title: 'Lantern Flicker', overlayText: 'The flame dances without wind.', sceneType: AR_SCENE_TYPES.OBJECT, atmosphere: AR_ATMOSPHERES.LANTERN, trigger: AR_TRIGGERS.AFTER_CHECKIN, assetId: 'obj-lantern', audioId: 'aud-wind' },
      { title: 'Hooded Figure', overlayText: 'It has been watching.', sceneType: AR_SCENE_TYPES.GHOST, atmosphere: AR_ATMOSPHERES.DARKNESS, trigger: AR_TRIGGERS.AFTER_ANSWER, assetId: 'ghost-hooded', audioId: 'aud-breath' },
      { title: 'Burning Finale', overlayText: 'The lantern explodes in light.', revealText: 'Run.', sceneType: AR_SCENE_TYPES.JUMP_SCARE, atmosphere: AR_ATMOSPHERES.FLASH, trigger: AR_TRIGGERS.FINDER_CAPTURE, jumpScare: true, isFinale: true, assetId: 'atm-flicker' },
    ],
  },
  midnight_train: {
    id: 'midnight_train',
    label: 'Midnight Train Pack',
    desc: 'Conductor · Station whispers · Ghost passenger',
    scenes: [
      { title: 'The Conductor', overlayText: 'Tickets, please.', sceneType: AR_SCENE_TYPES.GHOST, atmosphere: AR_ATMOSPHERES.FOG, trigger: AR_TRIGGERS.AFTER_CHECKIN, assetId: 'ghost-hooded', audioId: 'aud-footsteps' },
      { title: 'Station Whispers', overlayText: 'The platform is empty.', sceneType: AR_SCENE_TYPES.MEMORY, atmosphere: AR_ATMOSPHERES.STATIC, trigger: AR_TRIGGERS.AFTER_ANSWER, assetId: 'atm-static', audioId: 'aud-whisper' },
      { title: 'Ghost Passenger', overlayText: 'Mind the gap.', revealText: 'You are not on the manifest.', sceneType: AR_SCENE_TYPES.JUMP_SCARE, atmosphere: AR_ATMOSPHERES.DARKNESS, trigger: AR_TRIGGERS.FINDER_CAPTURE, assetId: 'ghost-woman-white', jumpScare: true, isFinale: true },
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
  const base = normalizeArScene(scene);
  const next = { ...base, enabled: true, title: base.title || asset.title };
  if (asset.type === 'audio') {
    next.assetType = AR_ASSET_TYPES.NONE;
    next.audioUrl = asset.audioUrl || asset.publicUrl || asset.assetUrl || '';
    next.thumbnailUrl = asset.icon || '🔊';
  } else if (asset.type === 'video') {
    next.assetType = AR_ASSET_TYPES.VIDEO;
    next.assetUrl = asset.publicUrl || asset.assetUrl || '';
    next.thumbnailUrl = asset.previewUrl || asset.thumbnailUrl || next.assetUrl;
  } else {
    next.assetType = AR_ASSET_TYPES.IMAGE;
    next.assetUrl = asset.publicUrl || asset.assetUrl || asset.previewUrl || '';
    next.thumbnailUrl = asset.previewUrl || next.assetUrl;
  }
  if (asset.atmosphere) next.atmosphere = asset.atmosphere;
  if (asset.mediaAssetId) next.mediaAssetId = asset.mediaAssetId;
  else if (asset.id) next.mediaAssetId = asset.id;
  return normalizeArScene(next);
}

export function sceneFromPackDefinition(def, libraryAsset, audioAsset) {
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
    durationSeconds: def.durationSeconds || 10,
    jumpScare: Boolean(def.jumpScare),
  });
  if (libraryAsset) scene = insertAssetIntoScene(scene, libraryAsset);
  if (audioAsset?.audioUrl) scene = { ...scene, audioUrl: audioAsset.audioUrl };
  return scene;
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
    const arScene = sceneFromPackDefinition(def, asset, audio);
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
    setArFinale(sceneFromPackDefinition(finaleDef, asset, audio));
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

/** Phase 2 AI scaffold */
export const AI_SCENE_GENERATE_SCAFFOLD = {
  enabled: false,
  label: 'Generate Scene (Coming Soon)',
  placeholderPrompt: 'A little girl standing beneath a rusted swing at dusk.',
};
