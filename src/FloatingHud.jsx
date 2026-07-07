import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getLivingWorldSnapshot } from './livingWorldEngine';
import { getLivingEarthSnapshot } from './livingEarthEngine';
import { getMarketplaceSnapshot } from './marketplaceEngine';
import { getFactionSnapshot } from './factionEngine';
import { getWorldDiscoverySnapshot } from './worldDiscoveryEngine';
import { getLegendaryHuntSnapshot } from './legendaryHuntEngine';
import { buildFloatingHudCards } from './floatingCardsEngine';
import { FloatingCard } from './FloatingCard';
import { getSmartNotificationSnapshot } from './smartNotificationEngine';
import { SmartNotificationStack } from './SmartNotificationStack';

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

  const notificationSnapshot = useMemo(
    () =>
      getSmartNotificationSnapshot({
        state,
        adventures,
        now,
        layerSnapshot,
      }),
    [state, adventures, now, layerSnapshot]
  );

  const showNotifications =
    notificationSnapshot.visible && !expandedCardId;

  function handleNotificationAction(notification) {
    if (!nav || !notification?.action) return;
    nav(notification.action, undefined, { adminPreview: false });
  }

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
        {showNotifications && (
          <SmartNotificationStack
            prominent={notificationSnapshot.prominent}
            stacked={notificationSnapshot.stacked}
            stackCount={notificationSnapshot.stackCount}
            onAction={handleNotificationAction}
          />
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
