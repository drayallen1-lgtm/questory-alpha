import { normalizeEngagement } from '../engagement';
import { normalizeEconomy } from '../economy';
import { normalizeSocial } from '../social';
import { normalizeExpansion } from '../expansion';
import { normalizeExperience } from '../experience';
import { normalizeWorld } from '../worldEngine';
import { normalizeGrowth } from '../growth';
import { normalizeLaunchFunnel, recordLaunchError } from '../stability';
import { mergeAdventuresWithLocalDrafts } from '../draftIntegrity';
import {
  saveUserProfileState,
  upsertUserRewards,
  upsertClaimHistory,
  fetchAllAdventuresForAdmin,
} from './dataService';

/** Build profile + rewards sync helpers bound to the current user session. */
export function createSyncHelpers({ user, isSupabaseMode }) {
  const userId = user?.id;

  function syncProfile(state) {
    if (!isSupabaseMode || !userId) return;
    saveUserProfileState(userId, {
      coins: state.coins,
      entries: state.entries,
      progress: state.progress,
      engagement: state.engagement,
      economy: state.economy,
      social: state.social,
      expansion: state.expansion,
      experience: state.experience,
      world: state.world,
      onboarding: state.onboarding,
      accessibility: state.accessibility,
      firstTimeMetrics: state.firstTimeMetrics,
      growth: state.growth,
      launchFunnel: state.launchFunnel,
    }).catch((err) => console.error('Profile sync failed:', err));
  }

  function syncRewardsAndHistory(rewards, claimHistory) {
    if (!isSupabaseMode || !userId) return;
    upsertUserRewards(userId, rewards).catch((err) =>
      console.error('Rewards sync failed:', err)
    );
    upsertClaimHistory(userId, claimHistory).catch((err) =>
      console.error('Claim history sync failed:', err)
    );
  }

  function syncProgressionState(nextState) {
    syncProfile(nextState);
    syncRewardsAndHistory(nextState.rewards, nextState.claimHistory);
  }

  return { syncProfile, syncRewardsAndHistory, syncProgressionState };
}

/** Merge remote Supabase payload into local app state after initial load. */
export function mergeRemoteDataIntoState(localState, remote, user) {
  let next = {
    ...localState,
    adventures: mergeAdventuresWithLocalDrafts(remote.adventures),
    rewards: user ? remote.rewards : localState.rewards,
    claimHistory: user ? remote.claimHistory : localState.claimHistory,
    coins: user ? remote.coins : localState.coins,
    entries: user ? remote.entries : localState.entries,
    progress: user ? remote.progress : localState.progress,
    engagement: user ? remote.engagement : normalizeEngagement(localState.engagement),
    economy: user ? remote.economy : normalizeEconomy(localState.economy),
    social: user ? remote.social : normalizeSocial(localState.social),
    expansion: user ? remote.expansion : normalizeExpansion(localState.expansion),
    experience: user ? remote.experience : normalizeExperience(localState.experience),
    world: user ? remote.world : normalizeWorld(localState.world),
    onboarding: user ? remote.onboarding : localState.onboarding,
    accessibility: user ? remote.accessibility : localState.accessibility,
    firstTimeMetrics: user ? remote.firstTimeMetrics : localState.firstTimeMetrics,
    growth: user ? remote.growth : normalizeGrowth(localState.growth),
    launchFunnel: user ? remote.launchFunnel : normalizeLaunchFunnel(localState.launchFunnel),
  };

  for (const warning of remote.loadWarnings || []) {
    next = recordLaunchError(next, `remote_load_${warning.section}`, warning.error);
  }

  return next;
}

/** Refresh adventures list from remote and merge local drafts. */
export async function refreshAdventuresFromRemote() {
  const adventures = await fetchAllAdventuresForAdmin();
  return mergeAdventuresWithLocalDrafts(adventures);
}

/** Sync daily-login coin grant when applicable. */
export function syncDailyLoginIfNeeded({ user, isSupabaseMode, state }) {
  if (!isSupabaseMode || !user) return;
  saveUserProfileState(user.id, {
    coins: state.coins,
    entries: state.entries,
    progress: state.progress,
    engagement: state.engagement,
    economy: state.economy,
  }).catch((err) => console.error('Daily login sync failed:', err));
}
