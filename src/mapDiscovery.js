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
  { id: MAP_FILTERS.SPONSOR, label: 'Sponsor', icon: '🍔' },
  { id: MAP_FILTERS.EVENTS, label: 'Events', icon: '🎃' },
  { id: MAP_FILTERS.FRIENDS, label: 'Friends', icon: '👥' },
  { id: MAP_FILTERS.NEAR_ME, label: 'Near Me', icon: '📍' },
];

/** Base adventure type — always wins; never replaced by status overlays. */
export const PIN_BASE_TYPES = {
  horror: {
    id: 'horror',
    icon: '👻',
    color: '#a855f7',
    label: 'Horror',
    glow: 'rgba(168, 85, 247, 0.55)',
  },
  treasure: {
    id: 'treasure',
    icon: '🏴‍☠️',
    color: '#eab308',
    label: 'Treasure',
    glow: 'rgba(234, 179, 8, 0.55)',
  },
  finder: {
    id: 'finder',
    icon: '🧭',
    color: '#06b6d4',
    label: 'Finder Hunt',
    glow: 'rgba(6, 182, 212, 0.5)',
  },
  history: {
    id: 'history',
    icon: '📜',
    color: '#ca8a04',
    label: 'History',
    glow: 'rgba(202, 138, 4, 0.5)',
  },
  landmark: {
    id: 'landmark',
    icon: '🏛',
    color: '#6366f1',
    label: 'Landmark',
    glow: 'rgba(99, 102, 241, 0.5)',
  },
  family: {
    id: 'family',
    icon: '🐉',
    color: '#22c55e',
    label: 'Family',
    glow: 'rgba(34, 197, 94, 0.5)',
  },
  music: {
    id: 'music',
    icon: '🎵',
    color: '#ec4899',
    label: 'Music',
    glow: 'rgba(236, 72, 153, 0.5)',
  },
  sponsor: {
    id: 'sponsor',
    icon: '🍔',
    color: '#f97316',
    label: 'Sponsor',
    glow: 'rgba(249, 115, 22, 0.5)',
  },
  puzzle: {
    id: 'puzzle',
    icon: '🧩',
    color: '#8b5cf6',
    label: 'Puzzle',
    glow: 'rgba(139, 92, 246, 0.5)',
  },
  expedition: {
    id: 'expedition',
    icon: '🧭',
    color: '#0ea5e9',
    label: 'Expedition',
    glow: 'rgba(14, 165, 233, 0.5)',
  },
  secret_drop: {
    id: 'secret_drop',
    icon: '🎁',
    color: '#f472b6',
    label: 'Secret Drop',
    glow: 'rgba(244, 114, 182, 0.5)',
  },
  church: {
    id: 'church',
    icon: '⛪',
    color: '#3b82f6',
    label: 'Church',
    glow: 'rgba(59, 130, 246, 0.5)',
  },
  default: {
    id: 'default',
    icon: '📍',
    color: '#5eead4',
    label: 'Adventure',
    glow: 'rgba(94, 234, 212, 0.45)',
  },
};

/** Status overlays — stack on top of base; never replace the base icon. */
export const PIN_OVERLAY_DEFS = {
  featured: {
    id: 'featured',
    icon: '⭐',
    ring: 'gold',
    animation: 'pulse',
    label: 'Featured',
    priority: 2,
  },
  hot: {
    id: 'hot',
    icon: '🔥',
    ring: 'fire',
    animation: 'shimmer',
    label: 'Hot',
    priority: 3,
  },
  event: {
    id: 'event',
    icon: '🎃',
    ring: 'event',
    animation: 'float',
    label: 'Event',
    priority: 1,
  },
  creator_pick: {
    id: 'creator_pick',
    icon: '👑',
    ring: 'creator',
    animation: 'bounce',
    label: 'Creator Pick',
    priority: 4,
  },
  legendary: {
    id: 'legendary',
    icon: '💎',
    ring: 'legendary',
    animation: 'shimmer',
    label: 'Legendary',
    priority: 0,
  },
  limited_time: {
    id: 'limited_time',
    icon: '⚡',
    ring: 'limited',
    animation: 'pulse',
    label: 'Limited Time',
    priority: 5,
  },
};

