/**
 * Timeline constants and normalization — shared by timelineEngine and horrorTimelineDefaults.
 * Breaks horrorTimelineDefaults ↔ timelineEngine circular import.
 */

export const TIMELINE_ACTIONS = {
  FADE_IN: 'fadeIn',
  FADE_OUT: 'fadeOut',
  FOG: 'fog',
  DARKNESS: 'darkness',
  STATIC: 'static',
  VIGNETTE: 'vignette',
  BLUR: 'blur',
  FLICKER: 'flicker',
  HEARTBEAT: 'heartbeat',
  CHROMATIC: 'chromatic',
  SHOW_GHOST: 'showGhost',
  SHOW_ASSET: 'showAsset',
  HIDE_ASSET: 'hideAsset',
  OVERLAY: 'overlay',
  REVEAL: 'reveal',
  PLAY_AUDIO: 'playAudio',
  STOP_AUDIO: 'stopAudio',
  CAMERA_SHAKE: 'cameraShake',
  FLASH: 'flash',
  RED_FLASH: 'redFlash',
  WHITE_FLASH: 'whiteFlash',
  WAIT: 'wait',
  APPEAR: 'appear',
  DISAPPEAR: 'disappear',
  FLOAT: 'float',
  DRIFT: 'drift',
  BREATHE: 'breathe',
  BLINK: 'blink',
  SCALE: 'scale',
  ROTATE: 'rotate',
  MOVE: 'move',
  APPROACH: 'approach',
  RETREAT: 'retreat',
  LOOK_AT_PLAYER: 'lookAtPlayer',
  PULSE: 'pulse',
  FADE_ENTITY_IN: 'fadeEntityIn',
  FADE_ENTITY_OUT: 'fadeEntityOut',
  AMBIENCE: 'ambience',
  FADE_AUDIO: 'fadeAudio',
  SCREAM: 'scream',
  SHAKE: 'shake',
  TELEPORT: 'teleport',
  ATTACK: 'attack',
  GLOW_BURST: 'glowBurst',
};

export function normalizeTimelineEvent(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const action = String(raw.action || '').trim();
  if (!action) return null;
  const time = Math.max(0, Number(raw.time) || 0);
  return {
    time,
    action,
    text: raw.text != null ? String(raw.text) : undefined,
    asset: raw.asset != null ? raw.asset : undefined,
    duration: raw.duration != null ? Number(raw.duration) : undefined,
    volume: raw.volume != null ? Number(raw.volume) : undefined,
    loop: raw.loop != null ? Boolean(raw.loop) : undefined,
    position: raw.position != null ? String(raw.position) : undefined,
    from: raw.from != null ? String(raw.from) : undefined,
    to: raw.to != null ? String(raw.to) : undefined,
    depth: raw.depth != null ? String(raw.depth) : undefined,
    fromScale: raw.fromScale != null ? Number(raw.fromScale) : undefined,
    toScale: raw.toScale != null ? Number(raw.toScale) : undefined,
    scale: raw.scale != null ? Number(raw.scale) : undefined,
    track: raw.track != null ? String(raw.track) : undefined,
    id: raw.id != null ? String(raw.id) : undefined,
    fadeIn: raw.fadeIn != null ? Number(raw.fadeIn) : undefined,
    fadeOut: raw.fadeOut != null ? Number(raw.fadeOut) : undefined,
    volumeTo: raw.volumeTo != null ? Number(raw.volumeTo) : undefined,
    targetOpacity: raw.targetOpacity != null ? Number(raw.targetOpacity) : undefined,
  };
}

export function normalizeTimeline(timeline) {
  if (!Array.isArray(timeline)) return [];
  return timeline
    .map(normalizeTimelineEvent)
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
}

export function getTimelineDuration(timeline, fallback = 8) {
  if (!Array.isArray(timeline) || !timeline.length) return fallback;
  const maxTime = Math.max(...timeline.map((e) => e.time));
  const hasFadeOut = timeline.some((e) => e.action === TIMELINE_ACTIONS.FADE_OUT);
  return Math.max(fallback, hasFadeOut ? maxTime : maxTime + 0.5);
}
