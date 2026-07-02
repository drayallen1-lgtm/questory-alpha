/**
 * Questory 2.0 — The Codex
 * Read-only archive binding lore, NPCs, discoveries, AR, collections,
 * world discovery, creator worlds, sponsors, bosses, and seasons.
 */
import { getAdventureProgress } from './seed';
import { getAllCollectionProgress, BADGE_DEFS } from './engagement';
import { getAllCollectionStories, LORE_TYPE_META } from './loreCollectionsEngine';
import { HIDDEN_DISCOVERIES, SEED_NPCS, SECRET_COLLECTIONS } from './worldEngine';
import { getNpcMemoryRecord, getNpcRelationshipLabel, getAiNpcProfile } from './aiNpcEngine';
import { getStoryArcProgress } from './dynamicStoryEngine';
import { AR_SCENE_TYPE_LABELS } from './arEngine';
import { CREATOR_WORLDS, getCurrentSeason } from './seasonEngine';
import { getFirstDiscoveries, DISCOVERY_BADGES } from './worldDiscoveryEngine';
import { getSeasonProgress } from './questoryIdentityEngine';
import {
  normalizeLegendaryHunt,
  resolveActiveWorldBoss,
  WORLD_BOSSES,
} from './legendaryHuntEngine';
import { getNationalPassportView } from './expansion';

export const CODEX_LIMITS = {
  MAX_RECENT: 8,
  MAX_FEATURED: 4,
  MAX_ENTRIES_PER_CATEGORY: 48,
};

export const CODEX_CATEGORIES = {
  LORE: 'lore',
  NPCS: 'npcs',
  DISCOVERIES: 'discoveries',
  LANDMARKS: 'landmarks',
  RELICS: 'relics',
  AR: 'ar',
  CREATOR_WORLDS: 'creator_worlds',
  SPONSORS: 'sponsors',
  BOSSES: 'bosses',
  SEASONS: 'seasons',
  CITIES: 'cities',
  COLLECTIONS: 'collections',
};

export const CODEX_CATEGORY_META = {
  lore: { label: 'Lore', icon: '📖', subtitle: 'Journal pages, maps, secret endings' },
  npcs: { label: 'NPCs Met', icon: '👤', subtitle: 'Living guides and storykeepers' },
  discoveries: { label: 'Discoveries', icon: '🔍', subtitle: 'Hidden world secrets' },
  landmarks: { label: 'Landmarks', icon: '📍', subtitle: 'Fog cleared, first reveals' },
  relics: { label: 'Relics', icon: '✨', subtitle: 'Legendary artifacts earned' },
  ar: { label: 'AR Entities', icon: '📱', subtitle: 'Augmented memories photographed' },
  creator_worlds: { label: 'Creator Worlds', icon: '🌍', subtitle: 'Universes you have entered' },
  sponsors: { label: 'Sponsor Events', icon: '🎁', subtitle: 'Brand hunts and drops' },
  bosses: { label: 'World Bosses', icon: '🏮', subtitle: 'Legendary awakenings' },
  seasons: { label: 'Seasons', icon: '🏔️', subtitle: 'Seasonal chapters completed' },
  cities: { label: 'Cities Explored', icon: '🏙️', subtitle: 'Geographic exploration archive' },
  collections: { label: 'Collections', icon: '📘', subtitle: 'Passport series progress' },
};

export const DEFAULT_CODEX = {
  seenEntryIds: [],
  favorites: [],
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function entryBase(id, category, fields = {}) {
  return {
    id: `${category}:${id}`,
    category,
    unlocked: false,
    rarity: 'common',
    ...fields,
  };
}

export function normalizeCodex(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CODEX };
  return {
    seenEntryIds: Array.isArray(raw.seenEntryIds) ? raw.seenEntryIds.slice(0, 200) : [],
    favorites: Array.isArray(raw.favorites) ? raw.favorites.slice(0, 50) : [],
  };
}

export function markCodexEntrySeen(state, entryId) {
  if (!entryId) return state;
  const codex = normalizeCodex(state.codex);
  if (codex.seenEntryIds.includes(entryId)) return state;
  return {
    ...state,
    codex: {
      ...codex,
      seenEntryIds: [...codex.seenEntryIds, entryId].slice(-200),
    },
  };
}

