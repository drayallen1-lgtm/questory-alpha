/**
 * Alpha 1.0 — Milestone 20: Dynamic World Events
 * Evaluates recurring/limited-time events once per session day and injects modifiers.
 */
import { WEATHER_TYPES } from './weatherTypes';

export const WORLD_EVENT_TYPES = {
  HALLOWEEN: 'halloween',
  CHRISTMAS: 'christmas',
  EASTER: 'easter',
  INDEPENDENCE_DAY: 'independence_day',
  SUMMER: 'summer',
  WINTER: 'winter',
  SPRING: 'spring',
  FALL: 'fall',
  FRIDAY_13TH: 'friday_13th',
  FULL_MOON: 'full_moon',
  COMMUNITY_WEEKEND: 'community_weekend',
  SPONSOR_WEEKEND: 'sponsor_weekend',
  DOUBLE_COIN_WEEKEND: 'double_coin_weekend',
  HIDDEN_RELIC_WEEKEND: 'hidden_relic_weekend',
  FOUNDER_EVENT: 'founder_event',
};

export const LIMITED_EVENT_RELICS = {
  'pumpkin-lantern': {
    id: 'pumpkin-lantern',
    name: 'Pumpkin Lantern',
    icon: '🎃',
    desc: 'Glows orange through the fog — Halloween exclusive.',
    eventId: 'halloween',
  },
  'crystal-snowflake': {
    id: 'crystal-snowflake',
    name: 'Crystal Snowflake',
    icon: '❄️',
    desc: 'Frozen light from the holiday trail.',
    eventId: 'christmas',
  },
  'founder-coin': {
    id: 'founder-coin',
    name: 'Founder Coin',
    icon: '👑',
    desc: 'Minted for Founder Weekend pioneers.',
    eventId: 'founder_event',
  },
  'holiday-crest': {
    id: 'holiday-crest',
    name: 'Holiday Crest',
    icon: '🎄',
    desc: 'Awarded during the Christmas world event.',
    eventId: 'christmas',
  },
  'black-raven-feather': {
    id: 'black-raven-feather',
    name: 'Black Raven Feather',
    icon: '🪶',
    desc: 'Found only on Friday the 13th.',
    eventId: 'friday_13th',
  },
  'community-torch': {
    id: 'community-torch',
    name: 'Community Torch',
    icon: '🔥',
    desc: 'Lit when 100 explorers join a world event.',
    eventId: 'community_weekend',
  },
};

export const WORLD_EVENT_BADGES = {
  'halloween-hunter': { id: 'halloween-hunter', label: 'Halloween Hunter', icon: '🎃', rarity: 'event' },
  'holiday-trailblazer': { id: 'holiday-trailblazer', label: 'Holiday Trailblazer', icon: '🎄', rarity: 'event' },
  'friday-survivor': { id: 'friday-survivor', label: 'Friday Survivor', icon: '🌑', rarity: 'event' },
  'founder-weekend': { id: 'founder-weekend', label: 'Founder Weekend', icon: '👑', rarity: 'event' },
  'double-coin-champion': { id: 'double-coin-champion', label: 'Double Coin Champion', icon: '🪙', rarity: 'event' },
};

const COMMUNITY_MILESTONES = [
  {
    id: 'lantern-100',
    title: '100 explorers found the Black Lantern',
    body: 'The world grows darker — and bolder.',
    icon: '🏮',
    threshold: 100,
    metric: 'black_lantern_sightings',
    current: 127,
  },
  {
    id: 'relic-spawn',
    title: 'A new relic has appeared',
    body: 'Event relics shimmer at the edge of the map.',
    icon: '✨',
    threshold: 1,
    metric: 'active_relics',
    current: 1,
  },
  {
    id: 'secret-ending-first',
    title: 'Someone unlocked the Secret Ending',
    body: 'A historian path was completed in Parsons Legends.',
    icon: '🔮',
    threshold: 1,
    metric: 'secret_endings',
    current: 3,
  },
];

