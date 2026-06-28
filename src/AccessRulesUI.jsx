import React, { useEffect, useState } from 'react';
import { Globe, MapPin, Lock, Eye } from 'lucide-react';
import {
  ACCESS_TYPE_OPTIONS,
  accessTypeLabel,
  evaluateAccessContext,
  normalizeAccessType,
} from './accessRules';
import { formatDistanceAway, getCurrentPosition } from './geolocation';

export function usePlayerLocation(watch = true) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!watch) return undefined;
    let cancelled = false;

    async function poll() {
      try {
        const pos = await getCurrentPosition();
        if (cancelled) return;
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError('');
      } catch {
        if (!cancelled) setError('Location unavailable');
      }
    }

    poll();
    const id = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [watch]);

  return { location, error };
}

export function useAdventureAccess(adventure, options = {}) {
  const { location } = usePlayerLocation(options.watchLocation !== false);
  return evaluateAccessContext(adventure, {
    userLatitude: location?.latitude ?? options.userLatitude ?? null,
    userLongitude: location?.longitude ?? options.userLongitude ?? null,
    adminPreview: options.adminPreview,
    previewMode: options.previewMode,
    isAdmin: options.isAdmin,
    userId: options.userId,
  });
}

export function AccessTypeSelector({ value, onChange }) {
  return (
    <div className="access-type-grid">
      {ACCESS_TYPE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`access-type-card ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          <span className="access-type-icon">{opt.icon}</span>
          <strong>{opt.label}</strong>
          <small>{opt.desc}</small>
        </button>
      ))}
    </div>
  );
}

export function AccessTypeBadge({ adventure, compact = false }) {
  const type = normalizeAccessType(adventure?.accessType);
  const label = accessTypeLabel(type);
  if (compact) {
    return <span className="badge access-badge">{label}</span>;
  }
  return (
    <span className={`badge access-badge access-${type}`}>
      {type === 'private' ? <Lock size={12} /> : <MapPin size={12} />} {label}
    </span>
  );
}

export function AccessStatusBanner({ access, className = '' }) {
  if (!access?.message) return null;
  const Icon = access.tooFar ? Eye : access.remoteOnlyRewards ? Globe : MapPin;
  return (
    <div className={`preview-banner access-status-banner ${access.mode === 'preview' ? 'preview-mode' : ''} ${className}`}>
      <Icon size={16} />
      <div>
        <strong>{access.label}</strong>
        <p>{access.message}</p>
        {access.distanceM != null && access.tooFar && (
          <small>{formatDistanceAway(access.distanceM)} · play zone {Math.round(access.playRadiusM)} m</small>
        )}
        {access.remoteOnlyRewards && access.mode === 'preview' && (
          <small>Virtual badges and coins only in preview.</small>
        )}
      </div>
    </div>
  );
}
