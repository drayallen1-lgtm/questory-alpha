import { haversineDistanceMeters } from './geolocation';

export const FINDER_SEARCH_RADIUS_M = 200;
export const FINDER_HOT_ZONE_M = 75;
export const FINDER_CAPTURE_BASE_M = 25;

export const CLAIM_METHOD = {
  SECRET_CODE: 'secret_code',
  TAP_MEDALLION: 'tap_medallion',
  QR_CODE: 'qr_code',
  HYBRID: 'hybrid',
};

export const CLAIM_METHOD_OPTIONS = [
  { value: CLAIM_METHOD.SECRET_CODE, label: 'Secret code', desc: 'Finder → enter claim code' },
  { value: CLAIM_METHOD.TAP_MEDALLION, label: 'Tap virtual medallion', desc: 'Finder → tap to auto-claim' },
  { value: CLAIM_METHOD.QR_CODE, label: 'QR code', desc: 'Finder → scan QR to claim' },
  { value: CLAIM_METHOD.HYBRID, label: 'Hybrid', desc: 'Finder → tap medallion + secret code' },
];

export function normalizeClaimMethod(method) {
  if (Object.values(CLAIM_METHOD).includes(method)) return method;
  return CLAIM_METHOD.SECRET_CODE;
}

export function claimMethodLabel(method) {
  return CLAIM_METHOD_OPTIONS.find((o) => o.value === normalizeClaimMethod(method))?.label || 'Secret code';
}

export function usesFinderMode(adventure) {
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

/** Signal strength 0–100; ramps from search edge (200m) to hot zone (75m). */
export function computeSignalStrength(distanceM, searchRadius = FINDER_SEARCH_RADIUS_M, hotZone = FINDER_HOT_ZONE_M) {
  if (distanceM == null || Number.isNaN(distanceM)) return 0;
  if (distanceM >= searchRadius) return 0;
  if (distanceM <= hotZone) {
    return Math.min(100, Math.round(75 + ((hotZone - distanceM) / hotZone) * 25));
  }
  const span = searchRadius - hotZone;
  if (span <= 0) return 100;
  return Math.round(((searchRadius - distanceM) / span) * 75);
}

export function canUnlockFinderMode(distanceM, accuracyM, override = false, searchRadius = FINDER_SEARCH_RADIUS_M) {
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

export function requiresSecretCodeAfterTap(adventure) {
  const method = normalizeClaimMethod(adventure.claimMethod);
  return method === CLAIM_METHOD.SECRET_CODE || method === CLAIM_METHOD.HYBRID;
}

export function requiresQrAfterTap(adventure) {
  return normalizeClaimMethod(adventure.claimMethod) === CLAIM_METHOD.QR_CODE;
}

export function autoClaimsOnTap(adventure) {
  return normalizeClaimMethod(adventure.claimMethod) === CLAIM_METHOD.TAP_MEDALLION;
}

export function validateClaimAttempt(adventure, progress, { code = '', qrVerified = false, medallionTapped = false } = {}) {
  const tapped = medallionTapped || progress.medallionTapped;
  const method = normalizeClaimMethod(adventure.claimMethod);
  if (!tapped && usesFinderMode(adventure)) {
    return { ok: false, message: 'Find and tap the virtual medallion first.' };
  }
  if (method === CLAIM_METHOD.TAP_MEDALLION) {
    return { ok: true, code: adventure.claimCode };
  }
  if (method === CLAIM_METHOD.QR_CODE) {
    const expected = (adventure.qrClaimValue || adventure.claimCode || '').toUpperCase();
    const scanned = (code || '').trim().toUpperCase();
    if (!qrVerified && scanned !== expected) {
      return { ok: false, message: 'Invalid QR code. Scan the trail QR to claim.' };
    }
    return { ok: true, code: adventure.claimCode };
  }
  const entered = (code || '').trim().toUpperCase();
  if (entered !== adventure.claimCode) {
    return { ok: false, message: 'Wrong code. Try again.' };
  }
  return { ok: true, code: adventure.claimCode };
}
