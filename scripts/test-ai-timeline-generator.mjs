import { buildCinematicTimeline, summarizeTimeline } from '../src/aiTimelineGenerator.js';

const porch = buildCinematicTimeline({
  sceneType: 'ghost',
  characterEntry: { assetId: 'ghost-little-girl', label: 'Little Girl' },
  locationEntry: { assetId: 'obj-swing', label: 'Abandoned Swing' },
  audioEntries: [{ assetId: 'aud-whisper', label: 'Whispering Voices' }],
  overlayText: "Don't look back.",
  durationSeconds: 8,
  atmosphere: 'fog',
  jumpScare: false,
});

console.assert(porch.timeline.length > 10, 'porch timeline is cinematic');
console.assert(porch.timeline.some((e) => e.action === 'overlay'), 'has overlay');
console.assert(porch.timeline.some((e) => e.action === 'showGhost'), 'shows ghost');
console.assert(porch.timeline.some((e) => e.action === 'approach'), 'ghost approaches');
console.assert(porch.timeline.some((e) => e.action === 'playAudio' && e.asset === 'wind'), 'wind ambience');
console.assert(porch.timeline.some((e) => e.action === 'playAudio' && e.asset === 'creak'), 'swing creak');

const jump = buildCinematicTimeline({
  sceneType: 'jump_scare',
  characterEntry: { assetId: 'ghost-shadow' },
  locationEntry: { assetId: 'obj-dead-tree' },
  audioEntries: [],
  overlayText: 'Too late.',
  durationSeconds: 11,
  atmosphere: 'darkness',
  jumpScare: true,
});
console.assert(jump.timeline.some((e) => e.action === 'scream'), 'jump scare has scream');
console.assert(jump.timeline.some((e) => e.action === 'heartbeat'), 'jump scare has heartbeat FX');

const stats = summarizeTimeline(porch.timeline);
console.assert(stats.audioLayers >= 3, 'counts audio layers');
console.assert(stats.choreographySteps >= 3, 'counts choreography');

console.log('aiTimelineGenerator tests passed', {
  porchEvents: porch.timeline.length,
  duration: porch.durationSeconds,
});
