import { describe, expect, it } from 'vitest';
import {
  GUILD_TAB_IDS,
  GUILD_TAB_ORDER,
  buildGuildMemberRoster,
  getGuildHomeSnapshot,
  resolveGuildTab,
} from '../../src/guildExperienceEngine.js';
import { buildTestState } from './fixtures.js';

describe('guildExperienceEngine', () => {
  it('exposes unified guild home tabs', () => {
    expect(GUILD_TAB_ORDER).toEqual([
      'overview',
      'territories',
      'wars',
      'season',
      'rewards',
      'members',
      'activity',
      'recruitment',
    ]);
    expect(GUILD_TAB_ORDER).not.toContain('hub');
    expect(GUILD_TAB_ORDER).not.toContain('rankings');
  });

  it('maps legacy hub tab to overview', () => {
    expect(resolveGuildTab('hub')).toBe(GUILD_TAB_IDS.OVERVIEW);
    expect(resolveGuildTab('rankings')).toBe(GUILD_TAB_IDS.OVERVIEW);
  });

  it('opens territories when a territory is focused', () => {
    expect(
      resolveGuildTab(null, { faction: { focusedTerritoryId: 'downtown' } }, {})
    ).toBe(GUILD_TAB_IDS.TERRITORIES);
  });

  it('builds a member roster for joined guilds', () => {
    const snapshot = getGuildHomeSnapshot(buildTestState(), buildTestState().adventures);
    const joined = {
      ...snapshot.snapshot,
      memberFaction: { factionId: 'parsons-explorers', members: 6, name: 'PEG' },
      guildRank: 'Scout',
    };
    const roster = buildGuildMemberRoster(joined);
    expect(roster.length).toBe(6);
    expect(roster[0].role).toBe('Warden');
  });

  it('snapshot defaults to recruitment without a guild', () => {
    const state = buildTestState();
    const snapshot = getGuildHomeSnapshot(state, state.adventures);
    expect(snapshot.tab).toBe(GUILD_TAB_IDS.RECRUITMENT);
    expect(snapshot.tabs).toHaveLength(8);
  });
});
