/**
 * Safe UI sound hooks for map discovery bloom.
 * No-op by default — wire via window.__questoryMapUiCue when audio is ready.
 */
export const MAP_UI_CUE_EVENTS = [
  'clusterOpen',
  'categorySelect',
  'adventureSelect',
  'cardOpen',
];

export function playMapUiCue(event) {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.__questoryMapUiCue === 'function') {
      window.__questoryMapUiCue(event);
    }
  } catch {
    /* muted / unavailable */
  }
}

export const DISCOVERY_BLOOM_TIMING = {
  CLUSTER_BRIGHTEN: 0,
  CLUSTER_SCALE_UP: 80,
  CLUSTER_COLLAPSE: 160,
  BLOSSOM_ENTER: 220,
  CATEGORY_STAGGER_MS: 45,
  ADVENTURE_STAGGER_MS: 35,
  CATEGORY_SELECT_MS: 180,
  PIN_SIBLINGS_DIM: 80,
  PIN_RIPPLE: 160,
  CARD_OPEN: 240,
};
