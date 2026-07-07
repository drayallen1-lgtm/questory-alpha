/**
 * Questory 2.0 — Phase 13: Global Marketplace & Trading Network
 * Listings, trades, auctions, inventory, dynamic pricing — extends explorer/creator/crafting economy.
 */
import { getExplorerEconomySnapshot } from './explorerEconomyEngine';
import { getCraftingSnapshot } from './craftingEngine';
import { getCreatorEconomySnapshot, STORE_CATALOG } from './creatorEconomyEngine';
import { getCurrentSeason } from './seasonEngine';
import { safeGetTime } from './dateUtils';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { getTerritoryModifierForVenue } from './factionEngine.js';
import { buildMarketplaceWalletFields } from './paymentEngine.js';

export const MARKETPLACE_LIMITS = {
  MAX_LISTINGS: 40,
  MAX_OFFERS: 30,
  MAX_AUCTIONS: 12,
  MAX_HISTORY: 50,
  MAX_TIMELINE: 14,
  MAX_WISHLIST: 30,
};

export const INVENTORY_CATEGORIES = {
  ARTIFACT: 'artifact',
  RELIC: 'relic',
  BOSS_LOOT: 'boss_loot',
  MATERIAL: 'material',
  MAP: 'map',
  KEY: 'key',
  LEGENDARY: 'legendary',
  CREATOR_COLLECTIBLE: 'creator_collectible',
  SEASON_REWARD: 'season_reward',
  AR_COLLECTIBLE: 'ar_collectible',
  STORE_PURCHASE: 'store_purchase',
  ADVENTURE_REWARD: 'adventure_reward',
};

export const RARITY_TIERS = {
  common: { id: 'common', label: 'Common', multiplier: 1 },
  uncommon: { id: 'uncommon', label: 'Uncommon', multiplier: 1.4 },
  rare: { id: 'rare', label: 'Rare', multiplier: 2.2 },
  epic: { id: 'epic', label: 'Epic', multiplier: 3.5 },
  legendary: { id: 'legendary', label: 'Legendary', multiplier: 6 },
};

export const MARKET_VENUES = [
  { id: 'downtown-market', label: 'Downtown Market', icon: '🏪', latitude: 37.3392, longitude: -95.261, kind: 'market' },
  { id: 'creator-bazaar', label: 'Creator Bazaar', icon: '✨', latitude: 37.341, longitude: -95.255, kind: 'creator' },
  { id: 'legendary-auction', label: 'Legendary Auction', icon: '🏛️', latitude: 37.3375, longitude: -95.268, kind: 'auction' },
  { id: 'traveling-merchant', label: 'Traveling Merchant', icon: '🛒', latitude: 37.335, longitude: -95.25, kind: 'merchant' },
  { id: 'weekend-market', label: 'Weekend Market', icon: '🎪', latitude: 37.342, longitude: -95.265, kind: 'event' },
  { id: 'season-vendor', label: 'Season Vendor', icon: '🏔️', latitude: 37.338, longitude: -95.258, kind: 'season' },
];

/** Intentional Phase 13+ future hooks — exported for marketplace integrations. */
export const MARKET_EXTENSION_HOOKS = {
  stripeCheckout: { enabled: false, label: 'Stripe Checkout' },
  stripeConnect: { enabled: false, label: 'Stripe Connect payouts' },
  taxes: { enabled: false, label: 'Tax calculation' },
  shipping: { enabled: false, label: 'Physical shipping' },
  merchandise: { enabled: false, label: 'Real merchandise' },
  realWorldRewards: { enabled: false, label: 'Real-world reward redemption' },
  partnerStores: { enabled: false, label: 'Partner store integrations' },
  creatorPayouts: { enabled: false, label: 'Creator marketplace payouts' },
  brandCampaigns: { enabled: true, label: 'Brand campaigns (simulated)' },
  regionalMarkets: { enabled: false, label: 'Regional marketplaces' },
};

