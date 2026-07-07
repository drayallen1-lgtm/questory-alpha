import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getLivingWorldSnapshot } from './livingWorldEngine';
import { getLivingEarthSnapshot } from './livingEarthEngine';
import { getMarketplaceSnapshot } from './marketplaceEngine';
import { getFactionSnapshot } from './factionEngine';
import { getWorldDiscoverySnapshot } from './worldDiscoveryEngine';
import { getLegendaryHuntSnapshot } from './legendaryHuntEngine';
import { buildFloatingHudCards } from './floatingCardsEngine';
import { FloatingCard } from './FloatingCard';

export function FloatingHud({ state, adventures = [], nav, layerSnapshot = null }) {
  const zoom = layerSnapshot?.zoom ?? 11;
  const now = Date.now();
  const [expandedCardId, setExpandedCardId] = useState(null);
  const hudRef = useRef(null);

  const livingWorld = useMemo(
    () => getLivingWorldSnapshot(adventures, { state, now }),
    [adventures, state, now]
  );

  const worldDiscovery = useMemo(
    () => getWorldDiscoverySnapshot({ zoom, state, adventures, now }),
    [zoom, state, adventures, now]
  );

  const earth = useMemo(
    () =>
      getLivingEarthSnapshot({
        zoom,
        state,
        adventures,
        now,
        worldDiscovery,
        earthOverlayVisible: layerSnapshot?.earthOverlayVisible,
        fullEarth: layerSnapshot?.fullEarth,
      }),
    [zoom, state, adventures, now, worldDiscovery, layerSnapshot]
  );

  const marketplace = useMemo(
    () => getMarketplaceSnapshot(state, adventures, { now }),
    [state, adventures, now]
  );

  const faction = useMemo(
    () => getFactionSnapshot(state, adventures, { now }),
    [state, adventures, now]
  );

  const legendaryHunt = useMemo(
    () => getLegendaryHuntSnapshot(state, adventures, { now }),
    [state, adventures, now]
  );

  const hudSnapshot = useMemo(
    () =>
      buildFloatingHudCards({
        livingWorld,
        marketplace,
        faction,
        worldDiscovery,
        earth,
        legendaryHunt,
        layerSnapshot,
      }),
    [livingWorld, marketplace, faction, worldDiscovery, earth, legendaryHunt, layerSnapshot]
  );

  const showNotifications =
    layerSnapshot?.hudCards?.notifications !== false && !expandedCardId;

  const notifications = useMemo(() => {
    const items = [];
    const timelinePreview = (livingWorld.timeline || []).slice(0, 1);
    const activeWars = faction.wars?.length ?? faction.contestedCount ?? 0;

    if (timelinePreview[0] && layerSnapshot?.hudCards?.explorer !== false) {
      items.push({
        id: 'tl-0',
        tone: 'adventure',
        text: timelinePreview[0].text || timelinePreview[0].label || 'Explorer activity nearby',
      });
    }
    if (activeWars > 0 && layerSnapshot?.hudCards?.guild !== false) {
      items.push({
        id: 'war',
        tone: 'nearby',
        text: `${activeWars} guild war${activeWars === 1 ? '' : 's'} active on the map`,
      });
    }
    if (marketplace.activityFeed?.[0] && layerSnapshot?.hudCards?.marketplace !== false) {
      items.push({
        id: 'market',
        tone: 'background',
        text: marketplace.activityFeed[0].text || 'Market prices updated',
      });
    }
    return items.slice(0, 2);
  }, [livingWorld.timeline, faction, marketplace.activityFeed, layerSnapshot]);

  useEffect(() => {
    if (!expandedCardId) return undefined;

    function handlePointerDown(event) {
      if (hudRef.current?.contains(event.target)) return;
      setExpandedCardId(null);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setExpandedCardId(null);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedCardId]);

  function handleToggle(cardId) {
    setExpandedCardId((current) => (current === cardId ? null : cardId));
  }

  function handleViewAll(card) {
    setExpandedCardId(null);
    if (!nav || !card.viewAllScreen) return;
    nav(card.viewAllScreen, undefined, card.viewAllOptions || { adminPreview: false });
  }

  return (
    <>
      {expandedCardId && (
        <button
          type="button"
          className="floating-hud-dismiss-scrim"
          aria-label="Collapse card"
          onClick={() => setExpandedCardId(null)}
        />
      )}

      <div className="floating-hud" aria-label="World HUD" ref={hudRef}>
        {showNotifications && notifications.length > 0 && (
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

        <div
          className={`floating-hud-grid${
            expandedCardId ? ' floating-hud-grid--has-expanded' : ''
          }`}
        >
          {hudSnapshot.cards.map((card) => (
            <FloatingCard
              key={card.id}
              id={card.id}
              icon={card.icon}
              title={card.title}
              metric={card.metric}
              metricLabel={card.metricLabel}
              items={card.items}
              wide={card.wide}
              expanded={expandedCardId === card.id}
              layerHidden={false}
              onToggle={handleToggle}
              onViewAll={() => handleViewAll(card)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
