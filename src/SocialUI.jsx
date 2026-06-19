import React, { useState } from 'react';
import {
  Camera,
  Clock,
  Flame,
  Ghost,
  MessageCircle,
  Swords,
  Users,
  UserPlus,
  Radio,
  Trophy,
  Zap,
} from 'lucide-react';
import { formatSuccessMessage } from './claimSystem';
import {
  SEED_LIVE_EVENTS,
  SEASON_TIERS,
  PLAY_MODES,
  VISIBILITY_MODES,
  addComment,
  addPhotoMemory,
  addStory,
  createChallenge,
  createTeam,
  followEntity,
  pinComment,
  getActiveStories,
  getAllTeams,
  getGhostHint,
  getHeatLabel,
  getLiveEventCountdown,
  getMyTeam,
  getPersonalizedFeed,
  getRankedAdventures,
  joinTeam,
} from './social';

export function SocialHub({ state, setState, adventures, nav, auth }) {
  const [tab, setTab] = useState('teams');

  const tabs = [
    ['teams', 'Teams', Users],
    ['friends', 'Friends', UserPlus],
    ['stories', 'Stories', Camera],
    ['challenges', 'Challenges', Swords],
    ['events', 'Live Events', Radio],
  ];

  return (
    <>
      <div className="section-head">
        <h2>Social</h2>
        <p>Teams · Friends · Stories · The Social Loop</p>
      </div>

      <div className="card social-feed-preview">
        <h4>Your Feed</h4>
        {getPersonalizedFeed(state, adventures).slice(0, 4).map((item) => (
          <p key={item.id} className="feed-item">
            <Zap size={12} /> {item.text} <small>{item.at}</small>
          </p>
        ))}
      </div>

      <div className="vault-tabs vault-tabs-scroll">
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

      {tab === 'teams' && <TeamsPanel state={state} setState={setState} />}
      {tab === 'friends' && (
        <FriendsPanel state={state} setState={setState} adventures={adventures} />
      )}
      {tab === 'stories' && <StoriesPanel state={state} setState={setState} />}
      {tab === 'challenges' && (
        <ChallengesPanel state={state} setState={setState} adventures={adventures} />
      )}
      {tab === 'events' && <LiveEventsPanel nav={nav} />}
    </>
  );
}

function TeamsPanel({ state, setState }) {
  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const myTeam = getMyTeam(state);
  const teams = getAllTeams(state);

  return (
    <>
      {myTeam && (
        <div className="card team-hero">
          <span className="team-banner">{myTeam.banner}</span>
          <h3>{myTeam.name}</h3>
          <p>{myTeam.motto}</p>
          <div className="team-stats">
            <span>Rank #{myTeam.rank}</span>
            <span>{myTeam.members} members</span>
            <span>{myTeam.completions} completions</span>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Create Team</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" />
        <input value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="Motto" />
        <button
          type="button"
          onClick={() => {
            setState((s) => createTeam(s, { name, motto, banner: '🏴' }));
            setName('');
            setMotto('');
          }}
        >
          Create Team
        </button>
      </div>

      <h3 className="social-subhead">Public Teams</h3>
      {teams
        .filter((t) => t.isPublic)
        .map((team) => (
          <div className="card team-card" key={team.id}>
            <div className="team-card-head">
              <span>{team.banner}</span>
              <div>
                <b>{team.name}</b>
                <small>{team.motto}</small>
              </div>
              <span className="team-rank">#{team.rank}</span>
            </div>
            <p className="admin-meta">
              {team.members} members · {team.points} pts · {team.badge}
            </p>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const wasJoined = state.social?.myTeamId === team.id;
                setState((s) => joinTeam(s, team.id));
                if (!wasJoined) alert(formatSuccessMessage({ message: `Joined ${team.name}!` }));
              }}
            >
              {state.social?.myTeamId === team.id ? 'Joined ✓' : 'Join Team'}
            </button>
          </div>
        ))}
    </>
  );
}

