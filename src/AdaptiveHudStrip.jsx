import React from 'react';

export function AdaptiveHudStrip({ snapshot, onItemAction }) {
  if (!snapshot?.stripVisible || !snapshot.strip?.length) return null;

  return (
    <section
      className={`adaptive-hud-strip adaptive-hud-strip--${snapshot.mode}`}
      aria-label={`${snapshot.label} HUD`}
    >
      {snapshot.strip.map((item) => (
        <button
          key={item.id}
          type="button"
          className="adaptive-hud-chip"
          onClick={() => onItemAction?.(item, snapshot)}
        >
          <span className="adaptive-hud-chip-icon" aria-hidden>
            {item.icon}
          </span>
          <span className="adaptive-hud-chip-copy">
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            {item.detail && <span className="adaptive-hud-chip-detail">{item.detail}</span>}
          </span>
        </button>
      ))}
    </section>
  );
}
