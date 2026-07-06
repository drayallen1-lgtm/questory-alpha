/**
 * Questory 2.0 — Phase 14.5/14.75: Developer Health Engine
 * Read-only engine snapshot diagnostics for the Dev Dashboard.
 */
import { getLivingWorldSnapshot } from './livingWorldEngine.js';
import { getWorldDiscoverySnapshot } from './worldDiscoveryEngine.js';
import { getLivingEarthSnapshot } from './livingEarthEngine.js';
import { getSocialDiscoverySnapshot } from './socialWorldEngine.js';
import { getQuestoryIdentitySnapshot } from './questoryIdentityEngine.js';
import { getLegendaryHuntSnapshot } from './legendaryHuntEngine.js';
import { getCodexSnapshot } from './codexEngine.js';
import { getExplorerEconomySnapshot } from './explorerEconomyEngine.js';
import { getPlayerProgressionSnapshot } from './playerProgressionEngine.js';
import { getCraftingSnapshot } from './craftingEngine.js';
import { getMarketplaceSnapshot } from './marketplaceEngine.js';
import { getCreatorEconomySnapshot } from './creatorEconomyEngine.js';
import { getAiNpcSnapshot } from './aiNpcEngine.js';
import { getDynamicStorySnapshot } from './dynamicStoryEngine.js';
import { getFactionSnapshot } from './factionEngine.js';
import { validateClaimAttempt } from './claimSystem.js';
import {
  measureEngineSnapshot,
  approximateStateSizeBytes,
  assessStateSize,
  KNOWN_IMPORT_CYCLE_COUNT,
} from './engineSnapshotUtils.js';
import { STORAGE_KEY } from './seed.js';

function countItems(value) {
  if (value == null) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object') return Object.keys(value).length;
  return 1;
}

function runCheck(id, label, fn) {
  const { result, ms, error } = measureEngineSnapshot(id, fn);
  return {
    id,
    label,
    initialized: !error,
    snapshotOk: Boolean(result) && !error,
    itemCount: countItems(result?.items ?? result?.entries ?? result?.profiles ?? result?.arcs ?? result),
    timingMs: ms,
    error,
    sample: error ? null : summarizeSample(id, result),
  };
}

function summarizeSample(id, result) {
  if (!result) return null;
  if (id === 'world-discovery') return { level: result.level, overallPct: result.overallPct };
  if (id === 'progression') return { level: result.explorerLevel, xp: result.totalXp };
  if (id === 'legendary-hunt') return { activeBoss: result.hasActiveBoss, bosses: result.activeBosses?.length || 0 };
  if (id === 'codex') return { unlocked: result.stats?.unlockedTotal, pct: result.stats?.overallPct };
  if (id === 'marketplace') return { listings: result.stats?.totalListings, coins: result.stats?.coins };
  if (id === 'ai-npc') return { profiles: result.profiles?.length || 0 };
  if (id === 'dynamic-story') return { arcs: result.arcs?.length || 0 };
  if (id === 'factions') return { territories: result.territoryCount, contested: result.contestedCount };
  return null;
}

export function buildStateInspector(state, adventures = []) {
  const union = adventures.find((a) => a.id === 'union-depot-ghost');
  const unionProgress = state?.progress?.['union-depot-ghost'] || {};
  const npcMemory = state?.aiNpc?.npcMemory || {};
  const legendary = getLegendaryHuntSnapshot(state, adventures, { now: Date.now() });
  const discovery = getWorldDiscoverySnapshot({
    zoom: 12,
    state,
    adventures,
    fog: { revealed: state?.mapExploration?.revealed || [] },
    now: Date.now(),
  });
  const stateSize = assessStateSize(approximateStateSizeBytes(state));

  return {
    coins: state?.coins ?? 0,
    explorerLevel: getPlayerProgressionSnapshot(state, adventures).explorerLevel,
    craftedArtifacts: (state?.crafting?.craftedIds || state?.crafting?.crafted || []).length,
    activeBranchPath: unionProgress.pathId || null,
    npcMemoryCount: Object.keys(npcMemory).length,
    bossStatus: legendary.hasActiveBoss ? 'active' : 'dormant',
    factionCount: getFactionSnapshot(state, adventures).factionCount,
    contestedTerritories: getFactionSnapshot(state, adventures).contestedCount,
    worldDiscoveryPct: discovery.overallPct ?? discovery.cityPct ?? discovery.completionPercent ?? 0,
    marketplaceListingCount: getMarketplaceSnapshot(state, adventures).stats?.totalListings ?? 0,
    creatorFollows: getCreatorEconomySnapshot(state, adventures).followedCreatorIds?.length
      ?? getCreatorEconomySnapshot(state, adventures).following?.length ?? 0,
    claimCount: Object.values(state?.progress || {}).filter((p) => p?.claimed).length,
    screen: state?.screen || 'home',
    adventureId: state?.selectedAdventureId || null,
    unionClaimCode: union?.claimCode || null,
    stateSizeBytes: stateSize.bytes,
    stateSizeFormatted: stateSize.formatted,
    stateSizeSafe: stateSize.safe,
    storageKey: STORAGE_KEY,
  };
}

