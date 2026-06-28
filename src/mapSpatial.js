/**
 * Map spatial helpers — cluster meta, click-triggered radial spiderfy, camera easing.
 */
import { resolvePinBaseType, resolvePinOverlays } from './mapDiscovery';

export const SPIDERFY_CLICK_ZOOM = 15;
export const SPIDERFY_MIN_ZOOM = SPIDERFY_CLICK_ZOOM;
export const SPIDERFY_MAX_ZOOM = 18;
export const CLUSTER_MAX_ZOOM = 14;

/**
 * Simple radial spiderfy around a cluster center in pixel space.
 * No edge clamping, no auto-pan — fan stays anchored to the true coordinate.
 */
export function computeRadialSpiderfy(centerLngLat, markers, map) {
  const layout = new Map();
  if (!map || !markers?.length) {
    return { layout, radius: 0, count: 0 };
  }

  const centerPx = map.project(centerLngLat);
  const count = markers.length;
  const radius = Math.min(70, 32 + count * 4);

  markers.forEach((marker, index) => {
    const angle = (Math.PI * 2 * index) / count;
    const pointPx = {
      x: centerPx.x + Math.cos(angle) * radius,
      y: centerPx.y + Math.sin(angle) * radius,
    };
    const lngLat = map.unproject([pointPx.x, pointPx.y]);
    layout.set(marker.id, [lngLat.lng, lngLat.lat]);
  });

  return { layout, radius, count };
}

/** Build GeoJSON line strings from spiderfied groups (anchor → pin). */
export function spiderLinesGeoJSON(spiderGroups, layouts) {
  const features = [];

  for (const group of spiderGroups) {
    if (group.markers.length < 2) continue;
    const layout = layouts.get(group.id);
    if (!layout) continue;
    const anchor = [group.anchor.longitude, group.anchor.latitude];

    for (const marker of group.markers) {
      const end = layout.get(marker.id);
      if (!end) continue;
      features.push({
        type: 'Feature',
        id: `${group.id}-${marker.id}`,
        geometry: {
          type: 'LineString',
          coordinates: [anchor, end],
        },
        properties: { groupId: group.id, markerId: marker.id },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

export function anchorPointsGeoJSON(spiderGroups) {
  return {
    type: 'FeatureCollection',
    features: spiderGroups
      .filter((g) => g.markers.length >= 2)
      .map((g) => ({
        type: 'Feature',
        id: g.id,
        geometry: {
          type: 'Point',
          coordinates: [g.anchor.longitude, g.anchor.latitude],
        },
        properties: { count: g.markers.length },
      })),
  };
}

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
    .slice(0, 2)
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
  return `<div class="questory-cluster-tooltip">
    <strong>${label}</strong>
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
