import React, { useEffect, useState } from 'react';

function GeographyLabel({ feature, map, selected }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!map || feature.latitude == null) return undefined;
    const update = () => {
      const point = map.project([feature.longitude, feature.latitude]);
      setPos({ x: point.x, y: point.y });
    };
    update();
    map.on('move', update);
    map.on('zoom', update);
    map.on('resize', update);
    return () => {
      map.off('move', update);
      map.off('zoom', update);
      map.off('resize', update);
    };
  }, [map, feature.latitude, feature.longitude]);

  if (!pos || !feature.showLabel) return null;

  return (
    <span
      className={`geography-label geography-label--${feature.type}${selected ? ' geography-label--selected' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        opacity: feature.opacity,
      }}
      aria-hidden
    >
      {feature.label}
    </span>
  );
}

export function GeographyLayer({ map, snapshot }) {
  if (!map || !snapshot?.features?.length) return null;

  return (
    <div className="geography-layer" aria-hidden>
      {snapshot.features.map((feature) => (
        <GeographyLabel key={feature.id} feature={feature} map={map} />
      ))}
    </div>
  );
}
