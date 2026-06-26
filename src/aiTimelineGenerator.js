/**
 * Builds full cinematic timelines for AI-generated horror scenes (Sweep 10.4).
 */
import { TIMELINE_ACTIONS, normalizeTimeline, getTimelineDuration } from './timelineEngine.js';

const AUDIO_ASSET_BY_ID = {
  'aud-whisper': 'whisper',
  'aud-laugh': 'laugh',
  'aud-static': 'static',
  'aud-footsteps': 'footsteps',
  'aud-wind': 'wind',
  'aud-musicbox': 'musicbox',
  'aud-swing': 'creak',
};

function atmosphereFx(atmosphere) {
  if (atmosphere === 'fog') return TIMELINE_ACTIONS.FOG;
  if (atmosphere === 'static') return TIMELINE_ACTIONS.STATIC;
  if (atmosphere === 'darkness') return TIMELINE_ACTIONS.DARKNESS;
  if (atmosphere === 'lantern') return TIMELINE_ACTIONS.FLICKER;
  if (atmosphere === 'flash') return TIMELINE_ACTIONS.FLASH;
  return null;
}

function spawnPosition(sceneType, characterEntry, locationEntry) {
  if (sceneType === 'ghost' || characterEntry) return 'bottom-left';
  if (locationEntry?.assetId === 'obj-swing') return 'bottom-left';
  if (locationEntry?.assetId === 'obj-dead-tree') return 'far';
  if (locationEntry?.assetId === 'obj-lantern') return 'bottom-right';
  return 'center';
}

function resolveAudioAsset(entry) {
  if (!entry) return '';
  return AUDIO_ASSET_BY_ID[entry.assetId] || entry.assetId || '';
}

/**
 * Compose a miniature horror script from matched generation context.
 */
export function buildCinematicTimeline({
  sceneType,
  characterEntry,
  locationEntry,
  audioEntries = [],
  overlayText,
  durationSeconds = 8,
  atmosphere,
  jumpScare = false,
}) {
  const duration = Math.max(6, Number(durationSeconds) || 8);
  const isGhost = sceneType === 'ghost' || Boolean(characterEntry);
  const isJump = jumpScare || sceneType === 'jump_scare';
  const events = [
    { time: 0, action: TIMELINE_ACTIONS.FADE_IN },
    {
      time: 0,
      action: TIMELINE_ACTIONS.PLAY_AUDIO,
      asset: 'wind',
      loop: true,
      volume: 0.3,
      fadeIn: 1.4,
      track: 'amb-wind',
    },
  ];

  const atm = atmosphereFx(atmosphere);
  if (atm) events.push({ time: 1, action: atm });

  if (locationEntry?.assetId === 'obj-swing' || /swing|creak|porch/.test(locationEntry?.label || '')) {
    events.push({
      time: 2,
      action: TIMELINE_ACTIONS.PLAY_AUDIO,
      asset: 'creak',
      volume: 0.68,
      track: 'sfx-creak',
    });
  }

  if (atmosphere === 'static' || audioEntries.some((a) => a.assetId === 'aud-static')) {
    events.push({ time: 1.2, action: TIMELINE_ACTIONS.STATIC });
  }

  const showAction = isGhost ? TIMELINE_ACTIONS.SHOW_GHOST : TIMELINE_ACTIONS.SHOW_ASSET;
  const position = spawnPosition(sceneType, characterEntry, locationEntry);
  events.push({ time: 1.8, action: showAction, position });

  if (isGhost) {
    events.push({ time: 1.9, action: TIMELINE_ACTIONS.FADE_ENTITY_IN, duration: 1.1 });
    events.push({ time: 2, action: TIMELINE_ACTIONS.FLOAT });
    events.push({ time: 2.2, action: TIMELINE_ACTIONS.BREATHE });
    events.push({ time: 3.2, action: TIMELINE_ACTIONS.APPROACH, duration: 2.8, to: 'close' });
    events.push({ time: 3.5, action: TIMELINE_ACTIONS.LOOK_AT_PLAYER });
  } else if (locationEntry) {
    events.push({ time: 2, action: TIMELINE_ACTIONS.DRIFT });
  }

  audioEntries.forEach((entry, index) => {
    const asset = resolveAudioAsset(entry);
    if (!asset) return;
    events.push({
      time: 2.2 + index * 1.8,
      action: TIMELINE_ACTIONS.PLAY_AUDIO,
      asset,
      volume: asset === 'whisper' ? 0.72 : 0.65,
      track: `sfx-${asset}-${index}`,
    });
  });

  if (overlayText) {
    events.push({
      time: isGhost ? 3.8 : 2.8,
      action: TIMELINE_ACTIONS.OVERLAY,
      text: overlayText,
    });
  }

  if (isJump) {
    events.push({ time: Math.max(0, duration - 1.4), action: TIMELINE_ACTIONS.HEARTBEAT });
    events.push({
      time: Math.max(0, duration - 1.4),
      action: TIMELINE_ACTIONS.PLAY_AUDIO,
      asset: 'heartbeat',
      loop: true,
      volume: 0.48,
      fadeIn: 0.85,
      track: 'sfx-heartbeat',
    });
    events.push({ time: Math.max(0, duration - 1.1), action: TIMELINE_ACTIONS.CAMERA_SHAKE });
    events.push({
      time: Math.max(0, duration - 0.9),
      action: TIMELINE_ACTIONS.FADE_ENTITY_OUT,
      duration: 0.35,
    });
    events.push({ time: Math.max(0, duration - 0.55), action: TIMELINE_ACTIONS.SCREAM });
    events.push({ time: Math.max(0, duration - 0.45), action: TIMELINE_ACTIONS.WHITE_FLASH });
    events.push({
      time: Math.max(0, duration - 0.2),
      action: TIMELINE_ACTIONS.STOP_AUDIO,
      track: 'amb-wind',
      fadeOut: 0.35,
    });
  }

  events.push({ time: duration, action: TIMELINE_ACTIONS.FADE_OUT });

  const timeline = normalizeTimeline(events);
  return {
    timeline,
    durationSeconds: getTimelineDuration(timeline, duration),
  };
}

export function summarizeTimeline(timeline) {
  const events = timeline || [];
  const audio = events.filter((e) => ['playAudio', 'ambience', 'scream'].includes(e.action));
  const choreography = events.filter((e) =>
    ['float', 'approach', 'fadeEntityIn', 'lookAtPlayer', 'scream', 'cameraShake'].includes(e.action)
  );
  const cameraFx = events.filter((e) =>
    ['fog', 'darkness', 'static', 'vignette', 'heartbeat', 'flash', 'whiteFlash'].includes(e.action)
  );
  return {
    eventCount: events.length,
    audioLayers: audio.length,
    choreographySteps: choreography.length,
    cameraFxSteps: cameraFx.length,
  };
}
