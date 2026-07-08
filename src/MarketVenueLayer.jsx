import React, { useEffect, useState } from 'react';

function MarketVenuePin({ venue, map, selected, showLabels, onSelect }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!map || venue.latitude == null) return undefined;
    const update = () => {
      const point = map.project([venue.longitude, venue.latitude]);
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
  }, [map, venue.latitude, venue.longitude]);

  if (!pos) return null;

  const labelVisible = showLabels || selected;
  const className = [
    'map-market-venue',
    selected ? 'map-market-venue--selected' : '',
    venue.hot ? 'map-market-venue--hot' : '',
    venue.boosted ? 'map-market-venue--boosted' : '',
    labelVisible ? '' : 'map-market-venue--compact',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      style={{ left: pos.x, top: pos.y }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(venue.id);
      }}
      title={`${venue.label} · ${venue.liveCount || 0} live`}
      aria-label={`${venue.label}, ${venue.liveCount || 0} live`}
      aria-pressed={selected}
    >
      <span className="map-market-venue-icon" aria-hidden>
        {venue.icon}
      </span>
      {labelVisible && <span className="map-market-venue-label">{venue.label}</span>}
      {venue.liveCount > 0 && (
        <span className="map-market-venue-count" aria-hidden>
          {venue.liveCount}
        </span>
      )}
    </button>
  );
}

/** Tappable marketplace venues on the living world map */
export function MarketVenueLayer({
  map,
  venues = [],
  selectedVenueId = null,
  showLabels = false,
  onVenueSelect = null,
}) {
  if (!map || !venues.length || !onVenueSelect) return null;

  return (
    <div className="market-venue-layer" aria-label="Market venues">
      {venues.map((venue) => (
        <MarketVenuePin
          key={venue.id}
          venue={venue}
          map={map}
          selected={venue.id === selectedVenueId}
          showLabels={showLabels}
          onSelect={onVenueSelect}
        />
      ))}
    </div>
  );
}
