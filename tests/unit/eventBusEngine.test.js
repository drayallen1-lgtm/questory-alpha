import { describe, expect, it } from 'vitest';
import {
  EVENT_TYPES,
  getEventBusSnapshot,
  publishEvent,
} from '../../src/eventBusEngine.js';
import { buildTestState } from './fixtures.js';

describe('eventBusEngine', () => {
  it('snapshot loads', () => {
    const snapshot = getEventBusSnapshot(buildTestState());
    expect(snapshot.initialized).toBe(true);
    expect(snapshot.eventTypes).toContain(EVENT_TYPES.CLAIM_SUBMITTED);
  });

  it('publishEvent appends history', () => {
    const state = buildTestState();
    const { state: next } = publishEvent(state, EVENT_TYPES.ADVENTURE_STARTED, { adventureId: 'test' });
    expect(next.eventBus.history.length).toBeGreaterThan(0);
  });
});