const SEED_CATALOG = [
  { itemId: 'black-lantern-relic', name: 'Black Lantern Relic', icon: '🏮', category: INVENTORY_CATEGORIES.LEGENDARY, rarity: 'legendary', baseSupply: 12, baseDemand: 88 },
  { itemId: 'ancient-compass', name: 'Ancient Compass', icon: '🧭', category: INVENTORY_CATEGORIES.ARTIFACT, rarity: 'epic', baseSupply: 24, baseDemand: 72 },
  { itemId: 'crystal-shard', name: 'Crystal Shard', icon: '💎', category: INVENTORY_CATEGORIES.MATERIAL, rarity: 'rare', baseSupply: 120, baseDemand: 65 },
  { itemId: 'iron-conductor-loot', name: 'Iron Conductor Loot', icon: '🚂', category: INVENTORY_CATEGORIES.BOSS_LOOT, rarity: 'epic', baseSupply: 18, baseDemand: 91 },
  { itemId: 'fog-lens', name: 'Fog Lens', icon: '🔍', category: INVENTORY_CATEGORIES.ARTIFACT, rarity: 'rare', baseSupply: 45, baseDemand: 58 },
  { itemId: 'parsons-map-fragment', name: 'Parsons Map Fragment', icon: '🗺️', category: INVENTORY_CATEGORIES.MAP, rarity: 'uncommon', baseSupply: 80, baseDemand: 44 },
  { itemId: 'ancient-key-vault', name: 'Ancient Vault Key', icon: '🗝️', category: INVENTORY_CATEGORIES.KEY, rarity: 'rare', baseSupply: 35, baseDemand: 62 },
  { itemId: 'horror-collection', name: 'Horror Collection', icon: '👻', category: INVENTORY_CATEGORIES.CREATOR_COLLECTIBLE, rarity: 'epic', baseSupply: 30, baseDemand: 76, creatorId: 'horror-crest' },
  { itemId: 'founder-season-medal', name: 'Founder Season Medal', icon: '🏔️', category: INVENTORY_CATEGORIES.SEASON_REWARD, rarity: 'legendary', baseSupply: 8, baseDemand: 95 },
  { itemId: 'ar-lantern-scene', name: 'AR Lantern Scene', icon: '📱', category: INVENTORY_CATEGORIES.AR_COLLECTIBLE, rarity: 'rare', baseSupply: 40, baseDemand: 55 },
];

export const DEFAULT_MARKETPLACE = {
  listings: [],
  offers: [],
  trades: [],
  auctions: [],
  wishlist: [],
  purchases: [],
  sales: [],
  history: [],
  gifts: [],
  tradeReputation: 50,
  ownedItems: [],
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function normalizeMarketplace(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_MARKETPLACE };
  return {
    listings: Array.isArray(raw.listings) ? raw.listings.slice(0, MARKETPLACE_LIMITS.MAX_LISTINGS) : [],
    offers: Array.isArray(raw.offers) ? raw.offers.slice(0, MARKETPLACE_LIMITS.MAX_OFFERS) : [],
    trades: Array.isArray(raw.trades) ? raw.trades.slice(0, 20) : [],
    auctions: Array.isArray(raw.auctions) ? raw.auctions.slice(0, MARKETPLACE_LIMITS.MAX_AUCTIONS) : [],
    wishlist: Array.isArray(raw.wishlist) ? raw.wishlist.slice(0, MARKETPLACE_LIMITS.MAX_WISHLIST) : [],
    purchases: Array.isArray(raw.purchases) ? raw.purchases.slice(0, 40) : [],
    sales: Array.isArray(raw.sales) ? raw.sales.slice(0, 40) : [],
    history: Array.isArray(raw.history) ? raw.history.slice(0, MARKETPLACE_LIMITS.MAX_HISTORY) : [],
    gifts: Array.isArray(raw.gifts) ? raw.gifts.slice(0, 20) : [],
    tradeReputation: Math.min(100, Math.max(0, Number(raw.tradeReputation) || 50)),
    ownedItems: Array.isArray(raw.ownedItems) ? raw.ownedItems.slice(0, 60) : [],
  };
}

