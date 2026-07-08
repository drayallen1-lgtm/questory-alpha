import React from 'react';
import { ChevronRight, Eye, X } from 'lucide-react';

export function MarketVenueCard({
  venue,
  entering = false,
  watched = false,
  onClose,
  onBrowse,
  onWatch,
}) {
  if (!venue) return null;

  function stopCardEvent(event) {
    event.stopPropagation();
  }

  return (
    <div
      className={`market-venue-card${entering ? ' market-venue-card--entering' : ''}`}
      role="dialog"
      aria-label={venue.label}
      onClick={stopCardEvent}
      onKeyDown={stopCardEvent}
    >
      <button type="button" className="market-venue-card-close ghost" onClick={onClose} aria-label="Close">
        <X size={18} />
      </button>

      <div className="market-venue-card-head">
        <span className="market-venue-card-icon" aria-hidden>
          {venue.icon}
        </span>
        <div>
          <h3 className="market-venue-card-title">{venue.label}</h3>
          <p className="market-venue-card-status">{venue.status}</p>
        </div>
        {venue.liveCount > 0 && (
          <span className="market-venue-card-live">{venue.liveCount} live</span>
        )}
      </div>

      {venue.tagline && <p className="market-venue-card-tagline">{venue.tagline}</p>}

      <p className="market-venue-card-live-label">Live now</p>
      <ul className="market-venue-card-items">
        {(venue.items || []).slice(0, 4).map((item) => (
          <li key={item.id}>
            <span className="market-venue-card-item-icon" aria-hidden>
              {item.icon}
            </span>
            <span className="market-venue-card-item-copy">
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
          </li>
        ))}
      </ul>

      <div className="market-venue-card-actions">
        <button type="button" className="market-venue-card-cta" onClick={() => onBrowse?.(venue)}>
          {venue.ctaLabel || 'Browse Market'}
          <ChevronRight size={16} aria-hidden />
        </button>
        <button
          type="button"
          className={`market-venue-card-watch ghost${watched ? ' market-venue-card-watch--on' : ''}`}
          aria-pressed={watched}
          onClick={() => onWatch?.(venue)}
        >
          <Eye size={16} aria-hidden />
          {watched ? 'Watching' : 'Watch Venue'}
        </button>
      </div>
    </div>
  );
}
