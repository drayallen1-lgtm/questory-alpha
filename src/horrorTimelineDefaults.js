/**
 * Default horror timeline choreography (Sweep 10.5).
 * Shared by AI generator, legacy conversion, and bundled packs.
 */
import { TIMELINE_ACTIONS, normalizeTimeline, getTimelineDuration } from './timelineEngine.js';

const GHOST_IDS = new Set([
  'ghost-little-girl',
  'ghost-shadow',
  'ghost-woman-white',
  'ghost-hooded',
]);

export function isGhostAssetId(assetId) {
  const id = String(assetId || '');
  return GHOST_IDS.has(id) || id.startsWith('ghost-') || id.startsWith('char-');
}

function audioAliasFromUrl(url) {
  if (!url) return null;
  const u = String(url).toLowerCase();
  if (u.includes('whisper')) return 'whisper';
  if (u.includes('creak') || u.includes('swing')) return 'creak';
  if (u.includes('wind')) return 'wind';
  if (u.includes('static') || u.includes('radio')) return 'static';
  if (u.includes('footstep')) return 'footsteps';
  if (u.includes('laugh')) return 'laugh';
  if (u.includes('music')) return 'musicbox';
  return null;
}

/**
 * Standard 8s horror beat sheet:
 * 0 vignette · 0.5 fog · 1.2 ghost in · 2.0 35% · 3.0 drift · 4.0 subtitle
 * 5.5 pulse · 6.5 flash · 7.5 out · 8.0 complete
 */
export function buildDefaultHorrorTimeline(options = {}) {
  const duration = Math.max(6, Number(options.durationSeconds) || 8);
  const isGhost = options.sceneType === 'ghost' || options.isGhost;
  const isJump = options.jumpScare || options.sceneType === 'jump_scare';
  const atm = options.atmosphere || 'fog';
  let fogOrStatic = atm === 'static' ? TIMELINE_ACTIONS.STATIC : TIMELINE_ACTIONS.FOG;
  if (atm === 'darkness') fogOrStatic = TIMELINE_ACTIONS.DARKNESS;
  if (atm === 'lantern') fogOrStatic = TIMELINE_ACTIONS.FLICKER;

  const showAction = isGhost ? TIMELINE_ACTIONS.SHOW_GHOST : TIMELINE_ACTIONS.SHOW_ASSET;
  const position = options.position || (isGhost ? 'bottom-left' : 'center');

  const events = [
    { time: 0, action: TIMELINE_ACTIONS.FADE_IN, duration: 0.85 },
    { time: 0, action: TIMELINE_ACTIONS.VIGNETTE },
    {
      time: 0,
      action: TIMELINE_ACTIONS.PLAY_AUDIO,
      asset: 'wind',
      loop: true,
      volume: 0.2,
      fadeIn: 2,
      track: 'amb-wind',
    },
    { time: 0.5, action: fogOrStatic },
  ];

  if (options.extraAmbience) {
    events.push({
      time: options.extraAmbience.time ?? 1.5,
      action: TIMELINE_ACTIONS.PLAY_AUDIO,
      asset: options.extraAmbience.asset,
      volume: options.extraAmbience.volume ?? 0.55,
      track: options.extraAmbience.track || `sfx-${options.extraAmbience.asset}`,
    });
  }

  if (options.hasAsset !== false && (options.hasAsset || isGhost)) {
    events.push({ time: 1.2, action: showAction, position });
    events.push({
      time: 1.2,
      action: TIMELINE_ACTIONS.FADE_ENTITY_IN,
      duration: 0.8,
      targetOpacity: 0.35,
    });
    events.push({ time: 2, action: TIMELINE_ACTIONS.FLOAT });
    events.push({ time: 2.1, action: TIMELINE_ACTIONS.BREATHE });
    events.push({ time: 3, action: TIMELINE_ACTIONS.APPROACH, duration: 2.2, to: 'close' });
  }

  (options.audioLayers || []).forEach((layer, i) => {
    if (layer.asset === 'whisper' && options.overlayText) return;
    events.push({
      time: layer.time ?? 1.8 + i * 0.8,
      action: TIMELINE_ACTIONS.PLAY_AUDIO,
      asset: layer.asset,
      volume: layer.volume ?? 0.6,
      loop: layer.loop,
      track: layer.track || `sfx-${layer.asset}-${i}`,
      fadeIn: layer.fadeIn,
    });
  });

  const customAudio = audioAliasFromUrl(options.audioUrl);
  if (customAudio && customAudio !== 'whisper') {
    events.push({
      time: 2,
      action: TIMELINE_ACTIONS.PLAY_AUDIO,
      asset: customAudio,
      volume: 0.62,
      track: 'sfx-custom',
    });
  }

  if (options.overlayText) {
    events.push({
      time: options.overlayTime ?? 4,
      action: TIMELINE_ACTIONS.OVERLAY,
      text: options.overlayText,
    });
    events.push({
      time: options.overlayTime ?? 4,
      action: TIMELINE_ACTIONS.PLAY_AUDIO,
      asset: 'whisper',
      volume: 0.68,
      track: 'sfx-whisper',
    });
  }

  if (options.revealText) {
    events.push({
      time: duration * 0.72,
      action: TIMELINE_ACTIONS.REVEAL,
      text: options.revealText,
    });
  }

  if (isJump) {
    events.push({ time: Math.max(0, duration - 1.5), action: TIMELINE_ACTIONS.HEARTBEAT });
    events.push({
      time: Math.max(0, duration - 1.5),
      action: TIMELINE_ACTIONS.PLAY_AUDIO,
      asset: 'heartbeat',
      loop: true,
      volume: 0.42,
      fadeIn: 0.7,
      track: 'sfx-heartbeat',
    });
    events.push({ time: Math.max(0, duration - 1.1), action: TIMELINE_ACTIONS.CAMERA_SHAKE, duration: 0.45 });
    events.push({ time: Math.max(0, duration - 0.65), action: TIMELINE_ACTIONS.SCREAM });
    events.push({ time: Math.max(0, duration - 0.55), action: TIMELINE_ACTIONS.WHITE_FLASH, duration: 0.28 });
  } else {
    events.push({ time: 5.5, action: TIMELINE_ACTIONS.PULSE });
    events.push({ time: 5.5, action: TIMELINE_ACTIONS.CAMERA_SHAKE, duration: 0.4 });
    events.push({ time: 6.5, action: TIMELINE_ACTIONS.FLICKER });
    events.push({ time: 6.5, action: TIMELINE_ACTIONS.FLASH, duration: 0.28 });
  }

  events.push({ time: 7.5, action: TIMELINE_ACTIONS.FADE_ENTITY_OUT, duration: 0.45 });
  events.push({
    time: 7.2,
    action: TIMELINE_ACTIONS.FADE_AUDIO,
    track: 'amb',
    volume: 0,
    duration: 0.6,
  });
  events.push({ time: duration, action: TIMELINE_ACTIONS.FADE_OUT, duration: 0.5 });

  const timeline = normalizeTimeline(events);
  return {
    timeline,
    durationSeconds: getTimelineDuration(timeline, duration),
  };
}

