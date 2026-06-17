import { haversineDistanceMeters } from './geolocation';

export const FINDER_SEARCH_RADIUS_M = 200;
export const FINDER_HOT_ZONE_M = 75;
export const FINDER_CAPTURE_BASE_M = 25;

export function usesFinderGps(adventure) {
  return Boolean(getMedallionLocation(adventure));
}

export function getMedallionLocation(adventure) {
  const clues = adventure?.clues || [];
  const last = clues[clues.length - 1];
  if (last?.latitude == null || last?.longitude == null) return null;
  return {
    latitude: last.latitude,
    longitude: last.longitude,
    radiusMeters: adventure.finderSearchRadiusM ?? FINDER_SEARCH_RADIUS_M,
  };
}

export function getFinderSearchRadius(adventure) {
  return adventure?.finderSearchRadiusM ?? FINDER_SEARCH_RADIUS_M;
}

export function getFinderCaptureBase(adventure) {
  return adventure?.finderCaptureBaseM ?? FINDER_CAPTURE_BASE_M;
}

export function getCaptureRadius(adventure, accuracyM = 0) {
  return getFinderCaptureBase(adventure) + Math.max(0, accuracyM || 0);
}

export function computeSignalStrength(
  distanceM,
  searchRadius = FINDER_SEARCH_RADIUS_M,
  hotZone = FINDER_HOT_ZONE_M
) {
  if (distanceM == null || Number.isNaN(distanceM)) return 0;
  if (distanceM >= searchRadius) return 0;
  if (distanceM <= hotZone) {
    return Math.min(100, Math.round(75 + ((hotZone - distanceM) / hotZone) * 25));
  }
  const span = searchRadius - hotZone;
  if (span <= 0) return 100;
  return Math.round(((searchRadius - distanceM) / span) * 75);
}

export function canUnlockFinderMode(
  distanceM,
  accuracyM,
  override = false,
  searchRadius = FINDER_SEARCH_RADIUS_M
) {
  if (override) return true;
  if (distanceM == null) return false;
  return distanceM <= searchRadius + Math.max(0, (accuracyM || 0) * 0.5);
}

export function canCaptureMedallion(distanceM, accuracyM, override = false, adventure) {
  if (override) return true;
  if (distanceM == null) return false;
  return distanceM <= getCaptureRadius(adventure, accuracyM);
}

export function measureMedallionDistance(adventure, latitude, longitude) {
  const medallion = getMedallionLocation(adventure);
  if (!medallion) return null;
  return haversineDistanceMeters(
    latitude,
    longitude,
    medallion.latitude,
    medallion.longitude
  );
}
