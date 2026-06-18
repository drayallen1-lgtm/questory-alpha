export const ADVENTURE_SCALES = {
  BACKYARD: 'backyard',
  NEIGHBORHOOD: 'neighborhood',
  CITY: 'city',
  REGIONAL: 'regional',
  CUSTOM: 'custom',
};

export const SCALE_PRESETS = {
  backyard: {
    id: 'backyard',
    label: 'Backyard',
    desc: 'Birthdays, family nights, sleepovers, horror in the yard.',
    searchRadiusM: 5,
    captureRadiusM: 2,
    finderSearchRadiusM: 5,
    finderCaptureBaseM: 2,
    estimatedMinutes: 15,
    clueCount: 3,
    clueRadiusM: 4,
    backyardPrecision: true,
    unit: 'ft',
  },
  neighborhood: {
    id: 'neighborhood',
    label: 'Neighborhood',
    desc: 'Block parties, local trails, community hunts.',
    searchRadiusM: 60,
    captureRadiusM: 18,
    finderSearchRadiusM: 60,
    finderCaptureBaseM: 18,
    estimatedMinutes: 35,
    clueCount: 5,
    clueRadiusM: 50,
    backyardPrecision: false,
    unit: 'm',
  },
  city: {
    id: 'city',
    label: 'City',
    desc: 'Downtown, parks, tourism boards, sponsor campaigns.',
    searchRadiusM: 250,
    captureRadiusM: 35,
    finderSearchRadiusM: 250,
    finderCaptureBaseM: 35,
    estimatedMinutes: 60,
    clueCount: 6,
    clueRadiusM: 200,
    backyardPrecision: false,
    unit: 'm',
  },
  regional: {
    id: 'regional',
    label: 'Regional',
    desc: 'Road trips, state parks, historic trails.',
    searchRadiusM: 500,
    captureRadiusM: 50,
    finderSearchRadiusM: 500,
    finderCaptureBaseM: 50,
    estimatedMinutes: 120,
    clueCount: 8,
    clueRadiusM: 400,
    backyardPrecision: false,
    unit: 'm',
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    desc: 'Set your own radii and timing.',
    searchRadiusM: 200,
    captureRadiusM: 25,
    finderSearchRadiusM: 200,
    finderCaptureBaseM: 25,
    estimatedMinutes: 45,
    clueCount: 4,
    clueRadiusM: 100,
    backyardPrecision: false,
    unit: 'm',
  },
};

export const ADVENTURE_TEMPLATES = {
  FAMILY_FUN: 'family_fun',
  HORROR: 'horror',
  MYSTERY: 'mystery',
  DATE_NIGHT: 'date_night',
  FITNESS: 'fitness',
  EDUCATIONAL: 'educational',
  SPONSOR: 'sponsor_promotion',
  CHURCH: 'church_faith',
  BIRTHDAY: 'birthday_party',
  SCRATCH: 'from_scratch',
};

export const TEMPLATE_META = {
  family_fun: {
    id: 'family_fun',
    label: 'Family Fun',
    icon: '👨‍👩‍👧',
    desc: 'Grandparent treasure hunts, sticker badges, cartoon medallions.',
    scale: 'backyard',
    toolkit: 'family',
    victoryMessage: "You found Grandpa's treasure!",
    atmosphere: 'mild',
    clueOrder: 'sequence',
  },
  horror: {
    id: 'horror',
    label: 'Horror',
    icon: '👻',
    desc: 'Ghosts, curses, escape experiences, jump moments.',
    scale: 'backyard',
    toolkit: 'horror',
    atmosphere: 'creepy',
    clueOrder: 'sequence',
    soundEffects: ['footsteps', 'static', 'whispers'],
  },
  mystery: {
    id: 'mystery',
    label: 'Mystery',
    icon: '🔍',
    desc: 'Detective cases, murder mysteries, missing artifacts.',
    scale: 'neighborhood',
    toolkit: 'mystery',
    atmosphere: 'mild',
    clueOrder: 'sequence',
  },
  date_night: {
    id: 'date_night',
    label: 'Date Night',
    icon: '💕',
    desc: 'Romantic adventures, memory questions, picnic reveals.',
    scale: 'neighborhood',
    toolkit: 'date_night',
    victoryMessage: 'Another memory made together.',
    clueOrder: 'any_order',
  },
  fitness: {
    id: 'fitness',
    label: 'Fitness',
    icon: '🏃',
    desc: 'Walking challenges, step goals, outdoor movement.',
    scale: 'city',
    toolkit: 'fitness',
    clueOrder: 'sequence',
  },
  educational: {
    id: 'educational',
    label: 'Educational',
    icon: '📚',
    desc: 'Schools, libraries, museums, field trips.',
    scale: 'city',
    toolkit: 'school',
    clueOrder: 'sequence',
  },
  sponsor_promotion: {
    id: 'sponsor_promotion',
    label: 'Sponsor Promotion',
    icon: '🏪',
    desc: 'Coupons, grand openings, traffic campaigns.',
    scale: 'city',
    toolkit: 'sponsor',
    clueOrder: 'sequence',
  },
  church_faith: {
    id: 'church_faith',
    label: 'Church / Faith',
    icon: '⛪',
    desc: 'Bible scavenger hunts, youth events, Easter & Nativity walks.',
    scale: 'neighborhood',
    toolkit: 'church',
    clueOrder: 'sequence',
  },
  birthday_party: {
    id: 'birthday_party',
    label: 'Birthday Party',
    icon: '🎂',
    desc: 'Backyard adventures for celebrations.',
    scale: 'backyard',
    toolkit: 'family',
    victoryMessage: 'Happy Birthday — treasure found!',
    clueOrder: 'sequence',
  },
  from_scratch: {
    id: 'from_scratch',
    label: 'Build From Scratch',
    icon: '🛠',
    desc: 'Advanced mode — full control.',
    scale: 'custom',
    toolkit: null,
    clueOrder: 'sequence',
  },
};

