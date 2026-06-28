/**
 * Map Polish & Discovery — pin categories, filters, clustering helpers, fog-of-war.
 */
import { ADVENTURE_TEMPLATES } from './templates';
import { haversineDistanceMeters } from './geolocation';
import { getAdventureMapCenter } from './mapUtils';
import { safeGetWorldEventContext } from './worldEventEngine';

export const MAP_FILTERS = {
  ALL: 'all',
  HORROR: 'horror',
  FAMILY: 'family',
  HISTORY: 'history',
  CHURCH: 'church',
  SPONSOR: 'sponsor',
  EVENTS: 'events',
  FRIENDS: 'friends',
  NEAR_ME: 'near_me',
};

export const MAP_FILTER_OPTIONS = [
  { id: MAP_FILTERS.ALL, label: 'All', icon: '🗺️' },
  { id: MAP_FILTERS.HORROR, label: 'Horror', icon: '👻' },
  { id: MAP_FILTERS.FAMILY, label: 'Family', icon: '👨‍👩‍👧' },
  { id: MAP_FILTERS.HISTORY, label: 'History', icon: '📜' },
  { id: MAP_FILTERS.CHURCH, label: 'Church', icon: '⛪' },
  { id: MAP_FILTERS.SPONSOR, label: 'Sponsor', icon: '🏪' },
  { id: MAP_FILTERS.EVENTS, label: 'Events', icon: '🎃' },
  { id: MAP_FILTERS.FRIENDS, label: 'Friends', icon: '👥' },
  { id: MAP_FILTERS.NEAR_ME, label: 'Near Me', icon: '📍' },
];

export const PIN_CATEGORIES = {
  horror: { id: 'horror', icon: '👻', color: '#a855f7', label: 'Horror', glow: 'rgba(168,85,247,0.55)' },
  family: { id: 'family', icon: '👨‍👩‍👧', color: '#22c55e', label: 'Family', glow: 'rgba(34,197,94,0.5)' },
  history: { id: 'history', icon: '📜', color: '#eab308', label: 'History', glow: 'rgba(234,179,8,0.5)' },
  church: { id: 'church', icon: '⛪', color: '#3b82f6', label: 'Church', glow: 'rgba(59,130,246,0.5)' },
  sponsor: { id: 'sponsor', icon: '🏪', color: '#f97316', label: 'Sponsor', glow: 'rgba(249,115,22,0.5)' },
  live_event: { id: 'live_event', icon: '🎃', color: '#ef4444', label: 'Live Event', glow: 'rgba(239,68,68,0.6)', animated: true },
  featured: { id: 'featured', icon: '⭐', color: '#fbbf24', label: 'Featured', glow: 'rgba(251,191,36,0.55)', animated: true },
  creator_pick: { id: 'creator_pick', icon: '👑', color: '#f472b6', label: 'Creator Pick', glow: 'rgba(244,114,182,0.5)' },
  default: { id: 'default', icon: '📍', color: '#5eead4', label: 'Adventure', glow: 'rgba(94,234,212,0.45)' },
};

const NEAR_ME_RADIUS_M = 8000;

function templateCategory(adventure) {
  const t =
    adventure?.adventureTemplate ||
    adventure?.template ||
    adventure?.experienceSettings?.adventureTemplate ||
    ADVENTURE_TEMPLATES.SCRATCH;

  if (t === ADVENTURE_TEMPLATES.HORROR || adventure?.experienceSettings?.arHorror) return 'horror';
  if (t === ADVENTURE_TEMPLATES.FAMILY_FUN || t === ADVENTURE_TEMPLATES.BIRTHDAY) return 'family';
  if (t === ADVENTURE_TEMPLATES.EDUCATIONAL || t === ADVENTURE_TEMPLATES.MYSTERY) return 'history';
  if (t === ADVENTURE_TEMPLATES.CHURCH) return 'church';
  if (t === ADVENTURE_TEMPLATES.SPONSOR || adventure?.isSponsoredDrop) return 'sponsor';
  return 'default';
}

