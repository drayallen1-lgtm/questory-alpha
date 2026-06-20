import { supabase, hasSupabase } from './client';
import {
  rowToAdventure,
  adventureToRow,
  cluesToRows,
  rewardsToRows,
  rowToUserReward,
  userRewardToRow,
  rowToClaimHistory,
  claimHistoryToRow,
} from './mappers';
import { defaultState, getPublishedAdventures } from '../seed';
import { normalizeEngagement } from '../engagement';
import { normalizeEconomy } from '../economy';
import { normalizeSocial } from '../social';
import { normalizeExpansion } from '../expansion';
import { normalizeExperience } from '../experience';
import { normalizeWorld } from '../worldEngine';
import {
  normalizeOnboarding,
  normalizeAccessibility,
  normalizeFirstTimeMetrics,
} from '../invitation';
import { normalizeGrowth } from '../growth';
import { normalizeLaunchFunnel, mapReasonToMessage } from '../stability';

function profileToEngagement(profile) {
  if (!profile) return normalizeEngagement();
  return normalizeEngagement({
    badges: profile.badges || [],
    streak: profile.streak || undefined,
    milesWalked: profile.miles_walked ?? 0,
    adventuresCompleted: profile.adventures_completed ?? 0,
    founderHuntsCompleted: profile.founder_hunts_completed ?? 0,
    collectionsCompleted: profile.collections_completed || [],
    firstFinderAdventures: profile.first_finder_adventures || [],
    completedCollectionRewards: profile.completed_collection_rewards || [],
  });
}

function profileToEconomy(profile) {
  if (!profile?.economy) return normalizeEconomy();
  return normalizeEconomy(profile.economy);
}

function engagementToProfileFields(engagement) {
  const e = normalizeEngagement(engagement);
  return {
    badges: e.badges,
    streak: e.streak,
    miles_walked: e.milesWalked,
    adventures_completed: e.adventuresCompleted,
    founder_hunts_completed: e.founderHuntsCompleted,
    collections_completed: e.collectionsCompleted,
    first_finder_adventures: e.firstFinderAdventures,
    completed_collection_rewards: e.completedCollectionRewards,
  };
}

function economyToProfileFields(economy) {
  return { economy: normalizeEconomy(economy) };
}

function profileToSocial(profile) {
  if (!profile?.social) return normalizeSocial();
  return normalizeSocial(profile.social);
}

function socialToProfileFields(social) {
  return { social: normalizeSocial(social) };
}

function profileToExpansion(profile) {
  if (!profile?.expansion) return normalizeExpansion();
  return normalizeExpansion(profile.expansion);
}

function expansionToProfileFields(expansion) {
  return { expansion: normalizeExpansion(expansion) };
}

function profileToExperience(profile) {
  if (!profile?.experience) return normalizeExperience();
  return normalizeExperience(profile.experience);
}

function experienceToProfileFields(experience) {
  return { experience: normalizeExperience(experience) };
}

function profileToWorld(profile) {
  if (!profile?.world) return normalizeWorld();
  return normalizeWorld(profile.world);
}

function worldToProfileFields(world) {
  return { world: normalizeWorld(world) };
}

function profileToOnboarding(profile) {
  if (!profile?.onboarding) return normalizeOnboarding();
  return normalizeOnboarding(profile.onboarding);
}

function onboardingToProfileFields(onboarding) {
  return { onboarding: normalizeOnboarding(onboarding) };
}

function profileToAccessibility(profile) {
  if (!profile?.accessibility) return normalizeAccessibility();
  return normalizeAccessibility(profile.accessibility);
}

function accessibilityToProfileFields(accessibility) {
  return { accessibility: normalizeAccessibility(accessibility) };
}

function profileToFirstTimeMetrics(profile) {
  if (!profile?.first_time_metrics) return normalizeFirstTimeMetrics();
  return normalizeFirstTimeMetrics(profile.first_time_metrics);
}

function firstTimeMetricsToProfileFields(metrics) {
  return { first_time_metrics: normalizeFirstTimeMetrics(metrics) };
}

function profileToGrowth(profile) {
  if (!profile?.growth) return normalizeGrowth();
  return normalizeGrowth(profile.growth);
}

function growthToProfileFields(growth) {
  return { growth: normalizeGrowth(growth) };
}

function profileToLaunchFunnel(profile) {
  if (!profile?.launch_funnel) return normalizeLaunchFunnel();
  return normalizeLaunchFunnel(profile.launch_funnel);
}

function launchFunnelToProfileFields(launchFunnel) {
  return { launch_funnel: normalizeLaunchFunnel(launchFunnel) };
}

function localPublishedFallback() {
  return getPublishedAdventures(defaultState.adventures);
}

