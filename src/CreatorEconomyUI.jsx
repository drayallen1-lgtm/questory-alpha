import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Crown,
  Globe,
  ShieldCheck,
  Star,
  Store,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import {
  EXTENSION_HOOKS,
  followCreator,
  getCreatorEconomySnapshot,
  simulateStorePurchase,
  subscribeCreator,
} from './creatorEconomyEngine';

const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'followers', label: 'Followers' },
  { id: 'subscribers', label: 'Subscribers' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'worlds', label: 'Worlds' },
  { id: 'adventures', label: 'Adventures' },
  { id: 'collections', label: 'Collections' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'verification', label: 'Verification' },
  { id: 'store', label: 'Store' },
];

function MetricCard({ label, value, sub }) {
  return (
    <div className="card mini creator-metric">
      <small>{label}</small>
      <strong>{value}</strong>
      {sub && <span className="creator-metric-sub">{sub}</span>}
    </div>
  );
}

function AnalyticsSection({ analytics }) {
  if (!analytics) return null;
  return (
    <div className="creator-analytics-grid">
      <MetricCard label="Daily players" value={analytics.dailyPlayers} />
      <MetricCard label="Weekly players" value={analytics.weeklyPlayers} />
      <MetricCard label="Monthly players" value={analytics.monthlyPlayers} />
      <MetricCard label="Completion" value={`${analytics.completionPct}%`} />
      <MetricCard label="Abandon rate" value={`${analytics.abandonPct}%`} />
      <MetricCard label="Avg play time" value={`${analytics.avgPlayMinutes}m`} />
      <MetricCard label="Followers gained" value={`+${analytics.followersGained}`} />
      <MetricCard label="Subscriber growth" value={`+${analytics.subscriberGrowth}`} />
      <MetricCard label="Repeat players" value={analytics.repeatPlayers} />
    </div>
  );
}

