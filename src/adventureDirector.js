/**
 * Sweep 14.1 — AI Adventure Director
 * Generates a full Adventure Blueprint and converts it to Create-form draft data.
 */
import { generateClaimCode } from './seed';
import { generateSceneFromPrompt } from './aiSceneGenerator';
import {
  applyCinematicEntityToScene,
  autoPickEntitiesForPrompt,
  enhanceSceneWithCinematicAssets,
  resolveCinematicToneOptions,
  summarizeClueCinematicEntities,
} from './cinematicAssetEngine';
import { emptyArScene, normalizeArScene } from './arEngine';
import { FINALE_THEMES } from './finaleThemes';
import { CLAIM_METHOD } from './claimSystem';
import { FINDER_MODES } from './expansion';
import {
  ADVENTURE_TEMPLATES,
  applySmartBuilderConfig,
  buildTemplateRewards,
  getScalePreset,
  CLUE_TYPES,
} from './templates';
import { normalizeWorldConfig } from './worldEngine';

export const BLUEPRINT_VERSION = '1.2';

export const DIRECTOR_PRESET_IDS = {
  HORROR_BACKYARD: 'horror_backyard',
  FAMILY_BACKYARD: 'family_backyard',
  CHURCH_TRAIL: 'church_trail',
  EDUCATIONAL_TRAIL: 'educational_trail',
};

const GPS_OFFSETS = [
  [0, 0],
  [0.0003, 0.0002],
  [-0.0002, 0.0003],
  [0.0004, -0.0002],
  [-0.0003, -0.0002],
  [0.0002, 0.0004],
  [-0.0004, 0.0001],
  [0.0001, -0.0004],
];

/** @typedef {Object} AdventureBlueprint */

const HORROR_BACKYARD_BASE = {
  presetId: DIRECTOR_PRESET_IDS.HORROR_BACKYARD,
  meta: {
    tone: 'creepy',
    template: ADVENTURE_TEMPLATES.HORROR,
    scale: 'backyard',
    claimMethod: CLAIM_METHOD.SECRET_CODE,
    finderMode: FINDER_MODES.AR_ENHANCED,
    arAssetType: 'ghost_lantern',
    title: 'Whispers in the Backyard',
    location: 'Your Backyard',
    collectionId: 'lantern-keepers',
    collectionName: 'Lantern Keepers',
    collectionBadge: '🕯',
  },
  storyArc: {
    hook: 'Something moved under the porch after dark.',
    mystery: 'A ghost girl left whispers tied to the old swing and the dead oak.',
    rising: 'Static crackles on the radio. Footsteps follow when you pause.',
    reveals: 'The hooded watcher guards the black lantern — the final signal.',
    finale: 'Face the lantern light, capture the crest, and escape the yard.',
  },
  characters: [
    {
      id: 'ghost-girl',
      name: 'Lily',
      role: 'Spirit Guide',
      avatar: '👧',
      personality: 'whispering, playful, unsettling',
      voice: 'child',
      memoryKeys: ['porch_seen', 'swing_found'],
    },
    {
      id: 'watcher',
      name: 'The Watcher',
      role: 'Guardian',
      avatar: '🖤',
      personality: 'silent, ominous',
      voice: 'whisper',
      memoryKeys: ['lantern_seen'],
    },
  ],
  clueBlueprints: [
    {
      title: 'Porch Whispers',
      text: "Don't trust the whispers beneath the porch. Count the steps — that number opens the next clue.",
      clueType: CLUE_TYPES.AUDIO,
      arPrompt: 'A ghost girl appears beside the swing and whispers, "Don\'t look back."',
      npcLine: 'She left something under the porch. Listen before you look.',
    },
    {
      title: 'Shadow at the Shed',
      text: 'Something moved behind the shed at dusk. Find where shadows cross the path.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      arPrompt: 'A shadow figure stands beneath the dead tree. Branches move above him.',
      isFalseLead: true,
      bonusRewardText: 'False trail — the real signal is east toward the lantern.',
      pathVariants: {
        brave: {
          title: 'Into the Dark',
          text: 'You followed the whispers behind the shed. Count the broken boards on the north wall.',
          arPrompt: 'A shadow figure lunges from the shed darkness. Radio static crackles.',
        },
        cautious: {
          title: 'The Long Way Round',
          text: 'You circled wide around the shed. Find the garden gate — the latch holds a number.',
          arPrompt: 'A ghost girl waits by the flower bed, pointing toward the lantern.',
        },
      },
    },
    {
      title: 'Lantern Signal',
      text: 'The ghost lantern flickers where roots tangle old. Follow the light.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      arPrompt: 'The hooded watcher flickers by the black lantern in the woods.',
      pathVariants: {
        brave: {
          title: 'Lantern in the Woods',
          text: 'The hooded watcher left a mark on the old oak. Stand beneath it at dusk.',
          arPrompt: 'The hooded watcher flickers by the black lantern deep in the woods.',
        },
        cautious: {
          title: 'Porch Lantern',
          text: 'Safer ground — the porch lantern flickers three times. Count the flashes.',
          arPrompt: 'A black lantern floats near the porch steps, flame steady and waiting.',
        },
      },
    },
  ],
  finalePrompt:
    'The hooded watcher appears at the black lantern. Radio static crackles: "You found me." Jump scare finale.',
  finaleThemeId: 'black_lantern',
  twists: [{ afterClue: 1, type: 'false_clue', effect: 'bonus_hint' }],
  audioMood: {
    search: 'wind',
    tension: 'heartbeat',
    reveal: 'strings',
    victory: 'fanfare',
  },
  branching: {
    enabled: true,
    branchOptions: [
      { id: 'brave', label: 'Follow the whispers into the dark', pathId: 'brave' },
      { id: 'cautious', label: 'Circle around the shed', pathId: 'cautious' },
    ],
    alternateEndings: [
      {
        id: 'brave',
        pathId: 'brave',
        title: 'Brave Path',
        description: 'You walked into the shadows and earned the Survivor Crest.',
        medallionTitle: 'Survivor Medallion',
      },
      {
        id: 'cautious',
        pathId: 'cautious',
        title: 'Cautious Path',
        description: 'You outsmarted the watcher and claimed the Lantern Keeper badge.',
        medallionTitle: 'Lantern Keeper Badge',
      },
    ],
  },
  collectionLore: {
    journalPages: [
      'The Lantern Keepers once guided lost souls through the yard after midnight.',
      'Lily was the youngest keeper — she still swings when no one watches.',
    ],
  },
};

