/**
 * Sweep 19 — Lore & Collections Engine
 * Meaningful collection stories: journal pages, maps, videos, characters, relics, secret endings.
 */
import { getAdventureCollectionIds, getAdventuresInCollection, getCollectionProgress } from './engagement';
import { normalizeWorld } from './worldEngine';

function readAdventureCollectionLoreSettings(adventure) {
  return adventure?.experienceSettings?.collectionLore || null;
}

export const LORE_ENTRY_TYPES = {
  JOURNAL: 'journal',
  MAP: 'map',
  VIDEO: 'video',
  CHARACTER: 'character',
  SECRET_ENDING: 'secretEnding',
  RELIC: 'relic',
};

export const LORE_TYPE_META = {
  journal: { label: 'Journal Page', icon: '📖' },
  map: { label: 'Ancient Map', icon: '🗺️' },
  video: { label: 'Hidden Video', icon: '🎬' },
  character: { label: 'Character History', icon: '👤' },
  secretEnding: { label: 'Secret Ending', icon: '🔮' },
  relic: { label: 'Legendary Relic', icon: '✨' },
};

export const COLLECTION_LORE_CATALOG = {
  'parsons-legends': {
    storyTitle: 'The Parsons Legends',
    storyIntro:
      'Every depot, river, and ledger in Parsons holds a ghost story. Complete the legends to uncover the Keeper\'s Oath.',
    completionUnlock: {
      journal: [
        {
          id: 'keepers-oath',
          title: 'The Keeper\'s Oath',
          text: 'When the last lantern goes out, the legends wake — and Parsons remembers every soul who passed through.',
        },
      ],
      relic: [
        {
          id: 'parsons-black-lantern',
          name: 'Parsons Black Lantern',
          desc: 'Forged for the depot keepers — it still flickers on foggy nights.',
          icon: '🏮',
        },
      ],
    },
  },
  'forgotten-souls': {
    storyTitle: 'Forgotten Souls',
    storyIntro:
      'Four haunts. One collection. Survivors say the souls whisper between adventures.',
    completionUnlock: {
      journal: [
        {
          id: 'souls-unite',
          title: 'The Forgotten Chorus',
          text: 'Whispering Hollow, Black Lantern, Midnight Train, and the Red Barn — their spirits finally speak as one.',
        },
      ],
      secretEnding: [
        {
          id: 'souls-secret',
          title: 'The Seventh Child',
          desc: 'Legend says seven children vanished. You found the thread connecting them all.',
        },
      ],
      relic: [
        {
          id: 'soul-shard',
          name: 'Forgotten Soul Shard',
          desc: 'A fragment of every haunt you survived — cold to the touch.',
          icon: '💀',
        },
      ],
    },
  },
  'family-heirlooms': {
    storyTitle: 'Family Heirlooms',
    storyIntro: 'Grandpa\'s yard holds decades of birthday memories waiting to be rediscovered.',
    completionUnlock: {
      journal: [
        {
          id: 'family-book',
          title: 'The Heirloom Book',
          text: 'Every treasure hunt adds a page to the family book — passed down summer after summer.',
        },
      ],
    },
  },
  'scholar-trail': {
    storyTitle: 'The Scholar Trail',
    storyIntro: 'Professor Ellis turned the city into a living classroom. Master every stop to unlock the archives.',
    completionUnlock: {
      map: [
        {
          id: 'scholar-city-map',
          title: 'Scholar City Map',
          desc: 'Every learning stop marked — from the town square to the museum archives.',
        },
      ],
      relic: [
        {
          id: 'star-compass',
          name: 'Star Compass Relic',
          desc: 'Points toward the next lesson — and the next adventure.',
          icon: '🧭',
        },
      ],
    },
  },
};

const EMPTY_ENTRIES = {
  journal: [],
  map: [],
  video: [],
  character: [],
  secretEnding: [],
  relic: [],
};

