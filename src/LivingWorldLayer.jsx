import React, { useEffect, useState } from 'react';

function projectPoint(map, coords) {
  if (!map || !coords) return null;
  const point = map.project(coords);
  return { x: point.x, y: point.y };
}

function ExplorerDot({ dot, map, reducedMotion }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!map) return undefined;
    const update = () => {
      setPos(projectPoint(map, [dot.longitude, dot.latitude]));
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
  }, [map, dot.longitude, dot.latitude]);

  if (!pos) return null;

  return (
    <span
      className={`living-world-explorer${reducedMotion ? ' reduced-motion' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        '--explorer-color': dot.teamColor,
        '--explorer-phase': dot.phase,
      }}
      aria-hidden="true"
      title="Explorer nearby"
    />
  );
}

function HeatZone({ zone, map }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!map) return undefined;
    const update = () => {
      setPos(projectPoint(map, [zone.longitude, zone.latitude]));
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
  }, [map, zone.longitude, zone.latitude]);

  if (!pos) return null;

  return (
    <span
      className={`living-world-heat living-world-heat-${zone.level}`}
      style={{ left: pos.x, top: pos.y }}
      aria-hidden="true"
    />
  );
}

/**
 * Visual-only living world layer — explorers, heat auras, fog, event atmosphere.
 * pointer-events: none — does not block map clicks.
 */
export function LivingWorldLayer({
  map,
  explorerDots = [],
  heatZones = [],
  atmosphereClass = '',
  revealedCount = 0,
  showFog = true,
}) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (!map) return null;

  return (
    <div
      className={[
        'living-world-layer',
        atmosphereClass,
        showFog ? 'living-world-fog-on' : '',
        revealedCount > 0 ? 'living-world-has-revealed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      {showFog && <div className="living-world-fog-vignette" />}
      {heatZones.map((zone) => (
        <HeatZone key={zone.id} zone={zone} map={map} />
      ))}
      {explorerDots.map((dot) => (
        <ExplorerDot key={dot.id} dot={dot} map={map} reducedMotion={reducedMotion} />
      ))}
    </div>
  );
}
