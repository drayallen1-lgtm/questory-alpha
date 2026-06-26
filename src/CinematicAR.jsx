import React, { useEffect, useRef, useState } from 'react';
import { Camera, FastForward, Play, RefreshCw, SkipForward, Sparkles } from 'lucide-react';
import { normalizeArScene, AR_INTERACTIONS } from './arEngine';

export function ARCameraFrame({ stream, fallback = false, className = '' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  if (fallback || !stream) {
    return (
      <div className={`cinematic-ar-camera-fallback ${className}`} aria-hidden="true">
        <Camera size={48} />
        <p>Camera unavailable — cinematic mode</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`cinematic-ar-camera ${className}`}
    />
  );
}

export function ARAssetPreview({ scene }) {
  if (!scene) return null;
  const { assetType, assetUrl, audioUrl } = scene;

  if (assetType === 'video' && assetUrl) {
    return (
      <video
        className="cinematic-ar-asset video"
        src={assetUrl}
        autoPlay
        playsInline
        muted={!audioUrl}
        loop
      />
    );
  }

  if (assetType === 'image' && assetUrl) {
    return <img className="cinematic-ar-asset image" src={assetUrl} alt={scene.title || 'AR scene'} />;
  }

  if (assetType === 'model' && assetUrl) {
    return (
      <div className="cinematic-ar-asset model-placeholder">
        <Sparkles size={32} />
        <p>3D model preview coming soon</p>
        <small>{assetUrl}</small>
      </div>
    );
  }

  const icon =
    scene.sceneType === 'ghost'
      ? '👻'
      : scene.sceneType === 'diary'
        ? '📖'
        : scene.sceneType === 'jump_scare'
          ? '⚡'
          : scene.sceneType === 'portal'
            ? '🌀'
            : scene.sceneType === 'memory'
              ? '🎞'
              : '✨';

  return <div className="cinematic-ar-asset icon-asset">{icon}</div>;
}

export function ARTimeline({ durationSeconds, elapsed, className = '' }) {
  const pct = durationSeconds > 0 ? Math.min(100, (elapsed / durationSeconds) * 100) : 0;
  return (
    <div className={`cinematic-ar-timeline ${className}`} aria-hidden="true">
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

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

        <ARTimeline durationSeconds={scene.durationSeconds} elapsed={elapsed} />

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

  return (
    <div className="cinematic-ar-overlay-root">
      <ARScenePlayer
        scene={scene}
        onComplete={onComplete}
        onSkip={onSkip}
        useCamera={useCamera}
        onError={() => onComplete?.()}
      />
    </div>
  );
}

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
