import React, { useState } from 'react';
import { formatUserErrorMessage } from './claimSystem';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Coins,
  Crown,
  Pause,
  Play,
  QrCode,
  ShieldCheck,
  Star,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';
import {
  COIN_SPEND,
  CREATOR_PROFILES,
  FREE_ACTIVE_ADVENTURE_LIMIT,
  SEASONAL_EVENTS,
  SPONSORED_LEADERBOARDS,
  canCreateAdventure,
  depositSponsorCredits,
  getAdventureRating,
  getCreatorForAdventure,
  getSponsorAnalytics,
  groupVaultRewards,
  isPremiumAdventure,
  isSponsorVerified,
  redeemCouponByQr,
  toggleFollowCreator,
} from './economy';
import { SponsorMarketplacePanel, CreatorStorefrontTab } from './ExpansionUI';
import { SponsorRewardInventoryPanel } from './RewardInventoryUI';
import { getPublishedAdventures } from './seed';

export function SponsorDashboard({ state, adventures, auth, setState, nav }) {
  const sponsorName =
    auth?.profile?.display_name || auth?.profile?.business_name || "McDonald's Parsons";
  const analytics = getSponsorAnalytics(adventures, state, sponsorName);
  const wallet = state.economy?.sponsorWallet || { balanceCredits: 0 };
  const [qrInput, setQrInput] = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const [paused, setPaused] = useState({});

  function handleDeposit() {
    setState((s) => depositSponsorCredits(s, 125, 'Sponsor credit deposit'));
  }

  function handleScanCoupon() {
    const result = redeemCouponByQr(state, qrInput.trim());
    if (!result.ok) {
      setScanMsg(formatUserErrorMessage(result));
      return;
    }
    setState(result.state);
    setScanMsg(`Redeemed: ${result.reward.title}`);
    setQrInput('');
  }

  return (
    <>
      <div className="section-head">
        <h2>Sponsor Dashboard</h2>
        <p>{sponsorName}</p>
      </div>

      <div className="card sponsor-hero">
        <Building2 size={28} />
        <h3>{sponsorName}</h3>
        {auth?.profile?.role === 'sponsor' && (
          <span className="verified-sponsor-badge">
            <ShieldCheck size={14} /> Verified Sponsor
          </span>
        )}
      </div>

      <div className="grid sponsor-metrics">
        <div className="card mini metric">
          <small>Active Adventures</small>
          <strong>{analytics.activeAdventures}</strong>
        </div>
        <div className="card mini metric">
          <small>Completed Hunts</small>
          <strong>{analytics.completedHunts}</strong>
        </div>
        <div className="card mini metric">
          <small>Coupons Redeemed</small>
          <strong>{analytics.couponsRedeemed}</strong>
        </div>
        <div className="card mini metric">
          <small>Foot Traffic</small>
          <strong>{analytics.footTraffic}</strong>
        </div>
      </div>

      <div className="card">
        <h3>Campaign Analytics</h3>
        <ul className="analytics-list">
          <li>Adventure opens: <strong>{analytics.adventureOpens}</strong></li>
          <li>Completions: <strong>{analytics.completedHunts}</strong></li>
          <li>Coupon redemptions: <strong>{analytics.couponsRedeemed}</strong></li>
          <li>First-time visitors: <strong>{analytics.firstTimeVisitors}</strong></li>
          <li>Repeat visitors: <strong>{analytics.repeatVisitors}</strong></li>
        </ul>
        <div className="sponsor-spend-row">
          <div>
            <small>Questory Spend</small>
            <strong>${analytics.questorySpend}</strong>
          </div>
          <div>
            <small>Estimated Revenue</small>
            <strong>${analytics.estimatedRevenue.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>
          <Wallet size={18} /> Sponsor Wallet
        </h3>
        <p>
          Balance: <strong>${wallet.balanceCredits?.toFixed(2) || '0.00'}</strong> credits
        </p>
        <p className="admin-meta">Stripe-ready · No cash payouts yet</p>
        <button type="button" onClick={handleDeposit}>
          Deposit $125 Credits
        </button>
      </div>

      <div className="card">
        <h3>
          <QrCode size={18} /> Scan Coupon QR
        </h3>
        <input
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value)}
          placeholder="Paste customer coupon QR payload"
        />
        <button type="button" onClick={handleScanCoupon}>
          Mark Redeemed
        </button>
        {scanMsg && <p className="loc-feedback">{scanMsg}</p>}
      </div>

      <div className="card">
        <h3>Campaigns</h3>
        {getPublishedAdventures(adventures)
          .filter((a) => a.sponsor === sponsorName || a.sponsorInfo?.name === sponsorName)
          .map((a) => (
            <div className="campaign-row" key={a.id}>
              <div>
                <b>{a.title}</b>
                <small>{a.playersCompleted || 0} completions</small>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={() => setPaused((p) => ({ ...p, [a.id]: !p[a.id] }))}
              >
                {paused[a.id] ? <Play size={14} /> : <Pause size={14} />}
                {paused[a.id] ? 'Resume' : 'Pause'}
              </button>
            </div>
          ))}
      </div>

      <SponsorRewardInventoryPanel
        state={state}
        setState={setState}
        adventures={adventures}
        sponsorName={sponsorName}
      />

      <SponsorMarketplacePanel state={state} setState={setState} />

      <button type="button" className="ghost" onClick={() => nav('create')}>
        Create Sponsored Adventure
      </button>
    </>
  );
}

