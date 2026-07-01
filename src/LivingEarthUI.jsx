import React, { useEffect, useMemo, useState } from 'react';
import { formatDiscoveryPercent } from './worldDiscoveryEngine';
import { markEarthCeremonySeen, latLngToGlobePosition } from './livingEarthEngine';

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function LivingEarthWorldHud({ hud }) {
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const target = hud?.completionPercent ?? 0;
    setDisplayPct(0);
    const steps = 24;
    let frame = 0;
    const tick = window.setInterval(() => {
      frame += 1;
      setDisplayPct((target * frame) / steps);
      if (frame >= steps) window.clearInterval(tick);
    }, 16);
    return () => window.clearInterval(tick);
  }, [hud?.completionPercent]);

  if (!hud) return null;

  return (
    <div className="living-earth-world-hud" role="status" aria-live="polite">
      <span className="living-earth-world-hud-globe" aria-hidden="true">
        🌍
      </span>
      <div className="living-earth-world-hud-body">
        <div className="living-earth-world-hud-head">
          <strong>{hud.label}</strong>
          <span className="living-earth-world-hud-pct">
            {formatDiscoveryPercent(displayPct, 2)}%
          </span>
        </div>
        <p className="living-earth-world-hud-sub">Discovered</p>
        <code className="living-earth-world-hud-bar" aria-hidden="true">
          {hud.progressBar}
        </code>
        <div className="living-earth-world-hud-meta">
          <span>{hud.discoveries?.toLocaleString()} Discoveries</span>
          <span>{hud.explorers?.toLocaleString()} Explorers</span>
        </div>
      </div>
    </div>
  );
}

function GlobeMarker({ item, kind, onSelect, reducedMotion }) {
  const shimmer = item.visual?.shimmer && !reducedMotion;
  return (
    <button
      type="button"
      className={`living-earth-globe-marker living-earth-globe-marker-${kind}${item.pulse && !reducedMotion ? ' living-earth-globe-marker-pulse' : ''}${shimmer ? ' living-earth-globe-marker-shimmer' : ''}`}
      style={{
        left: `${item.position.x}%`,
        top: `${item.position.y}%`,
        '--marker-color': item.visual?.fill || '#3b82f6',
      }}
      onClick={() => onSelect?.(item)}
      title={`${item.label} · ${Math.round(item.completionPercent ?? 0)}%`}
    >
      <span className="living-earth-globe-marker-dot" aria-hidden="true" />
      <span className="living-earth-globe-marker-label">{item.label}</span>
    </button>
  );
}

function StreamPulse({ pulse, reducedMotion }) {
  return (
    <div
      className={`living-earth-stream-pulse${reducedMotion ? '' : ' living-earth-stream-pulse-animate'}`}
      style={{
        left: `${pulse.position.x}%`,
        top: `${pulse.position.y}%`,
        opacity: pulse.opacity ?? 0.8,
      }}
      role="status"
    >
      <span className="living-earth-stream-pulse-ring" aria-hidden="true" />
      <span className="living-earth-stream-pulse-text">
        {pulse.label} {pulse.text}
      </span>
    </div>
  );
}

