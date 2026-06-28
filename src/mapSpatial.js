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
export const SPIDERFY_EDGE_GUARD_PX = 8;

function fanPixelPoints(anchorPx, count, radiusPx, startAngle = -Math.PI / 2) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const angle = startAngle + (2 * Math.PI * i) / count;
    points.push({
      x: anchorPx.x + Math.cos(angle) * radiusPx,
      y: anchorPx.y + Math.sin(angle) * radiusPx,
    });
  }
  return points;
}

function countEdgePinnedPoints(points, width, edgeMargin = SPIDERFY_EDGE_GUARD_PX) {
  return points.filter((p) => p.x <= edgeMargin || p.x >= width - edgeMargin).length;
}

function allPointsInsideCanvas(points, width, height) {
  return points.every((p) => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height);
}

/**
 * Shrink fan radius uniformly — never clamp individual pins to viewport edges.
 */
function resolveFanRadius(anchorPx, count, baseRadiusPx, width, height) {
  let scale = 1;
  let invalidEdgeClamp = false;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const radiusPx = baseRadiusPx * scale;
    const points = fanPixelPoints(anchorPx, count, radiusPx);
    const edgePinned = countEdgePinnedPoints(points, width);
    const inside = allPointsInsideCanvas(points, width, height);

    if (inside && edgePinned <= 2) {
      return { radiusPx, points, scale, invalidEdgeClamp: false, edgePinnedCount: edgePinned };
    }

    if (edgePinned > 2) {
      invalidEdgeClamp = true;
    }
    scale *= 0.76;
  }

  const radiusPx = baseRadiusPx * 0.3;
  return {
    radiusPx,
    points: fanPixelPoints(anchorPx, count, radiusPx),
    scale: 0.3,
    invalidEdgeClamp: true,
    edgePinnedCount: count,
  };
}

export function getOffscreenSpiderGroup(groups, map) {
  if (!map || !groups?.length) return null;
  return groups.find((g) => g.markers.length >= 2 && !isAnchorInViewport(map, g.anchor)) || null;
}

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

/**
 * Fan pins in pixel space around the true anchor — radius shrinks, never edge-clamps.
 * @returns {{ layout: Map<string, [number, number]>, debug: object[], needsAnchorPan: boolean, invalidEdgeClamp: boolean }}
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
    return { layout, debug, needsAnchorPan: false, invalidEdgeClamp: false };
  }

  const anchorLngLat = [anchor.longitude, anchor.latitude];

  if (!isAnchorInViewport(map, anchor, options.paddingPx ?? SPIDERFY_VIEW_PADDING_PX)) {
    if (options.debug) {
      debug.push({
        groupId: group.id,
        needsAnchorPan: true,
        spiderAnchorLngLat: anchorLngLat,
      });
    }
    return { layout, debug, needsAnchorPan: true, invalidEdgeClamp: false };
  }

  const anchorPx = map.project(anchorLngLat);
  const zoom = map.getZoom();
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const zoomBoost = Math.max(0, zoom - SPIDERFY_MIN_ZOOM) * 5;
  const countScale = Math.min(1.22, 1 + (count - 2) * 0.04);
  const baseRadiusPx = (options.radiusPx ?? SPIDERFY_BASE_RADIUS_PX + zoomBoost) * countScale;

  const fan = resolveFanRadius(anchorPx, count, baseRadiusPx, w, h);

  if (options.debug && fan.invalidEdgeClamp) {
    console.debug('[MapSpiderfy]', {
      spiderInvalidEdgeClampDetected: true,
      groupId: group.id,
      edgePinnedCount: fan.edgePinnedCount,
      spiderAnchorScreenPoint: { x: anchorPx.x, y: anchorPx.y },
    });
  }

  markers.forEach((marker, i) => {
    const pinPoint = fan.points[i];
    const lngLat = map.unproject([pinPoint.x, pinPoint.y]);
    const coords = [lngLat.lng, lngLat.lat];

    if (Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
      layout.set(marker.id, coords);
    } else {
      layout.set(marker.id, anchorLngLat);
    }

    if (options.debug) {
      debug.push({
        markerId: marker.id,
        groupId: group.id,
        spiderAnchorLngLat: anchorLngLat,
        spiderPinLngLat: layout.get(marker.id),
        spiderAnchorScreenPoint: { x: anchorPx.x, y: anchorPx.y },
        pixelOffset: {
          dx: pinPoint.x - anchorPx.x,
          dy: pinPoint.y - anchorPx.y,
        },
        radiusPx: fan.radiusPx,
        edgePinnedCount: fan.edgePinnedCount,
      });
    }
  });

  return {
    layout,
    debug,
    needsAnchorPan: false,
    invalidEdgeClamp: fan.invalidEdgeClamp,
  };
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
  void map;
  void groups;
  void options;
  return false;
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