/** @type {WorldEventDef[]} */
export const WORLD_EVENTS = [
  {
    id: 'halloween',
    type: WORLD_EVENT_TYPES.HALLOWEEN,
    title: 'All Hallows Hunt',
    description: 'Fog rolls in. Ghost frequency rises. Exclusive pumpkin relics appear.',
    banner: 'The world feels different tonight — ghosts stir in every hunt.',
    icon: '🎃',
    priority: 90,
    schedule: { kind: 'annual', startMonth: 10, startDay: 20, endMonth: 11, endDay: 3 },
    modifiers: {
      weather: WEATHER_TYPES.FOG,
      atmosphere: 'halloween',
      ghostFrequencyBoost: 0.3,
      particles: ['fog', 'pumpkin', 'shadow'],
      darkerAtmosphere: true,
      audioMoodOverride: { search: 'whisper', tension: 'heartbeat', reveal: 'scream', victory: 'fanfare' },
    },
    participatingTags: ['ghost-walk', 'horror', 'legendary-roaming', 'backyard-haunt'],
    participatingAdventureIds: ['neosho-legend', 'union-depot-ghost'],
    bonusRewards: { badgeId: 'halloween-hunter', coinBonus: 15 },
    exclusiveRelics: ['pumpkin-lantern'],
    creatorSupportTags: ['halloween', 'horror'],
    adventureOverrides: {
      'neosho-legend': {
        titleSuffix: ' · Halloween',
        finaleOverlayText: 'The Black Lantern burns orange through the fog — extra ghosts circle the river bend.',
        badgeId: 'halloween-hunter',
        alternateEndingTitle: 'Halloween Lantern Path',
        audioMood: { search: 'whisper', tension: 'scream', reveal: 'strings' },
      },
      'union-depot-ghost': {
        finaleOverlayText: 'Platform shadows deepen — the conductor leaves a pumpkin lantern on the bench.',
        badgeId: 'halloween-hunter',
      },
    },
    npcSchedules: {
      'conductor-ghost': {
        intro: "I told you not to come tonight.",
        branch: 'The shadows are hungry on nights like this.',
      },
    },
    directorTheme: {
      tone: 'horror',
      promptSuffix: 'Halloween ghost hunt with fog, pumpkins, and holiday dread',
      audioMood: { search: 'whisper', tension: 'heartbeat', reveal: 'scream', victory: 'fanfare' },
      assetHints: ['ghost_bride', 'floating_lantern', 'shadow_child'],
    },
  },
  {
    id: 'christmas',
    type: WORLD_EVENT_TYPES.CHRISTMAS,
    title: 'Holiday Trail',
    description: 'Snow particles, presents, and warm holiday soundtrack across the world.',
    banner: 'Snow falls on the trails — holiday treasures await.',
    icon: '🎄',
    priority: 85,
    schedule: { kind: 'annual', startMonth: 12, startDay: 1, endMonth: 1, endDay: 6 },
    modifiers: {
      weather: WEATHER_TYPES.SNOW,
      atmosphere: 'christmas',
      particles: ['snow', 'present'],
      audioMoodOverride: { search: 'musicbox', tension: 'bells', reveal: 'bells', victory: 'celebration' },
    },
    participatingTags: ['family-fun', 'faith-trail'],
    bonusRewards: { badgeId: 'holiday-trailblazer', coinBonus: 20 },
    exclusiveRelics: ['crystal-snowflake', 'holiday-crest'],
    creatorSupportTags: ['christmas', 'family'],
    npcSchedules: {
      'conductor-ghost': { intro: 'The lanterns burn warm tonight.' },
      'grandpa-joe': { intro: 'Grandpa left presents along the trail — can you find them all?' },
    },
    directorTheme: {
      tone: 'warm',
      promptSuffix: 'Christmas family treasure hunt with snow and holiday spirit',
      audioMood: { search: 'musicbox', tension: 'bells', reveal: 'bells', victory: 'celebration' },
    },
  },
  {
    id: 'independence_day',
    type: WORLD_EVENT_TYPES.INDEPENDENCE_DAY,
    title: 'Fireworks Treasures',
    description: 'Fourth of July hunts with bonus coins and patriotic flair.',
    banner: 'Fireworks light the sky — limited rewards sparkle on the trail.',
    icon: '🎆',
    priority: 70,
    schedule: { kind: 'annual', startMonth: 7, startDay: 1, endMonth: 7, endDay: 7 },
    modifiers: {
      atmosphere: 'celebration',
      particles: ['spark'],
      coinMultiplier: 1.5,
    },
    participatingTags: ['family-fun', 'ghost-walk'],
    bonusRewards: { coinBonus: 50 },
    creatorSupportTags: ['independence_day'],
  },
  {
    id: 'easter',
    type: WORLD_EVENT_TYPES.EASTER,
    title: 'Spring Egg Trail',
    description: 'Hidden eggs and garden paths bloom across community hunts.',
    banner: 'Spring surprises hide in plain sight.',
    icon: '🐣',
    priority: 65,
    schedule: { kind: 'annual', startMonth: 3, startDay: 20, endMonth: 4, endDay: 25 },
    modifiers: {
      weather: WEATHER_TYPES.CLEAR,
      atmosphere: 'spring',
      particles: ['spark'],
    },
    participatingTags: ['faith-trail', 'family-fun'],
    bonusRewards: { coinBonus: 25 },
    creatorSupportTags: ['easter'],
  },
  {
    id: 'summer',
    type: WORLD_EVENT_TYPES.SUMMER,
    title: 'Summer of Discovery',
    description: 'Golden hour trails and festival energy.',
    banner: 'Long days. Warm trails. Bonus exploration.',
    icon: '🌅',
    priority: 40,
    schedule: { kind: 'annual', startMonth: 6, startDay: 1, endMonth: 8, endDay: 31 },
    modifiers: {
      weather: WEATHER_TYPES.CLEAR,
      atmosphere: 'sunset',
      goldenHour: true,
      coinBonus: 10,
    },
    participatingTags: ['family-fun', 'ghost-walk'],
    creatorSupportTags: ['summer'],
  },
  {
    id: 'winter',
    type: WORLD_EVENT_TYPES.WINTER,
    title: 'Winter Whispers',
    description: 'Cold winds and rare night encounters.',
    banner: 'Winter sharpens every clue.',
    icon: '❄️',
    priority: 35,
    schedule: { kind: 'annual', startMonth: 12, startDay: 15, endMonth: 2, endDay: 28 },
    modifiers: {
      weather: WEATHER_TYPES.SNOW,
      atmosphere: 'winter',
      particles: ['snow'],
    },
    creatorSupportTags: ['winter'],
  },
  {
    id: 'spring',
    type: WORLD_EVENT_TYPES.SPRING,
    title: 'Spring Awakening',
    description: 'New growth and renewed trails.',
    banner: 'The world wakes up — fresh hunts bloom.',
    icon: '🌸',
    priority: 30,
    schedule: { kind: 'annual', startMonth: 3, startDay: 1, endMonth: 5, endDay: 31 },
    modifiers: { atmosphere: 'spring', goldenHour: true },
    creatorSupportTags: ['spring'],
  },
  {
    id: 'fall',
    type: WORLD_EVENT_TYPES.FALL,
    title: 'Autumn Lore',
    description: 'Harvest fog and hidden stories along the rails.',
    banner: 'Leaves turn. Legends stir.',
    icon: '🍂',
    priority: 30,
    schedule: { kind: 'annual', startMonth: 9, startDay: 1, endMonth: 11, endDay: 19 },
    modifiers: {
      weather: WEATHER_TYPES.FOG,
      atmosphere: 'harvest',
      particles: ['fog'],
    },
    creatorSupportTags: ['fall', 'horror'],
  },
  {
    id: 'friday_13th',
    type: WORLD_EVENT_TYPES.FRIDAY_13TH,
    title: 'Friday the 13th',
    description: 'Darker atmosphere, rare horror encounters, legendary rewards.',
    banner: 'You should leave — but the trail calls.',
    icon: '🌑',
    priority: 95,
    schedule: { kind: 'friday_13th' },
    modifiers: {
      weather: WEATHER_TYPES.NIGHT,
      atmosphere: 'dread',
      darkerAtmosphere: true,
      ghostFrequencyBoost: 0.5,
      audioMoodOverride: { search: 'static', tension: 'heartbeat', reveal: 'scream' },
    },
    participatingTags: ['horror', 'ghost-walk', 'legendary-roaming'],
    bonusRewards: { badgeId: 'friday-survivor', coinBonus: 30 },
    exclusiveRelics: ['black-raven-feather'],
    creatorSupportTags: ['friday_13th', 'horror'],
    npcSchedules: {
      'conductor-ghost': { intro: 'You should leave.', branch: 'Thirteen always collects its due.' },
    },
    adventureOverrides: {
      'neosho-legend': {
        finaleOverlayText: 'The Black Lantern flares blood-red — Friday the 13th claims another witness.',
        badgeId: 'friday-survivor',
      },
    },
  },
  {
    id: 'full_moon',
    type: WORLD_EVENT_TYPES.FULL_MOON,
    title: 'Full Moon Rising',
    description: 'Creatures spawn more often under a full moon.',
    banner: 'The moon is full — rare encounters increase.',
    icon: '🌕',
    priority: 50,
    schedule: { kind: 'full_moon' },
    modifiers: {
      weather: WEATHER_TYPES.NIGHT,
      ghostFrequencyBoost: 0.25,
    },
    participatingTags: ['ghost-walk', 'legendary-roaming'],
    creatorSupportTags: ['full_moon'],
  },
  {
    id: 'community_weekend',
    type: WORLD_EVENT_TYPES.COMMUNITY_WEEKEND,
    title: 'Community Weekend',
    description: 'Explorers unite — shared milestones and community relics.',
    banner: 'The community hunts together this weekend.',
    icon: '👥',
    priority: 55,
    schedule: { kind: 'weekend' },
    modifiers: { coinBonus: 15 },
    exclusiveRelics: ['community-torch'],
    creatorSupportTags: ['community'],
  },
  {
    id: 'sponsor_weekend',
    type: WORLD_EVENT_TYPES.SPONSOR_WEEKEND,
    title: 'Sponsor Weekend',
    description: 'Featured sponsors drop limited rewards.',
    banner: 'Sponsor hunts shine this weekend.',
    icon: '🏢',
    priority: 45,
    schedule: { kind: 'first_weekend_of_month' },
    modifiers: { coinBonus: 20 },
    creatorSupportTags: ['sponsor'],
  },
  {
    id: 'double_coin_weekend',
    type: WORLD_EVENT_TYPES.DOUBLE_COIN_WEEKEND,
    title: 'Double Coin Weekend',
    description: 'All coin rewards doubled through Sunday night.',
    banner: 'Double coins on every completed hunt!',
    icon: '🪙',
    priority: 80,
    schedule: { kind: 'last_weekend_of_month' },
    modifiers: { coinMultiplier: 2 },
    bonusRewards: { badgeId: 'double-coin-champion' },
    creatorSupportTags: ['double_coin'],
  },
  {
    id: 'hidden_relic_weekend',
    type: WORLD_EVENT_TYPES.HIDDEN_RELIC_WEEKEND,
    title: 'Hidden Relic Weekend',
    description: 'Secret relics appear across the world map.',
    banner: 'A relic shimmer was detected — search the World tab.',
    icon: '💎',
    priority: 60,
    schedule: { kind: 'interval_days', interval: 14, anchor: 7 },
    modifiers: { revealHiddenRelics: true },
    creatorSupportTags: ['relic'],
  },
  {
    id: 'founder_event',
    type: WORLD_EVENT_TYPES.FOUNDER_EVENT,
    title: 'Founder Weekend',
    description: 'Exclusive Founder Medallions and legacy rewards.',
    banner: 'Founders walk again — limited medallions available.',
    icon: '👑',
    priority: 75,
    schedule: { kind: 'annual', startMonth: 1, startDay: 10, endMonth: 1, endDay: 20 },
    modifiers: { coinMultiplier: 1.5 },
    bonusRewards: { badgeId: 'founder-weekend' },
    exclusiveRelics: ['founder-coin'],
    participatingTags: ['founder'],
    creatorSupportTags: ['founder'],
  },
];

