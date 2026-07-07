/**
 * Questory V2 — Progressive World Layers
 * Zoom-aware layer visibility so the living world reveals itself gradually.
 */
import { zoomToDiscoveryLevel, DISCOVERY_LEVELS } from './worldDiscoveryEngine';
import { isEarthOverlayVisible, isFullEarthView } from './livingEarthEngine';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const WORLD_LAYER_IDS = {
  MAP: 'map',
  CITIES: 'cities',
  DISCOVERY: 'discovery',
  EXPLORER: 'explorer',
  MARKETPLACE: 'marketplace',
  GUILD: 'guild',
  NPC: 'npc',
  EARTH: 'earth',
};

/** Layer index for sorting / HUD priority */
export const WORLD_LAYER_ORDER = [
  WORLD_LAYER_IDS.MAP,
  WORLD_LAYER_IDS.CITIES,
  WORLD_LAYER_IDS.DISCOVERY,
  WORLD_LAYER_IDS.EXPLORER,
  WORLD_LAYER_IDS.MARKETPLACE,
  WORLD_LAYER_IDS.GUILD,
  WORLD_LAYER_IDS.NPC,
  WORLD_LAYER_IDS.EARTH,
];

/**
 * Street-level layers — strongest when zoomed in.
 */
export function streetLayerOpacity(zoom, { minZoom, enter, full }) {
  if (zoom >= full) return 1;
  if (zoom <= minZoom) return 0;
  if (zoom < enter) return ((zoom - minZoom) / (enter - minZoom)) * 0.4;
  return 0.4 + 0.6 * ((zoom - enter) / (full - enter));
}

/**
 * Regional layers — strongest at county/state zoom, fade at street and globe.
 */
export function regionalLayerOpacity(zoom, { minZoom, peak, maxZoom }) {
  if (zoom <= minZoom || zoom >= maxZoom) return 0;
  if (zoom === peak) return 1;
  if (zoom < peak) return (zoom - minZoom) / (peak - minZoom);
  return 1 - (zoom - peak) / (maxZoom - peak);
}

/**
 * Trapezoid opacity: ramps up enter→full, holds full→exit, ramps down exit→leave.
 * @param {number} zoom
 * @param {{ enter: number, full: number, exit: number, leave: number }} range
 */
export function trapezoidLayerOpacity(zoom, { enter, full, exit, leave }) {
  if (zoom <= enter || zoom >= leave) return 0;
  if (zoom >= full && zoom <= exit) return 1;
  if (zoom < full) return (zoom - enter) / (full - enter);
  return 1 - (zoom - exit) / (leave - exit);
}

/**
 * Earth layer — strongest when zoomed out (inverse of street-level layers).
 */
export function earthLayerOpacity(zoom, { earthOverlayVisible = false, fullEarth = false } = {}) {
  if (fullEarth) return 1;
  if (earthOverlayVisible) {
    return Math.max(0.55, regionalLayerOpacity(zoom, { minZoom: 0.5, peak: 2, maxZoom: 5 }));
  }
  return regionalLayerOpacity(zoom, { minZoom: 1.5, peak: 2.5, maxZoom: 7 });
}

const LAYER_RULES = {
  [WORLD_LAYER_IDS.MAP]: 'always',
  [WORLD_LAYER_IDS.CITIES]: { kind: 'street', minZoom: 4.5, enter: 8, full: 10 },
  [WORLD_LAYER_IDS.DISCOVERY]: { kind: 'street', minZoom: 5, enter: 8.5, full: 10.5 },
  [WORLD_LAYER_IDS.EXPLORER]: { kind: 'street', minZoom: 5.5, enter: 9, full: 11 },
  [WORLD_LAYER_IDS.MARKETPLACE]: { kind: 'street', minZoom: 5.5, enter: 9, full: 11 },
  [WORLD_LAYER_IDS.GUILD]: { kind: 'regional', minZoom: 2.5, peak: 6.5, maxZoom: 11 },
  [WORLD_LAYER_IDS.NPC]: { kind: 'regional', minZoom: 3, peak: 7.5, maxZoom: 12 },
};

