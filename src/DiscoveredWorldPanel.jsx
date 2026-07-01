import React from 'react';
import { DISCOVERY_LEVELS } from './worldDiscoveryEngine';

export function DiscoveredWorldPanel({ snapshot, expanded = true }) {
  if (!snapshot || !expanded) return null;

  const { currentRegion, worldRegion, globalGoals, leaderboards, firstDiscoveries, badges } =
    snapshot;

  return (
    <div className="card discovered-world-panel">
      <div className="discovered-world-head">
        <h4>The Discovered World</h4>
        <span className={`discovered-world-tier discovered-world-tier-${currentRegion.completionTier}`}>
          {currentRegion.completionTier}
        </span>
      </div>

      <p className="discovered-world-tagline">
        Humanity is collectively uncovering Earth — every fog tile, landmark, and AR reveal counts.
      </p>

      <div className="discovered-world-stats-grid">
        <div className="discovered-world-stat">
          <span className="discovered-world-stat-label">{currentRegion.label}</span>
          <strong>{Math.round(currentRegion.completionPercent)}%</strong>
          <code>{currentRegion.progressBar}</code>
          <small>{currentRegion.discoveries?.toLocaleString()} discoveries</small>
        </div>

        {snapshot.level !== DISCOVERY_LEVELS.WORLD && worldRegion && (
          <div className="discovered-world-stat discovered-world-stat-world">
            <span className="discovered-world-stat-label">Earth</span>
            <strong>{worldRegion.animatedDisplayPercent?.toFixed(2)}%</strong>
            <code>{worldRegion.progressBar}</code>
            <small>
              {worldRegion.discoveries?.toLocaleString()} discoveries ·{' '}
              {worldRegion.explorers?.toLocaleString()} explorers
            </small>
          </div>
        )}
      </div>

      {snapshot.unknownPool > 0 && (
        <p className="discovered-world-unknown">
          🌑 <strong>{snapshot.unknownPool.toLocaleString()} unknown</strong> areas await future
          seasons, bosses, and creator worlds — the world can grow and discovery % may shift.
        </p>
      )}

      <div className="discovered-world-goals">
        <h5>Global Goals</h5>
        {globalGoals.map((goal) => {
          const pct = goal.isPercent
            ? Math.min(100, (goal.current / goal.target) * 100)
            : Math.min(100, (goal.current / goal.target) * 100);
          return (
            <div key={goal.id} className="discovered-world-goal-row">
              <span>{goal.icon}</span>
              <span className="discovered-world-goal-label">{goal.label}</span>
              <span className="discovered-world-goal-pct">{Math.round(pct)}%</span>
            </div>
          );
        })}
      </div>

      <div className="discovered-world-leaderboards">
        <h5>Top Cities</h5>
        <ol>
          {leaderboards.cities.slice(0, 3).map((city, i) => (
            <li key={city.id}>
              <span>{i + 1}</span> {city.label} <strong>{city.pct}%</strong>
            </li>
          ))}
        </ol>
      </div>

      {firstDiscoveries.length > 0 && (
        <div className="discovered-world-founders">
          <h5>First to Discover</h5>
          {firstDiscoveries.slice(0, 2).map((d) => (
            <div key={d.id} className="discovered-world-founder-row">
              <strong>{d.areaLabel}</strong>
              <span>
                {d.explorerName} ·{' '}
                {new Date(d.discoveredAt).toLocaleDateString(undefined, {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="discovered-world-badges">
        {badges.slice(0, 4).map((b) => (
          <span key={b.id} className="discovered-world-badge-chip">
            {b.icon} {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DiscoveryCeremonyToast({ ceremony, onDismiss }) {
  if (!ceremony) return null;
  return (
    <div className="discovery-ceremony-toast" role="status">
      <span className="discovery-ceremony-confetti" aria-hidden="true">
        {ceremony.icon}
      </span>
      <div>
        <strong>{ceremony.title}</strong>
        <p>{ceremony.message}</p>
      </div>
      {onDismiss && (
        <button type="button" className="discovery-ceremony-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