export function CreatorDashboard({ state, setState, adventures, nav, creatorId = 'parsons-heritage' }) {
  const [tab, setTab] = useState('overview');
  const [storeMsg, setStoreMsg] = useState('');

  const snapshot = useMemo(
    () => getCreatorEconomySnapshot(state, adventures, { creatorId }),
    [state, adventures, creatorId]
  );
  const creator = snapshot.creatorById[creatorId] || snapshot.creators[0];
  if (!creator) return null;

  const handleStoreBuy = (itemId) => {
    const result = simulateStorePurchase(state, itemId);
    if (!result.ok) {
      setStoreMsg(result.message);
      return;
    }
    setState(result.state);
    setStoreMsg(result.duplicate ? 'Already owned' : `Purchased ${result.item.label}`);
  };

  return (
    <div className="creator-dashboard">
      <div className="section-head">
        <div>
          <h2>Creator Dashboard</h2>
          <p>{creator.name} · Level {creator.level} · {creator.rank.label}</p>
        </div>
        <button type="button" className="ghost" onClick={() => nav('creator', null, { creatorId: creator.id })}>
          View Profile
        </button>
      </div>

      <div
        className="creator-dashboard-banner"
        style={{ background: creator.banner }}
      >
        <span className="creator-dashboard-avatar">{creator.avatar}</span>
        <div>
          <h3>{creator.name}</h3>
          <p>{creator.bio}</p>
          <div className="creator-dashboard-badges">
            {creator.verificationBadges.slice(0, 4).map((b) => (
              <span key={b.id} className={`creator-badge-chip ${b.className}`}>
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="vault-tabs-scroll creator-dashboard-tabs">
        {DASHBOARD_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid creator-metrics-row">
            <MetricCard label="Total Plays" value={creator.totalPlays.toLocaleString()} />
            <MetricCard label="Followers" value={creator.followers.toLocaleString()} />
            <MetricCard label="Subscribers" value={creator.subscribers.toLocaleString()} />
            <MetricCard label="Revenue (sim)" value={`$${creator.analytics.revenue.total}`} />
          </div>
          <div className="card">
            <h4>Reputation</h4>
            <ul className="creator-reputation-list">
              <li>Quality score: <strong>{creator.reputation.adventureQuality}%</strong></li>
              <li>Community score: <strong>{creator.reputation.communityScore}%</strong></li>
              <li>Retention: <strong>{creator.reputation.playerRetention}%</strong></li>
              <li>Avg rating: <strong>{creator.avgRating}</strong></li>
            </ul>
          </div>
        </>
      )}

      {tab === 'revenue' && (
        <div className="card">
          <h4><Wallet size={16} /> Revenue (simulated)</h4>
          <div className="grid creator-metrics-row">
            <MetricCard label="Total" value={`$${creator.analytics.revenue.total}`} />
            <MetricCard label="Premium" value={`$${creator.analytics.revenue.premium}`} />
            <MetricCard label="Tips" value={`$${creator.analytics.revenue.tips}`} />
            <MetricCard label="Subscriptions" value={`$${creator.analytics.revenue.subscriptions}`} />
          </div>
          <p className="admin-meta">Stripe Connect hook ready · payouts disabled in alpha</p>
        </div>
      )}

      {tab === 'followers' && (
        <div className="card">
          <h4><Users size={16} /> Followers</h4>
          <p><strong>{creator.followers.toLocaleString()}</strong> total · +{creator.analytics.followersGained} this week</p>
          <p className="admin-meta">Followers appear in Living World timeline and map pins.</p>
        </div>
      )}

      {tab === 'subscribers' && (
        <div className="card">
          <h4><Star size={16} /> Subscribers</h4>
          <p><strong>{creator.subscribers}</strong> members · +{creator.analytics.subscriberGrowth} growth</p>
          <p className="admin-meta">Members-only adventures unlock with Creator Pass.</p>
        </div>
      )}

      {tab === 'analytics' && (
        <>
          <AnalyticsSection analytics={creator.analytics} />
          <div className="card">
            <h4><BarChart3 size={16} /> Top Adventures</h4>
            <ol className="creator-top-list">
              {creator.analytics.topAdventures.map((a) => (
                <li key={a.id}>{a.label} · {a.plays} plays · {a.completionPct}%</li>
              ))}
            </ol>
          </div>
          <div className="card">
            <h4>Traffic</h4>
            <p>
              {creator.analytics.cityTraffic.map((c) => `${c.city} ${c.pct}%`).join(' · ')}
            </p>
          </div>
        </>
      )}

      {tab === 'worlds' && (
        <div className="card creator-world-card">
          <h4><Globe size={16} /> {creator.world.worldTitle}</h4>
          <p>{creator.world.completionPct}% world completion</p>
          <p>Collections: {creator.world.collections.join(', ') || '—'}</p>
          <p>Story arcs: {creator.world.storyArcs.join(', ') || '—'}</p>
          <p>Bosses: {creator.world.bosses.join(', ') || '—'}</p>
        </div>
      )}

      {tab === 'adventures' && (
        <div className="card">
          <h4>Active Adventures</h4>
          {creator.adventures.map((a) => (
            <button
              key={a.id}
              type="button"
              className="ghost creator-adventure-link"
              onClick={() => nav('detail', a.id)}
            >
              {a.title} · {a.access} · {a.plays} plays
            </button>
          ))}
        </div>
      )}

      {tab === 'collections' && (
        <div className="card">
          <h4>Collections</h4>
          {creator.world.collections.map((c) => (
            <div key={c} className="creator-collection-row">{c}</div>
          ))}
        </div>
      )}

      {tab === 'sponsors' && (
        <div className="card">
          <h4>Sponsor Level: {creator.sponsorLevel}</h4>
          <div className="chips">
            {creator.sponsorPartners.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      )}

      {tab === 'verification' && (
        <div className="card">
          <h4><ShieldCheck size={16} /> Verification</h4>
          <div className="creator-verification-grid">
            {creator.verificationBadges.map((b) => (
              <span key={b.id} className={`creator-badge-chip ${b.className}`}>
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === 'store' && (
        <div className="card">
          <h4><Store size={16} /> Creator Store</h4>
          <p className="admin-meta">Simulated purchases · Stripe hook ready</p>
          {storeMsg && <p className="loc-feedback">{storeMsg}</p>}
          <div className="creator-store-grid">
            {snapshot.storeCatalog.map((item) => (
              <button
                key={item.id}
                type="button"
                className="creator-store-item"
                onClick={() => handleStoreBuy(item.id)}
                disabled={item.placeholder}
              >
                <span>{item.icon}</span>
                <strong>{item.label}</strong>
                <small>{item.placeholder ? 'Coming soon' : `${item.priceCoins} coins`}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card creator-hooks-card">
        <h4>Future Hooks</h4>
        <ul className="creator-hooks-list">
          {Object.entries(EXTENSION_HOOKS).map(([key, hook]) => (
            <li key={key}>
              {hook.label} · {hook.enabled ? 'ready' : 'planned'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CreatorPassportPanel({ state, setState, adventures, nav }) {
  const snapshot = useMemo(
    () => getCreatorEconomySnapshot(state, adventures),
    [state, adventures]
  );

  return (
    <div className="creator-passport-panel">
      <p className="admin-meta">Follow creators like YouTubers — get notified on new worlds and bosses.</p>

      <div className="card">
        <h4><UserPlus size={16} /> Followed Creators</h4>
        {!snapshot.followedCreators.length && <p>No follows yet. Explore the feed to find creators.</p>}
        {snapshot.followedCreators.map((c) => (
          <div key={c.id} className="creator-passport-row">
            <button type="button" className="ghost" onClick={() => nav('creator', null, { creatorId: c.id })}>
              {c.avatar} {c.name}
            </button>
            <button type="button" className="ghost" onClick={() => setState((s) => followCreator(s, c.id))}>
              Unfollow
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h4><Star size={16} /> Subscriptions</h4>
        {snapshot.subscribedCreators.map((c) => (
          <div key={c.id} className="creator-passport-row">
            <span>{c.name}</span>
            <button type="button" className="ghost" onClick={() => setState((s) => subscribeCreator(s, c.id))}>
              Cancel
            </button>
          </div>
        ))}
        {!snapshot.subscribedCreators.length && <p>No active subscriptions.</p>}
      </div>

      <div className="card">
        <h4><Globe size={16} /> Favorite Worlds</h4>
        {snapshot.favoriteWorlds.map((w) => (
          <div key={w.creatorWorldId} className="creator-passport-row">
            <span>{w.worldTitle}</span>
            <small>{w.creatorName}</small>
          </div>
        ))}
        {!snapshot.favoriteWorlds.length && <p>Star a creator world from their profile.</p>}
      </div>

      <div className="card">
        <h4><TrendingUp size={16} /> Trending Creators</h4>
        {snapshot.trendingCreators.map((c) => (
          <button
            key={c.id}
            type="button"
            className="ghost creator-passport-trend"
            onClick={() => nav('creator', null, { creatorId: c.id })}
          >
            {c.name} · {c.totalPlays.toLocaleString()} plays
            {!snapshot.following.includes(c.id) && (
              <span
                className="creator-passport-follow"
                onClick={(e) => {
                  e.stopPropagation();
                  setState((s) => followCreator(s, c.id));
                }}
              >
                Follow
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card">
        <h4><Crown size={16} /> Premium Ownership</h4>
        <p>{snapshot.premiumOwnership.length} premium adventures unlocked</p>
        <p>{snapshot.ownedStoreItems.length} store items owned</p>
      </div>

      <button type="button" onClick={() => nav('creator-dashboard', null, { creatorId: 'parsons-heritage' })}>
        Open Creator Dashboard
      </button>
    </div>
  );
}

export function CreatorProfilePanel({ creatorId, state, setState, adventures, nav }) {
  const snapshot = useMemo(
    () => getCreatorEconomySnapshot(state, adventures, { creatorId }),
    [state, adventures, creatorId]
  );
  const creator = snapshot.creatorById[creatorId];
  if (!creator) return null;

  return (
    <>
      <div className="card creator-profile-enriched">
        <div className="creator-profile-head">
          <span className="creator-dashboard-avatar">{creator.avatar}</span>
          <div>
            <h2>{creator.name}</h2>
            {creator.verificationBadges.slice(0, 2).map((b) => (
              <span key={b.id} className={`creator-badge-chip ${b.className}`}>
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        </div>
        <p>{creator.bio}</p>
        <div className="creator-stats creator-stats-grid">
          <span>Lv {creator.level}</span>
          <span>{creator.rank.icon} {creator.rank.label}</span>
          <span>{creator.followers.toLocaleString()} followers</span>
          <span>{creator.avgRating}★</span>
          <span>{creator.totalPlays.toLocaleString()} plays</span>
          <span>{creator.completionPct}% completion</span>
        </div>
        <div className="creator-profile-actions">
          <button type="button" onClick={() => setState((s) => followCreator(s, creator.id))}>
            {creator.isFollowing ? 'Following' : 'Follow'}
          </button>
          <button type="button" className="ghost" onClick={() => setState((s) => subscribeCreator(s, creator.id))}>
            {creator.isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
          <button type="button" className="ghost" onClick={() => nav('creator-dashboard', null, { creatorId: creator.id })}>
            Dashboard
          </button>
        </div>
      </div>

      <div className="card">
        <h4>Creator World — {creator.world.worldTitle}</h4>
        <p>{creator.world.completionPct}% complete · {creator.world.collections.length} collections</p>
        <button type="button" className="ghost" onClick={() => nav('map')}>
          Explore on Map
        </button>
      </div>

      <div className="card">
        <h4>Adventures</h4>
        {creator.adventures.map((a) => (
          <button
            key={a.id}
            type="button"
            className="ghost creator-adventure-link"
            onClick={() => nav('detail', a.id)}
          >
            {a.title} · {a.access}
          </button>
        ))}
      </div>
    </>
  );
}
