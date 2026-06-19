export const STORAGE_KEY = 'questoryAlpha';

export const REWARD_STATUS = {
  ACTIVE: 'active',
  REDEEMED: 'redeemed',
  EXPIRED: 'expired',
};

export const ADVENTURE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

/** Readable auto-generated final claim code (e.g. QUEST-4821). */
export function generateClaimCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `QUEST-${num}`;
}

import {
  CLAIM_METHOD,
  CLAIM_METHOD_OPTIONS,
  normalizeClaimMethod,
  usesFinderMode,
} from './claimSystem';
import { DEFAULT_ENGAGEMENT, normalizeEngagement } from './engagement';
import { DEFAULT_ECONOMY, normalizeEconomy } from './economy';
import { DEFAULT_SOCIAL, normalizeSocial } from './social';
import { DEFAULT_EXPANSION, normalizeExpansion } from './expansion';
import { mergeAdventureInventory, normalizeFinalRewards, REWARD_POLICIES } from './rewardInventory';
import { mergeAdventureExperience, DEFAULT_EXPERIENCE, normalizeExperience } from './experience';
import { mergeAdventureWorld, DEFAULT_WORLD, normalizeWorld } from './worldEngine';
import {
  DEFAULT_ONBOARDING,
  DEFAULT_ACCESSIBILITY,
  DEFAULT_FIRST_TIME_METRICS,
  normalizeOnboarding,
  normalizeAccessibility,
  normalizeFirstTimeMetrics,
  ensureDemoAdventure,
} from './invitation';

export { CLAIM_METHOD, CLAIM_METHOD_OPTIONS, normalizeClaimMethod, usesFinderMode };

