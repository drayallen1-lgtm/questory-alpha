import React, { useEffect, useMemo, useState } from 'react';
import { getLivingCitySnapshot } from './livingCityEngine';

export function LivingCityPanel({
  state,
  adventures = [],
  layerSnapshot = null,
  nav,
}) {
  const zoom = layerSnapshot?.zoom ?? 11;
  const now = Date.now();

  const snapshot = useMemo(
    () =>
      getLivingCitySnapshot({
        state,
        adventures,
        zoom,
        now,
        layerSnapshot,
      }),
    [state, adventures, zoom, layerSnapshot]
  );

  const [pulseIndex, setPulseIndex] = useState(0);

  useEffect(() => {
    if (!snapshot.visible || snapshot.pulses.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setPulseIndex((idx) => (idx + 1) % snapshot.pulses.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [snapshot.visible, snapshot.pulses.length]);

  if (!snapshot.visible) return null;

  const activePulse = snapshot.pulses[pulseIndex] || snapshot.topPulse;

  function handlePulseAction(pulse) {
    if (!nav || !pulse?.action) return;
    if (pulse.action === 'guild') nav('social', undefined, { adminTab: 'guild' });
    if (pulse.action === 'director') nav('ai-director');
    if (pulse.action === 'create') nav('create');
    if (pulse.action === 'sponsor') nav('sponsor');
  }

  return (
    <section className="living-city-panel" aria-label={`${snapshot.cityName} is alive`}>
      <div className="living-city-panel-head">
        <div>
          <h2 className="living-city-name">{snapshot.cityName}</h2>
          <p className="living-city-tagline">{snapshot.tagline}</p>
        </div>
        <span className="living-city-alive-badge" aria-hidden>
          LIVE
        </span>
      </div>

      <div className="living-city-pulse-feed">
        {snapshot.pulses.slice(0, 4).map((pulse) => (
          <button
            key={pulse.id}
            type="button"
            className={`living-city-pulse${
              activePulse?.id === pulse.id ? ' living-city-pulse--active' : ''
            }`}
            onClick={() => handlePulseAction(pulse)}
          >
            <span className="living-city-pulse-icon" aria-hidden>
              {pulse.icon}
            </span>
            <span className="living-city-pulse-text">{pulse.text}</span>
          </button>
        ))}
      </div>

      {activePulse && (
        <p className="living-city-spotlight" aria-live="polite">
          <span className="living-city-spotlight-icon" aria-hidden>
            {activePulse.icon}
          </span>
          {activePulse.text}
        </p>
      )}
    </section>
  );
}
