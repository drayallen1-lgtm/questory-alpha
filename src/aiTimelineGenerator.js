/**
 * Builds full cinematic timelines for AI-generated horror scenes (Sweep 10.4+).
 */
import { TIMELINE_ACTIONS, normalizeTimeline, getTimelineDuration } from './timelineEngine.js';
import { buildDefaultHorrorTimeline } from './horrorTimelineDefaults.js';

const AUDIO_ASSET_BY_ID = {
  'aud-whisper': 'whisper',
  'aud-laugh': 'laugh',
  'aud-static': 'static',
  'aud-footsteps': 'footsteps',
  'aud-wind': 'wind',
  'aud-musicbox': 'musicbox',
  'aud-swing': 'creak',
};

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
  const audioLayers = [];
  audioEntries.forEach((entry, index) => {
    const asset = resolveAudioAsset(entry);
    if (!asset || asset === 'whisper') return;
    audioLayers.push({
      asset,
      time: asset === 'creak' ? 2 : 2.2 + index * 0.6,
      volume: 0.58,
      track: `sfx-${asset}-${index}`,
    });
  });

  if (locationEntry?.assetId === 'obj-swing' && !audioLayers.some((l) => l.asset === 'creak')) {
    audioLayers.push({ asset: 'creak', time: 2, volume: 0.58, track: 'sfx-creak' });
  }

  return buildDefaultHorrorTimeline({
    durationSeconds,
    overlayText,
    sceneType,
    atmosphere,
    jumpScare,
    isGhost: sceneType === 'ghost' || Boolean(characterEntry),
    hasAsset: Boolean(characterEntry || locationEntry),
    position: sceneType === 'ghost' || characterEntry ? 'bottom-left' : 'center',
    silhouette: characterEntry?.assetId === 'ghost-shadow' || characterEntry?.assetId === 'ghost-hooded',
    audioLayers,
  });
}

export function summarizeTimeline(timeline) {
  const events = timeline || [];
  const audio = events.filter((e) => ['playAudio', 'ambience', 'scream'].includes(e.action));
  const choreography = events.filter((e) =>
    ['float', 'approach', 'fadeEntityIn', 'lookAtPlayer', 'scream', 'cameraShake', 'pulse'].includes(e.action)
  );
  const cameraFx = events.filter((e) =>
    ['fog', 'darkness', 'static', 'vignette', 'heartbeat', 'flash', 'whiteFlash', 'flicker'].includes(e.action)
  );
  const fxLabels = [...new Set(cameraFx.map((e) => e.action))].slice(0, 4).join(' + ');
  return {
    eventCount: events.length,
    audioLayers: audio.length,
    choreographySteps: choreography.length,
    cameraFxSteps: cameraFx.length,
    fxSummary: fxLabels || 'vignette + fog',
  };
}

export { buildDefaultHorrorTimeline, buildPackSceneTimeline } from './horrorTimelineDefaults.js';
