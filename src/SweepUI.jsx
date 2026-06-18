import React, { useRef, useState } from 'react';
import {
  Award,
  ChevronRight,
  Compass,
  Crown,
  Download,
  Flame,
  MapPin,
  Medal,
  Share2,
  Sparkles,
  Star,
  Trophy,
  Users,
  Clock,
  Building2,
} from 'lucide-react';
import {
  BADGE_DEFS,
  COIN_REWARDS,
  countPublishedHunts,
  formatDifficulty,
  formatEstimatedTime,
  getAllCollectionProgress,
  getCollectionDef,
  getGreetingName,
  getLeaderboard,
  getNearCompleteCollections,
  getPassportData,
  getTimeGreeting,
  parseMilesEstimate,
} from './engagement';
import { getAdventureProgress, getPublishedAdventures, getSponsorInfo } from './seed';
import {
  copyShareText,
  downloadProofCard,
  downloadSocialCard,
  formatProofDate,
} from './share';
import {
  AdventureRatingDisplay,
  ExpandedVaultTabs,
  SeasonalEventsBanner,
  SponsoredLeaderboardsPanel,
  VerifiedSponsorBadge,
} from './EconomyUI';
import { getCreatorForAdventure } from './economy';
import { computeAdventureHeat, getHeatCategory, getHeatLabel } from './social';
import { HeatDiscovery, SeasonRankCard } from './SocialUI';
import {
  LegendaryHuntBadge,
  CashHuntBadge,
  SponsoredDropBadge,
  PremiumSubscriptionBadge,
  NationalPassportPanel,
} from './ExpansionUI';