export function normalizeCollectionLore(lore = {}) {
  return {
    collectionId: lore.collectionId || null,
    collectionName: lore.collectionName || '',
    storyTitle: lore.storyTitle || '',
    storyIntro: lore.storyIntro || '',
    journalPages: Array.isArray(lore.journalPages) ? lore.journalPages : [],
    maps: Array.isArray(lore.maps) ? lore.maps : [],
    videos: Array.isArray(lore.videos) ? lore.videos : [],
    characterHistories: Array.isArray(lore.characterHistories) ? lore.characterHistories : [],
    secretEndings: Array.isArray(lore.secretEndings) ? lore.secretEndings : [],
    relics: Array.isArray(lore.relics) ? lore.relics : [],
  };
}

export function resolveAdventureCollectionLore(adventure) {
  if (!adventure) return normalizeCollectionLore({});

  const fromSettings = normalizeCollectionLore(readAdventureCollectionLoreSettings(adventure) || {});
  const collectionId = adventure.collectionId || fromSettings.collectionId;
  const catalog = collectionId ? COLLECTION_LORE_CATALOG[collectionId] || {} : {};

  return normalizeCollectionLore({
    ...fromSettings,
    collectionId,
    collectionName: fromSettings.collectionName || adventure.collectionName || catalog.collectionName || '',
    storyTitle: fromSettings.storyTitle || catalog.storyTitle || adventure.collectionName || '',
    storyIntro: fromSettings.storyIntro || catalog.storyIntro || '',
  });
}

export function getCollectionLoreRecord(state, collectionId) {
  const world = normalizeWorld(state?.world);
  const raw = world.secretCollectionProgress[collectionId] || { pages: [], entries: {} };
  const entries = { ...EMPTY_ENTRIES, ...(raw.entries || {}) };

  if (Array.isArray(raw.pages)) {
    entries.journal = [...new Set([...entries.journal, ...raw.pages.map(String)])];
  }

  return {
    ...raw,
    entries,
    collectionName: raw.collectionName || '',
    collectionComplete: Boolean(raw.collectionComplete),
  };
}

function loreKey(adventureId, type, id) {
  return `${adventureId}::${type}::${id}`;
}

function catalogKey(type, id) {
  return `catalog::${type}::${id}`;
}

function mergeEntryIds(existing, type, ids) {
  const prev = Array.isArray(existing[type]) ? existing[type] : [];
  return { ...existing, [type]: [...new Set([...prev, ...ids])] };
}

function patchLoreProgress(state, collectionId, entryPatch, meta = {}) {
  const world = normalizeWorld(state.world);
  const existing = getCollectionLoreRecord(state, collectionId);
  let entries = { ...existing.entries };

  for (const [type, ids] of Object.entries(entryPatch)) {
    if (!ids?.length) continue;
    entries = mergeEntryIds(entries, type, ids);
  }

  return {
    ...state,
    world: normalizeWorld({
      ...world,
      secretCollectionProgress: {
        ...world.secretCollectionProgress,
        [collectionId]: {
          ...existing,
          ...meta,
          entries,
          pages: entries.journal.filter((k) => !k.includes('::')).map((k) => parseInt(k, 10)).filter((n) => !Number.isNaN(n)),
          lastUnlockedAt: new Date().toISOString(),
        },
      },
    }),
  };
}

function buildAdventureLoreKeys(adventure, lore, progress) {
  const id = adventure.id;
  const keys = {
    journal: lore.journalPages.map((_, index) => loreKey(id, 'journal', index)),
    map: lore.maps.map((m) => loreKey(id, 'map', m.id)),
    video: lore.videos.map((v) => loreKey(id, 'video', v.id)),
    character: lore.characterHistories.map((c) => loreKey(id, 'character', c.id)),
    relic: lore.relics.map((r) => loreKey(id, 'relic', r.id)),
    secretEnding: [],
  };

  for (const ending of lore.secretEndings) {
    if (ending.pathId && progress?.pathId !== ending.pathId) continue;
    keys.secretEnding.push(loreKey(id, 'secretEnding', ending.id));
  }

  return keys;
}

function buildCatalogCompletionKeys(collectionId) {
  const catalog = COLLECTION_LORE_CATALOG[collectionId];
  if (!catalog?.completionUnlock) return EMPTY_ENTRIES;

  const keys = { ...EMPTY_ENTRIES };
  for (const [type, items] of Object.entries(catalog.completionUnlock)) {
    keys[type] = (items || []).map((item) => catalogKey(type, item.id));
  }
  return keys;
}