/** @deprecated Use PIN_BASE_TYPES — kept for legacy imports */
export const PIN_CATEGORIES = Object.fromEntries(
  Object.entries(PIN_BASE_TYPES).map(([k, v]) => [k, { ...v, animated: false }])
);

const NEAR_ME_RADIUS_M = 8000;

function adventureTemplateId(adventure) {
  return (
    adventure?.adventureTemplate ||
    adventure?.template ||
    adventure?.experienceSettings?.adventureTemplate ||
    ADVENTURE_TEMPLATES.SCRATCH
  );
}

function templateCategory(adventure) {
  const base = resolvePinBaseType(adventure);
  return base.id === 'default' ? 'default' : base.id;
}

export function resolvePinBaseType(adventure) {
  if (!adventure) return PIN_BASE_TYPES.default;

  const t = adventureTemplateId(adventure);
  const scale = adventure?.adventureScale;
  const finderMode = adventure?.finderMode;

  if (adventure?.isSecretDrop || adventure?.bonusFinds?.some((b) => b?.secret)) {
    return PIN_BASE_TYPES.secret_drop;
  }

  if (finderMode === 'finder' || adventure?.claimMethod === 'tap_medallion') {
    return PIN_BASE_TYPES.treasure;
  }

  if (t === ADVENTURE_TEMPLATES.HORROR || adventure?.experienceSettings?.arHorror) {
    return PIN_BASE_TYPES.horror;
  }
  if (t === ADVENTURE_TEMPLATES.FAMILY_FUN || t === ADVENTURE_TEMPLATES.BIRTHDAY) {
    return PIN_BASE_TYPES.family;
  }
  if (t === ADVENTURE_TEMPLATES.EDUCATIONAL) {
    return PIN_BASE_TYPES.history;
  }
  if (t === ADVENTURE_TEMPLATES.MYSTERY) {
    return PIN_BASE_TYPES.puzzle;
  }
  if (t === ADVENTURE_TEMPLATES.CHURCH) {
    return PIN_BASE_TYPES.church;
  }
  if (t === ADVENTURE_TEMPLATES.SPONSOR || adventure?.isSponsoredDrop) {
    return PIN_BASE_TYPES.sponsor;
  }
  if (t === ADVENTURE_TEMPLATES.FITNESS) {
    return PIN_BASE_TYPES.expedition;
  }
  if (t === ADVENTURE_TEMPLATES.DATE_NIGHT) {
    return PIN_BASE_TYPES.music;
  }

  if (scale === 'city' || scale === 'landmark') {
    return PIN_BASE_TYPES.landmark;
  }

  if (finderMode === 'ar_enhanced') {
    return PIN_BASE_TYPES.finder;
  }

  return PIN_BASE_TYPES.default;
}

export function resolvePinOverlays(adventure, state = null) {
  if (!adventure) return [];
  const overlays = [];
  const seen = new Set();

  const add = (key) => {
    const def = PIN_OVERLAY_DEFS[key];
    if (def && !seen.has(key)) {
      seen.add(key);
      overlays.push(def);
    }
  };

  if (adventure?.isLegendaryHunt || adventure?.heatCategory === 'legendary') {
    add('legendary');
  }
  if (hasLiveWorldEvent(adventure, state)) {
    add('event');
  }
  if (
    isFeaturedAdventure(adventure) &&
    !adventure?.isLegendaryHunt &&
    adventure?.heatCategory !== 'legendary'
  ) {
    add('featured');
  }
  if (isCreatorPick(adventure)) {
    add('creator_pick');
  }
  if (adventure?.heatCategory === 'trending' || Number(adventure?.heatScore || 0) >= 50) {
    add('hot');
  }
  if (
    adventure?.limitedTime ||
    adventure?.eventEndsAt ||
    (adventure?.finalRewards || []).some((r) => r?.expirationDays > 0 && r?.quantityLimit)
  ) {
    add('limited_time');
  }

  const heat = Number(adventure?.heatScore || adventure?.playersCompleted || 0);
  if (heat >= 50 && !seen.has('hot')) {
    add('hot');
  }

  return overlays.sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));
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
  return resolvePinBaseType(adventure);
}

