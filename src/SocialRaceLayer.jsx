import React, { useEffect, useState } from 'react';

function RaceMarker({ marker, map }) {
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
    <div
      className="social-race-marker"
      style={{ left: pos.x, top: pos.y }}
      aria-hidden="true"
      title={`${marker.explorersRacing} racing · ${marker.countdownMinutes}m left`}
    >
      <span className="social-race-ring" />
      <span className="social-race-icon">⚡</span>
      <span className="social-race-count">{marker.explorersRacing}</span>
    </div>
  );
}

/** Live race indicators on adventure locations — pointer-events none */
export function SocialRaceLayer({ map, markers = [] }) {
  if (!map || !markers.length) return null;

  return (
    <div className="social-race-layer" aria-hidden="true">
      {markers.map((marker) => (
        <RaceMarker key={marker.id} marker={marker} map={map} />
      ))}
    </div>
  );
}
