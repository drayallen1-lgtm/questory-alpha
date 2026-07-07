import React from 'react';

export function FloatingCard({
  id,
  icon,
  title,
  metric = null,
  metricLabel = '',
  items = [],
  expanded = false,
  wide = false,
  layerHidden = false,
  onToggle,
  onViewAll,
}) {
  if (layerHidden) {
    return (
      <div
        className="floating-card floating-card--hidden"
        data-layer-id={id}
        data-layer-hidden="true"
        aria-hidden
      />
    );
  }

  return (
    <article
      className={`floating-card${expanded ? ' floating-card--expanded' : ''}${
        wide ? ' floating-card--wide' : ''
      }`}
      data-layer-id={id}
      data-layer-hidden="false"
    >
      <button
        type="button"
        className="floating-card-summary"
        onClick={() => onToggle?.(id)}
        aria-expanded={expanded}
        aria-controls={`floating-card-body-${id}`}
      >
        <div className="floating-card-summary-main">
          <span className="floating-card-head">
            {icon} {title}
          </span>
          <div className="floating-card-metrics">
            {metric != null && metric !== '' && (
              <span className="floating-card-metric">{metric}</span>
            )}
            {metricLabel && <span className="floating-card-sub">{metricLabel}</span>}
          </div>
        </div>
        <span
          className={`floating-card-chevron${expanded ? ' floating-card-chevron--open' : ''}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      <div
        id={`floating-card-body-${id}`}
        className="floating-card-body"
        hidden={!expanded}
      >
        <ul className="floating-card-list">
          {items.map((item) => (
            <li key={item.id} className="floating-card-list-item">
              {item.text}
            </li>
          ))}
        </ul>
        {onViewAll && (
          <button type="button" className="floating-card-view-all" onClick={onViewAll}>
            View All
          </button>
        )}
      </div>
    </article>
  );
}
