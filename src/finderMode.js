import { haversineDistanceMeters } from './geolocation';

export const FINDER_SEARCH_RADIUS_M = 200;
export const FINDER_HOT_ZONE_M = 75;
export const FINDER_CAPTURE_BASE_M = 25;

export const FINDER_PHASE = {
  NO_MEDALLION: 'no_medallion',
  LOCATING: 'locating',
  GPS_ERROR: 'gps_error',
  OUTSIDE_SEARCH: 'outside_search',
  SEARCH_ACTIVE: 'search_active',
  CAPTURE_READY: 'capture_ready',
  CAPTURED: 'captured',
};

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
  const value = Number(adventure?.finderSearchRadiusM);
  return Number.isFinite(value) && value > 0 ? value : FINDER_SEARCH_RADIUS_M;
}

export function getFinderCaptureBase(adventure) {
  const value = Number(adventure?.finderCaptureBaseM);
  return Number.isFinite(value) && value > 0 ? value : FINDER_CAPTURE_BASE_M;
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

/**
 * Single source of truth for Finder Mode UI phase.
 * Prevents contradictory banner / excitement / hint copy.
 */
export function resolveFinderPhase({
  medallion,
  distance,
  gpsError,
  locating,
  inSearchArea,
  inCaptureRange,
  medallionTapped,
}) {
  if (!medallion) return FINDER_PHASE.NO_MEDALLION;
  if (medallionTapped) return FINDER_PHASE.CAPTURED;
  if (gpsError) return FINDER_PHASE.GPS_ERROR;
  if (locating || distance == null) return FINDER_PHASE.LOCATING;
  if (inCaptureRange) return FINDER_PHASE.CAPTURE_READY;
  if (inSearchArea) return FINDER_PHASE.SEARCH_ACTIVE;
  return FINDER_PHASE.OUTSIDE_SEARCH;
}

export function getFinderPhaseUI(phase, ctx = {}) {
  const {
    distance,
    captureRadius,
    searchRadius,
    physical = false,
    capturing = false,
    gpsError = '',
  } = ctx;

  const distanceLabel =
    distance != null ? formatDistanceLabel(distance) : 'Locating…';

  switch (phase) {
    case FINDER_PHASE.NO_MEDALLION:
      return {
        banner: 'Finder unavailable',
        excitement: { label: 'GPS required', className: '' },
        body: 'Add GPS coordinates to the final clue to enable Finder Mode.',
        hint: null,
        showMoveCloser: false,
        signalPercent: 0,
      };
    case FINDER_PHASE.CAPTURED:
      return {
        banner: 'Signal captured',
        excitement: { label: 'Medallion secured', className: 'hot' },
        body: physical
          ? 'Search this zone for the hidden physical medallion.'
          : 'Return to the trail to claim your treasure.',
        hint: null,
        showMoveCloser: false,
        signalPercent: 100,
      };
    case FINDER_PHASE.GPS_ERROR:
      return {
        banner: 'Finder Mode · GPS needed',
        excitement: { label: 'Location unavailable', className: '' },
        body: gpsError || 'Enable location services to track the medallion signal.',
        hint: null,
        showMoveCloser: false,
        signalPercent: 0,
      };
    case FINDER_PHASE.LOCATING:
      return {
        banner: 'Finder Mode · Locating…',
        excitement: { label: 'Getting your position…', className: '' },
        body: 'Hold steady while GPS locks onto your location.',
        hint: null,
        showMoveCloser: false,
        signalPercent: 0,
      };
    case FINDER_PHASE.OUTSIDE_SEARCH:
      return {
        banner: 'Finder Mode · Move closer',
        excitement: { label: 'Signal out of range', className: '' },
        body: `Move within ${searchRadius} m of the medallion to activate the signal.`,
        hint: distance != null ? `${distanceLabel} away` : null,
        showMoveCloser: true,
        signalPercent: 0,
      };
    case FINDER_PHASE.SEARCH_ACTIVE:
      return {
        banner: 'Finder Mode · Signal active',
        excitement: {
          label: `Move within ~${Math.round(captureRadius)} m to capture`,
          className: 'warm',
        },
        body: physical
          ? 'Signal active. Close in to mark the search zone.'
          : 'Signal active. Close in to tap the virtual medallion.',
        hint: `${distanceLabel} · capture ~${Math.round(captureRadius)} m`,
        showMoveCloser: false,
        signalPercent: ctx.signal ?? 0,
      };
    case FINDER_PHASE.CAPTURE_READY:
      return {
        banner: 'Finder Mode · Capture ready',
        excitement: { label: 'Capture range!', className: 'hot' },
        body: capturing
          ? 'Capturing medallion…'
          : physical
            ? 'Signal peak reached. Tap to mark this search zone.'
            : 'You are in capture range. Tap the medallion to secure it.',
        hint: `${distanceLabel} · ±${Math.round(ctx.accuracy ?? 0)} m GPS`,
        showMoveCloser: false,
        signalPercent: ctx.signal ?? 100,
      };
    default:
      return {
        banner: 'Finder Mode',
        excitement: { label: 'Searching…', className: '' },
        body: '',
        hint: null,
        showMoveCloser: false,
        signalPercent: 0,
      };
  }
}

function formatDistanceLabel(distanceM) {
  if (distanceM < 1) return `${Math.round(distanceM * 100) / 100} m`;
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}