export function computeLayerMeta(zoom, layerId, earthOptions = {}) {
  if (layerId === WORLD_LAYER_IDS.MAP) {
    return { index: 0, opacity: 1, visible: true, label: 'Map' };
  }

  if (layerId === WORLD_LAYER_IDS.EARTH) {
    const opacity = earthLayerOpacity(zoom, earthOptions);
    return {
      index: 7,
      opacity,
      visible: opacity > 0.08,
      label: 'Living Earth',
    };
  }

  const rule = LAYER_RULES[layerId];
  let opacity = 0;
  if (rule?.kind === 'street') {
    opacity = streetLayerOpacity(zoom, rule);
  } else if (rule?.kind === 'regional') {
    opacity = regionalLayerOpacity(zoom, rule);
  }

  const labels = {
    [WORLD_LAYER_IDS.CITIES]: 'Cities & markers',
    [WORLD_LAYER_IDS.DISCOVERY]: 'Discovery',
    [WORLD_LAYER_IDS.EXPLORER]: 'Explorer activity',
    [WORLD_LAYER_IDS.MARKETPLACE]: 'Marketplace',
    [WORLD_LAYER_IDS.GUILD]: 'Guild wars',
    [WORLD_LAYER_IDS.NPC]: 'NPC activity',
  };

  return {
    index: WORLD_LAYER_ORDER.indexOf(layerId),
    opacity,
    visible: opacity > 0.08,
    label: labels[layerId] || layerId,
  };
}

export function buildProgressiveLayerClassName(layers) {
  return WORLD_LAYER_ORDER.filter((id) => layers[id]?.visible)
    .map((id) => `world-layer-${id}-on`)
    .join(' ');
}

export function buildProgressiveLayerStyle(layers) {
  const style = {};
  for (const id of WORLD_LAYER_ORDER) {
    const key = `--world-layer-${id}-opacity`;
    style[key] = String(layers[id]?.opacity ?? 0);
  }
  return style;
}

export function resolveDominantLayer(layers) {
  let best = WORLD_LAYER_IDS.MAP;
  let bestOpacity = layers.map?.opacity ?? 1;
  for (const id of WORLD_LAYER_ORDER) {
    if (id === WORLD_LAYER_IDS.MAP) continue;
    const opacity = layers[id]?.opacity ?? 0;
    if (opacity > bestOpacity) {
      bestOpacity = opacity;
      best = id;
    }
  }
  return best;
}

/**
 * @param {object} options
 * @param {number} [options.zoom=11]
 * @param {boolean} [options.earthOverlayVisible]
 * @param {boolean} [options.fullEarth]
 * @param {boolean} [options.shellMode]
 */
export function getProgressiveLayerSnapshot(options = {}) {
  const zoom = options.zoom ?? 11;
  const earthOptions = {
    earthOverlayVisible: options.earthOverlayVisible ?? isEarthOverlayVisible(zoom),
    fullEarth: options.fullEarth ?? isFullEarthView(zoom),
  };
  const level = zoomToDiscoveryLevel(zoom);

  const layers = {};
  for (const id of WORLD_LAYER_ORDER) {
    layers[id] = computeLayerMeta(zoom, id, earthOptions);
  }

  const dominantLayer = resolveDominantLayer(layers);
  const streetLevel =
    level === DISCOVERY_LEVELS.NEIGHBORHOOD || level === DISCOVERY_LEVELS.CITY;
  const regionalLevel =
    level === DISCOVERY_LEVELS.COUNTY ||
    level === DISCOVERY_LEVELS.STATE ||
    level === DISCOVERY_LEVELS.COUNTRY;
  const globalLevel =
    level === DISCOVERY_LEVELS.CONTINENT || level === DISCOVERY_LEVELS.WORLD;

  const hudCards = {
    explorer: layers.explorer.visible,
    guild: layers.guild.visible,
    creator: layers.cities.visible || streetLevel,
    sponsor: layers.marketplace.visible && streetLevel,
    marketplace: layers.marketplace.visible,
    liveHunt: layers.discovery.visible,
    earth: layers.earth.visible || globalLevel,
    notifications: layers.explorer.visible || layers.discovery.visible,
  };

  return wrapEngineSnapshot({
    zoom,
    level,
    layers,
    dominantLayer,
    streetLevel,
    regionalLevel,
    globalLevel,
    hudCards,
    className: buildProgressiveLayerClassName(layers),
    style: buildProgressiveLayerStyle(layers),
    earthOverlayVisible: earthOptions.earthOverlayVisible,
    fullEarth: earthOptions.fullEarth,
  });
}
