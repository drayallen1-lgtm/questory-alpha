/**
 * Sweep 18 — Branching Adventure Engine
 * Path commits, clue variants, finale variants, and victory effects.
 */
import { normalizeArScene, emptyArScene } from './arEngine';
import { getAdventureProgress } from './seed';
import {
  normalizeWorld,
  normalizeWorldConfig,
  resolveAdventureEnding,
  selectBranchPath as baseSelectBranchPath,
} from './worldEngine';

export const PATH_META = {
  brave: { label: 'Brave Path', icon: '⚔️', tone: 'intense' },
  cautious: { label: 'Cautious Path', icon: '🕯️', tone: 'calm' },
  ghost: { label: 'Shadow Path', icon: '👻', tone: 'dark' },
  historian: { label: 'Historian Path', icon: '📜', tone: 'scholarly' },
  sanctuary: { label: 'Sanctuary Path', icon: '✝️', tone: 'reverent' },
  garden: { label: 'Garden Path', icon: '🌿', tone: 'peaceful' },
  exhibit: { label: 'Exhibit Path', icon: '🏛️', tone: 'curious' },
};

export function isBranchingAdventure(adventure) {
  if (!adventure) return false;
  if (adventure.worldConfig?.branchingEnabled) return true;
  return (adventure.clues || []).some((c) => c.branchOptions?.length > 0);
}

export function getPathMeta(pathId) {
  if (!pathId) return { label: 'Default', icon: '🔀', tone: 'neutral' };
  return PATH_META[pathId] || {
    label: String(pathId).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: '🔀',
    tone: 'neutral',
  };
}

export function previewPathOutcome(adventure, pathId) {
  const config = normalizeWorldConfig(adventure?.worldConfig);
  const ending = config.alternateEndings.find((e) => e.pathId === pathId);
  const meta = getPathMeta(pathId);
  return {
    pathId,
    ...meta,
    endingTitle: ending?.title || `${meta.label} ending`,
    endingDesc: ending?.description || 'Your choice shapes the finale.',
    medallionTitle: ending?.medallionTitle || null,
    discoveryUnlock: ending?.discoveryUnlock || null,
  };
}

export function getBranchSummary(adventure, progress) {
  const pathId = progress?.pathId;
  if (!pathId || !isBranchingAdventure(adventure)) return null;

  const meta = getPathMeta(pathId);
  const ending = resolveAdventureEnding(adventure, progress);
  const choices = progress?.branchChoices || {};

  return {
    pathId,
    ...meta,
    endingTitle: ending?.title,
    endingDesc: ending?.description,
    medallionTitle: ending?.medallionTitle,
    choiceCount: Object.keys(choices).length,
    committedAt: progress?.branchCommittedAt || null,
  };
}

/**
 * Apply active path to a clue — variants, gating, AR overrides.
 */
export function applyBranchToClue(adventure, clue, progress) {
  if (!clue) return clue;
  const pathId = progress?.pathId;
  if (!pathId) return clue;

  if (Array.isArray(clue.skipPaths) && clue.skipPaths.includes(pathId)) {
    return { ...clue, _branchSkipped: true, _directorVariant: pathId };
  }

  if (Array.isArray(clue.pathsRequired) && !clue.pathsRequired.includes(pathId)) {
    return { ...clue, _branchSkipped: true, _directorVariant: pathId };
  }

  const variant = clue.pathVariants?.[pathId];
  if (!variant) {
    return { ...clue, _directorVariant: pathId };
  }

  return {
    ...clue,
    title: variant.title || clue.title,
    text: variant.text || clue.text,
    arScene: variant.arScene?.enabled ? normalizeArScene(variant.arScene) : clue.arScene,
    bonusRewardText: variant.bonusRewardText || clue.bonusRewardText,
    _directorVariant: pathId,
  };
}

export function resolveBranchFinale(adventure, progress) {
  if (!adventure || !progress?.pathId) {
    return emptyArScene();
  }

  const config = normalizeWorldConfig(adventure.worldConfig);
  const variants =
    adventure.pathFinaleVariants ||
    config.pathFinaleVariants ||
    adventure.worldConfig?.pathFinaleVariants ||
    {};

  const pathScene = variants[progress.pathId];
  if (pathScene?.enabled) {
    return normalizeArScene(pathScene);
  }

  return emptyArScene();
}

export function getAdventureArFinaleForProgress(adventure, progress) {
  const branchFinale = resolveBranchFinale(adventure, progress);
  if (branchFinale?.enabled) return branchFinale;
  return normalizeArScene(adventure?.arFinale || adventure?.ar_finale || {});
}

export function commitBranchPath(state, adventure, pathId, clueIndex) {
  if (!adventure?.id) return state;

  let next = baseSelectBranchPath(state, adventure.id, pathId, clueIndex);
  const progress = getAdventureProgress(next, adventure.id);
  const meta = getPathMeta(pathId);

  next = {
    ...next,
    progress: {
      ...next.progress,
      [adventure.id]: {
        ...progress,
        pathId,
        branchCommittedAt: progress.branchCommittedAt || new Date().toISOString(),
        pathLabel: meta.label,
      },
    },
  };

  return applyBranchChoiceWorldEffects(next, adventure, pathId);
}

function applyBranchChoiceWorldEffects(state, adventure, pathId) {
  const preview = previewPathOutcome(adventure, pathId);
  if (!preview.discoveryUnlock) return state;

  const world = normalizeWorld(state.world);
  if (world.discoveriesFound.includes(preview.discoveryUnlock)) return state;

  return {
    ...state,
    world: normalizeWorld({
      ...world,
      discoveriesFound: [...world.discoveriesFound, preview.discoveryUnlock],
    }),
  };
}

export function applyBranchVictoryEffects(state, adventure, progress) {
  const ending = resolveAdventureEnding(adventure, progress);
  if (!ending?.pathId) return state;

  let next = state;
  const world = normalizeWorld(next.world);

  if (ending.discoveryUnlock && !world.discoveriesFound.includes(ending.discoveryUnlock)) {
    next = {
      ...next,
      world: normalizeWorld({
        ...world,
        discoveriesFound: [...world.discoveriesFound, ending.discoveryUnlock],
      }),
    };
  }

  if (ending.passportStamp) {
    const badges = normalizeWorld(next.world).limitedBadgesEarned;
    if (!badges.includes(ending.passportStamp)) {
      next = {
        ...next,
        world: normalizeWorld({
          ...normalizeWorld(next.world),
          limitedBadgesEarned: [...badges, ending.passportStamp],
        }),
      };
    }
  }

  if (ending.collectionUnlock) {
    const collectionId = ending.collectionUnlock;
    const existing = normalizeWorld(next.world).secretCollectionProgress[collectionId] || { pages: [] };
    next = {
      ...next,
      world: normalizeWorld({
        ...normalizeWorld(next.world),
        secretCollectionProgress: {
          ...normalizeWorld(next.world).secretCollectionProgress,
          [collectionId]: {
            ...existing,
            branchUnlocked: true,
            pathId: ending.pathId,
            lastUnlockedAt: new Date().toISOString(),
          },
        },
      }),
    };
  }

  return next;
}

export const BRANCHING_ENGINE = {
  version: '1.0',
  label: 'Branching Adventure Engine',
};
