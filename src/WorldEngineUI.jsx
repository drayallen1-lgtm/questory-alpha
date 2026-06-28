import React, { useState } from 'react';
import {
  Award,
  Cloud,
  Compass,
  Globe,
  MapPin,
  Mic,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Users,
  Wind,
} from 'lucide-react';
import { formatUserErrorMessage } from './claimSystem';
import {
  CREATOR_TITLES,
  HIDDEN_DISCOVERIES,
  LIMITED_EVENT_BADGES,
  SEED_CITY_EVENTS,
  WEATHER_META,
  WEATHER_TYPES,
  advanceNarrativeChapter,
  attemptDiscovery,
  claimEventBadge,
  getActiveEventBonuses,
  getActiveNarrative,
  getActiveSeasonalOverlay,
  getCityEventsForCity,
  getCreatorRecommendations,
  getCreatorTitle,
  getDemoWeather,
  getDropOffReport,
  getFeaturedCreators,
  getLoreBanners,
  getNpcDialogue,
  getNpcsForAdventure,
  getSecretCollectionProgress,
  getWeatherEffects,
  isAdventureUnlocked,
  joinCityEvent,
  markLoreSeen,
  markNpcDialogueSeen,
  resolveAdventureEnding,
  setWeatherOverride,
} from './worldEngine';
import { getDirectorBranchFlavor, getDirectorNpcContext } from './directorRuntime';
import {
  getBranchSummary,
  getPathMeta,
  previewPathOutcome,
} from './branchingEngine';
import {
  recordNpcChoice,
  resolveLivingNpcPresentation,
} from './livingNpcEngine';
import { computeCreatorAnalytics } from './experience';

export function WorldEngineHub({ state, setState, adventures, nav }) {
  const [tab, setTab] = useState('events');
  const weather = getDemoWeather(state);
  const overlay = getActiveSeasonalOverlay();

  const tabs = [
    ['events', 'Events', Sparkles],
    ['weather', 'Weather', Cloud],
    ['npcs', 'Guides', Users],
    ['discoveries', 'Secrets', Compass],
    ['creators', 'Creators', Trophy],
    ['lore', 'Lore', Globe],
  ];

  return (
    <>
      <div className="section-head">
        <h2>World</h2>
        <p>Living events · weather · NPCs · hidden lore</p>
      </div>

      <SeasonalNarrativeBanner state={state} setState={setState} />

      <div className="card world-status-card">
        <div className="world-status-row">
          <span className="world-weather-pill">
            {WEATHER_META[weather]?.icon} {WEATHER_META[weather]?.label}
          </span>
          <span className="world-season-pill">
            {overlay.icon} {overlay.label}
          </span>
        </div>
        <p className="world-status-desc">{overlay.desc}</p>
      </div>

      <div className="vault-tabs vault-tabs-scroll">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'events' && <CityEventsPanel state={state} setState={setState} adventures={adventures} />}
      {tab === 'weather' && <WeatherPanel state={state} setState={setState} weather={weather} />}
      {tab === 'npcs' && <NpcGalleryPanel state={state} setState={setState} adventures={adventures} />}
      {tab === 'discoveries' && <HiddenDiscoveriesPanel state={state} setState={setState} weather={weather} />}
      {tab === 'creators' && <CreatorPrestigePanel adventures={adventures} />}
      {tab === 'lore' && <LoreEventsPanel state={state} setState={setState} />}
    </>
  );
}

export function SeasonalNarrativeBanner({ state, setState }) {
  const narrative = getActiveNarrative();
  const chapter = narrative.chapters[state.world?.seasonNarrativeChapter || 0];
  if (!chapter) return null;

  return (
    <div className="card narrative-banner">
      <h3>
        <Globe size={18} /> {narrative.title}
      </h3>
      <p className="narrative-chapter-title">{chapter.title}</p>
      <p className="narrative-chapter-body">{chapter.body}</p>
      {(state.world?.seasonNarrativeChapter || 0) < narrative.chapters.length - 1 && (
        <button type="button" className="ghost" onClick={() => setState((s) => advanceNarrativeChapter(s))}>
          Continue story
        </button>
      )}
    </div>
  );
}

