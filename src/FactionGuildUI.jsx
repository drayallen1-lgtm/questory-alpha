import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  Crown,
  Flag,
  Map,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import {
  getFactionSnapshot,
  joinFaction,
  leaveFaction,
  resolveFactionReward,
} from './factionEngine';

const HUB_TABS = [
  ['hub', 'Guild Hub', Users],
  ['territories', 'Territories', Map],
  ['rankings', 'Rankings', Trophy],
  ['wars', 'Wars', Swords],
  ['rewards', 'Rewards', Sparkles],
  ['season', 'Season', Crown],
];

function InfluenceBar({ ranked, color }) {
  const top = ranked[0];
  const second = ranked[1];
  if (!top) return null;
  return (
    <div className="faction-influence-bar">
      <div
        className="faction-influence-fill"
        style={{ width: `${Math.min(100, top.pct)}%`, background: color || top.faction?.color }}
      />
      {second && (
        <div
          className="faction-influence-second"
          style={{ width: `${Math.min(100, second.pct)}%`, background: second.faction?.color }}
        />
      )}
    </div>
  );
}

function TerritoryCard({ territory, onSelect, selected }) {
  return (
    <button
      type="button"
      className={`faction-territory-card${selected ? ' selected' : ''}${territory.contested ? ' contested' : ''}`}
      onClick={() => onSelect?.(territory)}
    >
      <span className="faction-territory-emblem">{territory.ownerEmblem}</span>
      <div>
        <strong>{territory.name}</strong>
        <small>{territory.type.replace(/_/g, ' ')}</small>
        <p>
          {territory.ownerName}
          {territory.contested ? ' · contested' : ''}
        </p>
      </div>
      <span className="faction-territory-pct">{territory.ranked[0]?.pct || 0}%</span>
    </button>
  );
}

function TerritoryDetail({ territory, onClose }) {
  if (!territory) return null;
  return (
    <div className="card faction-territory-detail">
      <button type="button" className="ghost faction-detail-close" onClick={onClose}>
        ← Back
      </button>
      <div className="faction-detail-head">
        <span className="faction-detail-emblem">{territory.ownerEmblem}</span>
        <div>
          <h3>{territory.name}</h3>
          <p>
            Controlled by <strong>{territory.ownerName}</strong>
            {territory.contested && ' · Rally to defend or contest'}
          </p>
        </div>
      </div>
      <InfluenceBar ranked={territory.ranked} color={territory.ownerColor} />
      <div className="faction-influence-list">
        {territory.ranked.slice(0, 4).map((row) => (
          <div key={row.factionId} className="faction-influence-row">
            <span>{row.faction?.emblem} {row.faction?.name}</span>
            <span>{row.pct}%</span>
          </div>
        ))}
      </div>
      {territory.rewards && (
        <div className="faction-detail-rewards">
          <h4>Territory rewards</h4>
          {Object.entries(territory.rewards).map(([key, val]) => (
            <span key={key} className="faction-reward-chip">
              {key}: {typeof val === 'number' && val < 1 ? `+${Math.round(val * 100)}%` : val}
            </span>
          ))}
        </div>
      )}
      {territory.marketModifier && (
        <p className="admin-meta">Market modifier active in this district.</p>
      )}
      {territory.bossModifier && (
        <p className="admin-meta">Boss arena bonus for controlling guild.</p>
      )}
    </div>
  );
}

