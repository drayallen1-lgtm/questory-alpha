import { generateClaimCode, ADVENTURE_STATUS } from './seed';
import { CLAIM_METHOD } from './claimSystem';
import { FINDER_MODES } from './expansion';
import { END_RULES, REWARD_POLICIES } from './rewardInventory';
import {
  ADVENTURE_TEMPLATES,
  applySmartBuilderConfig,
  buildTemplateClues,
  buildTemplateRewards,
  buildTemplateStory,
  getScalePreset,
} from './templates';

/** Short skippable guide for first-time players (how to play). */
export const PLAYER_GUIDE_SLIDES = [
  {
    id: 'types',
    icon: '🗺',
    title: 'Adventure Types',
    desc: 'Family hunts, horror trails, date nights, and sponsor quests — each follows the same flow: clues, AR scenes, medallion, treasure.',
  },
  {
    id: 'gps',
    icon: '📍',
    title: 'GPS Check-In',
    desc: 'When a clue marks a location, walk there and check in. Your phone confirms you reached the right spot.',
  },
  {
    id: 'ar',
    icon: '📱',
    title: 'AR Scenes',
    desc: 'Tap to play cinematic moments — story beats, ghosts, and clues appear in your camera view.',
  },
  {
    id: 'finder',
    icon: '🧭',
    title: 'Finder Mode',
    desc: 'After the final clue, follow the medallion signal. Get close enough to capture it.',
  },
  {
    id: 'collections',
    icon: '📘',
    title: 'Collections',
    desc: 'Complete related adventures to fill your Passport and earn exclusive medallions.',
  },
  {
    id: 'rewards',
    icon: '🏆',
    title: 'Rewards',
    desc: 'Earn coins, badges, and certificates. Claim treasure with a code, QR scan, or medallion tap.',
  },
];

export const ONBOARDING_SLIDES = [
  { id: 'family', icon: '🏡', title: 'Family Treasure Hunts', desc: 'Birthdays, reunions, and backyard memories.' },
  { id: 'horror', icon: '👻', title: 'Horror Experiences', desc: 'Spooky trails your friends will talk about.' },
  { id: 'date', icon: '💕', title: 'Date Nights', desc: 'Romantic adventures and surprise moments.' },
  { id: 'edu', icon: '📚', title: 'Educational Adventures', desc: 'Field trips, museums, and learning trails.' },
  { id: 'faith', icon: '✝️', title: 'Faith & Community', desc: 'Church events, youth groups, and celebrations.' },
  { id: 'team', icon: '🏆', title: 'Team Challenges', desc: 'Compete, collaborate, and celebrate together.' },
];

export const JOURNEY_CHOICES = [
  { id: 'play', icon: '🎮', label: 'Play an Adventure', desc: 'Try a hunt near you or start the demo.', nav: 'feed' },
  { id: 'create', icon: '✨', label: 'Create an Adventure', desc: 'Build one in about a minute.', nav: 'create' },
  { id: 'join', icon: '👋', label: 'Join Friends', desc: 'Teams, invites, and shared trails.', nav: 'social' },
  { id: 'explore', icon: '🗺', label: 'Explore Nearby', desc: 'See what is live on the map.', nav: 'map' },
  { id: 'sponsor', icon: '🏪', label: 'Sponsor a Campaign', desc: 'Launch a coupon hunt for your business.', nav: 'create', sponsor: true },
];

export const WIZARD_AUDIENCES = [
  { id: 'kids', label: 'Kids', template: ADVENTURE_TEMPLATES.FAMILY_FUN },
  { id: 'family', label: 'Family', template: ADVENTURE_TEMPLATES.FAMILY_FUN },
  { id: 'friends', label: 'Friends', template: ADVENTURE_TEMPLATES.MYSTERY },
  { id: 'couples', label: 'Couples', template: ADVENTURE_TEMPLATES.DATE_NIGHT },
  { id: 'students', label: 'Students', template: ADVENTURE_TEMPLATES.EDUCATIONAL },
  { id: 'church', label: 'Church', template: ADVENTURE_TEMPLATES.CHURCH },
  { id: 'customers', label: 'Customers', template: ADVENTURE_TEMPLATES.SPONSOR },
  { id: 'team', label: 'Team Event', template: ADVENTURE_TEMPLATES.FITNESS },
];