function buildLoreEntries(state, adventures) {
  const stories = getAllCollectionStories(state, adventures);
  const entries = [];
  for (const story of stories) {
    for (const loreEntry of story.entries || []) {
      entries.push(
        entryBase(loreEntry.key, CODEX_CATEGORIES.LORE, {
          title: loreEntry.title || loreEntry.name || 'Untitled lore',
          subtitle: story.storyTitle,
          icon: LORE_TYPE_META[loreEntry.type]?.icon || '📜',
          typeLabel: LORE_TYPE_META[loreEntry.type]?.label || loreEntry.type,
          unlocked: loreEntry.unlocked,
          rarity: loreEntry.type === 'relic' ? 'legendary' : loreEntry.type === 'secretEnding' ? 'rare' : 'common',
          collectionId: story.collectionId,
          body: loreEntry.text || loreEntry.desc || '',
        })
      );
    }
  }
  return entries;
}

function buildNpcEntries(state) {
  const progress = state?.world?.npcProgress || {};
  return SEED_NPCS.filter((npc) => !['conductor-ghost', 'grandpa-joe', 'heritage-curator'].includes(npc.id)).map((npc) => {
    const record = progress[npc.id] || {};
    const memory = getNpcMemoryRecord(state, npc.id);
    const met = (record.visitCount || 0) > 0 || (record.seenDialogues?.length || 0) > 0 || Boolean(memory.lastSeen);
    const profile = getAiNpcProfile(npc.id);
    const storyArcs = (profile?.storyArcIds || [])
      .map((arcId) => getStoryArcProgress(state, arcId))
      .filter(Boolean);
    const activeArc = storyArcs.find((a) => a.status === 'In Progress' || a.status === 'Available');

    return entryBase(npc.id, CODEX_CATEGORIES.NPCS, {
      title: npc.name,
      subtitle: npc.role,
      icon: npc.avatar || '👤',
      unlocked: met,
      rarity: (memory.trust || record.trust || 0) >= 75 ? 'rare' : 'common',
      trust: memory.trust ?? record.trust ?? 50,
      relationship: getNpcRelationshipLabel(memory),
      dialoguesSeen: record.seenDialogues?.length || 0,
      dialoguesTotal: npc.dialogues?.length || 0,
      memoryFlags: memory.memoryFlags || [],
      keyMemories: (memory.memoryFlags || []).slice(-5),
      secretsRevealed: (memory.memoryFlags || []).filter((f) => f.includes('secret')),
      questsCompleted: memory.completedQuests || [],
      storyArcChapter: activeArc?.chapter?.title || null,
      storyArcStatus: activeArc?.status || null,
      body: met
        ? `${getNpcRelationshipLabel(memory)} — ${memory.memoryFlags?.length ? `Remembers ${memory.memoryFlags.length} moments.` : npc.dialogues?.[0]?.text}`
        : 'Meet this guide on the trail.',
    });
  });
}

function buildDiscoveryEntries(state) {
  const found = new Set(state?.world?.discoveriesFound || []);
  return HIDDEN_DISCOVERIES.map((d) =>
    entryBase(d.id, CODEX_CATEGORIES.DISCOVERIES, {
      title: d.title,
      subtitle: d.hint,
      icon: d.icon || '🔍',
      unlocked: found.has(d.id),
      rarity: d.badgeId?.includes('midnight') ? 'legendary' : 'rare',
      adventureId: d.linkedAdventureId,
      body: d.desc,
    })
  );
}

function buildLandmarkEntries(state, adventures) {
  const entries = [];
  const revealed = state?.mapExploration?.revealed || [];
  for (const area of revealed) {
    const adventure = adventures.find((a) => a.id === area.adventureId);
    entries.push(
      entryBase(area.key || area.adventureId, CODEX_CATEGORIES.LANDMARKS, {
        title: adventure?.title || 'Explored area',
        subtitle: adventure?.location || 'Fog cleared',
        icon: '🌫️',
        unlocked: true,
        rarity: 'common',
        adventureId: area.adventureId,
        revealedAt: area.revealedAt,
      })
    );
  }
  for (const first of getFirstDiscoveries(state)) {
    entries.push(
      entryBase(first.id || first.areaLabel, CODEX_CATEGORIES.LANDMARKS, {
        title: first.areaLabel,
        subtitle: `First discovered by ${first.explorerName}`,
        icon: '🥇',
        unlocked: true,
        rarity: 'legendary',
        body: first.discoveredAt ? `Recorded ${first.discoveredAt.slice(0, 10)}` : '',
      })
    );
  }
  return entries;
}

