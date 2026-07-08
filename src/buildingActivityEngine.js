/**
 * Questory V3 — Building activity (lanterns, pulses, quest anchors on structures)
 */
import { MARKET_VENUES } from './marketplaceEngine';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { WORLD_CAMERA_ZOOM } from './worldCameraEngine.js';

export const BUILDING_ROLES = {
  MERCHANT: 'merchant',
  MUSEUM: 'museum',
  LIBRARY: 'library',
  HAUNTED: 'haunted',
  GUILD_HQ: 'guild',
  SPONSOR: 'sponsor',
  MARKET: 'market',
  AUCTION: 'auction',
  CREATOR: 'creator',
  COFFEE: 'coffee',
  CHURCH: 'church',
  QUEST: 'quest',
};

export const BUILDING_ANIMATIONS = {
  LANTERN: 'lantern',
  PULSE: 'pulse',
  SPARKLE: 'sparkle',
  FLICKER: 'flicker',
  BANNER: 'banner',
  SHIMMER: 'shimmer',
  BEACON: 'beacon',
  NEON: 'neon',
  GLOW: 'glow',
};

const STATIC_BUILDINGS = [
  {
    id: 'main-street-roasters',
    label: 'Main Street Roasters',
    role: BUILDING_ROLES.COFFEE,
    animation: BUILDING_ANIMATIONS.GLOW,
    latitude: 37.3396,
    longitude: -95.2595,
    importance: 70,
  },
  {
    id: 'heritage-museum-bldg',
    label: 'Heritage Museum',
    role: BUILDING_ROLES.MUSEUM,
    animation: BUILDING_ANIMATIONS.PULSE,
    latitude: 37.3388,
    longitude: -95.259,
    importance: 75,
  },
  {
    id: 'parsons-library',
    label: 'Parsons Library',
    role: BUILDING_ROLES.LIBRARY,
    animation: BUILDING_ANIMATIONS.SPARKLE,
    latitude: 37.3402,
    longitude: -95.2585,
    importance: 65,
  },
  {
    id: 'union-depot-haunt',
    label: 'Union Depot',
    role: BUILDING_ROLES.HAUNTED,
    animation: BUILDING_ANIMATIONS.FLICKER,
    latitude: 37.3392,
    longitude: -95.261,
    importance: 88,
  },
  {
    id: 'guild-hall',
    label: 'Guild Hall',
    role: BUILDING_ROLES.GUILD_HQ,
    animation: BUILDING_ANIMATIONS.BANNER,
    latitude: 37.3382,
    longitude: -95.2625,
    importance: 80,
  },
];

const VENUE_ROLE_MAP = {
  market: BUILDING_ROLES.MARKET,
  creator: BUILDING_ROLES.CREATOR,
  auction: BUILDING_ROLES.AUCTION,
  merchant: BUILDING_ROLES.MERCHANT,
  event: BUILDING_ROLES.SPONSOR,
  season: BUILDING_ROLES.MERCHANT,
};

const VENUE_ANIMATION_MAP = {
  market: BUILDING_ANIMATIONS.LANTERN,
  creator: BUILDING_ANIMATIONS.NEON,
  auction: BUILDING_ANIMATIONS.BEACON,
  merchant: BUILDING_ANIMATIONS.LANTERN,
  event: BUILDING_ANIMATIONS.SHIMMER,
  season: BUILDING_ANIMATIONS.SHIMMER,
};

function venueToBuilding(venue, marketplace = {}) {
  const hot = venue.hot || venue.liveCount >= 6;
  return {
    id: `venue-${venue.id}`,
    label: venue.label,
    role: VENUE_ROLE_MAP[venue.kind] || BUILDING_ROLES.MARKET,
    animation: VENUE_ANIMATION_MAP[venue.kind] || BUILDING_ANIMATIONS.LANTERN,
    latitude: venue.latitude,
    longitude: venue.longitude,
    importance: hot ? 90 : 70,
    intensity: Math.min(1, (venue.liveCount || 0) / 10),
    venueId: venue.id,
    hot,
    boosted: venue.boosted,
  };
}

function adventureToBuilding(adventure) {
  return {
    id: `quest-${adventure.id}`,
    label: adventure.title,
    role: BUILDING_ROLES.QUEST,
    animation: BUILDING_ANIMATIONS.GLOW,
    latitude: adventure.latitude,
    longitude: adventure.longitude,
    importance: adventure.isLegendaryHunt ? 95 : 78,
    intensity: adventure.isLegendaryHunt ? 1 : 0.65,
    adventureId: adventure.id,
    anchor: true,
  };
}

export function getBuildingActivitySnapshot(options = {}) {
  const {
    zoom = WORLD_CAMERA_ZOOM.STREET_BLOCKS,
    adventures = [],
    marketplace = {},
    faction = {},
    legendaryHunt = {},
    venues = [],
  } = options;

  const streetVisible = zoom >= WORLD_CAMERA_ZOOM.STREET;
  const buildingVisible = zoom >= WORLD_CAMERA_ZOOM.STREET_BLOCKS - 0.5;

  const venueBuildings = (venues.length ? venues : MARKET_VENUES).map((v) =>
    venueToBuilding(v, marketplace)
  );

  const questBuildings = adventures
    .filter((a) => a.latitude != null && a.longitude != null)
    .slice(0, 12)
    .map(adventureToBuilding);

  const staticBuildings = STATIC_BUILDINGS.map((b) => ({
    ...b,
    intensity:
      b.role === BUILDING_ROLES.GUILD_HQ && (faction.contestedCount || 0) > 0
        ? 1
        : b.role === BUILDING_ROLES.HAUNTED && legendaryHunt.hasActiveBoss
          ? 0.95
          : 0.5,
  }));

  const buildings = [...staticBuildings, ...venueBuildings, ...questBuildings]
    .filter((b) => b.latitude != null)
    .map((b) => ({
      ...b,
      className: `world-building--${b.role} world-building-anim--${b.animation}`,
      visible: buildingVisible,
      showLabel: zoom >= WORLD_CAMERA_ZOOM.STREET_BLOCKS && b.importance >= 70,
    }));

  return wrapEngineSnapshot({
    zoom,
    streetVisible,
    buildingVisible,
    buildings: buildings.filter((b) => b.visible),
    activeCount: buildings.filter((b) => b.intensity >= 0.7).length,
    className: buildings
      .filter((b) => b.intensity >= 0.8)
      .map((b) => b.className)
      .join(' '),
  });
}