export function CreatorProfileScreen({ creatorId, state, setState, nav, adventures }) {
  const creator = CREATOR_PROFILES[creatorId] || Object.values(CREATOR_PROFILES)[0];
  const following = (state.economy?.follows || []).includes(creator.id);
  const creatorAdventures = adventures.filter(
    (a) => a.creatorProfileId === creator.id || getCreatorForAdventure(a).id === creator.id
  );

  return (
    <>
      <button type="button" className="ghost back" onClick={() => nav('feed')}>
        ← Explore Feed
      </button>
      <div className="card creator-hero">
        {creator.verified && (
          <span className="verified-sponsor-badge">
            <ShieldCheck size={14} /> Verified Creator
          </span>
        )}
        <h2>{creator.name}</h2>
        <p>{creator.bio}</p>
        <div className="creator-stats">
          <span>
            <Star size={14} /> {creator.rating} ({creator.reviewCount} reviews)
          </span>
          <span>{creator.adventuresCreated} Adventures</span>
          <span>{creator.completions.toLocaleString()} Completions</span>
          <span>{creator.followers + (following ? 1 : 0)} Followers</span>
        </div>
        <button
          type="button"
          onClick={() => setState((s) => toggleFollowCreator(s, creator.id))}
        >
          <UserPlus size={16} /> {following ? 'Following' : 'Follow Creator'}
        </button>
      </div>

      {creator.sponsorPartners?.length > 0 && (
        <div className="card">
          <h3>Sponsor Partners</h3>
          <div className="chips">
            {creator.sponsorPartners.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      )}

      <CreatorStorefrontTab state={state} setState={setState} creatorId={creator.id} />

      <div className="card">
        <h3>Adventures</h3>
        {creatorAdventures.map((a) => (
          <button
            key={a.id}
            type="button"
            className="ghost creator-adventure-link"
            onClick={() => nav('detail', a.id)}
          >
            {a.title}
            {isPremiumAdventure(a) && ' · Premium'}
          </button>
        ))}
      </div>
    </>
  );
}

export function CoinShopPanel({ adventure, state, progress, onSpend, clueIndex }) {
  const economy = state.economy || {};

  return (
    <div className="card coin-shop">
      <h4>
        <Coins size={16} /> Spend Coins · {state.coins} available
      </h4>
      <div className="coin-shop-grid">
        <button type="button" className="ghost" onClick={() => onSpend('hint')}>
          Hint · {COIN_SPEND.HINT}
          {economy.hintUnlocks?.[`${adventure.id}:${clueIndex}`] && ' ✓'}
        </button>
        <button type="button" className="ghost" onClick={() => onSpend('skip')}>
          Skip Clue · {COIN_SPEND.SKIP_CLUE}
        </button>
        <button type="button" className="ghost" onClick={() => onSpend('reveal')}>
          Reveal Search · {COIN_SPEND.REVEAL_SEARCH_RADIUS}
        </button>
        <button type="button" className="ghost" onClick={() => onSpend('medallion')}>
          Exclusive Medallion · {COIN_SPEND.EXCLUSIVE_MEDALLION}
        </button>
      </div>
    </div>
  );
}

export function PremiumGate({ adventure, state, onUnlock }) {
  if (!isPremiumAdventure(adventure)) return null;
  if ((state.economy?.premiumUnlocks || []).includes(adventure.id)) return null;
  const cost = adventure.premiumCoinCost || COIN_SPEND.PREMIUM_ADVENTURE;
  return (
    <div className="card premium-gate">
      <Crown size={24} />
      <h3>Premium Hunt</h3>
      <p>Admission: {cost} Coins</p>
      <p className="admin-meta">Creator earns 70% · Questory 30% (virtual split)</p>
      <button type="button" onClick={onUnlock}>
        Unlock for {cost} Coins
      </button>
    </div>
  );
}

export function RatingModal({ adventure, onSubmit, onSkip }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  return (
    <div className="modal-overlay">
      <div className="card rating-modal">
        <h2>Rate Your Adventure</h2>
        <p>{adventure.title}</p>
        <div className="star-picker">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={n <= rating ? 'star active' : 'star'}
              onClick={() => setRating(n)}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Leave a review (optional)"
          rows={3}
        />
        <button type="button" onClick={() => onSubmit(rating, review)}>
          Submit Review
        </button>
        <button type="button" className="ghost" onClick={onSkip}>
          Skip
        </button>
      </div>
    </div>
  );
}

export function ExpandedVaultTabs({ state, adventures, onRedeem }) {
  const [tab, setTab] = useState('medallions');
  const groups = groupVaultRewards(state.rewards || [], state, adventures);

  const tabs = [
    ['medallions', 'Medallions', groups.medallions],
    ['coupons', 'Coupons', groups.coupons],
    ['certificates', 'Certificates', groups.certificates],
    ['collections', 'Collections', groups.collections],
    ['founder', 'Founder Rewards', groups.founder],
    ['premium', 'Premium Unlocks', groups.premium],
  ];

  const active = tabs.find(([id]) => id === tab);

  return (
    <>
      <div className="vault-tabs vault-tabs-scroll">
        {tabs.map(([id, label]) => (
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
      <div className="vault-tab-content">
        {!active?.[2]?.length ? (
          <div className="card empty-vault">
            <p>No {active?.[1]?.toLowerCase()} yet.</p>
          </div>
        ) : (
          active[2].map((item) => (
            <VaultItemCard key={item.id} item={item} onRedeem={onRedeem} />
          ))
        )}
      </div>
    </>
  );
}

function VaultItemCard({ item, onRedeem }) {
  if (item.kind === 'certificate') {
    return (
      <div className="card history-row">
        <CheckCircle2 size={16} />
        <b>{item.adventureName}</b>
        <small>{item.rewardName}</small>
      </div>
    );
  }
  return (
    <div className="card reward">
      <span>{item.icon || '🎁'}</span>
      <div>
        <b>{item.title}</b>
        <p>{item.desc}</p>
        {item.qrPayload && (
          <p className="coupon-qr">
            <QrCode size={12} /> QR: {item.qrPayload}
          </p>
        )}
        {item.expiresAt && (
          <small>Expires {new Date(item.expiresAt).toLocaleDateString()}</small>
        )}
        {item.terms && <small className="coupon-terms">{item.terms}</small>}
        {onRedeem && item.status === 'active' && (item.type === 'coupon' || item.type === 'bonus') && (
          <p className="admin-meta">Show QR to sponsor to redeem</p>
        )}
      </div>
    </div>
  );
}

export function SponsoredLeaderboardsPanel() {
  return (
    <div className="card sponsored-lb">
      <h3>
        <TrendingUp size={18} /> Sponsored Leaderboards
      </h3>
      {SPONSORED_LEADERBOARDS.map((lb) => (
        <div className="sponsored-lb-row" key={lb.id}>
          <small>Sponsored by {lb.sponsorName}</small>
          <b>{lb.title}</b>
          <p>Prize: {lb.prize}</p>
          <span className="admin-meta">
            {lb.period} · Ends {lb.endsAt}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SeasonalEventsBanner({ state }) {
  const active = SEASONAL_EVENTS.filter((e) => e.active);
  if (!active.length) return null;
  return (
    <>
      {active.map((event) => (
        <div className="card seasonal-event" key={event.id}>
          <h3>🎉 {event.name}</h3>
          <p>{event.description}</p>
          <p>
            Prize: {event.badgeLabel} + {event.coinReward} coins
          </p>
          {state.economy?.seasonalProgress?.[event.id] ? (
            <span className="verified-sponsor-badge">Participated ✓</span>
          ) : (
            <small>
              {event.startDate} – {event.endDate}
            </small>
          )}
        </div>
      ))}
    </>
  );
}

export function CreationFeeBanner({ state, auth }) {
  const check = canCreateAdventure(state, {
    isAdmin: auth?.isAdmin,
    isSponsor: auth?.isSponsor,
    userId: auth?.user?.id,
  });
  if (check.ok && auth?.isSponsor) {
    return <p className="admin-meta">Sponsor account: unlimited adventures</p>;
  }
  if (check.ok) {
    return (
      <p className="admin-meta">
        Free slots remaining: {check.remaining} of {FREE_ACTIVE_ADVENTURE_LIMIT}
      </p>
    );
  }
  return (
    <div className="card creation-fee-banner">
      <p>{check.message}</p>
    </div>
  );
}

export function VerifiedSponsorBadge({ adventure }) {
  if (!isSponsorVerified(adventure)) return null;
  return (
    <span className="verified-sponsor-badge">
      <ShieldCheck size={12} /> Verified Sponsor
    </span>
  );
}

export function AdventureRatingDisplay({ adventure, state }) {
  const { avg, count } = getAdventureRating(adventure.id, state, adventure);
  return (
    <span className="feed-rating">
      <Star size={13} /> {avg} ({count} reviews)
    </span>
  );
}

export function CouponRewardDetail({ reward }) {
  if (reward.type !== 'coupon' && reward.type !== 'bonus') return null;
  return (
    <div className="coupon-detail">
      {reward.couponCode && <p className="coupon-code">Code: {reward.couponCode}</p>}
      {reward.qrPayload && (
        <p className="coupon-qr">
          <QrCode size={14} /> {reward.qrPayload}
        </p>
      )}
      {reward.redeemLocation && <p>Redeem at: {reward.redeemLocation}</p>}
      {reward.terms && <small>{reward.terms}</small>}
    </div>
  );
}
