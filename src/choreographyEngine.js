/**
 * Choreography action resolution (Sweep 10.3).
 * Maps script actions like scream, shake, flash to FX + audio side effects.
 */

export const CHOREOGRAPHY_ACTIONS = {
  SCREAM: 'scream',
  SHAKE: 'shake',
  FLASH: 'flash',
  TELEPORT: 'teleport',
  WAIT: 'wait',
};

const CHOREOGRAPHY_FX = {
  scream: { fx: ['redFlash', 'cameraShake'], fxDuration: 0.55 },
  shake: { fx: ['cameraShake'], fxDuration: 0.55 },
  flash: { fx: ['whiteFlash'], fxDuration: 0.4 },
};

export function resolveChoreographyFx(timeline, elapsed) {
  const active = new Set();
  for (const e of timeline || []) {
    const choreo = CHOREOGRAPHY_FX[e.action];
    if (!choreo) continue;
    const dur = e.duration ?? choreo.fxDuration;
    if (e.time <= elapsed && elapsed <= e.time + dur) {
      choreo.fx.forEach((fx) => active.add(fx));
    }
  }
  return active;
}

/** Expand shorthand choreography into inspectable side-effect descriptors. */
export function describeChoreographyEvent(event) {
  if (event.action === 'scream') {
    return { audio: 'scream', fx: ['redFlash', 'cameraShake'] };
  }
  if (event.action === 'shake') {
    return { fx: ['cameraShake'] };
  }
  if (event.action === 'flash') {
    return { fx: ['whiteFlash'] };
  }
  if (event.action === 'teleport') {
    return { entity: { to: event.to || event.position } };
  }
  if (event.action === 'wait') {
    return { wait: event.duration ?? 1 };
  }
  return null;
}

export function isChoreographyAction(action) {
  return Boolean(CHOREOGRAPHY_FX[action] || ['teleport', 'wait'].includes(action));
}
