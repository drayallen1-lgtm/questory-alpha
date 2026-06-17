import { env, hasMapboxEnv } from './config/env';

export const MAPBOX_FALLBACK_MESSAGE =
  'Map preview unavailable. Add VITE_MAPBOX_TOKEN to enable live maps.';

export function getMapboxToken() {
  return env.mapboxToken;
}

export function hasMapboxToken() {
  return hasMapboxEnv();
}

export function getAdventureMapCenter(adventure) {
  const clues = (adventure?.clues || []).filter(
    (c) => c.latitude != null && c.longitude != null
  );
  if (!clues.length) {
    return { latitude: 37.3392, longitude: -95.261 };
  }
  const latitude = clues.reduce((sum, c) => sum + c.latitude, 0) / clues.length;
  const longitude = clues.reduce((sum, c) => sum + c.longitude, 0) / clues.length;
  return { latitude, longitude };
}

export function buildAdventureMarkers(adventures) {
  return adventures
    .filter((a) => a.clues?.length)
    .map((adventure) => {
      const center = getAdventureMapCenter(adventure);
      return {
        id: adventure.id,
        type: 'adventure',
        title: adventure.title,
        subtitle: adventure.location,
        latitude: center.latitude,
        longitude: center.longitude,
        adventure,
      };
    });
}

export function buildClueMarkers(adventure, activeIndex = 0) {
  return (adventure?.clues || [])
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((clue, index) => ({
      id: clue.id,
      type: 'clue',
      index: index + 1,
      title: clue.title,
      latitude: clue.latitude,
      longitude: clue.longitude,
      active: index === activeIndex,
      adventure,
    }));
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