export const WIZARD_TEMPLATES = [
  { id: ADVENTURE_TEMPLATES.FAMILY_FUN, label: 'Family Fun', icon: '👨‍👩‍👧' },
  { id: ADVENTURE_TEMPLATES.HORROR, label: 'Horror', icon: '👻' },
  { id: ADVENTURE_TEMPLATES.MYSTERY, label: 'Mystery', icon: '🔍' },
  { id: ADVENTURE_TEMPLATES.DATE_NIGHT, label: 'Date Night', icon: '💕' },
  { id: ADVENTURE_TEMPLATES.EDUCATIONAL, label: 'Educational', icon: '📚' },
  { id: ADVENTURE_TEMPLATES.FITNESS, label: 'Fitness', icon: '🏃' },
  { id: ADVENTURE_TEMPLATES.CHURCH, label: 'Faith', icon: '⛪' },
  { id: ADVENTURE_TEMPLATES.SPONSOR, label: 'Sponsor', icon: '🏪' },
];

export const WIZARD_LOCATIONS = [
  { id: 'backyard', label: 'Backyard', scale: 'backyard' },
  { id: 'home', label: 'Home', scale: 'backyard' },
  { id: 'neighborhood', label: 'Neighborhood', scale: 'neighborhood' },
  { id: 'park', label: 'Park', scale: 'neighborhood' },
  { id: 'school', label: 'School', scale: 'city' },
  { id: 'city', label: 'City', scale: 'city' },
];

export const WIZARD_CLUE_COUNTS = [3, 5, 7, 10];

export const WIZARD_REWARD_TYPES = [
  { id: 'badge', label: 'Badge', type: 'medallion' },
  { id: 'coins', label: 'Coins', type: 'medallion' },
  { id: 'coupon', label: 'Coupon', type: 'coupon' },
  { id: 'surprise', label: 'Surprise', type: 'physical' },
  { id: 'none', label: 'No reward', type: null },
];

export const KID_TEMPLATES = [
  { id: 'pirate', label: 'Pirate Hunt', icon: '🏴‍☠️', title: 'Pirate Treasure Hunt', story: 'Ahoy! Captain left clues to the buried treasure in the yard.' },
  { id: 'dinosaur', label: 'Dinosaur Hunt', icon: '🦕', title: 'Dinosaur Discovery', story: 'Fossil clues lead to a prehistoric surprise.' },
  { id: 'superhero', label: 'Superhero Hunt', icon: '🦸', title: 'Superhero Mission', story: 'Save the day — follow the hero trail.' },
  { id: 'princess', label: 'Princess Quest', icon: '👸', title: 'Princess Quest', story: 'The crown is hidden — can you find it?' },
  { id: 'space', label: 'Space Mission', icon: '🚀', title: 'Space Mission', story: 'Launch pad clues point to the final star prize.' },
  { id: 'monster', label: 'Monster Mystery', icon: '👾', title: 'Monster Mystery', story: 'Friendly monsters left silly clues everywhere.' },
];

export const EMPTY_STATE_COPY = {
  adventures: { icon: '🗺', title: 'Your city is waiting for its first story.', desc: 'Create a backyard hunt or try the demo.' },
  teams: { icon: '👥', title: 'Start a team and invite your friends.', desc: 'Adventures are better together.' },
  collections: { icon: '📘', title: 'Your passport is blank—for now.', desc: 'Complete hunts to fill your collection.' },
  vault: { icon: '🏆', title: 'No rewards yet.', desc: 'Finish your first hunt to earn badges and coins.' },
  feed: { icon: '🧭', title: 'No live hunts yet.', desc: 'Be the first to publish an adventure.' },
};

