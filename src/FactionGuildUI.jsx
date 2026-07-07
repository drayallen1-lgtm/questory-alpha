import React, { useMemo, useState } from 'react';
import {
  Activity,
  ChevronRight,
  Crown,
  Flag,
  LayoutGrid,
  Map,
  Shield,
  Sparkles,
  Swords,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  getFactionSnapshot,
  joinFaction,
  leaveFaction,
  resolveFactionReward,
} from './factionEngine';
import {
  GUILD_TAB_IDS,
  GUILD_TAB_LABELS,
  GUILD_TAB_ORDER,
  buildGuildMemberRoster,
  resolveGuildTab,
} from './guildExperienceEngine';

const GUILD_TAB_ICONS = {
  [GUILD_TAB_IDS.OVERVIEW]: LayoutGrid,
  [GUILD_TAB_IDS.TERRITORIES]: Map,
  [GUILD_TAB_IDS.WARS]: Swords,
  [GUILD_TAB_IDS.SEASON]: Crown,
  [GUILD_TAB_IDS.REWARDS]: Sparkles,
  [GUILD_TAB_IDS.MEMBERS]: Users,
  [GUILD_TAB_IDS.ACTIVITY]: Activity,
  [GUILD_TAB_IDS.RECRUITMENT]: UserPlus,
};

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
            <span>
              {row.faction?.emblem} {row.faction?.name}
            </span>
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

function GuildOverviewPanel({ snapshot, setTab }) {
  return (
    <>
      <div className="card faction-overview-grid">
        <button type="button" className="ghost guild-overview-stat" onClick={() => setTab(GUILD_TAB_IDS.TERRITORIES)}>
          <strong>{snapshot.controlledByPlayer}</strong>
          <span>Territories held</span>
        </button>
        <button type="button" className="ghost guild-overview-stat" onClick={() => setTab(GUILD_TAB_IDS.WARS)}>
          <strong>{snapshot.wars.length}</strong>
          <span>Active wars</span>
        </button>
        <button type="button" className="ghost guild-overview-stat" onClick={() => setTab(GUILD_TAB_IDS.SEASON)}>
          <strong>{snapshot.seasonScore}</strong>
          <span>Season score</span>
        </button>
        <button type="button" className="ghost guild-overview-stat" onClick={() => setTab(GUILD_TAB_IDS.MEMBERS)}>
          <strong>{snapshot.memberFaction?.members || 0}</strong>
          <span>Members</span>
        </button>
      </div>

      {snapshot.lastEvent && (
        <div className="card faction-timeline-card">
          <h4>Latest activity</h4>
          <p>{snapshot.lastEvent.text}</p>
          <button type="button" className="ghost" onClick={() => setTab(GUILD_TAB_IDS.ACTIVITY)}>
            View all activity
          </button>
        </div>
      )}

      <div className="card faction-rankings">
        <h3>Season standings</h3>
        {snapshot.rankings.slice(0, 5).map((f, i) => (
          <div key={f.factionId} className="faction-ranking-row">
            <span className="faction-rank-num">#{i + 1}</span>
            <span>{f.emblem}</span>
            <div>
              <b>{f.name}</b>
              <small>
                {f.territoriesControlled} territories · {f.totalSeasonScore} pts
              </small>
            </div>
          </div>
        ))}
      </div>

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
  );
}

function GuildMembersPanel({ snapshot }) {
  const roster = buildGuildMemberRoster(snapshot);

  return (
    <>
      <div className="card">
        <h3>Guild members</h3>
        <p className="admin-meta">
          {snapshot.memberFaction?.name} · {snapshot.memberFaction?.members || roster.length} explorers
        </p>
      </div>
      {roster.map((member) => (
        <div className="card guild-member-row" key={member.id}>
          <div>
            <strong>{member.name}</strong>
            <small>
              {member.role} · {member.status}
            </small>
          </div>
          <span className="guild-member-contribution">{member.contribution} pts</span>
        </div>
      ))}
    </>
  );
}

function GuildActivityPanel({ snapshot }) {
  return (
    <>
      {snapshot.timeline.map((entry) => (
        <div className="card faction-timeline-card" key={entry.id}>
          <p>{entry.text}</p>
          <small className="admin-meta">{entry.minutesAgo}m ago</small>
        </div>
      ))}
      {!snapshot.timeline.length && (
        <div className="card">
          <p>No guild activity yet. Contest a territory to make history.</p>
        </div>
      )}
    </>
  );
}

