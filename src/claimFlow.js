import {
  CLAIM_METHOD,
  autoClaimsOnTap,
  normalizeClaimMethod,
  validateClaimAttempt,
} from './claimSystem';
import { applyAdventureCompletion } from './engagement';
import { enrichCouponReward, applySeasonalProgress } from './economy';
import { addSeasonPoints } from './social';
import { applyExpansionOnCompletion, recordArCapture, usesArFinder } from './expansion';
import { applyGrowthOnCompletion } from './growth';
import {
  completeDemoIfNeeded,
  shouldShowFirstCompletionCelebration,
  DEMO_ADVENTURE_ID,
} from './invitation';
import { trackDemoComplete } from './stability';
import { applyEndingRewards } from './worldEngine';
import {
  resolveClaimRewards,
  resolveClaimRewardsAsync,
  isAdventureEnded,
} from './rewardInventory';
import { createCompletionCertificate } from './share';
import {
  createVaultReward,
  getAdventureProgress,
  getSponsorInfo,
  syncClaimHistory,
  upsertCertificate,
} from './seed';

function fail(message, extra = {}) {
  return { ok: false, success: false, message, ...extra };
}

function buildVaultRewards(freshAdventure, vaultTemplates, claimedAt) {
  const sponsorInfo = getSponsorInfo(freshAdventure);
  return vaultTemplates.map((r, i) =>
    enrichCouponReward(
      createVaultReward({
        ...r,
        expirationDays:
          r.type === 'coupon'
            ? freshAdventure.couponExpirationDays ?? r.expirationDays
            : r.expirationDays,
        id: r.id || `${freshAdventure.id}-final-${i}`,
        adventureId: freshAdventure.id,
        adventureTitle: freshAdventure.title,
        claimedAt,
        sponsorName: sponsorInfo.name,
        sponsorLogoUrl: sponsorInfo.logoUrl,
        sponsorWebsite: sponsorInfo.website,
      }),
      freshAdventure
    )
  );
}

function buildCollectionMedallionRewards(freshAdventure, collectionRewards, claimedAt) {
  const sponsorInfo = getSponsorInfo(freshAdventure);
  return collectionRewards.map((cr, i) =>
    createVaultReward({
      type: 'medallion',
      icon: '🏆',
      title: cr.medallion,
      desc: `Collection complete: ${cr.collectionId}`,
      valueLabel: 'Exclusive Collection Medallion',
      redemptionInstructions: 'Saved in your Questory Passport.',
      expirationDays: 0,
      id: `${freshAdventure.id}-collection-${i}`,
      adventureId: freshAdventure.id,
      adventureTitle: freshAdventure.title,
      claimedAt,
      sponsorName: sponsorInfo.name,
      sponsorLogoUrl: sponsorInfo.logoUrl,
      sponsorWebsite: sponsorInfo.website,
    })
  );
}

/**
 * Build the post-claim state patch. Pure — caller passes current state into setState.
 */
export function buildClaimSuccessState(
  currentState,
  {
    resolved,
    freshAdventure,
    progressBeforeClaim: p,
    certificate,
    completion,
    vaultRewards,
    isDemo,
  }
) {
  const claimedAt = certificate.completedAt;
  const collectionMedallionRewards = buildCollectionMedallionRewards(
    freshAdventure,
    completion.collectionRewards,
    claimedAt
  );
  const nextRewards = [...currentState.rewards, ...vaultRewards, ...collectionMedallionRewards];
  const baseHistory = syncClaimHistory(nextRewards, currentState.claimHistory);

  let nextState = {
    ...resolved.state,
    coins: currentState.coins + completion.coins + (resolved.coinsBonus || 0),
    entries: currentState.entries + freshAdventure.potEntries,
    engagement: completion.engagement,
    screen: 'victory',
    victoryCertificate: certificate,
    victoryEngagement: {
      ...completion,
      coinsEarned: completion.coins + (resolved.coinsBonus || 0),
      seasonXp: 100,
    },
    pendingRating: isDemo ? null : freshAdventure.id,
    claimMessage: resolved.message || null,
    progress: {
      ...currentState.progress,
      [freshAdventure.id]: { ...p, claimed: true, claimedAt, medallionTapped: true },
    },
    rewards: nextRewards,
    claimHistory: upsertCertificate(baseHistory, certificate),
  };

  nextState = applySeasonalProgress(nextState, freshAdventure);
  nextState = addSeasonPoints(nextState, 100);
  nextState.pendingPhotoMemory = isDemo ? null : freshAdventure.id;

  const placement =
    (freshAdventure.playersCompleted || 0) <= 1
      ? 1
      : (freshAdventure.playersCompleted || 0) <= 5
        ? 2
        : 3;
  nextState = applyExpansionOnCompletion(nextState, freshAdventure, placement);
  nextState = completeDemoIfNeeded(nextState, freshAdventure.id);
  if (isDemo) nextState = trackDemoComplete(nextState);
  nextState = applyGrowthOnCompletion(nextState, freshAdventure);

  return nextState;
}

/**
 * Full treasure claim orchestration. Returns result + state updater for setState.
 */
