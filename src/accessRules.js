/**
 * Map + Access Rules — adventure access types, play radius, and remote reward policy.
 */
import { haversineDistanceMeters } from './geolocation';
import { getAdventureMapCenter, getAdventureMapPoint } from './mapUtils';
import { ADVENTURE_STATUS, getPublishedAdventures } from './seed';

export const ACCESS_TYPES = {
  LOCAL: 'local',
  REMOTE: 'remote',
  DEMO: 'demo',
  PRIVATE: 'private',
  SPONSOR: 'sponsor',
  HYBRID: 'hybrid',
};

export const ACCESS_TYPE_OPTIONS = [
  {
    value: ACCESS_TYPES.LOCAL,
    label: 'Local Only',
    icon: '📍',
    desc: 'Players must be on-site to play and claim all rewards.',
  },
  {
    value: ACCESS_TYPES.REMOTE,
    label: 'Remote Playable',
    icon: '🌐',
    desc: 'Play from anywhere — virtual badges and coins only when remote.',
  },
  {
    value: ACCESS_TYPES.HYBRID,
    label: 'Hybrid',
    icon: '🔀',
    desc: 'Full rewards on-site; remote players preview and earn virtual only.',
  },
  {
    value: ACCESS_TYPES.SPONSOR,
    label: 'Sponsor Verified',
    icon: '🏪',
    desc: 'Sponsor coupons and physical drops require being at the location.',
  },
  {
    value: ACCESS_TYPES.DEMO,
    label: 'Demo',
    icon: '🎮',
    desc: 'Open preview trail — virtual rewards only, no physical claims.',
  },
  {
    value: ACCESS_TYPES.PRIVATE,
    label: 'Private',
    icon: '🔒',
    desc: 'Hidden from public map and feed — invite or admin only.',
  },
];

export const PHYSICAL_REWARD_TYPES = new Set(['physical', 'coupon']);

export function normalizeAccessType(value) {
  const v = String(value || '').toLowerCase();
  if (Object.values(ACCESS_TYPES).includes(v)) return v;
  if (value === 'local_only') return ACCESS_TYPES.LOCAL;
  return ACCESS_TYPES.LOCAL;
}

export function accessTypeLabel(type) {
  return ACCESS_TYPE_OPTIONS.find((o) => o.value === normalizeAccessType(type))?.label || 'Local Only';
}

export function accessTypeIcon(type) {
  return ACCESS_TYPE_OPTIONS.find((o) => o.value === normalizeAccessType(type))?.icon || '📍';
}

export function adventureHasMapLocation(adventure) {
  return getAdventureMapPoint(adventure) != null;
}

export function getPlayRadiusM(adventure) {
  const custom = Number(adventure?.playRadiusM);
  if (Number.isFinite(custom) && custom > 0) return custom;
  const search = Number(adventure?.finderSearchRadiusM);
  if (Number.isFinite(search) && search > 0) return search;
  const clues = adventure?.clues || [];
  const maxClueRadius = clues.reduce((m, c) => Math.max(m, Number(c.radiusMeters) || 0), 0);
  return Math.max(maxClueRadius, 5000);
}

export function measureDistanceToAdventure(adventure, latitude, longitude) {
  if (latitude == null || longitude == null || !adventureHasMapLocation(adventure)) {
    return null;
  }
  const center = getAdventureMapCenter(adventure);
  return haversineDistanceMeters(latitude, longitude, center.latitude, center.longitude);
}

/**
 * @returns {{
 *   accessType: string,
 *   mode: 'play'|'preview'|'hidden',
 *   canPlayFull: boolean,
 *   canPreview: boolean,
 *   canClaimPhysical: boolean,
 *   canClaimVirtual: boolean,
 *   remoteOnlyRewards: boolean,
 *   showOnMap: boolean,
 *   distanceM: number|null,
 *   playRadiusM: number,
 *   tooFar: boolean,
 *   message: string|null,
 *   ctaLabel: string,
 * }}
 */
