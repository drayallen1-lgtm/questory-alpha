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
  const adventures = await fetchAdventures(isAdmin);
  if (!userId) {
    return {
      adventures: adventures.length ? adventures : defaultState.adventures,
      rewards: [],
      claimHistory: [],
      coins: 0,
      entries: 0,
      progress: {},
    };
  }

  const [profile, rewards, claimHistory] = await Promise.all([
    fetchUserProfile(userId),
    fetchUserRewards(userId),
    fetchClaimHistory(userId),
  ]);

  return {
    adventures: adventures.length ? adventures : defaultState.adventures,
    rewards,
    claimHistory,
    coins: profile?.coins ?? 0,
    entries: profile?.entries ?? 0,
    progress: profile?.progress ?? {},
  };
}

export async function upsertAdventure(adventure, creatorId) {
  if (!hasSupabase()) return adventure;
  const row = adventureToRow(adventure, creatorId);
  const { error: advError } = await supabase.from('adventures').upsert(row);
  if (advError) throw advError;

  await supabase.from('clues').delete().eq('adventure_id', adventure.id);
  await supabase.from('rewards').delete().eq('adventure_id', adventure.id);

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

export async function saveUserProfileState(userId, { coins, entries, progress }) {
  if (!hasSupabase() || !userId) return;
  const { error } = await supabase
    .from('profiles')
    .update({ coins, entries, progress })
    .eq('id', userId);
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