function computeDynamicPrice(item, context = {}) {
  const rarity = RARITY_TIERS[item.rarity] || RARITY_TIERS.common;
  const supply = item.supply ?? item.baseSupply ?? 50;
  const demand = item.demand ?? item.baseDemand ?? 50;
  const scarcity = Math.max(0.5, demand / Math.max(1, supply));
  const seasonBoost = context.seasonActive ? 1.08 : 1;
  const bossBoost = item.category === INVENTORY_CATEGORIES.BOSS_LOOT ? 1.15 : 1;
  const creatorBoost = item.creatorId ? 1 + (context.creatorPopularity || 0) * 0.1 : 1;
  const discoveryBoost = 1 + (context.globalDiscoveryPct || 0) * 0.002;
  const base = 80 + hashSeed(item.itemId) % 400;
  const price = Math.round(base * rarity.multiplier * scarcity * seasonBoost * bossBoost * creatorBoost * discoveryBoost);
  const lastSale = context.lastSalePrices?.[item.itemId];
  return {
    marketValue: price,
    lastSaleValue: lastSale ?? Math.round(price * 0.92),
    supply,
    demand,
    scarcity: Math.round(scarcity * 100),
    trending: demand >= 80 && supply <= 30,
  };
}

function buildPlayerInventory(state, adventures = []) {
  const explorer = getExplorerEconomySnapshot(state, adventures);
  const crafting = getCraftingSnapshot(state, adventures);
  const creator = getCreatorEconomySnapshot(state, adventures);
  const stored = normalizeMarketplace(state?.marketplace);
  const items = [];

  const push = (item) => {
    if (!items.some((i) => i.instanceId === item.instanceId)) items.push(item);
  };

  explorer.relicInventory.forEach((r, i) => {
    push({
      instanceId: `relic-${r.id}-${i}`,
      itemId: r.id,
      name: r.name,
      icon: r.icon || '✨',
      category: INVENTORY_CATEGORIES.RELIC,
      rarity: 'rare',
      quantity: 1,
      tradable: true,
      bound: false,
      limitedEdition: false,
      craftable: false,
      source: r.source || 'discovery',
    });
  });

  explorer.bossLoot.forEach((b, i) => {
    push({
      instanceId: `boss-${b.id}-${i}`,
      itemId: b.id,
      name: b.name,
      icon: b.icon || '🏮',
      category: INVENTORY_CATEGORIES.BOSS_LOOT,
      rarity: 'epic',
      quantity: b.qty || 1,
      tradable: true,
      bound: false,
      limitedEdition: true,
      craftable: false,
      source: 'boss',
    });
  });

  explorer.craftingMaterials.forEach((m) => {
    push({
      instanceId: `mat-${m.id}`,
      itemId: m.id,
      name: m.label,
      icon: m.icon || '⚗️',
      category: INVENTORY_CATEGORIES.MATERIAL,
      rarity: m.rarity || 'common',
      quantity: m.qty,
      tradable: true,
      bound: false,
      limitedEdition: false,
      craftable: true,
      source: 'crafting',
    });
  });

  if (explorer.wallets.find((w) => w.type === 'ancientKeys')?.amount > 0) {
    push({
      instanceId: 'key-ancient',
      itemId: 'ancient-key',
      name: 'Ancient Key',
      icon: '🗝️',
      category: INVENTORY_CATEGORIES.KEY,
      rarity: 'rare',
      quantity: explorer.wallets.find((w) => w.type === 'ancientKeys')?.amount || 0,
      tradable: false,
      bound: true,
      limitedEdition: false,
      craftable: false,
      source: 'explorer',
    });
  }

  crafting.craftedArtifacts?.forEach((a) => {
    push({
      instanceId: `artifact-${a.id}`,
      itemId: a.id,
      name: a.label,
      icon: a.icon || '🔮',
      category: INVENTORY_CATEGORIES.ARTIFACT,
      rarity: 'epic',
      quantity: 1,
      tradable: true,
      bound: false,
      limitedEdition: false,
      craftable: false,
      source: 'crafted',
    });
  });

  creator.ownedStoreItems.forEach((p) => {
    const cat = STORE_CATALOG.find((c) => c.id === p.itemId);
    if (!cat) return;
    push({
      instanceId: `store-${p.itemId}`,
      itemId: p.itemId,
      name: cat.label,
      icon: cat.icon,
      category: INVENTORY_CATEGORIES.STORE_PURCHASE,
      rarity: 'uncommon',
      quantity: 1,
      tradable: cat.kind !== 'season_pass',
      bound: cat.kind === 'season_pass',
      limitedEdition: false,
      craftable: false,
      source: 'creator_store',
    });
  });

  stored.ownedItems.forEach((o) => push(o));

  (state?.rewards || []).slice(0, 6).forEach((r, i) => {
    push({
      instanceId: `reward-${r.id}-${i}`,
      itemId: r.id,
      name: r.title,
      icon: r.icon || '🎁',
      category: INVENTORY_CATEGORIES.ADVENTURE_REWARD,
      rarity: 'uncommon',
      quantity: 1,
      tradable: r.status === 'active',
      bound: false,
      limitedEdition: false,
      craftable: false,
      source: 'adventure',
    });
  });

  return items;
}

