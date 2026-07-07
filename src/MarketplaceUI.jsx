import React, { useMemo, useState } from 'react';
import {
  acceptOffer,
  acceptTrade,
  addToWishlist,
  buyAuctionNow,
  cancelListing,
  createListing,
  createTradeOffer,
  getMarketplaceSnapshot,
  giftItem,
  makeOffer,
  placeAuctionBid,
  purchaseListing,
  rejectOffer,
  removeFromWishlist,
} from './marketplaceEngine';

const TABS = [
  ['featured', 'Featured'],
  ['trending', 'Trending'],
  ['newest', 'Newest'],
  ['creator', 'Creator Store'],
  ['auctions', 'Auctions'],
  ['trades', 'Trades'],
  ['wishlist', 'Wishlist'],
  ['listings', 'My Listings'],
  ['purchases', 'Purchases'],
  ['sales', 'Sales'],
  ['history', 'History'],
];

function ListingCard({ listing, onBuy, onWishlist, wished, onOffer }) {
  return (
    <div className="marketplace-listing-card">
      <span className="marketplace-listing-icon">{listing.icon}</span>
      <div className="marketplace-listing-body">
        <strong>{listing.name}</strong>
        <small>{listing.sellerName} · {listing.rarity}</small>
        <span className="marketplace-listing-price">{listing.priceCoins?.toLocaleString()} 🪙</span>
      </div>
      <div className="marketplace-listing-actions">
        <button type="button" onClick={() => onBuy(listing.id)}>Buy</button>
        <button type="button" className="ghost" onClick={() => onOffer(listing.id)}>
          Offer
        </button>
        <button type="button" className="ghost" onClick={() => onWishlist(listing.itemId)}>
          {wished ? '★' : '☆'}
        </button>
      </div>
    </div>
  );
}