const FAMILY_BACKYARD_BASE = {
  presetId: DIRECTOR_PRESET_IDS.FAMILY_BACKYARD,
  meta: {
    tone: 'warm',
    template: ADVENTURE_TEMPLATES.FAMILY_FUN,
    scale: 'backyard',
    claimMethod: CLAIM_METHOD.TAP_MEDALLION,
    finderMode: FINDER_MODES.AR_ENHANCED,
    arAssetType: 'family_treasure',
    title: 'Grandpa\'s Backyard Treasure',
    location: 'Your Backyard',
    collectionId: 'family-heirlooms',
    collectionName: 'Family Heirlooms',
    collectionBadge: '🌟',
  },
  storyArc: {
    hook: 'Grandpa hid a treasure somewhere in the yard before the party.',
    mystery: 'Each clue is a memory from summers past — swing set, flower bed, birdhouse.',
    rising: 'Work together! Younger explorers read clues aloud while scouts search.',
    reveals: 'The final spot is where birthday cakes were always cut.',
    finale: 'Find the golden medallion and celebrate together!',
  },
  characters: [
    {
      id: 'grandpa',
      name: 'Grandpa Joe',
      role: 'Treasure Hider',
      avatar: '👴',
      personality: 'warm, playful, storyteller',
      voice: 'friendly',
      memoryKeys: ['treasure_started'],
    },
    {
      id: 'mascot',
      name: 'Sunny the Squirrel',
      role: 'Hint Helper',
      avatar: '🐿',
      personality: 'cheerful, silly',
      voice: 'cartoon',
      memoryKeys: ['hints_given'],
    },
  ],
  clueBlueprints: [
    {
      title: 'Swing Set Secret',
      text: 'Where laughter swings highest, look beneath the seat. Grandpa carved a number there.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      npcLine: 'Start at the swing — that\'s where the hunt begins!',
      arPrompt: 'A friendly dragon floats beside the swing set, sparks trailing behind its wings.',
    },
    {
      title: 'Flower Bed Finder',
      text: 'Petals hide a number — count the red ones in the flower bed.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      npcLine: 'Sunny says: the flowers know the way!',
      arPrompt: 'A garden fairy drifts above the flower bed with a soft golden glow.',
    },
    {
      title: 'Birdhouse Bonus',
      text: 'Feathered friends know — check the post with the blue roof.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      bonusRewardText: 'Bonus sticker! You found Sunny\'s acorn cache.',
      arPrompt: 'A warm dragon egg pulses with ember light near the birdhouse post.',
    },
    {
      title: 'Cake Table Clue',
      text: 'The treasure waits where birthday cakes are always cut. Look under the picnic table!',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      npcLine: 'You did it! Tap the medallion when Finder Mode finds it.',
      arPrompt: 'A treasure chest glows under the picnic table with sparkles and golden light.',
    },
  ],
  finalePrompt: 'The friendly dragon circles the treasure chest as golden sparks rain down. Celebration finale!',
  finaleThemeId: null,
  twists: [],
  audioMood: {
    search: 'birds',
    tension: 'playful_drums',
    reveal: 'bells',
    victory: 'celebration',
  },
  branching: { enabled: false, branchOptions: [], alternateEndings: [] },
  collectionLore: {
    journalPages: [
      'Grandpa started this hunt tradition in 1987 — every grandkid gets a turn.',
      'The Family Heirloom medallion passes to whoever finds it first (with help!).',
    ],
  },
};