function buildSeedListings(now = Date.now()) {
  const minute = Math.floor(safeGetTime(now) / 60000);
  return SEED_CATALOG.map((item, i) => {
    const pricing = computeDynamicPrice(item, { seasonActive: true, globalDiscoveryPct: 18 });
    return {
      id: `listing-seed-${item.itemId}`,
      itemId: item.itemId,
      sellerId: i % 2 === 0 ? 'parsons-heritage' : 'questory-founders',
      sellerName: i % 2 === 0 ? 'Parsons Heritage' : 'Sarah J.',
      name: item.name,
      icon: item.icon,
      category: item.category,
      rarity: item.rarity,
      priceCoins: pricing.marketValue,
      ...pricing,
      listedAt: new Date(safeGetTime(now) - (i + 1) * 3600000).toISOString(),
      featured: item.rarity === 'legendary' || item.demand >= 85,
    };
  });
}

function buildSeedAuctions(now = Date.now()) {
  const legendary = SEED_CATALOG.filter((c) => c.rarity === 'legendary');
  return legendary.slice(0, 2).map((item, i) => {
    const pricing = computeDynamicPrice(item, { seasonActive: true });
    const endsAt = new Date(safeGetTime(now) + (2 + i) * 3600000).toISOString();
    return {
      id: `auction-${item.itemId}`,
      itemId: item.itemId,
      name: item.name,
      icon: item.icon,
      rarity: item.rarity,
      currentBid: Math.round(pricing.marketValue * 0.8),
      buyNowPrice: Math.round(pricing.marketValue * 1.4),
      reservePrice: Math.round(pricing.marketValue * 0.6),
      bidCount: 3 + i * 2,
      watchCount: 12 + i * 5,
      endsAt,
      endingSoon: true,
      sellerName: 'Legendary Auction House',
    };
  });
}

function buildMarketActivity(history, stored, now) {
  const seed = [
    { id: 'act-sarah-sold', icon: '💰', text: 'Sarah sold Black Lantern Relic', kind: 'sale' },
    { id: 'act-compass', icon: '🧭', text: 'Explorer found Ancient Compass', kind: 'discovery' },
    { id: 'act-horror', icon: '👻', text: 'Creator released Horror Collection', kind: 'creator' },
    { id: 'act-lantern-price', icon: '🏮', text: 'Legendary Lantern sold for 12,000 Coins', kind: 'sale' },
    { id: 'act-shard-crash', icon: '📉', text: 'Market dipped on Crystal Shards', kind: 'market' },
    { id: 'act-conductor', icon: '🚂', text: 'Iron Conductor loot is trending', kind: 'trending' },
  ];
  const fromHistory = history.slice(0, 4).map((h) => ({
    id: `hist-${h.id}`,
    icon: h.kind === 'sale' ? '💰' : '🔄',
    text: h.summary || `${h.itemName} traded`,
    kind: h.kind || 'trade',
    at: h.at,
  }));
  return [...fromHistory, ...seed].slice(0, MARKETPLACE_LIMITS.MAX_TIMELINE);
}

function buildHallOfFame(snapshot, stored) {
  return {
    topTraders: [
      { name: 'Sarah J.', trades: 42, reputation: 94 },
      { name: 'Marcus T.', trades: 38, reputation: 91 },
      { name: 'You', trades: stored.sales.length + stored.purchases.length, reputation: stored.tradeReputation },
    ],
    richestExplorers: [
      { name: 'Nova K.', wealth: 28400 },
      { name: 'Elena R.', wealth: 22100 },
      { name: 'You', wealth: snapshot.stats?.totalWealth || 0 },
    ],
    largestCollections: [
      { name: 'Sarah J.', items: 48 },
      { name: 'Marcus T.', items: 41 },
    ],
    highestAuction: { item: 'Black Lantern Relic', price: 12000 },
    legendaryCollector: { name: 'Sarah J.', legendaryCount: 7 },
    creatorSales: [
      { name: 'Parsons Heritage', sales: 128 },
      { name: 'QUESTORY Founders', sales: 96 },
    ],
    marketReputation: stored.tradeReputation,
  };
}

