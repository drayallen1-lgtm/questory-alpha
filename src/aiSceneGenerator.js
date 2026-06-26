import {
  AR_ATMOSPHERES,
  AR_INTERACTIONS,
  AR_SCENE_TYPES,
  AR_TRIGGERS,
  normalizeArScene,
} from './arEngine';
import { libraryAssetForInsert } from './horrorAssets/catalog';
import { getFinaleTheme } from './finaleThemes';
import { extractQuotedDialogue, sanitizeDialogueField } from './dialogueExtract';
import { findLibraryAsset, insertAssetIntoScene } from './mediaStudio';
import { buildCinematicTimeline, summarizeTimeline } from './aiTimelineGenerator';

/** Local horror keyword engine — no API, instant matching */
export const HORROR_DICTIONARY = {
  characters: [
    { keywords: ['ghost girl', 'little girl', 'girl appears', 'child spirit', 'daughter', 'kid', 'young girl', 'small girl'], assetId: 'ghost-little-girl', label: 'Little Girl' },
    { keywords: ['shadow figure', 'shadow man', 'dark figure', 'silhouette', 'the shadow', 'shadow stands', 'shadow appears'], assetId: 'ghost-shadow', label: 'Shadow Figure' },
    { keywords: ['woman in white', 'white lady', 'bride', 'mourner', 'widow', 'lady in white', 'pale woman'], assetId: 'ghost-woman-white', label: 'Woman in White' },
    { keywords: ['hooded man', 'hooded figure', 'hooded watcher', 'watcher', 'stalker', 'shadow priest', 'the hooded', 'robed figure'], assetId: 'ghost-hooded', label: 'Hooded Watcher' },
  ],
  locations: [
    { keywords: ['swing set', 'swing', 'playground', 'yard', 'porch swing'], assetId: 'obj-swing', label: 'Abandoned Swing' },
    { keywords: ['dead tree', 'oak tree', 'old tree', 'beneath the tree', 'under the tree', 'branches move', 'branches above', 'the tree', ' oak', 'woods', 'forest', 'wooded'], assetId: 'obj-dead-tree', label: 'Dead Tree' },
    { keywords: ['lantern', 'black lantern', 'flame', 'torch', 'candle', 'light flicker', 'flickering light'], assetId: 'obj-lantern', label: 'Black Lantern' },
    { keywords: ['diary', 'journal', 'torn page', 'page appears', 'diary page', 'old book'], assetId: 'obj-diary', label: 'Diary Page' },
  ],
  sounds: [
    { keywords: ['whisper', 'whispers', 'murmur', 'murmurs', 'hushed voice', 'ghost voice'], assetId: 'aud-whisper', label: 'Whispering Voices' },
    { keywords: ['laugh', 'giggle', 'child laughing', 'child laugh', 'giggling'], assetId: 'aud-laugh', label: 'Child Laughter' },
    { keywords: ['radio', 'static', 'signal', 'interference', 'crackles', 'crackle', 'transmission'], assetId: 'aud-static', label: 'Radio Static' },
    { keywords: ['footstep', 'footsteps', 'walking', 'approaching steps'], assetId: 'aud-footsteps', label: 'Footsteps' },
    { keywords: ['wind', 'gust', 'gusts', 'breeze', 'howling wind'], assetId: 'aud-wind', label: 'Wind Gusts' },
    { keywords: ['music box', 'musicbox', 'lullaby', 'melody box'], assetId: 'aud-musicbox', label: 'Music Box' },
    { keywords: ['swing creak', 'creak', 'creaking', 'chain rattle'], assetId: 'aud-swing', label: 'Swing Creak' },
  ],
  finaleHints: [
    { keywords: ['woods', 'forest', 'tree', 'oak', 'branches', 'hollow', 'forgotten'], themeId: 'forgotten_souls', label: 'Forgotten Souls' },
    { keywords: ['lantern', 'flame', 'torch', 'flicker', 'burning'], themeId: 'black_lantern', label: 'Black Lantern' },
    { keywords: ['train', 'station', 'conductor', 'platform', 'rail', 'midnight train'], themeId: 'midnight_train', label: 'Midnight Train' },
    { keywords: ['signal', 'static', 'paranormal', 'transmission'], themeId: 'paranormal_signal', label: 'Paranormal Signal' },
    { keywords: ['crest', 'mark', 'seal', 'emblem'], themeId: 'horror_crest', label: 'Horror Crest' },
  ],
};