export function hasLiveWorldEvent(adventure, state = null) {
  const tags = adventure?.worldConfig?.worldEventTags || [];
  if (tags.length) return true;
  if (adventure?._worldEvent?.primaryEventTitle) return true;
  if (state) {
    const ctx = safeGetWorldEventContext(state, [adventure]);
    if (ctx?.primaryEvent && adventureSupportsEvent(adventure, ctx)) return true;
  }
  return false;
}

function adventureSupportsEvent(adventure, context) {
  const events = context?.activeEvents || (context?.primaryEvent ? [context.primaryEvent] : []);
  if (!events.length) return false;
  const tags = adventure?.worldConfig?.worldEventTags || [];
  if (!tags.length) return true;
  return events.some((e) => tags.includes(e.id) || tags.includes(e.type));
}

export function isFeaturedAdventure(adventure) {
  return Boolean(
    adventure?.isLegendaryHunt ||
    adventure?.isFounderHunt ||
    adventure?.heatCategory === 'legendary' ||
    adventure?.heatCategory === 'trending'
  );
}

export function isCreatorPick(adventure) {
  return Boolean(adventure?.isFounderHunt || adventure?.creatorProfileId === 'parsons-heritage');
}

export function resolvePinCategory(adventure, state = null) {
  if (hasLiveWorldEvent(adventure, state)) return PIN_CATEGORIES.live_event;
  if (isFeaturedAdventure(adventure)) return PIN_CATEGORIES.featured;
  if (isCreatorPick(adventure)) return PIN_CATEGORIES.creator_pick;
  const cat = templateCategory(adventure);
  return PIN_CATEGORIES[cat] || PIN_CATEGORIES.default;
}

export function resolvePinVisual(adventure, state = null) {
  const category = resolvePinCategory(adventure, state);
  const heat = Number(adventure?.heatScore || adventure?.playersCompleted || 0);
  const heatLevel = heat >= 50 ? 'hot' : heat >= 20 ? 'warm' : 'cool';
  return {
    ...category,
    categoryId: category.id,
    heatLevel,
    animated: Boolean(category.animated || heatLevel === 'hot'),
  };
}

