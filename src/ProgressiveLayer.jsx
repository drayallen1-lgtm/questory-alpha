import React from 'react';

/**
 * Wraps map/HUD children with progressive layer opacity from getProgressiveLayerSnapshot.
 */
export function ProgressiveLayer({ layerId, layers, children, className = '' }) {
  if (!layers) return <>{children}</>;

  const meta = layers[layerId];
  if (!meta || meta.opacity <= 0.04) return null;

  return (
    <div
      className={`world-progressive-layer world-progressive-layer--${layerId}${
        meta.visible ? ' world-progressive-layer--visible' : ''
      }${className ? ` ${className}` : ''}`}
      style={{ '--layer-opacity': meta.opacity }}
      data-layer-opacity={meta.opacity.toFixed(2)}
      aria-hidden={meta.opacity < 0.2}
    >
      {children}
    </div>
  );
}
