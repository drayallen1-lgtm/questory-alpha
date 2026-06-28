/**
 * Sweep 15.1 — Cinematic Asset Catalog
 * Named entities with keywords, library bindings, and animation presets.
 */
export const CINEMATIC_CATEGORIES = {
  CHARACTERS: 'characters',
  OBJECTS: 'objects',
  RELICS: 'relics',
  PORTALS: 'portals',
  CREATURES: 'creatures',
};

export const CINEMATIC_CATEGORY_LABELS = {
  characters: 'Characters',
  objects: 'Objects',
  relics: 'Relics',
  portals: 'Portals & FX',
  creatures: 'Creatures',
};

/** @typedef {object} CinematicEntity */

export const CINEMATIC_ENTITIES = [
  {
    id: 'ghost_bride',
    label: 'Ghost Bride',
    desc: 'Pale figure in a torn wedding gown',
    category: CINEMATIC_CATEGORIES.CHARACTERS,
    libraryAssetId: 'ghost-woman-white',
    animPreviewId: 'anim-ghost',
    sceneType: 'ghost',
    keywords: ['ghost bride', 'woman in white', 'bride', 'widow', 'pale woman', 'white lady'],
    preset: { position: 'bottom-left', idleAnimation: 'float', silhouette: false, atmosphere: 'fog' },
  },
  {
    id: 'shadow_child',
    label: 'Shadow Child',
    desc: 'Small spirit beside the swing',
    category: CINEMATIC_CATEGORIES.CHARACTERS,
    libraryAssetId: 'ghost-little-girl',
    animPreviewId: 'anim-ghost',
    sceneType: 'ghost',
    keywords: ['shadow child', 'ghost girl', 'little girl', 'child spirit', 'daughter', 'kid'],
    preset: { position: 'bottom-left', idleAnimation: 'float', silhouette: false },
  },
  {
    id: 'hooded_watcher',
    label: 'Hooded Watcher',
    desc: 'Silent robed figure in the dark',
    category: CINEMATIC_CATEGORIES.CHARACTERS,
    libraryAssetId: 'ghost-hooded',
    animPreviewId: 'anim-ghost',
    sceneType: 'ghost',
    keywords: ['hooded man', 'hooded figure', 'watcher', 'stalker', 'robed figure', 'shadow priest'],
    preset: { position: 'center', idleAnimation: 'drift', silhouette: true, atmosphere: 'darkness' },
  },
  {
    id: 'plague_doctor',
    label: 'Plague Doctor',
    desc: 'Beaked silhouette from the old world',
    category: CINEMATIC_CATEGORIES.CHARACTERS,
    libraryAssetId: 'ghost-hooded',
    animPreviewId: 'anim-ghost',
    sceneType: 'ghost',
    keywords: ['plague doctor', 'beaked mask', 'pestilence', 'doctor', 'crow mask'],
    preset: { position: 'bottom-right', idleAnimation: 'approach', silhouette: true, atmosphere: 'darkness' },
  },
  {
    id: 'shadow_figure',
    label: 'Shadow Figure',
    desc: 'Dark silhouette beneath the trees',
    category: CINEMATIC_CATEGORIES.CHARACTERS,
    libraryAssetId: 'ghost-shadow',
    animPreviewId: 'anim-ghost',
    sceneType: 'ghost',
    keywords: ['shadow figure', 'shadow man', 'dark figure', 'silhouette', 'the shadow'],
    preset: { position: 'center', idleAnimation: 'blink', silhouette: true },
  },
  {
    id: 'forest_spirit',
    label: 'Forest Spirit',
    desc: 'Ethereal guardian of the old woods',
    category: CINEMATIC_CATEGORIES.CREATURES,
    libraryAssetId: 'ghost-woman-white',
    animPreviewId: 'anim-tree',
    sceneType: 'ghost',
    keywords: ['forest spirit', 'wood spirit', 'nature ghost', 'dryad', 'tree spirit'],
    preset: { position: 'far', idleAnimation: 'breathe', atmosphere: 'fog' },
  },
  {
    id: 'floating_lantern',
    label: 'Floating Lantern',
    desc: 'Black lantern with an unsteady flame',
    category: CINEMATIC_CATEGORIES.OBJECTS,
    libraryAssetId: 'obj-lantern',
    animPreviewId: 'anim-lantern',
    sceneType: 'object',
    keywords: ['floating lantern', 'black lantern', 'lantern', 'flame', 'torch', 'flickering light'],
    preset: { position: 'center', idleAnimation: 'pulse', atmosphere: 'lantern' },
  },
  {
    id: 'cursed_doll',
    label: 'Cursed Doll',
    desc: 'Broken porcelain stare',
    category: CINEMATIC_CATEGORIES.OBJECTS,
    libraryAssetId: 'obj-doll',
    animPreviewId: 'anim-ghost',
    sceneType: 'object',
    keywords: ['cursed doll', 'broken doll', 'porcelain doll', 'doll'],
    preset: { position: 'bottom-left', idleAnimation: 'blink' },
  },
  {
    id: 'diary_page',
    label: 'Diary Page',
    desc: 'Torn page with fresh ink',
    category: CINEMATIC_CATEGORIES.OBJECTS,
    libraryAssetId: 'obj-diary',
    sceneType: 'diary',
    keywords: ['diary', 'journal', 'torn page', 'diary page', 'old book'],
    preset: { position: 'center', idleAnimation: 'float', atmosphere: 'lantern' },
  },
  {
    id: 'dead_tree',
    label: 'Dead Tree',
    desc: 'Branches stir without wind',
    category: CINEMATIC_CATEGORIES.OBJECTS,
    libraryAssetId: 'obj-dead-tree',
    animPreviewId: 'anim-tree',
    sceneType: 'object',
    keywords: ['dead tree', 'oak tree', 'old tree', 'branches', 'woods', 'forest'],
    preset: { position: 'center', idleAnimation: 'drift', atmosphere: 'darkness' },
  },
  {
    id: 'abandoned_swing',
    label: 'Abandoned Swing',
    desc: 'Chains creak in the empty yard',
    category: CINEMATIC_CATEGORIES.OBJECTS,
    libraryAssetId: 'obj-swing',
    animPreviewId: 'anim-swing',
    sceneType: 'object',
    keywords: ['swing set', 'swing', 'playground', 'porch swing', 'yard'],
    preset: { position: 'center', idleAnimation: 'float' },
  },
  {
    id: 'glowing_relic',
    label: 'Glowing Relic',
    desc: 'Artifact pulsing with cold light',
    category: CINEMATIC_CATEGORIES.RELICS,
    libraryAssetId: 'obj-lantern',
    animPreviewId: 'anim-lantern',
    sceneType: 'object',
    keywords: ['glowing relic', 'relic', 'artifact', 'ancient relic', 'crystal glow'],
    preset: { position: 'center', idleAnimation: 'pulse', atmosphere: 'flash' },
  },
  {
    id: 'crystal_shard',
    label: 'Crystal Shard',
    desc: 'Shard humming with trapped light',
    category: CINEMATIC_CATEGORIES.RELICS,
    libraryAssetId: 'obj-diary',
    sceneType: 'object',
    keywords: ['crystal shard', 'crystal', 'shard', 'gem', 'phoenix feather'],
    preset: { position: 'center', idleAnimation: 'pulse', atmosphere: 'flash' },
  },
  {
    id: 'treasure_chest',
    label: 'Treasure Chest',
    desc: 'Weathered chest half-buried in moss',
    category: CINEMATIC_CATEGORIES.RELICS,
    libraryAssetId: 'obj-musicbox',
    sceneType: 'object',
    keywords: ['treasure chest', 'chest', 'loot', 'dragon egg', 'buried treasure'],
    preset: { position: 'bottom-left', idleAnimation: 'breathe' },
  },
  {
    id: 'ancient_portal',
    label: 'Ancient Portal',
    desc: 'Static rift between worlds',
    category: CINEMATIC_CATEGORIES.PORTALS,
    libraryAssetId: 'atm-static',
    sceneType: 'portal',
    keywords: ['portal', 'gateway', 'rift', 'ancient portal', 'door opens', 'ufo'],
    preset: { position: 'center', idleAnimation: 'pulse', atmosphere: 'static' },
  },
  {
    id: 'skeleton_knight',
    label: 'Skeleton Knight',
    desc: 'Armored bones in the mist',
    category: CINEMATIC_CATEGORIES.CREATURES,
    libraryAssetId: 'ghost-hooded',
    animPreviewId: 'anim-ghost',
    sceneType: 'ghost',
    keywords: ['skeleton knight', 'skeleton', 'knight', 'armored bones'],
    preset: { position: 'center', idleAnimation: 'approach', silhouette: true },
  },
  {
    id: 'pirate_captain',
    label: 'Pirate Captain',
    desc: 'Salt-stained ghost of the deck',
    category: CINEMATIC_CATEGORIES.CHARACTERS,
    libraryAssetId: 'ghost-hooded',
    sceneType: 'ghost',
    keywords: ['pirate captain', 'pirate', 'captain', 'ship ghost', 'buccaneer'],
    preset: { position: 'bottom-right', idleAnimation: 'drift', silhouette: true },
  },
];

