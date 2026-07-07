import { describe, expect, it } from 'vitest';
import {
  NOTIFICATION_PRIORITY,
  collectSmartNotifications,
  compareNotifications,
  getSmartNotificationSnapshot,
  normalizeSmartNotification,
  partitionNotificationStack,
} from '../../src/smartNotificationEngine.js';
import { buildTestState } from './fixtures.js';

describe('smartNotificationEngine', () => {
  it('ranks critical notifications ahead of background', () => {
    const critical = normalizeSmartNotification({
      id: 'c1',
      priority: NOTIFICATION_PRIORITY.CRITICAL,
      text: 'Treasure expires in 6 minutes',
    });
    const background = normalizeSmartNotification({
      id: 'b1',
      priority: NOTIFICATION_PRIORITY.BACKGROUND,
      text: 'Market prices updated',
    });
    expect(compareNotifications(critical, background)).toBeLessThan(0);
  });

  it('partitions prominent vs stacked background notifications', () => {
    const notifications = [
      normalizeSmartNotification({ id: '1', priority: NOTIFICATION_PRIORITY.CRITICAL, text: 'A' }),
      normalizeSmartNotification({ id: '2', priority: NOTIFICATION_PRIORITY.NEARBY, text: 'B' }),
      normalizeSmartNotification({ id: '3', priority: NOTIFICATION_PRIORITY.BACKGROUND, text: 'C' }),
      normalizeSmartNotification({ id: '4', priority: NOTIFICATION_PRIORITY.BACKGROUND, text: 'D' }),
    ];
    const { prominent, stacked } = partitionNotificationStack(notifications);
    expect(prominent).toHaveLength(2);
    expect(stacked).toHaveLength(2);
  });

  it('collects nearby explorer and background market notifications', () => {
    const state = buildTestState();
    const items = collectSmartNotifications({
      state,
      adventures: state.adventures,
      livingWorld: {
        explorerDots: [{ id: 'e1' }],
        timeline: [{ id: 't1', text: 'Michael started Iron Conductor', kind: 'start' }],
      },
      marketplace: {
        activityFeed: [{ id: 'm1', text: 'Market prices updated', icon: '🏪' }],
        endingSoon: [],
      },
      faction: { wars: [], lastEvent: null },
      legendaryHunt: { alerts: [] },
      socialToasts: [],
      now: Date.now(),
    });

    const texts = items.map((n) => n.text);
    expect(texts.some((t) => t.includes('feet away'))).toBe(true);
    expect(texts.some((t) => t.includes('Market prices updated'))).toBe(true);
  });

  it('snapshot exposes stack metadata', () => {
    const state = buildTestState({
      rewards: [
        {
          id: 'r-exp',
          type: 'coupon',
          status: 'active',
          expiresAt: new Date(Date.now() + 6 * 60 * 1000).toISOString(),
        },
      ],
    });
    const snapshot = getSmartNotificationSnapshot({
      state,
      adventures: state.adventures,
      now: Date.now(),
    });

    expect(snapshot.prominent.length + snapshot.stacked.length).toBeGreaterThan(0);
    expect(snapshot.hasCritical || snapshot.hasStack).toBe(true);
  });
});
