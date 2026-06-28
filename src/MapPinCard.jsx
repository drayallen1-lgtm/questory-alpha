import React from 'react';
import { ChevronRight, Eye, Globe, Play, X } from 'lucide-react';
import { AccessStatusBanner, AccessTypeBadge } from './AccessRulesUI';
import { formatPinDistanceImperial, MAP_FILTER_OPTIONS } from './mapDiscovery';
import { getSponsorInfo } from './seed';

export function MapPinCard({ adventure, access, visual, distanceM, onClose, onPlay, onViewClues }) {
  if (!adventure) return null;

  const tooFar = access?.tooFar;
  const ctaLabel = access?.ctaLabel || (tooFar ? 'Preview Adventure' : 'Play');

  return (
    <div className="map-pin-card" role="dialog" aria-label={adventure.title}>
      <button type="button" className="map-pin-card-close ghost" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>

      <div className="map-pin-card-head">
        <span
          className={`map-pin-card-icon ${visual?.animated ? 'pin-animated' : ''}`}
          style={{ '--pin-color': visual?.color }}
        >
          {visual?.icon || '📍'}
        </span>
        <div>
          <h3>{adventure.title}</h3>
          <p className="map-pin-card-category">
            {visual?.label || 'Adventure'}
            {distanceM != null && (
              <span className="map-pin-card-distance"> · {formatPinDistanceImperial(distanceM)}</span>
            )}
          </p>
        </div>
      </div>

      <div className="map-pin-card-badges">
        <AccessTypeBadge adventure={adventure} compact />
        <span className={`badge map-pin-badge pin-${tooFar ? 'preview' : 'playable'}`}>
          {tooFar ? (
            <>
              <Eye size={12} /> Preview
            </>
          ) : (
            <>
              <Globe size={12} /> Playable
            </>
          )}
        </span>
        {visual?.heatLevel === 'hot' && <span className="badge map-heat-badge">🔥 Hot</span>}
      </div>

      <AccessStatusBanner access={access} />

      <p className="story-preview map-pin-card-story">{adventure.story}</p>
      <p className="sponsor-inline">Sponsored by {getSponsorInfo(adventure).name}</p>

      <div className="chips">
        <span>{adventure.clues?.length || 0} clues</span>
        <span>{adventure.prize}</span>
        <span>{adventure.location}</span>
      </div>

      <div className="map-pin-card-actions">
        <button type="button" onClick={onPlay}>
          <Play size={16} /> {ctaLabel} <ChevronRight size={16} />
        </button>
        {onViewClues && (
          <button type="button" className="ghost" onClick={onViewClues}>
            View clue trail
          </button>
        )}
      </div>
    </div>
  );
}

export function MapFilterBar({ activeFilter, onChange, counts = {} }) {
  return (
    <div className="map-filter-bar" role="toolbar" aria-label="Map filters">
      {MAP_FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`map-filter-chip ${activeFilter === opt.id ? 'active' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          <span>{opt.icon}</span>
          {opt.label}
          {counts[opt.id] != null && counts[opt.id] > 0 && (
            <span className="map-filter-count">{counts[opt.id]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
