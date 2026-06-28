/**
 * Sweep 14.2 — Adventure Director runtime
 * Consumes director-generated data during play (intro, chapters, NPCs, lore, branches).
 */
import {
  getNpcsForAdventure,
  getNpcDialogue,
  normalizeWorld,
  resolveAdventureEnding,
} from './worldEngine';

export function isDirectorAdventure(adventure) {
  return Boolean(adventure?.experienceSettings?.directorGenerated);
}

export function getDirectorStoryArc(adventure) {
  return adventure?.experienceSettings?.storyArc || null;
}

export function getDirectorCollectionLore(adventure) {
  return adventure?.experienceSettings?.collectionLore || null;
}

export function getDirectorIntroContent(adventure) {
  const arc = getDirectorStoryArc(adventure);
  const npcs = getNpcsForAdventure(adventure);
  const guide = npcs[0];
  const introDialogue = guide ? getNpcDialogue(guide, 'intro') : null;

  return {
    isDirector: isDirectorAdventure(adventure),
    title: adventure?.title,
    hook: arc?.hook || adventure?.story || '',
    mystery: arc?.mystery || '',
    guideName: guide?.name || null,
    guideAvatar: guide?.avatar || '🎭',
    guideLine: introDialogue?.text || null,
    collectionName: adventure?.collectionName || null,
    characterNames: npcs.map((n) => n.name).filter(Boolean),
  };
}

/** Story-beat subtitle for clue chapters based on arc phase. */
export function getDirectorChapterBeat(adventure, clueIndex, totalClues) {
  const arc = getDirectorStoryArc(adventure);
  if (!arc) return null;

  if (clueIndex === 0) return arc.mystery || arc.hook;
  const ratio = totalClues > 1 ? clueIndex / (totalClues - 1) : 1;
  if (ratio < 0.45) return arc.rising;
  if (ratio < 0.85) return arc.reveals;
  return arc.finale;
}

/** Pick NPC + dialogue for the current clue. */
export function getDirectorNpcContext(adventure, clueIndex) {
  if (!isDirectorAdventure(adventure)) return null;

  const npcs = getNpcsForAdventure(adventure);
  if (!npcs.length) return null;

  const npc = npcs[Math.min(clueIndex, npcs.length - 1)];
  const dialogueId = clueIndex === 0 ? 'intro' : `clue-${clueIndex}`;

  let dialogue = getNpcDialogue(npc, dialogueId);
  if (!dialogue && clueIndex > 0) {
    dialogue = getNpcDialogue(npc, 'branch');
  }
  if (!dialogue) {
    dialogue = getNpcDialogue(npc, 'intro');
  }
  if (!dialogue) return null;

  return {
    npc,
    dialogue,
    dialogueId: dialogue.id || dialogueId,
  };
}

/** Branch-path flavor shown after the player chooses a path. */
export function getDirectorBranchFlavor(adventure, progress) {
  if (!isDirectorAdventure(adventure) || !progress?.pathId) return null;

  const ending = resolveAdventureEnding(adventure, progress);
  const flavors = {
    brave: 'The shadows welcome the bold — stay alert.',
    cautious: 'You chose the safer route — watch for hidden signs.',
    ghost: 'The platform shadows deepen around you.',
    historian: 'Archive whispers guide your next steps.',
    sanctuary: 'The sanctuary path opens — walk with purpose.',
    garden: 'The garden path blooms with quiet blessings.',
    exhibit: 'The main exhibit holds your next discovery.',
  };

  return {
    pathId: progress.pathId,
    title: ending?.title || null,
    hint: flavors[progress.pathId] || ending?.description || null,
  };
}

export function getUnlockedLorePages(state, collectionId) {
  if (!collectionId) return [];
  const world = normalizeWorld(state?.world);
  return world.secretCollectionProgress[collectionId]?.pages || [];
}

/** Unlock journal pages on adventure completion. */
export function unlockDirectorLoreOnVictory(state, adventure) {
  if (!isDirectorAdventure(adventure)) return state;

  const lore = getDirectorCollectionLore(adventure);
  const collectionId = adventure.collectionId || lore?.collectionId;
  if (!collectionId || !lore?.journalPages?.length) return state;

  const world = normalizeWorld(state.world);
  const existing = world.secretCollectionProgress[collectionId] || { pages: [] };
  const allIndices = lore.journalPages.map((_, i) => i);
  const pages = [...new Set([...(existing.pages || []), ...allIndices])];

  return {
    ...state,
    world: normalizeWorld({
      ...world,
      secretCollectionProgress: {
        ...world.secretCollectionProgress,
        [collectionId]: {
          ...existing,
          pages,
          collectionName: lore.collectionName || adventure.collectionName,
          lastUnlockedAt: new Date().toISOString(),
          sourceAdventureId: adventure.id,
        },
      },
    }),
  };
}

export function getDirectorVictoryLore(state, adventure) {
  const lore = getDirectorCollectionLore(adventure);
  if (!lore?.journalPages?.length) return null;

  const collectionId = adventure.collectionId || lore.collectionId;
  const unlocked = getUnlockedLorePages(state, collectionId);
  const pages = lore.journalPages.map((text, index) => ({
    index,
    text,
    unlocked: unlocked.includes(index),
  }));

  return {
    collectionId,
    collectionName: lore.collectionName || adventure.collectionName,
    pages,
    newlyUnlocked: pages.every((p) => p.unlocked),
  };
}

/**
 * Apply path-specific clue variant when player has chosen a branch.
 */
export function resolveDirectorClue(adventure, clue, progress) {
  if (!clue || !progress?.pathId || !clue.pathVariants) return clue;

  const variant = clue.pathVariants[progress.pathId];
  if (!variant) return clue;

  return {
    ...clue,
    title: variant.title || clue.title,
    text: variant.text || clue.text,
    arScene:
      variant.arScene?.enabled ? variant.arScene : clue.arScene,
    _directorVariant: progress.pathId,
  };
}

export function countDirectorPathVariants(adventure) {
  if (!isDirectorAdventure(adventure)) return 0;
  return (adventure.clues || []).filter(
    (c) => c.pathVariants && Object.keys(c.pathVariants).length > 0
  ).length;
}