export function GlobalLoreBanner({ state, setState }) {
  const banners = getLoreBanners(state);
  if (!banners.length) return null;
  const event = banners[0];

  return (
    <div className="card lore-live-banner">
      <span>
        {event.icon} <b>{event.title}</b>
      </span>
      <p>{event.body}</p>
      <button type="button" className="ghost" onClick={() => setState((s) => markLoreSeen(s, event.id))}>
        Dismiss
      </button>
    </div>
  );
}

function CityEventsPanel({ state, setState, adventures }) {
  const cities = [...new Set(adventures.map((a) => a.city).filter(Boolean))];
  const city = cities[0] || 'Parsons';
  const events = getCityEventsForCity(city);
  const joined = state.world?.joinedEventIds || [];

  return (
    <div className="card world-events-panel">
      <h3>
        <MapPin size={18} /> {city} Events
      </h3>
      {events.map((event) => (
        <div key={event.id} className={`world-event-row ${joined.includes(event.id) ? 'joined' : ''}`}>
          <span className="world-event-icon">{event.icon}</span>
          <div>
            <b>{event.title}</b>
            <p>{event.desc}</p>
            {event.bonus?.coinMultiplier && (
              <small>{event.bonus.coinMultiplier}x coins · Limited badge</small>
            )}
            {event.bonus?.coinBonus && !event.bonus?.coinMultiplier && (
              <small>+{event.bonus.coinBonus} bonus coins</small>
            )}
          </div>
          <button
            type="button"
            className={joined.includes(event.id) ? 'ghost' : ''}
            disabled={joined.includes(event.id)}
            onClick={() => {
              const result = joinCityEvent(state, event.id);
              if (result.ok) {
                setState(result.state);
                if (event.bonus?.badgeId) {
                  const badge = claimEventBadge(result.state, event.bonus.badgeId);
                  if (badge.ok) setState(badge.state);
                }
              } else {
                window.alert(formatUserErrorMessage(result));
              }
            }}
          >
            {joined.includes(event.id) ? 'Joined' : 'Join event'}
          </button>
        </div>
      ))}
      {getActiveEventBonuses(state).length > 0 && (
        <p className="world-active-bonus">
          <Sparkles size={14} /> {getActiveEventBonuses(state).length} active bonus(es)
        </p>
      )}
    </div>
  );
}

function WeatherPanel({ state, setState, weather }) {
  const meta = getWeatherEffects(weather);

  return (
    <div className="card weather-panel">
      <h3>
        <Cloud size={18} /> Weather Layer
      </h3>
      <p className="weather-current">
        {meta.icon} <b>{meta.label}</b> — active over your world
      </p>
      <p className="admin-meta">
        Cosmetic overlay + gameplay: {meta.coinBonus ? `+${meta.coinBonus} coins` : 'standard coins'},
        GPS radius ×{meta.radiusMultiplier}
      </p>
      <div className="weather-options">
        {Object.entries(WEATHER_TYPES).map(([, id]) => {
          const w = WEATHER_META[id];
          return (
            <button
              key={id}
              type="button"
              className={`weather-option ${weather === id ? 'active' : ''}`}
              onClick={() => setState((s) => setWeatherOverride(s, id))}
            >
              {w.icon} {w.label}
            </button>
          );
        })}
      </div>
      <button type="button" className="ghost" onClick={() => setState((s) => setWeatherOverride(s, null))}>
        Use auto weather
      </button>
    </div>
  );
}

function NpcGalleryPanel({ state, setState, adventures }) {
  const published = adventures.filter((a) => a.status === 'published');
  const npcMap = new Map();
  published.forEach((a) => {
    getNpcsForAdventure(a).forEach((npc) => {
      if (!npcMap.has(npc.id)) npcMap.set(npc.id, { ...npc, adventureTitle: a.title });
    });
  });
  const npcs = [...npcMap.values()];

  return (
    <div className="card npc-gallery">
      <h3>
        <Users size={18} /> Story Guides
      </h3>
      {npcs.map((npc) => (
        <NpcDialogueCard key={npc.id} npc={npc} state={state} setState={setState} />
      ))}
    </div>
  );
}

