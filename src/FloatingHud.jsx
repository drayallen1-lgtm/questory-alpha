import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getLivingWorldSnapshot } from './livingWorldEngine';
import { getLivingEarthSnapshot } from './livingEarthEngine';
import { getLivingEarthExperienceSnapshot } from './livingEarthExperienceEngine';
import { getMarketplaceSnapshot } from './marketplaceEngine';
import { getFactionSnapshot } from './factionEngine';
import { getWorldDiscoverySnapshot } from './worldDiscoveryEngine';
import { getLegendaryHuntSnapshot } from './legendaryHuntEngine';
import { buildFloatingHudCards } from './floatingCardsEngine';
import { FloatingCard } from './FloatingCard';
import { getSmartNotificationSnapshot } from './smartNotificationEngine';
import { SmartNotificationStack } from './SmartNotificationStack';
import { getAdaptiveHudSnapshot } from './adaptiveHudEngine';
import { AdaptiveHudStrip } from './AdaptiveHudStrip';
import {
  WORLD_ANALYTICS_EVENTS,
  WORLD_AUDIO_EVENTS,
  enrichCardsWithEmptyStates,
  emitWorldAudio,
  trackWorldEvent,
} from './worldExperienceEngine';

export function FloatingHud({
  state,
  adventures = [],
  nav,
  setState,
  layerSnapshot = null,
  hudContext = null,
}) {
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

  const faction = useMemo(
    () => getFactionSnapshot(state, adventures, { now }),
    [state, adventures, now]
  );

  const earthExperience = useMemo(
    () =>
      getLivingEarthExperienceSnapshot({
        state,
        adventures,
        worldDiscovery,
        faction,
        livingEarth: earth,
        now,
      }),
    [state, adventures, worldDiscovery, faction, earth, now]
  );

  const marketplace = useMemo(
    () => getMarketplaceSnapshot(state, adventures, { now }),
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
        earthExperience,
        legendaryHunt,
        layerSnapshot,
      }),
    [livingWorld, marketplace, faction, worldDiscovery, earth, earthExperience, legendaryHunt, layerSnapshot]
  );

  const adaptiveHudSnapshot = useMemo(
    () =>
      getAdaptiveHudSnapshot({
        state,
        adventures,
        layerSnapshot,
        hudContext: {
          ...hudContext,
          zoom: hudContext?.zoom ?? layerSnapshot?.zoom ?? zoom,
        },
        faction,
        legendaryHunt,
        livingWorld,
        worldDiscovery,
        cards: hudSnapshot.cards,
      }),
    [
      state,
      adventures,
      layerSnapshot,
      hudContext,
      zoom,
      faction,
      legendaryHunt,
      livingWorld,
      worldDiscovery,
      hudSnapshot.cards,
    ]
  );

  const displayCards = useMemo(() => {
    const hasGuild = Boolean(faction?.memberFactionId);
    return enrichCardsWithEmptyStates(adaptiveHudSnapshot.cards, { hasGuild });
  }, [adaptiveHudSnapshot.cards, faction?.memberFactionId]);

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
    if (setState) {
      setState((current) =>
        trackWorldEvent(current, WORLD_ANALYTICS_EVENTS.NOTIFICATION_OPEN, {
          id: notification.id,
        })
      );
    }
    emitWorldAudio(WORLD_AUDIO_EVENTS.NOTIFICATION, { id: notification.id });
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
    const next = expandedCardId === cardId ? null : cardId;
    setExpandedCardId(next);
    if (next && setState) {
      setState((s) =>
        trackWorldEvent(s, WORLD_ANALYTICS_EVENTS.CARD_EXPAND, { cardId: next })
      );
    }
    if (next === 'earth') emitWorldAudio(WORLD_AUDIO_EVENTS.EARTH_PULSE);
    if (next === 'guild') emitWorldAudio(WORLD_AUDIO_EVENTS.GUILD_WAR);
    if (next === 'marketplace') emitWorldAudio(WORLD_AUDIO_EVENTS.MARKETPLACE);
  }

  function handleCardItemAction(item) {
    if (!nav || !item?.action) return;
    nav(item.action, undefined, item.actionOptions || { adminPreview: false });
  }

  function handleViewAll(card) {
    setExpandedCardId(null);
    if (!nav || !card.viewAllScreen) return;
    if (setState) {
      setState((current) => {
        let next = trackWorldEvent(current, WORLD_ANALYTICS_EVENTS.CARD_VIEW_ALL, {
          cardId: card.id,
        });
        if (card.id === 'marketplace') {
          next = trackWorldEvent(next, WORLD_ANALYTICS_EVENTS.MARKETPLACE_VISIT, {
            source: 'hud',
          });
        }
        return next;
      });
    }
    nav(card.viewAllScreen, undefined, card.viewAllOptions || { adminPreview: false });
  }

  function handleStripAction(item) {
    if (!nav) return;
    if (item.id === 'treasure' && legendaryHunt.hasActiveBoss) {
      nav('legendary-hunt');
      return;
    }
    if (item.id === 'territory' || item.id === 'score' || adaptiveHudSnapshot.mode === 'guildWar') {
      nav('social', undefined, { socialTab: 'guild', guildTab: 'wars' });
      return;
    }
    if (item.id === 'clues' || item.id === 'progress' || item.id === 'timer') {
      const adventureId = hudContext?.selectedAdventureId || state?.selectedAdventureId;
      if (adventureId) nav('play', adventureId);
    }
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

      <div
        className={`floating-hud ${adaptiveHudSnapshot.className}${
          adaptiveHudSnapshot.simplified ? ' floating-hud--simplified' : ''
        }`}
        aria-label="World HUD"
        data-testid="floating-hud"
        ref={hudRef}
      >
        {showNotifications && (
          <SmartNotificationStack
            prominent={notificationSnapshot.prominent}
            stacked={notificationSnapshot.stacked}
            stackCount={notificationSnapshot.stackCount}
            onAction={handleNotificationAction}
          />
        )}

        <AdaptiveHudStrip snapshot={adaptiveHudSnapshot} onItemAction={handleStripAction} />

        <div
          className={`floating-hud-grid${
            expandedCardId ? ' floating-hud-grid--has-expanded' : ''
          }`}
        >
          {displayCards.map((card) => (
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
              onItemAction={handleCardItemAction}
            />
          ))}
        </div>
      </div>
    </>
  );
}