export const CLUE_TYPES = {
  TEXT_RIDDLE: 'text_riddle',
  MULTIPLE_CHOICE: 'multiple_choice',
  IMAGE_PUZZLE: 'image_puzzle',
  AUDIO: 'audio',
  VIDEO: 'video',
  SEQUENCE: 'sequence',
  ANY_ORDER: 'any_order',
};

export const CLUE_TYPE_LABELS = {
  text_riddle: 'Text Riddle',
  multiple_choice: 'Multiple Choice',
  image_puzzle: 'Image Puzzle',
  audio: 'Audio Clue',
  video: 'Video Message',
  sequence: 'Sequence Puzzle',
  any_order: 'Any Order',
};

export const HORROR_ATMOSPHERE = {
  MILD: 'mild',
  CREEPY: 'creepy',
  TERRIFYING: 'terrifying',
};

export const PLAYER_COUNTS = ['1-2', '3-5', '6+'];
export const DURATION_PRESETS = ['5', '15', '30', '60', '120'];
export const ENVIRONMENT_OPTIONS = ['indoor', 'outdoor', 'both'];

export function getScalePreset(scaleId) {
  return SCALE_PRESETS[scaleId] || SCALE_PRESETS.custom;
}

export function getTemplateMeta(templateId) {
  return TEMPLATE_META[templateId] || TEMPLATE_META.from_scratch;
}

export function applySmartBuilderConfig({ templateId, scaleId, players, durationMin, environment }) {
  const template = getTemplateMeta(templateId);
  const scale = getScalePreset(scaleId || template.scale);
  const minutes = parseInt(durationMin, 10) || scale.estimatedMinutes;

  let clueCount = scale.clueCount;
  if (minutes <= 10) clueCount = Math.max(2, scale.clueCount - 2);
  else if (minutes <= 20) clueCount = Math.max(3, scale.clueCount - 1);
  else if (minutes >= 90) clueCount = scale.clueCount + 2;
  if (players === '6+') clueCount = Math.min(clueCount + 1, 10);

  let searchRadius = scale.finderSearchRadiusM;
  let captureRadius = scale.finderCaptureBaseM;
  if (environment === 'indoor' && scale.id === 'backyard') {
    searchRadius = 4;
    captureRadius = 2;
  }

  return {
    adventureScale: scale.id,
    adventureTemplate: template.id,
    estimatedMinutes: minutes,
    finderSearchRadiusM: searchRadius,
    finderCaptureBaseM: captureRadius,
    clueCount,
    clueRadiusM: scale.clueRadiusM,
    backyardPrecision: scale.backyardPrecision,
    experienceSettings: {
      players,
      environment,
      toolkit: template.toolkit,
      atmosphere: template.atmosphere || 'mild',
      clueOrder: template.clueOrder || 'sequence',
      soundEffects: template.soundEffects || [],
      victoryMessage: template.victoryMessage || '',
    },
  };
}

export function buildTemplateClues(templateId, count, baseLat = 37.34, baseLng = -95.26) {
  const template = getTemplateMeta(templateId);
  const clues = [];
  const offsets = [
    [0, 0],
    [0.0003, 0.0002],
    [-0.0002, 0.0003],
    [0.0004, -0.0002],
    [-0.0003, -0.0002],
    [0.0002, 0.0004],
    [-0.0004, 0.0001],
    [0.0001, -0.0004],
  ];

  const content = getTemplateClueContent(templateId);

  for (let i = 0; i < count; i++) {
    const [dLat, dLng] = offsets[i % offsets.length];
    const c = content[i % content.length];
    clues.push({
      id: `tpl-clue-${i + 1}`,
      title: c.title,
      text: c.text,
      clueType: c.clueType || CLUE_TYPES.TEXT_RIDDLE,
      latitude: String(baseLat + dLat * (i + 1)),
      longitude: String(baseLng + dLng * (i + 1)),
      radiusMeters: String(template.scale === 'backyard' ? 4 : 50),
      choices: c.choices || [],
      audioUrl: c.audioUrl || '',
      videoUrl: c.videoUrl || '',
      imageUrl: c.imageUrl || '',
      bonusRewardText: '',
    });
  }
  return clues;
}