export function LivingEarthGlobe({ snapshot, onFlyTo, reducedMotion }) {
  const { continents, countries, bossBeacons, creatorWorlds, pulses, seasonAtmosphere, fullEarth } =
    snapshot;

  const morphOpacity = fullEarth ? 1 : 0.55;

  return (
    <div
      className={`living-earth-globe-wrap ${seasonAtmosphere?.className || ''}`}
      style={{ opacity: morphOpacity }}
      aria-hidden={!snapshot.earthMode}
    >
      <div
        className={`living-earth-globe${reducedMotion ? ' living-earth-globe-static' : ''}`}
      >
        <div className="living-earth-globe-sphere">
          <div className="living-earth-globe-terminator" />
          <div className="living-earth-globe-night-glow" />
          {continents.map((c) => (
            <GlobeMarker
              key={c.id}
              item={c}
              kind="continent"
              onSelect={(item) => {
                const target = item.regionId
                  ? { latitude: item.latitude, longitude: item.longitude, zoom: 2 }
                  : { latitude: item.latitude, longitude: item.longitude, zoom: 2 };
                onFlyTo?.(target);
              }}
              reducedMotion={reducedMotion}
            />
          ))}
          {countries.map((c) => (
            <GlobeMarker
              key={c.id}
              item={c}
              kind="country"
              onSelect={(item) =>
                onFlyTo?.({
                  latitude: item.latitude,
                  longitude: item.longitude,
                  zoom: 4,
                })
              }
              reducedMotion={reducedMotion}
            />
          ))}
          {bossBeacons.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`living-earth-boss-beacon${reducedMotion ? '' : ' living-earth-boss-beacon-pulse'}`}
              style={{ left: `${b.position.x}%`, top: `${b.position.y}%` }}
              onClick={() =>
                onFlyTo?.({
                  latitude: b.latitude,
                  longitude: b.longitude,
                  zoom: 10,
                })
              }
              title={`${b.label} · ${b.hoursRemaining}h · ${b.participants} explorers`}
            >
              <span aria-hidden="true">{b.icon}</span>
              <small>{b.communityProgress}%</small>
            </button>
          ))}
          {creatorWorlds.map((w) => (
            <button
              key={w.id}
              type="button"
              className="living-earth-creator-marker"
              style={{ left: `${w.position.x}%`, top: `${w.position.y}%` }}
              onClick={() =>
                onFlyTo?.({
                  latitude: w.latitude,
                  longitude: w.longitude,
                  zoom: 11,
                })
              }
              title={w.label}
            >
              ✨
            </button>
          ))}
          {(snapshot.heatZones || []).map((zone) => {
            const pos = latLngToGlobePosition(zone.latitude, zone.longitude);
            return (
              <div
                key={zone.id}
                className={`living-earth-heat-zone living-earth-heat-zone-${zone.level}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                title={zone.title}
              />
            );
          })}
        </div>
        <div
          className={`living-earth-globe-clouds${reducedMotion ? ' living-earth-globe-clouds-static' : ''}`}
        />
      </div>

      <div className="living-earth-stream-layer">
        {pulses.map((p) => (
          <StreamPulse key={p.id} pulse={p} reducedMotion={reducedMotion} />
        ))}
      </div>
      <div className={`living-earth-weather${reducedMotion ? ' living-earth-weather-static' : ''}`} aria-hidden="true">
        <span className="living-earth-weather-rain" />
        <span className="living-earth-weather-storm" />
        <span className="living-earth-weather-aurora" />
        <span className="living-earth-weather-fog" />
      </div>
    </div>
  );
}

function ContinentCard({ continent, onFlyTo }) {
  return (
    <button
      type="button"
      className="living-earth-continent-card"
      onClick={() =>
        onFlyTo?.({
          latitude: continent.latitude,
          longitude: continent.longitude,
          zoom: 2,
        })
      }
    >
      <div className="living-earth-continent-card-head">
        <strong>{continent.label}</strong>
        <span>{Math.round(continent.completionPercent)}%</span>
      </div>
      <div className="living-earth-continent-card-meta">
        <span>{continent.explorers?.toLocaleString()} explorers</span>
        <span
          className="living-earth-fog-chip"
          style={{ background: continent.visual?.fill }}
        >
          {continent.visual?.label}
        </span>
      </div>
    </button>
  );
}

function CountryCard({ country, onFlyTo }) {
  return (
    <button
      type="button"
      className="living-earth-country-card"
      onClick={() =>
        onFlyTo?.({
          latitude: country.latitude,
          longitude: country.longitude,
          zoom: 4,
        })
      }
    >
      <strong>{country.label}</strong>
      <span>{Math.round(country.completionPercent)}% complete</span>
    </button>
  );
}

export function LivingEarthDiscoveryPanel({ snapshot, onFlyTo }) {
  const {
    continents,
    countries,
    globalGoals,
    bossBeacons,
    creatorWorlds,
    liveExplorerCount,
    timelineEntries,
  } = snapshot;

  return (
    <aside className="living-earth-discovery-panel" aria-label="Earth discovery overlay">
      <header className="living-earth-discovery-panel-head">
        <h4>Living Earth</h4>
        <span>{liveExplorerCount?.toLocaleString()} explorers live</span>
      </header>

      <section className="living-earth-section">
        <h5>Continents</h5>
        <div className="living-earth-continent-grid">
          {continents.map((c) => (
            <ContinentCard key={c.id} continent={c} onFlyTo={onFlyTo} />
          ))}
        </div>
      </section>

      <section className="living-earth-section">
        <h5>Countries</h5>
        <div className="living-earth-country-list">
          {countries.map((c) => (
            <CountryCard key={c.id} country={c} onFlyTo={onFlyTo} />
          ))}
        </div>
      </section>

      <section className="living-earth-section">
        <h5>Global Goals</h5>
        {globalGoals.map((goal) => {
          const pct = Math.min(100, (goal.current / goal.target) * 100);
          return (
            <div key={goal.id} className="living-earth-goal-row">
              <span>{goal.icon}</span>
              <span>{goal.label}</span>
              <div className="living-earth-goal-bar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <small>{Math.round(pct)}%</small>
            </div>
          );
        })}
      </section>

      {bossBeacons.length > 0 && (
        <section className="living-earth-section">
          <h5>World Bosses</h5>
          {bossBeacons.map((b) => (
            <button
              key={b.id}
              type="button"
              className="living-earth-boss-row"
              onClick={() =>
                onFlyTo?.({
                  latitude: b.latitude,
                  longitude: b.longitude,
                  zoom: 10,
                })
              }
            >
              <span>{b.icon}</span>
              <span>{b.label}</span>
              <small>{b.hoursRemaining}h · {b.participants} joined</small>
            </button>
          ))}
        </section>
      )}

      {creatorWorlds.length > 0 && (
        <section className="living-earth-section">
          <h5>Creator Worlds</h5>
          {creatorWorlds.slice(0, 4).map((w) => (
            <button
              key={w.id}
              type="button"
              className="living-earth-creator-row"
              onClick={() =>
                onFlyTo?.({
                  latitude: w.latitude,
                  longitude: w.longitude,
                  zoom: 11,
                })
              }
            >
              <span>✨ {w.label}</span>
              <small>{w.progressPct}% · {w.creatorName}</small>
            </button>
          ))}
        </section>
      )}

      {timelineEntries?.length > 0 && (
        <section className="living-earth-section living-earth-timeline">
          <h5>Live Discoveries</h5>
          {timelineEntries.slice(0, 4).map((entry) => (
            <div key={entry.id} className="living-earth-timeline-row">
              <span>{entry.icon || '📍'}</span>
              <span>{entry.text || entry.label}</span>
            </div>
          ))}
        </section>
      )}
    </aside>
  );
}

export function LivingEarthCeremonyToast({ ceremony, onDismiss, onSeen }) {
  useEffect(() => {
    if (ceremony?.id) onSeen?.(ceremony.id);
  }, [ceremony?.id, onSeen]);

  if (!ceremony) return null;

  return (
    <div className="living-earth-ceremony" role="alert">
      <span className="living-earth-ceremony-icon">{ceremony.icon}</span>
      <div>
        <strong>Discovery Ceremony</strong>
        <p>{ceremony.title}</p>
      </div>
      <button type="button" className="ghost" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}

/**
 * Living Earth presentation overlay — sits above QuestoryMap at continent/world zoom.
 */
export function LivingEarthOverlay({
  snapshot,
  onFlyTo,
  setState,
  showDiscoveryPanel = true,
}) {
  const reducedMotion = useReducedMotion();
  const [ceremonyDismissed, setCeremonyDismissed] = useState(false);

  const activeCeremony = useMemo(() => {
    if (ceremonyDismissed || !snapshot?.ceremonies?.length) return null;
    return snapshot.ceremonies[0];
  }, [ceremonyDismissed, snapshot?.ceremonies]);

  if (!snapshot?.earthMode) return null;

  const handleCeremonySeen = (id) => {
    if (!setState) return;
    setState((s) => markEarthCeremonySeen(s, id));
  };

  return (
    <div
      className={`living-earth-overlay${snapshot.fullEarth ? ' living-earth-overlay-full' : ''}${reducedMotion ? ' living-earth-reduced-motion' : ''}`}
      aria-label="Living Earth view"
    >
      {snapshot.fullEarth && <LivingEarthWorldHud hud={snapshot.worldHud} />}
      <LivingEarthGlobe snapshot={snapshot} onFlyTo={onFlyTo} reducedMotion={reducedMotion} />
      {showDiscoveryPanel && snapshot.fullEarth && (
        <LivingEarthDiscoveryPanel snapshot={snapshot} onFlyTo={onFlyTo} />
      )}
      {!ceremonyDismissed && activeCeremony && (
        <LivingEarthCeremonyToast
          ceremony={activeCeremony}
          onDismiss={() => setCeremonyDismissed(true)}
          onSeen={handleCeremonySeen}
        />
      )}
    </div>
  );
}