function safeRowToAdventure(row, clueMap) {
  try {
    return rowToAdventure(row, clueMap[row.id] || []);
  } catch (err) {
    console.warn('[Questory] Skipping adventure row', row?.id, err);
    return null;
  }
}

async function fetchCluesForAdventures(adventureIds) {
  if (!adventureIds.length) return {};
  const { data, error } = await supabase
    .from('clues')
    .select('*')
    .in('adventure_id', adventureIds);
  if (error) throw error;
  const grouped = {};
  for (const clue of data || []) {
    if (!grouped[clue.adventure_id]) grouped[clue.adventure_id] = [];
    grouped[clue.adventure_id].push(clue);
  }
  return grouped;
}

export async function fetchAdventures(isAdmin = false) {
  if (!hasSupabase()) return isAdmin ? defaultState.adventures : localPublishedFallback();

  try {
    let query = supabase.from('adventures').select('*').order('created_at', { ascending: false });
    if (!isAdmin) {
      query = query.eq('status', 'published');
    }
    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    let clueMap = {};
    try {
      clueMap = await fetchCluesForAdventures(rows.map((r) => r.id));
    } catch (clueErr) {
      console.warn('[Questory] Clue fetch failed; loading adventures without clues', clueErr);
    }

    const adventures = rows.map((row) => safeRowToAdventure(row, clueMap)).filter(Boolean);
    if (adventures.length) return adventures;
    return isAdmin ? defaultState.adventures : localPublishedFallback();
  } catch (err) {
    console.warn('[Questory] Adventure fetch failed; using local seed adventures', err);
    return isAdmin ? defaultState.adventures : localPublishedFallback();
  }
}

export async function fetchPublishedAdventures() {
  return fetchAdventures(false);
}

export async function fetchAllAdventuresForAdmin() {
  return fetchAdventures(true);
}