function GuildRecruitmentPanel({ snapshot, state, setState, setTab }) {
  return (
    <>
      <div className="card faction-join-banner">
        <Flag size={20} />
        <p>
          {snapshot.memberFaction
            ? 'Recruit nearby explorers and grow your territory influence.'
            : 'Join a guild to contest territories and earn season rewards.'}
        </p>
      </div>

      {snapshot.memberFaction ? (
        <div className="card">
          <h3>Recruitment tools</h3>
          <p className="admin-meta">Share your guild tag and rally explorers downtown.</p>
          <div className="chips">
            <span>{snapshot.memberFaction.tag}</span>
            <span>{snapshot.memberFaction.emblem} {snapshot.memberFaction.name}</span>
          </div>
          <button type="button" className="ghost" onClick={() => setTab(GUILD_TAB_IDS.WARS)}>
            Launch territory rally
          </button>
        </div>
      ) : (
        <>
          <h3 className="social-subhead">Public guilds</h3>
          {snapshot.factions.map((faction) => (
            <div className="card faction-guild-card" key={faction.factionId}>
              <span className="faction-guild-emblem">{faction.emblem}</span>
              <div>
                <b>{faction.name}</b>
                <small>
                  {faction.tag} · {faction.members} members
                </small>
                <p>{faction.motto}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const result = joinFaction(state, faction.factionId);
                  if (result.ok) {
                    setState({ ...result.state, guildTab: GUILD_TAB_IDS.OVERVIEW });
                  }
                }}
              >
                Join Guild
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
}

export function FactionGuildPanel({ state, setState, adventures, nav, initialTerritoryId = null }) {
  const tab = resolveGuildTab(state.guildTab, state, { initialTerritoryId });
  const [selectedTerritoryId, setSelectedTerritoryId] = useState(
    initialTerritoryId || state?.faction?.focusedTerritoryId || null
  );

  const snapshot = useMemo(() => getFactionSnapshot(state, adventures), [state, adventures]);

  const selectedTerritory = snapshot.territories.find(
    (t) => t.territoryId === selectedTerritoryId
  );

  function setTab(nextTab) {
    setState((s) => ({ ...s, guildTab: nextTab }));
  }

  return (
    <div className="faction-guild-panel guild-home-shell">
      <div className="section-head guild-home-head">
        <h2>Guild Home</h2>
        <p>Overview · Territories · Wars · Season · Rewards · Members · Activity · Recruitment</p>
      </div>

      {snapshot.memberFaction ? (
        <div
          className="card faction-guild-hero"
          style={{ '--faction-color': snapshot.memberFaction.color }}
        >
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
            onClick={() => setState((s) => ({ ...leaveFaction(s).state, guildTab: GUILD_TAB_IDS.RECRUITMENT }))}
          >
            Leave Guild
          </button>
        </div>
      ) : (
        <div className="card faction-join-banner">
          <Flag size={20} />
          <p>Join a guild to unlock territories, wars, and season rewards.</p>
        </div>
      )}

      <div className="guild-home-tabs" role="tablist" aria-label="Guild sections">
        {GUILD_TAB_ORDER.map((id) => {
          const Icon = GUILD_TAB_ICONS[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              <Icon size={14} /> {GUILD_TAB_LABELS[id]}
            </button>
          );
        })}
      </div>

      {tab === GUILD_TAB_IDS.OVERVIEW && (
        <GuildOverviewPanel snapshot={snapshot} setTab={setTab} />
      )}

      {tab === GUILD_TAB_IDS.TERRITORIES && (
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

      {tab === GUILD_TAB_IDS.WARS && (
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
                  setTab(GUILD_TAB_IDS.TERRITORIES);
                  setSelectedTerritoryId(war.territoryId);
                }}
              >
                View <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </>
      )}

      {tab === GUILD_TAB_IDS.SEASON && (
        <div className="card faction-season-panel">
          <Crown size={24} />
          <h3>{snapshot.season.label}</h3>
          <p>
            {snapshot.contestedCount} territories contested · {snapshot.season.activeTerritories}{' '}
            active
          </p>
          <p className="admin-meta">
            Season ends {new Date(snapshot.season.endsAt).toLocaleDateString()}
          </p>
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

      {tab === GUILD_TAB_IDS.REWARDS && (
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

      {tab === GUILD_TAB_IDS.MEMBERS && <GuildMembersPanel snapshot={snapshot} />}

      {tab === GUILD_TAB_IDS.ACTIVITY && <GuildActivityPanel snapshot={snapshot} />}

      {tab === GUILD_TAB_IDS.RECRUITMENT && (
        <GuildRecruitmentPanel
          snapshot={snapshot}
          state={state}
          setState={setState}
          setTab={setTab}
        />
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
  const snapshot = useMemo(() => getFactionSnapshot(state, adventures), [state, adventures]);
  if (!snapshot.memberFaction) {
    return (
      <div className="card faction-passport-empty">
        <h4>Guild identity</h4>
        <p>Join a guild from Social → Guild to earn territory reputation.</p>
      </div>
    );
  }
  return (
    <div className="card faction-passport-section">
      <h4>Guild identity</h4>
      <p>
        {snapshot.memberFaction.emblem} <strong>{snapshot.memberFaction.name}</strong> ·{' '}
        {snapshot.guildRank}
      </p>
      <p className="admin-meta">
        Reputation {snapshot.reputation} · {snapshot.controlledByPlayer} territories helped · Season{' '}
        {snapshot.seasonScore} pts
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
