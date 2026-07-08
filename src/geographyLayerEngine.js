/**
 * Questory V3 — Geography layer (roads, districts, landmarks fade by zoom)
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { WORLD_CAMERA_ZOOM, resolveWorldScaleLevel } from './worldCameraEngine.js';

export const GEOGRAPHY_FEATURE_TYPES = {
  DISTRICT: 'district',
  LANDMARK: 'landmark',
  PARK: 'park',
  WATER: 'water',
  RAIL: 'rail',
  TRAIL: 'trail',
  BRIDGE: 'bridge',
  SCHOOL: 'school',
  MUSEUM: 'museum',
  HISTORIC: 'historic',
};

const PARSONS_DISTRICTS = [
  {
    id: 'downtown-parsons',
    label: 'Downtown Parsons',
    type: GEOGRAPHY_FEATURE_TYPES.DISTRICT,
    latitude: 37.3395,
    longitude: -95.2605,
    importance: 90,
    minZoom: 10,
    peakZoom: 12.5,
    maxZoom: 14.5,
  },
  {
    id: 'union-depot-district',
    label: 'Union Depot',
    type: GEOGRAPHY_FEATURE_TYPES.DISTRICT,
    latitude: 37.3392,
    longitude: -95.261,
    importance: 85,
    minZoom: 13,
    peakZoom: 15,
    maxZoom: 17,
  },
];

const PARSONS_LANDMARKS = [
  {
    id: 'union-depot',
    label: 'Union Depot',
    type: GEOGRAPHY_FEATURE_TYPES.HISTORIC,
    latitude: 37.3392,
    longitude: -95.261,
    importance: 95,
    minZoom: 14,
    peakZoom: 16,
    maxZoom: 18,
  },
  {
    id: 'lake-parsons',
    label: 'Lake Parsons',
    type: GEOGRAPHY_FEATURE_TYPES.WATER,
    latitude: 37.345,
    longitude: -95.248,
    importance: 70,
    minZoom: 11,
    peakZoom: 13,
    maxZoom: 15,
  },
  {
    id: 'main-street',
    label: 'Main Street',
    type: GEOGRAPHY_FEATURE_TYPES.DISTRICT,
    latitude: 37.3398,
    longitude: -95.2598,
    importance: 75,
    minZoom: 14,
    peakZoom: 15.5,
    maxZoom: 17,
  },
  {
    id: 'rail-corridor',
    label: 'Rail Corridor',
    type: GEOGRAPHY_FEATURE_TYPES.RAIL,
    latitude: 37.3385,
    longitude: -95.262,
    importance: 65,
    minZoom: 12,
    peakZoom: 14,
    maxZoom: 16,
  },
  {
    id: 'city-park',
    label: 'City Park',
    type: GEOGRAPHY_FEATURE_TYPES.PARK,
    latitude: 37.3415,
    longitude: -95.257,
    importance: 60,
    minZoom: 13,
    peakZoom: 15,
    maxZoom: 17,
  },
  {
    id: 'heritage-museum',
    label: 'Heritage Museum',
    type: GEOGRAPHY_FEATURE_TYPES.MUSEUM,
    latitude: 37.3388,
    longitude: -95.259,
    importance: 72,
    minZoom: 14.5,
    peakZoom: 16,
    maxZoom: 18,
  },
  {
    id: 'river-bridge',
    label: 'River Bridge',
    type: GEOGRAPHY_FEATURE_TYPES.BRIDGE,
    latitude: 37.337,
    longitude: -95.254,
    importance: 55,
    minZoom: 13.5,
    peakZoom: 15.5,
    maxZoom: 17,
  },
  {
    id: 'explorer-trail',
    label: 'Explorer Trail',
    type: GEOGRAPHY_FEATURE_TYPES.TRAIL,
    latitude: 37.342,
    longitude: -95.265,
    importance: 50,
    minZoom: 14,
    peakZoom: 16,
    maxZoom: 18,
  },
];

function featureOpacity(zoom, feature) {
  const { minZoom, peakZoom, maxZoom } = feature;
  if (zoom <= minZoom || zoom >= maxZoom) return 0;
  if (zoom === peakZoom) return 1;
  if (zoom < peakZoom) return (zoom - minZoom) / (peakZoom - minZoom);
  return 1 - (zoom - peakZoom) / (maxZoom - peakZoom);
}

function enrichFeature(feature, zoom) {
  const opacity = featureOpacity(zoom, feature) * (feature.importance / 100);
  return {
    ...feature,
    opacity,
    visible: opacity > 0.12,
    showLabel: opacity > 0.45,
  };
}

export function getGeographyLayerSnapshot(options = {}) {
  const { zoom = WORLD_CAMERA_ZOOM.STREET_BLOCKS, cityId = 'parsons-ks' } = options;

  const districts = PARSONS_DISTRICTS.map((f) => enrichFeature(f, zoom));
  const landmarks = PARSONS_LANDMARKS.map((f) => enrichFeature(f, zoom));
  const visible = [...districts, ...landmarks].filter((f) => f.visible);

  return wrapEngineSnapshot({
    cityId,
    zoom,
    scaleLevel: resolveWorldScaleLevel(zoom),
    districts,
    landmarks,
    features: visible,
    roadDensity: zoom >= 14 ? 'high' : zoom >= 12 ? 'medium' : 'low',
    labelCount: visible.filter((f) => f.showLabel).length,
  });
}
