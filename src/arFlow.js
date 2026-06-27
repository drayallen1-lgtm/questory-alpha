import { useCallback, useState } from 'react';
import {
  getArSceneId,
  getClueArScene,
  markArSceneComplete,
  matchesArTrigger,
  shouldPlayArScene,
} from './arEngine';

/** Pure resolver — decides what happens when an AR trigger fires. */
export function resolveArQueueAction({
  adventure,
  progress,
  clue,
  atClaim,
  trigger,
  advanceClue = false,
  forceReplay = false,
}) {
  const shouldAdvance = advanceClue && !forceReplay;

  if (atClaim || !clue) {
    return { type: shouldAdvance ? 'advance_only' : 'noop' };
  }

  const scene = getClueArScene(clue);
  if (!matchesArTrigger(scene, trigger)) {
    return { type: shouldAdvance ? 'advance_only' : 'noop' };
  }

  const sceneId = getArSceneId(adventure.id, clue.id, 'clue');
  if (!shouldPlayArScene(scene, progress, sceneId, { forceReplay })) {
    return { type: shouldAdvance ? 'advance_only' : 'noop' };
  }

  return {
    type: 'queue',
    scene,
    sceneId,
    advanceClue: shouldAdvance,
  };
}

export function getClueArReplayMeta(adventure, progress, clue, atClaim) {
  const clueArScene = !atClaim && clue ? getClueArScene(clue) : null;
  const clueSceneId = clue ? getArSceneId(adventure.id, clue.id, 'clue') : null;
  const canReplayClueAr =
    clueArScene?.enabled &&
    clueArScene?.allowReplay !== false &&
    clueSceneId &&
    progress.arScenesCompleted?.includes(clueSceneId);

  return { clueArScene, clueSceneId, canReplayClueAr };
}

/** Apply AR scene completion to app state (mark scene + optional clue advance). */
export function applyArSceneComplete(
  state,
  { adventure, sceneId, advanceClue, advanceClueForAdventure, clueStartRef }
) {
  let next = state;
  if (sceneId) {
    next = markArSceneComplete(next, adventure.id, sceneId);
  }
  if (advanceClue && advanceClueForAdventure) {
    next = advanceClueForAdventure(next, adventure, clueStartRef);
  }
  return next;
}

/**
 * React hook encapsulating AR scene queue + completion for AdventurePlay.
 */
export function useArSceneFlow({
  adventure,
  progress,
  clue,
  atClaim,
  setState,
  advanceClueForAdventure,
  clueStartRef,
  onClueAdvanced,
}) {
  const [activeAr, setActiveAr] = useState(null);

  const completeArScene = useCallback(() => {
    const snapshot = activeAr;
    setActiveAr(null);
    if (!snapshot) return;

    setState((s) => {
      let next = applyArSceneComplete(s, {
        adventure,
        sceneId: snapshot.sceneId,
        advanceClue: snapshot.advanceClue,
        advanceClueForAdventure,
        clueStartRef,
      });
      if (snapshot.advanceClue && onClueAdvanced) {
        onClueAdvanced(next);
      }
      return next;
    });
  }, [
    activeAr,
    adventure,
    advanceClueForAdventure,
    clueStartRef,
    onClueAdvanced,
    setState,
  ]);

  const queueArScene = useCallback(
    (trigger, { advanceClue = false, forceReplay = false } = {}) => {
      const action = resolveArQueueAction({
        adventure,
        progress,
        clue,
        atClaim,
        trigger,
        advanceClue,
        forceReplay,
      });

      if (action.type === 'noop') return;

      if (action.type === 'advance_only') {
        setState((s) => {
          if (!advanceClueForAdventure) return s;
          const next = advanceClueForAdventure(s, adventure, clueStartRef);
          onClueAdvanced?.(next);
          return next;
        });
        return;
      }

      setActiveAr({
        scene: action.scene,
        sceneId: action.sceneId,
        advanceClue: action.advanceClue,
      });
    },
    [
      adventure,
      progress,
      clue,
      atClaim,
      advanceClueForAdventure,
      clueStartRef,
      onClueAdvanced,
      setState,
    ]
  );

  const replayMeta = getClueArReplayMeta(adventure, progress, clue, atClaim);

  return {
    activeAr,
    completeArScene,
    queueArScene,
    ...replayMeta,
  };
}