export const DEFAULT_ONBOARDING = {
  completed: false,
  skipped: false,
  journeyChosen: false,
  playerGuideCompleted: false,
  playerGuideSkipped: false,
  completedAt: null,
  slideIndex: 0,
};

export const DEFAULT_ACCESSIBILITY = {
  grandmaMode: false,
  kidMode: false,
  largerText: false,
  highContrast: false,
  simplifiedUI: false,
};

export const DEFAULT_FIRST_TIME_METRICS = {
  firstLaunchCompleted: false,
  demoStarted: false,
  demoCompleted: false,
  quickCreateUsed: false,
  adventurePublished: false,
  inviteShared: false,
  returnVisit: false,
  secondAdventureCreated: false,
  firstCompletionCelebrated: false,
  adventuresCreatedCount: 0,
};

export const DEMO_ADVENTURE_ID = 'demo-missing-birthday-gift';

export function normalizeOnboarding(onboarding = {}) {
  return { ...DEFAULT_ONBOARDING, ...onboarding };
}

export function normalizeAccessibility(accessibility = {}) {
  return { ...DEFAULT_ACCESSIBILITY, ...accessibility };
}

export function normalizeFirstTimeMetrics(metrics = {}) {
  return { ...DEFAULT_FIRST_TIME_METRICS, ...metrics };
}

export function shouldShowWelcome(state) {
  const onboarding = normalizeOnboarding(state.onboarding);
  return !onboarding.completed && !onboarding.skipped;
}

export function shouldShowJourney(state) {
  const onboarding = normalizeOnboarding(state.onboarding);
  return onboarding.completed && !onboarding.journeyChosen;
}

export function shouldShowPlayerGuide(state) {
  const onboarding = normalizeOnboarding(state.onboarding);
  return (
    onboarding.completed &&
    onboarding.journeyChosen &&
    !onboarding.playerGuideCompleted &&
    !onboarding.playerGuideSkipped
  );
}

export function completePlayerGuide(state, skipped = false) {
  return {
    ...state,
    onboarding: normalizeOnboarding({
      ...state.onboarding,
      playerGuideCompleted: true,
      playerGuideSkipped: skipped,
    }),
  };
}

export function completeWelcome(state, skipped = false) {
  return {
    ...state,
    onboarding: normalizeOnboarding({
      ...state.onboarding,
      completed: true,
      skipped,
      completedAt: new Date().toISOString(),
    }),
    firstTimeMetrics: trackMetric(state, 'firstLaunchCompleted'),
  };
}

export function completeJourneyChoice(state, choiceId) {
  return {
    ...state,
    onboarding: normalizeOnboarding({
      ...state.onboarding,
      journeyChosen: true,
      lastJourneyChoice: choiceId,
    }),
  };
}

export function trackMetric(state, metricKey, patch = {}) {
  const metrics = normalizeFirstTimeMetrics(state.firstTimeMetrics);
  if (metrics[metricKey] === true && !patch.force) {
    return metrics;
  }
  const next = { ...metrics, [metricKey]: true, ...patch };
  if (metricKey === 'adventurePublished') {
    next.adventuresCreatedCount = (metrics.adventuresCreatedCount || 0) + 1;
    if (next.adventuresCreatedCount >= 2) next.secondAdventureCreated = true;
  }
  return next;
}

export function applyMetrics(state, metrics) {
  return { ...state, firstTimeMetrics: normalizeFirstTimeMetrics(metrics) };
}

export function toggleGrandmaMode(state) {
  const accessibility = normalizeAccessibility(state.accessibility);
  const enabled = !accessibility.grandmaMode;
  return {
    ...state,
    accessibility: normalizeAccessibility({
      ...accessibility,
      grandmaMode: enabled,
      largerText: enabled,
      highContrast: enabled,
      simplifiedUI: enabled,
    }),
  };
}

export function toggleKidMode(state) {
  const accessibility = normalizeAccessibility(state.accessibility);
  return {
    ...state,
    accessibility: normalizeAccessibility({
      ...accessibility,
      kidMode: !accessibility.kidMode,
    }),
  };
}