export function resolvePinVisual(adventure, state = null) {
  const base = resolvePinBaseType(adventure);
  const overlays = resolvePinOverlays(adventure, state);
  const heat = Number(adventure?.heatScore || adventure?.playersCompleted || 0);
  const heatLevel = heat >= 50 ? 'hot' : heat >= 20 ? 'warm' : 'cool';
  const animations = [
    ...new Set(overlays.map((o) => o.animation).filter(Boolean)),
  ];
  const sponsorBorder = Boolean(
    adventure?.isSponsoredDrop || adventure?.sponsorVerified || base.id === 'sponsor'
  );
  const badgeLabels = [base.label, ...overlays.map((o) => o.label)];

  return {
    base,
    overlays,
    icon: base.icon,
    color: base.color,
    glow: base.glow,
    label: base.label,
    categoryId: base.id,
    badgeLabels,
    heatLevel,
    animated: animations.length > 0,
    animations,
    sponsorBorder,
    overlayIds: overlays.map((o) => o.id),
  };
}

export function renderPinStackHtml(visual) {
  const rings = visual.overlays
    .filter((o) => o.ring)
    .map(
      (o) =>
        `<span class="questory-pin-status-ring pin-ring-${o.ring} pin-ring-${o.id}" aria-hidden="true"></span>`
    )
    .join('');

  const floatOverlays = visual.overlays
    .slice(0, 3)
    .map(
      (o) =>
        `<span class="questory-pin-overlay pin-overlay-${o.id} pin-anim-${o.animation || 'idle'}" aria-hidden="true">${o.icon}</span>`
    )
    .join('');

  return `
    <span class="questory-pin-stack">
      ${rings}
      <span class="questory-pin-icon">${visual.base.icon}</span>
      ${floatOverlays}
    </span>
  `;
}