export function MarketplaceScreen({ state, setState, adventures, nav }) {
  const [tab, setTab] = useState('featured');
  const [msg, setMsg] = useState('');
  const [listPrice, setListPrice] = useState('250');
  const [selectedInstance, setSelectedInstance] = useState('');

  const snapshot = useMemo(
    () => getMarketplaceSnapshot(state, adventures),
    [state, adventures]
  );

  const handleBuy = (listingId) => {
    const result = purchaseListing(state, listingId, adventures);
    if (!result.ok) {
      setMsg(result.message);
      return;
    }
    setState(result.state);
    setMsg(`Purchased ${result.purchase?.itemName || 'item'}`);
  };

  const handleWishlist = (itemId) => {
    const fn = snapshot.wishlist.includes(itemId) ? removeFromWishlist : addToWishlist;
    setState((s) => fn(s, itemId));
  };

  const handleOffer = (listingId) => {
    const result = makeOffer(state, listingId, Math.round((snapshot.listings.find((l) => l.id === listingId)?.priceCoins || 100) * 0.85));
    if (result.ok) {
      setState(result.state);
      setMsg('Offer sent');
    }
  };

  const handleList = () => {
    const result = createListing(state, selectedInstance, Number(listPrice));
    if (!result.ok) {
      setMsg(result.message);
      return;
    }
    setState(result.state);
    setMsg(`Listed ${result.listing?.name}`);
  };

  const handleBid = (auctionId) => {
    const auction = snapshot.auctions.find((a) => a.id === auctionId);
    const result = placeAuctionBid(state, auctionId, (auction?.currentBid || 0) + 50, adventures);
    if (!result.ok) {
      setMsg(result.message);
      return;
    }
    setState(result.state);
    setMsg('Bid placed');
  };

  const listingsForTab =
    tab === 'featured'
      ? snapshot.featured
      : tab === 'trending'
        ? snapshot.listings.filter((l) => snapshot.trending.some((t) => t.itemId === l.itemId))
        : tab === 'newest'
          ? snapshot.newest
          : [];

  return (
    <div className="marketplace-screen">
      <div className="section-head">
        <div>
          <h2>Global Marketplace</h2>
          <p>Buy · sell · trade · auction — Questory exploration economy</p>
        </div>
        <span className="marketplace-coins">{snapshot.stats.coins?.toLocaleString()} 🪙</span>
      </div>

      {msg && <p className="loc-feedback marketplace-msg">{msg}</p>}

      <div className="vault-tabs-scroll marketplace-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {(tab === 'featured' || tab === 'trending' || tab === 'newest') && (
        <div className="marketplace-listings-grid">
          {listingsForTab.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              onBuy={handleBuy}
              onWishlist={handleWishlist}
              wished={snapshot.wishlist.includes(l.itemId)}
              onOffer={handleOffer}
            />
          ))}
        </div>
      )}

      {tab === 'creator' && (
        <div className="marketplace-listings-grid">
          {snapshot.creatorStoreListings.map((l) => (
            <ListingCard
              key={l.id}
              listing={{ ...l, sellerName: 'Creator Store' }}
              onBuy={handleBuy}
              onWishlist={handleWishlist}
              wished={snapshot.wishlist.includes(l.itemId)}
              onOffer={handleOffer}
            />
          ))}
        </div>
      )}

      {tab === 'auctions' && (
        <div className="marketplace-auctions">
          {snapshot.auctions.map((a) => (
            <div key={a.id} className="card marketplace-auction-card">
              <span>{a.icon}</span>
              <div>
                <strong>{a.name}</strong>
                <small>{a.bidCount} bids · {a.watchCount} watching</small>
                <p>Current: {a.currentBid?.toLocaleString()} 🪙 · Buy now: {a.buyNowPrice?.toLocaleString()} 🪙</p>
              </div>
              <div className="marketplace-listing-actions">
                <button type="button" onClick={() => handleBid(a.id)}>Bid</button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    const r = buyAuctionNow(state, a.id, adventures);
                    if (r.ok) {
                      setState(r.state);
                      setMsg(`Won ${a.name}!`);
                    } else setMsg(r.message);
                  }}
                >
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'trades' && (
        <>
          <div className="card">
            <h4>Direct Trade</h4>
            <p className="admin-meta">Safe confirmation · future escrow support</p>
            <select value={selectedInstance} onChange={(e) => setSelectedInstance(e.target.value)}>
              <option value="">Select item to offer</option>
              {snapshot.inventory.filter((i) => i.tradable).map((i) => (
                <option key={i.instanceId} value={i.instanceId}>
                  {i.icon} {i.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const r = createTradeOffer(state, selectedInstance, 'crystal-shard');
                if (r.ok) {
                  setState(r.state);
                  setMsg('Trade offer created');
                } else setMsg(r.message);
              }}
            >
              Offer Trade
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const item = snapshot.inventory.find((i) => i.instanceId === selectedInstance);
                if (!item) return;
                const r = giftItem(state, selectedInstance);
                if (r.ok) {
                  setState(r.state);
                  setMsg(`Gifted ${item.name}`);
                } else setMsg(r.message);
              }}
            >
              Gift Item
            </button>
          </div>
          {snapshot.trades.map((t) => (
            <div key={t.id} className="card marketplace-trade-row">
              <span>{t.offeredName} → {t.requestedItemId}</span>
              <span>{t.status}</span>
              {t.status === 'pending' && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    const r = acceptTrade(state, t.id);
                    if (r.ok) setState(r.state);
                  }}
                >
                  Accept
                </button>
              )}
            </div>
          ))}
          {snapshot.offers.filter((o) => o.status === 'pending').map((o) => (
            <div key={o.id} className="card marketplace-trade-row">
              <span>Offer {o.amountCoins} 🪙 on listing</span>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  const r = acceptOffer(state, o.id);
                  if (r.ok) setState(r.state);
                  setMsg(r.ok ? 'Offer accepted' : r.message);
                }}
              >
                Accept
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  const r = rejectOffer(state, o.id);
                  if (r.ok) setState(r.state);
                }}
              >
                Reject
              </button>
            </div>
          ))}
        </>
      )}

      {tab === 'wishlist' && (
        <div className="marketplace-wishlist">
          {snapshot.wishlist.length === 0 && <p>Star items from listings to track them.</p>}
          {snapshot.wishlist.map((id) => {
            const item = snapshot.catalog.find((c) => c.itemId === id);
            return (
              <div key={id} className="card marketplace-wish-row">
                <span>{item?.icon || '✨'} {item?.name || id}</span>
                <button type="button" className="ghost" onClick={() => setState((s) => removeFromWishlist(s, id))}>
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'listings' && (
        <>
          <div className="card marketplace-list-form">
            <h4>Create Listing</h4>
            <select value={selectedInstance} onChange={(e) => setSelectedInstance(e.target.value)}>
              <option value="">Inventory item</option>
              {snapshot.inventory.filter((i) => i.tradable).map((i) => (
                <option key={i.instanceId} value={i.instanceId}>
                  {i.icon} {i.name} ×{i.quantity}
                </option>
              ))}
            </select>
            <input type="number" value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="Price in coins" />
            <button type="button" onClick={handleList}>List Item</button>
          </div>
          {snapshot.myListings.map((l) => (
            <div key={l.id} className="card marketplace-my-listing">
              <span>{l.icon} {l.name} — {l.priceCoins} 🪙</span>
              <button type="button" className="ghost" onClick={() => {
                const r = cancelListing(state, l.id);
                if (r.ok) setState(r.state);
              }}>
                Cancel
              </button>
            </div>
          ))}
        </>
      )}

      {tab === 'purchases' && (
        <div className="marketplace-history">
          {snapshot.purchases.map((p) => (
            <div key={p.id} className="card">{p.itemName} · {p.priceCoins} 🪙 · {new Date(p.at).toLocaleDateString()}</div>
          ))}
          {!snapshot.purchases.length && <p>No purchases yet.</p>}
        </div>
      )}

      {tab === 'sales' && (
        <div className="marketplace-history">
          {snapshot.sales.map((s) => (
            <div key={s.id} className="card">{s.summary || s.itemName}</div>
          ))}
          {!snapshot.sales.length && <p>No sales yet.</p>}
        </div>
      )}

      {tab === 'history' && (
        <>
          <div className="card">
            <h4>Trade Reputation</h4>
            <strong>{snapshot.tradeReputation}/100</strong>
          </div>
          {snapshot.history.map((h) => (
            <div key={h.id} className="card marketplace-hist-row">{h.summary}</div>
          ))}
          <div className="card marketplace-hof">
            <h4>Hall of Fame</h4>
            <p>Top Trader: {snapshot.hallOfFame.topTraders[0]?.name}</p>
            <p>Highest Auction: {snapshot.hallOfFame.highestAuction.item} — {snapshot.hallOfFame.highestAuction.price?.toLocaleString()} 🪙</p>
          </div>
        </>
      )}

      <div className="card marketplace-inventory-preview">
        <h4>Your Inventory ({snapshot.inventory.length})</h4>
        <div className="marketplace-inventory-chips">
          {snapshot.inventory.slice(0, 12).map((i) => (
            <span key={i.instanceId} className={`marketplace-inv-chip rarity-${i.rarity}`}>
              {i.icon} {i.name}{i.quantity > 1 ? ` ×${i.quantity}` : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarketplaceMapHud({ snapshot, nav }) {
  if (!snapshot?.venues?.length) return null;
  return (
    <div className="marketplace-map-hud" role="navigation" aria-label="Market venues">
      {snapshot.venues.slice(0, 4).map((v) => (
        <button key={v.id} type="button" className="ghost marketplace-map-venue-btn" onClick={() => nav('marketplace')}>
          {v.icon} {v.label}
        </button>
      ))}
    </div>
  );
}

export function MarketplacePassportPanel({ state, setState, adventures, nav }) {
  const snapshot = useMemo(() => getMarketplaceSnapshot(state, adventures), [state, adventures]);

  return (
    <div className="marketplace-passport-panel">
      <p className="admin-meta">Purchases, sales, listings, wishlist, and trade reputation.</p>
      <div className="grid creator-metrics-row">
        <div className="card mini"><small>Reputation</small><strong>{snapshot.tradeReputation}</strong></div>
        <div className="card mini"><small>Purchases</small><strong>{snapshot.purchases.length}</strong></div>
        <div className="card mini"><small>Listings</small><strong>{snapshot.myListings.length}</strong></div>
        <div className="card mini"><small>Wishlist</small><strong>{snapshot.wishlist.length}</strong></div>
      </div>
      {snapshot.sellerWallet && (
        <div className="card marketplace-seller-wallet">
          <h4>Seller Wallet (simulated)</h4>
          <div className="grid creator-metrics-row">
            <div className="card mini"><small>Balance</small><strong>{snapshot.sellerWallet.sellerBalance}</strong></div>
            <div className="card mini"><small>Pending sales</small><strong>{snapshot.sellerWallet.pendingSales}</strong></div>
            <div className="card mini"><small>Held</small><strong>{snapshot.sellerWallet.heldBalance}</strong></div>
            <div className="card mini"><small>Tax est.</small><strong>${(snapshot.sellerWallet.taxEstimateCents / 100).toFixed(2)}</strong></div>
          </div>
          <p className="admin-meta">Refund status: {snapshot.sellerWallet.refundStatus}</p>
          {snapshot.sellerWallet.receipts?.slice(0, 3).map((r) => (
            <p key={r.id} className="feed-item">{r.label} · {r.amountCoins} coins</p>
          ))}
        </div>
      )}
      <button type="button" onClick={() => nav('marketplace')}>Open Global Marketplace</button>
      <div className="card">
        <h4>Recent Activity</h4>
        {snapshot.activityFeed.slice(0, 5).map((a) => (
          <p key={a.id} className="feed-item">{a.icon} {a.text}</p>
        ))}
      </div>
    </div>
  );
}