export const defaultState = {
  coins: 0,
  entries: 0,
  screen: 'home',
  selectedAdventureId: null,
  selectedCreatorId: null,
  progress: {},
  rewards: [],
  claimHistory: [],
  victoryCertificate: null,
  victoryEngagement: null,
  pendingRating: null,
  pendingPhotoMemory: null,
  claimMessage: null,
  adminPreview: false,
  adminTab: 'drafts',
  engagement: { ...DEFAULT_ENGAGEMENT },
  economy: { ...DEFAULT_ECONOMY },
  social: { ...DEFAULT_SOCIAL },
  expansion: { ...DEFAULT_EXPANSION },
  rewardClaims: {},
  experience: { ...DEFAULT_EXPERIENCE },
  world: { ...DEFAULT_WORLD },
  onboarding: { ...DEFAULT_ONBOARDING },
  accessibility: { ...DEFAULT_ACCESSIBILITY },
  firstTimeMetrics: { ...DEFAULT_FIRST_TIME_METRICS },
  pendingInviteAdventureId: null,
  quickSponsor: false,
  adventures: ensureDemoAdventure([
    {
      id: 'parsons-gold-rush',
      title: 'The Hidden Ledger',
      location: 'Parsons, Kansas',
      city: 'Parsons',
      state: 'Kansas',
      region: 'Kansas',
      collectionId: 'parsons-legends',
      collectionName: 'Parsons Legends',
      collectionBadge: 'Keeper of Parsons Badge',
      collectionRewardCoins: 500,
      collectionRewardMedallion: 'Parsons Legends Exclusive Medallion',
      estimatedMinutes: 25,
      milesEstimate: 0.8,
      playersCompleted: 38,
      firstFinderName: 'Sarah J.',
      isFounderHunt: false,
      tier: 'standard',
      premiumCoinCost: 250,
      creatorProfileId: 'parsons-heritage',
      sponsorVerified: true,
      avgRating: 4.8,
      reviewCount: 241,
      couponQuantity: 200,
      couponTerms: 'One per customer. Valid at participating Parsons locations.',
      couponExpirationDays: 7,
      playMode: 'both',
      heatCategory: 'trending',
      finderMode: 'ar_enhanced',
      arAssetType: 'ancient_artifact',
      isLegendaryHunt: true,
      legendaryType: 'lost_ledger',
      isSponsoredDrop: true,
      sponsoredDropId: 'walmart-hidden-savings',
      sponsorInfo: {
        name: 'Parsons Heritage Trail',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Parsons_Kansas_Logo.png/120px-Parsons_Kansas_Logo.png',
        website: 'https://www.parsonsks.com',
        verified: true,
        businessEmail: 'trails@parsonsks.com',
      },
      sponsor: 'Parsons Heritage Trail',
      distance: '0.8 mi',
      prize: 'Legendary Medallion + Local Rewards',
      status: 'published',
      difficulty: 3,
      claimCode: 'PARSONS128',
      claimMethod: 'secret_code',
      qrClaimValue: 'PARSONS128',
      finderSearchRadiusM: 200,
      finderCaptureBaseM: 25,
      rewardCoins: 50,
      potEntries: 5,
      story:
        'A railroad conductor vanished before cashing his final paycheck. Legend says he left behind a hidden medallion somewhere in Parsons. Follow the clues. Unlock the trail. Claim the treasure.',
      clues: [
        {
          id: 'clue-1',
          title: 'Depot Echo',
          text: 'Where iron rails crossed and travelers waited beneath the clock tower, find the name of the vanished conductor carved in memory.',
          latitude: 37.3392,
          longitude: -95.261,
          radiusMeters: 500,
        },
        {
          id: 'clue-2',
          title: 'Main Street Ledger',
          text: 'Walk the brick line where shops keep old ledger books. Count the windows between the bakery and the bookstore — that number is your key.',
          latitude: 37.3405,
          longitude: -95.263,
          radiusMeters: 500,
        },
        {
          id: 'clue-3',
          title: 'River Bridge Signal',
          text: 'Cross the bridge where the Neosho runs slow. Look for the rusted signal post pointing east — the medallion waits beyond the last rivet.',
          latitude: 37.3348,
          longitude: -95.2545,
          radiusMeters: 500,
        },
      ],
      bonusFinds: [
        {
          id: 'bonus-1',
          afterStep: 0,
          title: "Conductor's Token",
          desc: 'A brass platform token hidden near the old depot bench.',
          icon: '🎫',
          coins: 10,
          type: 'bonus',
        },
        {
          id: 'bonus-2',
          afterStep: 1,
          title: 'Main Street Perk',
          desc: '20% off at Parsons Diner — reward for sharp eyes.',
          icon: '🍔',
          type: 'coupon',
          couponCode: 'PARSONS20',
        },
      ],
      finalRewards: [
        {
          type: 'medallion',
          icon: '🥇',
          title: 'Parsons Conductor Medallion #128',
          desc: 'Verified virtual medallion from The Parsons Gold Rush',
          valueLabel: 'Legendary Collectible',
          redemptionInstructions:
            'Your medallion is saved in your Questory Vault. Share your proof card to show you completed the trail.',
          expirationDays: 0,
        },
        {
          type: 'coupon',
          icon: '☕',
          title: 'Heritage Coffee Coupon',
          desc: 'Redeem a free drink at Main Street Roasters',
          valueLabel: 'Free drink',
          redemptionInstructions:
            'Visit Main Street Roasters in downtown Parsons. Show this coupon in your Vault before ordering.',
          expirationDays: 7,
          terms: 'One free drink per Questory completion. Cannot combine with other offers.',
          redeemLocation: 'Main Street Roasters, Parsons KS',
        },
        {
          type: 'physical',
          icon: '📦',
          title: 'Legendary Drop Entry',
          desc: 'Eligible for the physical Parsons medallion draw',
          valueLabel: 'Limited drop entry',
          redemptionInstructions:
            'Winners are contacted by Parsons Heritage Trail. Keep notifications on in Questory.',
          expirationDays: 90,
        },
      ],
    },
    {
      id: 'iron-horse',
      title: 'The Iron Horse',
      location: 'Parsons, Kansas',
      city: 'Parsons',
      state: 'Kansas',
      region: 'Kansas',
      collectionId: 'parsons-legends',
      collectionName: 'Parsons Legends',
      collectionBadge: 'Keeper of Parsons Badge',
      collectionRewardCoins: 500,
      collectionRewardMedallion: 'Parsons Legends Exclusive Medallion',
      estimatedMinutes: 20,
      milesEstimate: 0.6,
      playersCompleted: 24,
      firstFinderName: 'Marcus T.',
      finderMode: 'finder',
      isSponsoredDrop: true,
      sponsoredDropId: 'dq-blizzard-rush',
      sponsor: 'Parsons Heritage Trail',
      sponsorInfo: { name: 'Parsons Heritage Trail', logoUrl: '', website: 'https://www.parsonsks.com' },
      distance: '0.6 mi',
      prize: 'Iron Horse Medallion',
      status: 'published',
      difficulty: 2,
      claimCode: 'IRONHORSE',
      claimMethod: 'tap_medallion',
      qrClaimValue: 'IRONHORSE',
      finderSearchRadiusM: 200,
      finderCaptureBaseM: 25,
      adventureScale: 'city',
      adventureTemplate: 'family_fun',
      experienceSettings: {
        toolkit: 'family',
        atmosphere: 'mild',
        clueOrder: 'sequence',
        dynamicHintsEnabled: true,
      },
      rewardCoins: 50,
      potEntries: 3,
      story: 'Follow the iron rails to the old switching yard. A virtual medallion marks where the engine last stopped.',
      clues: [
        {
          id: 'ih-1',
          title: 'Switchyard Gate',
          text: 'Stand where the freight cars once lined up beside the water tower.',
          latitude: 37.338,
          longitude: -95.258,
          radiusMeters: 500,
        },
        {
          id: 'ih-2',
          title: 'Engine Marker',
          text: 'Find the plaque honoring Engine 47 — the number is your guide.',
          latitude: 37.3372,
          longitude: -95.2565,
          radiusMeters: 500,
        },
      ],
      bonusFinds: [],
      finalRewards: [
        {
          id: 'iron-horse-reward-0',
          type: 'medallion',
          icon: '🚂',
          title: 'Iron Horse Medallion',
          desc: 'Virtual medallion from The Iron Horse trail',
          valueLabel: 'Collection Piece',
          redemptionInstructions: 'Saved in your Questory Passport.',
          expirationDays: 0,
        },
        {
          id: 'iron-horse-reward-1',
          type: 'coupon',
          icon: '🎟',
          title: 'Heritage Coffee Coupon',
          desc: 'First 2 finishers get a free drink — then badge + coins',
          valueLabel: 'Free drink',
          redemptionInstructions: 'Show in Vault at Main Street Roasters.',
          expirationDays: 7,
          quantityLimit: 2,
          claimedCount: 0,
          rewardPolicy: REWARD_POLICIES.REPLACE_WITH_BACKUP,
          backupReward: {
            title: 'Completion Badge',
            desc: '25 coins + badge after rewards ran out.',
            coins: 25,
            badgeLabel: 'Trail Finisher',
          },
        },
      ],
    },
    {
      id: 'river-sentinel',
      title: 'River Sentinel',
      location: 'Parsons, Kansas',
      city: 'Parsons',
      state: 'Kansas',
      region: 'Kansas',
      collectionId: 'parsons-legends',
      collectionName: 'Parsons Legends',
      collectionBadge: 'Keeper of Parsons Badge',
      collectionRewardCoins: 500,
      collectionRewardMedallion: 'Parsons Legends Exclusive Medallion',
      estimatedMinutes: 30,
      milesEstimate: 1.1,
      playersCompleted: 19,
      firstFinderName: 'Elena R.',
      finderMode: 'finder',
      isSponsoredDrop: true,
      sponsoredDropId: 'pepsi-summer-refresh',
      sponsor: 'Neosho River Council',
      sponsorInfo: { name: 'Neosho River Council', logoUrl: '', website: '' },
      distance: '1.1 mi',
      prize: 'River Sentinel Medallion',
      status: 'published',
      difficulty: 3,
      claimCode: 'SENTINEL',
      claimMethod: 'hybrid',
      qrClaimValue: 'SENTINEL',
      finderSearchRadiusM: 200,
      finderCaptureBaseM: 25,
      rewardCoins: 50,
      potEntries: 4,
      story: 'A stone sentinel once guarded the Neosho crossing. Track the signal and unlock the final claim code.',
      clues: [
        {
          id: 'rs-1',
          title: 'River Bend',
          text: 'Where the Neosho bends east, count the limestone steps to the overlook.',
          latitude: 37.334,
          longitude: -95.252,
          radiusMeters: 500,
        },
        {
          id: 'rs-2',
          title: 'Sentinel Post',
          text: 'The rusted post still points toward the old ferry landing.',
          latitude: 37.3335,
          longitude: -95.251,
          radiusMeters: 500,
        },
        {
          id: 'rs-3',
          title: 'Stone Watch',
          text: 'The sentinel stone bears a weathered star — stand within its shadow.',
          latitude: 37.3328,
          longitude: -95.2495,
          radiusMeters: 500,
        },
      ],
      bonusFinds: [],
      finalRewards: [
        {
          type: 'medallion',
          icon: '🌊',
          title: 'River Sentinel Medallion',
          desc: 'Virtual medallion from River Sentinel',
          valueLabel: 'Collection Piece',
          redemptionInstructions: 'Saved in your Questory Passport.',
          expirationDays: 0,
        },
      ],
    },
    {
      id: 'union-depot-ghost',
      title: 'Union Depot Ghost',
      location: 'Parsons, Kansas',
      city: 'Parsons',
      state: 'Kansas',
      region: 'Kansas',
      collectionId: 'parsons-legends',
      collectionName: 'Parsons Legends',
      collectionBadge: 'Keeper of Parsons Badge',
      collectionRewardCoins: 500,
      collectionRewardMedallion: 'Parsons Legends Exclusive Medallion',
      estimatedMinutes: 22,
      milesEstimate: 0.7,
      playersCompleted: 31,
      firstFinderName: 'Jake M.',
      finderMode: 'ar_enhanced',
      arAssetType: 'ghost_lantern',
      isLegendaryHunt: true,
      legendaryType: 'midnight_train',
      isSponsoredDrop: true,
      sponsoredDropId: 'mcdonalds-golden-fry',
      adventureScale: 'backyard',
      adventureTemplate: 'horror',
      finderSearchRadiusM: 5,
      finderCaptureBaseM: 2,
      experienceSettings: {
        toolkit: 'horror',
        atmosphere: 'creepy',
        clueOrder: 'sequence',
        soundEffects: ['footsteps', 'static', 'whispers'],
        dynamicHintsEnabled: true,
        backyardPrecision: true,
        arHorror: true,
      },
      worldConfig: {
        branchingEnabled: true,
        worldEventTags: ['ghost-walk'],
        hiddenDiscoveryIds: ['depot-lantern'],
        alternateEndings: [
          {
            id: 'ghost',
            pathId: 'ghost',
            title: 'Ghost Ledger Ending',
            description: 'You followed the conductor into the shadows.',
            medallionTitle: 'Depot Ghost Medallion',
          },
          {
            id: 'historian',
            pathId: 'historian',
            title: 'Historian Ending',
            description: 'The archives reveal what the platform hides.',
            medallionTitle: 'Archivist Crest',
          },
        ],
        npcs: [
          {
            id: 'conductor-ghost',
            name: 'The Conductor',
            role: 'Story Guide',
            avatar: '🎩',
            dialogues: [
              { id: 'intro', text: 'The rails remember every soul who passed through.', mood: 'mysterious' },
              { id: 'branch', text: 'Brave the platform shadows, or search the archives.', mood: 'warning' },
            ],
          },
        ],
      },
      sponsor: 'Parsons Heritage Trail',
      sponsorInfo: { name: 'Parsons Heritage Trail', logoUrl: '', website: 'https://www.parsonsks.com' },
      distance: '0.7 mi',
      prize: 'Depot Ghost Medallion',
      status: 'published',
      difficulty: 3,
      claimCode: 'DEPOTGHOST',
      claimMethod: 'secret_code',
      qrClaimValue: 'DEPOTGHOST',
      rewardCoins: 50,
      potEntries: 3,
      story: 'Whispers say a conductor still walks the depot platform at dusk. Solve the clues and claim the ghost ledger.',
      clues: [
        {
          id: 'ud-1',
          title: 'Platform Echo',
          text: 'Count the benches on the north platform — that number opens the next clue.',
          clueType: 'audio',
          audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          branchOptions: [
            { id: 'platform', label: 'Brave the platform shadows', pathId: 'ghost' },
            { id: 'archives', label: 'Search the archive room', pathId: 'historian' },
          ],
          latitude: 37.3395,
          longitude: -95.2605,
          radiusMeters: 4,
        },
        {
          id: 'ud-2',
          title: 'Clock Tower',
          text: 'Beneath the clock face, find the year the depot was restored.',
          clueType: 'text_riddle',
          latitude: 37.3398,
          longitude: -95.2612,
          radiusMeters: 4,
        },
      ],
      bonusFinds: [],
      finalRewards: [
        {
          type: 'medallion',
          icon: '👻',
          title: 'Depot Ghost Medallion',
          desc: 'Virtual medallion from Union Depot Ghost',
          valueLabel: 'Collection Piece',
          redemptionInstructions: 'Saved in your Questory Passport.',
          expirationDays: 0,
        },
      ],
    },
    {
      id: 'founders-parsons-lost',
      title: "Founder's Hunt: What Was Lost",
      location: 'Parsons, Kansas',
      city: 'Parsons',
      state: 'Kansas',
      region: 'Kansas',
      isFounderHunt: true,
      tier: 'premium',
      premiumCoinCost: 250,
      creatorProfileId: 'questory-founders',
      finderMode: 'finder',
      arAssetType: 'founder_relic',
      isLegendaryHunt: true,
      legendaryType: 'founder_relic',
      cashPrizePool: 250,
      cashPayouts: { first: 0.6, second: 0.3, random: 0.1 },
      estimatedMinutes: 45,
      milesEstimate: 1.4,
      playersCompleted: 3,
      firstFinderName: 'Sarah J.',
      sponsor: 'QUESTORY Founders',
      sponsorInfo: { name: 'QUESTORY Founders', logoUrl: '', website: 'https://questory.app' },
      distance: '1.4 mi',
      prize: '10,000 Coins + Lifetime Premium',
      status: 'published',
      difficulty: 5,
      claimCode: 'FOUNDLOST',
      claimMethod: 'tap_medallion',
      qrClaimValue: 'FOUNDLOST',
      finderSearchRadiusM: 200,
      finderCaptureBaseM: 25,
      rewardCoins: 10000,
      potEntries: 10,
      story: 'The original Questory founder hid a legendary medallion before the trail went cold. Only the worthy will find what was lost.',
      clues: [
        {
          id: 'fh-1',
          title: 'Founder Stone',
          text: 'Where the founder first stood to read the town map — the carving still remains.',
          latitude: 37.341,
          longitude: -95.262,
          radiusMeters: 500,
        },
        {
          id: 'fh-2',
          title: 'Lost Ledger',
          text: 'A brass plate marks the spot where the ledger was buried.',
          latitude: 37.3402,
          longitude: -95.259,
          radiusMeters: 500,
        },
      ],
      bonusFinds: [],
      finalRewards: [
        {
          type: 'medallion',
          icon: '👑',
          title: 'Found What Was Lost',
          desc: "Founder's Hunt legendary medallion — never expires",
          valueLabel: 'Lifetime Premium',
          redemptionInstructions: 'Your premium status is recorded in your Passport forever.',
          expirationDays: 0,
        },
      ],
    },
    {
      id: 'neosho-legend',
      title: 'The Black Lantern',
      location: 'Roaming · Next city unknown',
      city: 'Unknown',
      state: 'Kansas',
      region: 'Kansas',
      finderMode: 'finder',
      isLegendaryHunt: true,
      legendaryType: 'black_lantern',
      sponsor: 'QUESTORY Legendary Drop',
      sponsorInfo: {
        name: 'QUESTORY Legendary Drop',
        logoUrl: '',
        website: 'https://questory.app',
      },
      distance: 'Hidden',
      prize: 'Physical legendary medallion',
      status: 'published',
      difficulty: 5,
      claimCode: 'NEOSHO',
      worldConfig: {
        unlockRequirement: { type: 'discovery', discoveryId: 'black-lantern-whisper' },
        worldEventTags: ['legendary-roaming'],
      },
      story: 'A second trail along the Neosho River — unlock via a hidden discovery in the World tab.',
      clues: [
        {
          id: 'nl-1',
          title: 'Lantern Signal',
          text: 'Where the river bends, the black lantern flickers once at midnight.',
          latitude: 37.3385,
          longitude: -95.257,
          radiusMeters: 500,
        },
      ],
      bonusFinds: [],
      finalRewards: [
        {
          type: 'medallion',
          icon: '🏮',
          title: 'Black Lantern Medallion',
          desc: 'Ultra-rare roaming legendary',
          valueLabel: 'Legendary',
          redemptionInstructions: 'Saved in your Questory Passport.',
          expirationDays: 0,
        },
      ],
    },
  ]),
};

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const rewards = (saved.rewards || []).map(normalizeReward);
    const screen = saved.screen === 'victory' ? 'home' : saved.screen;
    return {
      ...defaultState,
      ...saved,
      screen: screen || defaultState.screen,
      adventures: mergeAdventures(saved.adventures),
      rewards,
      victoryCertificate: null,
      victoryEngagement: null,
      pendingRating: null,
      pendingPhotoMemory: null,
      claimMessage: null,
      adminPreview: false,
      engagement: normalizeEngagement(saved.engagement),
      economy: normalizeEconomy(saved.economy),
      social: normalizeSocial(saved.social),
      expansion: normalizeExpansion(saved.expansion),
      rewardClaims: saved.rewardClaims || {},
      experience: normalizeExperience(saved.experience),
      world: normalizeWorld(saved.world),
      onboarding: normalizeOnboarding(saved.onboarding),
      accessibility: normalizeAccessibility(saved.accessibility),
      firstTimeMetrics: normalizeFirstTimeMetrics(saved.firstTimeMetrics),
      pendingInviteAdventureId: saved.pendingInviteAdventureId || null,
      claimHistory: buildClaimHistory(rewards, saved.claimHistory),
    };
  } catch {
    return { ...defaultState };
  }
}

