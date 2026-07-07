import React, { useEffect, useState } from 'react';
import { SmartNotificationStack } from './SmartNotificationStack';
import { normalizeSmartNotification, partitionNotificationStack } from './smartNotificationEngine';

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

function mapLegacyKindToPriority(kind) {
  if (kind === 'legendary' || kind === 'boss') return 'critical';
  if (kind === 'race' || kind === 'heat') return 'adventure';
  if (kind === 'nearby') return 'nearby';
  return 'background';
}

function legacyNotificationsToSnapshot(notifications = []) {
  const normalized = notifications.map((n) =>
    normalizeSmartNotification({
      id: n.id,
      priority: n.priority || mapLegacyKindToPriority(n.kind),
      title: n.title,
      text: n.body || n.text,
      icon: n.icon,
      kind: n.kind,
      action: n.action,
    })
  );
  const { prominent, stacked } = partitionNotificationStack(normalized);
  return {
    prominent,
    stacked,
    stackCount: stacked.length,
  };
}

/**
 * Priority-aware world notifications on the map.
 */
export function LivingWorldNotifications({
  notifications = [],
  snapshot = null,
  nav = null,
  compact = true,
}) {
  const view = snapshot || legacyNotificationsToSnapshot(notifications);

  function handleAction(notification) {
    if (!nav || !notification?.action) return;
    nav(notification.action, undefined, { adminPreview: false });
  }

  return (
    <SmartNotificationStack
      className="living-world-notifications"
      compact={compact}
      prominent={view.prominent}
      stacked={view.stacked}
      stackCount={view.stackCount}
      onAction={handleAction}
    />
  );
}
