import React from 'react';
import { ChevronRight, Eye, Globe, Play, X } from 'lucide-react';
import { AccessStatusBanner, AccessTypeBadge } from './AccessRulesUI';
import { evaluateAccessContext } from './accessRules';
import { isDev } from './config/env';
import { formatPinDistanceImperial, MAP_FILTER_OPTIONS, resolvePinVisual } from './mapDiscovery';
import { getAdventureIdentityChips } from './questoryIdentityEngine';
import { getSponsorInfo } from './seed';

function difficultyLabel(level) {
  const n = Number(level) || 2;
  const labels = ['Easy', 'Easy', 'Moderate', 'Challenging', 'Expert', 'Legendary'];
  return labels[Math.min(Math.max(n, 1), 5)] || 'Moderate';
}

function estimateDuration(adventure) {
  const clues = adventure?.clues?.length || 0;
  if (clues <= 2) return '~30 min';
  if (clues <= 5) return '~1 hr';
  return '~2+ hrs';
}

function resolveHeroImage(adventure, visual) {
  return adventure?.coverUrl || adventure?.heroUrl || adventure?.imageUrl || null;
}

function resolvePrimaryCtaLabel(access) {
  if (access?.ctaLabel) return access.ctaLabel;
  if (access?.tooFar || access?.mode === 'preview' || !access?.canPlayFull) {
    return access?.mode === 'hidden' ? 'View Details' : 'Preview Adventure';
  }
  return 'Start Adventure';
}