export function evaluateAccessContext(adventure, options = {}) {
  const {
    userLatitude = null,
    userLongitude = null,
    adminPreview = false,
    previewMode = false,
    isAdmin = false,
    userId = null,
  } = options;

  const accessType = normalizeAccessType(
    adventure?.isDemoAdventure ? ACCESS_TYPES.DEMO : adventure?.accessType
  );
  const playRadiusM = getPlayRadiusM(adventure);
  const distanceM = measureDistanceToAdventure(adventure, userLatitude, userLongitude);
  const hasLocation = userLatitude != null && userLongitude != null;
  const onsite = hasLocation && distanceM != null && distanceM <= playRadiusM;
  const tooFar = hasLocation && distanceM != null && distanceM > playRadiusM;
  const showOnMap = shouldShowOnMap(adventure, { isAdmin, userId });

  const base = {
    accessType,
    distanceM,
    playRadiusM,
    showOnMap,
    label: accessTypeLabel(accessType),
    icon: accessTypeIcon(accessType),
  };

  if (!showOnMap && !adminPreview && !isAdmin) {
    return {
      ...base,
      mode: 'hidden',
      canPlayFull: false,
      canPreview: false,
      canClaimPhysical: false,
      canClaimVirtual: false,
      remoteOnlyRewards: true,
      tooFar: false,
      message: 'This adventure is private.',
      ctaLabel: 'Private Adventure',
    };
  }

  if (adminPreview || isAdmin) {
    return {
      ...base,
      mode: 'play',
      canPlayFull: true,
      canPreview: true,
      canClaimPhysical: true,
      canClaimVirtual: true,
      remoteOnlyRewards: false,
      tooFar: false,
      message: null,
      ctaLabel: 'Start Adventure',
    };
  }

  if (accessType === ACCESS_TYPES.DEMO) {
    return {
      ...base,
      mode: 'play',
      canPlayFull: true,
      canPreview: true,
      canClaimPhysical: false,
      canClaimVirtual: true,
      remoteOnlyRewards: true,
      tooFar: false,
      message: 'Demo mode — virtual badges and coins only.',
      ctaLabel: 'Try Demo',
    };
  }

  if (accessType === ACCESS_TYPES.REMOTE) {
    return {
      ...base,
      mode: 'play',
      canPlayFull: true,
      canPreview: true,
      canClaimPhysical: onsite,
      canClaimVirtual: true,
      remoteOnlyRewards: !onsite,
      tooFar: false,
      message: onsite
        ? null
        : 'Remote play — virtual badges and coins only. Visit on-site for sponsor rewards.',
      ctaLabel: 'Start Adventure',
    };
  }

  if (accessType === ACCESS_TYPES.PRIVATE) {
    const isCreator = userId && (adventure.creatorId === userId || adventure.creatorProfileId === userId);
    if (!isCreator) {
      return {
        ...base,
        mode: 'hidden',
        canPlayFull: false,
        canPreview: false,
        canClaimPhysical: false,
        canClaimVirtual: false,
        remoteOnlyRewards: true,
        tooFar: false,
        message: 'Private adventure — invitation required.',
        ctaLabel: 'Private',
      };
    }
  }

  if (accessType === ACCESS_TYPES.LOCAL || accessType === ACCESS_TYPES.SPONSOR) {
    if (previewMode) {
      return {
        ...base,
        mode: 'preview',
        canPlayFull: false,
        canPreview: true,
        canClaimPhysical: false,
        canClaimVirtual: true,
        remoteOnlyRewards: true,
        tooFar: true,
        message: 'Preview mode — virtual badges and coins only.',
        ctaLabel: 'Continue Preview',
      };
    }

    if (onsite) {
      return {
        ...base,
        mode: 'play',
        canPlayFull: true,
        canPreview: true,
        canClaimPhysical: true,
        canClaimVirtual: true,
        remoteOnlyRewards: false,
        tooFar: false,
        message:
          accessType === ACCESS_TYPES.SPONSOR
            ? 'On-site verified — sponsor rewards available.'
            : null,
        ctaLabel: 'Start Adventure',
      };
    }

    if (!hasLocation) {
      return {
        ...base,
        mode: 'preview',
        canPlayFull: false,
        canPreview: true,
        canClaimPhysical: false,
        canClaimVirtual: true,
        remoteOnlyRewards: true,
        tooFar: false,
        message: 'Enable location to check if you are close enough to play.',
        ctaLabel: 'Preview Adventure',
      };
    }

    return {
      ...base,
      mode: 'preview',
      canPlayFull: false,
      canPreview: true,
      canClaimPhysical: false,
      canClaimVirtual: true,
      remoteOnlyRewards: true,
      tooFar: true,
      message: 'Too far to play — Preview instead.',
      ctaLabel: 'Preview Adventure',
    };
  }

  // HYBRID (default fallback)
  if (onsite) {
    return {
      ...base,
      mode: 'play',
      canPlayFull: true,
      canPreview: true,
      canClaimPhysical: true,
      canClaimVirtual: true,
      remoteOnlyRewards: false,
      tooFar: false,
      message: null,
      ctaLabel: 'Start Adventure',
    };
  }

  if (previewMode) {
    return {
      ...base,
      mode: 'preview',
      canPlayFull: false,
      canPreview: true,
      canClaimPhysical: false,
      canClaimVirtual: true,
      remoteOnlyRewards: true,
      tooFar: true,
      message: 'Preview mode — virtual badges and coins only.',
      ctaLabel: 'Continue Preview',
    };
  }

  return {
    ...base,
    mode: tooFar ? 'preview' : 'play',
    canPlayFull: !tooFar,
    canPreview: true,
    canClaimPhysical: onsite,
    canClaimVirtual: true,
    remoteOnlyRewards: tooFar || !hasLocation,
    tooFar: Boolean(tooFar),
    message: tooFar ? 'Too far to play — Preview instead.' : null,
    ctaLabel: tooFar ? 'Preview Adventure' : 'Start Adventure',
  };
}

