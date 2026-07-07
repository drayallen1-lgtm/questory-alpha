import React from 'react';

function isDockActive(screen, tabId, adminPreview) {
  if (screen === tabId) return true;
  if (tabId === 'map' && (screen === 'map' || screen === 'home' || screen === 'world-engine')) return true;
  if (screen === 'leaderboard' && tabId === 'map') return true;
  if (screen === 'creator' && tabId === 'feed') return true;
  if (screen === 'marketplace' && tabId === 'vault') return true;
  if (screen === 'platform' && tabId === 'map') return true;
  if (screen === 'world' || screen === 'growth') return tabId === 'map';
  if (screen === 'play' || screen === 'detail' || screen === 'bonus') {
    return adminPreview ? tabId === 'admin' : tabId === 'feed';
  }
  return false;
}

export function FloatingDock({ screen, nav, adminPreview, isSponsor }) {
  const items = isSponsor
    ? [
        ['map', 'World'],
        ['feed', 'Feed'],
        ['vault', 'Passport'],
        ['social', 'Social'],
        ['sponsor', 'Sponsor'],
        ['create', 'Create'],
        ['admin', 'Admin'],
      ]
    : [
        ['map', 'World'],
        ['feed', 'Feed'],
        ['vault', 'Passport'],
        ['social', 'Social'],
        ['create', 'Create'],
        ['admin', 'Admin'],
      ];

  return (
    <div className="floating-dock-wrap" role="navigation" aria-label="World navigation">
      <nav className="floating-dock">
        {items.map(([id, label]) => (
          <button
            type="button"
            className={isDockActive(screen, id, adminPreview) ? 'active' : ''}
            onClick={() => nav(id, undefined, { adminPreview: false })}
            key={id}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
