/**
 * Sweep 15.1–15.3 — Cinematic Asset Engine
 * Applies catalog entities to AR scenes with timeline choreography and tone-aware matching.
 */
import { normalizeArScene, AR_SCENE_TYPES, AR_ATMOSPHERES } from './arEngine';
import { findLibraryAsset, insertAssetIntoScene } from './mediaStudio';
import { libraryAssetForInsert } from './horrorAssets/catalog';
import { buildDefaultHorrorTimeline, isGhostAssetId } from './horrorTimelineDefaults';
import { TIMELINE_ACTIONS, normalizeTimeline } from './timelineEngine';
import {
  matchCinematicEntities,
  getCinematicEntity,
  isFamilySafeTone,
} from './cinematicAssetCatalog';
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

function appendEntityLifecycle(timeline, entity, scene, durationSeconds) {
  const preset = entity.preset || {};
  const beats = [...timeline];
  const dur = durationSeconds || scene.durationSeconds || 8;

  if (preset.reveal === 'glow' || entity.safeForKids) {
    beats.push({ time: Math.min(2.8, dur * 0.35), action: TIMELINE_ACTIONS.GLOW_BURST, duration: 1.4 });
  }

  if (preset.exit === 'attack' || (scene.jumpScare && !entity.safeForKids)) {
    beats.push({ time: Math.max(1, dur - 2.2), action: TIMELINE_ACTIONS.ATTACK, duration: 0.85 });
    beats.push({ time: Math.max(1.2, dur - 1.3), action: TIMELINE_ACTIONS.DISAPPEAR, duration: 0.7 });
  } else if (preset.exit === 'disappear') {
    beats.push({ time: Math.max(1, dur - 1.5), action: TIMELINE_ACTIONS.FADE_ENTITY_OUT, duration: 1 });
  }

  return beats;
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

  let withIdle = [
    ...timeline,
    { time: 3, action: idleAction, duration: 2.5 },
  ];

  if (preset.entrance === 'approach') {
    withIdle.push({ time: 1.8, action: TIMELINE_ACTIONS.APPROACH, duration: 1.2 });
  }

  withIdle = appendEntityLifecycle(withIdle, entity, scene, durationSeconds);

  return {
    timeline: normalizeTimeline(withIdle),
    durationSeconds,
  };
}

export function resolveCinematicToneOptions(directorMeta = {}) {
  const tone = directorMeta.tone || directorMeta.atmosphere;
  const safeForKids =
    Boolean(directorMeta.safeForKids) ||
    isFamilySafeTone(tone) ||
    ['family_fun', 'educational', 'church'].includes(directorMeta.template);
  return { tone, safeForKids };
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

export function enhanceSceneWithCinematicAssets(scene, prompt, toneOptions = {}) {
  const matches = matchCinematicEntities(prompt, 2, toneOptions);
  if (!matches.length) {
    return { scene: normalizeArScene(scene), matched: [] };
  }

  let next = normalizeArScene(scene || { enabled: true });
  const primary = matches[0];

  if (!next.assetUrl && !next.mediaAssetId) {
    next = applyCinematicEntityToScene(next, primary.id);
  } else if (primary.id && !next.cinematicEntityId) {
    const entity = getCinematicEntity(primary.id);
    next = normalizeArScene({
      ...next,
      cinematicEntityId: primary.id,
      cinematicEntityLabel: primary.label,
      title: next.title || primary.label,
      particleLayers: resolveParticleLayers(entity, next.particleLayers),
      safeForKids: Boolean(entity?.safeForKids || toneOptions.safeForKids),
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

export function autoPickEntitiesForPrompt(prompt, count = 2, toneOptions = {}) {
  return matchCinematicEntities(prompt, count, toneOptions);
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

export function summarizeClueCinematicEntities(clues = []) {
  const labels = clues
    .map((c) => c.arScene?.cinematicEntityLabel || c.arScene?.title)
    .filter(Boolean);
  return [...new Set(labels)];
}
