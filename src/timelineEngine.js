import { HORROR_AUDIO } from './horrorAssets/catalog.js';
import { computeEntityState } from './entityEngine.js';
import { resolveChoreographyFx } from './choreographyEngine.js';
import { buildDefaultHorrorTimeline } from './horrorTimelineDefaults.js';
import {
  TIMELINE_ACTIONS,
  normalizeTimelineEvent,
  normalizeTimeline,
  getTimelineDuration,
} from './timelineCore.js';

export { TIMELINE_ACTIONS, normalizeTimelineEvent, normalizeTimeline, getTimelineDuration };

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
