import React, { useEffect, useState } from 'react';

function BuildingPin({ building, map, onSelect }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!map || building.latitude == null) return undefined;
    const update = () => {
      const point = map.project([building.longitude, building.latitude]);
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
  }, [map, building.latitude, building.longitude]);

  if (!pos) return null;

  return (
    <button
      type="button"
      className={`world-building-pin ${building.className}${building.hot ? ' world-building-pin--hot' : ''}${building.boosted ? ' world-building-pin--boosted' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        opacity: 0.55 + building.intensity * 0.45,
      }}
      title={building.label}
      aria-label={building.label}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(building);
      }}
    >
      <span className="world-building-pin-glow" aria-hidden />
      {building.showLabel && (
        <span className="world-building-pin-label">{building.label}</span>
      )}
    </button>
  );
}

export function BuildingActivityLayer({ map, snapshot, onBuildingSelect }) {
  if (!map || !snapshot?.buildings?.length) return null;

  return (
    <div className="world-building-layer" aria-hidden>
      {snapshot.buildings.map((building) => (
        <BuildingPin
          key={building.id}
          building={building}
          map={map}
          onSelect={onBuildingSelect}
        />
      ))}
    </div>
  );
}
