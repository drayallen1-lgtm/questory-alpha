import {
  computeEntityState,
  normalizePosition,
  SPATIAL_POSITIONS,
} from '../src/entityEngine.js';
import { legacySceneToTimeline } from '../src/timelineEngine.js';

const ghostTimeline = legacySceneToTimeline({
  durationSeconds: 8,
  sceneType: 'ghost',
  atmosphere: 'fog',
  overlayText: "Don't look back.",
  assetUrl: '/media/horror/images/little-girl.svg',
  assetType: 'image',
  jumpScare: true,
});

console.assert(
  ghostTimeline.some((e) => e.action === 'approach'),
  'ghost legacy timeline includes approach'
);
console.assert(
  ghostTimeline.some((e) => e.position === 'bottom-left'),
  'ghost spawns bottom-left'
);

const t2 = computeEntityState(ghostTimeline, 2.5);
console.assert(t2.visible, 'entity visible at 2.5s');
console.assert(t2.position === SPATIAL_POSITIONS.BOTTOM_LEFT, 'starts bottom-left');
console.assert(t2.innerClass.includes('anim-float'), 'float animation active');

const t5 = computeEntityState(ghostTimeline, 5.5);
console.assert(t5.visible, 'entity visible during approach');
console.assert(t5.anchor.scale > 0.9, 'approach increases scale');

const t0 = computeEntityState(ghostTimeline, 0.5);
console.assert(!t0.visible, 'entity hidden before show');

const moveTimeline = [
  { time: 0, action: 'appear', position: 'top-left' },
  { time: 1, action: 'move', from: 'top-left', to: 'bottom-right', duration: 2 },
];
const midMove = computeEntityState(moveTimeline, 2);
console.assert(midMove.visible, 'visible during move');
console.assert(midMove.anchor.x > 14 && midMove.anchor.x < 86, 'interpolated x during move');

const behind = computeEntityState(
  [{ time: 0, action: 'appear', position: 'behind' }],
  1
);
console.assert(behind.wrapClass.includes('entity-behind'), 'behind player styling');
console.assert(behind.opacity < 1, 'behind has reduced opacity');

const teleport = computeEntityState(
  [
    { time: 0, action: 'appear', position: 'top-left' },
    { time: 2, action: 'teleport', to: 'bottom-right' },
  ],
  2.5
);
console.assert(teleport.position === SPATIAL_POSITIONS.BOTTOM_RIGHT, 'teleport snaps position');

console.assert(normalizePosition('top left') === SPATIAL_POSITIONS.TOP_LEFT, 'position alias');

console.log('entityEngine tests passed');
