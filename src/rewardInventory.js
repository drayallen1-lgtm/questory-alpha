import { mapReasonToMessage } from './stability';

export const REWARD_POLICIES = {
  CONTINUE_NO_REWARD: 'continue_no_reward',
  CONTINUE_BADGE_COINS_ONLY: 'continue_badge_coins_only',
  AUTO_ARCHIVE_ADVENTURE: 'auto_archive_adventure',
  WAITLIST: 'waitlist',
  REPLACE_WITH_BACKUP: 'replace_with_backup_reward',
};

export const REWARD_POLICY_LABELS = {
  continue_no_reward: 'Continue — no reward',
  continue_badge_coins_only: 'Play for badge/coins only',
  auto_archive_adventure: 'Auto-archive adventure',
  waitlist: 'Add to waitlist',
  replace_with_backup_reward: 'Replace with backup reward',
};

export const END_RULES = {
  NO_END_DATE: 'no_end_date',
  ENDS_AT: 'ends_at',
  ENDS_AFTER_TOTAL_COMPLETIONS: 'ends_after_total_completions',
  ENDS_AFTER_REWARD_DEPLETED: 'ends_after_reward_depleted',
  MANUAL_ARCHIVE_ONLY: 'manual_archive_only',
};

export const END_RULE_LABELS = {
  no_end_date: 'No end date',
  ends_at: 'Ends at date/time',
  ends_after_total_completions: 'Ends after total completions',
  ends_after_reward_depleted: 'Ends when rewards depleted',
  manual_archive_only: 'Manual archive only',
};

export const DEFAULT_BACKUP_REWARD = {
  type: 'bonus',
  title: 'Completion Badge',
  desc: 'Badge and coins for finishing after rewards ran out.',
  coins: 25,
  badgeLabel: 'Trail Finisher',
};

export function normalizeBackupReward(backup = {}) {
  return {
    ...DEFAULT_BACKUP_REWARD,
    ...backup,
    coins: backup.coins ?? 25,
  };
}

export function normalizeFinalReward(reward, index, adventureId) {
  const limit = reward.quantityLimit ?? reward.quantity_limit;
  return {
    ...reward,
    desc: reward.desc ?? reward.description ?? '',
    id: reward.id || `${adventureId}-reward-${index}`,
    quantityLimit: limit === '' || limit === undefined ? null : Number(limit),
    claimedCount: reward.claimedCount ?? reward.claimed_count ?? 0,
    rewardWindowStart: reward.rewardWindowStart || reward.reward_window_start || null,
    rewardWindowEnd: reward.rewardWindowEnd || reward.reward_window_end || null,
    rewardPolicy: reward.rewardPolicy || reward.reward_policy || REWARD_POLICIES.CONTINUE_BADGE_COINS_ONLY,
    rewardsPaused: Boolean(reward.rewardsPaused ?? reward.rewards_paused),
    backupReward: reward.backupReward ? normalizeBackupReward(reward.backupReward) : null,
  };
}

export function normalizeFinalRewards(rewards = [], adventureId) {
  return (rewards || []).map((r, i) => normalizeFinalReward(r, i, adventureId));
}

export function normalizeAdventureEndRules(adventure = {}) {
  return {
    endRule: adventure.endRule || adventure.end_rule || END_RULES.NO_END_DATE,
    endsAt: adventure.endsAt || adventure.ends_at || null,
    endsAfterTotalCompletions:
      adventure.endsAfterTotalCompletions ?? adventure.ends_after_total_completions ?? null,
    totalCompletions: adventure.totalCompletions ?? adventure.total_completions ?? adventure.playersCompleted ?? 0,
    rewardsPaused: Boolean(adventure.rewardsPaused ?? adventure.rewards_paused),
    manuallyEnded: Boolean(adventure.manuallyEnded ?? adventure.manually_ended),
    reopenedAt: adventure.reopenedAt || adventure.reopened_at || null,
  };
}

export function mergeAdventureInventory(adventure) {
  const end = normalizeAdventureEndRules(adventure);
  return {
    ...adventure,
    ...end,
    finalRewards: normalizeFinalRewards(adventure.finalRewards, adventure.id),
  };
}

