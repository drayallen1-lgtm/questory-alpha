import { recordGhostRun } from './social';
import { usesFinderFlow } from './expansion';
import { claimMethodUsesFinder as adventureUsesFinder } from './claimSystem';
import {
  createVaultReward,
  getAdventureProgress,
  getSponsorInfo,
  syncClaimHistory,
} from './seed';

/**
 * Advance one clue step for an adventure. Pure state transition — no side effects.
 */
export function advanceClueForAdventure(state, adventure, startRef) {
  const clues = Array.isArray(adventure?.clues) ? adventure.clues : [];
  const bonusFinds = Array.isArray(adventure?.bonusFinds) ? adventure.bonusFinds : [];
  const p = getAdventureProgress(state, adventure.id);
  const clueDuration = Date.now() - (startRef?.current || Date.now());
  const total = clues.length;
  const nextStep = total > 0 ? Math.min(total, p.step + 1) : p.step + 1;
  const bonus = bonusFinds.find(
    (b) => b && b.afterStep === p.step && !p.bonuses.includes(b.id)
  );

  const bonuses = bonus ? [...p.bonuses, bonus.id] : p.bonuses;
  const bonusRewards = bonus
    ? [
        createVaultReward({
          id: `${adventure.id}-${bonus.id}`,
          type: bonus.type === 'coupon' ? 'coupon' : 'bonus',
          icon: bonus.icon,
          title: bonus.title,
          desc: bonus.couponCode ? `${bonus.desc} Code: ${bonus.couponCode}` : bonus.desc,
          valueLabel: bonus.type === 'coupon' ? 'Bonus coupon' : 'Trail bonus',
          redemptionInstructions: bonus.couponCode
            ? `Use code ${bonus.couponCode} at the sponsor location.`
            : 'Collect your bonus in the Questory Vault.',
          expirationDays: bonus.type === 'coupon' ? 30 : 0,
          adventureId: adventure.id,
          adventureTitle: adventure.title,
          sponsorName: getSponsorInfo(adventure).name,
          sponsorLogoUrl: getSponsorInfo(adventure).logoUrl,
          sponsorWebsite: getSponsorInfo(adventure).website,
        }),
      ]
    : [];

  const existingRewards = Array.isArray(state.rewards) ? state.rewards : [];
  const nextRewards = [...existingRewards, ...bonusRewards];
  const completedAllClues = total === 0 || nextStep >= total;
  const claimHistory = Array.isArray(state.claimHistory) ? state.claimHistory : [];

  let nextState = {
    ...state,
    coins: state.coins + (bonus?.coins || 0),
    progress: {
      ...state.progress,
      [adventure.id]: { ...p, step: nextStep, bonuses },
    },
    rewards: nextRewards,
    claimHistory: syncClaimHistory(nextRewards, claimHistory),
    screen: bonus
      ? 'bonus'
      : completedAllClues && adventureUsesFinder(adventure) && usesFinderFlow(adventure)
        ? 'medallion-signal'
        : state.screen,
    pendingBonus: bonus || null,
  };

  if (startRef) startRef.current = Date.now();
  if (total > 0) {
    nextState = recordGhostRun(nextState, adventure.id, p.step, clueDuration);
  }
  return nextState;
}

/** Screen transition after dismissing a bonus-find modal. */
export function continueAfterBonus(state) {
  const adventure = state.adventures.find((a) => a.id === state.selectedAdventureId);
  const p = adventure ? getAdventureProgress(state, adventure.id) : null;
  const allDone = p && adventure && p.step >= adventure.clues.length;
  return {
    ...state,
    screen:
      allDone && adventure && adventureUsesFinder(adventure) && usesFinderFlow(adventure)
        ? 'medallion-signal'
        : 'play',
    pendingBonus: null,
  };
}

/** Record adventure start timestamp on first play navigation. */
export function applyPlayNavigation(state, adventureId) {
  const playProgress = getAdventureProgress(state, adventureId);
  if (!playProgress.startedAt && playProgress.step === 0 && !playProgress.claimed) {
    return {
      ...state,
      progress: {
        ...state.progress,
        [adventureId]: {
          ...playProgress,
          startedAt: new Date().toISOString(),
        },
      },
    };
  }
  return state;
}
