import { describe, expect, it } from 'vitest';
import {
  SOCIAL_TAB_IDS,
  SOCIAL_TAB_ORDER,
  buildMessagesFeed,
  getSocialHubSnapshot,
  resolveSocialTab,
} from '../../src/socialHubEngine.js';
import { buildTestState } from './fixtures.js';

describe('socialHubEngine', () => {
  it('exposes consolidated social tabs without separate stories tab', () => {
    expect(SOCIAL_TAB_ORDER).toEqual([
      'guild',
      'friends',
      'challenges',
      'events',
      'messages',
      'teams',
    ]);
    expect(SOCIAL_TAB_ORDER).not.toContain('stories');
    expect(SOCIAL_TAB_ORDER).not.toContain('guilds');
  });

  it('maps legacy guilds and stories aliases', () => {
    expect(resolveSocialTab('guilds')).toBe(SOCIAL_TAB_IDS.GUILD);
    expect(resolveSocialTab('stories')).toBe(SOCIAL_TAB_IDS.MESSAGES);
    expect(resolveSocialTab('guild')).toBe(SOCIAL_TAB_IDS.GUILD);
  });

  it('defaults to guild when a territory is focused', () => {
    expect(
      resolveSocialTab(null, {
        faction: { focusedTerritoryId: 'downtown' },
      })
    ).toBe(SOCIAL_TAB_IDS.GUILD);
  });

  it('builds a messages feed from stories and comments', () => {
    const state = buildTestState({
      social: {
        ...buildTestState().social,
        stories: [
          {
            id: 's1',
            text: 'We claimed downtown',
            type: 'text',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
        comments: {
          'union-depot-ghost': [{ id: 'c1', text: 'Great clue!', at: new Date().toISOString() }],
        },
      },
    });
    const feed = buildMessagesFeed(state, state.adventures);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed.some((m) => m.kind === 'story' || m.kind === 'comment' || m.kind === 'team')).toBe(
      true
    );
  });

  it('snapshot reports active tab and message counts', () => {
    const state = buildTestState({ socialTab: 'friends' });
    const snapshot = getSocialHubSnapshot(state, state.adventures);
    expect(snapshot.tab).toBe('friends');
    expect(snapshot.tabs).toHaveLength(6);
    expect(snapshot.messageCount).toBeGreaterThan(0);
  });
});