export function shouldShowOnMap(adventure, { isAdmin = false, userId = null } = {}) {
  if (!adventure) return false;
  if (!adventureHasMapLocation(adventure)) return false;
  if (adventure.status !== ADVENTURE_STATUS.PUBLISHED && !isAdmin) return false;

  const accessType = normalizeAccessType(
    adventure?.isDemoAdventure ? ACCESS_TYPES.DEMO : adventure?.accessType
  );

  if (accessType === ACCESS_TYPES.PRIVATE) {
    return (
      isAdmin ||
      (userId &&
        (adventure.creatorId === userId || adventure.creatorProfileId === userId))
    );
  }

  return true;
}

export function getDiscoverableAdventures(adventures, options = {}) {
  const { isAdmin = false, userId = null } = options;
  return getPublishedAdventures(adventures).filter((adventure) => {
    const accessType = normalizeAccessType(adventure.accessType);
    if (accessType === ACCESS_TYPES.PRIVATE) {
      return (
        isAdmin ||
        (userId &&
          (adventure.creatorId === userId || adventure.creatorProfileId === userId))
      );
    }
    return true;
  });
}

export function getMapVisibleAdventures(adventures, options = {}) {
  return getDiscoverableAdventures(adventures, options).filter((adventure) =>
    shouldShowOnMap(adventure, options)
  );
}

export function filterRewardsForAccess(rewards, accessContext) {
  if (!accessContext?.remoteOnlyRewards) return rewards || [];
  return (rewards || []).filter((r) => !PHYSICAL_REWARD_TYPES.has(r.type));
}

export function buildMapMarkerAccess(adventure, accessContext) {
  if (!accessContext) return 'unknown';
  if (accessContext.mode === 'hidden') return 'hidden';
  if (accessContext.canPlayFull && !accessContext.remoteOnlyRewards) return 'playable';
  if (accessContext.tooFar) return 'preview';
  if (accessContext.remoteOnlyRewards) return 'virtual';
  return 'playable';
}
