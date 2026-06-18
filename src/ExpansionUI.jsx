import React, { useEffect, useRef, useState } from 'react';
import {
  Banknote,
  Camera,
  Crown,
  Gem,
  Map,
  Radio,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  AR_ASSET_LABELS,
  CREATOR_STOREFRONT,
  FINDER_MODES,
  LEGENDARY_HUNT_META,
  MARKETPLACE_TEMPLATES,
  PREMIUM_BENEFITS,
  PREMIUM_PRICE_MONTHLY,
  SPONSORED_CITY_DROPS,
  STUDIOS_PARTNERS,
  cancelPremium,
  connectStripeWallet,
  formatCents,
  getCashHuntLabel,
  getNationalPassportView,
  getSponsoredDropForAdventure,
  getStorefrontForCreator,
  isLegendaryHunt,
  isPremiumSubscriber,
  launchMarketplaceCampaign,
  purchaseStorefrontProduct,
  subscribeToPremium,
  usesArFinder,
  withdrawCash,
} from './expansion';

const PLATFORM_TABS = [
  ['premium', 'Premium'],
  ['wallet', 'Wallet'],
  ['store', 'Store'],
  ['drops', 'Drops'],
  ['studios', 'Studios'],
  ['legendary', 'Legendary'],
];

export function PlatformHub({ state, setState, nav, auth }) {
  const [tab, setTab] = useState('premium');

  return (
    <>
      <div className="section-head">
        <h2>Platform</h2>
        <p>AR, cash hunts, storefronts, and nationwide expansion</p>
      </div>

      <div className="platform-hub-tabs">
        {PLATFORM_TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'premium' && <PremiumPanel state={state} setState={setState} />}
      {tab === 'wallet' && <CashWalletPanel state={state} setState={setState} />}
      {tab === 'store' && <CreatorStorefrontPanel state={state} setState={setState} />}
      {tab === 'drops' && <SponsoredDropsPanel nav={nav} />}
      {tab === 'studios' && <StudiosPanel nav={nav} />}
      {tab === 'legendary' && <LegendaryHuntsPanel nav={nav} state={state} adventures={state.adventures} />}
    </>
  );
}

export function PremiumPanel({ state, setState }) {
  const active = isPremiumSubscriber(state);
  const sub = state.expansion?.subscription;

  return (
    <div className="card premium-panel">
      <div className="premium-head">
        <Crown size={28} />
        <div>
          <h3>Questory Premium</h3>
          <p className="premium-price">${PREMIUM_PRICE_MONTHLY}/month</p>
        </div>
        {active && <span className="badge published">Active</span>}
      </div>
      <ul className="premium-benefits">
        {PREMIUM_BENEFITS.map((b) => (
          <li key={b}>
            <Sparkles size={14} /> {b}
          </li>
        ))}
      </ul>
      {active ? (
        <>
          <p className="admin-meta">
            Renews {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'monthly'}
          </p>
          <button type="button" className="ghost" onClick={() => setState((s) => cancelPremium(s))}>
            Cancel subscription
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setState((s) => subscribeToPremium(s))}>
          <Zap size={18} /> Start Premium — demo activates instantly
        </button>
      )}
      <p className="admin-meta">Stripe-ready · Real billing connects at launch</p>
    </div>
  );
}

export function PremiumSubscriptionBadge({ state }) {
  if (!isPremiumSubscriber(state)) return null;
  return (
    <span className="premium-sub-badge">
      <Crown size={12} /> Premium
    </span>
  );
}

export function CashWalletPanel({ state, setState }) {
  const wallet = state.expansion?.cashWallet || {};
  const [withdrawAmount, setWithdrawAmount] = useState('');

  function handleWithdraw() {
    const cents = Math.round(parseFloat(withdrawAmount) * 100);
    if (!cents || cents <= 0) return;
    const result = withdrawCash(state, cents);
    if (result.ok) {
      setState(result.state);
      setWithdrawAmount('');
    } else {
      alert(result.message);
    }
  }

  return (
    <div className="card cash-wallet-panel">
      <div className="wallet-balance">
        <Wallet size={24} />
        <div>
          <small>Cash balance</small>
          <h3>{formatCents(wallet.balanceCents || 0)}</h3>
        </div>
      </div>
      {!wallet.stripeConnected ? (
        <button type="button" onClick={() => setState((s) => connectStripeWallet(s))}>
          <Banknote size={18} /> Connect Stripe Express
        </button>
      ) : (
        <p className="admin-meta">Stripe connected · {wallet.stripeAccountId}</p>
      )}
      <div className="wallet-withdraw">
        <input
          type="number"
          placeholder="Withdraw amount ($)"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
        />
        <button type="button" className="ghost" onClick={handleWithdraw} disabled={!wallet.stripeConnected}>
          Withdraw to bank
        </button>
      </div>
      <h4>Earnings history</h4>
      {(wallet.earnings || []).length === 0 ? (
        <p className="admin-meta">Complete cash hunts to earn prizes.</p>
      ) : (
        wallet.earnings.slice(0, 5).map((e) => (
          <div className="earning-row" key={e.id}>
            <span>{e.adventureTitle}</span>
            <strong>+{formatCents(e.amountCents)}</strong>
          </div>
        ))
      )}
    </div>
  );
}

