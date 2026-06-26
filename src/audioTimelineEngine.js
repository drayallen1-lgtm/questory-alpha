/**
 * Layered audio timeline for cinematic AR scenes (Sweep 10.3).
 * Supports looping ambience, timed SFX, fades, and volume automation.
 */
import { HORROR_AUDIO } from './horrorAssets/catalog.js';

export const AUDIO_ALIASES = {
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

const START_ACTIONS = new Set(['playAudio', 'ambience', 'scream']);

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

export function resolveAudioAsset(asset) {
  if (!asset) return '';
  const key = String(asset).toLowerCase();
  if (AUDIO_ALIASES[key]) return AUDIO_ALIASES[key];
  if (typeof asset === 'string' && (asset.startsWith('/') || asset.startsWith('http') || asset.startsWith('data:'))) {
    return asset;
  }
  return '';
}

function trackKey(event, index) {
  if (event.track) return String(event.track);
  if (event.id) return String(event.id);
  return `${event.action}:${event.asset || 'scream'}:${index}`;
}

function computeVolume(track, elapsed) {
  let vol = track.targetVolume;

  if (track.fadeIn > 0) {
    const since = elapsed - track.startTime;
    if (since < track.fadeIn) vol *= clamp01(since / track.fadeIn);
  }

  if (track.fadeOutStart != null) {
    const since = elapsed - track.fadeOutStart;
    if (since >= track.fadeOutDuration) return 0;
    vol *= 1 - clamp01(since / track.fadeOutDuration);
  }

  for (const auto of track.automations) {
    const end = auto.time + auto.duration;
    if (elapsed < auto.time) continue;
    if (elapsed >= end) {
      vol = auto.toVolume;
      continue;
    }
    const t = clamp01((elapsed - auto.time) / auto.duration);
    vol = auto.fromVolume + (auto.toVolume - auto.fromVolume) * t;
  }

  return clamp01(vol);
}

/**
 * Runtime controller — sync each animation frame with timeline elapsed time.
 */
export function createAudioTimelineController() {
  /** @type {Map<string, object>} */
  const tracks = new Map();
  const triggered = new Set();

  function startTrack(key, event, elapsed) {
    const asset = event.action === 'scream' ? 'scream' : event.asset;
    const url = resolveAudioAsset(asset);
    if (!url) return;

    const audio = new Audio(url);
    audio.loop = Boolean(event.loop);
    audio.preload = 'auto';
    audio.volume = 0;

    const track = {
      key,
      audio,
      startTime: event.time,
      targetVolume: event.volume != null ? clamp01(event.volume) : 0.85,
      fadeIn: event.fadeIn != null ? Number(event.fadeIn) : 0,
      fadeOutStart: null,
      fadeOutDuration: 0,
      automations: [],
      stopped: false,
    };

    audio.play().catch(() => {});
    tracks.set(key, track);
    audio.volume = computeVolume(track, elapsed);
  }

  function stopMatching(match, fadeOut, elapsed) {
    if (!match) return;
    const needle = String(match).toLowerCase();
    tracks.forEach((track, key) => {
      if (track.stopped) return;
      const keyMatch = key.toLowerCase().includes(needle);
      const assetMatch = track.audio?.src?.toLowerCase().includes(needle);
      if (keyMatch || assetMatch) {
        track.fadeOutStart = track.fadeOutStart ?? elapsed;
        track.fadeOutDuration = fadeOut;
        if (fadeOut <= 0) {
          try {
            track.audio.pause();
            track.audio.src = '';
          } catch {
            /* ignore */
          }
          track.stopped = true;
          tracks.delete(key);
        }
      }
    });
  }

  function applyFadeAutomation(event) {
    const needle = String(event.track || event.asset || '').toLowerCase();
    if (!needle) return;
    tracks.forEach((track) => {
      if (track.stopped) return;
      if (!track.key.toLowerCase().includes(needle)) return;
      track.automations.push({
        time: event.time,
        duration: event.duration ?? 1,
        fromVolume: track.targetVolume,
        toVolume: clamp01(event.volume ?? event.volumeTo ?? 0),
      });
      track.targetVolume = clamp01(event.volume ?? event.volumeTo ?? track.targetVolume);
    });
  }

  return {
    sync(timeline, elapsed, prevElapsed) {
      (timeline || []).forEach((event, index) => {
        const key = trackKey(event, index);

        if (START_ACTIONS.has(event.action) && elapsed >= event.time && !triggered.has(key)) {
          triggered.add(key);
          startTrack(key, event, elapsed);
        }

        if (event.action === 'stopAudio' && elapsed >= event.time && !triggered.has(`stop:${index}`)) {
          triggered.add(`stop:${index}`);
          stopMatching(event.track || event.asset, event.fadeOut ?? event.duration ?? 0.35, elapsed);
        }

        if (event.action === 'fadeAudio' && elapsed >= event.time && !triggered.has(`fade:${index}`)) {
          triggered.add(`fade:${index}`);
          applyFadeAutomation(event);
        }
      });

      tracks.forEach((track, key) => {
        if (track.stopped) return;
        const vol = computeVolume(track, elapsed);
        track.audio.volume = vol;
        if (vol <= 0.001 && track.fadeOutStart != null) {
          try {
            track.audio.pause();
            track.audio.src = '';
          } catch {
            /* ignore */
          }
          track.stopped = true;
          tracks.delete(key);
        }
      });
    },

    stopAll() {
      tracks.forEach((track) => {
        try {
          track.audio.pause();
          track.audio.src = '';
        } catch {
          /* ignore */
        }
      });
      tracks.clear();
      triggered.clear();
    },
  };
}

/** Extract audio-layer events from a timeline (for tests / previews). */
export function getAudioTimelineEvents(timeline) {
  return (timeline || []).filter((e) =>
    ['playAudio', 'ambience', 'stopAudio', 'fadeAudio', 'scream'].includes(e.action)
  );
}