function FriendsPanel({ state, setState, adventures }) {
  const follows = state.social?.follows || [];
  const suggestions = [
    { type: 'creator', id: 'parsons-heritage', name: 'Parsons Heritage' },
    { type: 'team', id: 'team-bigfoot', name: 'Team Bigfoot' },
    { type: 'friend', id: 'sarah-j', name: 'Sarah J.' },
    { type: 'sponsor', id: 'dq-parsons', name: 'Dairy Queen Parsons' },
  ];

  return (
    <>
      <div className="card">
        <h3>Following ({follows.length})</h3>
        {!follows.length && <p className="admin-meta">Follow creators, teams, and friends for a personalized feed.</p>}
        {follows.map((f) => (
          <p key={f.key}>
            {f.type}: <strong>{f.name}</strong>
          </p>
        ))}
      </div>
      <h3 className="social-subhead">Suggestions</h3>
      {suggestions.map((s) => (
        <div className="card team-card" key={`${s.type}-${s.id}`}>
          <b>{s.name}</b>
          <small>{s.type}</small>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              const already = state.social?.follows?.some((f) => f.id === s.id && f.type === s.type);
              setState((st) => followEntity(st, s.type, s.id, s.name));
              if (!already) alert(formatSuccessMessage({ message: `Following ${s.name}!` }));
            }}
          >
            Follow
          </button>
        </div>
      ))}
    </>
  );
}

function StoriesPanel({ state, setState }) {
  const stories = getActiveStories(state);
  const [text, setText] = useState('');

  return (
    <>
      <div className="card">
        <h3>Post Story (24h)</h3>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Victory, team celebration..." />
        <button type="button" onClick={() => { setState((s) => addStory(s, text)); setText(''); }}>
          Share Story
        </button>
      </div>
      <div className="stories-ring">
        {stories.map((s) => (
          <div className="story-bubble" key={s.id}>
            <span>{s.type === 'photo' ? '📸' : '✨'}</span>
            <small>{s.text?.slice(0, 20)}</small>
          </div>
        ))}
        {!stories.length && <p className="admin-meta">No active stories. Post one!</p>}
      </div>
    </>
  );
}

function ChallengesPanel({ state, setState, adventures }) {
  const challenges = state.social?.challenges || [];
  const published = adventures.filter((a) => a.status === 'published');

  return (
    <>
      <div className="card">
        <h3>Challenge a Friend</h3>
        <select id="challenge-adventure">
          {published.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            const adventureId = document.getElementById('challenge-adventure')?.value;
            setState((s) => createChallenge(s, 'Marcus T.', adventureId, 'time'));
          }}
        >
          Challenge Marcus T.
        </button>
      </div>
      {challenges.map((c) => (
        <div className="card challenge-card" key={c.id}>
          <Swords size={18} />
          <p>
            {c.from} challenged {c.to} — beat their {c.metric}
          </p>
          <small>Prize: {c.prize.coins} coins + {c.prize.badge}</small>
        </div>
      ))}
    </>
  );
}

function LiveEventsPanel({ nav }) {
  return (
    <>
      {SEED_LIVE_EVENTS.map((event) => {
        const countdown = getLiveEventCountdown(event.startsAt);
        return (
          <div className={`card live-event-card ${countdown.live ? 'live' : ''}`} key={event.id}>
            <div className="live-event-head">
              <Radio size={18} />
              <h3>{event.title}</h3>
              {countdown.live ? (
                <span className="live-badge">LIVE</span>
              ) : (
                <span className="countdown-badge">
                  <Clock size={12} /> {countdown.label}
                </span>
              )}
            </div>
            <p>{event.description}</p>
            <p className="admin-meta">
              {event.participants}/{event.maxEntries} entered · Reward: {event.exclusiveReward}
            </p>
            <button type="button" onClick={() => nav('detail', event.adventureId)}>
              View Hunt
            </button>
          </div>
        );
      })}
    </>
  );
}

export function AdventureComments({ adventure, state, setState, isAdmin }) {
  const [text, setText] = useState('');
  const comments = state.social?.comments?.[adventure.id] || [];
  const seeded = [
    { id: 's1', author: 'Marcus T.', text: 'That train clue gave me chills.', createdAt: '' },
    { id: 's2', author: 'Elena R.', text: 'Took my kids. Amazing.', createdAt: '' },
  ];
  const all = comments.length ? comments : seeded.filter((_, i) => adventure.id.includes('depot') || i < 2);
  const pinnedId = state.social?.pinnedComments?.[adventure.id];

  return (
    <div className="card comments-card">
      <h3>
        <MessageCircle size={18} /> Story Comments
      </h3>
      {all.map((c) => (
        <div className={`comment-row ${pinnedId === c.id ? 'pinned' : ''}`} key={c.id}>
          <b>{c.author}</b>
          <p>{c.text}</p>
          {isAdmin && (
            <button type="button" className="ghost" onClick={() => setState((s) => pinComment(s, adventure.id, c.id))}>
              Pin
            </button>
          )}
        </div>
      ))}
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Share your experience..." />
      <button type="button" onClick={() => { setState((s) => addComment(s, adventure.id, text)); setText(''); }}>
        Post Comment
      </button>
    </div>
  );
}

