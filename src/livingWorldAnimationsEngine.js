/**
 * Questory V2 — Living World Animations
 * Layer-aware ambient motion for the map-first living world.
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const WORLD_ANIMATION_IDS = {
  DISCOVERY_SPREAD: 'discoverySpread',
  FOG_DISSOLVE: 'fogDissolve',
  GUILD_PULSE: 'guildPulse',
  MARKET_SHIMMER: 'marketShimmer',
  TREASURE_GLOW: 'treasureGlow',
  EXPLORER_DRIFT: 'explorerDrift',
  EARTH_ROTATE: 'earthRotate',
  CLOUD_DRIFT: 'cloudDrift',
};

const ANIMATION_CLASS_NAMES = {
  [WORLD_ANIMATION_IDS.DISCOVERY_SPREAD]: 'world-anim-discovery-on',
  [WORLD_ANIMATION_IDS.FOG_DISSOLVE]: 'world-anim-fog-dissolve-on',
  [WORLD_ANIMATION_IDS.GUILD_PULSE]: 'world-anim-guild-pulse-on',
  [WORLD_ANIMATION_IDS.MARKET_SHIMMER]: 'world-anim-market-shimmer-on',
  [WORLD_ANIMATION_IDS.TREASURE_GLOW]: 'world-anim-treasure-glow-on',
  [WORLD_ANIMATION_IDS.EXPLORER_DRIFT]: 'world-anim-explorer-drift-on',
  [WORLD_ANIMATION_IDS.EARTH_ROTATE]: 'world-anim-earth-on',
  [WORLD_ANIMATION_IDS.CLOUD_DRIFT]: 'world-anim-clouds-on',
};

function hasContestedTerritories(faction = {}) {
  if ((faction.contestedCount || 0) > 0) return true;
  if ((faction.wars || []).length > 0) return true;
  return (faction.mapOverlays || []).some((overlay) => overlay.contested);
}

export function buildWorldAnimationClassName(animations = {}) {
  return Object.entries(ANIMATION_CLASS_NAMES)
    .filter(([id]) => animations[id])
    .map(([, className]) => className)
    .join(' ');
}

/**
 * @param {object} options
 * @param {object} [options.layerSnapshot]
 * @param {object} [options.livingWorld]
 * @param {object} [options.worldDiscovery]
 * @param {object} [options.faction]
 * @param {object} [options.legendaryHunt]
 * @param {number} [options.marketplaceVenueCount]
 * @param {boolean} [options.earthOverlayVisible]
 * @param {boolean} [options.reducedMotion]
 */
export function getLivingWorldAnimationsSnapshot(options = {}) {
  const {
    layerSnapshot = null,
    livingWorld = {},
    worldDiscovery = {},
    faction = {},
    legendaryHunt = {},
    marketplaceVenueCount = 0,
    earthOverlayVisible = false,
    reducedMotion = false,
  } = options;

  const layers = layerSnapshot?.layers || {};
  const fogDecay = Number(livingWorld.fogDecayLevel ?? 0);
  const discoveryVisible = Boolean(layers.discovery?.visible);
  const explorerVisible = Boolean(layers.explorer?.visible);
  const guildVisible = Boolean(layers.guild?.visible);
  const marketVisible = Boolean(layers.marketplace?.visible);
  const earthVisible = Boolean(layers.earth?.visible || earthOverlayVisible);
  const cityProgress = worldDiscovery.currentRegion?.completionPercent ?? 0;
  const hasExplorers = (livingWorld.explorerDots?.length || 0) > 0;
  const hasLegendaryBoss = Boolean(legendaryHunt.hasActiveBoss);

  const animations = reducedMotion
    ? Object.fromEntries(Object.values(WORLD_ANIMATION_IDS).map((id) => [id, false]))
    : {
        [WORLD_ANIMATION_IDS.DISCOVERY_SPREAD]:
          discoveryVisible && (cityProgress > 0 || fogDecay > 0.05),
        [WORLD_ANIMATION_IDS.FOG_DISSOLVE]:
          discoveryVisible && fogDecay < 0.9 && (livingWorld.revealedCount || 0) >= 0,
        [WORLD_ANIMATION_IDS.GUILD_PULSE]: guildVisible && hasContestedTerritories(faction),
        [WORLD_ANIMATION_IDS.MARKET_SHIMMER]: marketVisible && marketplaceVenueCount > 0,
        [WORLD_ANIMATION_IDS.TREASURE_GLOW]: discoveryVisible && hasLegendaryBoss,
        [WORLD_ANIMATION_IDS.EXPLORER_DRIFT]: explorerVisible && hasExplorers,
        [WORLD_ANIMATION_IDS.EARTH_ROTATE]: earthVisible,
        [WORLD_ANIMATION_IDS.CLOUD_DRIFT]: earthVisible,
      };

  const activeCount = Object.values(animations).filter(Boolean).length;

  return wrapEngineSnapshot({
    animations,
    className: buildWorldAnimationClassName(animations),
    reducedMotion,
    activeCount,
    intensity: Math.min(1, activeCount / 5),
  });
}
