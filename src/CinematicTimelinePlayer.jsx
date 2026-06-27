import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { SkipForward, Volume2 } from 'lucide-react';
import { normalizeArScene } from './arEngine';
import { getCameraFxClassList } from './cameraFxEngine';
import {
  computePlaybackAtTime,
  createTimelineRunner,
} from './timelineEngine';
import { createAudioTimelineController } from './audioTimelineEngine';
import { ARCameraFrame, ARAnimatedEntity, ARTimelineBar } from './cinematicComponents';

function useTimelinePlayback(scene, { paused = false, onAutoplayBlocked }) {
  const [playback, setPlayback] = useState(() =>
    computePlaybackAtTime(scene, 0, 0)
  );
  const runnerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (paused) return undefined;

    const audioController = createAudioTimelineController({
      onAutoplayBlocked,
    });
    audioRef.current = audioController;

    const runner = createTimelineRunner(
      scene,
      (snapshot, prevElapsed) => {
        audioController.sync(scene.timeline, snapshot.elapsed, prevElapsed);
        setPlayback(snapshot);
      },
      () => {
        setPlayback((p) => ({ ...p, phase: 'outro', complete: true }));
      }
    );

    runnerRef.current = runner;
    runner.start();

    return () => {
      runner.stop();
      audioController.stopAll();
      audioRef.current = null;
    };
  }, [scene, paused, onAutoplayBlocked]);

  const unlockAudio = useCallback(() => {
    audioRef.current?.unlockAll?.();
  }, []);

  return { playback, unlockAudio };
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
    rawScene?.description,
    rawScene?.assetUrl,
    rawScene?.assetType,
    rawScene?.audioUrl,
    rawScene?.overlayText,
    rawScene?.revealText,
    rawScene?.atmosphere,
    rawScene?.jumpScare,
    rawScene?.silhouette,
    rawScene?.mediaAssetId,
    rawScene?.durationSeconds,
    JSON.stringify(rawScene?.timeline || []),
  ]);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFallback, setCameraFallback] = useState(!useCamera);
  const [finished, setFinished] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const onAutoplayBlocked = useCallback(() => setAudioBlocked(true), []);

  const { playback, unlockAudio } = useTimelinePlayback(scene, {
    paused: finished,
    onAutoplayBlocked,
  });

  useEffect(() => {
    setFinished(false);
    setSkipped(false);
    setAudioBlocked(false);
  }, [scene]);

  useEffect(() => {
    let stream;
    let cancelled = false;

    if (!useCamera) {
      setCameraFallback(true);
      setCameraStream(null);
      return undefined;
    }

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
  }, [useCamera, scene]);

  useEffect(() => {
    if (playback.complete && !finished && !skipped) {
      setFinished(true);
    }
  }, [playback.complete, finished, skipped]);

  function handleContinue() {
    onComplete?.();
  }

  function handleSkip() {
    setSkipped(true);
    setFinished(true);
  }

  function handleEnableSound() {
    unlockAudio();
    setAudioBlocked(false);
  }

  const fxClasses = getCameraFxClassList(playback.activeFx).join(' ');
  const showOutro = finished && (skipped || playback.complete);
  const shortDesc =
    scene.description &&
    scene.description !== scene.overlayText &&
    scene.description !== scene.title &&
    scene.description.length < 80
      ? scene.description
      : null;

  return (
    <div
      className={`cinematic-ar-player timeline-driven scene-${scene.sceneType} ${fxClasses} ${preview ? 'is-preview' : ''}`}
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

        <div className="cinematic-ar-entity-layer" aria-hidden={!playback.entity?.visible}>
          <ARAnimatedEntity scene={scene} entity={playback.entity} />
        </div>

        <div className="cinematic-ar-content">
          {shortDesc && playback.elapsed > 0.4 && playback.elapsed < 2.8 ? (
            <p className="cinematic-ar-desc">{shortDesc}</p>
          ) : null}

          {playback.showOverlay && playback.overlayText ? (
            <p
              className="cinematic-ar-overlay-text"
              style={{ opacity: playback.overlayOpacity ?? 1 }}
            >
              {playback.overlayText}
            </p>
          ) : null}

          {playback.revealText ? (
            <p className="cinematic-ar-reveal-text">{playback.revealText}</p>
          ) : null}

          {audioBlocked && (
            <button type="button" className="cinematic-audio-unlock" onClick={handleEnableSound}>
              <Volume2 size={16} /> Tap to enable sound
            </button>
          )}

          {showOutro && (
            <div className="cinematic-ar-outro">
              <p className="cinematic-ar-complete-label">Scene complete</p>
              <button type="button" className="cinematic-ar-continue" onClick={handleContinue}>
                Continue
              </button>
            </div>
          )}
        </div>
      </div>

      <ARTimelineBar durationSeconds={scene.durationSeconds} elapsed={playback.elapsed} />

      <div className="cinematic-ar-controls">
        <button type="button" className="ghost cinematic-skip-btn" onClick={handleSkip}>
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
        <span className="scene-preview-badge">Preview only</span>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <CinematicTimelinePlayer
        scene={scene}
        onComplete={onClose}
        useCamera
        preview
      />
    </div>
  );
}