export function createVaultReward({
  id,
  type,
  icon,
  title,
  desc,
  valueLabel,
  redemptionInstructions,
  expirationDays,
  adventureId,
  adventureTitle,
  sponsorName,
  sponsorLogoUrl,
  sponsorWebsite,
  claimedAt,
}) {
  const now = claimedAt || new Date().toISOString();
  const reward = {
    id,
    type,
    icon,
    title,
    desc,
    valueLabel: valueLabel || '',
    redemptionInstructions: redemptionInstructions || '',
    adventureId,
    adventureTitle,
    sponsorName: sponsorName || '',
    sponsorLogoUrl: sponsorLogoUrl || '',
    sponsorWebsite: sponsorWebsite || '',
    status: REWARD_STATUS.ACTIVE,
    claimedAt: now,
    redeemedAt: null,
  };
  const days = Number(expirationDays);
  if (days > 0) {
    const expires = new Date(now);
    expires.setDate(expires.getDate() + days);
    reward.expiresAt = expires.toISOString();
  } else if (type === 'coupon' || type === 'bonus') {
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 30);
    reward.expiresAt = expires.toISOString();
  }
  return reward;
}

export function normalizeReward(reward) {
  const base = {
    status: REWARD_STATUS.ACTIVE,
    claimedAt: reward.claimedAt || null,
    redeemedAt: reward.redeemedAt || null,
    adventureId: reward.adventureId || null,
    ...reward,
  };
  if (
    base.status === REWARD_STATUS.ACTIVE &&
    base.expiresAt &&
    new Date(base.expiresAt) < new Date()
  ) {
    base.status = REWARD_STATUS.EXPIRED;
  }
  return base;
}

