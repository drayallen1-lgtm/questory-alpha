import React, { useEffect, useState } from 'react';

export function MicroHudStrip({ snapshot, onChipAction }) {
  const [expandedId, setExpandedId] = useState(null);
  const [hiddenIds, setHiddenIds] = useState(() => new Set());

  const chips = (snapshot?.chips || []).filter((c) => !hiddenIds.has(c.id));

  useEffect(() => {
    if (!chips.length) return undefined;
    const timers = chips.map((chip) =>
      window.setTimeout(() => {
        setHiddenIds((prev) => new Set([...prev, chip.id]));
        if (expandedId === chip.id) setExpandedId(null);
      }, chip.ttlMs || 12000)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [chips.map((c) => c.id).join('|')]);

  if (!chips.length) return null;

  function handleChipClick(chip) {
    if (expandedId === chip.id) {
      onChipAction?.(chip);
      return;
    }
    setExpandedId(chip.id);
  }

  return (
    <div className="micro-hud-strip" data-testid="micro-hud-strip" aria-live="polite">
      {chips.map((chip) => {
        const expanded = expandedId === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            className={`micro-hud-chip micro-hud-chip--${chip.id}${expanded ? ' micro-hud-chip--expanded' : ''}`}
            aria-expanded={expanded}
            onClick={() => handleChipClick(chip)}
          >
            <span className="micro-hud-chip-icon" aria-hidden>
              {chip.icon}
            </span>
            <span className="micro-hud-chip-copy">
              {expanded ? (
                <>
                  <strong>{chip.expandedTitle}</strong>
                  <small>{chip.expandedBody}</small>
                </>
              ) : (
                <strong>{chip.shortLabel}</strong>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
