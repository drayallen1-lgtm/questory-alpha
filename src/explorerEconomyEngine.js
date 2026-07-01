/**
 * Questory 2.0 — Phase 7: Explorer Economy
 * Persistent currencies and inventory derived from discoveries, victories, and seasons.
 */
import { getAdventureProgress } from './seed';
import { getAllCollectionStories } from './loreCollectionsEngine';
import { getSeasonProgress } from './questoryIdentityEngine';
import { CREATOR_WORLDS } from './seasonEngine';

export const CURRENCY_TYPES = {
  COINS: 'coins',
  RELICS: 'relics',
  ANCIENT_KEYS: 'ancientKeys',
  TREASURE_MAPS: 'treasureMaps',
  WORLD_SHARDS: 'worldShards',
  CRAFTING_MATERIALS: 'craftingMaterials',
  BOSS_LOOT: 'bossLoot',
  SEASONAL_TOKENS: 'seasonalTokens',
};

export const CURRENCY_META = {
  coins: { label: 'Coins', icon: '🪙', desc: 'Spend on hints, skips, and premium hunts' },
  relics: { label: 'Relics', icon: '✨', desc: 'Legendary artifacts from collections and events' },
  ancientKeys: { label: 'Ancient Keys', icon: '🗝️', desc: 'Unlock secret areas and creator vaults' },
  treasureMaps: { label: 'Treasure Maps', icon: '🗺️', desc: 'Reveal hidden hunt locations' },
  worldShards: { label: 'World Shards', icon: '💠', desc: 'Fragments of the Living Earth' },
  craftingMaterials: { label: 'Crafting Materials', icon: '⚗️', desc: 'Combine into permanent upgrades' },
  bossLoot: { label: 'Boss Loot', icon: '🏮', desc: 'Rewards from World Boss victories' },
  seasonalTokens: { label: 'Seasonal Tokens', icon: '🏔️', desc: 'Redeem during active seasons' },
};

export const DEFAULT_EXPLORER_ECONOMY = {
  ancientKeys: 0,
  treasureMaps: 0,
  worldShards: 0,
  craftingMaterials: {},
  bossLoot: [],
  seasonalTokens: {},
  relicInventory: [],
  earnedHistory: [],
};

const MATERIAL_DEFS = {
  ancient_coin: { label: 'Ancient Coin', icon: '🪙', rarity: 'common' },
  crystal_shard: { label: 'Crystal Shard', icon: '💎', rarity: 'rare' },
  phoenix_feather: { label: 'Phoenix Feather', icon: '🪶', rarity: 'legendary' },
  fog_essence: { label: 'Fog Essence', icon: '🌫️', rarity: 'common' },
  rail_spike: { label: 'Rail Spike', icon: '🔩', rarity: 'common' },
  lantern_ember: { label: 'Lantern Ember', icon: '🔥', rarity: 'rare' },
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function normalizeExplorerEconomy(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_EXPLORER_ECONOMY };
  return {
    ancientKeys: Math.max(0, Number(raw.ancientKeys) || 0),
    treasureMaps: Math.max(0, Number(raw.treasureMaps) || 0),
    worldShards: Math.max(0, Number(raw.worldShards) || 0),
    craftingMaterials:
      raw.craftingMaterials && typeof raw.craftingMaterials === 'object'
        ? { ...raw.craftingMaterials }
        : {},
    bossLoot: Array.isArray(raw.bossLoot) ? raw.bossLoot.slice(0, 20) : [],
    seasonalTokens:
      raw.seasonalTokens && typeof raw.seasonalTokens === 'object' ? { ...raw.seasonalTokens } : {},
    relicInventory: Array.isArray(raw.relicInventory) ? raw.relicInventory.slice(0, 40) : [],
    earnedHistory: Array.isArray(raw.earnedHistory) ? raw.earnedHistory.slice(0, 50) : [],
  };
}

function deriveRelicsFromLore(state, adventures) {
  const relics = [];
  for (const story of getAllCollectionStories(state, adventures)) {
    for (const entry of story.entries || []) {
      if (entry.type === 'relic' && entry.unlocked) {
        relics.push({
          id: entry.key,
          name: entry.name || entry.title,
          icon: entry.icon || '✨',
          source: story.storyTitle,
        });
      }
    }
  }
  return relics;
}

function deriveMaterialsFromProgress(state, adventures) {
  const materials = { ...DEFAULT_EXPLORER_ECONOMY.craftingMaterials };
  let completed = 0;
  for (const adventure of adventures) {
    const progress = getAdventureProgress(state, adventure.id);
    if (!progress.claimed) continue;
    completed += 1;
    materials.ancient_coin = (materials.ancient_coin || 0) + 1;
    if (/horror|ghost|lantern/i.test(adventure.title || '')) {
      materials.lantern_ember = (materials.lantern_ember || 0) + 1;
    }
    if (/rail|depot|iron/i.test(adventure.title || '')) {
      materials.rail_spike = (materials.rail_spike || 0) + 1;
    }
    if ((state?.mapExploration?.revealed?.length || 0) > 0) {
      materials.fog_essence = (materials.fog_essence || 0) + 1;
    }
  }
  if (completed >= 5) materials.crystal_shard = (materials.crystal_shard || 0) + 1;
  if (completed >= 8) materials.phoenix_feather = (materials.phoenix_feather || 0) + 1;
  return materials;
}

