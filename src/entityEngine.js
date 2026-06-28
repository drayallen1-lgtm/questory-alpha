/** Screen anchor positions for cinematic entities (Sweep 10.2) */
export const SPATIAL_POSITIONS = {
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  CENTER: 'center',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
  FAR: 'far',
  CLOSE: 'close',
  BEHIND: 'behind',
};

export const ENTITY_ANIMATIONS = {
  FLOAT: 'float',
  DRIFT: 'drift',
  BREATHE: 'breathe',
  BLINK: 'blink',
  ROTATE: 'rotate',
  PULSE: 'pulse',
  LOOK_AT_PLAYER: 'lookAtPlayer',
  ATTACK: 'attack',
  GLOW_BURST: 'glowBurst',
};

const SHOW_ACTIONS = new Set(['showGhost', 'showAsset', 'appear']);
const HIDE_ACTIONS = new Set(['hideAsset', 'disappear']);

const PERSISTENT_ANIM_ACTIONS = new Set([
  ENTITY_ANIMATIONS.FLOAT,
  ENTITY_ANIMATIONS.DRIFT,
  ENTITY_ANIMATIONS.BREATHE,
  ENTITY_ANIMATIONS.BLINK,
  ENTITY_ANIMATIONS.ROTATE,
  ENTITY_ANIMATIONS.PULSE,
  ENTITY_ANIMATIONS.LOOK_AT_PLAYER,
  'float',
  'drift',
  'breathe',
  'blink',
  'rotate',
  'pulse',
  'lookAtPlayer',
  ENTITY_ANIMATIONS.ATTACK,
  ENTITY_ANIMATIONS.GLOW_BURST,
  'attack',
  'glowBurst',
]);

const POSITION_ALIASES = {
  'top left': SPATIAL_POSITIONS.TOP_LEFT,
  topleft: SPATIAL_POSITIONS.TOP_LEFT,
  'top-right': SPATIAL_POSITIONS.TOP_RIGHT,
  'bottom-left': SPATIAL_POSITIONS.BOTTOM_LEFT,
  'bottom-right': SPATIAL_POSITIONS.BOTTOM_RIGHT,
  middle: SPATIAL_POSITIONS.CENTER,
  distant: SPATIAL_POSITIONS.FAR,
  near: SPATIAL_POSITIONS.CLOSE,
  'behind-player': SPATIAL_POSITIONS.BEHIND,
};

const ANCHOR_PRESETS = {
  [SPATIAL_POSITIONS.TOP_LEFT]: { x: 14, y: 20, scale: 0.92 },
  [SPATIAL_POSITIONS.TOP_RIGHT]: { x: 86, y: 20, scale: 0.92 },
  [SPATIAL_POSITIONS.CENTER]: { x: 50, y: 46, scale: 1 },
  [SPATIAL_POSITIONS.BOTTOM_LEFT]: { x: 18, y: 68, scale: 1 },
  [SPATIAL_POSITIONS.BOTTOM_RIGHT]: { x: 82, y: 68, scale: 1 },
  [SPATIAL_POSITIONS.FAR]: { x: 50, y: 38, scale: 0.52 },
  [SPATIAL_POSITIONS.CLOSE]: { x: 50, y: 54, scale: 1.38 },
  [SPATIAL_POSITIONS.BEHIND]: { x: 50, y: 42, scale: 0.68, depthOpacity: 0.42 },
};

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function normalizePosition(raw) {
  if (!raw) return SPATIAL_POSITIONS.CENTER;
  const key = String(raw).trim().toLowerCase();
  return POSITION_ALIASES[key] || key;
}

