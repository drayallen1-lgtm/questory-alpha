import React, { useMemo, useState } from 'react';
import { MapScreen } from './QuestoryMap';
import { FloatingHud } from './FloatingHud';
import { FloatingDock } from './FloatingDock';
import { LivingCityPanel } from './LivingCityPanel';

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

  const hudAdventures = useMemo(() => adventures, [adventures]);
  const shellAnimationClass =
    layerSnapshot?.animations?.activeCount > 2 ? ' world-anim-shell-on' : '';

  return (
    <div className={`world-shell world-shell--map-hidden-panels${shellAnimationClass}`}>
      <header className="world-shell-header">
        <h1 className="world-shell-title">Questory World</h1>
      </header>

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