export function getMarketplaceSnapshot(state = null, adventures = [], options = {}) {
  const now = options.now ?? Date.now();
  const stored = normalizeMarketplace(state?.marketplace);
  const explorer = getExplorerEconomySnapshot(state, adventures);
  const creator = getCreatorEconomySnapshot(state, adventures);
  const season = getCurrentSeason();

  const inventory = buildPlayerInventory(state, adventures);
  const lastSalePrices = Object.fromEntries(
    stored.history.filter((h) => h.priceCoins).map((h) => [h.itemId, h.priceCoins])
  );

  const catalog = SEED_CATALOG.map((item) => {
    const pricing = computeDynamicPrice(item, {
      seasonActive: true,
      globalDiscoveryPct: 18.4,
      creatorPopularity: item.creatorId ? 0.6 : 0,
      lastSalePrices,
    });
    return { ...item, ...pricing };
  });

  const playerListings = stored.listings;
  const seedListings = buildSeedListings(now);
  const allListings = [...playerListings, ...seedListings.filter((s) => !playerListings.some((p) => p.itemId === s.itemId))].slice(
    0,
    MARKETPLACE_LIMITS.MAX_LISTINGS
  );

  const playerAuctions = stored.auctions;
  const seedAuctions = buildSeedAuctions(now);
  const auctions = [...playerAuctions, ...seedAuctions.filter((a) => !playerAuctions.some((p) => p.id === a.id))];

  const trending = catalog.filter((c) => c.trending).sort((a, b) => b.demand - a.demand);
  const mostWanted = catalog.slice().sort((a, b) => b.demand - a.demand).slice(0, 6);
  const recentSales = stored.history.filter((h) => h.kind === 'sale').slice(0, 8);
  const featured = allListings.filter((l) => l.featured || l.rarity === 'legendary').slice(0, 8);
  const newest = allListings.slice().sort((a, b) => safeGetTime(b.listedAt) - safeGetTime(a.listedAt)).slice(0, 8);

  const creatorStoreListings = STORE_CATALOG.map((item) => {
    const pricing = computeDynamicPrice(
      { itemId: item.id, rarity: 'uncommon', baseSupply: 50, baseDemand: 55 },
      { creatorPopularity: 0.5 }
    );
    return {
      id: `creator-store-${item.id}`,
      itemId: item.id,
      name: item.label,
      icon: item.icon,
      priceCoins: item.priceCoins || pricing.marketValue,
      category: INVENTORY_CATEGORIES.CREATOR_COLLECTIBLE,
      sellerName: 'Creator Marketplace',
      creatorItem: true,
      placeholder: item.placeholder,
    };
  });

  const activityFeed = buildMarketActivity(stored.history, stored, now);
  const hallOfFame = buildHallOfFame(explorer, stored);
  const territoryModifiers = MARKET_VENUES.map((v) => getTerritoryModifierForVenue(v.id, state, now)).filter(Boolean);
  const sellerWallet = buildMarketplaceWalletFields(state, adventures, { now });

  return wrapEngineSnapshot({
    inventory,
    catalog,
    listings: allListings,
    featured,
    trending,
    newest,
    mostWanted,
    recentSales,
    offers: stored.offers,
    trades: stored.trades,
    auctions,
    endingSoon: auctions.filter((a) => a.endingSoon),
    mostWatched: auctions.slice().sort((a, b) => b.watchCount - a.watchCount).slice(0, 4),
    wishlist: stored.wishlist,
    myListings: playerListings,
    purchases: stored.purchases,
    sales: stored.sales,
    history: stored.history,
    gifts: stored.gifts,
    tradeReputation: stored.tradeReputation,
    creatorStoreListings,
    venues: MARKET_VENUES,
    activityFeed,
    hallOfFame,
    stats: {
      totalListings: allListings.length,
      totalWealth: explorer.stats?.totalWealth || 0,
      coins: state?.coins || 0,
    },
    extensionHooks: MARKET_EXTENSION_HOOKS,
    territoryModifiers,
    season,
    sellerWallet,
    stored,
  });
}

