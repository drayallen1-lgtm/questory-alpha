import React, { useEffect, useState } from 'react';

function CityRing({ ring, map }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!map || ring.latitude == null) return undefined;
    const update = () => {
      const point = map.project([ring.longitude, ring.latitude]);
      const zoom = map.getZoom();
      const scale = Math.max(0.6, Math.min(1.8, zoom / 11));
      setPos({ x: point.x, y: point.y, scale });
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
  }, [map, ring.latitude, ring.longitude]);

  if (!pos) return null;

  const size = 100 * pos.scale;

  return (
    <span
      className={`city-discovery-ring city-discovery-tier-${ring.tier} city-discovery-fog-${ring.fogLayer}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        '--ring-pct': ring.completionPercent,
      }}
      aria-hidden="true"
      title={`${ring.label} · ${Math.round(ring.completionPercent)}%`}
    >
      <span className="city-discovery-ring-glow" />
    </span>
  );
}

/** Glowing city completion rings — pointer-events none */
export function CityDiscoveryRingLayer({ map, rings = [], minZoom = 8 }) {
  const [zoom, setZoom] = useState(minZoom);

  useEffect(() => {
    if (!map) return undefined;
    const update = () => setZoom(map.getZoom());
    update();
    map.on('zoom', update);
    return () => map.off('zoom', update);
  }, [map]);

  if (!map || zoom < minZoom || !rings.length) return null;

  return (
    <div className="city-discovery-ring-layer" aria-hidden="true">
      {rings.map((ring) => (
        <CityRing key={ring.id} ring={ring} map={map} />
      ))}
    </div>
  );
}