export function formatPinDistance(meters) {
  if (meters == null) return null;
  if (meters < 1609) return `${(meters / 1609).toFixed(1)} mi`.replace('0.', '.').replace(/^(\d)\./, '$1.');
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1609).toFixed(1)} mi`;
}

export function formatPinDistanceImperial(meters) {
  if (meters == null) return '—';
  const feet = meters * 3.28084;
  if (feet < 5280) return `${Math.round(feet)} ft`;
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

export function getMarkerDistance(adventure, userLat, userLng) {
  if (userLat == null || userLng == null) return null;
  const center = getAdventureMapCenter(adventure);
  return haversineDistanceMeters(userLat, userLng, center.latitude, center.longitude);
}

export function adventureMatchesFilter(adventure, filterId, { state, userLat, userLng, follows = [] } = {}) {
  if (!filterId || filterId === MAP_FILTERS.ALL) return true;

  const template = templateCategory(adventure);

  switch (filterId) {
    case MAP_FILTERS.HORROR:
      return template === 'horror';
    case MAP_FILTERS.FAMILY:
      return template === 'family';
    case MAP_FILTERS.HISTORY:
      return template === 'history';
    case MAP_FILTERS.CHURCH:
      return template === 'church';
    case MAP_FILTERS.SPONSOR:
      return template === 'sponsor' || adventure?.isSponsoredDrop || adventure?.sponsorVerified;
    case MAP_FILTERS.EVENTS:
      return hasLiveWorldEvent(adventure, state);
    case MAP_FILTERS.FRIENDS: {
      const creatorId = adventure?.creatorProfileId || adventure?.creatorId;
      return creatorId && follows.includes(creatorId);
    }
    case MAP_FILTERS.NEAR_ME: {
      const dist = getMarkerDistance(adventure, userLat, userLng);
      return dist != null && dist <= NEAR_ME_RADIUS_M;
    }
    default:
      return true;
  }
}

export function filterMapAdventures(adventures, filterId, options = {}) {
  return adventures.filter((a) => adventureMatchesFilter(a, filterId, options));
}

export function markersToGeoJSON(markers, state = null) {
  return {
    type: 'FeatureCollection',
    features: markers.map((m) => {
      const visual = resolvePinVisual(m.adventure, state);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [m.longitude, m.latitude],
        },
        properties: {
          id: m.id,
          title: m.title,
          icon: visual.icon,
          color: visual.color,
          categoryId: visual.categoryId,
          categoryLabel: visual.label,
          animated: visual.animated ? 1 : 0,
          heatLevel: visual.heatLevel,
          pinAccess: m.pinAccess || 'playable',
          distanceM: m.distanceM ?? -1,
        },
      };
    }),
  };
}

/** Approximate circle polygon for accuracy / discovery rings (meters). */
export function circlePolygon(lat, lng, radiusM, points = 64) {
  const coords = [];
  const earth = 6371000;
  const latRad = (lat * Math.PI) / 180;
  for (let i = 0; i <= points; i += 1) {
    const bearing = (i / points) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(radiusM / earth) +
        Math.cos(latRad) * Math.sin(radiusM / earth) * Math.cos(bearing)
    );
    const lng2 =
      (lng * Math.PI) / 180 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(radiusM / earth) * Math.cos(latRad),
        Math.cos(radiusM / earth) - Math.sin(latRad) * Math.sin(lat2)
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}

export function getDefaultMapExploration() {
  return { revealed: [] };
}

export function normalizeMapExploration(raw) {
  if (!raw || typeof raw !== 'object') return getDefaultMapExploration();
  return {
    revealed: Array.isArray(raw.revealed) ? raw.revealed : [],
  };
}

export function recordMapReveal(state, adventure) {
  if (!adventure) return state;
  const center = getAdventureMapCenter(adventure);
  const exploration = normalizeMapExploration(state.mapExploration);
  const key = `${center.latitude.toFixed(3)},${center.longitude.toFixed(3)}`;
  if (exploration.revealed.some((r) => r.key === key)) return state;
  const radiusM = Number(adventure.finderSearchRadiusM) || 500;
  return {
    ...state,
    mapExploration: {
      ...exploration,
      revealed: [
        ...exploration.revealed,
        {
          key,
          latitude: center.latitude,
          longitude: center.longitude,
          radiusM,
          adventureId: adventure.id,
          revealedAt: new Date().toISOString(),
        },
      ],
    },
  };
}

export function revealedAreasGeoJSON(exploration) {
  const revealed = normalizeMapExploration(exploration).revealed;
  return {
    type: 'FeatureCollection',
    features: revealed.map((r, i) => ({
      type: 'Feature',
      id: i,
      geometry: circlePolygon(r.latitude, r.longitude, r.radiusM || 400),
      properties: { adventureId: r.adventureId },
    })),
  };
}

export function createAdventurePinElement(visual, { selected = false, pinAccess = 'playable' } = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = [
    'questory-pin',
    `pin-cat-${visual.categoryId}`,
    `pin-access-${pinAccess}`,
    visual.animated ? 'pin-animated' : '',
    selected ? 'pin-selected' : '',
    visual.heatLevel === 'hot' ? 'pin-hot' : '',
  ]
    .filter(Boolean)
    .join(' ');
  el.style.setProperty('--pin-color', visual.color);
  el.style.setProperty('--pin-glow', visual.glow);
  el.setAttribute('aria-label', visual.label);
  el.innerHTML = `<span class="questory-pin-icon">${visual.icon}</span><span class="questory-pin-ring"></span>`;
  return el;
}

export function createClusterElement(count) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'questory-cluster';
  el.innerHTML = `<span class="questory-cluster-count">${count}</span>`;
  return el;
}

export const MAP_SOURCE_IDS = {
  ADVENTURES: 'questory-adventures',
  REVEALED: 'questory-revealed',
  ACCURACY: 'questory-accuracy',
  NEAR_ME: 'questory-near-me',
};

export const NEAR_ME_PULSE_RADIUS_M = 152.4; // ~500 ft
