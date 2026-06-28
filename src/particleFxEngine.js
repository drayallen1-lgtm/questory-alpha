/**
 * Sweep 15.2 — Particle & lighting layer presets for cinematic entities.
 */

export const PARTICLE_LAYER_TYPES = {
  GLOW: 'glow',
  FOG: 'fog',
  SPARKS: 'sparks',
  EMBERS: 'embers',
  SHADOW_AURA: 'shadow_aura',
};

const LAYER_LABELS = {
  glow: 'Glow',
  fog: 'Fog',
  sparks: 'Sparks',
  embers: 'Embers',
  shadow_aura: 'Shadow Aura',
};

const VALID_LAYERS = new Set(Object.values(PARTICLE_LAYER_TYPES));

/** Default particle stacks per cinematic entity id */
export const ENTITY_PARTICLE_PRESETS = {
  ghost_bride: ['glow', 'fog'],
  shadow_child: ['shadow_aura', 'fog'],
  hooded_watcher: ['shadow_aura', 'fog'],
  plague_doctor: ['shadow_aura', 'fog', 'embers'],
  shadow_figure: ['shadow_aura'],
  forest_spirit: ['glow', 'fog', 'embers'],
  floating_lantern: ['glow', 'embers'],
  cursed_doll: ['shadow_aura'],
  diary_page: ['glow'],
  dead_tree: ['fog', 'shadow_aura'],
  abandoned_swing: ['fog'],
  glowing_relic: ['glow', 'sparks'],
  crystal_shard: ['glow', 'sparks'],
  treasure_chest: ['glow', 'embers'],
  ancient_portal: ['glow', 'sparks', 'fog'],
  skeleton_knight: ['shadow_aura', 'fog'],
  pirate_captain: ['fog', 'shadow_aura'],
  friendly_dragon: ['glow', 'sparks'],
  wise_owl: ['glow'],
  magic_book: ['glow', 'sparks'],
  star_compass: ['glow', 'sparks'],
  garden_fairy: ['glow', 'fog', 'sparks'],
  history_scroll: ['glow'],
};

export function normalizeParticleLayers(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((layer) => VALID_LAYERS.has(layer));
}

export function resolveParticleLayers(entityOrId, sceneLayers) {
  const fromScene = normalizeParticleLayers(sceneLayers);
  if (fromScene.length) return fromScene;

  const entityId = typeof entityOrId === 'string' ? entityOrId : entityOrId?.id;
  if (entityId && ENTITY_PARTICLE_PRESETS[entityId]) {
    return [...ENTITY_PARTICLE_PRESETS[entityId]];
  }

  const presetLayers = normalizeParticleLayers(entityOrId?.preset?.particleLayers);
  if (presetLayers.length) return presetLayers;

  return [];
}

export function particleLayerLabel(layerId) {
  return LAYER_LABELS[layerId] || layerId;
}

export function buildParticleLayerClassList(layers) {
  return normalizeParticleLayers(layers).map((layer) => `particle-layer-${layer.replace(/_/g, '-')}`);
}
