import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  Calendar,
  Copy,
  Gift,
  MapPin,
  Megaphone,
  Moon,
  Share2,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { formatUserErrorMessage, formatSuccessMessage } from './claimSystem';
import {
  GROWTH_ACHIEVEMENTS,
  REFERRAL_REWARDS,
  TONIGHT_THEMES,
  applyGrowthOnCompletion,
  awardReferralAction,
  buildQuestCodeFlyer,
  buildReferralLink,
  computeGrowthCreatorAnalytics,
  createTonightAdventure,
  ensureReferralCode,
  followCreatorFromFeed,
  getAchievementProgress,
  getFollowingFeed,
  getNeighborhoodSummary,
  getNotifications,
  getReferralDashboard,
  getUnreadNotificationCount,
  getWeekendCalendar,
  joinByQuestCode,
  markNotificationsRead,
  mergeAdventureGrowth,
  remixAdventure,
  simulateReferralFriend,
  trackReferralInvite,
} from './growth';
import { markPersonaTested } from './stability';

export function GrowthHomeBanner({ state, setState, nav, adventures }) {
  const neighborhood = getNeighborhoodSummary(adventures, state);
  const unread = getUnreadNotificationCount(state);

  return (
    <>
      <CreateTonightCard state={state} setState={setState} nav={nav} />
      <NeighborhoodModeCard summary={neighborhood} nav={nav} />
      <div className="card growth-referral-teaser">
        <div className="growth-teaser-row">
          <Gift size={22} />
          <div>
            <strong>Invite Friends</strong>
            <p>Earn coins when friends play · {getReferralDashboard(state).coinsEarned} earned</p>
          </div>
          <button type="button" className="ghost" onClick={() => nav('growth')}>
            Invite
          </button>
        </div>
      </div>
      {unread > 0 && (
        <button type="button" className="card growth-notif-banner" onClick={() => nav('growth', null, { growthTab: 'notifications' })}>
          <Bell size={18} />
          <span>{unread} new notifications</span>
        </button>
      )}
    </>
  );
}

