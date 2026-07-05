/**
 * Pure adventure coordinate helpers — breaks accessRules ↔ mapUtils circular import.
 */

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

function pointToLatLng(point) {
  if (!point) return null;
  if (Array.isArray(point) && point.length >= 2) {
    return readLatLng(point[1], point[0]);
  }
  return point;
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

export { readLatLng, readPointFromObject };
