import React, { useEffect, useRef, useState } from 'react';
import { FastForward, Play, RefreshCw, SkipForward } from 'lucide-react';
import { normalizeArScene, AR_INTERACTIONS } from './arEngine';
import { ARCameraFrame, ARAssetPreview, ARTimelineBar } from './cinematicComponents';
import { CinematicTimelinePlayer } from './CinematicTimelinePlayer';

export function ARScenePlayer({
  scene: rawScene,
  onComplete,
  onSkip,
  onError,
  useCamera = true,
}) {
  const scene = normalizeArScene(rawScene);
  const [phase, setPhase] = useState('intro');
  const [revealed, setRevealed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFallback, setCameraFallback] = useState(!useCamera);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!useCamera) {
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
  }, [useCamera]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!scene.audioUrl || !audio) return;
    audio.loop = !scene.assetUrl || scene.assetType === 'none';
    audio.play().catch(() => {});
  }, [scene.audioUrl, scene.assetUrl, scene.assetType]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const tick = setInterval(() => {
      setElapsed((e) => e + 0.25);
    }, 250);
    return () => clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    if (elapsed >= scene.durationSeconds) {
      setPhase('outro');
    }
  }, [elapsed, phase, scene.durationSeconds]);

  useEffect(() => {
    if (phase !== 'intro') return undefined;
    const id = setTimeout(() => setPhase('playing'), 600);
    return () => clearTimeout(id);
  }, [phase]);

  function handleContinue() {
    onComplete?.();
  }

  function handleSkip() {
    if (onSkip) {
      onSkip();
      return;
    }
    onComplete?.();
  }

  function handleTapInteract() {
    if (scene.interaction === AR_INTERACTIONS.TAP_REVEAL && !revealed) {
      setRevealed(true);
      return;
    }
    if (scene.interaction === AR_INTERACTIONS.TAP_COLLECT) {
      setPhase('outro');
      return;
    }
    if (scene.interaction === AR_INTERACTIONS.WATCH && phase === 'playing') {
      setPhase('outro');
    }
  }

  try {
    return (
      <div
        className={`cinematic-ar-player atmosphere-${scene.atmosphere} scene-${scene.sceneType} phase-${phase}`}
        onClick={handleTapInteract}
        role="dialog"
        aria-modal="true"
        aria-label={scene.title || 'AR Scene'}
      >
        <ARCameraFrame stream={cameraStream} fallback={cameraFallback} />
        <div className={`cinematic-ar-atmosphere layer-${scene.atmosphere}`} aria-hidden="true" />
        {scene.jumpScare && phase === 'outro' && (
          <div className="cinematic-ar-jumpscare-flash" aria-hidden="true" />
        )}

        <div className="cinematic-ar-content">
          {scene.title && <h2 className="cinematic-ar-title">{scene.title}</h2>}
          {scene.description && <p className="cinematic-ar-desc">{scene.description}</p>}

          <ARAssetPreview scene={scene} />

          {scene.overlayText ? (
            <p className={`cinematic-ar-overlay-text ${phase === 'intro' ? 'flicker' : ''}`}>
              {scene.overlayText}
            </p>
          ) : null}

          {revealed && scene.revealText && (
            <p className="cinematic-ar-reveal-text">{scene.revealText}</p>
          )}

          {phase === 'outro' && !scene.revealText && scene.interaction === AR_INTERACTIONS.WATCH && (
            <p className="cinematic-ar-reveal-text">Scene complete.</p>
          )}

          {phase === 'outro' && (
            <button type="button" className="cinematic-ar-continue" onClick={handleContinue}>
              Continue
            </button>
          )}

          {scene.interaction !== AR_INTERACTIONS.WATCH && phase === 'playing' && !revealed && (
            <p className="cinematic-ar-hint">
              {scene.interaction === AR_INTERACTIONS.TAP_COLLECT
                ? 'Tap to collect'
                : 'Tap to reveal'}
            </p>
          )}
        </div>

        <ARTimelineBar durationSeconds={scene.durationSeconds} elapsed={elapsed} />

        <div className="cinematic-ar-controls">
          <button type="button" className="ghost" onClick={handleSkip}>
            <SkipForward size={16} /> Skip scene
          </button>
        </div>

        {scene.audioUrl && (
          <audio ref={audioRef} src={scene.audioUrl} preload="auto" />
        )}
      </div>
    );
  } catch (err) {
    onError?.(err);
    return (
      <div className="cinematic-ar-error card">
        <p>Scene unavailable. Continue adventure.</p>
        <button type="button" onClick={() => onComplete?.()}>Continue</button>
      </div>
    );
  }
}

export function CinematicAROverlay({
  scene,
  open,
  onComplete,
  onSkip,
  useCamera = true,
}) {
  if (!open || !scene?.enabled) return null;

  const normalized = normalizeArScene(scene);

  return (
    <div className="cinematic-ar-overlay-root cinematic-ar-fade-in">
      <CinematicTimelinePlayer
        scene={normalized}
        onComplete={onComplete}
        onSkip={onSkip}
        useCamera={useCamera}
      />
    </div>
  );
}

export { ARCameraFrame, ARAssetPreview, ARTimelineBar as ARTimeline } from './cinematicComponents';
export { CinematicTimelinePlayer, ScenePreviewOverlay } from './CinematicTimelinePlayer';

export function ARSceneTriggerButton({ label = 'Play AR Scene', onClick, disabled }) {
  return (
    <button type="button" className="ghost cinematic-ar-trigger" onClick={onClick} disabled={disabled}>
      <Play size={16} /> {label}
    </button>
  );
}

export function ARSceneReplayButton({ onClick, disabled }) {
  return (
    <button type="button" className="ghost cinematic-ar-replay" onClick={onClick} disabled={disabled}>
      <RefreshCw size={14} /> Replay Scene
    </button>
  );
}

export function ARSceneUnavailable({ onContinue }) {
  return (
    <div className="cinematic-ar-error card">
      <p>Scene unavailable. Continue adventure.</p>
      <button type="button" onClick={onContinue}>
        <FastForward size={16} /> Continue
      </button>
    </div>
  );
}
