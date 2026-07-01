import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  Clock,
  Crown,
  Hammer,
  Map,
  Shield,
  Sparkles,
  Swords,
  Users,
  Zap,
} from 'lucide-react';
import {
  canJoinLegendaryHunt,
  claimLegendaryBossReward,
  getLegendaryHuntSnapshot,
  joinLegendaryHunt,
  markLegendaryArFinaleSeen,
  recordLegendaryHuntAction,
  BOSS_STATUS,
  HUNT_STAGE_ACTIONS,
} from './legendaryHuntEngine';
import { CRAFT_RECIPES } from './craftingEngine';

function RequiredItemChip({ itemId, craftedIds }) {
  const recipe = CRAFT_RECIPES.find((r) => r.id === itemId);
  const met = craftedIds.includes(itemId);
  return (
    <span className={`legendary-req-chip${met ? ' met' : ''}`}>
      {recipe?.icon || '⚗️'} {recipe?.label || itemId}
    </span>
  );
}

function StageTrack({ stages, communityProgress, currentStage }) {
  return (
    <div className="legendary-stage-track">
      {stages.map((stage) => {
        const done = communityProgress >= stage.goal;
        const active = currentStage?.id === stage.id;
        return (
          <div
            key={stage.id}
            className={`legendary-stage${done ? ' done' : ''}${active ? ' active' : ''}`}
          >
            <span className="legendary-stage-dot" />
            <small>{stage.label}</small>
          </div>
        );
      })}
    </div>
  );
}