export function isRewardInWindow(reward, now = new Date()) {
  const start = reward.rewardWindowStart ? new Date(reward.rewardWindowStart) : null;
  const end = reward.rewardWindowEnd ? new Date(reward.rewardWindowEnd) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export function isRewardDepleted(reward) {
  if (reward.quantityLimit == null) return false;
  return (reward.claimedCount || 0) >= reward.quantityLimit;
}

export function getRewardRemaining(reward) {
  if (reward.quantityLimit == null) return null;
  return Math.max(0, reward.quantityLimit - (reward.claimedCount || 0));
}

export function getPrimaryLimitedReward(adventure) {
  const rewards = adventure.finalRewards || [];
  return rewards.find((r) => r.quantityLimit != null) || rewards.find((r) => r.type === 'coupon') || rewards[0];
}

export function areAllLimitedRewardsDepleted(adventure) {
  const limited = (adventure.finalRewards || []).filter((r) => r.quantityLimit != null);
  if (!limited.length) return false;
  return limited.every(isRewardDepleted);
}

export function isAdventureEnded(adventure, now = new Date()) {
  if (!adventure) return true;
  if (adventure.status === 'archived' && adventure.endRule !== END_RULES.MANUAL_ARCHIVE_ONLY) {
    if (adventure.manuallyEnded) return true;
  }
  if (adventure.manuallyEnded && !adventure.reopenedAt) return true;
  if (adventure.rewardsPaused && adventure.endRule === END_RULES.MANUAL_ARCHIVE_ONLY) {
    // paused alone doesn't end
  }

  const rule = adventure.endRule || END_RULES.NO_END_DATE;
  if (rule === END_RULES.ENDS_AT && adventure.endsAt) {
    if (now >= new Date(adventure.endsAt)) return true;
  }
  if (rule === END_RULES.ENDS_AFTER_TOTAL_COMPLETIONS && adventure.endsAfterTotalCompletions != null) {
    if ((adventure.totalCompletions || 0) >= adventure.endsAfterTotalCompletions) return true;
  }
  if (rule === END_RULES.ENDS_AFTER_REWARD_DEPLETED && areAllLimitedRewardsDepleted(adventure)) {
    return true;
  }
  if (adventure.status === 'archived' && adventure.manuallyEnded) return true;
  return false;
}

export function getAdventureEndLabel(adventure) {
  if (!adventure) return '';
  if (isAdventureEnded(adventure)) return 'Adventure ended';
  const rule = adventure.endRule || END_RULES.NO_END_DATE;
  if (rule === END_RULES.ENDS_AT && adventure.endsAt) {
    const ms = new Date(adventure.endsAt).getTime() - Date.now();
    if (ms <= 0) return 'Adventure ended';
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (days <= 1) return 'Ends today';
    return `Ends in ${days} days`;
  }
  if (rule === END_RULES.ENDS_AFTER_TOTAL_COMPLETIONS && adventure.endsAfterTotalCompletions != null) {
    const left = adventure.endsAfterTotalCompletions - (adventure.totalCompletions || 0);
    return left > 0 ? `${left} completions left` : 'Adventure ended';
  }
  return '';
}

export function getRewardInventoryLabel(reward) {
  if (reward.quantityLimit == null) return null;
  const remaining = getRewardRemaining(reward);
  const claimed = reward.claimedCount || 0;
  if (remaining === 0) return 'Reward claimed out';
  if (remaining <= 10) return `${remaining} rewards left`;
  return `${reward.quantityLimit} rewards available`;
}

export function getRewardFinisherLabel(reward) {
  if (reward.quantityLimit == null) return null;
  return `First ${reward.quantityLimit} finishers get this reward`;
}

export function getRewardClaimedLabel(reward) {
  if (reward.quantityLimit == null) return null;
  return `${reward.claimedCount || 0} / ${reward.quantityLimit} claimed`;
}

export function getFeedRewardStatus(adventure) {
  const labels = [];
  const endLabel = getAdventureEndLabel(adventure);
  if (endLabel && endLabel !== 'Adventure ended') labels.push(endLabel);
  if (isAdventureEnded(adventure)) {
    labels.push('Adventure ended');
    return labels;
  }
  const primary = getPrimaryLimitedReward(adventure);
  if (primary) {
    const finisher = getRewardFinisherLabel(primary);
    const inv = getRewardInventoryLabel(primary);
    if (finisher && (primary.claimedCount || 0) < (primary.quantityLimit || 0)) labels.push(finisher);
    if (inv) labels.push(inv);
  }
  return labels;
}

function claimKey(adventureId, rewardId) {
  return `${adventureId}:${rewardId}`;
}

function failReason(reason, extra = {}) {
  return { ok: false, reason, message: mapReasonToMessage(reason) || 'Something went wrong.', ...extra };
}

export function hasUserClaimedReward(rewardClaims, adventureId, rewardId, userId) {
  return (rewardClaims[claimKey(adventureId, rewardId)] || []).includes(userId);
}

export function claimLimitedRewardLocal(state, adventure, reward, userId = 'local-user') {
  const rewardClaims = state.rewardClaims || {};
  const key = claimKey(adventure.id, reward.id);

  if (hasUserClaimedReward(rewardClaims, adventure.id, reward.id, userId)) {
    return failReason('already_claimed');
  }
  if (adventure.rewardsPaused || reward.rewardsPaused) {
    return failReason('rewards_paused');
  }
  if (!isRewardInWindow(reward)) {
    return failReason('outside_window');
  }
  if (isRewardDepleted(reward)) {
    return failReason('depleted', { policy: reward.rewardPolicy, reward });
  }

  const adventures = state.adventures.map((a) => {
    if (a.id !== adventure.id) return a;
    return {
      ...a,
      finalRewards: a.finalRewards.map((r) =>
        r.id === reward.id ? { ...r, claimedCount: (r.claimedCount || 0) + 1 } : r
      ),
    };
  });

  return {
    ok: true,
    adventures,
    rewardClaims: {
      ...rewardClaims,
      [key]: [...(rewardClaims[key] || []), userId],
    },
    reward,
  };
}

export function buildVaultRewardFromTemplate(template, adventure, claimedAt, sponsorInfo, suffix = '') {
  return {
    ...template,
    id: `${adventure.id}-${template.id || template.type}${suffix}`,
    adventureId: adventure.id,
    adventureTitle: adventure.title,
    claimedAt,
    sponsorName: sponsorInfo.name,
    sponsorLogoUrl: sponsorInfo.logoUrl,
    sponsorWebsite: sponsorInfo.website,
  };
}

export function resolveClaimRewards(state, adventure, userId = 'local-user') {
  const claimedAt = new Date().toISOString();
  const sponsorInfo = {
    name: adventure.sponsorInfo?.name || adventure.sponsor || '',
    logoUrl: adventure.sponsorInfo?.logoUrl || '',
    website: adventure.sponsorInfo?.website || '',
  };

  if (isAdventureEnded(adventure)) {
    return {
      ok: false,
      message: 'This adventure has ended. Rewards are no longer available.',
      ended: true,
    };
  }

  let workingState = state;
  const vaultTemplates = [];
  let coinsBonus = 0;
  let badgeOnly = false;
  let waitlisted = false;
  let shouldArchive = false;

  for (const reward of adventure.finalRewards || []) {
    if (reward.quantityLimit != null) {
      const result = claimLimitedRewardLocal(workingState, adventure, reward, userId);
      if (result.ok) {
        workingState = {
          ...workingState,
          adventures: result.adventures,
          rewardClaims: result.rewardClaims,
        };
        adventure = result.adventures.find((a) => a.id === adventure.id) || adventure;
        vaultTemplates.push(reward);
        continue;
      }
      applyDepletedPolicy(reward, result, vaultTemplates, adventure, claimedAt, sponsorInfo, (c) => {
        coinsBonus += c;
      }, () => { badgeOnly = true; }, () => { waitlisted = true; }, () => { shouldArchive = true; });
    } else {
      vaultTemplates.push(reward);
    }
  }

  const updatedAdventures = workingState.adventures.map((a) => {
    if (a.id !== adventure.id) return a;
    let next = {
      ...a,
      totalCompletions: (a.totalCompletions || 0) + 1,
      playersCompleted: (a.playersCompleted || 0) + 1,
    };
    if (shouldArchive || (next.endRule === END_RULES.ENDS_AFTER_REWARD_DEPLETED && areAllLimitedRewardsDepleted(next))) {
      next = { ...next, status: 'archived', manuallyEnded: true };
    }
    if (next.endRule === END_RULES.ENDS_AFTER_TOTAL_COMPLETIONS && next.endsAfterTotalCompletions != null) {
      if (next.totalCompletions >= next.endsAfterTotalCompletions) {
        next = { ...next, status: 'archived', manuallyEnded: true };
      }
    }
    return next;
  });

  return {
    ok: true,
    vaultTemplates,
    coinsBonus,
    badgeOnly,
    waitlisted,
    state: {
      ...workingState,
      adventures: updatedAdventures,
    },
    message: badgeOnly ? 'Play for badge/coins only' : waitlisted ? 'Added to waitlist' : null,
  };
}

function applyDepletedPolicy(
  reward,
  result,
  vaultTemplates,
  adventure,
  claimedAt,
  sponsorInfo,
  addCoins,
  setBadgeOnly,
  setWaitlisted,
  setArchive
) {
  const policy = result.policy || reward.rewardPolicy;
  if (policy === REWARD_POLICIES.REPLACE_WITH_BACKUP && reward.backupReward) {
    const backup = reward.backupReward;
    addCoins(backup.coins || 0);
    vaultTemplates.push({
      type: backup.type || 'bonus',
      icon: '🎖',
      title: backup.title,
      desc: backup.desc,
      valueLabel: backup.badgeLabel || 'Backup reward',
      redemptionInstructions: 'Earned after primary rewards were claimed out.',
      expirationDays: 0,
      id: `${reward.id}-backup`,
    });
  } else if (policy === REWARD_POLICIES.CONTINUE_BADGE_COINS_ONLY) {
    setBadgeOnly();
    addCoins(reward.backupReward?.coins || 25);
  } else if (policy === REWARD_POLICIES.WAITLIST) {
    setWaitlisted();
  } else if (policy === REWARD_POLICIES.AUTO_ARCHIVE_ADVENTURE) {
    setArchive();
  }
}

export async function resolveClaimRewardsAsync(state, adventure, userId, { claimRemote }) {
  if (isAdventureEnded(adventure)) {
    return {
      ok: false,
      message: 'This adventure has ended. Rewards are no longer available.',
      ended: true,
    };
  }

  const claimedAt = new Date().toISOString();
  const sponsorInfo = {
    name: adventure.sponsorInfo?.name || adventure.sponsor || '',
    logoUrl: adventure.sponsorInfo?.logoUrl || '',
    website: adventure.sponsorInfo?.website || '',
  };

  let workingState = state;
  const vaultTemplates = [];
  let coinsBonus = 0;
  let badgeOnly = false;
  let waitlisted = false;
  let shouldArchive = false;

  for (const reward of adventure.finalRewards || []) {
    if (reward.quantityLimit != null && claimRemote) {
      const rpc = await claimRemote(adventure.id, reward.id, userId);
      if (rpc.ok) {
        vaultTemplates.push(reward);
        workingState = {
          ...workingState,
          adventures: workingState.adventures.map((a) => {
            if (a.id !== adventure.id) return a;
            return {
              ...a,
              finalRewards: a.finalRewards.map((r) =>
                r.id === reward.id ? { ...r, claimedCount: rpc.claimed_count ?? (r.claimedCount || 0) + 1 } : r
              ),
            };
          }),
        };
        continue;
      }
      if (rpc.reason === 'already_claimed') {
        return { ok: false, message: 'You already claimed this reward.' };
      }
      if (rpc.reason === 'adventure_ended') {
        return { ok: false, message: 'This adventure has ended.', ended: true };
      }
      applyDepletedPolicy(
        reward,
        { policy: rpc.policy || reward.rewardPolicy },
        vaultTemplates,
        adventure,
        claimedAt,
        sponsorInfo,
        (c) => { coinsBonus += c; },
        () => { badgeOnly = true; },
        () => { waitlisted = true; },
        () => { shouldArchive = true; }
      );
    } else if (reward.quantityLimit != null) {
      const result = claimLimitedRewardLocal(workingState, adventure, reward, userId);
      if (result.ok) {
        workingState = { ...workingState, adventures: result.adventures, rewardClaims: result.rewardClaims };
        adventure = result.adventures.find((a) => a.id === adventure.id) || adventure;
        vaultTemplates.push(reward);
      } else {
        applyDepletedPolicy(
          reward,
          result,
          vaultTemplates,
          adventure,
          claimedAt,
          sponsorInfo,
          (c) => { coinsBonus += c; },
          () => { badgeOnly = true; },
          () => { waitlisted = true; },
          () => { shouldArchive = true; }
        );
      }
    } else {
      vaultTemplates.push(reward);
    }
  }

  const updatedAdventures = workingState.adventures.map((a) => {
    if (a.id !== adventure.id) return a;
    let next = {
      ...a,
      totalCompletions: (a.totalCompletions || 0) + 1,
      playersCompleted: (a.playersCompleted || 0) + 1,
    };
    if (shouldArchive || (next.endRule === END_RULES.ENDS_AFTER_REWARD_DEPLETED && areAllLimitedRewardsDepleted(next))) {
      next = { ...next, status: 'archived', manuallyEnded: true };
    }
    if (next.endRule === END_RULES.ENDS_AFTER_TOTAL_COMPLETIONS && next.endsAfterTotalCompletions != null) {
      if (next.totalCompletions >= next.endsAfterTotalCompletions) {
        next = { ...next, status: 'archived', manuallyEnded: true };
      }
    }
    return next;
  });

  return {
    ok: true,
    vaultTemplates,
    coinsBonus,
    badgeOnly,
    waitlisted,
    state: { ...workingState, adventures: updatedAdventures },
    message: badgeOnly ? 'Play for badge/coins only' : waitlisted ? 'Added to waitlist' : null,
  };
}

export function adminIncreaseRewardQuantity(adventures, adventureId, rewardId, addQty) {
  return adventures.map((a) => {
    if (a.id !== adventureId) return a;
    return {
      ...a,
      finalRewards: a.finalRewards.map((r) =>
        r.id === rewardId
          ? {
              ...r,
              quantityLimit:
                r.quantityLimit != null ? r.quantityLimit + addQty : addQty,
            }
          : r
      ),
      manuallyEnded: false,
      reopenedAt: new Date().toISOString(),
      status: a.status === 'archived' ? 'published' : a.status,
    };
  });
}

export function adminSetRewardsPaused(adventures, adventureId, paused) {
  return adventures.map((a) =>
    a.id === adventureId ? { ...a, rewardsPaused: paused } : a
  );
}

export function adminEndAdventure(adventures, adventureId) {
  return adventures.map((a) =>
    a.id === adventureId ? { ...a, manuallyEnded: true, status: 'archived' } : a
  );
}

export function adminReopenAdventure(adventures, adventureId) {
  return adventures.map((a) =>
    a.id === adventureId
      ? {
          ...a,
          manuallyEnded: false,
          reopenedAt: new Date().toISOString(),
          status: 'published',
        }
      : a
  );
}

export function adminSetRewardPolicy(adventures, adventureId, rewardId, policy) {
  return adventures.map((a) => {
    if (a.id !== adventureId) return a;
    return {
      ...a,
      finalRewards: a.finalRewards.map((r) =>
        r.id === rewardId ? { ...r, rewardPolicy: policy } : r
      ),
    };
  });
}

export function getSponsorInventorySummary(adventures, sponsorName) {
  const rows = [];
  for (const adventure of adventures) {
    const sponsor = adventure.sponsorInfo?.name || adventure.sponsor;
    if (sponsor !== sponsorName || adventure.status !== 'published') continue;
    for (const reward of adventure.finalRewards || []) {
      if (reward.quantityLimit == null) continue;
      rows.push({
        adventureId: adventure.id,
        adventureTitle: adventure.title,
        rewardId: reward.id,
        rewardTitle: reward.title,
        quantityLimit: reward.quantityLimit,
        claimedCount: reward.claimedCount || 0,
        remaining: getRewardRemaining(reward),
        depleted: isRewardDepleted(reward),
        paused: Boolean(adventure.rewardsPaused || reward.rewardsPaused),
        ended: isAdventureEnded(adventure),
        status: adventure.status,
      });
    }
  }
  return rows;
}
