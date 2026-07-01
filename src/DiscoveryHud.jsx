import React, { useEffect, useState } from 'react';
import { DISCOVERY_LEVELS, formatDiscoveryPercent } from './worldDiscoveryEngine';

function HudStat({ label, value }) {
  if (value == null) return null;
  return (
    <span className="discovery-hud-stat">
      <strong>{value}</strong> {label}
    </span>
  );
}

/**
 * Zoom-aware discovery HUD — top center of map stage.
 */
export function DiscoveryHud({ snapshot, compact = false }) {
  const [displayPct, setDisplayPct] = useState(0);

  const region = snapshot?.currentRegion;
  const level = snapshot?.level;
  const isWorld = level === DISCOVERY_LEVELS.WORLD;

  useEffect(() => {
    if (!region) return undefined;
    const target = region.animatedDisplayPercent ?? region.completionPercent ?? 0;
    setDisplayPct(0);
    const steps = 24;
    let frame = 0;
    const tick = window.setInterval(() => {
      frame += 1;
      setDisplayPct((target * frame) / steps);
      if (frame >= steps) window.clearInterval(tick);
    }, 16);
    return () => window.clearInterval(tick);
  }, [region?.regionId, region?.animatedDisplayPercent, region?.completionPercent, level]);

  if (!snapshot || !region) return null;

  const pctLabel = isWorld
    ? formatDiscoveryPercent(displayPct, 2)
    : formatDiscoveryPercent(displayPct, 0);

  return (
    <div
      className={`discovery-hud discovery-hud-${level} discovery-tier-${region.completionTier}${compact ? ' discovery-hud-compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="discovery-hud-globe" aria-hidden="true">
        🌎
      </span>
      <div className="discovery-hud-body">
        <div className="discovery-hud-head">
          <strong className="discovery-hud-region">{region.label}</strong>
          <span className="discovery-hud-pct">{pctLabel}%</span>
        </div>
        <div className="discovery-hud-bar" aria-hidden="true">
          <span
            className="discovery-hud-bar-fill"
            style={{ width: `${Math.min(100, displayPct)}%` }}
          />
        </div>
        {!compact && (
          <div className="discovery-hud-meta">
            <HudStat label="discoveries" value={region.discoveries?.toLocaleString()} />
            {snapshot.remainingSecrets != null && (
              <HudStat label="secrets left" value={snapshot.remainingSecrets} />
            )}
            {region.todayDelta > 0 && (
              <span className="discovery-hud-delta">+{region.todayDelta.toFixed(1)}% today</span>
            )}
            {snapshot.liveExplorerCount > 0 && (
              <span className="discovery-hud-community">
                {snapshot.liveExplorerCount} explorers helped today
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