export function GoodMorningHome({ state, adventures, auth, nav }) {
  const greeting = getTimeGreeting();
  const name = getGreetingName(auth, state);
  const streak = state.engagement?.streak?.count || 0;
  const published = getPublishedAdventures(adventures);
  const nearComplete = getNearCompleteCollections(state, adventures);

  return (
    <>
      <section className="hero home-greeting">
        <div className="badge alpha">Sweep #4 · The Platform Expansion</div>
        <h2>
          {greeting}, {name}
        </h2>
        <p>AR medallions, cash hunts, creator storefronts — turn your city into an adventure.</p>
      </section>

      <PremiumSubscriptionBadge state={state} />
      <SeasonRankCard state={state} />

      <div className="card streak-card">
        <div className="streak-row">
          <Flame size={22} className="streak-icon" />
          <div>
            <strong>{streak} Day Streak</strong>
            <p>
              Tomorrow: +{COIN_REWARDS.STREAK_BONUS} bonus coins · Daily login +{COIN_REWARDS.DAILY_LOGIN}
            </p>
          </div>
        </div>
      </div>

      <SeasonalEventsBanner state={state} />

      <div className="card home-stat-card">
        <h3>Nearby</h3>
        <p>
          <Compass size={16} /> {countPublishedHunts(published)} hunts ready to explore
        </p>
        <p>
          <Sparkles size={16} /> Daily bonus: +{COIN_REWARDS.DAILY_LOGIN} coins claimed on open
        </p>
      </div>

      {nearComplete.length > 0 && (
        <div className="card collection-near-card">
          <h3>Collections Near Completion</h3>
          {nearComplete.map((c) => (
            <div className="collection-progress-row" key={c.collectionId}>
              <div>
                <strong>{c.name}</strong>
                <small>
                  {c.found} / {c.total} Found · {c.pct}% Complete
                </small>
              </div>
              <div className="progress compact">
                <i style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid home-quick-grid">
        <button type="button" className="card mini home-quick-btn" onClick={() => nav('feed')}>
          <Compass size={20} />
          <b>Explore Hunts</b>
          <p>Collections, badges, and live drops</p>
        </button>
        <button type="button" className="card mini home-quick-btn" onClick={() => nav('vault')}>
          <Medal size={20} />
          <b>Passport</b>
          <p>Track collections by city</p>
        </button>
        <button type="button" className="card mini home-quick-btn" onClick={() => nav('platform')}>
          <Building2 size={20} />
          <b>Platform</b>
          <p>AR, cash hunts, premium, studios</p>
        </button>
        <button type="button" className="card mini home-quick-btn" onClick={() => nav('social')}>
          <Users size={20} />
          <b>Social</b>
          <p>Teams, friends, stories, challenges</p>
        </button>
        <button type="button" className="card mini home-quick-btn" onClick={() => nav('leaderboard')}>
          <Trophy size={20} />
          <b>Leaderboards</b>
          <p>Local · State · National</p>
        </button>
        {(auth?.isSponsor || auth?.isAdmin) && (
          <button type="button" className="card mini home-quick-btn" onClick={() => nav('sponsor')}>
            <Building2 size={20} />
            <b>Sponsor Dashboard</b>
            <p>Analytics, coupons, campaigns</p>
          </button>
        )}
      </div>

      <HeatDiscovery adventures={adventures} state={state} nav={nav} />
    </>
  );
}

export function EnhancedAdventureFeed({ adventures, state, nav, auth }) {
  const published = getPublishedAdventures(adventures);

  return (
    <>
      <div className="section-head">
        <h2>Explore Feed</h2>
        <p>Collections, badges, and hunts near you</p>
      </div>
      {!published.length && (
        <div className="card empty-vault">
          <Compass size={28} />
          <p>No published adventures yet. Publish a draft from Admin.</p>
        </div>
      )}
      {published.map((adventure) => (
        <AdventureFeedCard
          key={adventure.id}
          adventure={adventure}
          progress={getAdventureProgress(state, adventure.id)}
          state={state}
          nav={nav}
        />
      ))}
    </>
  );
}

function AdventureFeedCard({ adventure, progress, state, nav }) {
  const collection = getCollectionDef(adventure.collectionId);
  const completed = progress.claimed;
  const creator = getCreatorForAdventure(adventure);
  const heat = computeAdventureHeat(adventure, state);
  const heatCat = adventure.heatCategory || getHeatCategory(adventure);

  return (
    <div className={`card hunt feed-card ${adventure.isFounderHunt ? 'founder-hunt' : ''}`}>
      <div className="row">
        {adventure.isFounderHunt ? (
          <span className="badge founder-badge">
            <Crown size={12} /> Founder Hunt
          </span>
        ) : adventure.tier === 'premium' ? (
          <span className="badge published">Premium · {adventure.premiumCoinCost || 250} coins</span>
        ) : (
          <span className="badge published">Live</span>
        )}
        <span className="heat-badge">{getHeatLabel(heatCat)} · {heat}°</span>
        <LegendaryHuntBadge adventure={adventure} />
        <CashHuntBadge adventure={adventure} />
        <SponsoredDropBadge adventure={adventure} />
        <small>{adventure.distance || `${parseMilesEstimate(adventure)} mi`}</small>
      </div>
      <h3>{adventure.title}</h3>
      <VerifiedSponsorBadge adventure={adventure} />
      {collection && (
        <p className="feed-collection">
          <Star size={14} /> {collection.name}
        </p>
      )}
      <p className="location">
        <MapPin size={14} /> {adventure.location}
        {adventure.distanceAway != null && (
          <span className="feed-distance"> · {adventure.distanceAway}</span>
        )}
      </p>
      <div className="feed-meta-row">
        <span>
          <Clock size={13} /> {formatEstimatedTime(adventure.estimatedMinutes)}
        </span>
        <span>{formatDifficulty(adventure.difficulty)}</span>
        <span>
          <Users size={13} /> {adventure.playersCompleted || 0} completed
        </span>
        <AdventureRatingDisplay adventure={adventure} state={state} />
      </div>
      <button
        type="button"
        className="ghost creator-link"
        onClick={() => nav('creator', null, { creatorId: creator.id })}
      >
        By {creator.name} · Follow
      </button>
      {adventure.firstFinderName && (
        <p className="feed-first-finder">
          <Crown size={13} /> First Finder: {adventure.firstFinderName}
        </p>
      )}
      {collection?.badgeLabel && (
        <p className="feed-badge-hint">
          <Medal size={13} /> Collection badge: {collection.badgeLabel}
        </p>
      )}
      <SponsorBlockCompact adventure={adventure} />
      <div className="chips">
        <span>{adventure.prize}</span>
        {completed && <span className="chip-done">Completed</span>}
      </div>
      <button type="button" onClick={() => nav('detail', adventure.id, { adminPreview: false })}>
        View Adventure
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function SponsorBlockCompact({ adventure }) {
  const sponsor = getSponsorInfo(adventure);
  if (!sponsor.name) return null;
  return <p className="feed-sponsor">Sponsored by {sponsor.name}</p>;
}

export function QuestoryPassport({ state, adventures, onRedeem }) {
  const [tab, setTab] = useState('passport');
  const passport = getPassportData(state, adventures);
  const collections = getAllCollectionProgress(state, adventures);
  const badges = (state.engagement?.badges || [])
    .map((id) => BADGE_DEFS[id])
    .filter(Boolean);

  return (
    <>
      <div className="section-head">
        <h2>Questory Passport</h2>
        <p>Collections, badges, and rewards across your journey</p>
      </div>

      <div className="vault-tabs">
        <button type="button" className={tab === 'passport' ? 'active' : ''} onClick={() => setTab('passport')}>
          Passport
        </button>
        <button type="button" className={tab === 'rewards' ? 'active' : ''} onClick={() => setTab('rewards')}>
          Rewards
        </button>
        <button type="button" className={tab === 'badges' ? 'active' : ''} onClick={() => setTab('badges')}>
          Badges
        </button>
      </div>

      <div className="card balance">
        <h3>{state.coins} Coins</h3>
        <p>{state.entries} Community Pot Entries · Display only for now</p>
      </div>

      {tab === 'passport' && (
        <>
          <NationalPassportPanel state={state} />
          {passport.map((region) => (
            <div className="card passport-region" key={region.region}>
              <h3>{region.region.toUpperCase()}</h3>
              {region.cities.map((city) => (
                <div className="passport-city" key={`${region.region}-${city.city}`}>
                  <div className="passport-city-head">
                    <strong>{city.city}</strong>
                    <span>
                      {city.found} / {city.total}
                    </span>
                  </div>
                  {city.collections.map((c) => (
                    <div className="passport-collection" key={c.collectionId}>
                      <span>{c.complete ? '☑' : '⬜'}</span>
                      <div>
                        <b>{c.name}</b>
                        <small>
                          {c.found} / {c.total} Found · {c.pct}%
                        </small>
                        <div className="progress compact">
                          <i style={{ width: `${c.pct}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {collections.map((c) => c.complete && (
            <div className="card collection-complete-card" key={c.collectionId}>
              <h4>🏆 {c.badgeLabel || c.name} Complete</h4>
              <p>+{c.rewardCoins || 500} coins · {c.exclusiveMedallion}</p>
            </div>
          ))}
        </>
      )}

      {tab === 'badges' && (
        <>
          {!badges.length ? (
            <div className="card empty-vault">
              <Medal size={28} />
              <p>Complete hunts and collections to earn badges.</p>
            </div>
          ) : (
            <div className="badge-grid">
              {badges.map((b) => (
                <div className="card badge-card" key={b.id}>
                  <span className="badge-icon">{b.icon}</span>
                  <b>{b.label}</b>
                  <small>{b.desc}</small>
                </div>
              ))}
            </div>
          )}
          <div className="card badge-catalog">
            <h4>Badge Catalog</h4>
            {Object.values(BADGE_DEFS).map((b) => (
              <div className="badge-catalog-row" key={b.id}>
                <span>{b.icon}</span>
                <div>
                  <b>{b.label}</b>
                  <small>{b.desc}</small>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'rewards' && (
        <ExpandedVaultTabs state={state} adventures={adventures} onRedeem={onRedeem} />
      )}
    </>
  );
}

function RewardVaultTab({ state, onRedeem }) {
  const [pendingRedeem, setPendingRedeem] = useState(null);

  return (
    <div className="vault-embed">
      {pendingRedeem && onRedeem && (
        <div className="modal-overlay">
          <div className="card redeem-modal">
            <h2>Redeem Reward</h2>
            <p className="redeem-title">{pendingRedeem.title}</p>
            <p className="redeem-desc">{pendingRedeem.desc}</p>
            <button type="button" onClick={() => { onRedeem(pendingRedeem.id); setPendingRedeem(null); }}>
              Confirm Redemption
            </button>
            <button type="button" className="ghost" onClick={() => setPendingRedeem(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <p className="admin-meta">Active rewards from completed adventures</p>
      {!state.rewards.length && (
        <div className="card empty-vault">
          <Medal size={28} />
          <p>No rewards yet. Complete a hunt to fill your passport.</p>
        </div>
      )}
      {state.rewards.map((r) => (
        <div className="card reward" key={r.id}>
          <span>{r.icon}</span>
          <div>
            <b>{r.title}</b>
            <p>{r.desc}</p>
            {onRedeem && r.status === 'active' && (
              <button type="button" className="ghost" onClick={() => setPendingRedeem(r)}>
                Redeem
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeaderboardScreen({ state, adventures }) {
  const [scope, setScope] = useState('local');
  const rows = getLeaderboard(scope, state);
  const stats = [
    ['Coins', 'coins'],
    ['Collections', 'collections'],
    ['Badges', 'badges'],
    ['Adventures', 'adventures'],
    ['Miles Walked', 'miles'],
    ["Founder Hunts", 'founderHunts'],
  ];

  return (
    <>
      <div className="section-head">
        <h2>Leaderboards</h2>
        <p>Compete locally, statewide, and nationally</p>
      </div>
      <div className="vault-tabs">
        {['local', 'state', 'national'].map((s) => (
          <button
            key={s}
            type="button"
            className={scope === s ? 'active' : ''}
            onClick={() => setScope(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <SponsoredLeaderboardsPanel />
      <div className="card leaderboard-card">
        {rows.map((row, i) => (
          <div className={`leaderboard-row ${row.isYou ? 'you' : ''}`} key={`${row.name}-${i}`}>
            <span className="lb-rank">#{i + 1}</span>
            <div className="lb-name">
              <b>{row.name}</b>
              {row.isYou && <small>You</small>}
            </div>
            <div className="lb-stats">
              {stats.map(([label, key]) => (
                <span key={key}>
                  {label}: <strong>{row[key]}</strong>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function EnhancedVictoryScreen({ certificate, nav, engagementUpdate }) {
  const cardRef = useRef(null);
  const socialRef = useRef(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [downloading, setDownloading] = useState(false);

  async function handleCopy() {
    try {
      await copyShareText(certificate.shareText);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch {
      setCopyFeedback('Copy failed');
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: certificate.shareText });
        return;
      } catch {
        /* cancelled */
      }
    }
    handleCopy();
  }

  async function handleDownload(type = 'proof') {
    const el = type === 'social' ? socialRef.current : cardRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const slug = certificate.adventureName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (type === 'social') {
        await downloadSocialCard(el, `questory-${slug}-social.png`);
      } else {
        await downloadProofCard(el, `questory-${slug}.png`);
      }
    } catch {
      alert('Could not generate image. Try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="victory-hero card">
        <div className="victory-icon">
          <Award size={40} />
        </div>
        <div className="badge verified-badge">
          <Sparkles size={14} /> Questory Certified Explorer
        </div>
        <h2>Victory!</h2>
        <p className="victory-adventure">{certificate.adventureName}</p>
        <p className="victory-reward">{certificate.rewardName}</p>
        {certificate.collectionName && (
          <p className="victory-collection">Collection: {certificate.collectionName}</p>
        )}
        <small className="victory-date">
          Completed {formatProofDate(certificate.completedAt)}
        </small>
      </div>

      {engagementUpdate && (
        <div className="card victory-rewards-summary">
          <h4>Rewards Earned</h4>
          <p>+{engagementUpdate.coins} coins</p>
          {engagementUpdate.newlyCompletedCollections?.length > 0 && (
            <p>🏆 Collection completed! Bonus coins awarded.</p>
          )}
          {engagementUpdate.isFirstFinder && <p>🥇 First Finder bonus!</p>}
          {engagementUpdate.isFounder && <p>👑 Founder Hunt reward!</p>}
        </div>
      )}

      <div className="proof-card" ref={cardRef}>
        <div className="proof-brand">QUESTORY</div>
        <div className="proof-subtitle">Adventure Certificate</div>
        <div className="proof-adventure">{certificate.adventureName}</div>
        <div className="proof-reward">{certificate.rewardName}</div>
        <div className="proof-verified">
          <Award size={16} />
          Certified Explorer · {formatProofDate(certificate.completedAt)}
        </div>
      </div>

      <div className="social-card" ref={socialRef}>
        <div className="social-card-brand">QUESTORY</div>
        <div className="social-card-title">Certified Explorer</div>
        <div className="social-card-adventure">{certificate.adventureName}</div>
        <div className="social-card-date">Completed {formatProofDate(certificate.completedAt)}</div>
        <div className="social-card-footer">Every city has a story waiting to be found.</div>
      </div>

      <div className="share-actions">
        <button type="button" onClick={handleShare}>
          <Share2 size={18} /> Share
        </button>
        <button type="button" className="ghost" onClick={() => handleDownload('social')} disabled={downloading}>
          <Download size={18} /> {downloading ? 'Generating…' : 'Share Image'}
        </button>
        <button type="button" className="ghost" onClick={() => handleDownload('proof')} disabled={downloading}>
          <Download size={18} /> Download Certificate
        </button>
        <button type="button" className="ghost" onClick={() => nav('vault')}>
          <Medal size={18} /> Open Passport
        </button>
      </div>

      <p className="share-preview">{certificate.shareText}</p>
    </>
  );
}

export function CollectionProgressCard({ collectionId, state, adventures }) {
  const collections = getAllCollectionProgress(state, adventures);
  const c = collections.find((x) => x.collectionId === collectionId);
  if (!c) return null;
  return (
    <div className="card collection-progress-card">
      <h4>{c.name}</h4>
      <p>
        {c.found} / {c.total} Found · {c.pct}% Complete
      </p>
      <div className="progress">
        <i style={{ width: `${c.pct}%` }} />
      </div>
      {c.badgeLabel && <small>🏆 Reward: {c.badgeLabel}</small>}
    </div>
  );
}