export function buildBackyardDemoAdventure() {
  const claimCode = 'BDAYGIFT';
  return {
    id: DEMO_ADVENTURE_ID,
    title: 'The Missing Birthday Gift',
    location: 'Your Backyard',
    city: 'Home',
    state: 'Demo',
    region: 'Demo',
    sponsor: 'Questory',
    sponsorInfo: { name: 'Questory', logoUrl: '', website: 'https://questory.app' },
    distance: '3 min',
    prize: 'Birthday Badge',
    status: ADVENTURE_STATUS.PUBLISHED,
    difficulty: 1,
    claimCode,
    claimMethod: CLAIM_METHOD.SECRET_CODE,
    claimHint: 'The birthday gift tag reads BDAYGIFT — that is your claim code.',
    qrClaimValue: claimCode,
    finderSearchRadiusM: 30,
    finderCaptureBaseM: 15,
    rewardCoins: 25,
    potEntries: 1,
    estimatedMinutes: 3,
    isDemoAdventure: true,
    accessType: 'demo',
    adventureScale: 'backyard',
    adventureTemplate: 'family_fun',
    experienceSettings: {
      toolkit: 'family',
      backyardPrecision: true,
      victoryMessage: 'You found the missing birthday gift!',
    },
    story: 'Someone hid the birthday gift! Follow three simple clues around the yard to find it.',
    clues: [
      {
        id: 'demo-1',
        title: 'The Swing Set',
        text: 'Look where you go up and down — check under the swing.',
        latitude: 37.34,
        longitude: -95.26,
        radiusMeters: 100,
        clueType: 'text_riddle',
      },
      {
        id: 'demo-2',
        title: 'The Flower Pot',
        text: 'Petals point the way — find the red flower pot.',
        latitude: 37.3402,
        longitude: -95.2598,
        radiusMeters: 100,
        clueType: 'text_riddle',
      },
      {
        id: 'demo-3',
        title: 'The Back Door',
        text: 'The gift waits where you wipe your shoes before going inside.',
        claimCodeHint: 'The tag on the gift reads BDAYGIFT — use it as your claim code.',
        latitude: 37.3398,
        longitude: -95.2602,
        radiusMeters: 100,
        clueType: 'text_riddle',
      },
    ],
    bonusFinds: [],
    finalRewards: [
      {
        type: 'medallion',
        icon: '🎂',
        title: 'Birthday Badge',
        desc: 'You found the missing birthday gift!',
        valueLabel: 'Birthday Badge',
        redemptionInstructions: 'Saved in your Questory Passport.',
        expirationDays: 0,
      },
    ],
    playersCompleted: 0,
    playMode: 'both',
    finderMode: FINDER_MODES.FINDER,
    heatCategory: 'family',
    tier: 'standard',
    endRule: END_RULES.NO_END_DATE,
  };
}

export function ensureDemoAdventure(adventures) {
  const demo = buildBackyardDemoAdventure();
  if (adventures.some((a) => a.id === DEMO_ADVENTURE_ID)) {
    return adventures.map((a) => (a.id === DEMO_ADVENTURE_ID ? { ...demo, ...a, isDemoAdventure: true } : a));
  }
  return [demo, ...adventures];
}

const AUDIENCE_TITLES = {
  kids: 'Kids Treasure Hunt',
  family: 'Family Adventure',
  friends: 'Friends Mystery Trail',
  couples: 'Date Night Quest',
  students: 'Learning Trail',
  church: 'Faith Scavenger Hunt',
  customers: 'Customer Discovery Hunt',
  team: 'Team Challenge',
};

