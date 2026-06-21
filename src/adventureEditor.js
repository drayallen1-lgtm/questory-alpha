import { ADVENTURE_STATUS, normalizeAdventure } from './seed';
import { buildWhisperingHollowPreset, normalizeArScene } from './arEngine';
import { normalizeMediaManifest } from './mediaStudio';
import { DEFAULT_RADIUS_METERS } from './geolocation';

export const PUBLISH_REQUIRES_CLUES_MESSAGE = 'Add at least one clue before publishing.';

export function validateAdventureCluesForPublish(adventure) {
  const count = adventure?.clues?.length || 0;
  if (count === 0) {
    return { ok: false, message: PUBLISH_REQUIRES_CLUES_MESSAGE };
  }
  return { ok: true };
}

export function isWhisperingHollowAdventure(adventure) {
  if (!adventure) return false;
  const title = (adventure.title || '').toLowerCase();
  if (title.includes('whispering hollow')) return true;
  return (
    adventure.arTheme === 'horror' &&
    (adventure.adventureTemplate === 'horror' || adventure.finderMode === 'ar_enhanced')
  );
}

export function canRepairWhisperingHollow(adventure) {
  return (
    adventure?.status === ADVENTURE_STATUS.PUBLISHED &&
    isWhisperingHollowAdventure(adventure) &&
    !(adventure.clues?.length)
  );
}

function buildBonusFindsFromClues(clues) {
  return clues
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => String(c.bonusRewardText || '').trim())
    .map(({ c, index }) => ({
      id: `bonus-${index}`,
      afterStep: index,
      title: 'Bonus Find',
      desc: String(c.bonusRewardText).trim(),
      icon: '✨',
      coins: 5,
      type: 'bonus',
    }));
}

export function repairWhisperingHollowClues(adventure) {
  const first = adventure?.clues?.[0];
  const baseLat = first?.latitude != null ? Number(first.latitude) : 37.34;
  const baseLng = first?.longitude != null ? Number(first.longitude) : -95.26;
  const preset = buildWhisperingHollowPreset(
    Number.isFinite(baseLat) ? baseLat : 37.34,
    Number.isFinite(baseLng) ? baseLng : -95.26
  );
  return normalizeAdventure({
    ...adventure,
    adventureTemplate: adventure.adventureTemplate || 'horror',
    finderMode: adventure.finderMode || 'ar_enhanced',
    arTheme: preset.arTheme,
    arFinale: preset.arFinale,
    clues: preset.clues,
    bonusFinds: buildBonusFindsFromClues(preset.clues),
    difficulty: Math.min(5, Math.max(1, preset.clues.length)),
  });
}

export function duplicateAdventureAsDraft(adventure) {
  const stamp = Date.now();
  return normalizeAdventure({
    ...adventure,
    id: `custom-${stamp}`,
    title: `${adventure.title} (Copy)`,
    status: ADVENTURE_STATUS.DRAFT,
    playersCompleted: 0,
    totalCompletions: 0,
    firstFinderName: '',
    clues: (adventure.clues || []).map((c, i) => ({
      ...c,
      id: `c-${stamp}-${i}`,
      arScene: normalizeArScene(c.arScene),
    })),
    finalRewards: (adventure.finalRewards || []).map((r, i) => ({
      ...r,
      id: `custom-reward-${stamp}-${i}`,
      claimedCount: 0,
    })),
  });
}

const REWARD_DEFAULTS = {
  medallion: { icon: '🏅', expirationDays: '0' },
  coupon: { icon: '🎟', expirationDays: '30' },
  physical: { icon: '📦', expirationDays: '0' },
};

export function rewardsFormFromAdventure(adventure) {
  const types = ['medallion', 'coupon', 'physical'];
  const finals = adventure?.finalRewards || [];
  return types.map((type) => {
    const fr = finals.find((r) => r.type === type);
    const defaults = REWARD_DEFAULTS[type] || { icon: '🎁', expirationDays: '0' };
    if (!fr) {
      return {
        type,
        enabled: false,
        icon: defaults.icon,
        title: '',
        desc: '',
        valueLabel: '',
        redemptionInstructions: '',
        expirationDays: defaults.expirationDays,
        quantityLimit: null,
        claimedCount: 0,
        rewardPolicy: 'continue_badge_coins_only',
      };
    }
    return {
      type,
      enabled: true,
      icon: fr.icon || defaults.icon,
      title: fr.title || '',
      desc: fr.desc || fr.description || '',
      valueLabel: fr.valueLabel || '',
      redemptionInstructions: fr.redemptionInstructions || '',
      expirationDays: String(fr.expirationDays ?? defaults.expirationDays),
      quantityLimit: fr.quantityLimit ?? null,
      claimedCount: fr.claimedCount ?? 0,
      rewardPolicy: fr.rewardPolicy || 'continue_badge_coins_only',
    };
  });
}

