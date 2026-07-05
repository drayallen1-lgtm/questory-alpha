import { env, hasMapboxEnv } from './config/env';
import { buildMapMarkerAccess, evaluateAccessContext } from './accessRules';
import { haversineDistanceMeters } from './geolocation';
import {
  getAdventureMapPoint,
  getAdventureMapCenter,
  adventureHasMapCoordinates,
  readLatLng,
  readPointFromObject,
} from './mapCoordinates';

export { getAdventureMapPoint, getAdventureMapCenter, adventureHasMapCoordinates };

export const MAPBOX_FALLBACK_MESSAGE =
  'Map preview unavailable. Add VITE_MAPBOX_TOKEN to enable live maps.';

export const MAPBOX_WEBGL_FALLBACK_MESSAGE =
  'Live map unavailable. Showing adventure list instead.';

export function getMapboxToken() {
  return env.mapboxToken;
}

export function hasMapboxToken() {
  return hasMapboxEnv();
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
