import {
  legacySceneToTimeline,
  computePlaybackAtTime,
  getTimelineDuration,
  TIMELINE_ACTIONS,
} from '../src/timelineEngine.js';

const legacy = {
  durationSeconds: 8,
  sceneType: 'ghost',
  atmosphere: 'fog',
  overlayText: "Don't look back.",
  assetUrl: '/media/horror/ghost.svg',
  assetType: 'image',
  audioUrl: '/media/horror/whisper.wav',
  jumpScare: true,
};

const timeline = legacySceneToTimeline(legacy);
const duration = getTimelineDuration(timeline);

console.assert(timeline.length >= 6, 'legacy timeline should have multiple events');
console.assert(timeline[0].action === TIMELINE_ACTIONS.FADE_IN, 'starts with fadeIn');
console.assert(timeline.some((e) => e.action === TIMELINE_ACTIONS.OVERLAY), 'includes overlay');
console.assert(
  timeline.find((e) => e.action === TIMELINE_ACTIONS.OVERLAY).text === "Don't look back.",
  'overlay preserves apostrophe'
);
console.assert(duration >= 8, 'duration respects fadeOut time');

const scene = { timeline, durationSeconds: duration };
const mid = computePlaybackAtTime(scene, 4.5, 4.4);
console.assert(mid.showAsset === true, 'asset visible mid-scene');
console.assert(mid.overlayText === "Don't look back.", 'overlay text after subtitle beat');
console.assert(mid.activeFx.has(TIMELINE_ACTIONS.FOG), 'fog active');

const end = computePlaybackAtTime(scene, duration, duration - 0.1);
console.assert(end.complete === true, 'marks complete at duration');
console.assert(end.phase === 'outro', 'outro phase at end');

console.log('timelineEngine tests passed', { events: timeline.length, duration });