const ENTITY_BY_ID = Object.fromEntries(CINEMATIC_ENTITIES.map((e) => [e.id, e]));

function normalizeMatchText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCinematicEntity(entityId) {
  return ENTITY_BY_ID[entityId] || null;
}

export function getCinematicCategories() {
  return Object.entries(CINEMATIC_CATEGORY_LABELS).map(([id, label]) => ({ id, label }));
}

export function listEntitiesByCategory(category) {
  if (!category) return [...CINEMATIC_ENTITIES];
  return CINEMATIC_ENTITIES.filter((e) => e.category === category);
}

export function matchCinematicEntities(text, limit = 3) {
  const normalized = normalizeMatchText(text);
  if (!normalized) return [];

  const hits = [];
  for (const entity of CINEMATIC_ENTITIES) {
    let bestScore = 0;
    let matchedKeyword = '';
    for (const kw of entity.keywords) {
      if (normalized.includes(kw) && kw.length > bestScore) {
        bestScore = kw.length;
        matchedKeyword = kw;
      }
    }
    if (bestScore > 0) {
      hits.push({ entity, score: bestScore, matchedKeyword });
    }
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((h) => ({ ...h.entity, matchedKeyword: h.matchedKeyword, score: h.score }));
}

/** Legacy dictionary shape for aiSceneGenerator compatibility */
export function toHorrorDictionaryShape() {
  const characters = [];
  const locations = [];
  const seenChar = new Set();
  const seenLoc = new Set();

  for (const entity of CINEMATIC_ENTITIES) {
    const entry = {
      keywords: entity.keywords,
      assetId: entity.libraryAssetId,
      label: entity.label,
      entityId: entity.id,
    };
    if (
      entity.category === CINEMATIC_CATEGORIES.CHARACTERS ||
      entity.category === CINEMATIC_CATEGORIES.CREATURES
    ) {
      if (!seenChar.has(entity.libraryAssetId)) {
        characters.push(entry);
        seenChar.add(entity.libraryAssetId);
      }
    } else if (
      entity.category === CINEMATIC_CATEGORIES.OBJECTS ||
      entity.category === CINEMATIC_CATEGORIES.RELICS
    ) {
      if (!seenLoc.has(entity.libraryAssetId)) {
        locations.push(entry);
        seenLoc.add(entity.libraryAssetId);
      }
    }
  }

  return { characters, locations };
}

export const CINEMATIC_ASSET_ENGINE = {
  version: '1.0',
  entityCount: CINEMATIC_ENTITIES.length,
  label: 'Cinematic Asset Catalog',
};
