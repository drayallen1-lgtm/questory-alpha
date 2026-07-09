/**
 * Minimal map camera helpers — one move per direct user action, no retry chains.
 */
import { isDev } from './config/env';

export const ATLAS_CAMERA_MOVE_REASONS = {
  FIND_ME: 'findMe',
  VENUE: 'venue',
  ADVENTURE: 'adventure',
  EARTH: 'earthFly',
  WHISPER: 'whisper',
  CLUSTER: 'cluster',
  MAP_OBJECT: 'mapObject',
  INITIAL_USER: 'initialUser',
  ATLAS_CORRECT: 'atlasCorrect',
};

const ATLAS_ALLOWED_AFTER_INITIAL = new Set([
  ATLAS_CAMERA_MOVE_REASONS.FIND_ME,
  ATLAS_CAMERA_MOVE_REASONS.VENUE,
  ATLAS_CAMERA_MOVE_REASONS.ADVENTURE,
  ATLAS_CAMERA_MOVE_REASONS.EARTH,
  ATLAS_CAMERA_MOVE_REASONS.WHISPER,
  ATLAS_CAMERA_MOVE_REASONS.CLUSTER,
  ATLAS_CAMERA_MOVE_REASONS.MAP_OBJECT,
]);

export function createMapCameraController(getMap) {
  const state = {
    isUserInteracting: false,
    initialUserCentered: false,
    livingAtlas: false,
    hasAppliedInitialAtlasCamera: false,
    hasUserInteractedWithMap: false,
  };

  function setLivingAtlas(enabled) {
    state.livingAtlas = Boolean(enabled);
  }

  function markInitialAtlasCameraApplied() {
    state.hasAppliedInitialAtlasCamera = true;
  }

  function markUserInteractedWithMap() {
    state.hasUserInteractedWithMap = true;
  }

  function isAtlasAutoMoveBlocked(reason) {
    if (!state.livingAtlas || !state.hasAppliedInitialAtlasCamera) return false;
    return !ATLAS_ALLOWED_AFTER_INITIAL.has(reason);
  }

  function requestCameraMove(reason, moveFn) {
    const map = getMap();
    if (!map) return false;

    if (isAtlasAutoMoveBlocked(reason)) {
      if (isDev) {
        console.debug('[MapCamera]', { cameraMoveBlocked: reason, atlasMode: true });
      }
      return false;
    }

    if (state.isUserInteracting && reason !== ATLAS_CAMERA_MOVE_REASONS.FIND_ME) {
      if (isDev) {
        console.debug('[MapCamera]', { cameraMoveSkipped: reason, because: 'userInteracting' });
      }
      return false;
    }

    if (isDev) {
      console.debug('[MapCamera]', { cameraMoveRequested: reason });
    }

    moveFn(map);
    return true;
  }

  function attachInteractionHandlers(map) {
    const onStart = () => {
      state.isUserInteracting = true;
      state.hasUserInteractedWithMap = true;
    };
    const onEnd = () => {
      state.isUserInteracting = false;
    };

    map.on('dragstart', onStart);
    map.on('dragend', onEnd);
    map.on('zoomstart', onStart);
    map.on('zoomend', onEnd);

    return () => {
      map.off('dragstart', onStart);
      map.off('dragend', onEnd);
      map.off('zoomstart', onStart);
      map.off('zoomend', onEnd);
    };
  }

  return {
    state,
    setLivingAtlas,
    markInitialAtlasCameraApplied,
    markUserInteractedWithMap,
    isAtlasAutoMoveBlocked,
    requestCameraMove,
    attachInteractionHandlers,
  };
}
