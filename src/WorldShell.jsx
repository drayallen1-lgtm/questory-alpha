import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapScreen } from './QuestoryMap';
import { FloatingHud } from './FloatingHud';
import { FloatingDock } from './FloatingDock';
import { LivingCityPanel } from './LivingCityPanel';
import { AmbientDirectorWhisper } from './AmbientDirectorWhisper';
import { WorldRecoveryBanner } from './StabilityUI';
import {
  WORLD_ANALYTICS_EVENTS,
  clearWorldError,
  enableWorldOfflineMode,
  getWorldRecoveryMessage,
  trackWorldEvent,
} from './worldExperienceEngine';

import { MAP_FIRST_CONFIG } from './mapFirstHudEngine';

export function WorldShell({
  adventures,
  nav,
  state,
  setState,
  isAdmin = false,
  userId = null,
  adminPreview = false,
  isSponsor = false,
}) {
  const [layerSnapshot, setLayerSnapshot] = useState(null);
  const [hudContext, setHudContext] = useState(null);
  const [mapFlyApi, setMapFlyApi] = useState(null);
  const [welcomePulse, setWelcomePulse] = useState(true);
  const mapOpenTracked = useRef(false);

  const handleProgressiveLayersChange = useCallback((snapshot) => {
    setLayerSnapshot((prev) => {
      if (
        prev &&
        prev.zoom === snapshot.zoom &&
        prev.streetLevel === snapshot.streetLevel &&
        prev.regionalLevel === snapshot.regionalLevel &&
        prev.earthOverlayVisible === snapshot.earthOverlayVisible &&
        prev.fullEarth === snapshot.fullEarth &&
        prev.animations?.activeCount === snapshot.animations?.activeCount &&
        prev.animations?.className === snapshot.animations?.className
      ) {
        return prev;
      }
      return snapshot;
    });
  }, []);

  const hudAdventures = useMemo(() => adventures, [adventures]);
  const shellAnimationClass =
    layerSnapshot?.animations?.activeCount > 2 ? ' world-anim-shell-on' : '';

  const recoveryMessage = state?.worldExperience?.lastError
    ? getWorldRecoveryMessage(state.worldExperience.lastError)
    : null;

  const accessibilityClass = [
    state?.accessibility?.reducedMotion ? 'world-reduced-motion' : '',
    state?.accessibility?.highContrast ? 'world-high-contrast' : '',
    state?.accessibility?.colorblindMode ? 'world-colorblind-safe' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (mapOpenTracked.current || !setState) return;
    mapOpenTracked.current = true;
    const timer = window.setTimeout(() => {
      setState((current) => trackWorldEvent(current, WORLD_ANALYTICS_EVENTS.MAP_OPEN));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [setState]);

  useEffect(() => {
    if (!layerSnapshot) return undefined;
    const timer = window.setTimeout(() => setWelcomePulse(false), MAP_FIRST_CONFIG.WELCOME_PULSE_MS);
    return () => window.clearTimeout(timer);
  }, [layerSnapshot?.zoom]);

  function handleWorldRetry() {
    if (!setState) return;
    setState((current) => clearWorldError(current));
    setLayerSnapshot(null);
  }

  function handleContinueOffline() {
    if (!setState) return;
    setState((current) => {
      const next = enableWorldOfflineMode(current);
      return trackWorldEvent(next, WORLD_ANALYTICS_EVENTS.WORLD_RECOVERY, { mode: 'offline' });
    });
  }

  return (
    <div
      className={`world-shell world-shell--map-first world-shell--living-atlas world-shell--map-hidden-panels${
        shellAnimationClass}${layerSnapshot ? ' world-shell--ready' : ' world-shell--loading'}${
        welcomePulse && layerSnapshot ? ' world-shell--welcome-pulse' : ''
      }${accessibilityClass ? ` ${accessibilityClass}` : ''}`}
      data-testid="world-shell"
      data-world-offline={state?.worldExperience?.offlineMode ? 'true' : 'false'}
    >
      <header className="world-shell-header world-shell-header--minimal">
        <h1 className="world-shell-title">Questory World</h1>
      </header>

      {welcomePulse && layerSnapshot && (
        <div className="world-welcome-pulse" aria-live="polite">
          <span>Welcome to {state?.world?.cityName || 'Parsons'}</span>
        </div>
      )}

      {recoveryMessage && (
        <WorldRecoveryBanner
          message={recoveryMessage}
          onRetry={handleWorldRetry}
          onContinueOffline={handleContinueOffline}
        />
      )}

      {!layerSnapshot && (
        <div className="world-shell-skeleton" aria-hidden="true">
          <div className="world-shell-skeleton-grid">
            <div className="world-shell-skeleton-card world-shell-skeleton-card--wide" />
            <div className="world-shell-skeleton-card" />
            <div className="world-shell-skeleton-card" />
          </div>
        </div>
      )}

      <div className="world-shell-hud-stack">
        <LivingCityPanel
          state={state}
          adventures={hudAdventures}
          layerSnapshot={layerSnapshot}
          nav={nav}
        />
        <FloatingHud
          state={state}
          adventures={hudAdventures}
          nav={nav}
          setState={setState}
          layerSnapshot={layerSnapshot}
          hudContext={hudContext}
        />
      </div>

      <div className="world-map-frame">
        <MapScreen
          adventures={adventures}
          nav={nav}
          state={state}
          setState={setState}
          isAdmin={isAdmin}
          userId={userId}
          shellMode
          onProgressiveLayersChange={handleProgressiveLayersChange}
          onHudContextChange={setHudContext}
          onMapFlyReady={setMapFlyApi}
        />
        <AmbientDirectorWhisper
          state={state}
          adventures={hudAdventures}
          layerSnapshot={layerSnapshot}
          hudContext={hudContext}
          nav={nav}
          setState={setState}
          onFlyTo={mapFlyApi?.flyTo}
        />
      </div>

      <FloatingDock
        screen={state.screen}
        nav={nav}
        adminPreview={adminPreview}
        isSponsor={isSponsor}
      />
    </div>
  );
}
