import React, { useEffect, useRef } from 'react';
import { Camera, Sparkles } from 'lucide-react';
import { buildParticleLayerClassList, resolveParticleLayers } from './particleFxEngine';
import { getCinematicEntity } from './cinematicAssetCatalog';

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

export function ARAssetPreview({ scene, playback = false }) {
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
    return (
      <img
        className={`cinematic-ar-asset image ${playback ? 'playback-asset' : ''}`}
        src={assetUrl}
        alt={scene.title || 'AR scene'}
      />
    );
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

const GHOST_ASSET_IDS = [
  'ghost-little-girl',
  'ghost-shadow',
  'ghost-woman-white',
  'ghost-hooded',
  'char-plague-doctor',
  'char-skeleton-knight',
  'char-pirate-captain',
];

const FAMILY_ASSET_PREFIXES = ['family-', 'edu-'];

function isFamilyAssetId(assetId) {
  const id = String(assetId || '');
  return FAMILY_ASSET_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function ARParticleLayers({ scene, entityVisible = true }) {
  const entity = getCinematicEntity(scene?.cinematicEntityId);
  const layers = resolveParticleLayers(entity || scene?.cinematicEntityId, scene?.particleLayers);
  if (!layers.length || !entityVisible) return null;

  const classList = buildParticleLayerClassList(layers);

  return (
    <div className={`cinematic-particle-stack ${scene?.safeForKids ? 'particle-family-safe' : ''}`} aria-hidden="true">
      {classList.map((className) => (
        <div key={className} className={`cinematic-particle-layer ${className}`}>
          <span className="particle-core" />
          <span className="particle-core particle-core-b" />
          <span className="particle-core particle-core-c" />
        </div>
      ))}
    </div>
  );
}

export function ARAnimatedEntity({ scene, entity }) {
  if (!entity) return null;

  const assetId = scene?.mediaAssetId || '';
  const isGhost =
    scene?.sceneType === 'ghost' ||
    GHOST_ASSET_IDS.includes(assetId) ||
    assetId.startsWith('char-');
  const isFamily = scene?.safeForKids || isFamilyAssetId(assetId);
  const ghostKind = GHOST_ASSET_IDS.find((id) => assetId === id) || (isGhost ? 'ghost' : '');
  const entitySlug = assetId ? `entity-${assetId}` : '';

  return (
    <div
      className={`cinematic-ar-entity-wrap ${entity.wrapClass || ''} ${isFamily ? 'entity-family-safe' : isGhost ? 'entity-horror' : ''} ${ghostKind ? `entity-${ghostKind}` : ''} ${entitySlug} ${scene?.silhouette ? 'entity-silhouette' : ''}`}
      style={entity.style}
      aria-hidden={!entity.visible}
    >
      <ARParticleLayers scene={scene} entityVisible={entity.visible} />
      <div className={`cinematic-ar-entity-inner ${entity.innerClass || ''}`}>
        <div className="cinematic-ar-entity-glow" aria-hidden="true" />
        <div className="cinematic-ar-entity-shadow" aria-hidden="true" />
        <ARAssetPreview scene={scene} playback />
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