function appendHistory(stored, entry) {
  return {
    ...stored,
    history: [{ ...entry, id: entry.id || `hist-${Date.now()}` }, ...stored.history].slice(0, MARKETPLACE_LIMITS.MAX_HISTORY),
  };
}

export function createListing(state, instanceId, priceCoins) {
  const stored = normalizeMarketplace(state?.marketplace);
  const snapshot = getMarketplaceSnapshot(state, state?.adventures || []);
  const item = snapshot.inventory.find((i) => i.instanceId === instanceId);
  if (!item) return { ok: false, message: 'Item not in inventory' };
  if (!item.tradable) return { ok: false, message: 'Item is bound and cannot be listed' };
  if (stored.listings.some((l) => l.instanceId === instanceId)) {
    return { ok: false, message: 'Already listed' };
  }
  const listing = {
    id: `listing-${Date.now()}`,
    instanceId,
    itemId: item.itemId,
    name: item.name,
    icon: item.icon,
    category: item.category,
    rarity: item.rarity,
    priceCoins: Math.max(1, Number(priceCoins) || 100),
    sellerId: 'player',
    sellerName: state?.playerName || 'You',
    listedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    state: {
      ...state,
      marketplace: { ...stored, listings: [...stored.listings, listing] },
    },
    listing,
  };
}

export function cancelListing(state, listingId) {
  const stored = normalizeMarketplace(state?.marketplace);
  const listing = stored.listings.find((l) => l.id === listingId);
  if (!listing) return { ok: false, message: 'Listing not found' };
  return {
    ok: true,
    state: {
      ...state,
      marketplace: {
        ...stored,
        listings: stored.listings.filter((l) => l.id !== listingId),
      },
    },
  };
}

export function purchaseListing(state, listingId, adventures = []) {
  const stored = normalizeMarketplace(state?.marketplace);
  const snapshot = getMarketplaceSnapshot(state, adventures);
  const listing =
    snapshot.listings.find((l) => l.id === listingId) ||
    snapshot.creatorStoreListings.find((l) => l.id === listingId);
  if (!listing) return { ok: false, message: 'Listing not found' };
  if ((state?.coins || 0) < listing.priceCoins) {
    return { ok: false, message: `Need ${listing.priceCoins} coins` };
  }

  const owned = {
    instanceId: `owned-${listing.itemId}-${Date.now()}`,
    itemId: listing.itemId,
    name: listing.name,
    icon: listing.icon,
    category: listing.category,
    rarity: listing.rarity,
    quantity: 1,
    tradable: true,
    bound: false,
    limitedEdition: listing.rarity === 'legendary',
    craftable: false,
    source: 'marketplace',
  };

  const purchase = {
    id: `purchase-${Date.now()}`,
    listingId,
    itemId: listing.itemId,
    itemName: listing.name,
    priceCoins: listing.priceCoins,
    at: new Date().toISOString(),
  };

  const isPlayerListing = stored.listings.some((l) => l.id === listingId);
  let nextStored = {
    ...stored,
    purchases: [...stored.purchases, purchase],
    ownedItems: [...stored.ownedItems, owned],
    tradeReputation: Math.min(100, stored.tradeReputation + 1),
  };
  if (isPlayerListing) {
    nextStored.listings = stored.listings.filter((l) => l.id !== listingId);
  }
  nextStored = appendHistory(nextStored, {
    kind: 'sale',
    itemId: listing.itemId,
    itemName: listing.name,
    priceCoins: listing.priceCoins,
    summary: `${listing.name} sold for ${listing.priceCoins} coins`,
    at: purchase.at,
  });

  return {
    ok: true,
    state: {
      ...state,
      coins: (state.coins || 0) - listing.priceCoins,
      marketplace: nextStored,
    },
    purchase,
  };
}

