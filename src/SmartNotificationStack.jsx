import React, { useState } from 'react';
import { NOTIFICATION_PRIORITY } from './smartNotificationEngine';

export function SmartNotificationStack({
  prominent = [],
  stacked = [],
  stackCount = 0,
  onAction,
  onDismiss,
  compact = false,
  inline = false,
  className = '',
}) {
  const [stackOpen, setStackOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
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

  function toggleInline(notification) {
    setExpandedId((current) => (current === notification.id ? null : notification.id));
  }

  return (
    <div
      className={`smart-notif-stack-wrap${compact ? ' smart-notif-stack-wrap--compact' : ''}${
        inline ? ' smart-notif-stack-wrap--inline' : ''
      }${className ? ` ${className}` : ''}`}
      aria-live="polite"
    >
      {visibleProminent.map((notification) => {
        const isExpanded = expandedId === notification.id;
        if (inline && !isExpanded) {
          return (
            <div
              key={notification.id}
              className={`smart-notif-inline smart-notif-inline--${notification.priority}`}
            >
              <button
                type="button"
                className="smart-notif-inline-main"
                onClick={() => toggleInline(notification)}
                aria-expanded={isExpanded}
              >
                <span className="smart-notif-inline-dot" aria-hidden>
                  {notification.priority === NOTIFICATION_PRIORITY.CRITICAL ? '🔴' : '🔔'}
                </span>
                <span className="smart-notif-inline-copy">
                  {notification.title && <strong>{notification.title}</strong>}
                  <span>{notification.text}</span>
                </span>
                <span className="smart-notif-inline-expand">Expand</span>
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
          );
        }

        if (inline && isExpanded) {
          return (
            <div
              key={notification.id}
              className={`smart-notif smart-notif--${notification.priority} smart-notif--expanded`}
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
              </button>
              <button
                type="button"
                className="smart-notif-dismiss"
                aria-label="Collapse notification"
                onClick={() => setExpandedId(null)}
              >
                ×
              </button>
            </div>
          );
        }

        return (
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
        );
      })}

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

      {!stackOpen && stackCount > 0 && visibleStacked.length > 0 && !inline && (
        <p className="smart-notif-stack-hint" aria-hidden>
          {stackCount} background update{stackCount === 1 ? '' : 's'} stacked
        </p>
      )}
    </div>
  );
}