/** Pack-specific timeline variants */
export function buildPackSceneTimeline(def = {}, assets = {}) {
  const duration = def.durationSeconds || 8;
  const base = {
    durationSeconds: duration,
    overlayText: def.overlayText,
    revealText: def.revealText,
    sceneType: def.sceneType,
    atmosphere: def.atmosphere,
    jumpScare: def.jumpScare,
    hasAsset: Boolean(assets.visual || def.assetId),
    isGhost: def.sceneType === 'ghost' || isGhostAssetId(def.assetId),
    silhouette: def.silhouette,
  };

  if (def.packId === 'whispering_hollow') {
    if (def.packIndex === 0) {
      return buildDefaultHorrorTimeline({
        ...base,
        position: 'bottom-left',
        overlayTime: 4,
        extraAmbience: { asset: 'creak', time: 2, volume: 0.58, track: 'sfx-creak' },
        audioLayers: [],
      });
    }
    if (def.packIndex === 1) {
      return buildDefaultHorrorTimeline({
        ...base,
        sceneType: 'diary',
        isGhost: false,
        position: 'center',
        overlayTime: 3.5,
        extraAmbience: { asset: 'musicbox', time: 1.2, volume: 0.35, track: 'sfx-music' },
      });
    }
    if (def.isFinale) {
      return buildDefaultHorrorTimeline({
        ...base,
        durationSeconds: 10,
        atmosphere: 'darkness',
        jumpScare: true,
        overlayTime: 4.5,
        extraAmbience: { asset: 'static', time: 0.8, volume: 0.4, track: 'sfx-static' },
        audioLayers: [{ asset: 'laugh', time: 7, volume: 0.5, track: 'sfx-laugh' }],
      });
    }
  }

  if (def.packId === 'black_lantern') {
    if (def.packIndex === 0) {
      return buildDefaultHorrorTimeline({
        ...base,
        atmosphere: 'lantern',
        isGhost: false,
        position: 'bottom-right',
        overlayTime: 4.2,
      });
    }
    if (def.packIndex === 1) {
      return buildDefaultHorrorTimeline({
        ...base,
        isGhost: true,
        silhouette: true,
        position: 'far',
        overlayTime: 5.2,
        extraAmbience: { asset: 'wind', time: 0.3, volume: 0.25, track: 'amb-wind-2' },
      });
    }
    if (def.isFinale) {
      return buildDefaultHorrorTimeline({
        ...base,
        durationSeconds: 9,
        jumpScare: true,
        atmosphere: 'flash',
        overlayTime: 4,
      });
    }
  }

  if (def.packId === 'midnight_train') {
    if (def.packIndex === 0) {
      return buildDefaultHorrorTimeline({
        ...base,
        extraAmbience: { asset: 'footsteps', time: 1.5, volume: 0.55, track: 'sfx-steps' },
        overlayTime: 4,
      });
    }
    if (def.packIndex === 1) {
      return buildDefaultHorrorTimeline({
        ...base,
        atmosphere: 'static',
        isGhost: false,
        overlayTime: 3.8,
        extraAmbience: { asset: 'static', time: 0.6, volume: 0.38, track: 'sfx-static' },
      });
    }
    if (def.isFinale) {
      return buildDefaultHorrorTimeline({
        ...base,
        durationSeconds: 9,
        jumpScare: true,
        overlayTime: 4.2,
        extraAmbience: { asset: 'footsteps', time: 6, volume: 0.65, track: 'sfx-steps-2' },
      });
    }
  }

  return buildDefaultHorrorTimeline(base);
}
