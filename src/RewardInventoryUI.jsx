import React from 'react';
import {
  Archive,
  Clock,
  Gift,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Shield,
  StopCircle,
} from 'lucide-react';
import {
  END_RULES,
  END_RULE_LABELS,
  REWARD_POLICIES,
  REWARD_POLICY_LABELS,
  getAdventureEndLabel,
  getFeedRewardStatus,
  getRewardClaimedLabel,
  getRewardFinisherLabel,
  getRewardInventoryLabel,
  isAdventureEnded,
  isRewardDepleted,
  getSponsorInventorySummary,
} from './rewardInventory';

export function RewardInventoryFields({ reward, onChange }) {
  const unlimited = reward.quantityLimit == null || reward.quantityLimit === '';

  return (
    <div className="reward-inventory-fields">
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={!unlimited}
          onChange={(e) =>
            onChange({
              quantityLimit: e.target.checked ? 50 : null,
              claimedCount: reward.claimedCount || 0,
            })
          }
        />
        Limit quantity (first X finishers)
      </label>
      {!unlimited && (
        <>
          <label>Quantity limit</label>
          <input
            type="number"
            min="1"
            value={reward.quantityLimit ?? ''}
            onChange={(e) =>
              onChange({ quantityLimit: e.target.value === '' ? null : parseInt(e.target.value, 10) })
            }
            placeholder="50"
          />
          <p className="admin-meta">{getRewardFinisherLabel(reward)}</p>
          <label>When depleted</label>
          <select
            value={reward.rewardPolicy || REWARD_POLICIES.CONTINUE_BADGE_COINS_ONLY}
            onChange={(e) => onChange({ rewardPolicy: e.target.value })}
          >
            {Object.entries(REWARD_POLICY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label>Reward window start (optional)</label>
          <input
            type="datetime-local"
            value={reward.rewardWindowStart ? reward.rewardWindowStart.slice(0, 16) : ''}
            onChange={(e) =>
              onChange({ rewardWindowStart: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
          <label>Reward window end (optional)</label>
          <input
            type="datetime-local"
            value={reward.rewardWindowEnd ? reward.rewardWindowEnd.slice(0, 16) : ''}
            onChange={(e) =>
              onChange({ rewardWindowEnd: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
          {(reward.rewardPolicy === REWARD_POLICIES.REPLACE_WITH_BACKUP ||
            reward.rewardPolicy === REWARD_POLICIES.CONTINUE_BADGE_COINS_ONLY) && (
            <>
              <label>Backup: bonus coins</label>
              <input
                type="number"
                min="0"
                value={reward.backupReward?.coins ?? 25}
                onChange={(e) =>
                  onChange({
                    backupReward: {
                      ...(reward.backupReward || {}),
                      coins: parseInt(e.target.value, 10) || 0,
                      title: reward.backupReward?.title || 'Completion Badge',
                      desc: reward.backupReward?.desc || 'Earned after rewards ran out.',
                      badgeLabel: reward.backupReward?.badgeLabel || 'Trail Finisher',
                    },
                  })
                }
              />
              <label>Backup title</label>
              <input
                value={reward.backupReward?.title || ''}
                onChange={(e) =>
                  onChange({
                    backupReward: { ...(reward.backupReward || {}), title: e.target.value },
                  })
                }
                placeholder="Completion Badge"
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export function AdventureEndRulesFields({ meta, onChange }) {
  return (
    <div className="card adventure-end-rules">
      <h3>Adventure End Rules</h3>
      <label>End rule</label>
      <select value={meta.endRule || END_RULES.NO_END_DATE} onChange={(e) => onChange({ endRule: e.target.value })}>
        {Object.entries(END_RULE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {meta.endRule === END_RULES.ENDS_AT && (
        <>
          <label>Ends at</label>
          <input
            type="datetime-local"
            value={meta.endsAt ? meta.endsAt.slice(0, 16) : ''}
            onChange={(e) =>
              onChange({ endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
        </>
      )}
      {meta.endRule === END_RULES.ENDS_AFTER_TOTAL_COMPLETIONS && (
        <>
          <label>Max total completions</label>
          <input
            type="number"
            min="1"
            value={meta.endsAfterTotalCompletions ?? ''}
            onChange={(e) =>
              onChange({
                endsAfterTotalCompletions: e.target.value === '' ? null : parseInt(e.target.value, 10),
              })
            }
          />
        </>
      )}
    </div>
  );
}

export function RewardStatusPanel({ adventure }) {
  const ended = isAdventureEnded(adventure);
  const endLabel = getAdventureEndLabel(adventure);
  const statuses = getFeedRewardStatus(adventure);

  return (
    <div className={`card reward-status-panel ${ended ? 'ended' : ''}`}>
      <h3>
        <Gift size={18} /> Reward Status
      </h3>
      {ended && <p className="reward-ended-banner">Adventure ended</p>}
      {endLabel && !ended && (
        <p className="reward-end-soon">
          <Clock size={14} /> {endLabel}
        </p>
      )}
      {statuses.filter((s) => s !== 'Adventure ended').map((s) => (
        <p key={s} className="reward-status-line">
          {s}
        </p>
      ))}
      {(adventure.finalRewards || []).map((reward) => (
        <div className="reward-inventory-row" key={reward.id}>
          <b>{reward.title}</b>
          {reward.quantityLimit != null && (
            <>
              <span className={isRewardDepleted(reward) ? 'depleted' : ''}>
                {getRewardClaimedLabel(reward)}
              </span>
              <span>{getRewardInventoryLabel(reward)}</span>
              {isRewardDepleted(reward) && (
                <span className="badge archived">Reward claimed out</span>
              )}
              {reward.rewardPolicy === REWARD_POLICIES.CONTINUE_BADGE_COINS_ONLY && isRewardDepleted(reward) && (
                <small>Play for badge/coins only</small>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function FeedRewardStatusBadges({ adventure }) {
  const labels = getFeedRewardStatus(adventure).slice(0, 3);
  if (!labels.length) return null;
  return (
    <div className="feed-reward-status">
      {labels.map((label) => (
        <span
          className={`feed-reward-badge ${label.includes('claimed out') || label.includes('ended') ? 'warn' : ''}`}
          key={label}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function SponsorRewardInventoryPanel({ state, setState, adventures, sponsorName }) {
  const rows = getSponsorInventorySummary(adventures, sponsorName);

  function addQuantity(adventureId, rewardId) {
    const qty = parseInt(window.prompt('Add how many rewards?', '25'), 10);
    if (!qty || qty <= 0) return;
    setState((s) => ({
      ...s,
      adventures: s.adventures.map((a) => {
        if (a.id !== adventureId) return a;
        return {
          ...a,
          finalRewards: a.finalRewards.map((r) =>
            r.id === rewardId
              ? { ...r, quantityLimit: (r.quantityLimit || 0) + qty, claimedCount: r.claimedCount || 0 }
              : r
          ),
          manuallyEnded: false,
          status: a.status === 'archived' ? 'published' : a.status,
        };
      }),
    }));
  }

  if (!rows.length) {
    return (
      <div className="card">
        <h3>Reward Inventory</h3>
        <p className="admin-meta">No limited-quantity rewards on your campaigns yet.</p>
      </div>
    );
  }

  return (
    <div className="card sponsor-inventory-panel">
      <h3>
        <Gift size={18} /> Reward Inventory
      </h3>
      {rows.map((row) => (
        <div className={`inventory-row ${row.depleted ? 'depleted' : ''}`} key={`${row.adventureId}-${row.rewardId}`}>
          <div>
            <b>{row.rewardTitle}</b>
            <small>{row.adventureTitle}</small>
          </div>
          <div className="inventory-stats">
            <span>
              {row.claimedCount} / {row.quantityLimit} claimed
            </span>
            <span>{row.remaining} left</span>
            {row.depleted && <span className="badge archived">Claimed out</span>}
            {row.paused && <span className="badge draft">Paused</span>}
            {row.ended && <span className="badge archived">Ended</span>}
          </div>
          <button type="button" className="ghost" onClick={() => addQuantity(row.adventureId, row.rewardId)}>
            <Plus size={14} /> Add quantity
          </button>
        </div>
      ))}
    </div>
  );
}

export function AdminRewardControls({ adventure, setState, onArchive, onRestore }) {
  const ended = isAdventureEnded(adventure);

  function patchAdventure(patch) {
    setState((s) => ({
      ...s,
      adventures: s.adventures.map((a) => (a.id === adventure.id ? { ...a, ...patch } : a)),
    }));
  }

  function patchReward(rewardId, patch) {
    setState((s) => ({
      ...s,
      adventures: s.adventures.map((a) =>
        a.id === adventure.id
          ? {
              ...a,
              finalRewards: a.finalRewards.map((r) => (r.id === rewardId ? { ...r, ...patch } : r)),
            }
          : a
      ),
    }));
  }

  return (
    <div className="card admin-reward-controls">
      <h3>
        <Shield size={18} /> Reward & End Controls
      </h3>
      <div className="admin-reward-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => patchAdventure({ rewardsPaused: !adventure.rewardsPaused })}
        >
          {adventure.rewardsPaused ? <Play size={14} /> : <Pause size={14} />}
          {adventure.rewardsPaused ? 'Resume rewards' : 'Pause rewards'}
        </button>
        {!ended ? (
          <button type="button" className="ghost" onClick={() => onArchive(adventure.id)}>
            <StopCircle size={14} /> End adventure
          </button>
        ) : (
          <button type="button" className="ghost" onClick={() => onRestore(adventure.id)}>
            <RotateCcw size={14} /> Reopen adventure
          </button>
        )}
      </div>
      {(adventure.finalRewards || []).map((reward) =>
        reward.quantityLimit != null ? (
          <div className="admin-reward-row" key={reward.id}>
            <span>{reward.title}</span>
            <span>{getRewardClaimedLabel(reward)}</span>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const add = parseInt(window.prompt('Increase quantity by?', '10'), 10);
                if (add > 0) patchReward(reward.id, { quantityLimit: reward.quantityLimit + add });
              }}
            >
              <Plus size={12} /> Qty
            </button>
            <select
              value={reward.rewardPolicy}
              onChange={(e) => patchReward(reward.id, { rewardPolicy: e.target.value })}
            >
              {Object.entries(REWARD_POLICY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ) : null
      )}
      {ended && (
        <p className="admin-meta">
          <Archive size={12} /> Adventure ended — players cannot claim limited rewards.
        </p>
      )}
    </div>
  );
}

export function AdventureEndedBanner({ adventure }) {
  if (!isAdventureEnded(adventure)) return null;
  return (
    <div className="preview-banner adventure-ended-banner">
      <StopCircle size={16} /> Adventure ended — rewards are no longer available
    </div>
  );
}

export function PlayForBadgeOnlyNotice({ message }) {
  if (!message) return null;
  return <p className="badge-only-notice">{message}</p>;
}