/** Unlock adventure-specific lore on victory. */
export function unlockAdventureLore(state, adventure, progress) {
  const lore = resolveAdventureCollectionLore(adventure);
  if (!lore.collectionId) return state;

  const keys = buildAdventureLoreKeys(adventure, lore, progress);
  return patchLoreProgress(state, lore.collectionId, keys, {
    collectionName: lore.collectionName || adventure.collectionName,
    sourceAdventureId: adventure.id,
    storyTitle: lore.storyTitle,
  });
}

/** Unlock collection-completion lore when 100% of adventures are claimed. */
export function unlockCollectionCompletionLore(state, collectionId) {
  if (!collectionId || !COLLECTION_LORE_CATALOG[collectionId]) return state;

  const keys = buildCatalogCompletionKeys(collectionId);
  const catalog = COLLECTION_LORE_CATALOG[collectionId];

  return patchLoreProgress(state, collectionId, keys, {
    collectionComplete: true,
    storyTitle: catalog.storyTitle,
    collectionName: catalog.storyTitle,
  });
}

export function unlockLoreOnVictory(state, adventure, progress, newlyCompletedCollections = []) {
  let next = unlockAdventureLore(state, adventure, progress);

  for (const collectionId of newlyCompletedCollections) {
    next = unlockCollectionCompletionLore(next, collectionId);
  }

  return next;
}

function entryFromKey(key, adventures, collectionId) {
  const [source, type, ...rest] = key.split('::');
  const id = rest.join('::');

  if (source === 'catalog') {
    const catalog = COLLECTION_LORE_CATALOG[collectionId];
    const item = catalog?.completionUnlock?.[type]?.find((e) => e.id === id);
    if (!item) return null;
    return formatCatalogEntry(type, item, { requiresComplete: true });
  }

  const adventure = adventures.find((a) => a.id === source);
  if (!adventure) return null;
  const lore = resolveAdventureCollectionLore(adventure);
  const meta = LORE_TYPE_META[type] || { label: type, icon: '📜' };

  if (type === 'journal') {
    const index = parseInt(id, 10);
    const text = lore.journalPages[index];
    if (!text) return null;
    return {
      key,
      type,
      id,
      icon: meta.icon,
      typeLabel: meta.label,
      title: `${adventure.title} · Page ${index + 1}`,
      body: text,
      sourceAdventureTitle: adventure.title,
    };
  }

  const pools = {
    map: lore.maps,
    video: lore.videos,
    character: lore.characterHistories,
    secretEnding: lore.secretEndings,
    relic: lore.relics,
  };
  const item = (pools[type] || []).find((e) => e.id === id);
  if (!item) return null;

  return {
    key,
    type,
    id,
    icon: item.icon || meta.icon,
    typeLabel: meta.label,
    title: item.title || item.name || item.id,
    body: item.text || item.desc || item.bio || '',
    sourceAdventureTitle: adventure.title,
    videoUrl: item.url || null,
  };
}

function formatCatalogEntry(type, item, extra = {}) {
  const meta = LORE_TYPE_META[type] || { label: type, icon: '📜' };
  return {
    key: catalogKey(type, item.id),
    type,
    id: item.id,
    icon: item.icon || meta.icon,
    typeLabel: meta.label,
    title: item.title || item.name || item.id,
    body: item.text || item.desc || item.bio || '',
    sourceAdventureTitle: 'Collection Complete',
    videoUrl: item.url || null,
    ...extra,
  };
}

function collectAllLoreKeys(collectionId, adventures) {
  const keys = new Set();
  const members = getAdventuresInCollection(adventures, collectionId);

  for (const adv of members) {
    const lore = resolveAdventureCollectionLore(adv);
    const built = buildAdventureLoreKeys(adv, lore, {});
    for (const ids of Object.values(built)) {
      ids.forEach((k) => keys.add(k));
    }
    for (const ending of lore.secretEndings) {
      keys.add(loreKey(adv.id, 'secretEnding', ending.id));
    }
  }

  const catalogKeys = buildCatalogCompletionKeys(collectionId);
  for (const ids of Object.values(catalogKeys)) {
    ids.forEach((k) => keys.add(k));
  }

  return [...keys];
}

