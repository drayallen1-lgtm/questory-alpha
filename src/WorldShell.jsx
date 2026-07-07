import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const mapOpenTracked = useRef(false);

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
      className={`world-shell world-shell--map-hidden-panels${
        shellAnimationClass}${layerSnapshot ? ' world-shell--ready' : ' world-shell--loading'}${
        accessibilityClass ? ` ${accessibilityClass}` : ''
      }`}
      data-testid="world-shell"
      data-world-offline={state?.worldExperience?.offlineMode ? 'true' : 'false'}
    >
      <header className="world-shell-header">
        <h1 className="world-shell-title">Questory World</h1>
      </header>

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
          onProgressiveLayersChange={setLayerSnapshot}
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
