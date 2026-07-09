/** Selectors for map UI that must not trigger background dismiss. */
export const MAP_INTERACTIVE_CLICK_SELECTORS = [
  '.questory-cluster',
  '.questory-pin',
  '.map-marker',
  '.questory-marker',
  '.blossom-pin',
  '.blossom-category',
  '.blossom-overflow',
  '.living-cluster-blossom',
  '.map-pin-card',
  '.questory-map-card',
  '.cluster-adventure-picker',
  '.map-market-venue',
  '.market-venue-card',
  '.fallback-marker',
  '.mapboxgl-marker',
  '.mapboxgl-ctrl',
  '.map-find-me-btn',
  '.world-radial-menu',
  'button',
  'a',
  '[role="dialog"]',
].join(',');

/**
 * Returns true when the event target is inside map chrome (pins, cards, controls).
 * @param {EventTarget | null | undefined} target
 */
export function isMapInteractiveClickTarget(target) {
  if (!target || typeof target !== 'object' || !('closest' in target)) return false;
  return Boolean(target.closest(MAP_INTERACTIVE_CLICK_SELECTORS));
}

/**
 * Builds marker payload for adventure card open from map interaction.
 * @param {object} adventure
 * @param {object | null | undefined} marker
 */
export function resolveAdventureMarkerPayload(adventure, marker) {
  if (!adventure?.id) return null;
  return marker || { adventure, id: adventure.id };
}
