import React, { useEffect, useState } from 'react';

function ArMarker({ marker, map }) {
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
    <div className="ar-treasure-marker" style={{ left: pos.x, top: pos.y }} aria-hidden="true">
      <span className="ar-treasure-sparkle" />
      <span className="ar-treasure-icon">📱</span>
    </div>
  );
}

/** AR treasure reveal indicators on map pins */
export function ArTreasureLayer({ map, markers = [] }) {
  if (!map || !markers.length) return null;

  return (
    <div className="ar-treasure-layer" aria-hidden="true">
      {markers.map((marker) => (
        <ArMarker key={marker.id} marker={marker} map={map} />
      ))}
    </div>
  );
}
