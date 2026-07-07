import React, { useMemo } from 'react';
import { getLivingWorldSnapshot } from './livingWorldEngine';
import { getLivingEarthSnapshot } from './livingEarthEngine';
import { getMarketplaceSnapshot } from './marketplaceEngine';
import { getFactionSnapshot } from './factionEngine';
import { getWorldDiscoverySnapshot } from './worldDiscoveryEngine';

export function FloatingHud({ state, adventures = [], nav }) {
  const now = Date.now();

  const livingWorld = useMemo(
    () => getLivingWorldSnapshot(adventures, { state, now }),
    [adventures, state, now]
  );

  const worldDiscovery = useMemo(
    () => getWorldDiscoverySnapshot({ state, adventures, now }),
    [state, adventures, now]
  );

  const earth = useMemo(
    () =>
      getLivingEarthSnapshot({
        state,
        adventures,
        now,
        worldDiscovery,
      }),
    [state, adventures, now, worldDiscovery]
  );

  const marketplace = useMemo(
    () => getMarketplaceSnapshot(state, adventures, { now }),
    [state, adventures, now]
  );

  const faction = useMemo(
    () => getFactionSnapshot(state, adventures, { now }),
    [state, adventures, now]
  );

  const explorerCount = livingWorld.presence?.explorersNearby ?? livingWorld.explorerDots?.length ?? 0;
  const timelinePreview = (livingWorld.timeline || []).slice(0, 3);
  const liveMarketCount =
    (marketplace.auctions?.length || 0) + (marketplace.stats?.totalListings || 0);
  const activeWars = faction.wars?.length ?? faction.contestedCount ?? 0;
  const earthPct =
    worldDiscovery.worldRegion?.animatedDisplayPercent ??
    worldDiscovery.worldRegion?.completionPercent ??
    earth.worldDiscovery?.worldRegion?.animatedDisplayPercent ??
    0;

  const notifications = useMemo(() => {
    const items = [];
    if (timelinePreview[0]) {
      items.push({
        id: 'tl-0',
        tone: 'adventure',
        text: timelinePreview[0].text || timelinePreview[0].label || 'Explorer activity nearby',
      });
    }
    if (activeWars > 0) {
      items.push({
        id: 'war',
        tone: 'nearby',
        text: `${activeWars} guild war${activeWars === 1 ? '' : 's'} active on the map`,
      });
    }
    if (marketplace.activityFeed?.[0]) {
      items.push({
        id: 'market',
        tone: 'background',
        text: marketplace.activityFeed[0].text || 'Market prices updated',
      });
    }
    return items.slice(0, 2);
  }, [timelinePreview, activeWars, marketplace.activityFeed]);

  return (
    <div className="floating-hud" aria-label="World HUD">
      {notifications.length > 0 && (
        <div className="floating-notifications" aria-live="polite">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`floating-notification floating-notification--${n.tone}`}
            >
              {n.text}
            </div>
          ))}
        </div>
      )}

      <div className="floating-hud-grid">
        <button
          type="button"
          className="floating-hud-card"
          onClick={() => nav?.('social')}
        >
          <span className="floating-hud-card-head">👣 Explorer Activity</span>
          <span className="floating-hud-card-metric">{explorerCount || timelinePreview.length}</span>
          <span className="floating-hud-card-sub">nearby</span>
        </button>

        <button
          type="button"
          className="floating-hud-card"
          onClick={() => nav?.('social', undefined, { adminTab: 'guild' })}
        >
          <span className="floating-hud-card-head">⚔ Guild War</span>
          <span className="floating-hud-card-metric">{activeWars}</span>
          <span className="floating-hud-card-sub">active</span>
        </button>

        <button
          type="button"
          className="floating-hud-card"
          onClick={() => nav?.('create')}
        >
          <span className="floating-hud-card-head">✨ Creator Hunt</span>
          <span className="floating-hud-card-sub">Launch adventure</span>
          <span className="floating-hud-card-chevron">▼</span>
        </button>

        <button
          type="button"
          className="floating-hud-card"
          onClick={() => nav?.('sponsor')}
        >
          <span className="floating-hud-card-head">📣 Sponsor Event</span>
          <span className="floating-hud-card-sub">Promote nearby</span>
          <span className="floating-hud-card-chevron">▼</span>
        </button>

        <button
          type="button"
          className="floating-hud-card"
          onClick={() => nav?.('marketplace')}
        >
          <span className="floating-hud-card-head">🏪 Marketplace</span>
          <span className="floating-hud-card-metric">{Math.min(liveMarketCount, 99)}</span>
          <span className="floating-hud-card-sub">live listings</span>
        </button>

        <button
          type="button"
          className="floating-hud-card"
          onClick={() => nav?.('legendary-hunt')}
        >
          <span className="floating-hud-card-head">🎯 Live Hunt</span>
          <span className="floating-hud-card-sub">Legendary drops</span>
          <span className="floating-hud-card-chevron">▼</span>
        </button>

        <button
          type="button"
          className="floating-hud-card floating-hud-card--earth"
          onClick={() => nav?.('world')}
        >
          <div>
            <span className="floating-hud-card-head">🌍 Earth</span>
            <span className="floating-hud-card-sub">Living planet progress</span>
          </div>
          <span className="floating-hud-card-metric">
            {Number(earthPct).toFixed(1)}%
          </span>
        </button>
      </div>
    </div>
  );
}