function buildRelicEntries(state, adventures) {
  const entries = [];
  const medallions = new Set(state?.economy?.exclusiveMedallions || []);
  const eventRelics = state?.world?.eventRelicsEarned || [];

  for (const story of getAllCollectionStories(state, adventures)) {
    for (const loreEntry of story.entries || []) {
      if (loreEntry.type !== 'relic' || !loreEntry.unlocked) continue;
      entries.push(
        entryBase(loreEntry.key, CODEX_CATEGORIES.RELICS, {
          title: loreEntry.name || loreEntry.title,
          subtitle: story.storyTitle,
          icon: loreEntry.icon || '✨',
          unlocked: true,
          rarity: 'legendary',
          body: loreEntry.desc,
        })
      );
    }
  }

  for (const relicId of eventRelics) {
    entries.push(
      entryBase(relicId, CODEX_CATEGORIES.RELICS, {
        title: relicId.replace(/-/g, ' '),
        subtitle: 'World event relic',
        icon: '🏆',
        unlocked: true,
        rarity: 'rare',
      })
    );
  }

  for (const medalId of medallions) {
    const badge = BADGE_DEFS[medalId];
    entries.push(
      entryBase(medalId, CODEX_CATEGORIES.RELICS, {
        title: badge?.label || medalId,
        subtitle: 'Exclusive medallion',
        icon: badge?.icon || '🏅',
        unlocked: true,
        rarity: 'legendary',
      })
    );
  }

  for (const reward of state?.rewards || []) {
    if (!reward || reward.type !== 'medallion') continue;
    entries.push(
      entryBase(reward.id, CODEX_CATEGORIES.RELICS, {
        title: reward.title,
        subtitle: reward.desc || 'Vault relic',
        icon: reward.icon || '🏅',
        unlocked: true,
        rarity: 'rare',
        adventureId: reward.adventureId,
      })
    );
  }

  return entries;
}

function buildArEntries(state, adventures) {
  const entries = [];
  for (const adventure of adventures) {
    const progress = getAdventureProgress(state, adventure.id);
    const scenes = adventure.arScenes || [];
    const completed = progress.arScenesCompleted || [];
    scenes.forEach((scene, index) => {
      const sceneId = scene.id || `scene-${index}`;
      const seen = completed.includes(sceneId) || completed.includes(index);
      entries.push(
        entryBase(`${adventure.id}-${sceneId}`, CODEX_CATEGORIES.AR, {
          title: scene.title || `${adventure.title} AR ${index + 1}`,
          subtitle: AR_SCENE_TYPE_LABELS[scene.sceneType] || 'AR memory',
          icon: scene.sceneType === 'ghost' ? '👻' : '📱',
          unlocked: seen || progress.claimed,
          rarity: scene.sceneType === 'memory' ? 'rare' : 'common',
          adventureId: adventure.id,
        })
      );
    });
    if (!scenes.length && usesArAdventure(adventure) && progress.claimed) {
      entries.push(
        entryBase(`${adventure.id}-ar`, CODEX_CATEGORIES.AR, {
          title: `${adventure.title} AR reveal`,
          subtitle: 'Photographed in the field',
          icon: '📱',
          unlocked: true,
          rarity: 'common',
          adventureId: adventure.id,
        })
      );
    }
  }
  return entries;
}

function usesArAdventure(adventure) {
  return Boolean(adventure?.arFinale?.enabled || adventure?.experienceSettings?.arEnabled);
}

function buildCreatorWorldEntries(state, adventures) {
  const visited = new Set();
  for (const adventure of adventures) {
    const worldId = adventure.creatorWorldId || adventure.creatorProfileId;
    if (!worldId) continue;
    const progress = getAdventureProgress(state, adventure.id);
    if (progress.claimed || progress.step > 0) visited.add(worldId);
  }

  return CREATOR_WORLDS.map((world) => {
    const completed = adventures.filter(
      (a) =>
        (a.creatorWorldId === world.creatorWorldId || a.creatorProfileId === world.creatorWorldId) &&
        getAdventureProgress(state, a.id).claimed
    ).length;
    const entered = visited.has(world.creatorWorldId);
    return entryBase(world.creatorWorldId, CODEX_CATEGORIES.CREATOR_WORLDS, {
      title: world.worldTitle,
      subtitle: world.creatorName,
      icon: '🌍',
      unlocked: entered,
      rarity: completed >= 3 ? 'rare' : 'common',
      body: world.featuredSeries,
      meta: { completed, total: world.totalAdventures },
    });
  });
}