export async function runClaimTreasure({
  state,
  adventure,
  code,
  options = {},
  user,
  isSupabaseMode,
  claimLimitedRewardRemote,
}) {
  const p = getAdventureProgress(state, adventure.id);
  const method = normalizeClaimMethod(adventure.claimMethod);
  const isDemo = adventure.isDemoAdventure || adventure.id === DEMO_ADVENTURE_ID;
  const medallionAutoClaim =
    Boolean(options.medallionTapped) && method === CLAIM_METHOD.TAP_MEDALLION;

  if (isSupabaseMode && !user && !medallionAutoClaim && !isDemo) {
    return {
      response: fail('Sign in to claim and save your rewards.', { requiresLogin: true }),
      showLogin: true,
    };
  }
  if (p.claimed) {
    return { response: fail('You already claimed this adventure.') };
  }
  if (p.step < adventure.clues.length) {
    return { response: fail('Complete all clues first.') };
  }

  const validation = validateClaimAttempt(adventure, p, { code, ...options });
  if (!validation.ok) {
    return { response: { ...validation, success: false } };
  }

  const freshAdventure = applyEndingRewards(
    state.adventures.find((a) => a.id === adventure.id) || adventure,
    p
  );
  if (isAdventureEnded(freshAdventure)) {
    return {
      response: fail('This adventure has ended. Rewards are no longer available.'),
    };
  }

  const userId = user?.id || 'local-user';
  const resolved =
    isSupabaseMode && user && !isDemo
      ? await resolveClaimRewardsAsync(state, freshAdventure, userId, {
          claimRemote: claimLimitedRewardRemote,
        })
      : resolveClaimRewards(state, freshAdventure, userId);

  if (!resolved.ok) {
    return {
      response: {
        ok: false,
        success: false,
        message: resolved.message || 'Could not claim rewards.',
        ended: resolved.ended,
      },
    };
  }

  const claimedAt = new Date().toISOString();
  const sponsorInfo = getSponsorInfo(freshAdventure);
  const vaultRewards = buildVaultRewards(freshAdventure, resolved.vaultTemplates, claimedAt);

  const primaryReward =
    vaultRewards.find((r) => r.type === 'medallion') || vaultRewards[0];
  const medallionTitles = vaultRewards
    .filter((r) => r.type === 'medallion')
    .map((r) => r.title);

  const certificate = createCompletionCertificate({
    adventureId: freshAdventure.id,
    adventureName: freshAdventure.title,
    rewardName: primaryReward?.title || 'Trail Complete',
    completedAt: claimedAt,
    sponsorInfo,
    collectionName: freshAdventure.collectionName || '',
    adventure: freshAdventure,
    startedAt: p.startedAt || null,
    medallions: medallionTitles,
  });

  const completion = applyAdventureCompletion(
    resolved.state,
    freshAdventure,
    resolved.state.adventures
  );

  return {
    response: {
      ok: true,
      success: true,
      message: resolved.message || 'Treasure claimed!',
      reward: primaryReward,
      victoryData: { certificate, engagement: completion },
    },
    applyToState: (currentState) =>
      buildClaimSuccessState(currentState, {
        resolved,
        freshAdventure,
        progressBeforeClaim: p,
        certificate,
        completion,
        vaultRewards,
        isDemo,
      }),
    showFirstCelebration: (currentState) =>
      shouldShowFirstCompletionCelebration({
        ...currentState,
        engagement: completion.engagement,
      }),
    syncAfterClaim: true,
  };
}

/**
 * Medallion tap in Finder Mode — auto-claim or advance to treasure claim step.
 */
export async function runMedallionCapture({
  adventure,
  context = {},
  state,
  claimTreasure,
  setState,
  syncProfile,
}) {
  const inRange = Boolean(context.inCaptureRange || context.devOverride);

  console.log('[Questory] Tap Medallion clicked', {
    claimMethod: normalizeClaimMethod(adventure.claimMethod),
    inCaptureRange: inRange,
    devOverride: Boolean(context.devOverride),
    distance: context.distance,
    accuracy: context.accuracy,
  });

  if (!inRange) {
    const result = {
      ok: false,
      message: 'Move within capture range to tap the medallion.',
    };
    console.log('[Questory] medallion capture blocked', result);
    return result;
  }

  if (autoClaimsOnTap(adventure)) {
    const result = await claimTreasure(adventure, adventure.claimCode, {
      medallionTapped: true,
    });
    console.log('[Questory] medallion auto-claim result', result);
    return result;
  }

  setState((s) => {
    const nextProgress = {
      ...s.progress,
      [adventure.id]: {
        ...getAdventureProgress(s, adventure.id),
        medallionTapped: true,
        finderUnlocked: true,
      },
    };
    let nextState = { ...s, screen: 'play', progress: nextProgress };
    if (usesArFinder(adventure)) {
      nextState = recordArCapture(nextState, adventure.id);
    }
    syncProfile?.(nextState);
    return nextState;
  });

  const result = { ok: true, nextScreen: 'play' };
  console.log('[Questory] medallion tap advanced', result);
  return result;
}
