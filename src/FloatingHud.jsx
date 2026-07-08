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
import { getMapFirstHudLayout } from './mapFirstHudEngine';
import { MicroHudStrip } from './MicroHudStrip';
import { WorldRadialMenu } from './WorldRadialMenu';
import { resolveMicroHudChips } from './microHudEngine';
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
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const [compassOpen, setCompassOpen] = useState(false);
  const [radialOpen, setRadialOpen] = useState(false);
  const hudRef = useRef(null);

  const livingWorld = useMemo(
    () => getLivingWorldSnapshot(adventures, { state }),
    [adventures, state]
  );

  const worldDiscovery = useMemo(
    () => getWorldDiscoverySnapshot({ zoom, state, adventures }),
    [zoom, state, adventures]
  );

  const earth = useMemo(
    () =>
      getLivingEarthSnapshot({
        zoom,
        state,
        adventures,
        worldDiscovery,
        earthOverlayVisible: layerSnapshot?.earthOverlayVisible,
        fullEarth: layerSnapshot?.fullEarth,
      }),
    [zoom, state, adventures, worldDiscovery, layerSnapshot?.earthOverlayVisible, layerSnapshot?.fullEarth]
  );

  const faction = useMemo(
    () => getFactionSnapshot(state, adventures),
    [state, adventures]
  );

  const earthExperience = useMemo(
    () =>
      getLivingEarthExperienceSnapshot({
        state,
        adventures,
        worldDiscovery,
        faction,
        livingEarth: earth,
      }),
    [state, adventures, worldDiscovery, faction, earth]
  );

  const marketplace = useMemo(
    () => getMarketplaceSnapshot(state, adventures),
    [state, adventures]
  );

  const legendaryHunt = useMemo(
    () => getLegendaryHuntSnapshot(state, adventures),
    [state, adventures]
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
        mapFirst: true,
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

  const mapFirstLayout = useMemo(
    () =>
      getMapFirstHudLayout({
        mode: adaptiveHudSnapshot.mode,
        strip: adaptiveHudSnapshot.strip,
        cards: hudSnapshot.cards,
        livingWorld,
        marketplace,
        deckOpen,
        expandedCardId,
      }),
    [
      adaptiveHudSnapshot.mode,
      adaptiveHudSnapshot.strip,
      hudSnapshot.cards,
      livingWorld,
      marketplace,
      deckOpen,
      expandedCardId,
    ]
  );

  const displayCards = useMemo(() => {
    const hasGuild = Boolean(faction?.memberFactionId);
    return enrichCardsWithEmptyStates(mapFirstLayout.filteredCards, { hasGuild });
  }, [mapFirstLayout.filteredCards, faction?.memberFactionId]);

  const notificationSnapshot = useMemo(
    () =>
      getSmartNotificationSnapshot({
        state,
        adventures,
        layerSnapshot,
      }),
    [state, adventures, layerSnapshot]
  );

  const showNotifications =
    notificationSnapshot.visible && !expandedCardId && !deckOpen && !radialOpen;

  const microHudSnapshot = useMemo(
    () =>
      resolveMicroHudChips({
        legendaryHunt,
        marketplace,
        faction,
        notifications: notificationSnapshot.prominent || [],
        mode: adaptiveHudSnapshot.mode,
      }),
    [legendaryHunt, marketplace, faction, notificationSnapshot.prominent, adaptiveHudSnapshot.mode]
  );

  const useMicroHud = microHudSnapshot.visible && !deckOpen && !expandedCardId;

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

    // Market notifications focus the venue on the map instead of leaving to a screen.
    if (notification.kind === 'market' || notification.action === 'marketplace') {
      const venueId =
        notification.venueId ||
        (notification.id?.startsWith('auction-') ? 'legendary-auction' : 'downtown-market');
      nav('map', undefined, {
        marketplaceVenueId: venueId,
        marketplaceTab: notification.marketplaceTab || 'featured',
        adminPreview: false,
      });
      return;
    }

    nav(notification.action, undefined, { adminPreview: false });
  }

  function handleMicroChip(chip) {
    if (!nav) return;
    if (chip.action === 'map' && chip.venueId) {
      nav('map', undefined, {
        marketplaceVenueId: chip.venueId,
        marketplaceTab: chip.marketplaceTab || 'featured',
        adminPreview: false,
      });
      return;
    }
    nav(chip.action, undefined, chip.actionOptions || { adminPreview: false });
  }

  function handleRadialAction(item) {
    if (!nav && item.action !== 'layers' && item.action !== 'compass') return;
    if (item.action === 'layers') {
      setDeckOpen(true);
      return;
    }
    if (item.action === 'compass') {
      setCompassOpen(true);
      return;
    }
    if (item.action === 'map' && item.venueId) {
      nav('map', undefined, {
        marketplaceVenueId: item.venueId,
        marketplaceTab: 'featured',
        adminPreview: false,
      });
      return;
    }
    nav(item.action, undefined, item.options || { adminPreview: false });
  }

  function handleMarketChip() {
    if (!nav) return;
    const chip = mapFirstLayout.marketChip;
    if (setState) {
      setState((current) =>
        trackWorldEvent(current, WORLD_ANALYTICS_EVENTS.MARKETPLACE_VISIT, { source: 'chip' })
      );
    }
    emitWorldAudio(WORLD_AUDIO_EVENTS.MARKETPLACE);
    nav('map', undefined, {
      marketplaceVenueId: chip?.venueId || 'downtown-market',
      marketplaceTab: chip?.tab || 'featured',
      adminPreview: false,
    });
  }

  useEffect(() => {
    if (!expandedCardId) return undefined;

    function handlePointerDown(event) {
      if (hudRef.current?.contains(event.target)) return;
      setExpandedCardId(null);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setExpandedCardId(null);
        setDeckOpen(false);
      }
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
    setDeckOpen(false);
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
    if (item.id === 'city' || item.id === 'scan') {
      setDeckOpen(true);
    }
  }

  const focusSnapshot = {
    ...adaptiveHudSnapshot,
    strip: mapFirstLayout.focusStrip,
    stripVisible: mapFirstLayout.focusVisible,
  };

  return (
    <>
      {expandedCardId && (
        <button
          type="button"
          className="floating-hud-dismiss-scrim"
          aria-label="Collapse HUD card"
          onClick={() => {
            setExpandedCardId(null);
            setDeckOpen(false);
          }}
        />
      )}

      <div
        className={`floating-hud ${adaptiveHudSnapshot.className}${
          adaptiveHudSnapshot.simplified ? ' floating-hud--simplified' : ''
        }${mapFirstLayout.showCardDeck ? ' floating-hud--deck-open' : ' floating-hud--deck-collapsed'}`}
        aria-label="World HUD"
        data-testid="floating-hud"
        ref={hudRef}
      >
        {useMicroHud ? (
          <MicroHudStrip snapshot={microHudSnapshot} onChipAction={handleMicroChip} />
        ) : (
          showNotifications && (
            <SmartNotificationStack
              prominent={notificationSnapshot.prominent}
              stacked={notificationSnapshot.stacked}
              stackCount={notificationSnapshot.stackCount}
              onAction={handleNotificationAction}
              compact
              inline
            />
          )
        )}

        <AdaptiveHudStrip
          snapshot={focusSnapshot}
          onItemAction={handleStripAction}
          singleFocus
        />

        {mapFirstLayout.marketChipVisible && !useMicroHud && (
          <button
            type="button"
            className="map-first-market-chip"
            data-testid="market-nearby-chip"
            onClick={handleMarketChip}
          >
            <span className="map-first-market-chip-icon" aria-hidden>
              {mapFirstLayout.marketChip.icon}
            </span>
            <span className="map-first-market-chip-label">{mapFirstLayout.marketChip.label}</span>
            {mapFirstLayout.marketChip.count != null && (
              <span className="map-first-market-chip-count" aria-hidden>
                {mapFirstLayout.marketChip.count}
              </span>
            )}
          </button>
        )}

        {mapFirstLayout.showDeckToggle && !radialOpen && (
          <button
            type="button"
            className="floating-hud-deck-toggle"
            data-testid="floating-hud-deck-toggle"
            onClick={() => setDeckOpen(true)}
            aria-expanded={deckOpen}
          >
            Layers · {mapFirstLayout.deckCardCount}
          </button>
        )}

        {mapFirstLayout.showCardDeck && (
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
        )}
      </div>

      <WorldRadialMenu open={radialOpen} onToggle={setRadialOpen} onAction={handleRadialAction} />

      {compassOpen && mapFirstLayout.compassFloat && (
        <button
          type="button"
          className="map-first-compass-float map-first-compass-float--open"
          aria-label="Compass"
          onClick={() => setCompassOpen(false)}
        >
          <span className="map-first-compass-float-icon" aria-hidden>
            {mapFirstLayout.compassFloat.icon}
          </span>
          <span className="map-first-compass-float-copy">
            <strong>{mapFirstLayout.compassFloat.label}</strong>
            {mapFirstLayout.compassFloat.detail && (
              <small>{mapFirstLayout.compassFloat.detail}</small>
            )}
          </span>
        </button>
      )}
    </>
  );
}