export async function fetchUserProfile(userId) {
  if (!hasSupabase() || !userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchUserRewards(userId) {
  if (!hasSupabase() || !userId) return [];
  const { data, error } = await supabase
    .from('user_rewards')
    .select('*')
    .eq('user_id', userId)
    .order('claimed_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToUserReward);
}

export async function fetchClaimHistory(userId) {
  if (!hasSupabase() || !userId) return [];
  const { data, error } = await supabase
    .from('claim_history')
    .select('*')
    .eq('user_id', userId)
    .order('claimed_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToClaimHistory);
}

export async function loadRemoteData(userId, isAdmin) {
  const loadWarnings = [];
  const adventures = isAdmin
    ? await fetchAllAdventuresForAdmin()
    : await fetchPublishedAdventures();

  const emptyProfileState = {
    adventures,
    rewards: [],
    claimHistory: [],
    coins: 0,
    entries: 0,
    progress: {},
    engagement: normalizeEngagement(),
    economy: normalizeEconomy(),
    social: normalizeSocial(),
    expansion: normalizeExpansion(),
    experience: normalizeExperience(),
    world: normalizeWorld(),
    onboarding: normalizeOnboarding(),
    accessibility: normalizeAccessibility(),
    firstTimeMetrics: normalizeFirstTimeMetrics(),
    growth: normalizeGrowth(),
    launchFunnel: normalizeLaunchFunnel(),
    loadWarnings,
  };

  if (!userId) return emptyProfileState;

  let profile = null;
  try {
    profile = await fetchUserProfile(userId);
  } catch (err) {
    console.warn('[Questory] Profile load failed', err);
    loadWarnings.push({ section: 'profile', error: err });
  }

  let rewards = [];
  try {
    rewards = await fetchUserRewards(userId);
  } catch (err) {
    console.warn('[Questory] Rewards load failed', err);
    loadWarnings.push({ section: 'rewards', error: err });
  }

  let claimHistory = [];
  try {
    claimHistory = await fetchClaimHistory(userId);
  } catch (err) {
    console.warn('[Questory] Claim history load failed', err);
    loadWarnings.push({ section: 'claim_history', error: err });
  }

  return {
    ...emptyProfileState,
    rewards,
    claimHistory,
    coins: profile?.coins ?? 0,
    entries: profile?.entries ?? 0,
    progress: profile?.progress ?? {},
    engagement: profileToEngagement(profile),
    economy: profileToEconomy(profile),
    social: profileToSocial(profile),
    expansion: profileToExpansion(profile),
    experience: profileToExperience(profile),
    world: profileToWorld(profile),
    onboarding: profileToOnboarding(profile),
    accessibility: profileToAccessibility(profile),
    firstTimeMetrics: profileToFirstTimeMetrics(profile),
    growth: profileToGrowth(profile),
    launchFunnel: profileToLaunchFunnel(profile),
  };
}

export async function upsertAdventure(adventure, creatorId) {
  if (!hasSupabase()) return adventure;
  if (!creatorId) throw new Error('Sign in to save adventures to the cloud.');

  const row = adventureToRow(adventure, creatorId);
  let { error: advError } = await supabase.from('adventures').upsert(row);
  if (advError && (row.ar_finale != null || row.ar_theme != null)) {
    const fallbackRow = { ...row };
    delete fallbackRow.ar_finale;
    delete fallbackRow.ar_theme;
    ({ error: advError } = await supabase.from('adventures').upsert(fallbackRow));
  }
  if (advError) throw advError;

  const { error: clueDeleteError } = await supabase
    .from('clues')
    .delete()
    .eq('adventure_id', adventure.id);
  if (clueDeleteError) throw clueDeleteError;

  const { error: rewardDeleteError } = await supabase
    .from('rewards')
    .delete()
    .eq('adventure_id', adventure.id);
  if (rewardDeleteError) throw rewardDeleteError;

  const clues = cluesToRows(adventure);
  if (clues.length) {
    let { error } = await supabase.from('clues').insert(clues);
    if (error && clues.some((c) => c.ar_scene && Object.keys(c.ar_scene).length)) {
      const fallbackClues = clues.map(({ ar_scene, ...rest }) => rest);
      ({ error } = await supabase.from('clues').insert(fallbackClues));
    }
    if (error) throw error;
  }

  const rewards = rewardsToRows(adventure);
  if (rewards.length) {
    const { error } = await supabase.from('rewards').insert(rewards);
    if (error) throw error;
  }

  return adventure;
}

export async function updateAdventureStatus(adventureId, status) {
  if (!hasSupabase()) return;
  const { error } = await supabase
    .from('adventures')
    .update({ status })
    .eq('id', adventureId);
  if (error) throw error;
}

export async function deleteAdventureRemote(adventureId) {
  if (!hasSupabase()) return;
  const { error } = await supabase.from('adventures').delete().eq('id', adventureId);
  if (error) throw error;
}

export async function saveUserProfileState(userId, { coins, entries, progress, engagement, economy, social, expansion, experience, world, onboarding, accessibility, firstTimeMetrics, growth, launchFunnel }) {
  if (!hasSupabase() || !userId) return;
  const payload = { coins, entries, progress };
  if (engagement) Object.assign(payload, engagementToProfileFields(engagement));
  if (economy) Object.assign(payload, economyToProfileFields(economy));
  if (social) Object.assign(payload, socialToProfileFields(social));
  if (expansion) Object.assign(payload, expansionToProfileFields(expansion));
  if (experience) Object.assign(payload, experienceToProfileFields(experience));
  if (world) Object.assign(payload, worldToProfileFields(world));
  if (onboarding) Object.assign(payload, onboardingToProfileFields(onboarding));
  if (accessibility) Object.assign(payload, accessibilityToProfileFields(accessibility));
  if (firstTimeMetrics) Object.assign(payload, firstTimeMetricsToProfileFields(firstTimeMetrics));
  if (growth) Object.assign(payload, growthToProfileFields(growth));
  if (launchFunnel) Object.assign(payload, launchFunnelToProfileFields(launchFunnel));
  let { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error && payload.launch_funnel) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.launch_funnel;
    ({ error } = await supabase.from('profiles').update(fallbackPayload).eq('id', userId));
  }
  if (error) throw error;
}

export async function upsertUserRewards(userId, rewards) {
  if (!hasSupabase() || !userId || !rewards.length) return;
  const rows = rewards.map((r) => userRewardToRow(r, userId));
  const { error } = await supabase.from('user_rewards').upsert(rows);
  if (error) throw error;
}

export async function upsertClaimHistory(userId, entries) {
  if (!hasSupabase() || !userId || !entries.length) return;
  const rows = entries.map((e) => claimHistoryToRow(e, userId));
  const { error } = await supabase.from('claim_history').upsert(rows);
  if (error) throw error;
}

export async function claimLimitedRewardRemote(adventureId, rewardId, userId) {
  if (!hasSupabase() || !userId) {
    return {
      ok: false,
      reason: 'not_authenticated',
      message: mapReasonToMessage('not_authenticated'),
    };
  }
  const { data, error } = await supabase.rpc('claim_limited_reward', {
    p_adventure_id: adventureId,
    p_reward_id: rewardId,
    p_user_id: userId,
  });
  if (error) throw error;
  const result = data || { ok: false, reason: 'unknown' };
  if (!result.ok && !result.message) {
    result.message = mapReasonToMessage(result.reason) || 'Something went wrong.';
  }
  return result;
}

export async function claimLimitedRewardsForAdventure(adventure, userId) {
  const results = [];
  for (const reward of adventure.finalRewards || []) {
    if (reward.quantityLimit == null) {
      results.push({ reward, result: { ok: true, unlimited: true } });
      continue;
    }
    const result = await claimLimitedRewardRemote(adventure.id, reward.id, userId);
    results.push({ reward, result });
  }
  return results;
}