const CHURCH_TRAIL_BASE = {
  presetId: DIRECTOR_PRESET_IDS.CHURCH_TRAIL,
  meta: {
    tone: 'reverent',
    template: ADVENTURE_TEMPLATES.CHURCH,
    scale: 'neighborhood',
    claimMethod: CLAIM_METHOD.SECRET_CODE,
    finderMode: FINDER_MODES.AR_ENHANCED,
    arAssetType: 'faith_trail',
    title: 'Scripture Scavenger Hunt',
    location: 'Your Neighborhood',
    collectionId: 'faith-trail',
    collectionName: 'Faith Trail Collection',
    collectionBadge: '✝️',
  },
  storyArc: {
    hook: 'Your youth group scattered scripture clues across the neighborhood.',
    mystery: 'Each stop unlocks a verse and a blessing for your team.',
    rising: 'Walk together — read aloud, reflect, and search with purpose.',
    reveals: 'The final clue points to where the community gathers on Sundays.',
    finale: 'Enter the claim code and receive your Faith Trail badge.',
  },
  characters: [
    {
      id: 'pastor-grace',
      name: 'Pastor Grace',
      role: 'Trail Guide',
      avatar: '✝️',
      personality: 'warm, encouraging, scripture-focused',
      voice: 'calm',
      memoryKeys: ['trail_started'],
    },
    {
      id: 'youth-leader',
      name: 'Marcus',
      role: 'Youth Leader',
      avatar: '🙌',
      personality: 'energetic, supportive',
      voice: 'friendly',
      memoryKeys: ['hints_given'],
    },
  ],
  clueBlueprints: [
    {
      title: 'Scripture Unlock',
      text: 'Psalm 119:105 — where does the lamp guide your feet? Find the path marker.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      npcLine: 'The lamp guides our feet — start where the sidewalk turns east.',
      arPrompt: 'A wise owl perches on the path marker, glowing with a gentle golden light.',
    },
    {
      title: 'Steeple Path',
      text: 'Follow the path the bell once rang. Count the steps to the garden gate.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      npcLine: 'Listen for the echo — Marcus hid the next clue near the garden.',
      arPrompt: 'A history scroll unfurls in golden light beside the garden gate.',
    },
    {
      title: 'Community Bench',
      text: 'Where neighbors rest and pray together — look under the memorial bench plaque.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      npcLine: 'Faith grows in community. The plaque year is your hint.',
      arPrompt: 'A star compass spins slowly above the memorial bench, pointing east.',
      pathVariants: {
        sanctuary: {
          title: 'Sanctuary Steps',
          text: 'You chose the sanctuary path. Count the front steps — that number opens the next clue.',
          arPrompt: 'A history scroll glows on the sanctuary steps with a verse of scripture.',
        },
        garden: {
          title: 'Garden Walk',
          text: 'You chose the garden path. Find the rose bed with the white cross marker.',
          arPrompt: 'A garden fairy sparkles above the rose bed cross marker.',
        },
      },
    },
    {
      title: 'Blessing Stone',
      text: 'The final marker bears a single word from Pastor Grace. Find the cornerstone.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      npcLine: 'You walked the path of faith — claim your blessing!',
      arPrompt: 'A glowing relic rises from the cornerstone with warm light and sparks.',
    },
  ],
  finalePrompt: 'The wise owl spreads its wings as a history scroll unfurls — faith trail complete.',
  finaleThemeId: null,
  twists: [],
  audioMood: {
    search: 'musicbox',
    tension: 'footsteps',
    reveal: 'musicbox',
    victory: 'musicbox',
  },
  branching: {
    enabled: true,
    branchOptions: [
      { id: 'sanctuary', label: 'Walk toward the sanctuary', pathId: 'sanctuary' },
      { id: 'garden', label: 'Follow the garden path', pathId: 'garden' },
    ],
    alternateEndings: [
      {
        id: 'sanctuary',
        pathId: 'sanctuary',
        title: 'Sanctuary Path',
        description: 'You walked the path of worship and earned the Sanctuary Crest.',
        medallionTitle: 'Sanctuary Crest',
      },
      {
        id: 'garden',
        pathId: 'garden',
        title: 'Garden Path',
        description: 'You found blessings in the garden and earned the Gardener Badge.',
        medallionTitle: 'Gardener Badge',
      },
    ],
  },
  collectionLore: {
    journalPages: [
      'The Faith Trail began as an Easter youth outreach in 2012.',
      'Every completed trail adds a verse to the community blessing book.',
    ],
  },
};

const EDUCATIONAL_TRAIL_BASE = {
  presetId: DIRECTOR_PRESET_IDS.EDUCATIONAL_TRAIL,
  meta: {
    tone: 'curious',
    template: ADVENTURE_TEMPLATES.EDUCATIONAL,
    scale: 'city',
    claimMethod: CLAIM_METHOD.SECRET_CODE,
    finderMode: FINDER_MODES.AR_ENHANCED,
    arAssetType: 'learning_trail',
    title: 'Learning Trail Quest',
    location: 'Downtown',
    collectionId: 'scholar-trail',
    collectionName: 'Scholar Trail',
    collectionBadge: '📚',
  },
  storyArc: {
    hook: 'Professor Ellis turned the city into an outdoor classroom.',
    mystery: 'History markers, science stops, and riddles await curious minds.',
    rising: 'Observe carefully — the answer is often in plain sight.',
    reveals: 'The final exhibit holds the claim code for your Scholar Badge.',
    finale: 'Complete the trail and claim your Scholar medallion!',
  },
  characters: [
    {
      id: 'prof-ellis',
      name: 'Professor Ellis',
      role: 'Trail Author',
      avatar: '📚',
      personality: 'curious, precise, encouraging',
      voice: 'teacher',
      memoryKeys: ['trail_started'],
    },
    {
      id: 'lab-assistant',
      name: 'Sam',
      role: 'Lab Assistant',
      avatar: '🔬',
      personality: 'enthusiastic, helpful',
      voice: 'friendly',
      memoryKeys: ['hints_given'],
    },
  ],
  clueBlueprints: [
    {
      title: 'History Marker',
      text: 'What year appears on the bronze plaque at the town square?',
      clueType: CLUE_TYPES.MULTIPLE_CHOICE,
      choices: ['1876', '1903', '1924'],
      npcLine: 'Start at the square — history is the first lesson.',
      arPrompt: 'A magic book opens in mid-air, pages glowing with discovery clues.',
    },
    {
      title: 'Science Stop',
      text: 'Name the tree species on the interpretive sign near the park entrance.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      npcLine: 'Sam says: botany counts! Read the sign carefully.',
      arPrompt: 'A wise owl perches on the interpretive sign, nodding wisely.',
    },
    {
      title: 'Museum Steps',
      text: 'Count the museum steps — multiply by two for the locker combination hint.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      npcLine: 'The museum holds more than artifacts — look at the architecture.',
      arPrompt: 'A star compass spins above the museum steps, pointing toward the archives.',
      pathVariants: {
        historian: {
          title: 'Archives Wing',
          text: 'You chose the archives. Find the display case labeled "Founding Year."',
          arPrompt: 'A history scroll unfurls beside the archives display case.',
        },
        exhibit: {
          title: 'Main Exhibit',
          text: 'You chose the main hall. Locate the dinosaur footprint cast.',
          arPrompt: 'A phoenix feather floats above the exhibit hall, trailing golden sparks.',
        },
      },
    },
    {
      title: 'Final Exhibit',
      text: 'The scholar medallion code is carved into the bench by the fountain.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      npcLine: 'Excellent work — you earned the Scholar Badge!',
      arPrompt: 'A crystal shard hums with trapped light above the fountain bench.',
    },
  ],
  finalePrompt: 'Professor Ellis appears as a magic book and star compass merge — scholar trail complete!',
  finaleThemeId: null,
  twists: [],
  audioMood: {
    search: 'footsteps',
    tension: 'footsteps',
    reveal: 'musicbox',
    victory: 'musicbox',
  },
  branching: {
    enabled: true,
    branchOptions: [
      { id: 'historian', label: 'Explore the archives', pathId: 'historian' },
      { id: 'exhibit', label: 'Visit the main exhibit', pathId: 'exhibit' },
    ],
    alternateEndings: [
      {
        id: 'historian',
        pathId: 'historian',
        title: 'Historian Path',
        description: 'You mastered the archives and earned the Historian Crest.',
        medallionTitle: 'Historian Crest',
      },
      {
        id: 'exhibit',
        pathId: 'exhibit',
        title: 'Exhibit Path',
        description: 'You explored the main hall and earned the Explorer Badge.',
        medallionTitle: 'Explorer Badge',
      },
    ],
  },
  collectionLore: {
    journalPages: [
      'Professor Ellis designed the Scholar Trail for field-trip groups in 2019.',
      'Completing all city learning trails unlocks the Master Scholar medallion.',
    ],
  },
};

