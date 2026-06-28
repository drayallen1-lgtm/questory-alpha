import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  buildAdaptiveAudioPlan,
  resolveAdaptiveAudioContext,
} from './adaptiveAudioDirector';

const MUTE_SESSION_KEY = 'questory_audio_muted';

function layerSignature(layers) {
  return (layers || []).map((l) => `${l.id}:${l.url}:${l.loop}`).join('|');
}

function readMutedSession() {
  try {
    return sessionStorage.getItem(MUTE_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMutedSession(muted) {
  try {
    if (muted) sessionStorage.setItem(MUTE_SESSION_KEY, '1');
    else sessionStorage.removeItem(MUTE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function AdaptiveAudioLayer({ adventure, context, className = '' }) {
  const audioCtx = useMemo(() => resolveAdaptiveAudioContext(context), [
    context?.claimed,
    context?.atClaim,
    context?.awaitingFinder,
    context?.medallionTapped,
    context?.finderPhase,
    context?.signalPercent,
    context?.arActive,
    context?.clueIndex,
    context?.totalClues,
    context?.onFinderScreen,
  ]);

  const plan = useMemo(
    () => buildAdaptiveAudioPlan(adventure, audioCtx),
    [adventure, audioCtx]
  );

  const runtimeRef = useRef(new Map());
  const targetsRef = useRef(new Map());
  const rafRef = useRef(null);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(readMutedSession);

  const layersKey = layerSignature(plan.layers);

  const silenceAll = useCallback(() => {
    targetsRef.current = new Map();
    runtimeRef.current.forEach((entry) => {
      if (!entry?.audio) return;
      entry.current = 0;
      entry.audio.volume = 0;
      try {
        entry.audio.pause();
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    if (muted) {
      silenceAll();
    }
  }, [muted, silenceAll]);

  useEffect(() => {
    if (!plan.enabled || muted) {
      if (muted) silenceAll();
      else targetsRef.current = new Map();
      return undefined;
    }

    const nextTargets = new Map();
    for (const layer of plan.layers) {
      nextTargets.set(layer.id, layer.volume ?? 0.25);
    }
    targetsRef.current = nextTargets;

    const runtime = runtimeRef.current;

    for (const layer of plan.layers) {
      let entry = runtime.get(layer.id);
      if (!entry || entry.url !== layer.url) {
        if (entry?.audio) {
          try {
            entry.audio.pause();
            entry.audio.src = '';
          } catch {
            /* ignore */
          }
        }
        const audio = new Audio(layer.url);
        audio.loop = Boolean(layer.loop);
        audio.preload = 'auto';
        audio.volume = 0;
        entry = { audio, url: layer.url, current: 0, loop: layer.loop, oneShot: !layer.loop };
        runtime.set(layer.id, entry);
        audio.play().catch(() => setBlocked(true));
      }
    }

    runtime.forEach((_entry, id) => {
      if (!nextTargets.has(id)) {
        targetsRef.current.set(id, 0);
      }
    });

    function tick() {
      runtime.forEach((entry, id) => {
        if (!entry?.audio) return;
        const target = muted ? 0 : (targetsRef.current.get(id) ?? 0);
        entry.current += (target - entry.current) * 0.09;
        if (Math.abs(target - entry.current) < 0.002) entry.current = target;
        entry.audio.volume = Math.max(0, Math.min(1, entry.current));
        if (target > 0 && entry.audio.paused) {
          entry.audio.play().catch(() => setBlocked(true));
        }
      });
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [plan.enabled, plan.layers, muted, layersKey, silenceAll]);

  useEffect(
    () => () => {
      runtimeRef.current.forEach((entry) => {
        try {
          entry.audio.pause();
          entry.audio.src = '';
        } catch {
          /* ignore */
        }
      });
      runtimeRef.current.clear();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  function handleUnlock() {
    if (muted) return;
    setBlocked(false);
    runtimeRef.current.forEach((entry) => {
      entry.audio?.play?.().catch(() => setBlocked(true));
    });
  }

  function handleToggleMute() {
    setMuted((wasMuted) => {
      const next = !wasMuted;
      writeMutedSession(next);
      if (next) {
        silenceAll();
      }
      return next;
    });
  }

  if (!plan.enabled) return null;

  const intensityPct = Math.round((plan.intensity ?? 0) * 100);

  return (
    <div className={`adaptive-audio-layer ${className}`} aria-live="polite">
      <div className={`adaptive-audio-badge director-mood-badge ${muted ? 'is-muted' : ''}`}>
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        <span>{muted ? 'Audio muted' : plan.label}</span>
        {!muted && (
          <span className="adaptive-audio-intensity" aria-label={`Intensity ${intensityPct}%`}>
            <i style={{ width: `${intensityPct}%` }} />
          </span>
        )}
      </div>
      {blocked && !muted && (
        <button type="button" className="adaptive-audio-unlock ghost" onClick={handleUnlock}>
          <Volume2 size={14} /> Tap to enable adaptive audio
        </button>
      )}
      <button
        type="button"
        className={`adaptive-audio-mute ghost ${muted ? 'is-muted' : ''}`}
        onClick={handleToggleMute}
        aria-pressed={muted}
        aria-label={muted ? 'Unmute adaptive audio' : 'Mute adaptive audio'}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        <span className="adaptive-audio-mute-label">{muted ? 'Muted' : 'Mute'}</span>
      </button>
    </div>
  );
}
