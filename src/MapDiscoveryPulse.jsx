import React, { useEffect, useState } from 'react';

const PULSE_LIFETIME_MS = 3200;

function PulseItem({ pulse, map, onDone }) {
  const [pos, setPos] = useState(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!map || pulse.latitude == null) return undefined;
    const update = () => {
      const point = map.project([pulse.longitude, pulse.latitude]);
      setPos({ x: point.x, y: point.y });
    };
    update();
    map.on('move', update);
    map.on('zoom', update);
    return () => {
      map.off('move', update);
      map.off('zoom', update);
    };
  }, [map, pulse.latitude, pulse.longitude]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setVisible(false);
      onDone?.(pulse.id);
    }, PULSE_LIFETIME_MS);
    return () => window.clearTimeout(t);
  }, [pulse.id, onDone]);

  if (!visible || !pos) return null;

  return (
    <div
      className={`map-discovery-pulse map-discovery-pulse-${pulse.kind || 'discovered'}`}
      style={{ left: pos.x, top: pos.y }}
    >
      <span className="map-discovery-pulse-ring" aria-hidden="true" />
      <span className="map-discovery-pulse-sparkle" aria-hidden="true" />
      {pulse.label && <span className="map-discovery-pulse-label">{pulse.label}</span>}
    </div>
  );
}

export function MapDiscoveryPulse({ map, pulses = [], onPulseComplete }) {
  const [active, setActive] = useState([]);

  useEffect(() => {
    if (!pulses.length) return;
    setActive((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const merged = [...prev];
      for (const p of pulses) {
        if (!ids.has(p.id)) merged.push(p);
      }
      return merged.slice(-8);
    });
  }, [pulses]);

  const handleDone = (id) => {
    setActive((prev) => prev.filter((p) => p.id !== id));
    onPulseComplete?.(id);
  };

  if (!map || !active.length) return null;

  return (
    <div className="map-discovery-pulse-layer" aria-hidden="true">
      {active.map((pulse) => (
        <PulseItem key={pulse.id} pulse={pulse} map={map} onDone={handleDone} />
      ))}
    </div>
  );
}

export function triggerDiscoveryPulse(setPulseTrigger, payload) {
  setPulseTrigger({
    ...payload,
    id: payload.id || `pulse-${Date.now()}`,
    createdAt: Date.now(),
  });
}