export function resolveAnchor(position, depth) {
  const pos = normalizePosition(position);
  const preset = ANCHOR_PRESETS[pos] || ANCHOR_PRESETS[SPATIAL_POSITIONS.CENTER];
  let scale = preset.scale;
  if (depth === 'far') scale *= 0.82;
  if (depth === 'close') scale *= 1.18;
  return {
    x: preset.x,
    y: preset.y,
    scale,
    rotate: 0,
    depthOpacity: preset.depthOpacity ?? 1,
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function interpolateAnchors(from, to, t) {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    scale: lerp(from.scale, to.scale, t),
    rotate: lerp(from.rotate || 0, to.rotate || 0, t),
    depthOpacity: lerp(from.depthOpacity ?? 1, to.depthOpacity ?? 1, t),
  };
}

function animClassFor(action) {
  const map = {
    float: 'anim-float',
    drift: 'anim-drift',
    breathe: 'anim-breathe',
    blink: 'anim-blink',
    rotate: 'anim-rotate',
    pulse: 'anim-pulse',
    lookAtPlayer: 'anim-look-at-player',
    attack: 'anim-attack',
    glowBurst: 'anim-glow-burst',
  };
  return map[action] || '';
}

/**
 * Compute animated entity snapshot at elapsed playback time.
 */
export function computeEntityState(timeline, elapsed) {
  let visible = false;
  let position = SPATIAL_POSITIONS.CENTER;
  let depth = 'normal';
  let opacity = 1;
  const activeAnims = new Set();
  let anchorOverride = null;
  let fadeOutActive = false;

  const past = (timeline || []).filter((e) => e.time <= elapsed);

  for (const e of past) {
    if (SHOW_ACTIONS.has(e.action)) {
      visible = true;
      if (e.position) position = normalizePosition(e.position);
      if (e.to) position = normalizePosition(e.to);
      if (e.depth) depth = e.depth;
    }
    if (HIDE_ACTIONS.has(e.action)) {
      visible = false;
      activeAnims.clear();
    }
    if (PERSISTENT_ANIM_ACTIONS.has(e.action)) {
      activeAnims.add(e.action);
    }
    if (e.action === 'move' && e.to && elapsed >= e.time + (e.duration ?? 2)) {
      position = normalizePosition(e.to);
    }
    if (e.action === 'approach' && elapsed >= e.time + (e.duration ?? 2.5)) {
      position = normalizePosition(e.to || SPATIAL_POSITIONS.CLOSE);
    }
    if (e.action === 'retreat' && elapsed >= e.time + (e.duration ?? 2)) {
      position = normalizePosition(e.to || SPATIAL_POSITIONS.FAR);
    }
    if (e.action === 'teleport') {
      position = normalizePosition(e.to || e.position || position);
      anchorOverride = null;
    }
  }

  for (const e of timeline || []) {
    const dur = e.duration ?? 0.8;

    if (e.action === 'fadeEntityIn' || e.action === 'fadeInEntity') {
      const target = e.targetOpacity != null ? clamp01(e.targetOpacity) : 1;
      if (elapsed >= e.time && elapsed < e.time + dur) {
        visible = true;
        opacity = clamp01((elapsed - e.time) / dur) * target;
      } else if (elapsed >= e.time + dur) {
        visible = true;
        opacity = target;
      }
    }

    if (e.action === 'fadeEntityOut' || e.action === 'fadeOutEntity') {
      if (elapsed >= e.time && elapsed < e.time + dur) {
        visible = true;
        fadeOutActive = true;
        opacity = clamp01(1 - (elapsed - e.time) / dur);
      } else if (elapsed >= e.time + dur) {
        visible = false;
        opacity = 0;
      }
    }

    if (e.action === 'move') {
      const moveDur = e.duration ?? 2;
      if (elapsed >= e.time && elapsed <= e.time + moveDur) {
        const t = easeInOut(clamp01((elapsed - e.time) / moveDur));
        const from = resolveAnchor(e.from || position, depth);
        const to = resolveAnchor(e.to || position, depth);
        anchorOverride = interpolateAnchors(from, to, t);
        visible = true;
      }
    }

    if (e.action === 'approach') {
      const moveDur = e.duration ?? 2.5;
      if (elapsed >= e.time && elapsed <= e.time + moveDur) {
        const t = easeInOut(clamp01((elapsed - e.time) / moveDur));
        const from = resolveAnchor(e.from || position, depth);
        const to = resolveAnchor(e.to || SPATIAL_POSITIONS.CLOSE, 'close');
        anchorOverride = interpolateAnchors(from, to, t);
        visible = true;
      }
    }

    if (e.action === 'retreat') {
      const moveDur = e.duration ?? 2;
      if (elapsed >= e.time && elapsed <= e.time + moveDur) {
        const t = easeInOut(clamp01((elapsed - e.time) / moveDur));
        const from = resolveAnchor(e.from || position, depth);
        const to = resolveAnchor(e.to || SPATIAL_POSITIONS.FAR, 'far');
        anchorOverride = interpolateAnchors(from, to, t);
        visible = true;
      }
    }

    if (e.action === 'scale') {
      const scaleDur = e.duration ?? 1.5;
      if (elapsed >= e.time && elapsed <= e.time + scaleDur) {
        const t = easeInOut(clamp01((elapsed - e.time) / scaleDur));
        const fromScale = e.fromScale ?? 1;
        const toScale = e.toScale ?? e.scale ?? 1.2;
        const base = anchorOverride || resolveAnchor(position, depth);
        anchorOverride = { ...base, scale: lerp(fromScale, toScale, t) };
        visible = true;
      }
    }
  }

  const anchor = anchorOverride || resolveAnchor(position, depth);
  const finalOpacity = visible ? opacity * (anchor.depthOpacity ?? 1) : 0;
  const stateClasses = [
    visible && finalOpacity > 0.02 ? 'visible' : 'hidden',
    `pos-${normalizePosition(position).replace(/\s+/g, '-')}`,
  ];
  const animClasses = [...activeAnims].map(animClassFor).filter(Boolean);

  if (position === SPATIAL_POSITIONS.BEHIND) {
    stateClasses.push('entity-behind');
  }

  return {
    visible: visible && finalOpacity > 0.02,
    opacity: finalOpacity,
    position,
    depth,
    anchor,
    fadeOutActive,
    wrapClass: stateClasses.join(' '),
    innerClass: animClasses.join(' '),
    style: {
      left: `${anchor.x}%`,
      top: `${anchor.y}%`,
      transform: `translate(-50%, -50%) scale(${anchor.scale}) rotate(${anchor.rotate || 0}deg)`,
      opacity: finalOpacity,
    },
  };
}
