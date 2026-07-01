import React, { useEffect, useState } from 'react';

function TrailPoint({ point, map }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!map || point.latitude == null) return undefined;
    const update = () => {
      const p = map.project([point.longitude, point.latitude]);
      setPos({ x: p.x, y: p.y });
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
  }, [map, point.latitude, point.longitude]);

  if (!pos || point.opacity <= 0.04) return null;

  return (
    <span
      className="discovery-trail-point"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: point.opacity,
        '--trail-scale': 0.6 + point.opacity * 0.5,
      }}
      aria-hidden="true"
    >
      <span className="discovery-trail-footprint" />
    </span>
  );
}

/**
 * Fading trail of recent discoveries — visual only, pointer-events none.
 */
export function DiscoveryTrailLayer({ map, trail = [] }) {
  if (!map || !trail.length) return null;

  return (
    <div className="discovery-trail-layer" aria-hidden="true">
      {trail.map((point) => (
        <TrailPoint key={point.id} point={point} map={map} />
      ))}
    </div>
  );
}
