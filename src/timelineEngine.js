import { HORROR_AUDIO } from './horrorAssets/catalog.js';
import { computeEntityState } from './entityEngine.js';
import { resolveChoreographyFx } from './choreographyEngine.js';
import { buildDefaultHorrorTimeline } from './horrorTimelineDefaults.js';

/** Timeline action identifiers (Sweep 10.1) */
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
  // Entity choreography (Sweep 10.2)
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
  // Audio + choreography (Sweep 10.3)
  AMBIENCE: 'ambience',
  FADE_AUDIO: 'fadeAudio',
  SCREAM: 'scream',
  SHAKE: 'shake',
  TELEPORT: 'teleport',
};

export const PERSISTENT_FX = new Set([
  TIMELINE_ACTIONS.FOG,
  TIMELINE_ACTIONS.DARKNESS,
  TIMELINE_ACTIONS.STATIC,
  TIMELINE_ACTIONS.VIGNETTE,
  TIMELINE_ACTIONS.BLUR,
  TIMELINE_ACTIONS.FLICKER,
  TIMELINE_ACTIONS.HEARTBEAT,
  TIMELINE_ACTIONS.CHROMATIC,
]);

export const MOMENTARY_FX = new Set([
  TIMELINE_ACTIONS.CAMERA_SHAKE,
  TIMELINE_ACTIONS.FLASH,
  TIMELINE_ACTIONS.RED_FLASH,
  TIMELINE_ACTIONS.WHITE_FLASH,
]);

export const FX_DURATION_SEC = {
  [TIMELINE_ACTIONS.CAMERA_SHAKE]: 0.42,
  [TIMELINE_ACTIONS.FLASH]: 0.28,
  [TIMELINE_ACTIONS.RED_FLASH]: 0.28,
  [TIMELINE_ACTIONS.WHITE_FLASH]: 0.28,
};

/** Bundled audio aliases for timeline playAudio events */
export const TIMELINE_AUDIO_ASSETS = {
  whisper: HORROR_AUDIO.whisperingVoices,
  whispers: HORROR_AUDIO.whisperingVoices,
  wind: HORROR_AUDIO.windGusts,
  creak: HORROR_AUDIO.swingCreak,
  swing: HORROR_AUDIO.swingCreak,
  laugh: HORROR_AUDIO.childLaughter,
  child: HORROR_AUDIO.childLaughter,
  static: HORROR_AUDIO.radioStatic,
  radio: HORROR_AUDIO.radioStatic,
  footsteps: HORROR_AUDIO.footsteps,
  musicbox: HORROR_AUDIO.musicBox,
  music: HORROR_AUDIO.musicBox,
  heartbeat: HORROR_AUDIO.heartbeat,
  scream: HORROR_AUDIO.scream,
};

export function resolveTimelineAudioUrl(asset) {
  if (!asset) return '';
  const key = String(asset).toLowerCase();
  if (TIMELINE_AUDIO_ASSETS[key]) return TIMELINE_AUDIO_ASSETS[key];
  if (typeof asset === 'string' && (asset.startsWith('/') || asset.startsWith('http') || asset.startsWith('data:'))) {
    return asset;
  }
  return '';
}

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

function computeOverlayOpacity(timeline, elapsed, duration, hasText) {
  if (!hasText) return 0;
  let overlayTime = null;
  for (const e of timeline) {
    if (e.action === TIMELINE_ACTIONS.OVERLAY) overlayTime = e.time;
  }
  if (overlayTime == null) return 1;
  const fadeIn = 0.55;
  const fadeOutStart = Math.max(overlayTime + 1.2, duration - 1.1);
  const fadeOutDur = 0.5;
  if (elapsed < overlayTime) return 0;
  if (elapsed < overlayTime + fadeIn) return (elapsed - overlayTime) / fadeIn;
  if (elapsed >= fadeOutStart + fadeOutDur) return 0;
  if (elapsed >= fadeOutStart) return 1 - (elapsed - fadeOutStart) / fadeOutDur;
  return 1;
}

/**
 * Convert legacy duration-based scenes to a cinematic timeline (backwards compatible).
 */
export function legacySceneToTimeline(scene = {}) {
  const duration = Math.max(6, Number(scene.durationSeconds) || 8);
  const audioLayers = [];
  if (scene.atmosphere === 'static') {
    audioLayers.push({ asset: 'static', time: 1, volume: 0.35, track: 'sfx-static' });
  }
  return buildDefaultHorrorTimeline({
    durationSeconds: duration,
    overlayText: scene.overlayText,
    revealText: scene.revealText,
    sceneType: scene.sceneType,
    atmosphere: scene.atmosphere,
    jumpScare: scene.jumpScare || scene.sceneType === 'jump_scare',
    hasAsset: Boolean(scene.assetUrl && scene.assetType !== 'none') || scene.sceneType === 'ghost',
    isGhost: scene.sceneType === 'ghost',
    audioUrl: scene.audioUrl,
    audioLayers,
  }).timeline;
}

