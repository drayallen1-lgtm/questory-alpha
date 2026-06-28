/**
 * Phase 1B — Map spatial intelligence: spiderfy, overlap grouping, cluster meta.
 */
import { haversineDistanceMeters } from './geolocation';
import { resolvePinBaseType, resolvePinOverlays } from './mapDiscovery';

export const SPIDERFY_MIN_ZOOM = 14;
export const SPIDERFY_MAX_ZOOM = 18;
export const OVERLAP_THRESHOLD_M = 48;
/** Legacy meter fallback — prefer pixel spiderfy when map is available. */
export const SPIDERFY_RADIUS_M = 38;
export const CLUSTER_MAX_ZOOM = 14;
export const SPIDERFY_BASE_RADIUS_PX = 42;
export const SPIDERFY_VIEW_PADDING_PX = 56;

const EARTH_M = 6371000;

function centroid(markers) {
  const n = markers.length;
  const latitude = markers.reduce((s, m) => s + m.latitude, 0) / n;
  const longitude = markers.reduce((s, m) => s + m.longitude, 0) / n;
  return { latitude, longitude };
}

function offsetLatLng(lat, lng, distanceM, bearingRad) {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(latRad) * Math.cos(distanceM / EARTH_M) +
      Math.cos(latRad) * Math.sin(distanceM / EARTH_M) * Math.cos(bearingRad)
  );
  const lng2 =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceM / EARTH_M) * Math.cos(latRad),
      Math.cos(distanceM / EARTH_M) - Math.sin(latRad) * Math.sin(lat2)
    );
  return { latitude: (lat2 * 180) / Math.PI, longitude: (lng2 * 180) / Math.PI };
}

/** Group markers that are within OVERLAP_THRESHOLD_M of any member in the group. */
export function groupOverlappingMarkers(markers, thresholdM = OVERLAP_THRESHOLD_M) {
  if (!markers.length) return [];

  const groups = [];
  const used = new Set();

  for (let i = 0; i < markers.length; i++) {
    if (used.has(i)) continue;
    const group = [markers[i]];
    used.add(i);
    let expanded = true;

    while (expanded) {
      expanded = false;
      for (let j = 0; j < markers.length; j++) {
        if (used.has(j)) continue;
        const close = group.some(
          (m) =>
            haversineDistanceMeters(m.latitude, m.longitude, markers[j].latitude, markers[j].longitude) <=
            thresholdM
        );
        if (close) {
          group.push(markers[j]);
          used.add(j);
          expanded = true;
        }
      }
    }

    groups.push({
      id: group.map((m) => m.id).sort().join('|'),
      anchor: centroid(group),
      markers: group,
    });
  }

  return groups;
}

export function isAnchorInViewport(map, anchor, paddingPx = SPIDERFY_VIEW_PADDING_PX) {
  if (!map || !anchor) return true;
  const px = map.project([anchor.longitude, anchor.latitude]);
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  return (
    px.x >= paddingPx &&
    px.x <= w - paddingPx &&
    px.y >= paddingPx &&
    px.y <= h - paddingPx
  );
}

function clampPixelFanAroundAnchor(anchorPx, dx, dy, paddingPx, width, height) {
  let scale = 1;
  const minX = paddingPx;
  const maxX = width - paddingPx;
  const minY = paddingPx;
  const maxY = height - paddingPx;

  for (let i = 0; i < 10; i += 1) {
    const x = anchorPx.x + dx * scale;
    const y = anchorPx.y + dy * scale;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return { x, y, scale };
    }
    scale *= 0.82;
  }

  return {
    x: anchorPx.x + dx * 0.55,
    y: anchorPx.y + dy * 0.55,
    scale: 0.55,
  };
}

/**
 * Fan pins in pixel space around the true anchor so they stay near the real location.
 * @returns {{ layout: Map<string, [number, number]>, debug: object[] }}
 */