export function buildClaimHistory(rewards, existing = []) {
  const certificates = (existing || []).filter((e) => e.kind === 'certificate');
  const fromRewards = rewards
    .filter((r) => r.claimedAt)
    .map((r) => ({
      id: r.id,
      kind: 'reward',
      adventureName: r.adventureTitle || 'Unknown Adventure',
      rewardName: r.title,
      type: r.type,
      claimedAt: r.claimedAt,
      redeemedAt: r.redeemedAt || null,
      status: r.status,
      sponsorName: r.sponsorName || '',
      sponsorLogoUrl: r.sponsorLogoUrl || '',
      sponsorWebsite: r.sponsorWebsite || '',
    }));
  const ids = new Set(fromRewards.map((e) => e.id));
  const legacy = (existing || []).filter(
    (e) => e.kind !== 'certificate' && !ids.has(e.id)
  );
  return [...certificates, ...fromRewards, ...legacy].sort(
    (a, b) => new Date(b.claimedAt) - new Date(a.claimedAt)
  );
}

export function upsertCertificate(history, certificate) {
  const without = (history || []).filter(
    (e) => !(e.kind === 'certificate' && e.adventureId === certificate.adventureId)
  );
  return [...without, certificate].sort(
    (a, b) => new Date(b.claimedAt) - new Date(a.claimedAt)
  );
}