export function resolveSceneTimeline(scene = {}) {
  const custom = normalizeTimeline(scene.timeline);
  if (custom.length) return custom;
  return legacySceneToTimeline(scene);
}

/** Scene opacity from fadeIn / fadeOut envelope */
export function computeSceneOpacity(timeline, elapsed, duration) {
  const fadeIn = timeline.find((e) => e.action === TIMELINE_ACTIONS.FADE_IN);
  const fadeOut = timeline.find((e) => e.action === TIMELINE_ACTIONS.FADE_OUT);
  const inStart = fadeIn?.time ?? 0;
  const inDur = fadeIn?.duration ?? 0.65;
  const outStart = fadeOut?.time ?? duration;
  const outDur = fadeOut?.duration ?? 0.75;

  if (elapsed < inStart) return 0;
  if (elapsed < inStart + inDur) return (elapsed - inStart) / inDur;
  if (elapsed >= outStart + outDur) return 0;
  if (elapsed >= outStart) return 1 - (elapsed - outStart) / outDur;
  return 1;
}

function isAssetVisible(events, elapsed) {
  let visible = false;
  for (const e of events) {
    if (e.time > elapsed) break;
    if (e.action === TIMELINE_ACTIONS.SHOW_GHOST || e.action === TIMELINE_ACTIONS.SHOW_ASSET) {
      visible = true;
    }
    if (e.action === TIMELINE_ACTIONS.HIDE_ASSET) visible = false;
  }
  return visible;
}

function latestTextEvent(events, elapsed, action) {
  let text = '';
  for (const e of events) {
    if (e.time > elapsed) break;
    if (e.action === action && e.text) text = e.text;
  }
  return text;
}

function getActiveFx(timeline, elapsed) {
  const active = new Set();
  for (const e of timeline) {
    if (e.time > elapsed) continue;
    if (PERSISTENT_FX.has(e.action)) active.add(e.action);
    if (MOMENTARY_FX.has(e.action)) {
      const dur = e.duration ?? FX_DURATION_SEC[e.action] ?? 0.4;
      if (elapsed <= e.time + dur) active.add(e.action);
    }
  }
  resolveChoreographyFx(timeline, elapsed).forEach((fx) => active.add(fx));
  return active;
}

/**
 * Convert legacy duration-based scenes to a cinematic timeline (backwards compatible).
 */
export function computePlaybackAtTime(scene, elapsed, prevElapsed = 0) {
  const timeline = Array.isArray(scene.timeline) ? scene.timeline : [];
  const duration = scene.durationSeconds || getTimelineDuration(timeline);
  const opacity = computeSceneOpacity(timeline, elapsed, duration);
  const entity = computeEntityState(timeline, elapsed);
  const showAsset = entity.visible || isAssetVisible(timeline, elapsed);
  const overlayText = latestTextEvent(timeline, elapsed, TIMELINE_ACTIONS.OVERLAY);
  const revealText = latestTextEvent(timeline, elapsed, TIMELINE_ACTIONS.REVEAL);
  const overlayOpacity = computeOverlayOpacity(timeline, elapsed, duration, Boolean(overlayText));
  const activeFx = getActiveFx(timeline, elapsed);

  let phase = 'playing';
  if (elapsed <= 0) phase = 'intro';
  if (elapsed >= duration) phase = 'outro';

  return {
    elapsed,
    duration,
    opacity,
    showAsset,
    entity,
    showOverlay: Boolean(overlayText) && overlayOpacity > 0.02,
    overlayText,
    overlayOpacity,
    revealText,
    activeFx,
    newAudioEvents: [],
    phase,
    complete: elapsed >= duration,
  };
}

export function createTimelineRunner(scene, onTick, onComplete) {
  let rafId = null;
  let startTs = null;
  let prevElapsed = 0;
  let stopped = false;
  const duration = scene.durationSeconds || getTimelineDuration(scene.timeline);

  function frame(ts) {
    if (stopped) return;
    if (startTs == null) startTs = ts;
    const elapsed = (ts - startTs) / 1000;
    const snapshot = computePlaybackAtTime(scene, elapsed, prevElapsed);
    onTick(snapshot, prevElapsed);
    prevElapsed = elapsed;

    if (elapsed >= duration) {
      const finalSnap = computePlaybackAtTime(scene, duration, prevElapsed);
      onTick(finalSnap, prevElapsed);
      onComplete?.();
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      stopped = false;
      startTs = null;
      prevElapsed = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      stopped = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}