export function runDeveloperHealthCheck(state, adventures = [], options = {}) {
  const now = options.now || Date.now();
  const fog = { revealed: state?.mapExploration?.revealed || [] };

  const engines = [
    runCheck('living-world', 'Living World', () =>
      getLivingWorldSnapshot(adventures, { state, now })
    ),
    runCheck('world-discovery', 'World Discovery', () =>
      getWorldDiscoverySnapshot({ zoom: 12, state, adventures, fog, now })
    ),
    runCheck('living-earth', 'Living Earth', () =>
      getLivingEarthSnapshot({ zoom: 3, state, adventures, fog, now })
    ),
    runCheck('social-discovery', 'Social Discovery', () =>
      getSocialDiscoverySnapshot(state, adventures, { now })
    ),
    runCheck('questory-identity', 'Questory Identity', () =>
      getQuestoryIdentitySnapshot(state, adventures, { now })
    ),
    runCheck('legendary-hunt', 'Legendary Hunts', () =>
      getLegendaryHuntSnapshot(state, adventures, { now })
    ),
    runCheck('codex', 'Codex', () => getCodexSnapshot(state, adventures)),
    runCheck('economy', 'Economy', () => getExplorerEconomySnapshot(state, adventures)),
    runCheck('progression', 'Progression', () =>
      getPlayerProgressionSnapshot(state, adventures, { now })
    ),
    runCheck('crafting', 'Crafting', () => getCraftingSnapshot(state, adventures)),
    runCheck('marketplace', 'Marketplace', () =>
      getMarketplaceSnapshot(state, adventures, { now })
    ),
    runCheck('creator-economy', 'Creator Economy', () =>
      getCreatorEconomySnapshot(state, adventures, { now })
    ),
    runCheck('ai-npc', 'AI NPC', () => getAiNpcSnapshot(state, adventures, { now })),
    runCheck('dynamic-story', 'Dynamic Story', () =>
      getDynamicStorySnapshot(state, adventures, { now })
    ),
    runCheck('factions', 'Factions & Territories', () =>
      getFactionSnapshot(state, adventures, { now })
    ),
    runCheck('claim-flow', 'Claim Flow', () => {
      const adventure = adventures.find((a) => a.id === 'union-depot-ghost');
      const progress = state?.progress?.['union-depot-ghost'] || { step: 2, claimed: false };
      return validateClaimAttempt(adventure, progress, { code: adventure?.claimCode || 'DEPOTGHOST' });
    }),
    runCheck('branching', 'Branching', () => {
      const adventure = adventures.find((a) => a.id === 'union-depot-ghost');
      if (!adventure) return { ok: false };
      const paths = adventure.paths || adventure.branchPaths || [];
      return { ok: Array.isArray(paths) && paths.length > 0 };
    }),
  ];

  const stateSize = assessStateSize(approximateStateSizeBytes(state));
  const activeErrors = engines.filter((e) => e.error).map((e) => ({ id: e.id, error: e.error }));
  const launchErrors = (state?.launchFunnel?.errors || []).slice(0, 5);

  return {
    ranAt: new Date(now).toISOString(),
    engines,
    inspector: buildStateInspector(state, adventures),
    stateSize,
    dependencyCycles: {
      knownCount: KNOWN_IMPORT_CYCLE_COUNT,
      note: 'Madge report — seed.js hub cycles documented; not a runtime gate.',
    },
    activeErrors,
    launchErrors,
    summary: {
      total: engines.length,
      healthy: engines.filter((e) => e.snapshotOk && !e.error).length,
      failed: engines.filter((e) => e.error || !e.snapshotOk).length,
      totalTimingMs: engines.reduce((sum, e) => sum + (e.timingMs || 0), 0),
      stateSizeWarning: stateSize.warning,
    },
  };
}

export const DEVELOPER_HEALTH_ENGINE = {
  version: '1.1',
  label: 'Developer Health Engine',
};