function NpcDialogueCard({ npc, state, setState }) {
  const dialogue = getNpcDialogue(npc, 'intro');
  const seen = state.world?.npcProgress?.[npc.id]?.seenDialogues?.includes('intro');

  return (
    <div className={`npc-card ${seen ? 'seen' : ''}`}>
      <span className="npc-avatar">{npc.avatar}</span>
      <div>
        <b>{npc.name}</b>
        <small>{npc.role} · {npc.adventureTitle}</small>
        {dialogue && <p className="npc-dialogue">"{dialogue.text}"</p>}
        {npc.voiceNoteUrl && (
          <p className="admin-meta">
            <Mic size={12} /> Voice note available
          </p>
        )}
      </div>
      {!seen && dialogue && (
        <button
          type="button"
          className="ghost"
          onClick={() => setState((s) => markNpcDialogueSeen(s, npc.id, 'intro'))}
        >
          Mark read
        </button>
      )}
    </div>
  );
}

function HiddenDiscoveriesPanel({ state, setState, weather }) {
  const found = state.world?.discoveriesFound || [];
  const secrets = getSecretCollectionProgress(state);

  return (
    <>
      <div className="card hidden-discoveries-panel">
        <h3>
          <Compass size={18} /> Hidden Discoveries
        </h3>
        {HIDDEN_DISCOVERIES.map((d) => {
          const isFound = found.includes(d.id);
          return (
            <div key={d.id} className={`discovery-row ${isFound ? 'found' : ''}`}>
              <span>{d.icon}</span>
              <div>
                <b>{isFound ? d.title : '???'}</b>
                <p>{isFound ? d.desc : d.hint}</p>
                {LIMITED_EVENT_BADGES.find((b) => b.id === d.badgeId)?.rarity === 'ultra_rare' && (
                  <small className="ultra-rare">Ultra-rare</small>
                )}
              </div>
              {!isFound && (
                <button
                  type="button"
                  onClick={() => {
                    const result = attemptDiscovery(state, d.id, { weather });
                    if (result.ok) setState(result.state);
                    else window.alert(formatUserErrorMessage(result));
                  }}
                >
                  Investigate
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="card secret-collections-panel">
        <h3>
          <Star size={18} /> Secret Collections
        </h3>
        {secrets.map((col) => (
          <div key={col.id} className="secret-collection-row">
            <b>{col.name}</b>
            <p>{col.desc}</p>
            <div className="progress compact">
              <i style={{ width: `${col.pct}%` }} />
            </div>
            <small>
              {col.found}/{col.total} discoveries · {col.complete ? 'Complete!' : col.badgeLabel}
            </small>
          </div>
        ))}
      </div>
      <div className="card limited-badges-panel">
        <h3>
          <Award size={18} /> Limited Badges
        </h3>
        <div className="limited-badge-grid">
          {LIMITED_EVENT_BADGES.map((b) => {
            const earned = (state.world?.limitedBadgesEarned || []).includes(b.id);
            return (
              <span key={b.id} className={`limited-badge ${earned ? 'earned' : ''} rarity-${b.rarity}`}>
                {b.icon} {b.label}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}

function CreatorPrestigePanel({ adventures }) {
  const featured = getFeaturedCreators(adventures);

  return (
    <div className="card creator-prestige-panel">
      <h3>
        <Trophy size={18} /> Featured Creators
      </h3>
      {featured.map((creator, i) => {
        const title = getCreatorTitle(creator.score);
        return (
          <div key={creator.id} className="featured-creator-row">
            <span className="creator-rank">#{i + 1}</span>
            <div>
              <b>{creator.id.replace(/-/g, ' ')}</b>
              <span className="creator-title-pill">
                {title.icon} {title.label}
              </span>
              <small>{creator.adventures.length} adventures · {creator.score} prestige</small>
            </div>
          </div>
        );
      })}
      <p className="admin-meta">Titles: {CREATOR_TITLES.map((t) => t.label).join(' · ')}</p>
    </div>
  );
}

function LoreEventsPanel({ state, setState }) {
  const banners = getLoreBanners(state);

  return (
    <div className="card lore-events-panel">
      <h3>
        <Globe size={18} /> Global Lore Events
      </h3>
      {banners.length === 0 && <p className="admin-meta">All caught up on world lore.</p>}
      {banners.map((event) => (
        <div key={event.id} className="lore-event-row">
          <span>{event.icon}</span>
          <div>
            <b>{event.title}</b>
            <p>{event.body}</p>
          </div>
          <button type="button" className="ghost" onClick={() => setState((s) => markLoreSeen(s, event.id))}>
            Read
          </button>
        </div>
      ))}
    </div>
  );
}

export function WeatherOverlay({ state }) {
  const weather = getDemoWeather(state);
  if (weather === WEATHER_TYPES.CLEAR) return null;
  return <div className={`weather-overlay weather-${weather}`} aria-hidden="true" />;
}

export function WorldEventBadge({ adventure }) {
  const tags = adventure?.worldConfig?.worldEventTags || [];
  if (!tags.length) return null;
  return (
    <span className="badge world-event-badge">
      <Sun size={12} /> World Event
    </span>
  );
}

export function CreatorPrestigeBadge({ adventure, adventures }) {
  const creatorId = adventure?.creatorProfileId || adventure?.creatorId;
  if (!creatorId) return null;
  const title = getCreatorTitle(
    adventures.reduce((s, a) => {
      if ((a.creatorProfileId || a.creatorId) === creatorId) {
        return s + (a.playersCompleted || 0) * 10;
      }
      return s;
    }, 0)
  );
  if (title.id === 'trail_guide') return null;
  return (
    <span className="creator-prestige-badge">
      {title.icon} {title.label}
    </span>
  );
}

export function LockedAdventureNotice({ adventure, state, nav }) {
  if (isAdventureUnlocked(state, adventure)) return null;
  return (
    <div className="card locked-adventure-notice">
      <Compass size={18} />
      <p>Unlock via a hidden discovery in the World tab.</p>
      {nav && (
        <button type="button" className="ghost" onClick={() => nav('world')}>
          Go to World
        </button>
      )}
    </div>
  );
}

export function BranchPathTracker({ adventure, progress }) {
  const summary = getBranchSummary(adventure, progress);
  if (!summary) return null;

  return (
    <div className="branch-path-tracker">
      <span className="branch-path-icon">{summary.icon}</span>
      <div className="branch-path-copy">
        <small>Your path</small>
        <strong>{summary.label}</strong>
        {summary.endingTitle && <span className="branch-path-ending">{summary.endingTitle}</span>}
      </div>
    </div>
  );
}

export function BranchChoicePanel({ clue, progress, onSelect, adventure }) {
  const options = clue?.branchOptions || [];
  if (!options.length) return null;

  if (progress.pathId) {
    const flavor = adventure ? getDirectorBranchFlavor(adventure, progress) : null;
    if (flavor?.hint) {
      return (
        <div className="card branch-path-flavor">
          <small>{flavor.title || 'Your path'}</small>
          <p>{flavor.hint}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="card branch-choice-panel">
      <h4>Choose your path</h4>
      <p className="admin-meta">This choice shapes clues, AR scenes, and your ending.</p>
      <div className="branch-choice-grid">
        {options.map((opt) => {
          const preview = adventure ? previewPathOutcome(adventure, opt.pathId) : getPathMeta(opt.pathId);
          return (
            <button
              key={opt.id}
              type="button"
              className="branch-preview-card"
              onClick={() => onSelect(opt.pathId)}
            >
              <span className="branch-preview-icon">{preview.icon || '🔀'}</span>
              <strong>{opt.label}</strong>
              {preview.endingTitle && (
                <small className="branch-preview-ending">{preview.endingTitle}</small>
              )}
              {preview.endingDesc && <p>{preview.endingDesc}</p>}
              {preview.medallionTitle && (
                <span className="branch-preview-medallion">🏅 {preview.medallionTitle}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NpcPlayCard({ adventure, state, setState, clueIndex, progress }) {
  const directorCtx = getDirectorNpcContext(adventure, clueIndex, state, progress);

  if (directorCtx?.presentation) {
    return (
      <LivingNpcCard
        presentation={directorCtx.presentation}
        adventure={adventure}
        progress={progress}
        state={state}
        setState={setState}
      />
    );
  }

  if (directorCtx) {
    const fallback = resolveLivingNpcPresentation({
      npc: directorCtx.npc,
      dialogue: directorCtx.dialogue,
      dialogueId: directorCtx.dialogueId,
      state,
      adventure,
      progress,
    });
    if (fallback) {
      return (
        <LivingNpcCard
          presentation={fallback}
          adventure={adventure}
          progress={progress}
          state={state}
          setState={setState}
        />
      );
    }
  }

  const npcs = getNpcsForAdventure(adventure);
  const npc = npcs.find((n) => n.dialogues?.some((d) => d.id === 'branch')) || npcs[0];
  if (!npc) return null;
  const dialogueId = clueIndex === 0 ? 'intro' : 'branch';
  const dialogue = getNpcDialogue(npc, dialogueId);
  if (!dialogue) return null;

  const presentation = resolveLivingNpcPresentation({
    npc,
    dialogue,
    dialogueId,
    state,
    adventure,
    progress,
  });

  return (
    <LivingNpcCard
      presentation={presentation}
      adventure={adventure}
      progress={progress}
      state={state}
      setState={setState}
    />
  );
}

function LivingNpcCard({ presentation, adventure, state, setState, progress }) {
  if (!presentation) return null;

  const {
    npc,
    dialogueId,
    text,
    mood,
    moodLabel,
    greeting,
    memoryLine,
    trustLabel,
    choices,
    seen,
  } = presentation;

  function handleChoice(choice) {
    setState((s) => recordNpcChoice(s, npc.id, dialogueId, choice, adventure?.id, progress));
  }

  function handleContinue() {
    setState((s) => markNpcDialogueSeen(s, npc.id, dialogueId, adventure?.id));
  }

  return (
    <div className={`card npc-play-card living-npc-card mood-${mood}`}>
      <span className="npc-avatar">{npc.avatar}</span>
      <div className="living-npc-body">
        <div className="living-npc-head">
          <b>{npc.name}</b>
          {npc.role && <small className="npc-role">{npc.role}</small>}
          <span className={`npc-mood-badge mood-${mood}`}>{moodLabel}</span>
          <span className="npc-trust-badge">{trustLabel}</span>
        </div>
        {greeting && <p className="npc-return-greeting">{greeting}</p>}
        {memoryLine && <p className="npc-memory-callback">{memoryLine}</p>}
        <blockquote className="npc-dialogue-line">"{text}"</blockquote>
        {choices?.length > 0 && (
          <div className="npc-choice-list">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="npc-choice-btn"
                onClick={() => handleChoice(choice)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
        {!seen && !choices?.length && (
          <button type="button" className="ghost" onClick={handleContinue}>
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export function WorldHealthDashboard({ adventure, state }) {
  const analytics = computeCreatorAnalytics(adventure, state);
  const report = getDropOffReport(adventure, state);
  const recommendations = getCreatorRecommendations(adventure);

  return (
    <div className="card world-health-dashboard">
      <h3>
        <Wind size={18} /> Adventure Health · World Engine
      </h3>
      <div className="health-metrics">
        <div className="metric">
          <small>Completion</small>
          <strong>{Math.round(report.completionRate * 100)}%</strong>
        </div>
        <div className="metric">
          <small>Avg time</small>
          <strong>{Math.round(report.avgMinutes)}m</strong>
        </div>
        <div className="metric">
          <small>Heat</small>
          <strong>{analytics.heatScore || 0}°</strong>
        </div>
      </div>
      {report.worstClue && (
        <>
          <h4>Drop-off report</h4>
          {report.drops.map((drop) => (
            <div key={drop.clueIndex} className={`drop-off-row severity-${drop.severity}`}>
              <span>{drop.title}</span>
              <strong>{Math.round(drop.failRate * 100)}%</strong>
            </div>
          ))}
        </>
      )}
      {recommendations.length > 0 && (
        <>
          <h4>Creator recommendations</h4>
          {recommendations.map((rec) => (
            <p key={rec.id} className={`creator-rec priority-${rec.priority}`}>
              {rec.text}
            </p>
          ))}
        </>
      )}
    </div>
  );
}

export function EndingRevealBanner({ adventure, progress }) {
  const summary = getBranchSummary(adventure, progress);
  if (!summary) return null;

  return (
    <div className="card ending-reveal-banner">
      <Sparkles size={16} />
      <div className="ending-reveal-body">
        <small>{summary.label}</small>
        <b>{summary.endingTitle || 'Your path ending'}</b>
        {summary.endingDesc && <p>{summary.endingDesc}</p>}
        {summary.medallionTitle && (
          <span className="ending-reveal-medallion">🏅 {summary.medallionTitle}</span>
        )}
      </div>
    </div>
  );
}