const TITLE_NOUNS = {
  'ghost-little-girl': 'Porch Scare',
  'ghost-shadow': 'Last Witness',
  'ghost-woman-white': 'White Bride',
  'ghost-hooded': 'Dark Watcher',
  'obj-swing': 'Swing Set',
  'obj-dead-tree': 'Old Tree',
  'obj-lantern': 'Lantern Light',
  'obj-diary': 'Diary Page',
};

const TITLE_ADJECTIVES = ['last', 'final', 'forgotten', 'silent', 'dark', 'lost', 'hidden', 'midnight', 'hollow'];

function normalizeText(prompt) {
  return String(prompt || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractOverlayText(prompt) {
  return extractQuotedDialogue(prompt);
}

function matchBest(text, entries) {
  let best = null;
  let bestLen = 0;
  for (const entry of entries) {
    for (const kw of entry.keywords) {
      if (text.includes(kw) && kw.length > bestLen) {
        bestLen = kw.length;
        best = entry;
      }
    }
  }
  return best;
}

function matchAll(text, entries) {
  const hits = [];
  for (const entry of entries) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) {
        hits.push({ ...entry, matchedKeyword: kw, score: kw.length });
        break;
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score);
}

function detectSceneType(text, hasCharacter) {
  if (/jump scare|jumps out|screams|lunges|attacks|run!/.test(text)) {
    return AR_SCENE_TYPES.JUMP_SCARE;
  }
  if (/diary|journal|torn page|page appears|written/.test(text)) {
    return AR_SCENE_TYPES.DIARY;
  }
  if (/memory|flashback|remember|vision|recall/.test(text)) {
    return AR_SCENE_TYPES.MEMORY;
  }
  if (/portal|door opens|gateway|rift/.test(text)) {
    return AR_SCENE_TYPES.PORTAL;
  }
  if (hasCharacter || /ghost|spirit|apparition|figure appears|she appears|he appears/.test(text)) {
    return AR_SCENE_TYPES.GHOST;
  }
  return AR_SCENE_TYPES.OBJECT;
}

function suggestTrigger(text, sceneType) {
  if (/finale|capture|medallion|finder|final scene/.test(text)) {
    return AR_TRIGGERS.FINDER_CAPTURE;
  }
  if (/answer|riddle|puzzle|solve|correct/.test(text)) {
    return AR_TRIGGERS.AFTER_ANSWER;
  }
  if (/arrival|arrives|on approach|when they arrive/.test(text)) {
    return AR_TRIGGERS.ON_ARRIVAL;
  }
  if (sceneType === AR_SCENE_TYPES.JUMP_SCARE) {
    return AR_TRIGGERS.FINDER_CAPTURE;
  }
  return AR_TRIGGERS.AFTER_CHECKIN;
}

function suggestDuration(text, sceneType, overlayLen, audioCount) {
  let seconds = 8;
  if (overlayLen > 60) seconds += 3;
  else if (overlayLen > 30) seconds += 2;
  if (audioCount > 1) seconds += 2;
  if (sceneType === AR_SCENE_TYPES.JUMP_SCARE) seconds += 3;
  if (sceneType === AR_SCENE_TYPES.DIARY) seconds += 2;
  if (/long|slow|lingers|drawn out/.test(text)) seconds += 3;
  if (/quick|brief|flash|instant/.test(text)) seconds -= 2;
  return Math.min(20, Math.max(6, seconds));
}

function suggestAtmosphere(text, sceneType, locationEntry) {
  if (/static|radio|signal|interference/.test(text)) return AR_ATMOSPHERES.STATIC;
  if (/lantern|flicker|flame|torch/.test(text)) return AR_ATMOSPHERES.LANTERN;
  if (/fog|mist|haze/.test(text)) return AR_ATMOSPHERES.FOG;
  if (/flash|lightning|burst/.test(text)) return AR_ATMOSPHERES.FLASH;
  if (sceneType === AR_SCENE_TYPES.JUMP_SCARE) return AR_ATMOSPHERES.DARKNESS;
  if (locationEntry?.assetId === 'obj-lantern') return AR_ATMOSPHERES.LANTERN;
  if (locationEntry?.assetId === 'obj-dead-tree') return AR_ATMOSPHERES.DARKNESS;
  return AR_ATMOSPHERES.FOG;
}

function generateTitle(text, characterEntry, locationEntry) {
  if (characterEntry?.assetId === 'ghost-little-girl' && locationEntry?.assetId === 'obj-swing') {
    return 'The Porch Scare';
  }
  if (characterEntry?.assetId === 'ghost-shadow' && locationEntry?.assetId === 'obj-dead-tree') {
    return 'The Last Witness';
  }
  const adj = TITLE_ADJECTIVES.find((a) => new RegExp(`\\b${a}\\b`).test(text));
  const primaryId = characterEntry?.assetId || locationEntry?.assetId;
  const noun = TITLE_NOUNS[primaryId] || characterEntry?.label || locationEntry?.label || 'Haunting';
  if (adj) {
    const cap = adj.charAt(0).toUpperCase() + adj.slice(1);
    return `The ${cap} ${noun.split(' ').pop()}`;
  }
  if (characterEntry && locationEntry) {
    return `The ${locationEntry.label.split(' ').pop()} ${characterEntry.label.split(' ').pop()}`;
  }
  return `The ${noun}`;
}

function buildDescription(prompt, characterEntry, locationEntry, audioEntries) {
  const extras = [];
  if (characterEntry && locationEntry) {
    extras.push(`${characterEntry.label} near the ${locationEntry.label.toLowerCase()}.`);
  }
  if (audioEntries.length) {
    extras.push(`Audio: ${audioEntries.map((a) => a.label).join(', ')}.`);
  }
  if (!extras.length) return prompt.trim();
  return `${prompt.trim()} ${extras.join(' ')}`;
}

function libraryAssetByDictEntry(entry) {
  if (!entry?.assetId) return null;
  const asset = findLibraryAsset(entry.assetId);
  return asset ? libraryAssetForInsert({ ...asset, source: 'library' }) : null;
}

/** Parse a creator prompt into a complete AR scene — 100% local, no API. */
export function generateSceneFromPrompt(prompt) {
  const trimmed = String(prompt || '').trim();
  if (trimmed.length < 8) {
    return { ok: false, message: 'Describe your scene in a few words (at least 8 characters).' };
  }

  const text = normalizeText(trimmed);
  const overlayRaw = extractOverlayText(trimmed);

  const characterEntry = matchBest(text, HORROR_DICTIONARY.characters);
  const locationEntry = matchBest(text, HORROR_DICTIONARY.locations);
  const audioEntries = matchAll(text, HORROR_DICTIONARY.sounds).slice(0, 2);
  const finaleHint = matchBest(text, HORROR_DICTIONARY.finaleHints);

  if (!characterEntry && !locationEntry && !audioEntries.length) {
    return {
      ok: false,
      message: 'Could not match horror assets. Try words like ghost, swing, tree, whisper, or lantern.',
    };
  }

  const overlayText = sanitizeDialogueField(
    overlayRaw || (characterEntry ? `${characterEntry.label} appears...` : 'Something is watching.')
  );

  const sceneType = detectSceneType(text, Boolean(characterEntry));
  const trigger = suggestTrigger(text, sceneType);
  const durationSeconds = suggestDuration(
    text,
    sceneType,
    overlayText.length,
    audioEntries.length
  );
  const atmosphere = suggestAtmosphere(text, sceneType, locationEntry);
  const title = generateTitle(text, characterEntry, locationEntry);
  const jumpScare = sceneType === AR_SCENE_TYPES.JUMP_SCARE;

  const visualAssets = [];
  if (characterEntry) visualAssets.push(libraryAssetByDictEntry(characterEntry));
  if (locationEntry && locationEntry.assetId !== characterEntry?.assetId) {
    visualAssets.push(libraryAssetByDictEntry(locationEntry));
  }

  const primaryVisual = visualAssets[0] || null;
  const audioPrimary = audioEntries[0] ? libraryAssetByDictEntry(audioEntries[0]) : null;
  const audioSecondary = audioEntries[1] ? libraryAssetByDictEntry(audioEntries[1]) : null;

  let scene = normalizeArScene({
    enabled: true,
    title,
    description: buildDescription(trimmed, characterEntry, locationEntry, audioEntries),
    overlayText,
    _dialoguePrompt: trimmed,
    sceneType,
    trigger,
    durationSeconds,
    atmosphere,
    interaction:
      sceneType === AR_SCENE_TYPES.DIARY || sceneType === AR_SCENE_TYPES.JUMP_SCARE
        ? AR_INTERACTIONS.TAP_REVEAL
        : AR_INTERACTIONS.WATCH,
    jumpScare,
    allowReplay: true,
  });

  if (primaryVisual) {
    scene = insertAssetIntoScene(scene, primaryVisual);
  }

  const audioUrl = audioPrimary?.audioUrl || audioSecondary?.audioUrl || '';
  if (audioUrl) {
    scene = normalizeArScene({ ...scene, audioUrl });
  }

  const { timeline, durationSeconds: timelineDuration } = buildCinematicTimeline({
    sceneType,
    characterEntry,
    locationEntry,
    audioEntries,
    overlayText: scene.overlayText,
    durationSeconds,
    atmosphere,
    jumpScare,
  });

  scene = normalizeArScene({
    ...scene,
    timeline,
    durationSeconds: timelineDuration,
  });

  const timelineSummary = summarizeTimeline(scene.timeline);

  const finaleTheme = finaleHint ? getFinaleTheme(finaleHint.themeId) : null;

  return {
    ok: true,
    prompt: trimmed,
    scene,
    title,
    sceneType,
    overlayText: scene.overlayText,
    trigger,
    durationSeconds: scene.durationSeconds,
    allowReplay: true,
    matched: {
      character: characterEntry,
      location: locationEntry,
      audio: audioEntries,
      visualAssets: visualAssets.filter(Boolean).map((a) => ({ id: a.id, title: a.title })),
    },
    suggestions: {
      finaleTheme: finaleTheme
        ? { id: finaleTheme.id, label: finaleTheme.label, arTheme: finaleTheme.arTheme }
        : null,
    },
    summary: buildGenerationSummary({
      title,
      sceneType,
      visualAssets,
      audioEntries,
      overlayText: scene.overlayText,
      trigger,
      durationSeconds: scene.durationSeconds,
      finaleTheme,
      timelineSummary,
    }),
  };
}

function buildGenerationSummary({
  title,
  sceneType,
  visualAssets,
  audioEntries,
  overlayText,
  trigger,
  durationSeconds,
  finaleTheme,
  timelineSummary,
}) {
  const sceneTypeLabels = {
    ghost: 'Ghost Appearance',
    object: 'Floating Object',
    diary: 'Diary Page',
    jump_scare: 'Jump Scare',
    memory: 'Memory Flashback',
    portal: 'Portal',
    custom: 'Custom Scene',
  };
  const triggerLabels = {
    on_arrival: 'On Arrival',
    after_checkin: 'After GPS Check-In',
    after_answer: 'After Answer',
    finder_capture: 'Finder Capture',
  };

  return {
    title,
    sceneType: sceneTypeLabels[sceneType] || sceneType,
    visuals: visualAssets.filter(Boolean).map((a) => a.title),
    audio: audioEntries.map((a) => a.label),
    overlayText,
    trigger: triggerLabels[trigger] || trigger,
    durationSeconds,
    replay: 'Enabled',
    finaleTheme: finaleTheme?.label || null,
    timeline: timelineSummary?.eventCount
      ? `${timelineSummary.eventCount} events · ${timelineSummary.audioLayers} audio · ${timelineSummary.choreographySteps} choreography`
      : null,
  };
}

export const AI_SCENE_GENERATOR = {
  enabled: true,
  label: 'Generate Scene',
  placeholder:
    'A ghost girl appears beside the swing and whispers, "Don\'t look back."',
  examples: [
    'A shadow figure stands beneath the tree. Branches move above him. The radio crackles: "You\'re too late."',
    'A little girl appears beside the swing and whispers, "Don\'t look back."',
    'The hooded watcher flickers by the black lantern in the woods.',
  ],
};