export function applyPinVisualToElement(el, visual, { selected = false, pinAccess = 'playable' } = {}) {
  if (!el || !visual?.base) return;

  el.className = [
    'questory-pin',
    `pin-base-${visual.base.id}`,
    `pin-access-${pinAccess}`,
    selected ? 'pin-selected' : '',
    visual.sponsorBorder ? 'pin-sponsor-border' : '',
    visual.heatLevel === 'hot' ? 'pin-heat-hot' : '',
    ...visual.animations.map((a) => `pin-anim-${a}`),
    ...visual.overlayIds.map((id) => `pin-has-${id}`),
  ]
    .filter(Boolean)
    .join(' ');

  el.style.setProperty('--pin-color', visual.base.color);
  el.style.setProperty('--pin-glow', visual.base.glow);

  const existingTooltip = el.querySelector('.questory-pin-tooltip');
  const stackHtml = renderPinStackHtml(visual);
  const stack = el.querySelector('.questory-pin-stack');
  if (stack) {
    stack.outerHTML = stackHtml.trim();
  } else {
    el.insertAdjacentHTML('afterbegin', stackHtml.trim());
  }
  if (existingTooltip && !el.contains(existingTooltip)) {
    el.appendChild(existingTooltip);
  }
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
      return ['history', 'landmark', 'puzzle', 'expedition'].includes(template);
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
      const overlayIds = visual.overlayIds || [];
      return {
        type: 'Feature',
        id: m.id,
        geometry: {
          type: 'Point',
          coordinates: [m.longitude, m.latitude],
        },
        properties: {
          id: m.id,
          title: m.title,
          icon: visual.base.icon,
          color: visual.base.color,
          categoryId: visual.base.id,
          categoryLabel: visual.base.label,
          overlayIds: overlayIds.join(','),
          hasEvent: overlayIds.includes('event') ? 1 : 0,
          hasFeatured: overlayIds.includes('featured') || overlayIds.includes('legendary') ? 1 : 0,
          hasLegendary: overlayIds.includes('legendary') ? 1 : 0,
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

export function getPinAccessBadgeLabel(pinAccess) {
  switch (pinAccess) {
    case 'preview':
      return 'Preview';
    case 'virtual':
      return 'Virtual only';
    case 'playable':
      return 'Playable';
    default:
      return 'Adventure';
  }
}

export function buildPinAriaLabel(title) {
  return `Open ${title} map card`;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPinTooltipHtml(markerData, visual) {
  const title = escapeHtml(markerData?.title || visual?.label || 'Adventure');
  const badges = (visual?.badgeLabels || [visual?.label || 'Adventure']).map((l) =>
    escapeHtml(l)
  );
  const accessLabel = escapeHtml(getPinAccessBadgeLabel(markerData?.pinAccess));
  const distance =
    markerData?.distanceM != null
      ? `<span class="questory-pin-tooltip-distance">${formatPinDistanceImperial(markerData.distanceM)}</span>`
      : '';
  const badgeHtml = badges
    .map((b) => `<span class="questory-pin-tooltip-badge">${b}</span>`)
    .join('');
  return `
    <strong class="questory-pin-tooltip-title">${title}</strong>
    <span class="questory-pin-tooltip-meta">
      ${badgeHtml}
      <span class="questory-pin-tooltip-badge pin-access">${accessLabel}</span>
      ${distance}
    </span>
  `;
}

function syncPinTooltip(el, markerData, visual, selected) {
  let tooltip = el.querySelector('.questory-pin-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'questory-pin-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    el.appendChild(tooltip);
  }
  tooltip.innerHTML = buildPinTooltipHtml(markerData, visual);
  if (selected) {
    tooltip.classList.remove('visible');
    tooltip.classList.add('pin-tooltip-selected');
  } else {
    tooltip.classList.remove('pin-tooltip-selected');
  }
}

export function wireAdventurePinElement(
  el,
  { markerData, visual, selected = false, onSelect, onHoverChange } = {}
) {
  if (!el || !markerData) return;

  const title = markerData.title || visual?.label || 'Adventure';
  el.setAttribute('aria-label', buildPinAriaLabel(title));
  el.dataset.adventureId = markerData.id;
  el.classList.toggle('pin-selected', selected);
  applyPinVisualToElement(el, visual, { selected, pinAccess: markerData.pinAccess });
  syncPinTooltip(el, markerData, visual, selected);

  if (el.__pinInteractionsWired) return;
  el.__pinInteractionsWired = true;

  const tooltip = el.querySelector('.questory-pin-tooltip');
  const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const showTooltip = () => {
    if (el.classList.contains('pin-selected')) return;
    tooltip?.classList.add('visible');
    onHoverChange?.(markerData.id);
  };

  const hideTooltip = () => {
    if (el.classList.contains('pin-selected')) return;
    tooltip?.classList.remove('visible');
    onHoverChange?.(null);
  };

  if (canHover) {
    el.addEventListener('mouseenter', showTooltip);
    el.addEventListener('mouseleave', hideTooltip);
  }

  el.addEventListener('focus', showTooltip);
  el.addEventListener('blur', hideTooltip);

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(markerData);
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.(markerData);
    }
  });
}

export function createAdventurePinElement(visual, { selected = false, pinAccess = 'playable' } = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  applyPinVisualToElement(el, visual, { selected, pinAccess });
  return el;
}

export function createClusterElement(meta = {}) {
  const count = meta.count ?? 0;
  const el = document.createElement('button');
  el.type = 'button';
  el.className = [
    'questory-cluster',
    meta.hasLegendary ? 'cluster-legendary' : '',
    meta.hasEvent ? 'cluster-event' : '',
    meta.hasFeatured ? 'cluster-featured' : '',
    count >= 10 ? 'cluster-large' : '',
  ]
    .filter(Boolean)
    .join(' ');
  el.setAttribute('aria-label', `${count} adventures nearby`);
  el.innerHTML = `
    <span class="questory-cluster-glow" aria-hidden="true"></span>
    <span class="questory-cluster-icon">${meta.dominant?.icon || '📍'}</span>
    <span class="questory-cluster-count">${count}</span>
  `;
  return el;
}

export const MAP_SPATIAL_SOURCE_IDS = {
  SPIDER_LINES: 'questory-spider-lines',
  SPIDER_ANCHORS: 'questory-spider-anchors',
};

export const MAP_SOURCE_IDS = {
  ADVENTURES: 'questory-adventures',
  REVEALED: 'questory-revealed',
  ACCURACY: 'questory-accuracy',
  NEAR_ME: 'questory-near-me',
};

export const MAP_LAYER_IDS = {
  CLUSTERS: 'questory-clusters',
  CLUSTER_COUNT: 'questory-cluster-count',
  UNCLUSTERED: 'questory-unclustered-hit',
};

export const NEAR_ME_PULSE_RADIUS_M = 152.4; // ~500 ft
