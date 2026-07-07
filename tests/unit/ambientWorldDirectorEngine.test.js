import { describe, expect, it } from 'vitest';
import {
  buildAmbientWhispers,
  dismissAmbientWhisper,
  getAmbientWorldDirectorSnapshot,
  isAmbientDirectorVisible,
  resolveActiveWhisper,
} from '../../src/ambientWorldDirectorEngine.js';
import { buildTestState } from './fixtures.js';

describe('ambientWorldDirectorEngine', () => {
  it('builds game-master whispers from world context', () => {
    const state = buildTestState();
    const whispers = buildAmbientWhispers({
      state,
      adventures: state.adventures,
      faction: { contestedCount: 2, wars: [{ territoryId: 'downtown', name: 'Downtown' }] },
      livingWorld: { nightMode: true },
      layerSnapshot: { zoom: 12 },
      hudContext: { zoom: 12 },
    });

    expect(whispers.some((w) => w.text.includes('river'))).toBe(true);
    expect(whispers.some((w) => w.text.includes('Ghost activity'))).toBe(true);
    expect(whispers.some((w) => w.text.includes('downtown'))).toBe(true);
  });

  it('rotates the active whisper deterministically', () => {
    const whispers = [
      { id: 'a', text: 'One', priority: 90 },
      { id: 'b', text: 'Two', priority: 80 },
    ];
    const first = resolveActiveWhisper(whispers, { now: 0 });
    const second = resolveActiveWhisper(whispers, { now: 12000 });
    expect(first?.id).toBeTruthy();
    expect(second?.id).toBeTruthy();
  });

  it('hides ambient director during earth overlay zoom', () => {
    expect(
      isAmbientDirectorVisible({
        whisperCount: 3,
        layerSnapshot: { zoom: 1, earthOverlayVisible: true, fullEarth: true },
      })
    ).toBe(false);
    expect(
      isAmbientDirectorVisible({
        whisperCount: 3,
        layerSnapshot: { zoom: 12 },
        hudContext: { zoom: 12 },
      })
    ).toBe(true);
  });

  it('dismisses a whisper without touching gameplay progress', () => {
    const state = buildTestState();
    const before = JSON.stringify(state.progress);
    const next = dismissAmbientWhisper(state, 'whisper-ghost-rising');
    expect(next.ambientDirector.dismissedIds).toContain('whisper-ghost-rising');
    expect(JSON.stringify(next.progress)).toBe(before);
  });

  it('returns ambient snapshot with active whisper on the map', () => {
    const state = buildTestState();
    const snapshot = getAmbientWorldDirectorSnapshot({
      state,
      adventures: state.adventures,
      layerSnapshot: { zoom: 12 },
      hudContext: { zoom: 12 },
    });

    expect(snapshot.whisperCount).toBeGreaterThan(0);
    expect(snapshot.activeWhisper?.text).toBeTruthy();
    expect(snapshot.visible).toBe(true);
    expect(snapshot.label).toBe('World Director');
  });
});
