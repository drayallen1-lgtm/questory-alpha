/**
 * Questory V2 — Guild Experience (unified Guild Home)
 */
import { getFactionSnapshot } from './factionEngine';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const GUILD_TAB_IDS = {
  OVERVIEW: 'overview',
  TERRITORIES: 'territories',
  WARS: 'wars',
  SEASON: 'season',
  REWARDS: 'rewards',
  MEMBERS: 'members',
  ACTIVITY: 'activity',
  RECRUITMENT: 'recruitment',
};

export const GUILD_TAB_ORDER = [
  GUILD_TAB_IDS.OVERVIEW,
  GUILD_TAB_IDS.TERRITORIES,
  GUILD_TAB_IDS.WARS,
  GUILD_TAB_IDS.SEASON,
  GUILD_TAB_IDS.REWARDS,
  GUILD_TAB_IDS.MEMBERS,
  GUILD_TAB_IDS.ACTIVITY,
  GUILD_TAB_IDS.RECRUITMENT,
];

export const GUILD_TAB_LABELS = {
  [GUILD_TAB_IDS.OVERVIEW]: 'Overview',
  [GUILD_TAB_IDS.TERRITORIES]: 'Territories',
  [GUILD_TAB_IDS.WARS]: 'Wars',
  [GUILD_TAB_IDS.SEASON]: 'Season',
  [GUILD_TAB_IDS.REWARDS]: 'Rewards',
  [GUILD_TAB_IDS.MEMBERS]: 'Members',
  [GUILD_TAB_IDS.ACTIVITY]: 'Activity',
  [GUILD_TAB_IDS.RECRUITMENT]: 'Recruitment',
};

const LEGACY_GUILD_TAB_ALIASES = {
  hub: GUILD_TAB_IDS.OVERVIEW,
  rankings: GUILD_TAB_IDS.OVERVIEW,
};

const ROSTER_NAMES = [
  'Quinn',
  'Michael',
  'Lisa',
  'Marcus',
  'Sarah J.',
  'Desiray',
  'Elena',
  'Nova',
  'Jordan',
  'Riley',
  'Alex',
  'Casey',
];

export function resolveGuildTab(tab, state = null, options = {}) {
  const raw = tab || state?.guildTab;
  const normalized = LEGACY_GUILD_TAB_ALIASES[raw] || raw;
  const hasGuild = Boolean(state?.faction?.memberFactionId);

  if (options.initialTerritoryId || state?.faction?.focusedTerritoryId) {
    return GUILD_TAB_IDS.TERRITORIES;
  }

  if (!hasGuild) {
    if (normalized === GUILD_TAB_IDS.RECRUITMENT || normalized === GUILD_TAB_IDS.TERRITORIES) {
      return normalized;
    }
    return GUILD_TAB_IDS.RECRUITMENT;
  }

  if (GUILD_TAB_ORDER.includes(normalized)) return normalized;
  return GUILD_TAB_IDS.OVERVIEW;
}

export function buildGuildMemberRoster(snapshot) {
  const faction = snapshot?.memberFaction;
  if (!faction) return [];

  const count = Math.min(faction.members || 8, 12);
  return Array.from({ length: count }, (_, index) => ({
    id: `${faction.factionId}-member-${index}`,
    name: ROSTER_NAMES[index % ROSTER_NAMES.length],
    role: index === 0 ? 'Warden' : index < 3 ? 'Captain' : snapshot.guildRank || 'Scout',
    status: index < 4 ? 'online' : index < 7 ? 'exploring' : 'away',
    contribution: Math.max(40, 220 - index * 17),
  }));
}

export function getGuildHomeSnapshot(state, adventures = [], options = {}) {
  const snapshot = getFactionSnapshot(state, adventures, { now: options.now });
  const tab = resolveGuildTab(options.tab, state, options);
  const members = buildGuildMemberRoster(snapshot);

  return wrapEngineSnapshot({
    tab,
    tabs: GUILD_TAB_ORDER.map((id) => ({
      id,
      label: GUILD_TAB_LABELS[id],
    })),
    hasGuild: Boolean(snapshot.memberFaction),
    memberCount: snapshot.memberFaction?.members || 0,
    rosterCount: members.length,
    warCount: snapshot.wars?.length || 0,
    activityCount: snapshot.timeline?.length || 0,
    recruitmentCount: snapshot.factions?.length || 0,
    snapshot,
  });
}
