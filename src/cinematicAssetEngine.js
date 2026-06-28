/**
 * Sweep 15.1 — Cinematic Asset Engine
 * Applies catalog entities to AR scenes with timeline choreography presets.
 */
import { normalizeArScene, AR_SCENE_TYPES, AR_ATMOSPHERES } from './arEngine';
import { findLibraryAsset, insertAssetIntoScene } from './mediaStudio';
import { libraryAssetForInsert } from './horrorAssets/catalog';
import { buildDefaultHorrorTimeline, isGhostAssetId } from './horrorTimelineDefaults';
import { TIMELINE_ACTIONS, normalizeTimeline } from './timelineEngine';
import { matchCinematicEntities, getCinematicEntity } from './cinematicAssetCatalog';
import { resolveParticleLayers } from './particleFxEngine';

const IDLE_TO_ACTION = {
  float: TIMELINE_ACTIONS.FLOAT,
  drift: TIMELINE_ACTIONS.DRIFT,
  breathe: TIMELINE_ACTIONS.BREATHE,
  blink: TIMELINE_ACTIONS.BLINK,
  pulse: TIMELINE_ACTIONS.PULSE,
  approach: TIMELINE_ACTIONS.APPROACH,
  lookAtPlayer: TIMELINE_ACTIONS.LOOK_AT_PLAYER,
};

const ATMOSPHERE_MAP = {
  fog: AR_ATMOSPHERES.FOG,
  darkness: AR_ATMOSPHERES.DARKNESS,
  lantern: AR_ATMOSPHERES.LANTERN,
  static: AR_ATMOSPHERES.STATIC,
  flash: AR_ATMOSPHERES.FLASH,
};

function libraryAssetForEntity(entity) {
  const asset = findLibraryAsset(entity.libraryAssetId);
  return asset ? libraryAssetForInsert({ ...asset, source: 'library' }) : null;
}

function buildTimelineForEntity(entity, scene) {
  const preset = entity.preset || {};
  const isGhost =
    entity.sceneType === 'ghost' || isGhostAssetId(entity.libraryAssetId);
  const idleAction = IDLE_TO_ACTION[preset.idleAnimation] || TIMELINE_ACTIONS.FLOAT;

  const { timeline, durationSeconds } = buildDefaultHorrorTimeline({
    durationSeconds: scene.durationSeconds || 8,
    overlayText: scene.overlayText,
    sceneType: entity.sceneType || scene.sceneType,
    atmosphere: preset.atmosphere || scene.atmosphere,
    jumpScare: scene.jumpScare,
    isGhost,
    hasAsset: true,
    position: preset.position || (isGhost ? 'bottom-left' : 'center'),
    silhouette: preset.silhouette ?? scene.silhouette,
  });

  const withIdle = [
    ...timeline,
    { time: 3, action: idleAction, duration: 2.5 },
  ];

  if (preset.entrance === 'approach') {
    withIdle.push({ time: 1.8, action: TIMELINE_ACTIONS.APPROACH, duration: 1.2 });
  }

  return {
    timeline: normalizeTimeline(withIdle),
    durationSeconds,
  };
}

export function applyCinematicEntityToScene(scene, entityId) {
  const entity = getCinematicEntity(entityId);
  if (!entity) return normalizeArScene(scene);

  const asset = libraryAssetForEntity(entity);
  let next = normalizeArScene(scene || { enabled: true });
  if (asset) {
    next = insertAssetIntoScene(next, asset);
  }

  const atmosphere = entity.preset?.atmosphere
    ? ATMOSPHERE_MAP[entity.preset.atmosphere] || next.atmosphere
    : next.atmosphere;

  const particleLayers = resolveParticleLayers(entity, next.particleLayers);

  next = normalizeArScene({
    ...next,
    enabled: true,
    title: next.title || entity.label,
    description: next.description || entity.desc,
    sceneType: entity.sceneType || next.sceneType || AR_SCENE_TYPES.GHOST,
    silhouette: entity.preset?.silhouette ?? next.silhouette,
    atmosphere,
    cinematicEntityId: entity.id,
    cinematicEntityLabel: entity.label,
    particleLayers,
    safeForKids: Boolean(entity.safeForKids),
  });

  const { timeline, durationSeconds } = buildTimelineForEntity(entity, next);
  return normalizeArScene({
    ...next,
    timeline,
    durationSeconds: Math.max(next.durationSeconds || 0, durationSeconds),
  });
}

export function enhanceSceneWithCinematicAssets(scene, prompt) {
  const matches = matchCinematicEntities(prompt, 2);
  if (!matches.length) {
    return { scene: normalizeArScene(scene), matched: [] };
  }

  let next = normalizeArScene(scene || { enabled: true });
  const primary = matches[0];

  if (!next.assetUrl && !next.mediaAssetId) {
    next = applyCinematicEntityToScene(next, primary.id);
  } else if (primary.id && !next.cinematicEntityId) {
    next = normalizeArScene({
      ...next,
      cinematicEntityId: primary.id,
      cinematicEntityLabel: primary.label,
      title: next.title || primary.label,
    });
  }

  return {
    scene: next,
    matched: matches.map((m) => ({
      id: m.id,
      label: m.label,
      matchedKeyword: m.matchedKeyword,
    })),
  };
}

export function autoPickEntitiesForPrompt(prompt, count = 2) {
  return matchCinematicEntities(prompt, count);
}

export function cinematicEntityAsMediaAsset(entityId) {
  const entity = getCinematicEntity(entityId);
  if (!entity) return null;
  const library = findLibraryAsset(entity.libraryAssetId);
  if (!library) return null;
  return libraryAssetForInsert({
    ...library,
    title: entity.label,
    cinematicEntityId: entity.id,
    desc: entity.desc,
    source: 'library',
  });
}

export function summarizeCinematicMatch(matched) {
  if (!matched?.length) return null;
  return matched.map((m) => m.label).join(' · ');
}
