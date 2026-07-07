/**
 * Questory V2 — Living City
 * City personalities and real-time pulse lines composed from existing engines.
 */
import { getLivingWorldSnapshot } from './livingWorldEngine';
import { getMarketplaceSnapshot } from './marketplaceEngine';
import { getFactionSnapshot } from './factionEngine';
import { getWorldDiscoverySnapshot, DISCOVERY_LEVELS } from './worldDiscoveryEngine';
import { getLivingEarthSnapshot } from './livingEarthEngine';
import { getLegendaryHuntSnapshot } from './legendaryHuntEngine';
import { generateDirectorRecommendations } from './questoryAiDirectorEngine';
import { getCreatorEconomySnapshot } from './creatorEconomyEngine';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const CITY_PERSONALITIES = {
  'parsons-ks': {
    id: 'parsons-ks',
    name: 'Parsons',
    tagline: 'Railroad mystique · haunted depots · merchant revival',
    mood: 'historic-haunt',
    explorerBase: 142,
    landmarks: ['Union Depot', 'Downtown Parsons', 'Lake Parsons'],
    merchantDistrict: 'Downtown',
    ghostTone: 'Ghost activity increasing',
  },
  'parsons-neighborhood': {
    id: 'parsons-neighborhood',
    name: 'Downtown Parsons',
    parentId: 'parsons-ks',
    tagline: 'Merchants awake · explorers on every corner',
    mood: 'bustling-downtown',
    explorerBase: 86,
    landmarks: ['Union Depot', 'Main Street Roasters'],
    merchantDistrict: 'Downtown',
    ghostTone: 'Lantern whispers in the alleys',
  },
};

const DEFAULT_PERSONALITY = CITY_PERSONALITIES['parsons-ks'];

export function resolveCityPersonality(regionId = 'parsons-ks') {
  return CITY_PERSONALITIES[regionId] || DEFAULT_PERSONALITY;
}

export function isLivingCityVisible(zoom = 11, layerSnapshot = null) {
  if (layerSnapshot?.globalLevel) return false;
  if ((layerSnapshot?.layers?.earth?.opacity ?? 0) > 0.55) return false;
  if (layerSnapshot?.streetLevel) return true;
  return zoom >= 8.5 && zoom <= 14.5;
}

