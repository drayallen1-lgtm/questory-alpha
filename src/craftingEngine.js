/**
 * Questory 2.0 — Phase 9: Crafting
 * Combine explorer economy materials into permanent upgrades.
 */
import { getExplorerEconomySnapshot } from './explorerEconomyEngine';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const DEFAULT_CRAFTING = {
  craftedIds: [],
  materialsSpent: {},
};

export const CRAFT_RECIPES = [
  {
    id: 'explorer_compass',
    label: 'Explorer Compass',
    icon: '🧭',
    desc: 'Permanent +5% finder discovery radius on every hunt.',
    requirements: { ancient_coin: 3, crystal_shard: 1, phoenix_feather: 1 },
    effects: { discoveryRadiusPct: 0.05 },
    permanent: true,
  },
  {
    id: 'fog_lens',
    label: 'Fog Lens',
    icon: '🔮',
    desc: 'Permanent +5% map fog reveal radius when you clear new areas.',
    requirements: { fog_essence: 2, lantern_ember: 1 },
    effects: { fogRevealRadiusPct: 0.05 },
    permanent: true,
  },
  {
    id: 'rail_token',
    label: 'Rail Token',
    icon: '🔩',
    desc: 'Permanent +3% finder discovery radius from Parsons rail history.',
    requirements: { rail_spike: 3, ancient_coin: 1 },
    effects: { discoveryRadiusPct: 0.03 },
    permanent: true,
  },
];

const MATERIAL_LABELS = {
  ancient_coin: { label: 'Ancient Coin', icon: '🪙' },
  crystal_shard: { label: 'Crystal Shard', icon: '💎' },
  phoenix_feather: { label: 'Phoenix Feather', icon: '🪶' },
  fog_essence: { label: 'Fog Essence', icon: '🌫️' },
  rail_spike: { label: 'Rail Spike', icon: '🔩' },
  lantern_ember: { label: 'Lantern Ember', icon: '🔥' },
};

export function normalizeCrafting(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CRAFTING };
  return {
    craftedIds: Array.isArray(raw.craftedIds) ? raw.craftedIds.slice(0, 20) : [],
    materialsSpent:
      raw.materialsSpent && typeof raw.materialsSpent === 'object'
        ? { ...raw.materialsSpent }
        : {},
  };
}

function getEffectiveMaterialCounts(state, adventures) {
  const snapshot = getExplorerEconomySnapshot(state, adventures);
  const counts = {};
  for (const row of snapshot.craftingMaterials) {
    counts[row.id] = row.qty;
  }
  const spent = normalizeCrafting(state?.crafting).materialsSpent;
  for (const [id, qty] of Object.entries(spent)) {
    counts[id] = Math.max(0, (counts[id] || 0) - (Number(qty) || 0));
  }
  return counts;
}

export function canCraftRecipe(state, adventures, recipeId) {
  const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return { ok: false, reason: 'Unknown recipe' };
  const crafted = normalizeCrafting(state?.crafting);
  if (recipe.permanent && crafted.craftedIds.includes(recipeId)) {
    return { ok: false, reason: 'Already crafted', alreadyCrafted: true };
  }
  const counts = getEffectiveMaterialCounts(state, adventures);
  for (const [matId, need] of Object.entries(recipe.requirements)) {
    if ((counts[matId] || 0) < need) {
      const meta = MATERIAL_LABELS[matId] || { label: matId };
      return { ok: false, reason: `Need ${need} ${meta.label}`, missing: matId };
    }
  }
  return { ok: true };
}

export function craftArtifact(state, adventures, recipeId) {
  const check = canCraftRecipe(state, adventures, recipeId);
  if (!check.ok) return { ok: false, ...check, state };
  const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
  const crafting = normalizeCrafting(state.crafting);
  const materialsSpent = { ...crafting.materialsSpent };
  for (const [matId, need] of Object.entries(recipe.requirements)) {
    materialsSpent[matId] = (materialsSpent[matId] || 0) + need;
  }
  return {
    ok: true,
    state: {
      ...state,
      crafting: {
        ...crafting,
        craftedIds: [...crafting.craftedIds, recipeId],
        materialsSpent,
      },
    },
    recipe,
  };
}

export function getCraftingBonuses(state) {
  const crafting = normalizeCrafting(state?.crafting);
  let discoveryRadiusPct = 0;
  let fogRevealRadiusPct = 0;
  for (const recipeId of crafting.craftedIds) {
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe?.effects) continue;
    discoveryRadiusPct += recipe.effects.discoveryRadiusPct || 0;
    fogRevealRadiusPct += recipe.effects.fogRevealRadiusPct || 0;
  }
  return { discoveryRadiusPct, fogRevealRadiusPct };
}

export function getDiscoveryRadiusMultiplier(state) {
  const { discoveryRadiusPct } = getCraftingBonuses(state);
  return 1 + discoveryRadiusPct;
}

export function getFogRevealRadiusMultiplier(state) {
  const { fogRevealRadiusPct } = getCraftingBonuses(state);
  return 1 + fogRevealRadiusPct;
}

export function getCraftingSnapshot(state, adventures = []) {
  const crafting = normalizeCrafting(state?.crafting);
  const counts = getEffectiveMaterialCounts(state, adventures);
  const bonuses = getCraftingBonuses(state);
  const recipes = CRAFT_RECIPES.map((recipe) => {
    const check = canCraftRecipe(state, adventures, recipe.id);
    const requirements = Object.entries(recipe.requirements).map(([id, qty]) => {
      const meta = MATERIAL_LABELS[id] || { label: id, icon: '⚗️' };
      const have = counts[id] || 0;
      return { id, qty, have, met: have >= qty, ...meta };
    });
    const alreadyCrafted = crafting.craftedIds.includes(recipe.id);
    return {
      ...recipe,
      requirements,
      canCraft: check.ok,
      alreadyCrafted,
      statusMessage: alreadyCrafted
        ? 'Crafted'
        : check.ok
          ? 'Ready to craft'
          : check.reason,
    };
  });

  const craftedArtifacts = crafting.craftedIds
    .map((id) => CRAFT_RECIPES.find((r) => r.id === id))
    .filter(Boolean);

  return wrapEngineSnapshot({
    recipes,
    craftedArtifacts,
    bonuses,
    discoveryRadiusPct: Math.round(bonuses.discoveryRadiusPct * 100),
    fogRevealRadiusPct: Math.round(bonuses.fogRevealRadiusPct * 100),
    stored: crafting,
  });
}