function deriveSeasonalTokens(state) {
  const season = getSeasonProgress(state);
  const stored = state?.explorerEconomy?.seasonalTokens || {};
  const points = state?.social?.seasonPoints ?? 0;
  return {
    [season.seasonId]: stored[season.seasonId] ?? Math.floor(points / 10),
  };
}

export function getExplorerEconomySnapshot(state, adventures = [], options = {}) {
  const stored = normalizeExplorerEconomy(state?.explorerEconomy);
  const coins = Number(state?.coins) || 0;
  const loreRelics = deriveRelicsFromLore(state, adventures);
  const relicInventory = [
    ...stored.relicInventory,
    ...loreRelics.filter((r) => !stored.relicInventory.some((s) => s.id === r.id)),
  ];

  const completedCount = adventures.filter((a) => getAdventureProgress(state, a.id).claimed).length;
  const fogReveals = state?.mapExploration?.revealed?.length || 0;

  const ancientKeys = stored.ancientKeys + Math.floor(completedCount / 3);
  const treasureMaps = stored.treasureMaps + Math.floor(fogReveals / 2);
  const worldShards =
    stored.worldShards +
    Math.floor(fogReveals / 4) +
    seededBonus(state, 'shards', 2, 6);

  const craftingMaterials = {
    ...deriveMaterialsFromProgress(state, adventures),
    ...stored.craftingMaterials,
  };

  const bossLoot = stored.bossLoot.length
    ? stored.bossLoot
    : completedCount >= 3
      ? [{ id: 'lantern-fragment', name: 'Black Lantern Fragment', icon: '🏮', qty: 1 }]
      : [];

  const seasonalTokens = deriveSeasonalTokens(state);

  const wallets = [
    { type: CURRENCY_TYPES.COINS, amount: coins, ...CURRENCY_META.coins },
    { type: CURRENCY_TYPES.RELICS, amount: relicInventory.length, ...CURRENCY_META.relics },
    { type: CURRENCY_TYPES.ANCIENT_KEYS, amount: ancientKeys, ...CURRENCY_META.ancientKeys },
    { type: CURRENCY_TYPES.TREASURE_MAPS, amount: treasureMaps, ...CURRENCY_META.treasureMaps },
    { type: CURRENCY_TYPES.WORLD_SHARDS, amount: worldShards, ...CURRENCY_META.worldShards },
    {
      type: CURRENCY_TYPES.CRAFTING_MATERIALS,
      amount: Object.values(craftingMaterials).reduce((s, n) => s + (Number(n) || 0), 0),
      ...CURRENCY_META.craftingMaterials,
    },
    { type: CURRENCY_TYPES.BOSS_LOOT, amount: bossLoot.length, ...CURRENCY_META.bossLoot },
    {
      type: CURRENCY_TYPES.SEASONAL_TOKENS,
      amount: Object.values(seasonalTokens).reduce((s, n) => s + (Number(n) || 0), 0),
      ...CURRENCY_META.seasonalTokens,
    },
  ];

  const materialRows = Object.entries(craftingMaterials)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({
      id,
      qty,
      ...(MATERIAL_DEFS[id] || { label: id, icon: '⚗️', rarity: 'common' }),
    }));

  const creatorWorldBonuses = CREATOR_WORLDS.map((w) => ({
    id: w.creatorWorldId,
    label: w.worldTitle,
    bonusShards: seededBonus(state, w.creatorWorldId, 1, 4),
  }));

  return {
    wallets,
    relicInventory,
    craftingMaterials: materialRows,
    bossLoot,
    seasonalTokens,
    creatorWorldBonuses,
    stats: {
      completedAdventures: completedCount,
      fogReveals,
      totalWealth: coins + relicInventory.length * 50 + worldShards * 10,
    },
    stored,
  };
}

function seededBonus(state, key, min, max) {
  const dateKey = new Date().toDateString();
  const span = max - min + 1;
  return min + (hashSeed(`${key}-${dateKey}-${state?.coins || 0}`) % span);
}

export function grantExplorerCurrency(state, type, amount, source = '') {
  const economy = normalizeExplorerEconomy(state.explorerEconomy);
  const next = { ...economy };
  const entry = { type, amount, source, at: new Date().toISOString() };

  if (type === CURRENCY_TYPES.COINS) {
    return { state: { ...state, coins: (state.coins || 0) + amount }, entry };
  }
  if (type === CURRENCY_TYPES.ANCIENT_KEYS) next.ancientKeys += amount;
  else if (type === CURRENCY_TYPES.TREASURE_MAPS) next.treasureMaps += amount;
  else if (type === CURRENCY_TYPES.WORLD_SHARDS) next.worldShards += amount;
  else if (type === CURRENCY_TYPES.SEASONAL_TOKENS) {
    const seasonId = getSeasonProgress(state).seasonId;
    next.seasonalTokens = {
      ...next.seasonalTokens,
      [seasonId]: (next.seasonalTokens[seasonId] || 0) + amount,
    };
  }

  next.earnedHistory = [...next.earnedHistory, entry].slice(-50);
  return { state: { ...state, explorerEconomy: next }, entry };
}
