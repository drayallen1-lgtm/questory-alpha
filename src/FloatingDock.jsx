import React from 'react';

const DOCK_ICONS = {
  map: { icon: '🗺', label: 'World' },
  feed: { icon: '🏠', label: 'Feed' },
  vault: { icon: '🎒', label: 'Passport' },
  social: { icon: '👥', label: 'Social' },
  sponsor: { icon: '📣', label: 'Sponsor' },
  create: { icon: '➕', label: 'Create' },
  admin: { icon: '⚙', label: 'Admin' },
};

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
  const itemIds = isSponsor
    ? ['map', 'feed', 'vault', 'social', 'sponsor', 'create', 'admin']
    : ['map', 'feed', 'vault', 'social', 'create', 'admin'];

  return (
    <div className="floating-dock-wrap" role="navigation" aria-label="World navigation">
      <nav className="floating-dock floating-dock--icon">
        {itemIds.map((id) => {
          const meta = DOCK_ICONS[id];
          return (
            <button
              type="button"
              className={isDockActive(screen, id, adminPreview) ? 'active' : ''}
              onClick={() => nav(id, undefined, { adminPreview: false })}
              key={id}
              title={meta.label}
              aria-label={meta.label}
            >
              <span className="floating-dock-icon" aria-hidden>
                {meta.icon}
              </span>
              <span className="floating-dock-label">{meta.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
