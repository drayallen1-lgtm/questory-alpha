import { legacySceneToTimeline } from '../src/timelineEngine.js';
import { createAudioTimelineController, getAudioTimelineEvents } from '../src/audioTimelineEngine.js';
import { resolveChoreographyFx } from '../src/choreographyEngine.js';

const ghostTimeline = legacySceneToTimeline({
  durationSeconds: 8,
  sceneType: 'ghost',
  atmosphere: 'fog',
  overlayText: "Don't look back.",
  jumpScare: true,
});

const audioEvents = getAudioTimelineEvents(ghostTimeline);
console.assert(audioEvents.some((e) => e.track === 'amb-wind'), 'wind ambience layer');
console.assert(audioEvents.some((e) => e.asset === 'creak'), 'swing creak at 2s');
console.assert(audioEvents.some((e) => e.asset === 'whisper'), 'whisper layer for ghost');
console.assert(audioEvents.some((e) => e.asset === 'heartbeat'), 'heartbeat before scare');
console.assert(audioEvents.some((e) => e.action === 'scream'), 'scream action');

const fxAtScream = resolveChoreographyFx(ghostTimeline, 7.6);
console.assert(fxAtScream.has('redFlash'), 'scream triggers red flash');
console.assert(fxAtScream.has('cameraShake'), 'scream triggers shake');

console.assert(typeof createAudioTimelineController === 'function', 'controller factory exists');

console.log('audioTimelineEngine tests passed', { audioLayers: audioEvents.length });