export function makeOffer(state, listingId, amountCoins) {
  const stored = normalizeMarketplace(state?.marketplace);
  const offer = {
    id: `offer-${Date.now()}`,
    listingId,
    amountCoins: Math.max(1, Number(amountCoins) || 0),
    fromId: 'player',
    fromName: state?.playerName || 'You',
    status: 'pending',
    at: new Date().toISOString(),
  };
  return {
    ok: true,
    state: {
      ...state,
      marketplace: { ...stored, offers: [...stored.offers, offer] },
    },
    offer,
  };
}

export function acceptOffer(state, offerId) {
  const stored = normalizeMarketplace(state?.marketplace);
  const offer = stored.offers.find((o) => o.id === offerId);
  if (!offer || offer.status !== 'pending') return { ok: false, message: 'Offer not found' };
  const nextOffers = stored.offers.map((o) =>
    o.id === offerId ? { ...o, status: 'accepted' } : o
  );
  return {
    ok: true,
    state: {
      ...state,
      coins: (state.coins || 0) + offer.amountCoins,
      marketplace: appendHistory(
        { ...stored, offers: nextOffers, tradeReputation: Math.min(100, stored.tradeReputation + 2) },
        { kind: 'offer', summary: `Accepted offer for ${offer.amountCoins} coins`, at: new Date().toISOString() }
      ),
    },
  };
}

export function rejectOffer(state, offerId) {
  const stored = normalizeMarketplace(state?.marketplace);
  return {
    ok: true,
    state: {
      ...state,
      marketplace: {
        ...stored,
        offers: stored.offers.map((o) => (o.id === offerId ? { ...o, status: 'rejected' } : o)),
      },
    },
  };
}

export function giftItem(state, instanceId, recipientName = 'Friend') {
  const stored = normalizeMarketplace(state?.marketplace);
  const snapshot = getMarketplaceSnapshot(state, state?.adventures || []);
  const item = snapshot.inventory.find((i) => i.instanceId === instanceId);
  if (!item || !item.tradable) return { ok: false, message: 'Cannot gift this item' };
  const gift = {
    id: `gift-${Date.now()}`,
    instanceId,
    itemName: item.name,
    recipientName,
    at: new Date().toISOString(),
  };
  return {
    ok: true,
    state: {
      ...state,
      marketplace: appendHistory(
        {
          ...stored,
          gifts: [...stored.gifts, gift],
          tradeReputation: Math.min(100, stored.tradeReputation + 1),
        },
        { kind: 'gift', itemName: item.name, summary: `Gifted ${item.name} to ${recipientName}`, at: gift.at }
      ),
    },
  };
}

export function recordMarketSale(state, sale = {}) {
  const stored = normalizeMarketplace(state?.marketplace);
  const entry = {
    id: sale.id || `sale-${Date.now()}`,
    kind: 'sale',
    itemId: sale.itemId,
    itemName: sale.itemName || sale.name,
    priceCoins: sale.priceCoins || 0,
    summary: sale.summary || `${sale.itemName} sold`,
    at: sale.at || new Date().toISOString(),
  };
  return {
    ...state,
    marketplace: {
      ...appendHistory(stored, entry),
      sales: [...stored.sales, entry].slice(0, 40),
      tradeReputation: Math.min(100, stored.tradeReputation + 1),
    },
  };
}

export function addToWishlist(state, itemId) {
  const stored = normalizeMarketplace(state?.marketplace);
  if (stored.wishlist.includes(itemId)) return state;
  return {
    ...state,
    marketplace: {
      ...stored,
      wishlist: [...stored.wishlist, itemId].slice(0, MARKETPLACE_LIMITS.MAX_WISHLIST),
    },
  };
}

export function removeFromWishlist(state, itemId) {
  const stored = normalizeMarketplace(state?.marketplace);
  return {
    ...state,
    marketplace: {
      ...stored,
      wishlist: stored.wishlist.filter((id) => id !== itemId),
    },
  };
}

export function createTradeOffer(state, offeredInstanceId, requestedItemId) {
  const stored = normalizeMarketplace(state?.marketplace);
  const snapshot = getMarketplaceSnapshot(state, state?.adventures || []);
  const offered = snapshot.inventory.find((i) => i.instanceId === offeredInstanceId);
  if (!offered?.tradable) return { ok: false, message: 'Cannot trade this item' };
  const trade = {
    id: `trade-${Date.now()}`,
    offeredInstanceId,
    offeredName: offered.name,
    requestedItemId,
    status: 'pending',
    fromName: state?.playerName || 'You',
    at: new Date().toISOString(),
  };
  return {
    ok: true,
    state: {
      ...state,
      marketplace: { ...stored, trades: [...stored.trades, trade] },
    },
    trade,
  };
}

