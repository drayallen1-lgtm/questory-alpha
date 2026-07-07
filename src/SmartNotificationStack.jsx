import React, { useState } from 'react';
import { NOTIFICATION_PRIORITY } from './smartNotificationEngine';

export function SmartNotificationStack({
  prominent = [],
  stacked = [],
  stackCount = 0,
  onAction,
  onDismiss,
  compact = false,
  className = '',
}) {
  const [stackOpen, setStackOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => new Set());

  const visibleProminent = prominent.filter((n) => !dismissed.has(n.id));
  const visibleStacked = stacked.filter((n) => !dismissed.has(n.id));

  if (!visibleProminent.length && !visibleStacked.length) return null;

  function dismiss(id) {
    setDismissed((prev) => new Set([...prev, id]));
    onDismiss?.(id);
  }

  function handleAction(notification) {
    onAction?.(notification);
  }

  return (
    <div
      className={`smart-notif-stack-wrap${compact ? ' smart-notif-stack-wrap--compact' : ''}${
        className ? ` ${className}` : ''
      }`}
      aria-live="polite"
    >
      {visibleProminent.map((notification) => (
        <div
          key={notification.id}
          className={`smart-notif smart-notif--${notification.priority}`}
          role="status"
        >
          <button
            type="button"
            className="smart-notif-main"
            onClick={() => handleAction(notification)}
          >
            <span className="smart-notif-icon" aria-hidden>
              {notification.icon}
            </span>
            <span className="smart-notif-copy">
              {notification.title && (
                <strong className="smart-notif-title">{notification.title}</strong>
              )}
              <span className="smart-notif-text">{notification.text}</span>
            </span>
            {notification.priority === NOTIFICATION_PRIORITY.CRITICAL && (
              <span className="smart-notif-priority-badge">Critical</span>
            )}
          </button>
          <button
            type="button"
            className="smart-notif-dismiss"
            aria-label="Dismiss notification"
            onClick={() => dismiss(notification.id)}
          >
            ×
          </button>
        </div>
      ))}

      {visibleStacked.length > 0 && (
        <div className="smart-notif-background-group">
          <button
            type="button"
            className="smart-notif-stack-toggle"
            aria-expanded={stackOpen}
            onClick={() => setStackOpen((open) => !open)}
          >
            <span className="smart-notif-stack-count">{visibleStacked.length}</span>
            <span>{stackOpen ? 'Hide quiet updates' : 'Quiet updates'}</span>
            <span className="smart-notif-stack-chevron" aria-hidden>
              {stackOpen ? '▲' : '▼'}
            </span>
          </button>

          {stackOpen && (
            <div className="smart-notif-stack-panel">
              {visibleStacked.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className="smart-notif smart-notif--background smart-notif--stacked"
                  onClick={() => handleAction(notification)}
                >
                  <span className="smart-notif-icon" aria-hidden>
                    {notification.icon}
                  </span>
                  <span className="smart-notif-text">{notification.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!stackOpen && stackCount > 0 && visibleStacked.length > 0 && (
        <p className="smart-notif-stack-hint" aria-hidden>
          {stackCount} background update{stackCount === 1 ? '' : 's'} stacked
        </p>
      )}
    </div>
  );
}