export function PhotoMemoryPrompt({ adventure, onCapture, onSkip }) {
  const [caption, setCaption] = useState('');

  return (
    <div className="modal-overlay">
      <div className="card photo-memory-modal">
        <Camera size={28} />
        <h3>Capture your victory</h3>
        <p>{adventure.title}</p>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption your memory..."
        />
        <p className="admin-meta">Photos are moderated before appearing publicly.</p>
        <button type="button" onClick={() => onCapture(caption)}>Save Memory</button>
        <button type="button" className="ghost" onClick={onSkip}>Skip</button>
      </div>
    </div>
  );
}

export function GhostTrailHint({ state, adventureId, clueIndex }) {
  const hint = getGhostHint(state, adventureId, clueIndex);
  if (!hint) return null;
  return (
    <div className="ghost-trail-hint">
      <Ghost size={14} />
      <span>{hint}</span>
    </div>
  );
}

export function HeatDiscovery({ adventures, state, nav }) {
  const [category, setCategory] = useState(null);
  const ranked = getRankedAdventures(adventures, state, category);

  return (
    <div className="card heat-discovery">
      <h3>
        <Flame size={18} /> Heat System
      </h3>
      <div className="heat-filters">
        {['trending', 'haunted', 'competitive', 'family', 'hidden_gem'].map((cat) => (
          <button
            key={cat}
            type="button"
            className={category === cat ? 'active' : ''}
            onClick={() => setCategory(category === cat ? null : cat)}
          >
            {getHeatLabel(cat)}
          </button>
        ))}
      </div>
      {ranked.slice(0, 5).map(({ adventure, heat, category: cat }) => (
        <button
          key={adventure.id}
          type="button"
          className="heat-row ghost"
          onClick={() => nav('detail', adventure.id)}
        >
          <span>{getHeatLabel(cat)}</span>
          <b>{adventure.title}</b>
          <span className="heat-score">{heat}°</span>
        </button>
      ))}
    </div>
  );
}

export function SeasonRankCard({ state }) {
  const points = state.social?.seasonPoints || 0;
  const tier = SEASON_TIERS.find((t) => t.id === (state.social?.seasonTier || 'bronze')) || SEASON_TIERS[0];
  const next = SEASON_TIERS[SEASON_TIERS.indexOf(tier) + 1];

  return (
    <div className="card season-rank-card">
      <Trophy size={20} />
      <h4>Season Rankings · 90 Days</h4>
      <p>
        <strong>{tier.label}</strong> · {points} pts
      </p>
      {next && (
        <div className="progress compact">
          <i style={{ width: `${Math.min(100, (points / next.min) * 100)}%` }} />
        </div>
      )}
      <small>{next ? `${next.min - points} pts to ${next.label}` : 'Max tier reached'}</small>
    </div>
  );
}

export function LiveMapOverlay({ presence, visibility, onVisibilityChange }) {
  return (
    <div className="card live-map-overlay">
      <h4>Questory Live</h4>
      <p>{presence.explorersNearby} explorers nearby</p>
      <p>{presence.activeHunts} active hunts</p>
      <p>{presence.teamsCompeting} teams competing</p>
      <label>Map visibility</label>
      <select value={visibility} onChange={(e) => onVisibilityChange(e.target.value)}>
        <option value={VISIBILITY_MODES.HIDDEN}>Hidden</option>
        <option value={VISIBILITY_MODES.ANONYMOUS}>Anonymous Explorer</option>
        <option value={VISIBILITY_MODES.TEAM}>Team Visible</option>
      </select>
    </div>
  );
}

export function TeamHuntBadge({ adventure, team }) {
  const mode = adventure?.playMode || PLAY_MODES.BOTH;
  if (!team || mode === PLAY_MODES.SOLO) return null;
  return (
    <span className="team-hunt-badge">
      <Users size={12} /> Team Hunt · {team.name}
    </span>
  );
}