function stableHash(input = '') {
  return String(input)
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

export function computeCityExplorerCount(personality, livingWorld = {}, now = Date.now()) {
  const base = personality.explorerBase ?? 120;
  const nearby = livingWorld.presence?.explorersNearby ?? livingWorld.explorerDots?.length ?? 0;
  const hour = new Date(now).getHours();
  const diurnal = hour >= 17 || hour <= 6 ? 12 : 6;
  return base + nearby + diurnal;
}

export function minutesUntilGuildWar(territoryId = 'downtown', now = Date.now()) {
  const slot = Math.floor(now / (15 * 60 * 1000));
  const hash = stableHash(`${territoryId}-${slot}`);
  return 5 + (hash % 37);
}

function countHorrorAdventures(adventures = []) {
  return adventures.filter(
    (a) =>
      a.adventureTemplate === 'horror' ||
      a.toolkit === 'horror' ||
      (a.eventSupport || []).includes('horror')
  ).length;
}

function findSponsorPromotion(adventures = [], cityName = 'Parsons') {
  return adventures.find((a) => {
    const loc = `${a.city || ''} ${a.location || ''}`.toLowerCase();
    const hasSponsor = Boolean(a.sponsor || a.sponsorInfo?.name);
    return hasSponsor && (loc.includes(cityName.toLowerCase()) || loc.includes('parsons'));
  });
}

function formatDirectorVisit(rec, personality) {
  const landmark =
    rec?.territoryId === 'union-depot'
      ? 'Union Depot'
      : personality.landmarks?.[0] || 'the historic district';
  if (rec?.title?.toLowerCase().includes('discovery')) {
    return `Visit ${landmark}`;
  }
  if (rec?.type === 'faction' && rec.territoryId) {
    const name = rec.territoryId.replace(/-/g, ' ');
    return `Visit ${name.replace(/\b\w/g, (c) => c.toUpperCase())}`;
  }
  return `Visit ${landmark}`;
}

export function buildCityPulseLines(options = {}) {
  const {
    personality,
    livingWorld = {},
    marketplace = {},
    faction = {},
    worldDiscovery = {},
    earth = {},
    legendaryHunt = {},
    adventures = [],
    recommendations = [],
    now = Date.now(),
  } = options;

  const pulses = [];
  const explorerCount = computeCityExplorerCount(personality, livingWorld, now);
  pulses.push({
    id: 'explorers',
    icon: '👣',
    text: `${explorerCount} explorers nearby`,
    tone: 'active',
    priority: 90,
  });

  const horrorCount = countHorrorAdventures(adventures);
  const ghostRising =
    livingWorld.nightMode ||
    legendaryHunt.hasActiveBoss ||
    horrorCount >= 2 ||
    (livingWorld.eventContext?.tags || []).includes('horror');
  if (ghostRising) {
    pulses.push({
      id: 'ghost',
      icon: '👻',
      text: personality.ghostTone || 'Ghost activity increasing',
      tone: 'mystery',
      priority: 82,
    });
  }

  const merchantActive =
    (marketplace.listings?.length || 0) > 0 ||
    (marketplace.activityFeed?.length || 0) > 0 ||
    (marketplace.venues?.length || 0) > 0;
  if (merchantActive) {
    pulses.push({
      id: 'merchants',
      icon: '🏪',
      text: `${personality.merchantDistrict || 'Downtown'} merchants active`,
      tone: 'commerce',
      priority: 74,
    });
  }

  const topRec = recommendations[0];
  if (topRec) {
    pulses.push({
      id: 'director',
      icon: '🎬',
      text: `AI Director recommends: ${formatDirectorVisit(topRec, personality)}`,
      tone: 'director',
      priority: 88,
      action: 'director',
    });
  }

  const war = faction.wars?.[0];
  if (war) {
    const mins = minutesUntilGuildWar(war.territoryId, now);
    pulses.push({
      id: 'guild-war',
      icon: '⚔',
      text: `Guild War begins in ${mins} minute${mins === 1 ? '' : 's'}`,
      tone: 'war',
      priority: 86,
      action: 'guild',
    });
  }

  const earthDelta =
    worldDiscovery.currentRegion?.todayDelta ??
    worldDiscovery.animatedDelta ??
    earth.worldDiscovery?.animatedDelta;
  if (typeof earthDelta === 'number' && earthDelta > 0) {
    pulses.push({
      id: 'earth',
      icon: '🌍',
      text: `Earth progress +${earthDelta.toFixed(2)}%`,
      tone: 'earth',
      priority: 60,
    });
  } else {
    pulses.push({
      id: 'earth',
      icon: '🌍',
      text: 'Earth progress +0.03%',
      tone: 'earth',
      priority: 55,
    });
  }

  const creator = getCreatorEconomySnapshot(options.state, adventures, { now: options.now });
  const liveCreator =
    creator.trendingCreators?.[0] ||
    creator.creators?.find((c) => (c.totalPlays || 0) > 20);
  if (liveCreator) {
    pulses.push({
      id: 'creator',
      icon: '✨',
      text: 'Creator Challenge Live',
      tone: 'creator',
      priority: 70,
      action: 'create',
    });
  }

  const sponsorAdventure = findSponsorPromotion(adventures, personality.name);
  if (sponsorAdventure) {
    const sponsorName =
      sponsorAdventure.sponsorInfo?.name ||
      (typeof sponsorAdventure.sponsor === 'string' ? sponsorAdventure.sponsor : 'A sponsor');
    pulses.push({
      id: 'sponsor',
      icon: '📣',
      text: `${sponsorName} promotion nearby`,
      tone: 'sponsor',
      priority: 68,
      action: 'sponsor',
    });
  } else {
    pulses.push({
      id: 'sponsor',
      icon: '📣',
      text: 'Sponsor promotion nearby',
      tone: 'sponsor',
      priority: 50,
      action: 'sponsor',
    });
  }

  return pulses.sort((a, b) => b.priority - a.priority);
}

/**
 * @param {object} options
 */
export function getLivingCitySnapshot(options = {}) {
  const {
    state = null,
    adventures = [],
    zoom = 11,
    now = Date.now(),
    layerSnapshot = null,
    worldDiscovery: worldDiscoveryIn = null,
    livingWorld: livingWorldIn = null,
  } = options;

  const worldDiscovery =
    worldDiscoveryIn ||
    getWorldDiscoverySnapshot({ zoom, state, adventures, now });
  const livingWorld =
    livingWorldIn || getLivingWorldSnapshot(adventures, { state, now });
  const marketplace = getMarketplaceSnapshot(state, adventures, { now });
  const faction = getFactionSnapshot(state, adventures, { now });
  const earth = getLivingEarthSnapshot({
    zoom,
    state,
    adventures,
    now,
    worldDiscovery,
  });
  const legendaryHunt = getLegendaryHuntSnapshot(state, adventures, { now });
  const recommendations = generateDirectorRecommendations(state, adventures, now);

  const regionId =
    worldDiscovery.currentRegion?.id ||
    (worldDiscovery.level === DISCOVERY_LEVELS.NEIGHBORHOOD
      ? 'parsons-neighborhood'
      : 'parsons-ks');
  const personality = resolveCityPersonality(regionId);
  const visible = isLivingCityVisible(zoom, layerSnapshot);
  const pulses = buildCityPulseLines({
    personality,
    livingWorld,
    marketplace,
    faction,
    worldDiscovery,
    earth,
    legendaryHunt,
    adventures,
    recommendations,
    state,
    now,
  });

  return wrapEngineSnapshot({
    visible,
    cityId: personality.id,
    cityName: worldDiscovery.currentRegion?.label || personality.name,
    tagline: personality.tagline,
    mood: personality.mood,
    personality,
    explorerCount: computeCityExplorerCount(personality, livingWorld, now),
    pulses: visible ? pulses : [],
    topPulse: pulses[0] || null,
    directorRecommendation: recommendations[0] || null,
    regionId,
    zoom,
  });
}
