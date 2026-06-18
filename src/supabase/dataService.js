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
import { defaultState } from '../seed';
import { normalizeEngagement } from '../engagement';
import { normalizeEconomy } from '../economy';
import { normalizeSocial } from '../social';
import { normalizeExpansion } from '../expansion';

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
  if (!hasSupabase()) return defaultState.adventures;

  let query = supabase.from('adventures').select('*').order('created_at', { ascending: false });
  if (!isAdmin) {
    query = query.eq('status', 'published');
  }
  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  const clueMap = await fetchCluesForAdventures(rows.map((r) => r.id));
  return rows.map((row) => rowToAdventure(row, clueMap[row.id] || []));
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
  const adventures = isAdmin
    ? await fetchAllAdventuresForAdmin()
    : await fetchPublishedAdventures();

  if (!userId) {
    return {
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
    };
  }

  const [profile, rewards, claimHistory] = await Promise.all([
    fetchUserProfile(userId),
    fetchUserRewards(userId),
    fetchClaimHistory(userId),
  ]);

  return {
    adventures,
    rewards,
    claimHistory,
    coins: profile?.coins ?? 0,
    entries: profile?.entries ?? 0,
    progress: profile?.progress ?? {},
    engagement: profileToEngagement(profile),
    economy: profileToEconomy(profile),
    social: profileToSocial(profile),
    expansion: profileToExpansion(profile),
  };
}

export async function upsertAdventure(adventure, creatorId) {
  if (!hasSupabase()) return adventure;
  if (!creatorId) throw new Error('Sign in to save adventures to the cloud.');

  const row = adventureToRow(adventure, creatorId);
  const { error: advError } = await supabase.from('adventures').upsert(row);
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
    const { error } = await supabase.from('clues').insert(clues);
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

export async function saveUserProfileState(userId, { coins, entries, progress, engagement, economy, social, expansion }) {
  if (!hasSupabase() || !userId) return;
  const payload = { coins, entries, progress };
  if (engagement) Object.assign(payload, engagementToProfileFields(engagement));
  if (economy) Object.assign(payload, economyToProfileFields(economy));
  if (social) Object.assign(payload, socialToProfileFields(social));
  if (expansion) Object.assign(payload, expansionToProfileFields(expansion));
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
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
