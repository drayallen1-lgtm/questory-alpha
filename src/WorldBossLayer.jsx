import React, { useEffect, useState } from 'react';

function BossAura({ marker, map }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!map || marker.latitude == null) return undefined;
    const update = () => {
      const point = map.project([marker.longitude, marker.latitude]);
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
  }, [map, marker.latitude, marker.longitude]);

  if (!pos) return null;

  return (
    <div className="world-boss-marker" style={{ left: pos.x, top: pos.y }} aria-hidden="true">
      <span className="world-boss-ring world-boss-ring-a" />
      <span className="world-boss-ring world-boss-ring-b" />
      <span className="world-boss-core">{marker.icon || '🏮'}</span>
      <span className="world-boss-label">{marker.title || 'World Boss'}</span>
    </div>
  );
}

/** World boss hunt aura — visual only */
export function WorldBossLayer({ map, marker = null }) {
  if (!map || !marker) return null;

  return (
    <div className="world-boss-layer" aria-hidden="true">
      <BossAura marker={marker} map={map} />
    </div>
  );
}
