import React, { useEffect, useRef } from 'react';

const RADIAL_ITEMS = [
  { id: 'treasure', icon: '💎', label: 'Treasure', action: 'legendary-hunt' },
  { id: 'market', icon: '🏪', label: 'Market', action: 'map', venueId: 'downtown-market' },
  { id: 'guild', icon: '⚔', label: 'Guild', action: 'social', options: { socialTab: 'guild' } },
  { id: 'earth', icon: '🌎', label: 'Earth', action: 'world' },
  { id: 'layers', icon: '📚', label: 'Layers', action: 'layers' },
  { id: 'compass', icon: '🧭', label: 'Compass', action: 'compass' },
];

export function WorldRadialMenu({ open, onToggle, onAction }) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (rootRef.current?.contains(event.target)) return;
      onToggle?.(false);
    }
    function handleKey(event) {
      if (event.key === 'Escape') onToggle?.(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onToggle]);

  return (
    <div
      ref={rootRef}
      className={`world-radial-menu${open ? ' world-radial-menu--open' : ''}`}
      data-testid="world-radial-menu"
    >
      {open && (
        <div className="world-radial-bloom" aria-hidden>
          {RADIAL_ITEMS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="world-radial-item"
              style={{ '--radial-i': index }}
              onClick={() => {
                onAction?.(item);
                onToggle?.(false);
              }}
            >
              <span className="world-radial-item-icon" aria-hidden>
                {item.icon}
              </span>
              <span className="world-radial-item-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="world-radial-trigger"
        aria-label={open ? 'Close world menu' : 'Open world menu'}
        aria-expanded={open}
        onClick={() => onToggle?.(!open)}
      >
        <span className="world-radial-trigger-icon" aria-hidden>
          🌎
        </span>
      </button>
    </div>
  );
}