let _cache = null;
let _cacheKey = null;

export const EMPTY_WORLD_EVENT_CONTEXT = Object.freeze({
  now: new Date(0),
  activeEvents: [],
  primaryEvent: null,
  activeWorldEvent: null,
  modifiers: {},
  worldEventModifiers: {},
  endingSoon: [],
  upcoming: [],
  coinMultiplier: 1,
  coinBonus: 0,
  limitedRelicsAvailable: [],
  notifications: [],
  communityMilestones: [],
  featuredCreator: null,
  featuredSponsor: null,
  participatingCount: 0,
});

function normalizeWorldEventContext(context, now = new Date()) {
  const activeEvents = Array.isArray(context?.activeEvents) ? context.activeEvents : [];
  const modifiers =
    context?.modifiers && typeof context.modifiers === 'object' ? context.modifiers : {};
  const primaryEvent = context?.primaryEvent ?? activeEvents[0] ?? null;

  return {
    ...EMPTY_WORLD_EVENT_CONTEXT,
    ...context,
    now: context?.now || now,
    activeEvents,
    primaryEvent,
    activeWorldEvent: primaryEvent,
    modifiers,
    worldEventModifiers: modifiers,
    endingSoon: Array.isArray(context?.endingSoon) ? context.endingSoon : [],
    upcoming: Array.isArray(context?.upcoming) ? context.upcoming : [],
    limitedRelicsAvailable: Array.isArray(context?.limitedRelicsAvailable)
      ? context.limitedRelicsAvailable
      : [],
    notifications: Array.isArray(context?.notifications) ? context.notifications : [],
    communityMilestones: Array.isArray(context?.communityMilestones)
      ? context.communityMilestones
      : [],
  };
}

