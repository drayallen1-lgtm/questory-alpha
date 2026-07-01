/**
 * Map spatial helpers — cluster meta and camera easing.
 */
import { resolvePinBaseType, resolvePinOverlays } from './mapDiscovery';

export const CLUSTER_PICKER_ZOOM = 15;
export const CLUSTER_MAX_ZOOM = 14;

/** Resolve dominant base type + flags from marker list (for cluster UI). */
export function summarizeClusterMarkers(markers, mapState = null) {
  const counts = new Map();
  let hasEvent = false;
  let hasFeatured = false;
  let hasLegendary = false;

  for (const m of markers) {
    const adventure = m.adventure || m;
    const base = resolvePinBaseType(adventure);
    counts.set(base.id, (counts.get(base.id) || 0) + 1);
    const overlays = resolvePinOverlays(adventure, mapState);
    if (overlays.some((o) => o.id === 'event')) hasEvent = true;
    if (overlays.some((o) => o.id === 'featured')) hasFeatured = true;
    if (overlays.some((o) => o.id === 'legendary')) hasLegendary = true;
  }

  let dominant = { id: 'default', icon: '📍', label: 'Adventure' };
  let topCount = 0;
  counts.forEach((n, id) => {
    if (n > topCount) {
      topCount = n;
      const base = markers.find((m) => resolvePinBaseType(m.adventure || m).id === id);
      if (base) {
        const t = resolvePinBaseType(base.adventure || base);
        dominant = { id: t.id, icon: t.icon, label: t.label };
      }
    }
  });

  const categories = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, n]) => {
      const marker = markers.find((m) => resolvePinBaseType(m.adventure || m).id === id);
      const label = marker ? resolvePinBaseType(marker.adventure || marker).label : id;
      return `${label} (${n})`;
    });

  return {
    count: markers.length,
    dominant,
    categories,
    hasEvent,
    hasFeatured,
    hasLegendary,
  };
}

export function buildClusterTooltipHtml(meta) {
  const count = meta.count || 0;
  const label = count === 1 ? '1 adventure nearby' : `${count} adventures nearby`;
  const cats = meta.categories?.length
    ? meta.categories.join(' · ')
    : meta.dominant?.label || '';
  const heat = meta.heatLabel
    ? `<span class="questory-cluster-tooltip-heat">${meta.heatLabel}</span>`
    : '';
  return `<div class="questory-cluster-tooltip">
    <strong>${label}</strong>
    ${heat}
    ${cats ? `<span class="questory-cluster-tooltip-cats">${cats}</span>` : ''}
  </div>`;
}

export function clusterVisualClasses(meta) {
  return [
    'questory-cluster',
    meta.hasLegendary ? 'cluster-legendary' : '',
    meta.hasEvent ? 'cluster-event' : '',
    meta.hasFeatured ? 'cluster-featured' : '',
    meta.count >= 10 ? 'cluster-large' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function easeMapTo(map, options = {}) {
  if (!map) return;
  const {
    center,
    zoom,
    duration = 650,
    offset = [0, 0],
    essential = true,
  } = options;

  map.easeTo({
    center,
    zoom,
    duration,
    offset,
    essential,
  });
}

export function flyMapTo(map, options = {}) {
  if (!map) return;
  const { center, zoom, duration = 900, offset = [0, 0], essential = true } = options;
  map.flyTo({ center, zoom, duration, offset, essential });
}
