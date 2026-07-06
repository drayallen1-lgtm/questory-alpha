import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Brain,
  ChevronRight,
  Clock,
  Sparkles,
  Swords,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  draftDirectorEvent,
  getAiDirectorSnapshot,
  DIRECTOR_OPPORTUNITY_TYPES,
} from './questoryAiDirectorEngine';
import { isDev } from './config/env';

const TYPE_ICONS = {
  [DIRECTOR_OPPORTUNITY_TYPES.BOSS]: Swords,
  [DIRECTOR_OPPORTUNITY_TYPES.FACTION]: Users,
  [DIRECTOR_OPPORTUNITY_TYPES.MARKET]: TrendingUp,
  [DIRECTOR_OPPORTUNITY_TYPES.CREATOR]: Sparkles,
  [DIRECTOR_OPPORTUNITY_TYPES.NPC]: Brain,
  [DIRECTOR_OPPORTUNITY_TYPES.DISCOVERY]: ChevronRight,
  [DIRECTOR_OPPORTUNITY_TYPES.GUILD_RALLY]: Users,
  [DIRECTOR_OPPORTUNITY_TYPES.SEASONAL]: Clock,
  [DIRECTOR_OPPORTUNITY_TYPES.WORLD_EVENT]: Sparkles,
};

const DRAFT_ACTIONS = [
  ['world_event', 'Draft World Event'],
  ['npc_hook', 'Draft NPC Hook'],
  ['boss_alert', 'Draft Boss Alert'],
  ['faction_rally', 'Draft Faction Rally'],
  ['market_shift', 'Draft Market Shift'],
  ['creator_spotlight', 'Draft Creator Spotlight'],
];

function OpportunityCard({ opp }) {
  const Icon = TYPE_ICONS[opp.type] || Sparkles;
  return (
    <div className="card ai-director-opp-card">
      <div className="ai-director-opp-head">
        <Icon size={18} />
        <div>
          <strong>{opp.title}</strong>
          <small>{opp.type}</small>
        </div>
        <span className="ai-director-score">{opp.urgency}%</span>
      </div>
      <p>{opp.reason}</p>
      <p className="admin-meta">Impact: {opp.impact}</p>
      <div className="ai-director-meta-row">
        <span>Confidence {opp.confidence}%</span>
        <span>{opp.durationHours}h</span>
      </div>
      {opp.systems?.length > 0 && (
        <div className="chips">
          {opp.systems.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AiDirectorPanel({ state, setState, adventures = [], nav, isAdmin = false }) {
  const [tab, setTab] = useState('overview');
  const [message, setMessage] = useState('');

  const canView = isDev || isAdmin;
  const snapshot = useMemo(
    () => (canView ? getAiDirectorSnapshot(state, adventures) : null),
    [state, adventures, canView]
  );

  if (!canView) {
    return (
      <div className="card ai-director-locked">
        <p>AI Director is available in dev mode or for admin users.</p>
      </div>
    );
  }

  function handleDraft(type) {
    const result = draftDirectorEvent(state, type);
    if (result.ok) {
      setState(result.state);
      setMessage(result.message);
    } else {
      setMessage(result.message);
    }
  }

  const tabs = [
    ['overview', 'Overview'],
    ['opportunities', 'Opportunities'],
    ['events', 'Events'],
    ['timeline', 'Timeline'],
    ['payload', 'Payload'],
  ];

  return (
    <div className="ai-director-panel">
      <div className="section-head ai-director-head">
        <div>
          <h2>
            <Brain size={22} /> AI Director
          </h2>
          <p>World observations and draft recommendations — deterministic, not live AI.</p>
        </div>
        <button type="button" className="ghost" onClick={() => nav?.('admin')}>
          <ArrowLeft size={16} /> Admin
        </button>
      </div>

      {message && <p className="ai-director-banner">{message}</p>}

      <div className="ai-director-stats">
        <div className="card ai-director-stat">
          <small>World health</small>
          <strong>{snapshot.worldHealth}%</strong>
        </div>
        <div className="card ai-director-stat">
          <small>Urgency</small>
          <strong>{snapshot.urgencyScore}</strong>
        </div>
        <div className="card ai-director-stat">
          <small>Confidence</small>
          <strong>{snapshot.confidenceScore}</strong>
        </div>
        <div className="card ai-director-stat">
          <small>Signals</small>
          <strong>{snapshot.signalCount}</strong>
        </div>
        <div className="card ai-director-stat">
          <small>Drafts</small>
          <strong>{snapshot.draftCount}</strong>
        </div>
      </div>

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

      {tab === 'overview' && (
        <>
          <div className="card">
            <h3>Active signals</h3>
            {snapshot.signals.slice(0, 8).map((sig) => (
              <p key={sig.id} className="ai-director-signal">
                <span className={`ai-director-signal-kind kind-${sig.kind}`}>{sig.kind}</span>
                {sig.label} <small>({sig.strength})</small>
              </p>
            ))}
          </div>
          {snapshot.topRecommendation && (
            <div className="card ai-director-top-rec">
              <h3>Top recommendation</h3>
              <OpportunityCard opp={snapshot.topRecommendation} />
            </div>
          )}
          <div className="ai-director-actions">
            {DRAFT_ACTIONS.map(([type, label]) => (
              <button key={type} type="button" className="ghost" onClick={() => handleDraft(type)}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'opportunities' && (
        <>
          {['boss', 'faction', 'market', 'creator', 'npc', 'discovery', 'seasonal'].map((kind) => {
            const items = snapshot.opportunities.filter((o) => o.type === kind || o.type?.includes(kind));
            if (!items.length) return null;
            return (
              <div key={kind}>
                <h3 className="social-subhead">{kind}</h3>
                {items.map((opp) => (
                  <OpportunityCard key={opp.id} opp={opp} />
                ))}
              </div>
            );
          })}
          {!snapshot.opportunities.length && (
            <div className="card">
              <p>No opportunities detected right now. The world is calm.</p>
            </div>
          )}
        </>
      )}

      {tab === 'events' && (
        <>
          <div className="card">
            <h3>Recommended events</h3>
            {snapshot.recommendations.map((rec) => (
              <div key={rec.id} className="ai-director-event-row">
                <strong>{rec.title}</strong>
                <p>{rec.reason}</p>
                <small>
                  {rec.durationHours}h · rewards: {(rec.rewards || []).join(', ') || '—'}
                </small>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Saved drafts ({snapshot.draftCount})</h3>
            {!snapshot.drafts.length && <p className="admin-meta">No drafts yet.</p>}
            {snapshot.drafts.map((d) => (
              <div key={d.id} className="ai-director-draft-row">
                <strong>{d.type}</strong>
                <small>{new Date(d.createdAt).toLocaleString()}</small>
                <pre className="ai-director-draft-preview">
                  {JSON.stringify(d.payload, null, 2).slice(0, 280)}
                </pre>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'timeline' && (
        <div className="card">
          <h3>Director observations</h3>
          {snapshot.timeline.map((entry) => (
            <p key={entry.id} className="feed-item">
              {entry.text} <small>{entry.minutesAgo}m ago</small>
            </p>
          ))}
          {snapshot.npcSuggestions.map((npc) => (
            <p key={npc.npcId} className="feed-item feed-item-npc">
              <strong>{npc.npcId}:</strong> {npc.suggestedHook}
            </p>
          ))}
        </div>
      )}

      {tab === 'payload' && isDev && (
        <div className="card ai-director-payload">
          <h3>Prompt payload preview (dev only)</h3>
          <pre>{JSON.stringify(snapshot.promptPayload, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