export function safeGetWorldEventContext(state, adventures = [], now = new Date()) {
  try {
    return normalizeWorldEventContext(getWorldEventContext(state, adventures, now), now);
  } catch (error) {
    console.warn('[WorldEvents] Context evaluation failed; continuing without active event.', error);
    return normalizeWorldEventContext(null, now);
  }
}

export function safeApplyWorldEventToAdventure(adventure, context) {
  if (!adventure) return adventure ?? null;
  try {
    const next = applyWorldEventToAdventure(adventure, context);
    return next || adventure;
  } catch (error) {
    console.warn('[WorldEvents] Adventure override failed; using base adventure.', error);
    return adventure;
  }
}

export function getForcedWorldEventId() {
  try {
    if (typeof window !== 'undefined') {
      return window.__QUESTORY_FORCE_EVENT__ || localStorage.getItem('questory_force_event') || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function setForcedWorldEventId(eventId) {
  try {
    if (typeof window !== 'undefined') {
      if (eventId) {
        localStorage.setItem('questory_force_event', eventId);
        window.__QUESTORY_FORCE_EVENT__ = eventId;
      } else {
        localStorage.removeItem('questory_force_event');
        delete window.__QUESTORY_FORCE_EVENT__;
      }
    }
  } catch {
    /* ignore */
  }
  invalidateWorldEventCache();
}

export function invalidateWorldEventCache() {
  _cache = null;
  _cacheKey = null;
}

function isFriday13th(date) {
  return date.getDay() === 5 && date.getDate() === 13;
}

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function isFirstWeekendOfMonth(date) {
  if (!isWeekend(date)) return false;
  return date.getDate() <= 7;
}

function isLastWeekendOfMonth(date) {
  if (!isWeekend(date)) return false;
  const nextWeek = new Date(date);
  nextWeek.setDate(date.getDate() + 7);
  return nextWeek.getMonth() !== date.getMonth();
}

function isFullMoonDay(date) {
  return date.getDate() % 29 === 15;
}

function inAnnualWindow(date, schedule) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const { startMonth, startDay, endMonth, endDay } = schedule;
  if (startMonth <= endMonth) {
    if (m < startMonth || m > endMonth) return false;
    if (m === startMonth && d < startDay) return false;
    if (m === endMonth && d > endDay) return false;
    return true;
  }
  // wraps year (e.g. Dec–Jan)
  if (m > startMonth || (m === startMonth && d >= startDay)) return true;
  if (m < endMonth || (m === endMonth && d <= endDay)) return true;
  return false;
}

function matchesSchedule(event, date) {
  const s = event.schedule;
  if (!s) return false;
  switch (s.kind) {
    case 'annual':
      return inAnnualWindow(date, s);
    case 'friday_13th':
      return isFriday13th(date);
    case 'weekend':
      return isWeekend(date);
    case 'first_weekend_of_month':
      return isFirstWeekendOfMonth(date);
    case 'last_weekend_of_month':
      return isLastWeekendOfMonth(date);
    case 'full_moon':
      return isFullMoonDay(date);
    case 'interval_days': {
      const epoch = new Date(date.getFullYear(), 0, s.anchor || 1);
      const diff = Math.floor((date - epoch) / 86400000);
      return diff % s.interval === 0;
    }
    default:
      return false;
  }
}

export function evaluateActiveWorldEvents(now = new Date()) {
  const forced = getForcedWorldEventId();
  if (forced) {
    const match = WORLD_EVENTS.find((e) => e.id === forced);
    if (match) return [match];
  }

  return WORLD_EVENTS.filter((e) => matchesSchedule(e, now)).sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );
}

export function getUpcomingWorldEvents(now = new Date(), withinDays = 14) {
  const upcoming = [];
  for (let i = 1; i <= withinDays; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const events = evaluateActiveWorldEvents(d);
    for (const event of events) {
      if (!upcoming.find((u) => u.id === event.id)) {
        upcoming.push({ ...event, startsInDays: i });
      }
    }
  }
  return upcoming.slice(0, 5);
}

function mergeModifiers(events) {
  const merged = {
    weather: null,
    atmosphere: null,
    particles: [],
    coinMultiplier: 1,
    coinBonus: 0,
    ghostFrequencyBoost: 0,
    darkerAtmosphere: false,
    goldenHour: false,
    revealHiddenRelics: false,
    audioMoodOverride: null,
  };

  for (const event of events) {
    const m = event.modifiers || {};
    if (m.weather) merged.weather = m.weather;
    if (m.atmosphere) merged.atmosphere = m.atmosphere;
    if (m.particles) merged.particles = [...new Set([...merged.particles, ...m.particles])];
    if (m.coinMultiplier) merged.coinMultiplier *= m.coinMultiplier;
    if (m.coinBonus) merged.coinBonus += m.coinBonus;
    if (m.ghostFrequencyBoost) merged.ghostFrequencyBoost += m.ghostFrequencyBoost;
    if (m.darkerAtmosphere) merged.darkerAtmosphere = true;
    if (m.goldenHour) merged.goldenHour = true;
    if (m.revealHiddenRelics) merged.revealHiddenRelics = true;
    if (m.audioMoodOverride) {
      merged.audioMoodOverride = { ...(merged.audioMoodOverride || {}), ...m.audioMoodOverride };
    }
  }

  return merged;
}

function eventEndDate(event, now = new Date()) {
  const s = event.schedule;
  if (!s || s.kind !== 'annual') {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    if (s?.kind === 'weekend' || s?.kind === 'first_weekend_of_month' || s?.kind === 'last_weekend_of_month') {
      const day = end.getDay();
      end.setDate(end.getDate() + (day === 0 ? 0 : 7 - day));
    } else {
      end.setDate(end.getDate() + 1);
    }
    return end;
  }
  const year = now.getFullYear();
  let endMonth = s.endMonth;
  let endDay = s.endDay;
  let endYear = year;
  if (s.startMonth > s.endMonth && now.getMonth() + 1 >= s.startMonth) {
    endYear = year + 1;
  }
  return new Date(endYear, endMonth - 1, endDay, 23, 59, 59);
}

export function formatEventCountdown(endDate, now = new Date()) {
  const ms = Math.max(0, endDate - now);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(ms / 60000);
  return `${mins}m left`;
}

export function getEffectiveWeather(state, baseWeather, context) {
  const world = state?.world || {};
  if (world.weatherOverride) return world.weatherOverride;
  if (context?.modifiers?.weather) return context.modifiers.weather;
  return baseWeather;
}

export function adventureSupportsEvent(adventure, event) {
  if (!adventure || !event) return false;
  const tags = adventure.experienceSettings?.eventSupport || adventure.eventSupport || [];
  if (tags.some((t) => (event.creatorSupportTags || []).includes(t))) return true;
  if (event.participatingAdventureIds?.includes(adventure.id)) return true;
  const worldTags = adventure.worldConfig?.worldEventTags || [];
  if (event.participatingTags?.some((t) => worldTags.includes(t))) return true;
  if (event.participatingTags?.includes(adventure.adventureTemplate)) return true;
  return false;
}

export function getParticipatingAdventures(adventures, context) {
  const active = context?.activeEvents || [];
  if (!active.length) return [];
  return (adventures || []).filter((a) => active.some((e) => adventureSupportsEvent(a, e)));
}

export function applyWorldEventToAdventure(adventure, context) {
  if (!adventure) return adventure ?? null;
  const activeEvents = Array.isArray(context?.activeEvents) ? context.activeEvents : [];
  if (!activeEvents.length) return adventure;

  const applicable = activeEvents.filter((e) => adventureSupportsEvent(adventure, e));
  if (!applicable.length) return adventure;

  let next = { ...adventure };
  const overrides = {};
  let eventFinaleOverlay = null;
  let eventBadgeId = null;
  let eventAudioMood = null;
  const eventModifiers =
    context?.modifiers && typeof context.modifiers === 'object' ? context.modifiers : {};

  for (const event of applicable) {
    const advOverride = event.adventureOverrides?.[adventure.id];
    if (advOverride) {
      Object.assign(overrides, advOverride);
      if (advOverride.finaleOverlayText) eventFinaleOverlay = advOverride.finaleOverlayText;
      if (advOverride.badgeId) eventBadgeId = advOverride.badgeId;
      if (advOverride.audioMood) eventAudioMood = advOverride.audioMood;
    }
  }

  if (overrides.titleSuffix && !next.title.includes(overrides.titleSuffix)) {
    next.title = `${next.title}${overrides.titleSuffix}`;
  }

  if (eventFinaleOverlay) {
    const arFinale = next.arFinale || {};
    next.arFinale = {
      ...arFinale,
      enabled: true,
      overlayText: eventFinaleOverlay,
      revealText: overrides.alternateEndingTitle || arFinale.revealText,
    };
  }

  next._worldEvent = {
    eventIds: applicable.map((e) => e.id),
    primaryEventId: applicable[0].id,
    primaryEventTitle: applicable[0].title,
    primaryEventIcon: applicable[0].icon,
    badgeId: eventBadgeId,
    audioMood: eventAudioMood || eventModifiers.audioMoodOverride || null,
    modifiers: eventModifiers,
    overrides,
  };

  return next;
}

export function resolveEventNpcDialogue(npc, dialogue, context) {
  if (!npc || !dialogue || !context?.activeEvents?.length) return dialogue;

  for (const event of context.activeEvents) {
    const schedule = event.npcSchedules?.[npc.id];
    if (schedule?.[dialogue.id]) {
      return {
        ...dialogue,
        text: schedule[dialogue.id],
        mood: event.modifiers?.darkerAtmosphere ? 'warning' : dialogue.mood,
        _eventId: event.id,
      };
    }
  }
  return dialogue;
}

export function getCommunityMilestones(state) {
  const seen = state?.world?.communityMilestonesSeen || [];
  return COMMUNITY_MILESTONES.map((m) => ({
    ...m,
    reached: m.current >= m.threshold,
    seen: seen.includes(m.id),
  }));
}

export function getPendingWorldNotifications(state, context) {
  const seen = state?.world?.worldNotificationsSeen || [];
  const notes = [];

  for (const event of context?.activeEvents || []) {
    const noteId = `event-start-${event.id}`;
    if (!seen.includes(noteId)) {
      notes.push({
        id: noteId,
        type: 'event_start',
        title: `${event.icon} ${event.title} is live`,
        body: event.banner,
        icon: event.icon,
      });
    }
  }

  for (const event of context?.endingSoon || []) {
    const noteId = `event-ending-${event.id}`;
    if (!seen.includes(noteId)) {
      notes.push({
        id: noteId,
        type: 'event_ending',
        title: `${event.icon} ${event.title} ending soon`,
        body: formatEventCountdown(event.endDate, context.now),
        icon: '⏳',
      });
    }
  }

  for (const relic of context?.limitedRelicsAvailable || []) {
    const noteId = `relic-${relic.id}`;
    if (!seen.includes(noteId)) {
      notes.push({
        id: noteId,
        type: 'relic',
        title: `${relic.icon} ${relic.name} appeared`,
        body: relic.desc,
        icon: relic.icon,
      });
    }
  }

  return notes;
}

export function markWorldNotificationSeen(state, noteId) {
  const world = state?.world || {};
  const seen = world.worldNotificationsSeen || [];
  if (seen.includes(noteId)) return state;
  return {
    ...state,
    world: {
      ...world,
      worldNotificationsSeen: [...seen, noteId],
    },
  };
}

export function getLimitedRelicsForContext(context, state) {
  const earned = Array.isArray(state?.world?.eventRelicsEarned) ? state.world.eventRelicsEarned : [];
  const relics = [];
  const activeEvents = Array.isArray(context?.activeEvents) ? context.activeEvents : [];
  for (const event of activeEvents) {
    const exclusiveRelics = Array.isArray(event.exclusiveRelics) ? event.exclusiveRelics : [];
    for (const relicId of exclusiveRelics) {
      const relic = LIMITED_EVENT_RELICS[relicId];
      if (relic && !earned.includes(relicId)) relics.push(relic);
    }
  }
  return relics;
}

export function recordWorldEventVictory(state, adventure, context) {
  const activeEvents = Array.isArray(context?.activeEvents) ? context.activeEvents : [];
  if (!activeEvents.length || !adventure) return state;

  let next = state;
  const world = { ...(next.world || {}) };
  const completions = { ...(world.eventCompletions || {}) };
  const relics = Array.isArray(world.eventRelicsEarned) ? [...world.eventRelicsEarned] : [];
  const badges = Array.isArray(world.limitedBadgesEarned) ? [...world.limitedBadgesEarned] : [];

  for (const event of activeEvents) {
    if (!adventureSupportsEvent(adventure, event)) continue;

    const key = `${event.id}-${new Date().getFullYear()}`;
    completions[key] = {
      adventureId: adventure.id,
      completedAt: new Date().toISOString(),
      eventTitle: event.title,
    };

    const exclusiveRelics = Array.isArray(event.exclusiveRelics) ? event.exclusiveRelics : [];
    for (const relicId of exclusiveRelics) {
      if (!relics.includes(relicId)) relics.push(relicId);
    }

    const badgeId = event.bonusRewards?.badgeId || adventure._worldEvent?.badgeId;
    if (badgeId && !badges.includes(badgeId)) badges.push(badgeId);
  }

  next = {
    ...next,
    world: {
      ...world,
      eventCompletions: completions,
      eventRelicsEarned: relics,
      limitedBadgesEarned: badges,
    },
  };

  return next;
}

export function getEventCoinMultiplier(context) {
  return context?.modifiers?.coinMultiplier || 1;
}

export function getEventCoinBonus(context) {
  return context?.modifiers?.coinBonus || 0;
}

export function getActiveEventDirectorHints(context) {
  const primary = context?.primaryEvent;
  if (!primary?.directorTheme) return null;
  return {
    eventId: primary.id,
    eventTitle: primary.title,
    ...primary.directorTheme,
  };
}

export function getFeaturedCreatorForEvent(context, adventures) {
  const participating = getParticipatingAdventures(adventures, context);
  const adv = participating[0];
  if (!adv?.creatorId) return null;
  return { adventureTitle: adv.title, creatorId: adv.creatorId };
}

export function getFeaturedSponsorForEvent(context, adventures) {
  const participating = getParticipatingAdventures(adventures, context).filter((a) => a.isSponsoredDrop);
  const adv = participating[0];
  if (!adv) return null;
  return { name: adv.sponsor || adv.sponsorInfo?.name, adventureTitle: adv.title };
}

export function getWorldEventContext(state, adventures = [], now = new Date()) {
  const dayKey = now.toISOString().slice(0, 10);
  const forced = getForcedWorldEventId() || 'none';
  const joined = Array.isArray(state?.world?.joinedEventIds)
    ? state.world.joinedEventIds.join(',')
    : '';
  const cacheKey = `${dayKey}|${forced}|${joined}`;

  if (_cache && _cacheKey === cacheKey) return _cache;

  const activeEvents = evaluateActiveWorldEvents(now);
  const modifiers = mergeModifiers(activeEvents);
  const primaryEvent = activeEvents[0] || null;

  const endingSoon = activeEvents
    .map((event) => ({
      ...event,
      endDate: eventEndDate(event, now),
      countdown: formatEventCountdown(eventEndDate(event, now), now),
    }))
    .filter((e) => e.endDate - now < 3 * 86400000);

  const context = normalizeWorldEventContext(
    {
      now,
      activeEvents,
      primaryEvent,
      modifiers,
      endingSoon,
      upcoming: getUpcomingWorldEvents(now),
      coinMultiplier: modifiers.coinMultiplier,
      coinBonus: modifiers.coinBonus,
      limitedRelicsAvailable: [],
      notifications: [],
      communityMilestones: [],
      featuredCreator: null,
      featuredSponsor: null,
      participatingCount: getParticipatingAdventures(adventures, { activeEvents }).length,
    },
    now
  );

  context.limitedRelicsAvailable = getLimitedRelicsForContext(context, state);
  context.communityMilestones = getCommunityMilestones(state);
  context.notifications = getPendingWorldNotifications(state, context);
  context.featuredCreator = getFeaturedCreatorForEvent(context, adventures);
  context.featuredSponsor = getFeaturedSponsorForEvent(context, adventures);

  _cache = context;
  _cacheKey = cacheKey;
  return context;
}

export function initWorldEventEngine(adventures = [], state = null) {
  return safeGetWorldEventContext(state, adventures);
}

export const WORLD_EVENT_ENGINE = {
  version: '1.0',
  label: 'Dynamic World Events',
};
