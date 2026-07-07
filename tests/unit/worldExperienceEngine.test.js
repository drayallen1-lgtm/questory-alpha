import { describe, expect, it, vi } from 'vitest';
import {
  WORLD_ANALYTICS_EVENTS,
  WORLD_AUDIO_EVENTS,
  assessWorldPerformance,
  clearWorldError,
  enrichCardsWithEmptyStates,
  emitWorldAudio,
  enableWorldOfflineMode,
  getWorldPerformanceSnapshot,
  getWorldRecoveryMessage,
  resolveEmptyState,
  setWorldError,
  trackWorldEvent,
} from '../../src/worldExperienceEngine.js';
import { buildTestState } from './fixtures.js';

describe('worldExperienceEngine', () => {
  it('tracks analytics counters', () => {
    const state = buildTestState();
    const next = trackWorldEvent(state, WORLD_ANALYTICS_EVENTS.MAP_OPEN);
    expect(next.worldAnalytics.counters[WORLD_ANALYTICS_EVENTS.MAP_OPEN]).toBe(1);
    expect(next.worldAnalytics.lastEventId).toBe(WORLD_ANALYTICS_EVENTS.MAP_OPEN);
  });

  it('resolves story-driven empty states', () => {
    const explorer = resolveEmptyState('explorer');
    expect(explorer.title).toMatch(/quiet/i);
    expect(explorer.cta).toMatch(/adventure/i);

    const guild = resolveEmptyState('guild', { hasGuild: false });
    expect(guild.body).toMatch(/people/i);
  });

  it('enriches placeholder HUD cards with narrative copy', () => {
    const cards = enrichCardsWithEmptyStates([
      {
        id: 'explorer',
        items: [{ id: 'empty', text: 'No data' }],
      },
    ]);
    expect(cards[0].metricLabel).toMatch(/quiet/i);
    expect(cards[0].items.some((item) => item.action === 'create')).toBe(true);
  });

  it('warns when world performance thresholds are exceeded', () => {
    const assessment = assessWorldPerformance({
      hudCardCount: 12,
      animationCount: 20,
      mapRenderMs: 200,
    });
    expect(assessment.healthy).toBe(false);
    expect(assessment.warnings.length).toBeGreaterThan(0);
  });

  it('builds world performance snapshot from layer data', () => {
    const snapshot = getWorldPerformanceSnapshot({
      layerSnapshot: {
        layers: { guild: { visible: true }, earth: { visible: true } },
        animations: { activeCount: 3 },
      },
      hudCardCount: 6,
    });
    expect(snapshot.visibleLayerCount).toBe(2);
    expect(snapshot.healthy).toBe(true);
  });

  it('manages friendly recovery state', () => {
    const state = buildTestState();
    const errored = setWorldError(state, 'network timeout');
    expect(getWorldRecoveryMessage(errored.worldExperience.lastError)).toMatch(/offline|update/i);

    const cleared = clearWorldError(errored);
    expect(cleared.worldExperience.lastError).toBeNull();

    const offline = enableWorldOfflineMode(cleared);
    expect(offline.worldExperience.offlineMode).toBe(true);
  });

  it('emits optional audio hooks without throwing', () => {
    const handler = vi.fn();
    const prior = globalThis.window?.questoryWorldAudio;
    globalThis.window = globalThis.window || {};
    globalThis.window.questoryWorldAudio = { [WORLD_AUDIO_EVENTS.DISCOVERY]: handler };
    emitWorldAudio(WORLD_AUDIO_EVENTS.DISCOVERY, { id: 'test' });
    expect(handler).toHaveBeenCalledWith({ id: 'test' });
    if (prior) globalThis.window.questoryWorldAudio = prior;
    else delete globalThis.window.questoryWorldAudio;
  });
});
