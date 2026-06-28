import { env, hasMapboxEnv } from './config/env';
import { buildMapMarkerAccess, evaluateAccessContext } from './accessRules';
import { haversineDistanceMeters } from './geolocation';

export const MAPBOX_FALLBACK_MESSAGE =
  'Map preview unavailable. Add VITE_MAPBOX_TOKEN to enable live maps.';

export function getMapboxToken() {
  return env.mapboxToken;
}

export function hasMapboxToken() {
  return hasMapboxEnv();
}

function readCoord(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readLatLng(lat, lng) {
  const latitude = readCoord(lat);
  const longitude = readCoord(lng);
  if (latitude == null || longitude == null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function readPointFromObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  return (
    readLatLng(obj.lat ?? obj.latitude, obj.lng ?? obj.longitude) ||
    readLatLng(obj.y, obj.x)
  );
}

/**
 * Resolve map coordinates from any supported adventure shape.
 * @returns {[number, number] | null} [longitude, latitude]
 */
export function getAdventureMapPoint(adventure) {
  if (!adventure) return null;

  let point =
    readLatLng(adventure.lat, adventure.lng) ||
    readLatLng(adventure.latitude, adventure.longitude);
  if (point) return [point.longitude, point.latitude];

  point = readPointFromObject(adventure.location);
  if (point) return [point.longitude, point.latitude];

  point = readPointFromObject(adventure.coords);
  if (point) return [point.longitude, point.latitude];

  point = readPointFromObject(adventure.mapCenter);
  if (point) return [point.longitude, point.latitude];

  for (const clue of adventure.clues || []) {
    point =
      readLatLng(clue.lat, clue.lng) ||
      readLatLng(clue.latitude, clue.longitude) ||
      readPointFromObject(clue.location) ||
      readPointFromObject(clue.coords);
    if (point) return [point.longitude, point.latitude];
  }

  return null;
}

function pointToLatLng(point) {
  if (!point) return null;
  if (Array.isArray(point) && point.length >= 2) {
    return readLatLng(point[1], point[0]);
  }
  return point;
}

/** Centroid of all clue coordinates, or first map point, or Parsons default. */
export function getAdventureMapCenter(adventure) {
  const clues = (adventure?.clues || [])
    .map((c) => readLatLng(c.lat ?? c.latitude, c.lng ?? c.longitude))
    .filter(Boolean);

  if (clues.length) {
    const latitude = clues.reduce((sum, c) => sum + c.latitude, 0) / clues.length;
    const longitude = clues.reduce((sum, c) => sum + c.longitude, 0) / clues.length;
    return { latitude, longitude };
  }

  const fromPoint = pointToLatLng(getAdventureMapPoint(adventure));
  return fromPoint || { latitude: 37.3392, longitude: -95.261 };
}

export function adventureHasMapCoordinates(adventure) {
  return getAdventureMapPoint(adventure) != null;
}

export function buildAdventureMarkers(adventures, accessOptions = {}) {
  const { userLatitude, userLongitude, isAdmin, userId } = accessOptions;

  return adventures
    .map((adventure) => {
      const coords = getAdventureMapPoint(adventure);
      if (!coords) return null;
      const [longitude, latitude] = coords;

      const access = evaluateAccessContext(adventure, {
        userLatitude,
        userLongitude,
        isAdmin,
        userId,
      });
      const pinAccess = buildMapMarkerAccess(adventure, access);
      const distanceM =
        userLatitude != null && userLongitude != null
          ? haversineDistanceMeters(userLatitude, userLongitude, latitude, longitude)
          : null;

      return {
        id: adventure.id,
        type: 'adventure',
        title: adventure.title,
        subtitle: adventure.location,
        latitude,
        longitude,
        adventure,
        access,
        pinAccess,
        distanceM,
      };
    })
    .filter(Boolean)
    .filter((m) => m.pinAccess !== 'hidden');
}

export function computeMapPinStats(adventures, markers, accessOptions = {}) {
  const loaded = adventures.length;
  let missingCoords = 0;
  let accessFiltered = 0;

  for (const adventure of adventures) {
    const point = getAdventureMapPoint(adventure);
    if (!point) {
      missingCoords += 1;
      continue;
    }
    const access = evaluateAccessContext(adventure, {
      userLatitude: accessOptions.userLatitude,
      userLongitude: accessOptions.userLongitude,
      isAdmin: accessOptions.isAdmin,
      userId: accessOptions.userId,
    });
    if (buildMapMarkerAccess(adventure, access) === 'hidden') {
      accessFiltered += 1;
    }
  }

  return {
    loaded,
    missingCoords,
    accessFiltered,
    pinCount: markers.length,
    geoJsonFeatures: markers.length,
  };
}

export function buildClueMarkers(adventure, activeIndex = 0) {
  return (adventure?.clues || [])
    .map((clue, index) => {
      const point =
        readLatLng(clue.lat ?? clue.latitude, clue.lng ?? clue.longitude) ||
        readPointFromObject(clue.location) ||
        readPointFromObject(clue.coords);
      if (!point) return null;
      return {
        id: clue.id,
        type: 'clue',
        index: index + 1,
        title: clue.title,
        latitude: point.latitude,
        longitude: point.longitude,
        active: index === activeIndex,
        adventure,
      };
    })
    .filter(Boolean);
}

export function getMapBounds(markers) {
  if (!markers.length) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const m of markers) {
    minLat = Math.min(minLat, m.latitude);
    maxLat = Math.max(maxLat, m.latitude);
    minLng = Math.min(minLng, m.longitude);
    maxLng = Math.max(maxLng, m.longitude);
  }
  return { minLat, maxLat, minLng, maxLng };
}