const PRESET_BASES = {
  [DIRECTOR_PRESET_IDS.HORROR_BACKYARD]: HORROR_BACKYARD_BASE,
  [DIRECTOR_PRESET_IDS.FAMILY_BACKYARD]: FAMILY_BACKYARD_BASE,
  [DIRECTOR_PRESET_IDS.CHURCH_TRAIL]: CHURCH_TRAIL_BASE,
  [DIRECTOR_PRESET_IDS.EDUCATIONAL_TRAIL]: EDUCATIONAL_TRAIL_BASE,
};

function getPresetBase(presetId) {
  return cloneBlueprintBase(PRESET_BASES[presetId] || HORROR_BACKYARD_BASE);
}

export const DIRECTOR_PRESETS = {
  [DIRECTOR_PRESET_IDS.HORROR_BACKYARD]: {
    id: DIRECTOR_PRESET_IDS.HORROR_BACKYARD,
    label: 'Horror Backyard',
    icon: '👻',
    desc: 'AR ghost hunt · whispers · lantern finale · branching paths',
    examplePrompt: 'Scary backyard ghost hunt for teens, 3 clues, secret code claim',
  },
  [DIRECTOR_PRESET_IDS.FAMILY_BACKYARD]: {
    id: DIRECTOR_PRESET_IDS.FAMILY_BACKYARD,
    label: 'Family Treasure',
    icon: '👨‍👩‍👧',
    desc: 'Grandpa\'s hunt · kid-friendly · tap medallion claim',
    examplePrompt: 'Family backyard treasure hunt for grandparents visiting, tap medallion',
  },
  [DIRECTOR_PRESET_IDS.CHURCH_TRAIL]: {
    id: DIRECTOR_PRESET_IDS.CHURCH_TRAIL,
    label: 'Church Trail',
    icon: '✝️',
    desc: 'Scripture scavenger · youth group · branching paths',
    examplePrompt: 'Church youth group Easter scavenger hunt, 4 clues, secret code',
  },
  [DIRECTOR_PRESET_IDS.EDUCATIONAL_TRAIL]: {
    id: DIRECTOR_PRESET_IDS.EDUCATIONAL_TRAIL,
    label: 'Learning Trail',
    icon: '📚',
    desc: 'History & science · classroom field trip · city scale',
    examplePrompt: 'Educational history trail for my classroom, 4 clues',
  },
};