export function isRedeemable(reward) {
  return (
    reward.status === REWARD_STATUS.ACTIVE &&
    (reward.type === 'medallion' || reward.type === 'coupon' || reward.type === 'bonus')
  );
}

export function syncClaimHistory(rewards) {
  return buildClaimHistory(rewards);
}

function mergeAdventures(saved) {
  if (!saved?.length) return ensureDemoAdventure(defaultState.adventures);
  const seedIds = new Set(defaultState.adventures.map((a) => a.id));
  const custom = saved.filter((a) => !seedIds.has(a.id)).map(normalizeAdventure);
  const merged = defaultState.adventures.map((seed) => {
    const override = saved.find((a) => a.id === seed.id);
    if (!override) return seed;
    return normalizeAdventure({
      ...seed,
      ...override,
      clues: seed.clues.length ? seed.clues : override.clues,
      sponsorInfo: seed.sponsorInfo || override.sponsorInfo,
      finalRewards: seed.finalRewards.length ? seed.finalRewards : override.finalRewards,
    });
  }).concat(custom);
  return ensureDemoAdventure(merged);
}

export function migrateAdventureStatus(status) {
  if (status === 'live') return ADVENTURE_STATUS.PUBLISHED;
  if (status === 'locked') return ADVENTURE_STATUS.ARCHIVED;
  if (Object.values(ADVENTURE_STATUS).includes(status)) return status;
  return ADVENTURE_STATUS.DRAFT;
}

