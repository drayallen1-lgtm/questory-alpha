import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  dismissAmbientWhisper,
  getAmbientWorldDirectorSnapshot,
} from './ambientWorldDirectorEngine';
import {
  WORLD_ANALYTICS_EVENTS,
  WORLD_AUDIO_EVENTS,
  emitWorldAudio,
  trackWorldEvent,
} from './worldExperienceEngine';

export function AmbientDirectorWhisper({
  state,
  adventures = [],
  layerSnapshot = null,
  hudContext = null,
  nav,
  setState,
  onFlyTo,
}) {
  const now = Date.now();
  const [rotationTick, setRotationTick] = useState(0);

  const snapshot = useMemo(
    () =>
      getAmbientWorldDirectorSnapshot({
        state,
        adventures,
        layerSnapshot,
        hudContext,
        now: now + rotationTick,
      }),
    [state, adventures, layerSnapshot, hudContext, now, rotationTick]
  );

  useEffect(() => {
    if (!snapshot.visible || snapshot.whisperCount <= 1) return undefined;
    const timer = window.setInterval(() => {
      setRotationTick((tick) => tick + 1);
    }, snapshot.rotationMs);
    return () => window.clearInterval(timer);
  }, [snapshot.visible, snapshot.whisperCount, snapshot.rotationMs]);

  const impressedWhisperIds = useRef(new Set());

  useEffect(() => {
    const whisperId = snapshot.activeWhisper?.id;
    if (!whisperId || !snapshot.visible) return;
    if (impressedWhisperIds.current.has(whisperId)) return;
    impressedWhisperIds.current.add(whisperId);
    if (setState) {
      setState((current) =>
        trackWorldEvent(current, WORLD_ANALYTICS_EVENTS.DIRECTOR_WHISPER, { whisperId })
      );
    }
    emitWorldAudio(WORLD_AUDIO_EVENTS.DIRECTOR_WHISPER, { whisperId });
  }, [snapshot.activeWhisper?.id, snapshot.visible, setState]);

  if (!snapshot.visible || !snapshot.activeWhisper) return null;

  const whisper = snapshot.activeWhisper;

  function handleAction() {
    if (!nav) return;
    if (setState) {
      setState((current) =>
        trackWorldEvent(current, WORLD_ANALYTICS_EVENTS.DIRECTOR_WHISPER_CLICK, {
          whisperId: whisper.id,
          action: whisper.action,
        })
      );
    }
    emitWorldAudio(WORLD_AUDIO_EVENTS.DIRECTOR_WHISPER, { whisperId: whisper.id });
    if (whisper.action === 'play' && whisper.adventureId) {
      nav('play', whisper.adventureId);
      return;
    }
    if (whisper.action === 'legendary-hunt') {
      nav('legendary-hunt');
      return;
    }
    if (whisper.action === 'marketplace') {
      nav('marketplace', undefined, whisper.actionOptions || {});
      return;
    }
    if (whisper.action === 'create') {
      nav('create', undefined, whisper.actionOptions || { launchStep: 'describe' });
      return;
    }
    if (whisper.action === 'social') {
      nav('social', undefined, whisper.actionOptions || { socialTab: 'guild' });
      return;
    }
    if (whisper.action === 'codex') {
      nav('codex');
      return;
    }
    if (whisper.flyTarget && onFlyTo) {
      onFlyTo(whisper.flyTarget);
      return;
    }
    if (whisper.action === 'map') {
      nav('map');
    }
  }

  function handleDismiss(event) {
    event.stopPropagation();
    if (!setState) return;
    setState((current) => dismissAmbientWhisper(current, whisper.id));
  }

  return (
    <aside
      className={`ambient-director-whisper ambient-director-whisper--${whisper.tone || 'guide'} ${snapshot.className}`}
      aria-label="World Director whisper"
    >
      <button type="button" className="ambient-director-whisper-body" onClick={handleAction}>
        <span className="ambient-director-whisper-icon" aria-hidden>
          {whisper.icon || '🎬'}
        </span>
        <span className="ambient-director-whisper-copy">
          <small>{snapshot.label}</small>
          <strong>{whisper.text}</strong>
        </span>
      </button>
      <button
        type="button"
        className="ambient-director-whisper-dismiss"
        aria-label="Dismiss whisper"
        onClick={handleDismiss}
      >
        ✕
      </button>
      {snapshot.whisperCount > 1 && (
        <span className="ambient-director-whisper-count" aria-hidden>
          {snapshot.whisperCount} cues
        </span>
      )}
    </aside>
  );
}
