/**
 * Questory V2 — Social Hub consolidation
 * Single Social destination with unified tab routing.
 */
import { getActiveStories } from './social';
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const SOCIAL_TAB_IDS = {
  GUILD: 'guild',
  FRIENDS: 'friends',
  CHALLENGES: 'challenges',
  EVENTS: 'events',
  MESSAGES: 'messages',
  TEAMS: 'teams',
};

export const SOCIAL_TAB_ORDER = [
  SOCIAL_TAB_IDS.GUILD,
  SOCIAL_TAB_IDS.FRIENDS,
  SOCIAL_TAB_IDS.CHALLENGES,
  SOCIAL_TAB_IDS.EVENTS,
  SOCIAL_TAB_IDS.MESSAGES,
  SOCIAL_TAB_IDS.TEAMS,
];

export const SOCIAL_TAB_LABELS = {
  [SOCIAL_TAB_IDS.GUILD]: 'Guild',
  [SOCIAL_TAB_IDS.FRIENDS]: 'Friends',
  [SOCIAL_TAB_IDS.CHALLENGES]: 'Challenges',
  [SOCIAL_TAB_IDS.EVENTS]: 'Events',
  [SOCIAL_TAB_IDS.MESSAGES]: 'Messages',
  [SOCIAL_TAB_IDS.TEAMS]: 'Teams',
};

const LEGACY_TAB_ALIASES = {
  guilds: SOCIAL_TAB_IDS.GUILD,
  guild: SOCIAL_TAB_IDS.GUILD,
  stories: SOCIAL_TAB_IDS.MESSAGES,
  'live-events': SOCIAL_TAB_IDS.EVENTS,
};

export function resolveSocialTab(tab, state = null) {
  const raw = tab || state?.socialTab || state?.adminTab;
  const normalized = LEGACY_TAB_ALIASES[raw] || raw;
  if (SOCIAL_TAB_ORDER.includes(normalized)) return normalized;
  if (state?.faction?.focusedTerritoryId) return SOCIAL_TAB_IDS.GUILD;
  return SOCIAL_TAB_IDS.FRIENDS;
}

export function buildMessagesFeed(state, adventures = []) {
  const stories = getActiveStories(state).map((story) => ({
    id: `story-${story.id}`,
    kind: 'story',
    icon: story.type === 'photo' ? '📸' : '✨',
    title: 'Story',
    text: story.text || 'Team celebration',
    at: story.createdAt,
  }));

  const comments = Object.entries(state?.social?.comments || {}).flatMap(([adventureId, list]) => {
    const adventure = adventures.find((a) => a.id === adventureId);
    return (list || []).slice(-3).map((comment) => ({
      id: comment.id,
      kind: 'comment',
      icon: '💬',
      title: adventure?.title || 'Adventure',
      text: comment.text,
      at: comment.at,
      adventureId,
    }));
  });

  const challenges = (state?.social?.challenges || []).slice(0, 4).map((challenge) => ({
    id: `msg-challenge-${challenge.id}`,
    kind: 'challenge',
    icon: '⚔',
    title: 'Challenge',
    text: `${challenge.from} challenged ${challenge.to}`,
    at: challenge.createdAt,
  }));

  const seedMessages = [
    {
      id: 'msg-team-bigfoot',
      kind: 'team',
      icon: '👥',
      title: 'Team Bigfoot',
      text: 'Meet at Union Depot in 20 minutes.',
      at: new Date(Date.now() - 12 * 60000).toISOString(),
    },
    {
      id: 'msg-friend-sarah',
      kind: 'friend',
      icon: '👣',
      title: 'Sarah J.',
      text: 'Found the lantern clue — your turn.',
      at: new Date(Date.now() - 28 * 60000).toISOString(),
    },
  ];

  return [...stories, ...comments, ...challenges, ...seedMessages]
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, 12);
}

export function getSocialHubSnapshot(state, adventures = [], options = {}) {
  const tab = resolveSocialTab(options.tab, state);
  const messages = buildMessagesFeed(state, adventures);

  return wrapEngineSnapshot({
    tab,
    tabs: SOCIAL_TAB_ORDER.map((id) => ({
      id,
      label: SOCIAL_TAB_LABELS[id],
    })),
    messageCount: messages.length,
    unreadMessages: messages.filter((m) => m.kind !== 'story').length,
    hasGuildFocus: Boolean(state?.faction?.focusedTerritoryId),
  });
}
