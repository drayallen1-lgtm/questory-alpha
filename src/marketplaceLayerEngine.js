/**
 * Questory V2 — Marketplace Layer (world-object venues on the map)
 */
import { getMarketplaceSnapshot, MARKET_VENUES } from './marketplaceEngine';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const MARKETPLACE_TAB_IDS = {
  FEATURED: 'featured',
  TRENDING: 'trending',
  NEWEST: 'newest',
  CREATOR: 'creator',
  AUCTIONS: 'auctions',
  TRADES: 'trades',
  WISHLIST: 'wishlist',
  LISTINGS: 'listings',
  PURCHASES: 'purchases',
  SALES: 'sales',
  HISTORY: 'history',
};

export const MARKETPLACE_TAB_ORDER = Object.values(MARKETPLACE_TAB_IDS);

export const VENUE_KIND_TABS = {
  market: MARKETPLACE_TAB_IDS.FEATURED,
  creator: MARKETPLACE_TAB_IDS.CREATOR,
  auction: MARKETPLACE_TAB_IDS.AUCTIONS,
  merchant: MARKETPLACE_TAB_IDS.TRENDING,
  event: MARKETPLACE_TAB_IDS.FEATURED,
  season: MARKETPLACE_TAB_IDS.FEATURED,
};

const PRIMARY_VENUE_IDS = [
  'downtown-market',
  'creator-bazaar',
  'legendary-auction',
  'traveling-merchant',
];

export function resolveMarketplaceVenue(venueId, state = null) {
  const raw = venueId || state?.marketplaceVenueId;
  if (!raw) return null;
  return MARKET_VENUES.find((venue) => venue.id === raw) || null;
}

export function resolveMarketplaceTab(tab, state = null, options = {}) {
  if (tab && MARKETPLACE_TAB_ORDER.includes(tab)) return tab;

  const venue =
    options.venue ||
    resolveMarketplaceVenue(options.venueId, state) ||
    resolveMarketplaceVenue(state?.marketplaceVenueId, state);

  const venueId = options.venueId ?? state?.marketplaceVenueId ?? null;
  if (venueId && venue?.kind && VENUE_KIND_TABS[venue.kind]) {
    return VENUE_KIND_TABS[venue.kind];
  }

  const stateTab = state?.marketplaceTab;
  if (stateTab && MARKETPLACE_TAB_ORDER.includes(stateTab)) return stateTab;

  if (venue?.kind && VENUE_KIND_TABS[venue.kind]) {
    return VENUE_KIND_TABS[venue.kind];
  }

  return MARKETPLACE_TAB_IDS.FEATURED;
}

function pickVenueItems(venue, marketplace = {}) {
  const listings = marketplace.listings || [];
  const auctions = marketplace.auctions || [];
  const creatorStore = marketplace.creatorStoreListings || [];
  const trending = marketplace.trending || [];

  switch (venue.kind) {
    case 'creator':
      return creatorStore.slice(0, 4).map((item) => ({
        id: item.id,
        icon: item.icon,
        label: item.name,
        detail: `${item.priceCoins?.toLocaleString?.() || item.priceCoins} 🪙`,
      }));
    case 'auction':
      return auctions.slice(0, 4).map((item) => ({
        id: item.id,
        icon: item.icon,
        label: item.name,
        detail: item.endingSoon ? 'Ending soon' : `${item.currentBid?.toLocaleString?.() || item.currentBid} 🪙`,
      }));
    case 'merchant':
      return (trending.length ? trending : listings).slice(0, 4).map((item) => ({
        id: item.id || item.itemId,
        icon: item.icon,
        label: item.name,
        detail: 'Traveling stock',
      }));
    default:
      return (marketplace.featured || listings).slice(0, 4).map((item) => ({
        id: item.id,
        icon: item.icon,
        label: item.name,
        detail: `${item.priceCoins?.toLocaleString?.() || item.priceCoins} 🪙`,
      }));
  }
}

export function buildVenueCard(venue, marketplace = {}) {
  if (!venue) return null;

  const listings = marketplace.listings || [];
  const auctions = marketplace.auctions || [];
  const creatorStore = marketplace.creatorStoreListings || [];

  let liveCount = listings.length;
  let status = 'Open now';

  if (venue.kind === 'creator') {
    liveCount = creatorStore.length;
    status = 'Creator drops live';
  } else if (venue.kind === 'auction') {
    liveCount = auctions.length;
    status = auctions.some((a) => a.endingSoon) ? 'Bids closing soon' : 'Auction floor open';
  } else if (venue.kind === 'merchant') {
    liveCount = Math.max(3, Math.min(8, listings.length));
    status = 'Passing through downtown';
  } else if (venue.kind === 'event') {
    status = 'Weekend market active';
  } else if (venue.kind === 'season') {
    status = 'Season rewards available';
  }

  return {
    ...venue,
    tab: VENUE_KIND_TABS[venue.kind] || MARKETPLACE_TAB_IDS.FEATURED,
    liveCount,
    status,
    items: pickVenueItems(venue, marketplace),
    ctaLabel: venue.kind === 'auction' ? 'Enter Auction' : 'Browse Market',
  };
}

export function buildMarketVenueOverlays(marketplace = {}, options = {}) {
  const venueIds = options.primaryOnly ? PRIMARY_VENUE_IDS : MARKET_VENUES.map((v) => v.id);
  return venueIds
    .map((id) => MARKET_VENUES.find((venue) => venue.id === id))
    .filter(Boolean)
    .map((venue) => buildVenueCard(venue, marketplace));
}

export function getMarketplaceLayerSnapshot(state, adventures = [], options = {}) {
  const marketplace = options.marketplace || getMarketplaceSnapshot(state, adventures, options);
  const venues = buildMarketVenueOverlays(marketplace, options);
  const selectedVenueId = options.venueId ?? state?.marketplaceVenueId ?? null;
  const selectedVenue =
    venues.find((venue) => venue.id === selectedVenueId) ||
    buildVenueCard(resolveMarketplaceVenue(selectedVenueId, state), marketplace);

  return wrapEngineSnapshot({
    venues,
    venueCount: venues.length,
    primaryVenueCount: PRIMARY_VENUE_IDS.length,
    selectedVenueId: selectedVenue?.id || null,
    selectedVenue,
    tab: resolveMarketplaceTab(options.tab, state, {
      venueId: selectedVenueId,
      venue: selectedVenue,
    }),
    marketplace,
  });
}