function buildSponsorEntries(state, adventures) {
  const entries = [];
  for (const adventure of adventures) {
    if (!adventure.isSponsoredDrop && !adventure.sponsorVerified && !adventure.sponsorName) continue;
    const progress = getAdventureProgress(state, adventure.id);
    entries.push(
      entryBase(adventure.id, CODEX_CATEGORIES.SPONSORS, {
        title: adventure.sponsorName || adventure.sponsor || 'Sponsored hunt',
        subtitle: adventure.title,
        icon: '🎁',
        unlocked: progress.claimed,
        rarity: 'rare',
        adventureId: adventure.id,
        body: adventure.prize,
      })
    );
  }
  return entries;
}

function buildBossEntries(state, adventures) {
  const hunt = normalizeLegendaryHunt(state?.legendaryHunt);
  const active = resolveActiveWorldBoss(state, adventures);
  return WORLD_BOSSES.map((def) => {
    const defeated =
      hunt.defeatedBossIds.includes(def.bossId) || hunt.rewardsClaimed.includes(def.bossId);
    const isLive =
      active.bossId === def.bossId &&
      (active.status === 'active' || active.status === 'awakening');
    const progress = isLive ? active.communityProgress : defeated ? 100 : 0;
    return entryBase(def.bossId, CODEX_CATEGORIES.BOSSES, {
      title: def.name,
      subtitle: def.difficulty,
      icon: def.icon,
      unlocked: defeated || isLive,
      rarity: 'legendary',
      body: def.story,
      meta: { progress, lore: def.lore },
    });
  });
}

function buildSeasonEntries(state) {
  const season = getSeasonProgress(state);
  const completed = Boolean(state?.economy?.seasonalProgress?.[season.seasonId]);
  return [
    entryBase(season.seasonId, CODEX_CATEGORIES.SEASONS, {
      title: season.title,
      subtitle: `${season.daysRemaining} days remaining`,
      icon: season.badgeIcon || '🏔️',
      unlocked: completed || season.progressPct >= 100,
      rarity: 'rare',
      body: `${season.progressPct}% season progress · ${season.seasonPoints} points`,
      meta: { tier: season.tier, progressPct: season.progressPct },
    }),
  ];
}

function buildCityEntries(state) {
  const regions = getNationalPassportView(state);
  return regions.map((r) => {
    const anyStamped = r.cities?.some((c) => c.stamped);
    return entryBase(r.id, CODEX_CATEGORIES.CITIES, {
      title: r.label,
      subtitle: anyStamped ? 'Stamp collected' : r.visited ? 'Region visited' : 'Unexplored',
      icon: anyStamped ? '✅' : r.visited ? '📍' : '⬜',
      unlocked: r.visited || anyStamped,
      rarity: anyStamped ? 'rare' : 'common',
    });
  });
}

function buildCollectionEntries(state, adventures) {
  return getAllCollectionProgress(state, adventures).map((c) =>
    entryBase(c.collectionId, CODEX_CATEGORIES.COLLECTIONS, {
      title: c.name,
      subtitle: `${c.found}/${c.total} adventures`,
      icon: c.complete ? '🏆' : '📘',
      unlocked: c.found > 0,
      rarity: c.complete ? 'legendary' : c.found >= c.total / 2 ? 'rare' : 'common',
      body: c.complete ? `Badge: ${c.badgeLabel}` : `${c.pct}% complete`,
      meta: { pct: c.pct, complete: c.complete },
    })
  );
}

function buildSecretCollectionEntries(state) {
  const found = new Set(state?.world?.discoveriesFound || []);
  return SECRET_COLLECTIONS.map((col) => {
    const required = col.requiredDiscoveries || [];
    const have = required.filter((id) => found.has(id)).length;
    const complete = have >= required.length;
    return entryBase(col.id, CODEX_CATEGORIES.DISCOVERIES, {
      title: col.name,
      subtitle: col.desc,
      icon: '👁️',
      unlocked: complete,
      rarity: 'legendary',
      body: col.badgeLabel,
      meta: { have, total: required.length },
    });
  });
}

function summarizeCategory(id, entries) {
  const unlocked = entries.filter((e) => e.unlocked).length;
  const total = entries.length;
  return {
    id,
    ...CODEX_CATEGORY_META[id],
    entries: entries.slice(0, CODEX_LIMITS.MAX_ENTRIES_PER_CATEGORY),
    unlockedCount: unlocked,
    totalCount: total,
    pct: total ? Math.round((unlocked / total) * 100) : 0,
  };
}