export function computeSpiderfyLayoutPixel(group, map, options = {}) {
  const { anchor, markers } = group;
  const count = markers.length;
  const layout = new Map();
  const debug = [];

  if (!map || count <= 1) {
    if (count === 1) {
      layout.set(markers[0].id, [markers[0].longitude, markers[0].latitude]);
    }
    return { layout, debug };
  }

  const anchorLngLat = [anchor.longitude, anchor.latitude];
  const anchorPx = map.project(anchorLngLat);
  const zoom = map.getZoom();
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const pad = options.paddingPx ?? SPIDERFY_VIEW_PADDING_PX;
  const zoomBoost = Math.max(0, zoom - SPIDERFY_MIN_ZOOM) * 6;
  const countScale = Math.min(1.28, 1 + (count - 2) * 0.05);
  const radiusPx = (options.radiusPx ?? SPIDERFY_BASE_RADIUS_PX + zoomBoost) * countScale;
  const startAngle = -Math.PI / 2;

  markers.forEach((marker, i) => {
    const angle = startAngle + (2 * Math.PI * i) / count;
    const dx = Math.cos(angle) * radiusPx;
    const dy = Math.sin(angle) * radiusPx;
    const clamped = clampPixelFanAroundAnchor(anchorPx, dx, dy, pad, w, h);
    const lngLat = map.unproject([clamped.x, clamped.y]);
    const coords = [lngLat.lng, lngLat.lat];

    if (Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
      layout.set(marker.id, coords);
    } else {
      layout.set(marker.id, anchorLngLat);
    }

    if (options.debug) {
      debug.push({
        markerId: marker.id,
        spiderAnchorLngLat: anchorLngLat,
        spiderPinLngLat: layout.get(marker.id),
        pixelOffset: {
          dx: clamped.x - anchorPx.x,
          dy: clamped.y - anchorPx.y,
        },
        radiusScale: clamped.scale,
      });
    }
  });

  return { layout, debug };
}

/** @deprecated Prefer computeSpiderfyLayoutPixel when map instance is available. */
export function computeSpiderfyLayout(group, options = {}) {
  const { radiusM = SPIDERFY_RADIUS_M, zoom = SPIDERFY_MIN_ZOOM } = options;
  const { anchor, markers } = group;
  const count = markers.length;
  const layout = new Map();

  if (count <= 1) {
    if (count === 1) {
      layout.set(markers[0].id, [markers[0].longitude, markers[0].latitude]);
    }
    return layout;
  }

  const scale = Math.min(1.45, 1 + (count - 2) * 0.08);
  const zoomBoost = zoom > SPIDERFY_MIN_ZOOM ? 1 + (zoom - SPIDERFY_MIN_ZOOM) * 0.06 : 1;
  const dist = radiusM * scale * zoomBoost;
  const startAngle = -Math.PI / 2;

  markers.forEach((marker, i) => {
    const angle = startAngle + (2 * Math.PI * i) / count;
    const point = offsetLatLng(anchor.latitude, anchor.longitude, dist, angle);
    layout.set(marker.id, [point.longitude, point.latitude]);
  });

  return layout;
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

export function shouldSpiderfyAtZoom(zoom) {
  return zoom >= SPIDERFY_MIN_ZOOM;
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

export function ensureAnchorsInView(map, groups, options = {}) {
  if (!map || !groups?.length) return false;
  const spiderGroups = groups.filter((g) => g.markers.length >= 2);
  if (!spiderGroups.length) return false;

  const offscreen = spiderGroups.find((g) => !isAnchorInViewport(map, g.anchor));
  if (!offscreen) return false;

  easeMapTo(map, {
    center: [offscreen.anchor.longitude, offscreen.anchor.latitude],
    zoom: Math.max(map.getZoom(), SPIDERFY_MIN_ZOOM),
    duration: options.duration ?? 450,
  });
  return true;
}

/** Keep selected pin above bottom card on mobile/desktop. */
export function centerOnPinWithCardPadding(map, lngLat, options = {}) {
  if (!map || !lngLat) return;
  const zoom = options.zoom ?? Math.max(map.getZoom(), SPIDERFY_MIN_ZOOM);
  easeMapTo(map, {
    center: lngLat,
    zoom,
    duration: options.duration ?? 550,
    offset: options.offset ?? [0, -120],
  });
}