export function buildQuickCreateAdventure(wizard, options = {}) {
  const audience = WIZARD_AUDIENCES.find((a) => a.id === wizard.audience) || WIZARD_AUDIENCES[1];
  const templateId = wizard.template || audience.template;
  const location = WIZARD_LOCATIONS.find((l) => l.id === wizard.location) || WIZARD_LOCATIONS[0];
  const scale = getScalePreset(location.scale);
  const clueCount = parseInt(wizard.clueCount, 10) || 3;
  const config = applySmartBuilderConfig({
    templateId,
    scaleId: location.scale,
    players: wizard.audience === 'kids' ? '1-2' : '3-5',
    durationMin: clueCount <= 3 ? '5' : clueCount <= 5 ? '15' : '30',
    environment: location.id === 'home' ? 'indoor' : 'outdoor',
  });
  config.clueCount = clueCount;

  const kidTemplate = KID_TEMPLATES.find((k) => k.id === wizard.kidTemplate);
  const title =
    wizard.title ||
    kidTemplate?.title ||
    AUDIENCE_TITLES[wizard.audience] ||
    'My Questory Adventure';
  const story =
    wizard.story ||
    kidTemplate?.story ||
    buildTemplateStory(templateId, title);
  const claimCode = generateClaimCode();
  const clues = buildTemplateClues(templateId, clueCount).map((c) => ({
    ...c,
    radiusMeters: String(scale.clueRadiusM || 50),
  }));

  const rewardType = WIZARD_REWARD_TYPES.find((r) => r.id === wizard.rewardType) || WIZARD_REWARD_TYPES[0];
  let finalRewards = [];
  if (rewardType.type) {
    const templates = buildTemplateRewards(templateId);
    const base = templates[0] || {
      type: rewardType.type,
      icon: '🏅',
      title: 'Quest Complete',
      desc: 'Trail finished.',
      valueLabel: 'Badge',
      redemptionInstructions: 'Saved in Vault.',
      expirationDays: 0,
    };
    if (wizard.rewardType === 'badge') {
      finalRewards = [{ ...base, type: 'medallion', icon: '🎂', title: `${title} Badge` }];
    } else if (wizard.rewardType === 'coins') {
      finalRewards = [{ ...base, type: 'medallion', title: 'Coin Bonus Badge', desc: 'Bonus coins awarded!' }];
    } else if (wizard.rewardType === 'coupon') {
      finalRewards = [{ type: 'coupon', icon: '🎟', title: 'Sponsor Coupon', desc: 'Redeem at participating location.', valueLabel: 'Free item', redemptionInstructions: 'Show in Vault.', expirationDays: 14 }];
    } else if (wizard.rewardType === 'surprise') {
      finalRewards = [{ type: 'physical', icon: '🎁', title: 'Surprise Reward', desc: 'A special surprise awaits!', valueLabel: 'Surprise', redemptionInstructions: 'Contact the hunt creator.', expirationDays: 30 }];
    } else {
      finalRewards = [base];
    }
  }

  return {
    id: `quick-${Date.now()}`,
    title,
    location: wizard.locationLabel || location.label,
    city: wizard.city || location.label,
    state: wizard.stateRegion || '',
    region: wizard.stateRegion || 'Local',
    sponsor: wizard.sponsorName || options.sponsorName || 'Questory Creator',
    sponsorInfo: {
      name: wizard.sponsorName || options.sponsorName || 'Questory Creator',
      logoUrl: '',
      website: '',
    },
    distance: 'New',
    prize: finalRewards[0]?.title || 'Badge',
    status: wizard.publish !== false ? ADVENTURE_STATUS.PUBLISHED : ADVENTURE_STATUS.DRAFT,
    difficulty: Math.min(5, Math.max(1, clueCount)),
    claimCode,
    claimMethod: CLAIM_METHOD.SECRET_CODE,
    qrClaimValue: claimCode,
    finderSearchRadiusM: config.finderSearchRadiusM,
    finderCaptureBaseM: config.finderCaptureBaseM,
    adventureScale: config.adventureScale,
    adventureTemplate: config.adventureTemplate,
    experienceSettings: config.experienceSettings,
    rewardCoins: wizard.rewardType === 'coins' ? 50 : 25,
    potEntries: 3,
    estimatedMinutes: config.estimatedMinutes,
    story,
    clues,
    bonusFinds: [],
    finalRewards,
    playersCompleted: 0,
    playMode: 'both',
    finderMode: FINDER_MODES.FINDER,
    heatCategory: 'family',
    tier: 'standard',
    endRule: END_RULES.NO_END_DATE,
    creatorId: options.userId || null,
  };
}