export function adventureStatusLabel(status) {
  if (status === ADVENTURE_STATUS.PUBLISHED) return 'Published';
  if (status === ADVENTURE_STATUS.ARCHIVED) return 'Archived';
  return 'Draft';
}

export function getPublishedAdventures(adventures) {
  return adventures.filter((a) => a.status === ADVENTURE_STATUS.PUBLISHED);
}

export function isAdventurePlayable(adventure, adminPreview = false) {
  return adventure.status === ADVENTURE_STATUS.PUBLISHED || adminPreview;
}

export function normalizeAdventure(adventure) {
  const sponsorInfo = adventure.sponsorInfo || {
    name: adventure.sponsor || 'Questory Partner',
    logoUrl: '',
    website: '',
  };
  const normalized = {
    ...adventure,
    sponsor: sponsorInfo.name,
    sponsorInfo,
    status: migrateAdventureStatus(adventure.status),
    claimMethod: normalizeClaimMethod(adventure.claimMethod),
    qrClaimValue: adventure.qrClaimValue || '',
    physicalMedallionCode: adventure.physicalMedallionCode || '',
    hintAfterTap: adventure.hintAfterTap || '',
    finderSearchRadiusM: adventure.finderSearchRadiusM ?? 200,
    finderCaptureBaseM: adventure.finderCaptureBaseM ?? 25,
    collectionId: adventure.collectionId || null,
    collectionName: adventure.collectionName || '',
    collectionBadge: adventure.collectionBadge || '',
    collectionRewardCoins: adventure.collectionRewardCoins ?? 0,
    collectionRewardMedallion: adventure.collectionRewardMedallion || '',
    collectionIds: adventure.collectionIds || [],
    isFounderHunt: Boolean(adventure.isFounderHunt),
    city: adventure.city || '',
    state: adventure.state || '',
    region: adventure.region || 'Kansas',
    estimatedMinutes: adventure.estimatedMinutes ?? 25,
    milesEstimate: adventure.milesEstimate ?? null,
    playersCompleted: adventure.playersCompleted ?? 0,
    firstFinderName: adventure.firstFinderName || '',
    tier: adventure.tier || 'standard',
    premiumCoinCost: adventure.premiumCoinCost ?? 250,
    creatorProfileId: adventure.creatorProfileId || null,
    sponsorVerified: Boolean(adventure.sponsorVerified || adventure.sponsorInfo?.verified),
    avgRating: adventure.avgRating ?? 4.8,
    reviewCount: adventure.reviewCount ?? 0,
    couponQuantity: adventure.couponQuantity ?? null,
    couponTerms: adventure.couponTerms || '',
    couponExpirationDays: adventure.couponExpirationDays ?? 7,
    campaignPaused: Boolean(adventure.campaignPaused),
    playMode: adventure.playMode || 'both',
    heatCategory: adventure.heatCategory || 'trending',
    finderMode: adventure.finderMode || 'finder',
    arAssetType: adventure.arAssetType || 'ghost_lantern',
    isLegendaryHunt: Boolean(adventure.isLegendaryHunt),
    legendaryType: adventure.legendaryType || null,
    cashPrizePool: adventure.cashPrizePool ?? 0,
    cashPayouts: adventure.cashPayouts || { first: 0.6, second: 0.3, random: 0.1 },
    isSponsoredDrop: Boolean(adventure.isSponsoredDrop),
    sponsoredDropId: adventure.sponsoredDropId || null,
    storefrontPrice: adventure.storefrontPrice ?? null,
  };
  return mergeAdventureWorld(mergeAdventureExperience(mergeAdventureInventory(normalized)));
}

