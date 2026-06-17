export const DEFAULT_RADIUS_METERS = 500;

export const CHECKIN_MESSAGES = {
  checking: 'Checking your location...',
  verified: 'Location verified. Clue unlocked.',
  too_far: "You're too far away. Move closer.",
  denied: 'Location permission denied.',
};

/** Earth-radius Haversine distance in meters. */
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceAway(meters) {
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export function isWithinRadius(userLat, userLon, clue) {
  const radius = clue.radiusMeters ?? DEFAULT_RADIUS_METERS;
  const distance = haversineDistanceMeters(
    userLat,
    userLon,
    clue.latitude,
    clue.longitude
  );
  return { inside: distance <= radius, distance, radius };
}