function getTemplateClueContent(templateId) {
  const bank = {
    family_fun: [
      { title: 'Swing Set Secret', text: 'Where laughter swings highest, look beneath the seat.', clueType: 'text_riddle' },
      { title: 'Flower Bed Finder', text: 'Petals hide a number — count the red ones.', clueType: 'text_riddle' },
      { title: 'Birdhouse Bonus', text: 'Feathered friends know — check the post with the blue roof.', clueType: 'text_riddle' },
    ],
    horror: [
      { title: 'Porch Whispers', text: "Don't trust the whispers beneath the porch.", clueType: 'audio', audioUrl: '' },
      { title: 'Shadow Figure', text: 'Something moved behind the shed at dusk.', clueType: 'text_riddle' },
      { title: 'Lantern Signal', text: 'The ghost lantern flickers where roots tangle old.', clueType: 'video', videoUrl: '' },
    ],
    church_faith: [
      { title: 'Scripture Unlock', text: 'Psalm 119:105 — where does the lamp guide your feet?', clueType: 'text_riddle' },
      { title: 'Steeple Path', text: 'Follow the path the bell once rang.', clueType: 'text_riddle' },
    ],
    educational: [
      { title: 'History Marker', text: 'What year appears on the bronze plaque?', clueType: 'multiple_choice', choices: ['1876', '1903', '1924'] },
      { title: 'Science Stop', text: 'Name the tree species on the interpretive sign.', clueType: 'text_riddle' },
    ],
    date_night: [
      { title: 'Memory Lane', text: 'Where did we share our first picnic?', clueType: 'text_riddle' },
      { title: 'Hidden Message', text: 'Look under the bench where we carved our initials.', clueType: 'text_riddle' },
    ],
    birthday_party: [
      { title: 'Cake Clue', text: 'Follow the balloons to the tallest tree.', clueType: 'text_riddle' },
      { title: 'Present Hunt', text: 'The gift hides where gifts are opened.', clueType: 'text_riddle' },
    ],
  };
  return bank[templateId] || [
    { title: 'Starting Point', text: 'Begin where the trail marker stands.', clueType: 'text_riddle' },
    { title: 'Next Signal', text: 'Walk until the old oak roots twist east.', clueType: 'text_riddle' },
    { title: 'Final Approach', text: 'The treasure waits where shadows cross at noon.', clueType: 'text_riddle' },
  ];
}

export function buildTemplateRewards(templateId) {
  const rewards = {
    family_fun: [
      { type: 'medallion', icon: '🌟', title: 'Family Explorer Badge', desc: 'Sticker-worthy completion!', valueLabel: 'Family Badge', redemptionInstructions: 'Saved in Passport.', expirationDays: 0 },
    ],
    horror: [
      { type: 'medallion', icon: '👻', title: 'Survivor Medallion', desc: 'You made it out.', valueLabel: 'Horror Crest', redemptionInstructions: 'Display in Vault.', expirationDays: 0 },
    ],
    church_faith: [
      { type: 'medallion', icon: '✝️', title: 'Faith Trail Badge', desc: 'Scripture trail complete.', valueLabel: 'Faith Badge', redemptionInstructions: 'Saved in Passport.', expirationDays: 0 },
    ],
    date_night: [
      { type: 'medallion', icon: '💕', title: 'Couple Certificate', desc: 'Another adventure together.', valueLabel: 'Date Night Badge', redemptionInstructions: 'Share your certificate.', expirationDays: 0 },
    ],
    educational: [
      { type: 'medallion', icon: '📚', title: 'Scholar Badge', desc: 'Learning trail complete.', valueLabel: 'Education Badge', redemptionInstructions: 'Saved in Passport.', expirationDays: 0 },
    ],
    birthday_party: [
      { type: 'medallion', icon: '🎂', title: 'Birthday Treasure', desc: 'Party hunt complete!', valueLabel: 'Birthday Badge', redemptionInstructions: 'Celebrate!', expirationDays: 0 },
    ],
    sponsor_promotion: [
      { type: 'coupon', icon: '🎟', title: 'Sponsor Reward', desc: 'Redeem at participating location.', valueLabel: 'Free item', redemptionInstructions: 'Show in Vault.', expirationDays: 14 },
    ],
  };
  return rewards[templateId] || [
    { type: 'medallion', icon: '🏅', title: 'Quest Complete', desc: 'Trail finished.', valueLabel: 'Medallion', redemptionInstructions: 'Saved in Vault.', expirationDays: 0 },
  ];
}

export function buildTemplateStory(templateId, title) {
  const stories = {
    family_fun: `A treasure waits in the backyard — perfect for ${title || 'your family'}. Follow each clue together.`,
    horror: 'Something stirs after dark. Follow the signals. Do not look back.',
    church_faith: 'Walk the path of scripture. Each clue unlocks a verse and a blessing.',
    educational: 'Explore, learn, and discover — history and science come alive on this trail.',
    date_night: 'A romantic trail of memories awaits. Take your time. Enjoy the moment.',
    birthday_party: 'The birthday treasure is hidden nearby. Can you find it before cake time?',
  };
  return stories[templateId] || 'A new Questory adventure begins. Follow the clues to claim your reward.';
}