export function MapPinCard({
  adventure,
  access,
  visual,
  distanceM,
  entering = false,
  onClose,
  onPlay,
  onPreview,
  onViewClues,
}) {
  if (!adventure) return null;

  const tooFar = access?.tooFar;
  const previewOnly = Boolean(tooFar || access?.mode === 'preview' || !access?.canPlayFull);
  const ctaLabel = resolvePrimaryCtaLabel(access);
  const pinIcon = visual?.icon || visual?.base?.icon || '📍';
  const pinLabel = visual?.label || visual?.base?.label || 'Adventure';
  const pinColor = visual?.color || visual?.base?.color;
  const heroImage = resolveHeroImage(adventure, visual);
  const difficulty = difficultyLabel(adventure?.difficulty);
  const duration = estimateDuration(adventure);

  const hasFeatured = visual?.overlays?.some((o) => o.id === 'featured');
  const hasEvent = visual?.overlays?.some((o) => o.id === 'event');
  const hasLegendary = visual?.overlays?.some((o) => o.id === 'legendary');
  const identityChips = getAdventureIdentityChips(adventure);
  const sponsorInfo = getSponsorInfo(adventure);
  const showSponsorLine = Boolean(
    adventure?.isSponsoredDrop || adventure?.sponsorVerified || sponsorInfo?.name
  );

  function stopCardEvent(e) {
    e.stopPropagation();
  }

  function handlePrimaryCta(e) {
    e.stopPropagation();
    e.preventDefault();
    const handler = previewOnly ? onPreview || onPlay : onPlay;
    if (isDev) {
      console.debug('[MapPinCard]', {
        mapCardPrimaryCtaClicked: { adventureId: adventure.id, accessMode: access?.mode },
      });
    }
    handler?.(adventure, access);
  }

  function handleViewClues(e) {
    e.stopPropagation();
    e.preventDefault();
    if (isDev) {
      console.debug('[MapPinCard]', {
        mapCardViewCluesClicked: { adventureId: adventure.id },
      });
    }
    onViewClues?.(adventure, access);
  }

  function handleClose(e) {
    e.stopPropagation();
    e.preventDefault();
    onClose?.();
  }

  return (
    <div
      className={[
        'map-pin-card',
        'questory-map-card',
        entering ? 'map-card-enter map-card-from-pin' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-label={adventure.title}
      onClick={stopCardEvent}
      onMouseDown={stopCardEvent}
      onTouchStart={stopCardEvent}
    >
      <button type="button" className="map-pin-card-close ghost" onClick={handleClose} aria-label="Close">
        <X size={16} />
      </button>

      <button type="button" className="primary map-card-safe-start" onClick={handlePrimaryCta}>
        <Play size={16} /> {ctaLabel}
      </button>

      <div className="map-pin-card-body">
        <div
          className="map-pin-card-hero"
          style={{ '--pin-hero-color': pinColor || '#14b8a6' }}
        >
          <span className="map-pin-card-hero-watermark" aria-hidden="true">
            {pinIcon}
          </span>
          {heroImage ? (
            <img src={heroImage} alt="" className="map-pin-card-hero-img" />
          ) : (
            <span className="map-pin-card-hero-icon">{pinIcon}</span>
          )}
          <div className="map-pin-card-hero-scrim" />
          <div className="map-pin-card-hero-text">
            <h3>{adventure.title}</h3>
            <p>{pinLabel}</p>
          </div>
        </div>

        <div className="map-pin-card-meta-row">
          <span>{difficulty}</span>
          {distanceM != null && <span>{formatPinDistanceImperial(distanceM)}</span>}
          <span>{duration}</span>
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
          {visual?.heatLevel === 'hot' && (
            <span className="badge map-heat-badge map-badge-shimmer">🔥 Hot</span>
          )}
          {hasFeatured && (
            <span className="badge cluster-picker-featured map-badge-shimmer">⭐ Featured</span>
          )}
          {hasEvent && (
            <span className="badge cluster-picker-event map-badge-shimmer">📅 Event</span>
          )}
          {hasLegendary && (
            <span className="badge map-badge-shimmer" style={{ borderColor: 'rgba(167, 139, 250, 0.5)' }}>
              ✨ Legendary
            </span>
          )}
          {identityChips.map((chip) => (
            <span
              key={chip.id}
              className={`badge map-pin-identity-chip chip-${chip.kind} map-badge-shimmer`}
            >
              {chip.icon} {chip.label}
            </span>
          ))}
        </div>

        <AccessStatusBanner access={access} />

        <p className="story-preview map-pin-card-story">{adventure.story}</p>
        {showSponsorLine && (
          <p className="sponsor-inline">Sponsored by {sponsorInfo.name}</p>
        )}

        <div className="chips map-pin-card-chips">
          <span>{adventure.clues?.length || 0} clues</span>
          {adventure.prize && (
            <span className="map-pin-card-reward">{adventure.prize}</span>
          )}
          <span>{adventure.location}</span>
        </div>
      </div>

      <div className="map-pin-card-actions map-pin-card-actions-sticky">
        <button type="button" className="primary map-pin-card-cta-primary" onClick={handlePrimaryCta}>
          <Play size={16} /> {ctaLabel} <ChevronRight size={16} />
        </button>
        {onViewClues && (
          <button type="button" className="ghost map-pin-card-cta-secondary" onClick={handleViewClues}>
            View clue trail
          </button>
        )}
      </div>
    </div>
  );
}

function pinAccessLabel(pinAccess, access) {
  if (pinAccess === 'virtual') return 'Virtual only';
  if (access?.tooFar || pinAccess === 'preview') return 'Preview';
  if (pinAccess === 'local') return 'Local';
  return 'Playable';
}

export function ClusterAdventurePicker({
  meta,
  markers = [],
  mapState = null,
  accessOptions = {},
  clusterDistanceM = null,
  onClose,
  onSelectAdventure,
}) {
  if (!markers.length) return null;

  const count = meta?.count ?? markers.length;
  const categorySummary = meta?.categories?.length
    ? meta.categories.map((c) => c.replace(/\s*\(\d+\)$/, '')).join(' · ')
    : meta?.dominant?.label || 'Adventures';

  function handleClose(e) {
    e.stopPropagation();
    onClose?.();
  }

  function handleRowClick(marker) {
    if (isDev) {
      console.debug('[QuestoryMap]', {
        pinClicked: { adventureId: marker.id, title: marker.title },
        fromClusterPicker: true,
      });
    }
    onSelectAdventure?.(marker);
  }

  return (
    <div
      className="cluster-adventure-picker"
      role="dialog"
      aria-label={`${count} adventures nearby`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button type="button" className="cluster-picker-close ghost" onClick={handleClose} aria-label="Close">
        <X size={16} />
      </button>

      <div className="cluster-picker-head">
        <span className="cluster-picker-icon">{meta?.dominant?.icon || '📍'}</span>
        <div>
          <h3>{count === 1 ? '1 adventure nearby' : `${count} adventures nearby`}</h3>
          <p className="cluster-picker-summary">{categorySummary}</p>
          {clusterDistanceM != null && (
            <p className="cluster-picker-distance">{formatPinDistanceImperial(clusterDistanceM)} away</p>
          )}
        </div>
      </div>

      <ul className="cluster-picker-list">
        {markers.map((marker) => {
          const visual = resolvePinVisual(marker.adventure, mapState);
          const access = marker.access || evaluateAccessContext(marker.adventure, accessOptions);
          const accessLabel = pinAccessLabel(marker.pinAccess, access);

          return (
            <li key={marker.id}>
              <button
                type="button"
                className={`cluster-picker-row pin-${marker.pinAccess || 'playable'}`}
                onClick={() => handleRowClick(marker)}
              >
                <span
                  className={`cluster-picker-row-icon ${visual?.animated ? 'pin-animated' : ''}`}
                  style={{ '--pin-color': visual?.color || visual?.base?.color }}
                >
                  {visual?.icon || visual?.base?.icon || '📍'}
                </span>
                <span className="cluster-picker-row-body">
                  <strong>{marker.title}</strong>
                  <span className="cluster-picker-row-meta">
                    {visual?.label || visual?.base?.label || 'Adventure'}
                    {marker.distanceM != null && (
                      <> · {formatPinDistanceImperial(marker.distanceM)}</>
                    )}
                  </span>
                  <span className="cluster-picker-row-badges">
                    <span className={`badge map-pin-badge pin-${marker.pinAccess || 'playable'}`}>
                      {accessLabel}
                    </span>
                    {marker.adventure?.prize && (
                      <span className="badge cluster-picker-reward">{marker.adventure.prize}</span>
                    )}
                    {visual?.heatLevel === 'hot' && <span className="badge map-heat-badge">🔥 Hot</span>}
                    {visual?.overlays?.some((o) => o.id === 'featured') && (
                      <span className="badge cluster-picker-featured">⭐ Featured</span>
                    )}
                    {visual?.overlays?.some((o) => o.id === 'event') && (
                      <span className="badge cluster-picker-event">📅 Event</span>
                    )}
                  </span>
                </span>
                <ChevronRight size={16} className="cluster-picker-row-chevron" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MapFilterBar({ activeFilter, onChange, counts = {}, className = '' }) {
  return (
    <div className={`map-filter-bar${className ? ` ${className}` : ''}`} role="toolbar" aria-label="Map filters">
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
