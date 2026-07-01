import React, { useMemo } from 'react';
import { ChevronRight, Crown, Map, Shield, Star, Trophy, Users } from 'lucide-react';
import { getPlayerProgressionSnapshot } from './playerProgressionEngine';

function ReputationCard({ rep }) {
  return (
    <div className="progression-reputation-card">
      <div className="progression-reputation-head">
        <span className="progression-reputation-icon">{rep.icon}</span>
        <div>
          <strong>{rep.label}</strong>
          <small>{rep.subtitle}</small>
        </div>
        <span className="progression-reputation-score">{rep.score}%</span>
      </div>
      <div className="progress compact">
        <i style={{ width: `${rep.tier.progressPct}%` }} />
      </div>
      <small className="progression-tier-label">
        {rep.tier.icon} {rep.tier.label}
        {rep.tier.nextTier ? ` · ${rep.tier.nextTier.min - rep.score} to ${rep.tier.nextTier.label}` : ' · Max tier'}
      </small>
    </div>
  );
}

function RankCard({ title, rank, desc }) {
  return (
    <div className="card progression-rank-card">
      <div className="progression-rank-head">
        <span className="progression-rank-icon">{rank.icon}</span>
        <div>
          <small>{title}</small>
          <strong>{rank.label}</strong>
        </div>
      </div>
      <p className="admin-meta">{desc}</p>
      <div className="progress compact">
        <i style={{ width: `${rank.progressPct}%` }} />
      </div>
      <small>
        {rank.nextRank
          ? `${rank.remaining} more to ${rank.nextRank.label}`
          : 'Maximum rank achieved'}
      </small>
    </div>
  );
}

export function ExplorerLevelStrip({ state, adventures }) {
  const snapshot = useMemo(
    () => getPlayerProgressionSnapshot(state, adventures),
    [state, adventures]
  );

  return (
    <div className="explorer-level-strip">
      <span className="explorer-level-badge">
        <Star size={14} /> Explorer Lv. {snapshot.explorerLevel}
      </span>
      <span className="explorer-rank-pill">{snapshot.treasureHunterRank.icon} {snapshot.treasureHunterRank.label}</span>
      <span className="explorer-rank-pill">{snapshot.cartographerRank.icon} {snapshot.cartographerRank.label}</span>
      <span className="explorer-rank-pill">{snapshot.seasonRank.tier.label}</span>
    </div>
  );
}

export function PlayerProgressionPanel({ state, adventures }) {
  const snapshot = useMemo(
    () => getPlayerProgressionSnapshot(state, adventures),
    [state, adventures]
  );

  return (
    <div className="player-progression-panel">
      <div className="card progression-hero">
        <div className="progression-hero-head">
          <div className="progression-level-ring">
            <span className="progression-level-num">{snapshot.explorerLevel}</span>
          </div>
          <div>
            <h3>Explorer Level {snapshot.explorerLevel}</h3>
            <p>{snapshot.totalXp.toLocaleString()} XP · {snapshot.stats.completedHunts} hunts completed</p>
            {snapshot.leveledUp && (
              <span className="progression-level-up">Level up! Your discoveries are shaping the world.</span>
            )}
          </div>
        </div>
        <div className="progression-xp-bar">
          <div className="progress compact">
            <i style={{ width: `${snapshot.levelProgressPct}%` }} />
          </div>
          <small>{snapshot.xpToNextLevel.toLocaleString()} XP to Level {snapshot.explorerLevel + 1}</small>
        </div>
      </div>

      <div className="progression-rank-grid">
        <RankCard
          title="Treasure Hunter Rank"
          rank={snapshot.treasureHunterRank}
          desc={`${snapshot.stats.completedHunts} adventures claimed across the map.`}
        />
        <RankCard
          title="Cartographer Rank"
          rank={snapshot.cartographerRank}
          desc={`${snapshot.stats.fogReveals} fog tiles · ${snapshot.stats.discoveries} secrets · exploration score ${snapshot.stats.explorationScore}`}
        />
      </div>

      <div className="card progression-season-card">
        <div className="progression-season-head">
          <Trophy size={18} />
          <div>
            <strong>Season Rank</strong>
            <p>{snapshot.seasonRank.seasonTitle}</p>
          </div>
          <span className="progression-season-tier">{snapshot.seasonRank.tier.label}</span>
        </div>
        <p>
          {snapshot.seasonRank.points.toLocaleString()} season points · {snapshot.seasonRank.daysRemaining} days left
        </p>
        <div className="progress compact">
          <i style={{ width: `${snapshot.seasonRank.progressPct}%` }} />
        </div>
        <small>
          {snapshot.seasonRank.nextTier
            ? `${snapshot.seasonRank.remaining} pts to ${snapshot.seasonRank.nextTier.label}`
            : 'Founder Elite tier reached'}
        </small>
      </div>

      <div className="card progression-reputation-section">
        <h4>
          <Shield size={16} /> Reputation
        </h4>
        <p className="admin-meta">Standing with cities, creators, and your guild.</p>
        <ReputationCard rep={snapshot.cityReputation} />
        <ReputationCard rep={snapshot.guildReputation} />
        {snapshot.creatorReputations.map((rep) => (
          <ReputationCard key={rep.id} rep={rep} />
        ))}
      </div>

      <div className="card progression-stats-grid">
        <h4>Progression stats</h4>
        <div className="progression-stat-cells">
          <div><strong>{snapshot.stats.codexPct}%</strong><small>Codex filled</small></div>
          <div><strong>{snapshot.stats.collectionsComplete}</strong><small>Collections done</small></div>
          <div><strong>{snapshot.stats.badgesEarned}</strong><small>Badges earned</small></div>
          <div><strong>{snapshot.stats.streak}</strong><small>Day streak</small></div>
        </div>
      </div>

      {snapshot.milestones.length > 0 && (
        <div className="card progression-milestones">
          <h4>
            <Crown size={16} /> Milestones
          </h4>
          <ul className="progression-milestone-list">
            {snapshot.milestones.map((m) => (
              <li key={m.id} className={snapshot.newMilestones.some((n) => n.id === m.id) ? 'is-new' : ''}>
                <span>{m.icon}</span> {m.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PlayerProgressionHomeCard({ state, adventures, nav }) {
  const snapshot = useMemo(
    () => getPlayerProgressionSnapshot(state, adventures),
    [state, adventures]
  );

  return (
    <div className="card progression-home-card">
      <div className="progression-home-head">
        <Star size={18} />
        <div>
          <strong>Explorer Lv. {snapshot.explorerLevel}</strong>
          <p>
            {snapshot.treasureHunterRank.label} · {snapshot.cartographerRank.label}
          </p>
        </div>
        {nav && (
          <button type="button" className="ghost progression-home-link" onClick={() => nav('vault', null, { tab: 'progression' })}>
            View <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div className="progress compact">
        <i style={{ width: `${snapshot.levelProgressPct}%` }} />
      </div>
      <div className="progression-home-rep">
        <span><Map size={12} /> Parsons {snapshot.cityReputation.score}%</span>
        <span><Users size={12} /> {snapshot.guildReputation.guildName}</span>
        <span><Trophy size={12} /> {snapshot.seasonRank.tier.label}</span>
      </div>
    </div>
  );
}