export function LegendaryHuntAlertBanner({ state, adventures, setState, nav, onOpenPanel }) {
  const snapshot = useMemo(
    () => getLegendaryHuntSnapshot(state, adventures),
    [state, adventures]
  );
  const alert = snapshot.alerts[0];
  if (!alert) return null;
  if (state.legendaryHunt?.lastAlertSeenId === alert.id) return null;

  return (
    <div className={`legendary-alert-banner kind-${alert.kind}`} role="alert">
      <span className="legendary-alert-icon">{alert.icon}</span>
      <div className="legendary-alert-body">
        <strong>{alert.title}</strong>
        <p>{alert.body}</p>
        {alert.sub && <small>{alert.sub}</small>}
        {alert.reward && (
          <span className="legendary-alert-reward">
            <Sparkles size={12} /> Reward: {alert.reward}
          </span>
        )}
      </div>
      <div className="legendary-alert-actions">
        <button
          type="button"
          className="legendary-alert-join"
          onClick={() => {
            if (onOpenPanel) onOpenPanel();
            else if (nav) nav('legendary-hunt');
          }}
        >
          Join Hunt
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() =>
            setState((s) => ({
              ...s,
              legendaryHunt: { ...s.legendaryHunt, lastAlertSeenId: alert.id },
            }))
          }
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function LegendaryHuntHomeCard({ state, adventures, nav }) {
  const snapshot = useMemo(
    () => getLegendaryHuntSnapshot(state, adventures),
    [state, adventures]
  );
  const boss = snapshot.worldBoss;
  if (!snapshot.hasActiveBoss && boss.status !== BOSS_STATUS.DEFEATED) return null;

  return (
    <div className="card legendary-home-card">
      <div className="legendary-home-head">
        <span className="legendary-home-icon">{boss.icon}</span>
        <div>
          <strong>{boss.name}</strong>
          <p>
            {boss.status === BOSS_STATUS.AWAKENING ? 'Awakening…' : `${boss.hoursRemaining}h remaining`}
            · {boss.participants} explorers
          </p>
        </div>
        {nav && (
          <button type="button" className="ghost" onClick={() => nav('legendary-hunt')}>
            Hunt <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div className="progress compact">
        <i style={{ width: `${boss.communityProgress}%` }} />
      </div>
      <small>{boss.communityProgress}% community progress · {boss.currentStage?.label || 'Stage 1'}</small>
    </div>
  );
}

export function LegendaryHuntPanel({ state, adventures, setState, nav }) {
  const snapshot = useMemo(
    () => getLegendaryHuntSnapshot(state, adventures),
    [state, adventures]
  );
  const [message, setMessage] = useState('');
  const boss = snapshot.worldBoss;
  const crafting = state.crafting?.craftedIds || [];

  const handleJoin = () => {
    const result = joinLegendaryHunt(state, boss.bossId);
    setMessage(result.ok ? `Joined the ${boss.name} hunt!` : result.reason);
    if (result.ok) setState(result.state);
  };

  const handleClaim = () => {
    const result = claimLegendaryBossReward(state, boss.bossId);
    setMessage(result.ok ? 'Legendary reward claimed!' : result.reason);
    if (result.ok) setState(result.state);
  };

  const canJoin = canJoinLegendaryHunt(state, boss.bossId, adventures);

  return (
    <div className="legendary-hunt-panel">
      <button type="button" className="ghost back" onClick={() => nav?.('home')}>
        ← Back
      </button>

      <div className={`card legendary-boss-hero atmosphere-${boss.mapAtmosphere || 'default'}`}>
        <div className="legendary-boss-portrait">{boss.icon}</div>
        <div>
          <span className={`legendary-status-pill status-${boss.status}`}>{boss.status}</span>
          <h2>{boss.name}</h2>
          <p>{boss.story}</p>
        </div>
      </div>

      {message && <p className="legendary-message">{message}</p>}

      <div className="card legendary-stats-grid">
        <div>
          <Clock size={16} />
          <strong>{boss.hoursRemaining}h</strong>
          <small>Remaining</small>
        </div>
        <div>
          <Users size={16} />
          <strong>{boss.participants}</strong>
          <small>Explorers</small>
        </div>
        <div>
          <Swords size={16} />
          <strong>{boss.difficulty}</strong>
          <small>Difficulty</small>
        </div>
        <div>
          <Crown size={16} />
          <strong>Lv. {boss.recommendedLevel}+</strong>
          <small>Required</small>
        </div>
      </div>

      <div className="card legendary-community-progress">
        <h4>Community Progress</h4>
        <div className="progress">
          <i style={{ width: `${boss.communityProgress}%` }} />
        </div>
        <strong>{boss.communityProgress}%</strong>
        <small>Your contribution: {boss.playerContribution} pts</small>
        <StageTrack
          stages={boss.stages}
          communityProgress={boss.communityProgress}
          currentStage={boss.currentStage}
        />
      </div>

      {(boss.requiredItems?.length > 0 || !boss.meetsLevel) && (
        <div className="card legendary-requirements">
          <h4>
            <Shield size={16} /> Requirements
          </h4>
          {!boss.meetsLevel && (
            <p className="legendary-req-warn">Explorer Level {boss.recommendedLevel} recommended</p>
          )}
          {boss.requiredItems?.length > 0 && (
            <div className="legendary-req-list">
              {boss.requiredItems.map((id) => (
                <RequiredItemChip key={id} itemId={id} craftedIds={crafting} />
              ))}
            </div>
          )}
          {boss.missingItems?.length > 0 && nav && (
            <button type="button" className="ghost" onClick={() => nav('vault', null, { tab: 'crafting' })}>
              <Hammer size={14} /> Craft required items
            </button>
          )}
        </div>
      )}

      <div className="card legendary-rewards-preview">
        <h4>
          <Sparkles size={16} /> Rewards
        </h4>
        <ul>
          {boss.rewards?.bossLoot?.map((r) => (
            <li key={r.id}>
              {r.icon} {r.name}
            </li>
          ))}
          {boss.rewards?.worldShards > 0 && <li>💠 {boss.rewards.worldShards} World Shards</li>}
          {boss.rewards?.seasonalTokens > 0 && <li>🏔️ {boss.rewards.seasonalTokens} Season Tokens</li>}
        </ul>
      </div>

      <div className="card legendary-lore">
        <h4>
          <Map size={16} /> Lore
        </h4>
        <p>{boss.lore}</p>
      </div>

      {boss.joined && boss.communityProgress >= 40 && (
        <div className="card legendary-ar-finale">
          <h4>
            <Sparkles size={16} /> AR Boss Finale
          </h4>
          <p className="admin-meta">
            Cinematic AR reveal — {boss.arFinaleSceneId || 'boss-finale'}
          </p>
          <button
            type="button"
            className="legendary-ar-btn"
            onClick={() => {
              let next = markLegendaryArFinaleSeen(state, boss.bossId);
              next = recordLegendaryHuntAction(next, HUNT_STAGE_ACTIONS.AR_SCENE, {
                bossId: boss.bossId,
              });
              setState(next);
              setMessage('AR finale witnessed — community progress updated!');
            }}
          >
            Launch AR Finale
          </button>
        </div>
      )}

      {snapshot.regionalHunts.length > 0 && (
        <div className="card legendary-regional">
          <h4>
            <Zap size={16} /> Regional Hunts
          </h4>
          {snapshot.regionalHunts.map((h) => (
            <div key={h.bossId} className="legendary-regional-row">
              <span>{h.icon}</span>
              <div>
                <strong>{h.name}</strong>
                <small>{h.communityProgress}% progress</small>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="legendary-actions">
        {!boss.joined && canJoin.ok && (
          <button type="button" className="legendary-join-btn" onClick={handleJoin}>
            Join Hunt
          </button>
        )}
        {boss.joined && !boss.rewardClaimed && boss.communityProgress >= 100 && (
          <button type="button" className="legendary-join-btn" onClick={handleClaim}>
            Claim Legendary Reward
          </button>
        )}
        {boss.joined && boss.communityProgress < 100 && (
          <p className="admin-meta">You joined! Complete linked adventures and clear fog to fill community progress.</p>
        )}
        {!canJoin.ok && !boss.joined && (
          <p className="admin-meta">{canJoin.reason}</p>
        )}
      </div>
    </div>
  );
}

export function LegendaryHuntMapHud({ snapshot }) {
  if (!snapshot?.hasActiveBoss) return null;
  const boss = snapshot.worldBoss;
  return (
    <div className="legendary-map-hud" role="status">
      <span className="legendary-map-hud-icon">{boss.icon}</span>
      <div>
        <strong>{boss.name}</strong>
        <small>
          {boss.hoursRemaining}h · {boss.communityProgress}% · {boss.participants} explorers
        </small>
      </div>
    </div>
  );
}