export function FactionGuildPanel({ state, setState, adventures, nav, initialTerritoryId = null }) {
  const [tab, setTab] = useState(initialTerritoryId ? 'territories' : 'hub');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState(initialTerritoryId);

  const snapshot = useMemo(
    () => getFactionSnapshot(state, adventures),
    [state, adventures]
  );

  const selectedTerritory = snapshot.territories.find(
    (t) => t.territoryId === selectedTerritoryId
  );

  return (
    <div className="faction-guild-panel">
      <div className="section-head">
        <h2>Guilds & Territories</h2>
        <p>Influence · Control · Season wars</p>
      </div>

      {snapshot.memberFaction ? (
        <div className="card faction-guild-hero" style={{ '--faction-color': snapshot.memberFaction.color }}>
          <span className="faction-guild-emblem">{snapshot.memberFaction.emblem}</span>
          <div>
            <h3>{snapshot.memberFaction.name}</h3>
            <p>{snapshot.memberFaction.motto}</p>
            <div className="faction-guild-stats">
              <span>{snapshot.guildRank}</span>
              <span>{snapshot.controlledByPlayer} territories</span>
              <span>{snapshot.seasonScore} season pts</span>
              <span>{snapshot.guildTokens} tokens</span>
            </div>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={() => setState((s) => leaveFaction(s).state)}
          >
            Leave Guild
          </button>
        </div>
      ) : (
        <div className="card faction-join-banner">
          <Flag size={20} />
          <p>Join a guild to contest territories and earn season rewards.</p>
        </div>
      )}

      <div className="vault-tabs vault-tabs-scroll faction-hub-tabs">
        {HUB_TABS.map(([id, label, Icon]) => (
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

      {tab === 'hub' && (
        <>
          {!snapshot.memberFaction && (
            <>
              <h3 className="social-subhead">Public Guilds</h3>
              {snapshot.factions.map((faction) => (
                <div className="card faction-guild-card" key={faction.factionId}>
                  <span className="faction-guild-emblem">{faction.emblem}</span>
                  <div>
                    <b>{faction.name}</b>
                    <small>{faction.tag} · {faction.members} members</small>
                    <p>{faction.motto}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const result = joinFaction(state, faction.factionId);
                      if (result.ok) setState(result.state);
                    }}
                  >
                    Join Guild
                  </button>
                </div>
              ))}
            </>
          )}
          {snapshot.lastEvent && (
            <div className="card faction-timeline-card">
              <h4>Latest activity</h4>
              <p>{snapshot.lastEvent.text}</p>
            </div>
          )}
          {snapshot.titles.length > 0 && (
            <div className="card">
              <h4>Your titles</h4>
              <div className="chips">
                {snapshot.titles.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'territories' && (
        <>
          {selectedTerritory ? (
            <TerritoryDetail
              territory={selectedTerritory}
              onClose={() => setSelectedTerritoryId(null)}
            />
          ) : (
            snapshot.territories.map((t) => (
              <TerritoryCard
                key={t.territoryId}
                territory={t}
                selected={selectedTerritoryId === t.territoryId}
                onSelect={(ter) => setSelectedTerritoryId(ter.territoryId)}
              />
            ))
          )}
        </>
      )}

      {tab === 'rankings' && (
        <div className="card faction-rankings">
          <h3>Season standings</h3>
          {snapshot.rankings.map((f, i) => (
            <div key={f.factionId} className="faction-ranking-row">
              <span className="faction-rank-num">#{i + 1}</span>
              <span>{f.emblem}</span>
              <div>
                <b>{f.name}</b>
                <small>{f.territoriesControlled} territories · {f.totalSeasonScore} pts</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'wars' && (
        <>
          {snapshot.wars.length === 0 && (
            <div className="card">
              <p>No active territory contests right now. Check back during weekend rallies.</p>
            </div>
          )}
          {snapshot.wars.map((war) => (
            <div className="card faction-war-card" key={war.territoryId}>
              <Swords size={18} />
              <div>
                <strong>{war.name}</strong>
                <p>
                  {war.leader} vs {war.challenger} · gap {war.gap.toFixed(1)}%
                </p>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setTab('territories');
                  setSelectedTerritoryId(war.territoryId);
                }}
              >
                View <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </>
      )}

      {tab === 'rewards' && (
        <div className="card faction-rewards-panel">
          <h3>Guild rewards</h3>
          {[
            ['territory-defender', 'Defender — helped hold a territory'],
            ['territory-raider', 'Raider — contested a rival district'],
            ['guild-season-bronze', 'Season Bronze — 500+ guild XP'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="ghost faction-reward-btn"
              disabled={state.faction?.rewardsClaimed?.includes(id)}
              onClick={() => {
                const result = resolveFactionReward(state, id);
                if (result.ok) setState(result.state);
              }}
            >
              {state.faction?.rewardsClaimed?.includes(id) ? '✓ ' : ''}
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'season' && (
        <div className="card faction-season-panel">
          <Crown size={24} />
          <h3>{snapshot.season.label}</h3>
          <p>{snapshot.contestedCount} territories contested · {snapshot.season.activeTerritories} active</p>
          <p className="admin-meta">Season ends {new Date(snapshot.season.endsAt).toLocaleDateString()}</p>
          <div className="faction-alliance-list">
            <h4>Alliances & rivalries</h4>
            {snapshot.factions.slice(0, 4).map((f) => (
              <p key={f.factionId}>
                {f.emblem} {f.name}
                {f.alliances?.length ? ` · allies: ${f.alliances.length}` : ''}
                {f.rivals?.length ? ` · rivals: ${f.rivals.length}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {nav && (
        <button type="button" className="ghost faction-map-link" onClick={() => nav('map')}>
          <Map size={16} /> View territory map
        </button>
      )}
    </div>
  );
}

export function FactionGuildChip({ snapshot, onOpen }) {
  if (!snapshot?.memberFaction) return null;
  return (
    <button type="button" className="faction-map-chip" onClick={onOpen}>
      <Shield size={12} />
      {snapshot.memberFaction.emblem} {snapshot.memberFaction.tag}
    </button>
  );
}

export function FactionPassportSection({ state, adventures }) {
  const snapshot = useMemo(
    () => getFactionSnapshot(state, adventures),
    [state, adventures]
  );
  if (!snapshot.memberFaction) {
    return (
      <div className="card faction-passport-empty">
        <h4>Guild identity</h4>
        <p>Join a guild from Social → Guilds to earn territory reputation.</p>
      </div>
    );
  }
  return (
    <div className="card faction-passport-section">
      <h4>Guild identity</h4>
      <p>
        {snapshot.memberFaction.emblem} <strong>{snapshot.memberFaction.name}</strong> · {snapshot.guildRank}
      </p>
      <p className="admin-meta">
        Reputation {snapshot.reputation} · {snapshot.controlledByPlayer} territories helped · Season {snapshot.seasonScore} pts
      </p>
      {snapshot.titles.length > 0 && (
        <div className="chips">
          {snapshot.titles.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
