/**
 * Questory V3 — Living Atlas world camera
 * Open close on the player; remember position; smooth fly-to.
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

/** ~6–10 city blocks — streets, buildings, intersections */
export const WORLD_CAMERA_ZOOM = {
  BUILDING: 16,
  STREET_BLOCKS: 15,
  STREET: 14,
  NEIGHBORHOOD: 12,
  DISTRICT: 10,
  CITY: 8,
  REGION: 6,
  STATE: 4,
  COUNTRY: 2,
  PLANET: 1,
};

export const DOWNTOWN_PARSONS = {
  latitude: 37.3392,
  longitude: -95.261,
  label: 'Downtown Parsons',
};

export const DEFAULT_WORLD_CAMERA = {
  latitude: DOWNTOWN_PARSONS.latitude,
  longitude: DOWNTOWN_PARSONS.longitude,
  zoom: WORLD_CAMERA_ZOOM.STREET_BLOCKS,
  bearing: 0,
  pitch: 0,
  lastSavedAt: null,
};

export const FLY_DURATION_MS = 1400;

/** Smooth ease-out — no snap */
export function worldCameraEase(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * (2 - clamped);
}

export function normalizeWorldCamera(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_WORLD_CAMERA };
  const zoom = Number(raw.zoom);
  return {
    latitude: Number(raw.latitude) || DEFAULT_WORLD_CAMERA.latitude,
    longitude: Number(raw.longitude) || DEFAULT_WORLD_CAMERA.longitude,
    zoom:
      Number.isFinite(zoom) && zoom >= 1 && zoom <= 20
        ? zoom
        : DEFAULT_WORLD_CAMERA.zoom,
    bearing: Number(raw.bearing) || 0,
    pitch: Number(raw.pitch) || 0,
    lastSavedAt: raw.lastSavedAt || null,
  };
}

function findAdventureAnchor(adventures = [], state = null) {
  const id = state?.selectedAdventureId;
  const picked = id ? adventures.find((a) => a.id === id) : null;
  const withCoords =
    picked ||
    adventures.find((a) => a.latitude != null && a.longitude != null) ||
    null;
  if (!withCoords) return null;
  return {
    latitude: withCoords.latitude,
    longitude: withCoords.longitude,
    label: withCoords.title || 'Adventure',
  };
}

/**
 * Priority: remembered camera → player location → adventure start → downtown.
 * Always opens at street-block zoom (never zoomed way out).
 */
export function resolveInitialCamera(options = {}) {
  const {
    userLocation = null,
    state = null,
    adventures = [],
    remembered = null,
  } = options;

  const rememberedCam = normalizeWorldCamera(remembered);
  if (remembered?.lastSavedAt && rememberedCam.zoom >= WORLD_CAMERA_ZOOM.NEIGHBORHOOD) {
    return wrapEngineSnapshot({
      ...rememberedCam,
      source: 'remembered',
      flyDurationMs: FLY_DURATION_MS,
    });
  }

  if (userLocation?.latitude != null && userLocation?.longitude != null) {
    return wrapEngineSnapshot({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      zoom: WORLD_CAMERA_ZOOM.STREET_BLOCKS,
      bearing: 0,
      pitch: 0,
      source: 'player',
      flyDurationMs: FLY_DURATION_MS,
    });
  }

  const adventure = findAdventureAnchor(adventures, state);
  if (adventure) {
    return wrapEngineSnapshot({
      latitude: adventure.latitude,
      longitude: adventure.longitude,
      zoom: WORLD_CAMERA_ZOOM.STREET_BLOCKS,
      bearing: 0,
      pitch: 0,
      source: 'adventure',
      label: adventure.label,
      flyDurationMs: FLY_DURATION_MS,
    });
  }

  return wrapEngineSnapshot({
    ...DOWNTOWN_PARSONS,
    zoom: WORLD_CAMERA_ZOOM.STREET_BLOCKS,
    bearing: 0,
    pitch: 0,
    source: 'downtown',
    flyDurationMs: FLY_DURATION_MS,
  });
}

export function buildCameraRememberPatch(camera = {}) {
  const normalized = normalizeWorldCamera(camera);
  return {
    ...normalized,
    lastSavedAt: new Date().toISOString(),
  };
}

export function buildFlyToOptions(target = {}, options = {}) {
  const latitude = target.latitude ?? DOWNTOWN_PARSONS.latitude;
  const longitude = target.longitude ?? DOWNTOWN_PARSONS.longitude;
  const zoom = target.zoom ?? WORLD_CAMERA_ZOOM.STREET_BLOCKS;
  return {
    center: [longitude, latitude],
    zoom,
    bearing: target.bearing ?? 0,
    pitch: target.pitch ?? 0,
    duration: options.durationMs ?? FLY_DURATION_MS,
    easing: worldCameraEase,
    essential: true,
  };
}

export function resolveWorldScaleLevel(zoom = 11) {
  if (zoom >= WORLD_CAMERA_ZOOM.BUILDING) return 'building';
  if (zoom >= WORLD_CAMERA_ZOOM.STREET) return 'street';
  if (zoom >= WORLD_CAMERA_ZOOM.NEIGHBORHOOD) return 'neighborhood';
  if (zoom >= WORLD_CAMERA_ZOOM.DISTRICT) return 'district';
  if (zoom >= WORLD_CAMERA_ZOOM.CITY) return 'city';
  if (zoom >= WORLD_CAMERA_ZOOM.REGION) return 'region';
  if (zoom >= WORLD_CAMERA_ZOOM.STATE) return 'state';
  if (zoom >= WORLD_CAMERA_ZOOM.COUNTRY) return 'country';
  return 'planet';
}
