/**
 * Single-flight map camera controller — only one programmatic move at a time.
 */
import { isDev } from './config/env';

const DEFAULT_LOCK_MS = 1400;

export function createMapCameraController(getMap) {
  const state = {
    cameraLock: false,
    lockReason: null,
    lockTimeout: null,
    isUserInteracting: false,
    lastCenteredPinId: null,
    lastSpiderAnchorKey: null,
    initialUserCentered: false,
    lastCameraAction: null,
  };

  function releaseCameraLock(trigger) {
    if (state.lockTimeout) {
      clearTimeout(state.lockTimeout);
      state.lockTimeout = null;
    }
    if (!state.cameraLock) return;
    state.cameraLock = false;
    state.lockReason = null;
    if (isDev) {
      console.debug('[MapCamera]', { cameraLockReleased: trigger, lastAction: state.lastCameraAction });
    }
  }

  function requestCameraMove(reason, moveFn, options = {}) {
    const map = getMap();
    if (!map) return false;

    if (state.cameraLock && reason !== 'user' && !options.force) {
      if (isDev) {
        console.debug('[MapCamera]', {
          cameraMoveSkipped: reason,
          because: 'locked',
          lockReason: state.lockReason,
        });
      }
      return false;
    }

    if (
      state.isUserInteracting &&
      !options.allowDuringInteraction &&
      !['user', 'findMe'].includes(reason)
    ) {
      if (isDev) {
        console.debug('[MapCamera]', {
          cameraMoveSkipped: reason,
          because: 'userInteracting',
        });
      }
      return false;
    }

    state.cameraLock = true;
    state.lockReason = reason;
    state.lastCameraAction = reason;

    if (isDev) {
      console.debug('[MapCamera]', { cameraMoveRequested: reason, selectedPinId: options.pinId ?? null });
    }

    const finish = () => {
      map.off('moveend', finish);
      releaseCameraLock(reason);
    };

    map.once('moveend', finish);
    state.lockTimeout = setTimeout(() => releaseCameraLock(`${reason}-timeout`), options.timeoutMs ?? DEFAULT_LOCK_MS);

    moveFn(map);
    return true;
  }

  function attachInteractionHandlers(map) {
    const onStart = () => {
      state.isUserInteracting = true;
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
    requestCameraMove,
    releaseCameraLock,
    attachInteractionHandlers,
  };
}
