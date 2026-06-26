import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SkipForward } from 'lucide-react';
import { normalizeArScene } from './arEngine';
import { getCameraFxClassList } from './cameraFxEngine';
import {
  computePlaybackAtTime,
  createTimelineRunner,
  resolveTimelineAudioUrl,
} from './timelineEngine';
import { ARCameraFrame, ARAssetPreview, ARTimelineBar } from './cinematicComponents';

function useTimelinePlayback(scene, { onComplete, paused = false }) {
  const [playback, setPlayback] = useState(() =>
    computePlaybackAtTime(scene, 0, 0)
  );
  const runnerRef = useRef(null);
  const audioPoolRef = useRef([]);

  const stopAudio = useCallback(() => {
    audioPoolRef.current.forEach((a) => {
      try {
        a.pause();
        a.src = '';
      } catch {
        /* ignore */
      }
    });
    audioPoolRef.current = [];
  }, []);

  const playAudioEvent = useCallback((event) => {
    const url = resolveTimelineAudioUrl(event.asset);
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = event.volume != null ? Math.min(1, Math.max(0, event.volume)) : 0.85;
    audio.loop = Boolean(event.loop);
    audio.preload = 'auto';
    audio.play().catch(() => {});
    audioPoolRef.current.push(audio);
  }, []);

  useEffect(() => {
    if (paused) return undefined;

    const runner = createTimelineRunner(
      scene,
      (snapshot, prevElapsed) => {
        setPlayback(snapshot);
        snapshot.newAudioEvents?.forEach(playAudioEvent);
      },
      () => {
        setPlayback((p) => ({ ...p, phase: 'outro', complete: true }));
      }
    );

    runnerRef.current = runner;
    runner.start();

    return () => {
      runner.stop();
      stopAudio();
    };
  }, [scene, paused, playAudioEvent, stopAudio]);

  return playback;
}

export function CinematicTimelinePlayer({
  scene: rawScene,
  onComplete,
  onSkip,
  useCamera = true,
  preview = false,
}) {
  const scene = useMemo(() => normalizeArScene(rawScene), [
    rawScene?.enabled,
    rawScene?.sceneType,
    rawScene?.title,
    rawScene?.assetUrl,
    rawScene?.assetType,
    rawScene?.audioUrl,
    rawScene?.overlayText,
    rawScene?.revealText,
    rawScene?.atmosphere,
    rawScene?.jumpScare,
    rawScene?.durationSeconds,
    JSON.stringify(rawScene?.timeline || []),
  ]);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFallback, setCameraFallback] = useState(!useCamera || preview);
  const [finished, setFinished] = useState(false);
  const playback = useTimelinePlayback(scene, {
    onComplete: () => {},
    paused: finished,
  });

  useEffect(() => {
    if (preview || !useCamera) {
      setCameraFallback(true);
      return undefined;
    }
    let stream;
    let cancelled = false;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraFallback(true);
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setCameraStream(stream);
        setCameraFallback(false);
      } catch {
        setCameraFallback(true);
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [useCamera, preview]);

  useEffect(() => {
    if (playback.complete && !finished) {
      setFinished(true);
    }
  }, [playback.complete, finished]);

  function handleContinue() {
    onComplete?.();
  }

  function handleSkip() {
    setFinished(true);
    if (onSkip) {
      onSkip();
      return;
    }
    onComplete?.();
  }

  const fxClasses = getCameraFxClassList(playback.activeFx).join(' ');
  const showOutro = finished || playback.phase === 'outro';

  return (
    <div
      className={`cinematic-ar-player timeline-driven scene-${scene.sceneType} ${fxClasses}`}
      style={{ opacity: playback.opacity }}
      role="dialog"
      aria-modal="true"
      aria-label={scene.title || 'AR Scene'}
    >
      <div className="cinematic-ar-stage">
        <ARCameraFrame stream={cameraStream} fallback={cameraFallback} />
        <div className="cinematic-fx-layers" aria-hidden="true">
          <div className="fx-layer fx-vignette-layer" />
          <div className="fx-layer fx-darkness-layer" />
          <div className="fx-layer fx-fog-layer" />
          <div className="fx-layer fx-static-layer" />
          <div className="fx-layer fx-flash-layer" />
          <div className="fx-layer fx-red-flash-layer" />
          <div className="fx-layer fx-white-flash-layer" />
          <div className="fx-layer fx-chromatic-layer" />
        </div>

        <div className="cinematic-ar-content">
          {scene.title && playback.elapsed > 0.3 && (
            <h2 className="cinematic-ar-title">{scene.title}</h2>
          )}

          <div
            className={`cinematic-ar-entity ${playback.showAsset ? 'visible' : 'hidden'}`}
          >
            <ARAssetPreview scene={scene} />
          </div>

          {playback.showOverlay && playback.overlayText ? (
            <p className="cinematic-ar-overlay-text">{playback.overlayText}</p>
          ) : null}

          {playback.revealText ? (
            <p className="cinematic-ar-reveal-text">{playback.revealText}</p>
          ) : null}

          {showOutro && (
            <button type="button" className="cinematic-ar-continue" onClick={handleContinue}>
              Continue
            </button>
          )}
        </div>
      </div>

      <ARTimelineBar durationSeconds={scene.durationSeconds} elapsed={playback.elapsed} />

      <div className="cinematic-ar-controls">
        <button type="button" className="ghost" onClick={handleSkip}>
          <SkipForward size={16} /> Skip scene
        </button>
      </div>
    </div>
  );
}

export function ScenePreviewOverlay({ scene, open, onClose }) {
  if (!open || !scene?.enabled) return null;

  return (
    <div className="cinematic-ar-overlay-root scene-preview-overlay">
      <div className="scene-preview-bar">
        <strong>Scene Preview</strong>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <CinematicTimelinePlayer
        scene={scene}
        onComplete={onClose}
        onSkip={onClose}
        useCamera={false}
        preview
      />
    </div>
  );
}