function normalizePrompt(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function detectPresetId(text) {
  if (/church|bible|faith|youth group|easter|scripture|pastor/i.test(text)) {
    return DIRECTOR_PRESET_IDS.CHURCH_TRAIL;
  }
  if (/school|teacher|education|museum|history|classroom|science trail/i.test(text)) {
    return DIRECTOR_PRESET_IDS.EDUCATIONAL_TRAIL;
  }
  if (/family|kids|grandpa|grandparent|birthday|treasure hunt for/i.test(text)) {
    return DIRECTOR_PRESET_IDS.FAMILY_BACKYARD;
  }
  if (/scary|horror|ghost|spooky|haunted|lantern|watcher/i.test(text)) {
    return DIRECTOR_PRESET_IDS.HORROR_BACKYARD;
  }
  return null;
}

function parseClueCount(text, defaultCount) {
  const match = text.match(/\b(\d+)\s*clues?\b/i);
  if (match) return Math.min(8, Math.max(2, parseInt(match[1], 10)));
  return defaultCount;
}

function parseClaimMethod(text, fallback) {
  if (/physical medallion|engraved code|hidden medallion/i.test(text)) {
    return CLAIM_METHOD.PHYSICAL_MEDALLION;
  }
  if (/hybrid|tap.*then.*code|code.*after.*tap/i.test(text)) {
    return CLAIM_METHOD.HYBRID;
  }
  if (/qr|scan/i.test(text)) {
    return CLAIM_METHOD.QR_CODE;
  }
  if (/tap medallion|virtual medallion|auto-claim|auto claim/i.test(text)) {
    return CLAIM_METHOD.TAP_MEDALLION;
  }
  if (/secret code|claim code|enter code/i.test(text)) {
    return CLAIM_METHOD.SECRET_CODE;
  }
  return fallback;
}

function parseScale(text, fallback) {
  if (/backyard|yard|porch|sleepover/i.test(text)) return 'backyard';
  if (/neighborhood|block|local trail/i.test(text)) return 'neighborhood';
  if (/city|downtown|urban/i.test(text)) return 'city';
  return fallback;
}

function parseKidFriendly(text) {
  return /\b(kids?|children|8-year|8 year|young|family-friendly|not too scary)\b/i.test(text);
}

function parseDuration(text, fallback) {
  const match = text.match(/\b(\d+)\s*(?:min(?:ute)?s?|m)\b/i);
  if (match) return Math.min(120, Math.max(5, parseInt(match[1], 10)));
  return fallback;
}

function parsePlayers(text, fallback) {
  if (/solo|alone|1 player|one player/i.test(text)) return '1-2';
  if (/large group|6\+|six\+|party of/i.test(text)) return '6+';
  if (/couple|two players|2 players/i.test(text)) return '1-2';
  return fallback;
}

function parseAtmosphere(text, fallback) {
  if (/terrifying|nightmare|extreme|very scary/i.test(text)) return 'terrifying';
  if (/mild|gentle|not too scary|kid-friendly|friendly ghost/i.test(text)) return 'mild';
  if (/creepy|spooky|scary|horror/i.test(text)) return 'creepy';
  return fallback;
}

function parseBranching(text, fallback) {
  if (/no branch|linear|single path|one ending/i.test(text)) return false;
  if (/branch|choose path|multiple ending|split path/i.test(text)) return true;
  return fallback;
}

function buildStoryFromArc(storyArc, title) {
  const parts = [
    storyArc.hook,
    storyArc.mystery,
    storyArc.rising,
    storyArc.reveals,
    storyArc.finale,
  ].filter(Boolean);
  return parts.join(' ') || `A new Questory adventure: ${title}.`;
}

function cloneBlueprintBase(base) {
  return JSON.parse(JSON.stringify(base));
}

function expandClueBlueprints(blueprints, targetCount) {
  if (blueprints.length >= targetCount) return blueprints.slice(0, targetCount);
  const expanded = [...blueprints];
  while (expanded.length < targetCount) {
    const i = expanded.length;
    expanded.push({
      title: `Signal ${i + 1}`,
      text: 'Follow the trail marker to the next hidden spot in the yard.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      arPrompt: expanded[i % blueprints.length]?.arPrompt || null,
    });
  }
  return expanded;
}

/**
 * Generate a complete Adventure Blueprint from a creator prompt.
 * @param {string} prompt
 * @param {object} [options]
 * @returns {{ ok: boolean, blueprint?: AdventureBlueprint, message?: string }}
 */
export function generateAdventureBlueprint(prompt, options = {}) {
  const text = normalizePrompt(prompt);
  if (!text && !options.presetId) {
    return { ok: false, message: 'Describe the adventure you want — or pick a preset.' };
  }

  const presetId = options.presetId || detectPresetId(text) || DIRECTOR_PRESET_IDS.HORROR_BACKYARD;
  const base = getPresetBase(presetId);

  const scale = parseScale(text, base.meta.scale);
  const scalePreset = getScalePreset(scale);
  const clueCount = parseClueCount(text, scalePreset.clueCount);
  const kidFriendly = parseKidFriendly(text);
  const claimMethod = parseClaimMethod(text, base.meta.claimMethod);
  const durationMin = parseDuration(text, scalePreset.estimatedMinutes);
  const players = parsePlayers(text, options.players || '3-5');
  const atmosphere = parseAtmosphere(text, base.meta.tone === 'warm' ? 'mild' : 'creepy');
  const branchingEnabled = parseBranching(text, base.branching?.enabled ?? false);

  if (branchingEnabled && base.branching) {
    base.branching.enabled = true;
  } else if (!branchingEnabled && base.branching) {
    base.branching.enabled = false;
  }

  base.meta.tone = atmosphere === 'terrifying' ? 'creepy' : atmosphere === 'mild' ? 'mild' : base.meta.tone;

  if (kidFriendly && presetId === DIRECTOR_PRESET_IDS.HORROR_BACKYARD) {
    base.meta.tone = 'mild';
    base.storyArc.hook = 'Friendly ghosts play tricks in the backyard after sunset.';
    base.storyArc.mystery = 'A giggling spirit left clues near the swing and the old tree.';
    base.storyArc.finale = 'Find the glowing lantern and tap the medallion to win!';
    base.meta.claimMethod = CLAIM_METHOD.TAP_MEDALLION;
    base.meta.finderMode = FINDER_MODES.AR_ENHANCED;
  } else {
    base.meta.claimMethod = claimMethod;
    if (claimMethod === CLAIM_METHOD.TAP_MEDALLION) {
      base.meta.finderMode = FINDER_MODES.FINDER;
    }
    if (
      claimMethod === CLAIM_METHOD.HYBRID ||
      claimMethod === CLAIM_METHOD.PHYSICAL_MEDALLION
    ) {
      base.meta.finderMode = FINDER_MODES.FINDER;
    }
  }

  base.meta.scale = scale;
  base.meta.title =
    options.title ||
    (text.length > 10 && !options.presetId
      ? text.slice(0, 60).replace(/^\w/, (c) => c.toUpperCase())
      : base.meta.title);

  if (options.location) base.meta.location = options.location;

  const clueBlueprints = expandClueBlueprints(base.clueBlueprints, clueCount);

  const blueprint = {
    version: BLUEPRINT_VERSION,
    presetId,
    prompt: String(prompt || '').trim(),
    meta: base.meta,
    storyArc: base.storyArc,
    characters: base.characters,
    clues: clueBlueprints.map((c, i) => ({
      index: i,
      title: c.title,
      text: c.text,
      clueType: c.clueType || CLUE_TYPES.TEXT_RIDDLE,
      choices: c.choices || [],
      audioUrl: c.audioUrl || '',
      videoUrl: c.videoUrl || '',
      imageUrl: c.imageUrl || '',
      bonusRewardText: c.bonusRewardText || '',
      arPrompt: c.arPrompt || null,
      pathVariants: c.pathVariants || null,
      branchOptions: i === 0 && base.branching?.enabled ? base.branching.branchOptions : [],
      isFalseLead: Boolean(c.isFalseLead),
    })),
    arEncounters: clueBlueprints
      .map((c, i) =>
        c.arPrompt
          ? { clueIndex: i, trigger: i === 0 ? 'on_arrival' : 'after_checkin', prompt: c.arPrompt }
          : null
      )
      .filter(Boolean),
    npcDialogue: {
      byClueIndex: Object.fromEntries(
        clueBlueprints.map((c, i) => [i, c.npcLine || null]).filter(([, line]) => line)
      ),
      byPhase: {
        intro: base.characters[0]
          ? `${base.characters[0].name}: ${base.storyArc.hook}`
          : base.storyArc.hook,
        finale: base.storyArc.finale,
      },
    },
    twists: base.twists,
    finale: {
      arPrompt: base.finalePrompt,
      themeId: base.finaleThemeId,
      bossOptional: presetId === DIRECTOR_PRESET_IDS.HORROR_BACKYARD,
      endingVariants: base.branching?.alternateEndings || [],
    },
    collectionLore: {
      ...base.collectionLore,
      collectionId: base.meta.collectionId,
      collectionName: base.meta.collectionName,
    },
    audioMood: base.audioMood,
    branching: base.branching,
    generatedAt: new Date().toISOString(),
    options: { durationMin, players, atmosphere, branchingEnabled },
  };

  return { ok: true, blueprint };
}

function directorMetaFromBlueprint(blueprint) {
  const meta = blueprint?.meta || {};
  return {
    tone: meta.tone,
    template: meta.template,
    safeForKids: [
      ADVENTURE_TEMPLATES.FAMILY_FUN,
      ADVENTURE_TEMPLATES.EDUCATIONAL,
      ADVENTURE_TEMPLATES.CHURCH,
    ].includes(meta.template),
  };
}

function generateArSceneFromPrompt(prompt, directorMeta = {}) {
  if (!prompt) return emptyArScene();
  const toneOptions = resolveCinematicToneOptions(directorMeta);
  const result = generateSceneFromPrompt(prompt);
  if (result?.ok && result.scene) {
    const { scene } = enhanceSceneWithCinematicAssets(result.scene, prompt, toneOptions);
    return normalizeArScene(scene);
  }
  const matches = autoPickEntitiesForPrompt(prompt, 1, toneOptions);
  if (matches.length) {
    return applyCinematicEntityToScene(
      { enabled: true, title: matches[0].label, overlayText: prompt.slice(0, 120) },
      matches[0].id
    );
  }
  return emptyArScene();
}

function buildPathVariantScenes(pathVariants, useAr, directorMeta = {}) {
  if (!pathVariants || typeof pathVariants !== 'object') return pathVariants;
  const next = {};
  for (const [key, variant] of Object.entries(pathVariants)) {
    next[key] = {
      ...variant,
      arScene:
        useAr && variant.arPrompt
          ? generateArSceneFromPrompt(variant.arPrompt, directorMeta)
          : emptyArScene(),
    };
  }
  return next;
}

function resolveFinaleScene(blueprint) {
  const { finale, meta } = blueprint;
  const directorMeta = directorMetaFromBlueprint(blueprint);
  if (finale?.arPrompt) {
    const scene = generateArSceneFromPrompt(finale.arPrompt, directorMeta);
    if (scene?.enabled) return scene;
  }
  const theme = finale?.themeId ? FINALE_THEMES[finale.themeId] : null;
  if (theme?.scene) return normalizeArScene(theme.scene);
  if (meta.template === ADVENTURE_TEMPLATES.HORROR) {
    return normalizeArScene(FINALE_THEMES.black_lantern?.scene || emptyArScene());
  }
  return emptyArScene();
}

function buildCharacterNpcs(blueprint) {
  const primary = blueprint.characters[0];
  const secondary = blueprint.characters[1];

  return blueprint.characters.map((ch) => {
    const dialogues = [];

    if (ch.id === primary?.id) {
      const introRaw = blueprint.npcDialogue?.byPhase?.intro || '';
      const introText = introRaw.replace(/^[^:]+:\s*/, '').trim();
      if (introText) {
        dialogues.push({
          id: 'intro',
          text: introText,
          mood: 'guide',
          choices: [
            {
              id: 'trust',
              label: "I'm ready — guide me.",
              effects: { trust: 8, memoryKey: 'trail_started' },
              response: introText,
            },
            {
              id: 'cautious',
              label: 'Why should I trust you?',
              effects: { trust: -3 },
              nextLine: 'Fair question. Watch the signs — they never lie.',
            },
          ],
        });
      }
      Object.entries(blueprint.npcDialogue?.byClueIndex || {}).forEach(([idx, text]) => {
        if (text) {
          dialogues.push({
            id: `clue-${idx}`,
            text,
            mood: 'hint',
            choices: Number(idx) > 0 ? [
              {
                id: 'listen',
                label: 'Tell me more',
                effects: { trust: 5, memoryKey: 'hints_given' },
              },
              {
                id: 'rush',
                label: 'Just the clue',
                effects: { trust: -2 },
                nextLine: 'Alright — keep your eyes open.',
              },
            ] : undefined,
            pathFlavors: {
              brave: 'The bold path sharpens every sense.',
              cautious: 'Patience reveals what haste hides.',
              sanctuary: 'Walk with purpose — the path blesses the careful.',
              garden: 'Nature leaves breadcrumbs for those who notice.',
              historian: 'The archives whisper if you listen closely.',
              exhibit: 'Every exhibit holds a shadow of the truth.',
            },
          });
        }
      });
      const finale = blueprint.npcDialogue?.byPhase?.finale;
      if (finale) {
        dialogues.push({ id: 'finale', text: finale, mood: 'celebration' });
      }
    }

    if (ch.id === secondary?.id && blueprint.branching?.enabled) {
      dialogues.push({
        id: 'branch',
        text: 'Your choice here changes what you discover later.',
        mood: 'warning',
        choices: [
          {
            id: 'commit',
            label: 'I understand — we choose our path.',
            effects: { trust: 4, memoryKey: 'trusted_npc' },
          },
          {
            id: 'doubt',
            label: 'What if we choose wrong?',
            effects: { trust: -1 },
            nextLine: 'Then the story remembers.',
          },
        ],
      });
    }

    return {
      id: ch.id,
      name: ch.name,
      role: ch.role || 'Guide',
      avatar: ch.avatar || '🎭',
      personality: ch.personality,
      voice: ch.voice,
      memoryKeys: ch.memoryKeys || [],
      dialogues,
    };
  });
}

/**
 * Convert blueprint → Create Adventure form draft (compatible with applyDirectorDraft).
 */
export function blueprintToCreateDraft(blueprint, options = {}) {
  if (!blueprint?.meta) {
    return { ok: false, message: 'Invalid adventure blueprint.' };
  }

  const baseLat = options.baseLat ?? 37.34;
  const baseLng = options.baseLng ?? -95.26;
  const { meta: bpMeta, storyArc } = blueprint;

  const config = applySmartBuilderConfig({
    templateId: bpMeta.template,
    scaleId: bpMeta.scale,
    players: options.players || blueprint.options?.players || '3-5',
    durationMin: String(
      options.durationMin || blueprint.options?.durationMin || getScalePreset(bpMeta.scale).estimatedMinutes
    ),
    environment: options.environment || 'outdoor',
  });

  const claimCode = generateClaimCode();
  const story = buildStoryFromArc(storyArc, bpMeta.title);
  const scale = getScalePreset(bpMeta.scale);

  const atmosphere =
    blueprint.options?.atmosphere ||
    (bpMeta.tone === 'mild' ? 'mild' : bpMeta.tone === 'warm' ? 'mild' : 'creepy');

  const experienceSettings = {
    ...config.experienceSettings,
    atmosphere,
    soundEffects: blueprint.audioMood
      ? [blueprint.audioMood.search, blueprint.audioMood.tension].filter(Boolean)
      : config.experienceSettings.soundEffects,
    audioMood: blueprint.audioMood,
    arHorror: bpMeta.template === ADVENTURE_TEMPLATES.HORROR,
    dynamicHintsEnabled: true,
    backyardPrecision: scale.backyardPrecision,
    directorGenerated: true,
    storyArc,
    collectionLore: blueprint.collectionLore,
  };

  const useAr = bpMeta.finderMode === FINDER_MODES.AR_ENHANCED;
  const directorMeta = directorMetaFromBlueprint(blueprint);

  const clues = blueprint.clues.map((c, i) => {
    const [dLat, dLng] = GPS_OFFSETS[i % GPS_OFFSETS.length];
    const arScene =
      useAr && c.arPrompt ? generateArSceneFromPrompt(c.arPrompt, directorMeta) : emptyArScene();

    return {
      id: `dir-clue-${i + 1}-${Date.now()}`,
      title: c.title,
      text: c.text,
      latitude: String(baseLat + dLat * (i + 1)),
      longitude: String(baseLng + dLng * (i + 1)),
      radiusMeters: String(scale.clueRadiusM || 4),
      bonusRewardText: c.bonusRewardText || '',
      clueType: c.clueType || CLUE_TYPES.TEXT_RIDDLE,
      choices: c.choices || [],
      audioUrl: c.audioUrl || '',
      videoUrl: c.videoUrl || '',
      imageUrl: c.imageUrl || '',
      branchOptions: c.branchOptions || [],
      pathVariants: buildPathVariantScenes(c.pathVariants, useAr, directorMeta),
      arScene,
    };
  });

  const rewardTemplates = buildTemplateRewards(bpMeta.template);
  const rewards = rewardTemplates.map((r) => ({
    type: r.type,
    enabled: true,
    icon: r.icon,
    title: r.title,
    desc: r.desc,
    valueLabel: r.valueLabel,
    redemptionInstructions: r.redemptionInstructions,
    expirationDays: String(r.expirationDays || 0),
    quantityLimit: null,
    claimedCount: 0,
    rewardPolicy: 'continue_badge_coins_only',
  }));

  const arFinale =
    bpMeta.finderMode === FINDER_MODES.AR_ENHANCED ? resolveFinaleScene(blueprint) : emptyArScene();
  const cinematicEntityLabels = summarizeClueCinematicEntities(clues);
  if (arFinale?.cinematicEntityLabel) {
    cinematicEntityLabels.push(arFinale.cinematicEntityLabel);
  }
  const experienceSettingsWithCinematic = {
    ...experienceSettings,
    cinematicEntities: [...new Set(cinematicEntityLabels)],
  };
  const arTheme =
    bpMeta.template === ADVENTURE_TEMPLATES.HORROR ? 'horror' : 'none';

  const claimHint =
    bpMeta.claimMethod === CLAIM_METHOD.SECRET_CODE ||
    bpMeta.claimMethod === CLAIM_METHOD.HYBRID
      ? `The ${blueprint.characters[0]?.name || 'guide'} signed the ledger with one word: ${claimCode}.`
      : '';

  const worldConfig = normalizeWorldConfig({
    branchingEnabled: Boolean(blueprint.branching?.enabled),
    alternateEndings: blueprint.branching?.alternateEndings || [],
    worldEventTags:
      bpMeta.template === ADVENTURE_TEMPLATES.HORROR ? ['ghost-walk', 'backyard-haunt'] : ['family-fun'],
    hiddenDiscoveryIds: blueprint.collectionLore?.collectionId
      ? [blueprint.collectionLore.collectionId]
      : [],
    npcs: buildCharacterNpcs(blueprint),
  });

  const arCount = clues.filter((c) => c.arScene?.enabled).length;
  const pathVariantCount = clues.filter((c) => c.pathVariants && Object.keys(c.pathVariants).length).length;

  return {
    ok: true,
    blueprint,
    meta: {
      title: bpMeta.title,
      location: bpMeta.location || 'Your Backyard',
      sponsorName: options.sponsorName || 'Questory Creator',
      story,
      claimCode,
      claimMethod: bpMeta.claimMethod,
      claimHint,
      qrClaimValue: bpMeta.claimMethod === CLAIM_METHOD.QR_CODE ? claimCode : '',
      hintAfterTap:
        bpMeta.claimMethod === CLAIM_METHOD.PHYSICAL_MEDALLION
          ? 'Search for the hidden medallion engraved with your code.'
          : '',
      collectionName: bpMeta.collectionName || '',
      collectionId: bpMeta.collectionId || '',
      collectionBadge: bpMeta.collectionBadge || '',
      estimatedMinutes: config.estimatedMinutes,
      adventureScale: config.adventureScale,
      adventureTemplate: config.adventureTemplate,
      finderSearchRadiusM: config.finderSearchRadiusM,
      finderCaptureBaseM: config.finderCaptureBaseM,
      finderMode: bpMeta.finderMode,
      arAssetType: bpMeta.arAssetType,
      experienceSettings: experienceSettingsWithCinematic,
    },
    clues,
    rewards,
    arFinale,
    arTheme,
    worldConfig,
    summary: summarizeBlueprint(blueprint, { arCount, pathVariantCount }),
  };
}

export function summarizeBlueprint(blueprint, extras = {}) {
  const clueCount = blueprint.clues?.length || 0;
  const charCount = blueprint.characters?.length || 0;
  const arCount = extras.arCount ?? blueprint.arEncounters?.length ?? 0;
  const pathVariantCount =
    extras.pathVariantCount ??
    blueprint.clues?.filter((c) => c.pathVariants && Object.keys(c.pathVariants).length).length ??
    0;
  const preset = DIRECTOR_PRESETS[blueprint.presetId];
  const label = preset?.label || 'Custom';
  const twists = blueprint.twists?.length || 0;
  const branch = blueprint.branching?.enabled ? ' · branching' : '';
  const paths = pathVariantCount ? ` · ${pathVariantCount} path-variant clues` : '';
  return `${label} adventure · ${clueCount} clues · ${charCount} characters · ${arCount} AR scenes${twists ? ` · ${twists} twist` : ''}${branch}${paths}`;
}

export function refineDirectorBlueprint(blueprint, instruction) {
  if (!blueprint?.meta) {
    return { ok: false, message: 'No blueprint to refine.' };
  }

  const lower = String(instruction || '').toLowerCase();
  if (!lower.trim()) {
    return { ok: false, message: 'Describe how to refine the adventure.' };
  }

  const next = JSON.parse(JSON.stringify(blueprint));

  if (/scarier|creepier|terrifying|more horror/i.test(lower)) {
    next.meta.tone = 'creepy';
    next.options = { ...next.options, atmosphere: /terrifying/.test(lower) ? 'terrifying' : 'creepy' };
    next.audioMood = { ...next.audioMood, tension: 'heartbeat', reveal: 'strings' };
    next.storyArc.rising = 'The air grows cold. Every shadow might move.';
  }

  if (/easier|simpler|younger|kid/i.test(lower)) {
    next.meta.tone = 'mild';
    next.options = { ...next.options, atmosphere: 'mild' };
    next.clues = next.clues.slice(0, Math.max(2, next.clues.length - 1));
    next.storyArc.finale = 'Find the treasure and celebrate — you did it!';
  }

  if (/longer|more clues|extra clue/i.test(lower)) {
    const extraIndex = next.clues.length;
    next.clues.push({
      index: extraIndex,
      title: `Signal ${extraIndex + 1}`,
      text: 'A new trail marker appears — follow it to continue the story.',
      clueType: CLUE_TYPES.TEXT_RIDDLE,
      arPrompt: next.clues[0]?.arPrompt || null,
      branchOptions: [],
      isFalseLead: false,
    });
  }

  if (/branch|split path|multiple ending/i.test(lower) && next.branching) {
    next.branching.enabled = true;
  }

  if (/linear|no branch|single ending/i.test(lower) && next.branching) {
    next.branching.enabled = false;
    next.clues = next.clues.map((c) => ({ ...c, branchOptions: [] }));
  }

  if (/tap medallion|virtual medallion/i.test(lower)) {
    next.meta.claimMethod = CLAIM_METHOD.TAP_MEDALLION;
    next.meta.finderMode = FINDER_MODES.FINDER;
  }

  if (/secret code|claim code/i.test(lower)) {
    next.meta.claimMethod = CLAIM_METHOD.SECRET_CODE;
  }

  return { ok: true, blueprint: next };
}

export function refineDirectorDraft(draft, instruction, options = {}) {
  if (!draft?.ok || !draft.blueprint) return draft;
  const refined = refineDirectorBlueprint(draft.blueprint, instruction);
  if (!refined.ok) return refined;
  const nextDraft = blueprintToCreateDraft(refined.blueprint, options);
  return {
    ...nextDraft,
    summary: `${nextDraft.summary} · refined`,
  };
}

export function generateFullAdventureFromPrompt(prompt, options = {}) {
  const blueprintResult = generateAdventureBlueprint(prompt, options);
  if (!blueprintResult.ok) return blueprintResult;
  return blueprintToCreateDraft(blueprintResult.blueprint, options);
}

export function getDirectorSuggestions() {
  return [
    'Haunted backyard for 8-year-olds, 5 clues, tap medallion',
    'Scary backyard ghost hunt for teens, secret code claim',
    'Family backyard treasure hunt for grandparents visiting',
    'Church youth group Easter scavenger hunt, branching paths',
    'Educational history trail for my classroom, 4 clues',
    'Horror yard hunt with branching paths and lantern finale',
  ];
}

export function getDirectorPresets() {
  return Object.values(DIRECTOR_PRESETS);
}

export const ADVENTURE_DIRECTOR = {
  enabled: true,
  label: 'Generate Full Adventure',
  version: BLUEPRINT_VERSION,
  placeholder:
    'Haunted backyard for 8-year-olds, 5 clues, tap medallion — or pick a preset below.',
  refinePlaceholder: 'Refine: make it scarier, add a clue, enable branching...',
};