export function acceptTrade(state, tradeId) {
  const stored = normalizeMarketplace(state?.marketplace);
  const trade = stored.trades.find((t) => t.id === tradeId);
  if (!trade || trade.status !== 'pending') return { ok: false, message: 'Trade not found' };
  const next = appendHistory(
    {
      ...stored,
      trades: stored.trades.map((t) => (t.id === tradeId ? { ...t, status: 'completed' } : t)),
      tradeReputation: Math.min(100, stored.tradeReputation + 3),
    },
    { kind: 'trade', summary: `Trade completed: ${trade.offeredName}`, at: new Date().toISOString() }
  );
  return { ok: true, state: { ...state, marketplace: next } };
}

export function placeAuctionBid(state, auctionId, bidAmount, adventures = []) {
  const stored = normalizeMarketplace(state?.marketplace);
  const snapshot = getMarketplaceSnapshot(state, adventures);
  const auction = snapshot.auctions.find((a) => a.id === auctionId);
  if (!auction) return { ok: false, message: 'Auction not found' };
  const bid = Math.max(auction.currentBid + 10, Number(bidAmount) || 0);
  if ((state?.coins || 0) < bid) return { ok: false, message: `Need ${bid} coins to bid` };
  const updated = {
    ...auction,
    currentBid: bid,
    bidCount: (auction.bidCount || 0) + 1,
    highBidder: state?.playerName || 'You',
  };
  const inStored = stored.auctions.some((a) => a.id === auctionId);
  const auctions = inStored
    ? stored.auctions.map((a) => (a.id === auctionId ? updated : a))
    : [...stored.auctions, updated];
  return {
    ok: true,
    state: {
      ...state,
      coins: (state.coins || 0) - bid,
      marketplace: appendHistory(
        { ...stored, auctions },
        { kind: 'auction', itemName: auction.name, priceCoins: bid, summary: `Bid ${bid} on ${auction.name}`, at: new Date().toISOString() }
      ),
    },
  };
}

export function buyAuctionNow(state, auctionId, adventures = []) {
  const snapshot = getMarketplaceSnapshot(state, adventures);
  const auction = snapshot.auctions.find((a) => a.id === auctionId);
  if (!auction?.buyNowPrice) return { ok: false, message: 'Auction not found' };
  if ((state?.coins || 0) < auction.buyNowPrice) {
    return { ok: false, message: `Need ${auction.buyNowPrice} coins` };
  }
  const stored = normalizeMarketplace(state?.marketplace);
  const owned = {
    instanceId: `auction-won-${auction.itemId}-${Date.now()}`,
    itemId: auction.itemId,
    name: auction.name,
    icon: auction.icon,
    category: INVENTORY_CATEGORIES.LEGENDARY,
    rarity: auction.rarity,
    quantity: 1,
    tradable: true,
    bound: false,
    limitedEdition: true,
    craftable: false,
    source: 'auction',
  };
  const purchase = {
    id: `auction-buy-${Date.now()}`,
    itemId: auction.itemId,
    itemName: auction.name,
    priceCoins: auction.buyNowPrice,
    at: new Date().toISOString(),
  };
  const nextStored = appendHistory(
    {
      ...stored,
      auctions: stored.auctions.filter((a) => a.id !== auctionId),
      ownedItems: [...stored.ownedItems, owned],
      purchases: [...stored.purchases, purchase],
      tradeReputation: Math.min(100, stored.tradeReputation + 2),
    },
    {
      kind: 'auction',
      itemId: auction.itemId,
      itemName: auction.name,
      priceCoins: auction.buyNowPrice,
      summary: `Won ${auction.name} at auction for ${auction.buyNowPrice} coins`,
      at: purchase.at,
    }
  );
  return {
    ok: true,
    state: { ...state, coins: (state.coins || 0) - auction.buyNowPrice, marketplace: nextStored },
  };
}
