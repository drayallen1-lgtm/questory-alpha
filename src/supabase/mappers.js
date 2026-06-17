import { normalizeAdventure, normalizeReward } from '../seed';
import { normalizeClaimMethod } from '../finderMode';

export function rowToAdventure(row, clues = []) {
  const sortedClues = [...clues].sort((a, b) => a.sort_order - b.sort_order);
  return normalizeAdventure({
    id: row.id,
    title: row.title,
    location: row.location || '',
    story: row.story || '',
    sponsor: row.sponsor_name || '',
    sponsorInfo: {
      name: row.sponsor_name || '',
      logoUrl: row.sponsor_logo_url || '',
      website: row.sponsor_website || '',
    },
    distance: row.distance || '',
    prize: row.prize || '',
    status: row.status,
    difficulty: row.difficulty ?? 3,
    claimCode: row.claim_code,
    claimMethod: row.claim_method,
    qrClaimValue: row.qr_claim_value || row.claim_code,
    finderSearchRadiusM: row.finder_search_radius_m ?? 200,
    finderCaptureBaseM: row.finder_capture_base_m ?? 25,
    rewardCoins: row.reward_coins ?? 0,
    potEntries: row.pot_entries ?? 0,
    bonusFinds: row.bonus_finds || [],
    finalRewards: (row.final_rewards || []).map((r) => ({
      ...r,
      desc: r.desc ?? r.description,
    })),
    clues: sortedClues.map((c) => ({
      id: c.id,
      title: c.title,
      text: c.text,
      latitude: c.latitude,
      longitude: c.longitude,
      radiusMeters: c.radius_meters,
      bonusRewardText: c.bonus_reward_text || '',
    })),
    creatorId: row.creator_id,
  });
}

export function adventureToRow(adventure, creatorId) {
  const sponsor = adventure.sponsorInfo || { name: adventure.sponsor || '' };
  return {
    id: adventure.id,
    creator_id: creatorId || adventure.creatorId || null,
    title: adventure.title,
    location: adventure.location,
    story: adventure.story,
    sponsor_name: sponsor.name,
    sponsor_logo_url: sponsor.logoUrl || '',
    sponsor_website: sponsor.website || '',
    distance: adventure.distance,
    prize: adventure.prize,
    status: adventure.status,
    difficulty: adventure.difficulty,
    claim_code: adventure.claimCode,
    claim_method: normalizeClaimMethod(adventure.claimMethod),
    qr_claim_value: adventure.qrClaimValue || adventure.claimCode || '',
    finder_search_radius_m: adventure.finderSearchRadiusM ?? 200,
    finder_capture_base_m: adventure.finderCaptureBaseM ?? 25,
    reward_coins: adventure.rewardCoins ?? 0,
    pot_entries: adventure.potEntries ?? 0,
    bonus_finds: adventure.bonusFinds || [],
    final_rewards: adventure.finalRewards || [],
  };
}

export function cluesToRows(adventure) {
  return (adventure.clues || []).map((clue, index) => ({
    id: clue.id,
    adventure_id: adventure.id,
    sort_order: index,
    title: clue.title,
    text: clue.text,
    latitude: clue.latitude,
    longitude: clue.longitude,
    radius_meters: clue.radiusMeters ?? 500,
    bonus_reward_text: clue.bonusRewardText || null,
  }));
}

export function rewardsToRows(adventure) {
  return (adventure.finalRewards || []).map((reward, index) => ({
    id: `${adventure.id}-reward-${index}`,
    adventure_id: adventure.id,
    sort_order: index,
    type: reward.type,
    icon: reward.icon,
    title: reward.title,
    description: reward.desc ?? reward.description ?? '',
    value_label: reward.valueLabel || '',
    redemption_instructions: reward.redemptionInstructions || '',
    expiration_days: reward.expirationDays ?? 0,
  }));
}

export function rowToUserReward(row) {
  return normalizeReward({
    id: row.id,
    type: row.type,
    icon: row.icon,
    title: row.title,
    desc: row.description,
    valueLabel: row.value_label,
    redemptionInstructions: row.redemption_instructions,
    adventureId: row.adventure_id,
    adventureTitle: row.adventure_title,
    sponsorName: row.sponsor_name,
    sponsorLogoUrl: row.sponsor_logo_url,
    sponsorWebsite: row.sponsor_website,
    status: row.status,
    claimedAt: row.claimed_at,
    redeemedAt: row.redeemed_at,
    expiresAt: row.expires_at,
  });
}

export function userRewardToRow(reward, userId) {
  return {
    id: reward.id,
    user_id: userId,
    adventure_id: reward.adventureId,
    type: reward.type,
    icon: reward.icon,
    title: reward.title,
    description: reward.desc,
    value_label: reward.valueLabel,
    redemption_instructions: reward.redemptionInstructions,
    adventure_title: reward.adventureTitle,
    sponsor_name: reward.sponsorName,
    sponsor_logo_url: reward.sponsorLogoUrl,
    sponsor_website: reward.sponsorWebsite,
    status: reward.status,
    claimed_at: reward.claimedAt,
    redeemed_at: reward.redeemedAt,
    expires_at: reward.expiresAt,
  };
}

export function rowToClaimHistory(row) {
  return {
    id: row.id,
    kind: row.kind,
    adventureId: row.adventure_id,
    adventureName: row.adventure_name,
    rewardName: row.reward_name,
    type: row.type,
    status: row.status,
    claimedAt: row.claimed_at,
    redeemedAt: row.redeemed_at,
    shareText: row.share_text,
    sponsorName: row.sponsor_name,
    sponsorLogoUrl: row.sponsor_logo_url,
    sponsorWebsite: row.sponsor_website,
    verified: row.verified,
    completedAt: row.claimed_at,
  };
}

export function claimHistoryToRow(entry, userId) {
  return {
    id: entry.id,
    user_id: userId,
    adventure_id: entry.adventureId || null,
    kind: entry.kind || 'reward',
    adventure_name: entry.adventureName,
    reward_name: entry.rewardName,
    type: entry.type,
    status: entry.status,
    claimed_at: entry.claimedAt || entry.completedAt,
    redeemed_at: entry.redeemedAt,
    share_text: entry.shareText,
    sponsor_name: entry.sponsorName,
    sponsor_logo_url: entry.sponsorLogoUrl,
    sponsor_website: entry.sponsorWebsite,
    verified: entry.verified ?? false,
  };
}
