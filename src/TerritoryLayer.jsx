import React, { useEffect, useState } from 'react';

function TerritoryZone({ overlay, map }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!map || overlay.latitude == null) return undefined;
    const update = () => {
      const point = map.project([overlay.longitude, overlay.latitude]);
      const zoom = map.getZoom();
      const scale = Math.max(0.5, Math.min(2.2, (overlay.radiusM / 400) * (zoom / 12)));
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
  }, [map, overlay.latitude, overlay.longitude, overlay.radiusM]);

  if (!pos) return null;

  const size = 120 * pos.scale;

  return (
    <span
      className="territory-zone"
      style={{
        left: pos.x,
        top: pos.y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        '--territory-color': overlay.teamColor,
        '--territory-opacity': overlay.opacity,
      }}
      aria-hidden="true"
      title={`${overlay.teamName} · ${overlay.areaLabel}`}
    >
      <span className="territory-zone-fill" />
      <span className="territory-zone-label">{overlay.teamName}</span>
    </span>
  );
}

/** Team territory overlays — visual only, pointer-events none */
export function TerritoryLayer({ map, overlays = [] }) {
  if (!map || !overlays.length) return null;

  return (
    <div className="territory-layer" aria-hidden="true">
      {overlays.map((overlay) => (
        <TerritoryZone key={overlay.id} overlay={overlay} map={map} />
      ))}
    </div>
  );
}