export function buildSponsorExpressAdventureSync(form, options = {}) {
  const adventure = buildQuickCreateAdventure({
    audience: 'customers',
    template: ADVENTURE_TEMPLATES.SPONSOR,
    location: 'city',
    clueCount: 3,
    rewardType: 'coupon',
    title: `${form.businessName || 'Local Business'} Promotion`,
    story: `Visit our locations and unlock ${form.couponValue || 'a special offer'}!`,
    sponsorName: form.businessName || 'Local Business',
    city: form.city || 'Your City',
    publish: true,
  }, options);
  adventure.couponTerms = form.couponTerms || 'One per customer.';
  adventure.couponExpirationDays = parseInt(form.durationDays, 10) || 14;
  adventure.finalRewards = [
    {
      type: 'coupon',
      icon: '🎟',
      title: `${form.couponValue || 'Special Offer'}`,
      desc: `Promotion from ${form.businessName || 'Local Business'}`,
      valueLabel: form.couponValue || 'Special Offer',
      redemptionInstructions: 'Show this coupon at the business.',
      expirationDays: parseInt(form.durationDays, 10) || 14,
      rewardPolicy: REWARD_POLICIES.CONTINUE_BADGE_COINS_ONLY,
    },
  ];
  adventure.prize = adventure.finalRewards[0].title;
  return adventure;
}

export function publishQuickAdventure(state, adventure, options = {}) {
  const afterQuick = trackMetric(state, 'quickCreateUsed');
  const metrics = trackMetric({ ...state, firstTimeMetrics: afterQuick }, 'adventurePublished');
  return {
    ...state,
    adventures: [adventure, ...state.adventures.filter((a) => a.id !== adventure.id)],
    firstTimeMetrics: metrics,
    pendingInviteAdventureId: adventure.id,
    selectedAdventureId: adventure.id,
    screen: options.goToInvite ? 'invite' : options.screen || 'detail',
    adminPreview: false,
  };
}

export function buildInviteMessage(adventure) {
  const name = adventure?.title || 'a Questory adventure';
  return `You're invited to my Questory adventure: ${name}! Open Questory to play. Code: ${adventure?.claimCode || ''}`;
}

export function buildInviteLink(adventure) {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://questory.app';
  return `${base}?adventure=${adventure?.id || ''}`;
}

export function markInviteShared(state) {
  return {
    ...state,
    firstTimeMetrics: trackMetric(state, 'inviteShared'),
    pendingInviteAdventureId: null,
  };
}

export function shouldShowFirstCompletionCelebration(state) {
  const metrics = normalizeFirstTimeMetrics(state.firstTimeMetrics);
  const completed = state.engagement?.adventuresCompleted || 0;
  return completed >= 1 && !metrics.firstCompletionCelebrated;
}

export function markFirstCompletionCelebrated(state) {
  return {
    ...state,
    firstTimeMetrics: trackMetric(state, 'firstCompletionCelebrated'),
  };
}

export function startDemo(state, nav) {
  return {
    state: applyMetrics(state, trackMetric(state, 'demoStarted')),
    adventureId: DEMO_ADVENTURE_ID,
  };
}

export function completeDemoIfNeeded(state, adventureId) {
  if (adventureId !== DEMO_ADVENTURE_ID) return state;
  return applyMetrics(state, trackMetric(state, 'demoCompleted'));
}

export function getAccessibilityClassName(accessibility) {
  const a = normalizeAccessibility(accessibility);
  const classes = [];
  if (a.grandmaMode) classes.push('grandma-mode');
  if (a.kidMode) classes.push('kid-mode');
  if (a.highContrast) classes.push('high-contrast');
  if (a.largerText) classes.push('larger-text');
  if (a.simplifiedUI) classes.push('simplified-ui');
  return classes.join(' ');
}
