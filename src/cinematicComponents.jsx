import React, { useEffect, useRef } from 'react';
import { Camera, Sparkles } from 'lucide-react';

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
  const { assetType, assetUrl } = scene;

  if (assetType === 'video' && assetUrl) {
    return (
      <video
        className="cinematic-ar-asset video"
        src={assetUrl}
        autoPlay
        playsInline
        muted
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

export function ARAnimatedEntity({ scene, entity }) {
  if (!entity) return null;

  return (
    <div
      className={`cinematic-ar-entity-wrap ${entity.wrapClass || ''}`}
      style={entity.style}
      aria-hidden={!entity.visible}
    >
      <div className={`cinematic-ar-entity-inner ${entity.innerClass || ''}`}>
        <ARAssetPreview scene={scene} />
      </div>
    </div>
  );
}

export function ARTimelineBar({ durationSeconds, elapsed, className = '' }) {
  const pct = durationSeconds > 0 ? Math.min(100, (elapsed / durationSeconds) * 100) : 0;
  return (
    <div className={`cinematic-ar-timeline ${className}`} aria-hidden="true">
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}
