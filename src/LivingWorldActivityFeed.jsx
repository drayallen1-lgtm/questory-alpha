import React, { useEffect, useState } from 'react';

const ROTATE_MS = 9000;
const ENTER_MS = 420;

/**
 * Ambient world activity — auto-cycling banners so the map feels alive without taps.
 */
export function LivingWorldActivityFeed({ banners = [], paused = false }) {
  const [index, setIndex] = useState(0);
  const [entering, setEntering] = useState(true);
  const [visible, setVisible] = useState(true);

  const active = banners[index % Math.max(1, banners.length)] || null;

  useEffect(() => {
    setIndex(0);
  }, [banners.length]);

  useEffect(() => {
    if (!banners.length || paused) return undefined;

    const rotate = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % banners.length);
        setEntering(true);
        setVisible(true);
        window.setTimeout(() => setEntering(false), ENTER_MS);
      }, 280);
    }, active?.ttlMs || ROTATE_MS);

    return () => window.clearInterval(rotate);
  }, [banners.length, paused, active?.ttlMs]);

  useEffect(() => {
    if (!entering) return undefined;
    const t = window.setTimeout(() => setEntering(false), ENTER_MS);
    return () => window.clearTimeout(t);
  }, [entering, index]);

  if (!active) return null;

  return (
    <div
      className={`living-world-activity-feed living-world-activity-${active.kind || 'default'}${entering ? ' is-entering' : ''}${visible ? '' : ' is-exiting'}`}
      role="status"
      aria-live="polite"
    >
      <span className="living-world-activity-icon" aria-hidden="true">
        {active.icon}
      </span>
      <span className="living-world-activity-text">{active.text}</span>
    </div>
  );
}

/**
 * Toast-style world notifications (legendary drops, etc.)
 */
export function LivingWorldNotifications({ notifications = [] }) {
  const [dismissed, setDismissed] = useState(() => new Set());

  if (!notifications.length) return null;

  const visible = notifications.filter((n) => !dismissed.has(n.id)).slice(0, 2);
  if (!visible.length) return null;

  return (
    <div className="living-world-notifications" aria-live="polite">
      {visible.map((n) => (
        <div key={n.id} className={`living-world-notification living-world-notification-${n.kind}`}>
          <span className="living-world-notification-icon" aria-hidden="true">
            {n.icon}
          </span>
          <div className="living-world-notification-body">
            <strong>{n.title}</strong>
            <p>{n.body}</p>
          </div>
          <button
            type="button"
            className="living-world-notification-dismiss"
            aria-label="Dismiss"
            onClick={() => setDismissed((prev) => new Set([...prev, n.id]))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