export function CreatorStorefrontPanel({ state, setState }) {
  const purchased = state.expansion?.purchasedProducts || [];

  return (
    <>
      <p className="admin-meta">Questory takes 30% · Creators keep 70%</p>
      {CREATOR_STOREFRONT.map((product) => (
        <div className="card storefront-product" key={product.id}>
          <div className="row">
            <span className="badge published">{product.type === 'collection' ? 'Collection' : 'Hunt'}</span>
            <strong>${product.price.toFixed(2)}</strong>
          </div>
          <h4>{product.title}</h4>
          <p>{product.desc}</p>
          {purchased.includes(product.id) ? (
            <span className="chip-done">Owned ✓</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                const result = purchaseStorefrontProduct(state, product);
                if (result.ok) setState(result.state);
                else alert(result.message);
              }}
            >
              <ShoppingBag size={16} /> Purchase
            </button>
          )}
        </div>
      ))}
    </>
  );
}

export function CreatorStorefrontTab({ state, setState, creatorId }) {
  const products = getStorefrontForCreator(creatorId);
  const purchased = state.expansion?.purchasedProducts || [];
  if (!products.length) return null;

  return (
    <div className="card creator-storefront-tab">
      <h3>
        <Store size={18} /> Creator Store
      </h3>
      {products.map((product) => (
        <div className="storefront-row" key={product.id}>
          <div>
            <b>{product.title}</b>
            <p>{product.desc}</p>
          </div>
          {purchased.includes(product.id) ? (
            <span className="chip-done">Owned</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                const result = purchaseStorefrontProduct(state, product);
                if (result.ok) setState(result.state);
              }}
            >
              ${product.price.toFixed(2)}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function SponsoredDropsPanel({ nav }) {
  return (
    <>
      {SPONSORED_CITY_DROPS.map((drop) => (
        <div className="card sponsored-drop-card" key={drop.id}>
          <div className="drop-head">
            <span className="drop-icon">{drop.icon}</span>
            <div>
              <small>{drop.sponsor}</small>
              <h4>{drop.title}</h4>
            </div>
          </div>
          <p>Reward: {drop.reward}</p>
          <p className="admin-meta">
            Budget ${drop.budget} · {drop.radiusMiles} mi radius · {drop.durationDays} days
          </p>
          <button type="button" onClick={() => nav('detail', drop.adventureId)}>
            Start Drop
          </button>
        </div>
      ))}
    </>
  );
}

export function SponsorMarketplacePanel({ state, setState }) {
  const [reward, setReward] = useState('Free item with purchase');
  const [sponsorName, setSponsorName] = useState('');

  return (
    <div className="card marketplace-panel">
      <h3>
        <Radio size={18} /> Sponsor Marketplace
      </h3>
      <p>Launch self-serve campaigns — Questory auto-creates adventures.</p>
      <label>Business name</label>
      <input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} placeholder="Your business" />
      <label>Reward offer</label>
      <input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Free shake, $5 off..." />
      <div className="marketplace-templates">
        {MARKETPLACE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className="card mini marketplace-template"
            onClick={() => setState((s) => launchMarketplaceCampaign(s, template, { reward, sponsorName }))}
          >
            <b>{template.label}</b>
            <small>${template.budget} · {template.radiusMiles} mi · {template.durationDays}d</small>
          </button>
        ))}
      </div>
      {(state.expansion?.marketplaceCampaigns || []).length > 0 && (
        <>
          <h4>Your campaigns</h4>
          {state.expansion.marketplaceCampaigns.map((c) => (
            <div className="campaign-row" key={c.id}>
              <span>{c.sponsorName} — {c.reward}</span>
              <span className="badge published">{c.status}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function StudiosPanel({ nav }) {
  return (
    <>
      <p className="admin-meta">Verified partners · Revenue share · Featured placement</p>
      {STUDIOS_PARTNERS.map((studio) => (
        <div className="card studio-card" key={studio.id}>
          <div className="row">
            <h4>{studio.name}</h4>
            {studio.verified && <span className="badge published">Verified</span>}
            {studio.featured && <Star size={14} className="studio-star" />}
          </div>
          <p>
            {studio.hunts} hunts · {studio.collections} collections · {Math.round(studio.revenueShare * 100)}% revenue
            share
          </p>
          <p className="admin-meta">★ {studio.rating} rating</p>
          <button type="button" className="ghost" onClick={() => nav('creator', null, { creatorId: studio.id })}>
            View Studio
          </button>
        </div>
      ))}
    </>
  );
}

export function LegendaryHuntsPanel({ nav, state, adventures }) {
  const legendary = adventures.filter((a) => isLegendaryHunt(a) && a.status === 'published');
  const claimed = state.expansion?.legendaryClaims || [];

  return (
    <>
      {Object.entries(LEGENDARY_HUNT_META).map(([type, meta]) => {
        const hunt = legendary.find((a) => a.legendaryType === type);
        return (
          <div className="card legendary-card" key={type}>
            <span className="legendary-icon">{meta.icon}</span>
            <h4>{meta.label}</h4>
            <p>{meta.desc}</p>
            <small>{meta.frequency}</small>
            {hunt ? (
              <button type="button" onClick={() => nav('detail', hunt.id)}>
                {claimed.includes(hunt.id) ? 'Replay Legendary Hunt' : 'Enter the Legend'}
              </button>
            ) : (
              <p className="admin-meta">Coming soon to your region</p>
            )}
          </div>
        );
      })}
    </>
  );
}

export function LegendaryHuntBadge({ adventure }) {
  if (!isLegendaryHunt(adventure)) return null;
  const meta = LEGENDARY_HUNT_META[adventure.legendaryType] || LEGENDARY_HUNT_META.lost_ledger;
  return (
    <span className="legendary-badge">
      <Gem size={12} /> {meta.label}
    </span>
  );
}

export function CashHuntBadge({ adventure }) {
  const label = getCashHuntLabel(adventure);
  if (!label) return null;
  return (
    <span className="cash-hunt-badge">
      <Trophy size={12} /> {label}
    </span>
  );
}

export function SponsoredDropBadge({ adventure }) {
  const drop = getSponsoredDropForAdventure(adventure.id);
  if (!drop) return null;
  return (
    <span className="sponsored-drop-badge">
      {drop.icon} {drop.sponsor} Drop
    </span>
  );
}

export function NationalPassportPanel({ state }) {
  const regions = getNationalPassportView(state);
  const national = state.expansion?.passport?.nationalUnlocked;

  return (
    <div className="card national-passport-panel">
      <h3>
        <Map size={18} /> {national ? 'United States Passport' : 'National Expansion'}
      </h3>
      <p>
        {national
          ? 'You unlocked the nationwide passport — explore across states.'
          : 'Visit 3 regions to unlock the United States Passport.'}
      </p>
      <div className="national-regions">
        {regions.map((region) => (
          <div className={`region-block ${region.visited ? 'visited' : ''}`} key={region.id}>
            <b>{region.label}</b>
            <div className="region-cities">
              {region.cities.map((city) => (
                <span key={city.name} className={city.stamped ? 'stamped' : ''}>
                  {city.stamped ? '✓' : '○'} {city.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinderModeSelector({ value, onChange }) {
  return (
    <div className="finder-mode-selector">
      <label>Experience Mode</label>
      <div className="finder-mode-options">
        {[
          [FINDER_MODES.TRADITIONAL, 'Traditional', 'GPS clues only'],
          [FINDER_MODES.FINDER, 'Finder', 'Signal → distance → tap'],
          [FINDER_MODES.AR_ENHANCED, 'AR Enhanced', 'Camera AR medallion'],
        ].map(([mode, label, desc]) => (
          <button
            key={mode}
            type="button"
            className={`card mini ${value === mode ? 'active' : ''}`}
            onClick={() => onChange(mode)}
          >
            <b>{label}</b>
            <small>{desc}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ArAssetSelector({ value, onChange }) {
  return (
    <>
      <label>AR Medallion Style</label>
      <select value={value || 'ghost_lantern'} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(AR_ASSET_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </>
  );
}

export function ARFinderOverlay({ adventure, inCaptureRange, onCapture, capturing }) {
  const videoRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const asset = adventure.arAssetType || 'ghost_lantern';
  const assetLabel = AR_ASSET_LABELS[asset] || '🥇 AR Medallion';

  useEffect(() => {
    let stream;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError('');
      } catch {
        setCameraError('Camera unavailable — use tap capture below.');
      }
    }
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="ar-finder-overlay">
      <video ref={videoRef} autoPlay playsInline muted className="ar-camera-feed" />
      <div className="ar-scene">
        <div className={`ar-medallion-float ${inCaptureRange ? 'capture-ready' : ''}`}>
          <span className="ar-asset-icon">{assetLabel.split(' ')[0]}</span>
          <p>{assetLabel.replace(/^[^\s]+\s/, '')}</p>
        </div>
        <p className="ar-hint">
          {inCaptureRange ? 'Medallion in range — capture now!' : 'Move closer to reveal the AR medallion'}
        </p>
      </div>
      {cameraError && <p className="admin-meta">{cameraError}</p>}
      <button type="button" disabled={!inCaptureRange || capturing} onClick={onCapture}>
        <Camera size={18} /> {capturing ? 'Capturing…' : 'Capture AR Medallion'}
      </button>
    </div>
  );
}

export function ExpansionPremiumGate({ adventure, state, onUnlock, children }) {
  const needsSub = isPremiumAdventure(adventure) && !isPremiumSubscriber(state);
  if (!needsSub) return children;
  return (
    <div className="card premium-gate expansion-gate">
      <Crown size={24} />
      <h3>Premium Hunt</h3>
      <p>Subscribe to Questory Premium for unlimited access, or unlock with coins.</p>
      {children}
      <button type="button" className="ghost" onClick={onUnlock}>
        Unlock with coins instead
      </button>
    </div>
  );
}
