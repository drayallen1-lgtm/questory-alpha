import React, { useEffect, useState } from 'react';

function TerritoryZone({ overlay, map, contested }) {
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
  const isContested = contested || overlay.contested;

  return (
    <span
      className={`territory-zone${isContested ? ' contested' : ''}`}
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
      <span className="territory-zone-label">
        {overlay.emblem ? `${overlay.emblem} ` : ''}
        {overlay.areaLabel || overlay.teamName}
      </span>
    </span>
  );
}

function TerritoryChip({ overlay, map, onSelect }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!map || overlay.latitude == null) return undefined;
    const update = () => {
      const point = map.project([overlay.longitude, overlay.latitude]);
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
  }, [map, overlay.latitude, overlay.longitude]);

  if (!pos || !onSelect) return null;

  return (
    <button
      type="button"
      className={`faction-territory-chip${overlay.contested ? ' contested' : ''}`}
      style={{ left: pos.x, top: pos.y + 36 }}
      onClick={() => onSelect(overlay.territoryId || overlay.id)}
      title={`${overlay.areaLabel} · ${overlay.teamName}`}
    >
      {overlay.emblem || '🏳️'} {overlay.areaLabel || overlay.teamName}
    </button>
  );
}

/** Team / faction territory overlays — visual zones + optional clickable chips */
export function TerritoryLayer({ map, overlays = [], onTerritorySelect = null }) {
  if (!map || !overlays.length) return null;

  return (
    <div className={`territory-layer faction-layer${onTerritorySelect ? ' has-chips' : ''}`} aria-hidden={!onTerritorySelect}>
      {overlays.map((overlay) => (
        <TerritoryZone key={overlay.id} overlay={overlay} map={map} contested={overlay.contested} />
      ))}
      {onTerritorySelect &&
        overlays.map((overlay) => (
          <TerritoryChip
            key={`chip-${overlay.id}`}
            overlay={overlay}
            map={map}
            onSelect={onTerritorySelect}
          />
        ))}
    </div>
  );
}
