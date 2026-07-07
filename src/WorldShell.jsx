import React from 'react';
import { MapScreen } from './QuestoryMap';
import { FloatingHud } from './FloatingHud';
import { FloatingDock } from './FloatingDock';

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
  return (
    <div className="world-shell world-shell--map-hidden-panels">
      <header className="world-shell-header">
        <h1 className="world-shell-title">Questory World</h1>
      </header>

      <FloatingHud state={state} adventures={adventures} nav={nav} />

      <div className="world-map-frame">
        <MapScreen
          adventures={adventures}
          nav={nav}
          state={state}
          setState={setState}
          isAdmin={isAdmin}
          userId={userId}
          shellMode
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