export function getCodexSnapshot(state, adventures = [], options = {}) {
  const codex = normalizeCodex(state?.codex);
  const seenSet = new Set(codex.seenEntryIds);

  const lore = buildLoreEntries(state, adventures);
  const npcs = buildNpcEntries(state);
  const discoveries = [...buildDiscoveryEntries(state), ...buildSecretCollectionEntries(state)];
  const landmarks = buildLandmarkEntries(state, adventures);
  const relics = buildRelicEntries(state, adventures);
  const ar = buildArEntries(state, adventures);
  const creatorWorlds = buildCreatorWorldEntries(state, adventures);
  const sponsors = buildSponsorEntries(state, adventures);
  const bosses = buildBossEntries(state, adventures);
  const seasons = buildSeasonEntries(state);
  const cities = buildCityEntries(state);
  const collections = buildCollectionEntries(state, adventures);

  const categories = [
    summarizeCategory(CODEX_CATEGORIES.LORE, lore),
    summarizeCategory(CODEX_CATEGORIES.NPCS, npcs),
    summarizeCategory(CODEX_CATEGORIES.DISCOVERIES, discoveries),
    summarizeCategory(CODEX_CATEGORIES.LANDMARKS, landmarks),
    summarizeCategory(CODEX_CATEGORIES.RELICS, relics),
    summarizeCategory(CODEX_CATEGORIES.AR, ar),
    summarizeCategory(CODEX_CATEGORIES.CREATOR_WORLDS, creatorWorlds),
    summarizeCategory(CODEX_CATEGORIES.SPONSORS, sponsors),
    summarizeCategory(CODEX_CATEGORIES.BOSSES, bosses),
    summarizeCategory(CODEX_CATEGORIES.SEASONS, seasons),
    summarizeCategory(CODEX_CATEGORIES.CITIES, cities),
    summarizeCategory(CODEX_CATEGORIES.COLLECTIONS, collections),
  ];

  const allEntries = categories.flatMap((c) => c.entries);
  const unlockedTotal = allEntries.filter((e) => e.unlocked).length;
  const totalEntries = allEntries.length;

  const recentUnlocks = allEntries
    .filter((e) => e.unlocked)
    .slice(0, CODEX_LIMITS.MAX_RECENT)
    .map((e) => ({ ...e, isNew: !seenSet.has(e.id) }));

  const featured = categories
    .filter((c) => c.unlockedCount > 0 && c.unlockedCount < c.totalCount)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, CODEX_LIMITS.MAX_FEATURED)
    .map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      pct: c.pct,
      unlockedCount: c.unlockedCount,
      totalCount: c.totalCount,
    }));

  const discoveryBadges = DISCOVERY_BADGES.map((badge) => {
    const unlocked =
      (badge.id === 'first-discoverer' && (state?.mapExploration?.firstDiscoveries?.length || 0) > 0) ||
      (badge.id === 'fog-breaker' && (state?.mapExploration?.revealed?.length || 0) >= 3) ||
      (badge.id === 'cartographer' && unlockedTotal >= 12) ||
      (badge.id === 'pathfinder' && (state?.engagement?.adventuresCompleted || 0) >= 5) ||
      (badge.id === 'legend-hunter' && relics.some((r) => r.unlocked && r.rarity === 'legendary')) ||
      (badge.id === 'world-revealer' && cities.filter((c) => c.unlocked).length >= 2);
    return { ...badge, unlocked };
  });

  return {
    categories,
    stats: {
      unlockedTotal,
      totalEntries,
      overallPct: totalEntries ? Math.round((unlockedTotal / totalEntries) * 100) : 0,
      lorePct: categories.find((c) => c.id === CODEX_CATEGORIES.LORE)?.pct || 0,
      npcsMet: npcs.filter((n) => n.unlocked).length,
      discoveriesFound: discoveries.filter((d) => d.unlocked).length,
      arScenesSeen: ar.filter((a) => a.unlocked).length,
      relicsOwned: relics.filter((r) => r.unlocked).length,
      citiesExplored: cities.filter((c) => c.unlocked).length,
    },
    recentUnlocks,
    featured,
    discoveryBadges,
    newCount: recentUnlocks.filter((e) => e.isNew).length,
    codex,
  };
}