function isKeyUnlocked(key, record, collectionComplete) {
  const [source, type] = key.split('::');
  if (source === 'catalog') {
    if (!collectionComplete) return false;
    return (record.entries[type] || []).includes(key);
  }
  return (record.entries[type] || []).includes(key);
}

export function getCollectionStoryView(state, collectionId, adventures = []) {
  if (!collectionId) return null;

  const catalog = COLLECTION_LORE_CATALOG[collectionId] || {};
  const progress = getCollectionProgress(state, adventures, collectionId);
  const record = getCollectionLoreRecord(state, collectionId);
  const allKeys = collectAllLoreKeys(collectionId, adventures);

  const entries = allKeys
    .map((key) => {
      const entry = entryFromKey(key, adventures, collectionId);
      if (!entry) return null;
      return {
        ...entry,
        unlocked: isKeyUnlocked(key, record, progress.complete || record.collectionComplete),
        lockedHint: entry.requiresComplete
          ? 'Complete the full collection to unlock.'
          : 'Complete an adventure in this collection to unlock.',
      };
    })
    .filter(Boolean);

  const unlockedCount = entries.filter((e) => e.unlocked).length;
  const totalCount = entries.length || 1;

  return {
    collectionId,
    storyTitle: catalog.storyTitle || progress.name || collectionId,
    storyIntro: catalog.storyIntro || '',
    collectionProgress: progress,
    unlockedCount,
    totalCount,
    pct: Math.round((unlockedCount / totalCount) * 100),
    complete: progress.complete,
    entries,
    grouped: groupEntriesByType(entries),
  };
}

function groupEntriesByType(entries) {
  const grouped = {};
  for (const entry of entries) {
    if (!grouped[entry.type]) grouped[entry.type] = [];
    grouped[entry.type].push(entry);
  }
  return grouped;
}

export function getAllCollectionStories(state, adventures = []) {
  const ids = new Set();
  for (const adv of adventures) {
    for (const id of getAdventureCollectionIds(adv)) ids.add(id);
  }
  for (const id of Object.keys(COLLECTION_LORE_CATALOG)) ids.add(id);

  return [...ids]
    .map((id) => getCollectionStoryView(state, id, adventures))
    .filter((s) => s && (s.totalCount > 0 || s.storyIntro))
    .sort((a, b) => b.unlockedCount - a.unlockedCount || a.storyTitle.localeCompare(b.storyTitle));
}

export function getVictoryLoreReveal(state, adventure, progress, adventures = []) {
  const lore = resolveAdventureCollectionLore(adventure);
  if (!lore.collectionId) return null;

  const memberAdventures = adventures.length
    ? adventures
    : adventure
      ? [adventure]
      : [];
  const story = getCollectionStoryView(state, lore.collectionId, memberAdventures);
  const record = getCollectionLoreRecord(state, lore.collectionId);
  const keys = buildAdventureLoreKeys(adventure, lore, progress);

  const flatKeys = Object.values(keys).flat();
  const entries = flatKeys
    .map((key) => entryFromKey(key, [adventure], lore.collectionId))
    .filter(Boolean)
    .map((entry) => ({
      ...entry,
      unlocked: (record.entries[entry.type] || []).includes(entry.key),
    }));

  if (!entries.length && !lore.journalPages.length) return null;

  return {
    collectionId: lore.collectionId,
    collectionName: lore.collectionName || lore.storyTitle,
    storyTitle: lore.storyTitle,
    storyIntro: lore.storyIntro,
    entries,
    storyPct: story?.pct ?? 0,
    unlockedCount: story?.unlockedCount ?? entries.filter((e) => e.unlocked).length,
    totalCount: story?.totalCount ?? entries.length,
  };
}

export const LORE_COLLECTIONS_ENGINE = {
  version: '1.0',
  label: 'Lore & Collections Engine',
};