export function getSponsorInfo(adventure) {
  if (!adventure) {
    return { name: 'Questory Partner', logoUrl: '', website: '' };
  }
  return adventure.sponsorInfo || {
    name: adventure.sponsor || 'Questory Partner',
    logoUrl: '',
    website: '',
  };
}

export const REWARD_TYPE_OPTIONS = [
  { type: 'medallion', label: 'Virtual Medallion', icon: '🏅' },
  { type: 'coupon', label: 'Sponsor Coupon', icon: '🎟' },
  { type: 'physical', label: 'Physical Legendary Drop', icon: '📦' },
];

export function getAdventureProgress(state, adventureId) {
  return (
    state.progress[adventureId] || {
      step: 0,
      claimed: false,
      bonuses: [],
      medallionTapped: false,
      finderUnlocked: false,
    }
  );
}

export function rewardTypeLabel(type) {
  if (type === 'medallion') return 'Virtual Medallion';
  if (type === 'coupon') return 'Sponsor Coupon';
  if (type === 'physical') return 'Legendary Drop';
  return 'Bonus Find';
}

export function rewardStatusLabel(status) {
  if (status === REWARD_STATUS.REDEEMED) return 'Redeemed';
  if (status === REWARD_STATUS.EXPIRED) return 'Expired';
  return 'Active';
}

export function formatTimestamp(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
