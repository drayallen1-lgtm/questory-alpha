/**
 * Minimal map camera helpers — one move per direct user action, no retry chains.
 */
import { isDev } from './config/env';

export function createMapCameraController(getMap) {
  const state = {
    isUserInteracting: false,
    initialUserCentered: false,
  };

  function requestCameraMove(reason, moveFn) {
    const map = getMap();
    if (!map) return false;

    if (state.isUserInteracting && reason !== 'findMe') {
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
    attachInteractionHandlers,
  };
}