export function cluesFormFromAdventure(adventure) {
  return (adventure?.clues || []).map((c) => ({
    ...c,
    title: c.title || '',
    text: c.text || '',
    latitude: c.latitude != null && c.latitude !== '' ? String(c.latitude) : '',
    longitude: c.longitude != null && c.longitude !== '' ? String(c.longitude) : '',
    radiusMeters: String(c.radiusMeters ?? DEFAULT_RADIUS_METERS),
    bonusRewardText: c.bonusRewardText || '',
    clueType: c.clueType || 'text_riddle',
    choices: Array.isArray(c.choices) ? c.choices : [],
    audioUrl: c.audioUrl || '',
    videoUrl: c.videoUrl || '',
    imageUrl: c.imageUrl || '',
    branchOptions: c.branchOptions || [],
    arScene: normalizeArScene(c.arScene),
  }));
}

export function metaFormFromAdventure(adventure) {
  const sponsor = adventure?.sponsorInfo || {};
  return {
    title: adventure?.title || '',
    location: adventure?.location || '',
    sponsorName: sponsor.name || adventure?.sponsor || '',
    sponsorLogoUrl: sponsor.logoUrl || '',
    sponsorWebsite: sponsor.website || '',
    story: adventure?.story || '',
    claimCode: adventure?.claimCode || '',
    claimMethod: adventure?.claimMethod || 'secret_code',
    qrClaimValue: adventure?.qrClaimValue || '',
    physicalMedallionCode: adventure?.physicalMedallionCode || '',
    hintAfterTap: adventure?.hintAfterTap || '',
    collectionName: adventure?.collectionName || '',
    collectionId: adventure?.collectionId || '',
    collectionBadge: adventure?.collectionBadge || '',
    collectionRewardCoins: adventure?.collectionRewardCoins ?? 500,
    collectionRewardMedallion: adventure?.collectionRewardMedallion || '',
    isFounderHunt: Boolean(adventure?.isFounderHunt),
    playMode: adventure?.playMode || 'both',
    finderMode: adventure?.finderMode || 'finder',
    arAssetType: adventure?.arAssetType || 'ghost_lantern',
    tier: adventure?.tier || 'standard',
    premiumCoinCost: adventure?.premiumCoinCost ?? 250,
    city: adventure?.city || '',
    state: adventure?.state || '',
    estimatedMinutes: adventure?.estimatedMinutes ?? 25,
    couponQuantity: adventure?.couponQuantity ?? 100,
    couponTerms: adventure?.couponTerms || '',
    couponExpirationDays: adventure?.couponExpirationDays ?? 7,
    endRule: adventure?.endRule || 'no_end_date',
    endsAt: adventure?.endsAt || null,
    endsAfterTotalCompletions: adventure?.endsAfterTotalCompletions ?? null,
    finderSearchRadiusM: adventure?.finderSearchRadiusM ?? 200,
    finderCaptureBaseM: adventure?.finderCaptureBaseM ?? 25,
  };
}

export function adventureToCreateFormState(adventure) {
  if (!adventure) return null;
  return {
    meta: metaFormFromAdventure(adventure),
    clues: cluesFormFromAdventure(adventure),
    rewards: rewardsFormFromAdventure(adventure),
    adventureTemplate: adventure.adventureTemplate || 'from_scratch',
    adventureScale: adventure.adventureScale || 'city',
    experienceSettings: adventure.experienceSettings || {},
    arFinale: normalizeArScene(adventure.arFinale),
    arTheme: adventure.arTheme || 'none',
    mediaManifest: normalizeMediaManifest(adventure.mediaManifest || []),
  };
}

export function replaceAdventureInList(adventures, adventure) {
  const rest = adventures.filter((a) => a.id !== adventure.id);
  return [adventure, ...rest];
}

export function mergeAdventurePreserveFields(existing, next) {
  if (!existing) return next;
  return {
    ...existing,
    ...next,
    id: existing.id,
    playersCompleted: existing.playersCompleted ?? next.playersCompleted ?? 0,
    totalCompletions: existing.totalCompletions ?? next.totalCompletions ?? 0,
    firstFinderName: existing.firstFinderName || next.firstFinderName || '',
    creatorId: existing.creatorId || next.creatorId,
    growthAnalytics: next.growthAnalytics || existing.growthAnalytics,
    worldConfig: next.worldConfig || existing.worldConfig,
    questCode: next.questCode || existing.questCode,
  };
}