export function CreateTonightCard({ state, setState, nav }) {
  const [busy, setBusy] = useState(null);

  async function handleTonight(themeId) {
    setBusy(themeId);
    try {
      const result = createTonightAdventure(state, themeId, { goToInvite: true });
      if (result.ok) {
        setState(result.state);
        if (!result.state.screen || result.state.screen === 'home') {
          nav('invite');
        }
      } else {
        window.alert(formatUserErrorMessage(result));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card create-tonight-card">
      <div className="section-head compact">
        <h3><Moon size={18} /> What do you want tonight?</h3>
        <p>One tap · Adventure generated · Invite sent</p>
      </div>
      <div className="create-tonight-grid">
        {TONIGHT_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className="create-tonight-btn"
            disabled={busy === theme.id}
            onClick={() => handleTonight(theme.id)}
          >
            <span className="create-tonight-icon">{theme.icon}</span>
            <span>{theme.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NeighborhoodModeCard({ summary, nav }) {
  return (
    <div className="card neighborhood-card">
      <div className="section-head compact">
        <h3><MapPin size={18} /> Near You</h3>
      </div>
      <ul className="neighborhood-stats">
        <li>• {summary.adventuresThisWeek} adventures this week</li>
        <li>• {summary.endingSoon} ending soon</li>
        <li>• {summary.hiddenDiscoveries} hidden {summary.hiddenDiscoveries === 1 ? 'discovery' : 'discoveries'}</li>
      </ul>
      <button type="button" className="ghost" onClick={() => nav('feed')}>
        Explore nearby hunts
      </button>
    </div>
  );
}

export function QuestCodeBadge({ adventure }) {
  const code = mergeAdventureGrowth(adventure).questCode;
  if (!code) return null;
  return (
    <span className="badge growth-quest-code">
      <Zap size={11} /> {code}
    </span>
  );
}

export function GrowthEngineHub({ state, setState, adventures, nav, initialTab = 'referrals' }) {
  const [tab, setTab] = useState(initialTab);

  const tabs = [
    ['referrals', 'Invite', Gift],
    ['questcodes', 'Quest Codes', Zap],
    ['feed', 'Following', Users],
    ['notifications', 'Alerts', Bell],
    ['achievements', 'Achievements', Award],
    ['events', 'Weekend', Calendar],
    ['analytics', 'Analytics', BarChart3],
    ['remix', 'Remix', Sparkles],
  ];

  return (
    <>
      <div className="section-head">
        <h2>Growth</h2>
        <p>Referrals · quest codes · community · analytics</p>
      </div>

      <div className="vault-tabs growth-tabs">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'referrals' && <ReferralDashboard state={state} setState={setState} />}
      {tab === 'questcodes' && <QuestCodePanel state={state} setState={setState} adventures={adventures} nav={nav} />}
      {tab === 'feed' && <FollowingFeedPanel state={state} setState={setState} adventures={adventures} nav={nav} />}
      {tab === 'notifications' && <NotificationsPanel state={state} setState={setState} />}
      {tab === 'achievements' && <AchievementsPanel state={state} adventures={adventures} />}
      {tab === 'events' && <WeekendCalendarPanel nav={nav} adventures={adventures} />}
      {tab === 'analytics' && <CreatorAnalyticsPanel adventures={adventures} state={state} />}
      {tab === 'remix' && <RemixPanel state={state} setState={setState} adventures={adventures} nav={nav} />}
    </>
  );
}

export function ReferralDashboard({ state, setState }) {
  const dashboard = getReferralDashboard(ensureReferralCode(state));
  const code = dashboard.code;
  const link = buildReferralLink(code);

  function copyLink() {
    setState((s) => markPersonaTested(trackReferralInvite(ensureReferralCode(s)), 'friend'));
    navigator.clipboard?.writeText(link);
    window.alert('Invite link copied!');
  }

  function demoFriend() {
    const result = simulateReferralFriend(state, `Friend ${dashboard.invited + 1}`);
    if (result.ok) {
      setState(result.state);
      window.alert(formatSuccessMessage(result, `+${result.coins || 0} coins earned!`));
    } else {
      window.alert(formatUserErrorMessage(result));
    }
  }

  return (
    <div className="card growth-referral-panel">
      <h3>Invite Friends</h3>
      <p className="admin-meta">People invite because they benefit.</p>

      <div className="growth-referral-stats">
        <div><strong>{dashboard.invited}</strong><small>invited</small></div>
        <div><strong>{dashboard.completedHunts}</strong><small>completed hunts</small></div>
        <div><strong>{dashboard.coinsEarned}</strong><small>coins earned</small></div>
      </div>

      <div className="growth-referral-code">
        <small>Your code</small>
        <strong>{code}</strong>
        <button type="button" className="ghost" onClick={copyLink}>
          <Copy size={14} /> Copy invite link
        </button>
      </div>

      <h4>Invite Rewards</h4>
      <div className="growth-reward-table">
        {Object.entries(REFERRAL_REWARDS).map(([id, r]) => (
          <div className="growth-reward-row" key={id}>
            <span>{r.label}</span>
            <strong>{r.coins ? `+${r.coins} coins` : 'Cash bonus'}</strong>
          </div>
        ))}
      </div>

      <button type="button" onClick={demoFriend}>
        <Share2 size={16} /> Simulate friend signup (demo)
      </button>
    </div>
  );
}

export function QuestCodePanel({ state, setState, adventures, nav }) {
  const [code, setCode] = useState('');

  function handleJoin(e) {
    e.preventDefault();
    const result = joinByQuestCode(state, code, adventures);
    if (result.ok) {
      setState(result.state);
      nav('detail', result.adventureId);
    } else {
      window.alert(formatUserErrorMessage(result));
    }
  }

  const published = adventures.filter((a) => a.status === 'published').slice(0, 6);

  return (
    <>
      <div className="card growth-quest-join">
        <h3>Enter Quest Code</h3>
        <p className="admin-meta">Join instantly · Share screenshots · Print flyers</p>
        <form onSubmit={handleJoin} className="growth-quest-form">
          <input
            type="text"
            placeholder="e.g. GHOST-DEPOT"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="submit">Join Hunt</button>
        </form>
      </div>

      <div className="card">
        <h4>Live Quest Codes</h4>
        {published.map((adv) => {
          const merged = mergeAdventureGrowth(adv);
          return (
            <div className="growth-quest-row" key={adv.id}>
              <div>
                <strong>{merged.questCode}</strong>
                <small>{adv.title}</small>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(buildQuestCodeFlyer(adv));
                  window.alert('Flyer text copied!');
                }}
              >
                <Copy size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function FollowingFeedPanel({ state, setState, adventures, nav }) {
  const feed = getFollowingFeed(state, adventures);

  return (
    <div className="card growth-feed-panel">
      <h3>Following Feed</h3>
      <p className="admin-meta">Friends · Creators · Sponsors</p>
      {feed.map((item) => (
        <div className={`growth-feed-row ${item.category}`} key={item.id}>
          <span className="growth-feed-cat">{item.category}</span>
          <p>{item.text}</p>
          <small>{item.at}</small>
          {item.adventureId && (
            <button type="button" className="ghost" onClick={() => nav('detail', item.adventureId)}>
              View hunt
            </button>
          )}
          {item.creatorId && (
            <button
              type="button"
              className="ghost"
              onClick={() => setState(followCreatorFromFeed(state, item.creatorId, 'Parsons Heritage'))}
            >
              Follow
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function NotificationsPanel({ state, setState }) {
  const notifications = getNotifications(state);

  return (
    <div className="card growth-notifications-panel">
      <div className="row">
        <h3>Notifications</h3>
        <button type="button" className="ghost" onClick={() => setState(markNotificationsRead(state))}>
          Mark all read
        </button>
      </div>
      {notifications.map((n) => (
        <div className={`growth-notif-row ${n.read ? 'read' : ''}`} key={n.id}>
          <span className="growth-notif-cat">{n.category}</span>
          <p>{n.text}</p>
          <small>{formatNotifTime(n.at)}</small>
        </div>
      ))}
    </div>
  );
}

export function AchievementsPanel({ state, adventures }) {
  const progress = getAchievementProgress(state, adventures);
  const unlocked = state.growth?.achievementsUnlocked || [];

  return (
    <div className="card growth-achievements-panel">
      <h3>Achievements</h3>
      {GROWTH_ACHIEVEMENTS.map((ach) => {
        const value = progress[ach.metric] || 0;
        const done = unlocked.includes(ach.id);
        const pct = Math.min(100, Math.round((value / ach.threshold) * 100));
        return (
          <div className={`growth-achievement-row ${done ? 'unlocked' : ''}`} key={ach.id}>
            <span className="growth-ach-icon">{ach.icon}</span>
            <div>
              <strong>{ach.label}</strong>
              <p>{ach.desc}</p>
              {!done && (
                <div className="progress compact">
                  <i style={{ width: `${pct}%` }} />
                </div>
              )}
              <small>{done ? 'Unlocked ✓' : `${value} / ${ach.threshold}`}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WeekendCalendarPanel({ nav, adventures }) {
  const events = getWeekendCalendar();

  return (
    <div className="card growth-events-panel">
      <h3>This Weekend</h3>
      {events.map((ev) => (
        <div className="growth-event-row" key={ev.id}>
          <div>
            <strong>{ev.day}</strong>
            <p>{ev.title}</p>
            <small>{ev.time} · {ev.sponsor}</small>
          </div>
          {ev.adventureId && (
            <button type="button" className="ghost" onClick={() => nav('detail', ev.adventureId)}>
              Join
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function CreatorAnalyticsPanel({ adventures, state }) {
  const published = adventures.filter((a) => a.status === 'published').slice(0, 5);

  return (
    <>
      <p className="admin-meta">Views · completion · drop-off · sharing — valuable for teachers, sponsors, and tourism boards.</p>
      {published.map((adv) => {
        const stats = computeGrowthCreatorAnalytics(adv, state);
        return (
          <div className="card growth-analytics-card" key={adv.id}>
            <h4>{adv.title}</h4>
            <div className="growth-analytics-grid">
              <div><small>Views</small><strong>{stats.views.toLocaleString()}</strong></div>
              <div><small>Started</small><strong>{stats.started.toLocaleString()}</strong></div>
              <div><small>Completed</small><strong>{stats.completed.toLocaleString()}</strong></div>
              <div><small>Completion Rate</small><strong>{Math.round(stats.completionRate * 100)}%</strong></div>
              <div><small>Avg Time</small><strong>{stats.avgCompletionMinutes} min</strong></div>
              <div><small>Drop-Off</small><strong>Clue {stats.dropOffClue != null ? stats.dropOffClue + 1 : '—'}</strong></div>
            </div>
            <p className="growth-most-shared">
              <Megaphone size={14} /> Most Shared: {stats.mostShared}
            </p>
          </div>
        );
      })}
    </>
  );
}

export function RemixPanel({ state, setState, adventures, nav }) {
  const [selectedId, setSelectedId] = useState(adventures.find((a) => a.status === 'published')?.id || '');
  const [remixTitle, setRemixTitle] = useState('');

  const source = adventures.find((a) => a.id === selectedId);
  const remixable = adventures.filter((a) => a.status === 'published' && !a.isDemoAdventure);

  function handleRemix() {
    if (!source) return;
    const result = remixAdventure(state, source, remixTitle);
    if (result.ok) {
      setState(result.state);
      nav('detail', result.adventure.id);
    } else {
      window.alert(formatUserErrorMessage(result));
    }
  }

  return (
    <div className="card growth-remix-panel">
      <h3>Remix Adventure</h3>
      <p className="admin-meta">Credit original creator · Questory content explodes</p>
      <label>
        Original adventure
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {remixable.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      </label>
      <label>
        Remix title
        <input
          type="text"
          placeholder="e.g. Christmas Horror Hunt"
          value={remixTitle}
          onChange={(e) => setRemixTitle(e.target.value)}
        />
      </label>
      {source?.remixCredit && (
        <p className="admin-meta">Remix of: {source.remixCredit.originalTitle}</p>
      )}
      <button type="button" onClick={handleRemix} disabled={!selectedId}>
        <Sparkles size={16} /> Publish Remix
      </button>
      {(state.growth?.remixesCreated || []).length > 0 && (
        <>
          <h4>Your remixes</h4>
          {state.growth.remixesCreated.slice(-5).reverse().map((r) => (
            <div className="growth-remix-row" key={r.id}>
              <strong>{r.title}</strong>
              <small>{new Date(r.at).toLocaleDateString()}</small>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function FollowingFeedSection({ state, setState, adventures, nav }) {
  const feed = getFollowingFeed(state, adventures).slice(0, 6);

  return (
    <div className="card growth-feed-section">
      <div className="section-head compact">
        <h3>Following</h3>
        <button type="button" className="ghost" onClick={() => nav('growth', null, { growthTab: 'feed' })}>
          See all
        </button>
      </div>
      {feed.map((item) => (
        <div className={`growth-feed-row compact ${item.category}`} key={item.id}>
          <span className="growth-feed-cat">{item.category}</span>
          <p>{item.text}</p>
          <small>{item.at}</small>
        </div>
      ))}
    </div>
  );
}

export function GrowthNotificationBell({ state, nav }) {
  const count = getUnreadNotificationCount(state);
  if (!count) return null;
  return (
    <button type="button" className="growth-bell-btn" onClick={() => nav('growth', null, { growthTab: 'notifications' })} aria-label={`${count} notifications`}>
      <Bell size={18} />
      <span className="growth-bell-count">{count}</span>
    </button>
  );
}

function formatNotifTime(at) {
  if (!at) return '';
  if (at.includes('ago')) return at;
  const diff = Date.now() - new Date(at).getTime();
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  return `${Math.round(diff / 86400000)}d ago`;
}

export { awardReferralAction, applyGrowthOnCompletion };
