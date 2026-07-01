/**
 * Social world scaffolding — territories, live races (demo data only).
 */

export const DEFAULT_TERRITORY_TEAMS = [
  {
    teamId: 'parsons-explorers',
    teamName: 'Parsons Explorers',
    teamColor: '#34d399',
    territoryControl: 0.42,
    controlledAreaIds: ['downtown-parsons', 'main-street'],
  },
  {
    teamId: 'ghost-hunters-kansas',
    teamName: 'Ghost Hunters of Kansas',
    teamColor: '#a78bfa',
    territoryControl: 0.31,
    controlledAreaIds: ['horror-crest', 'railroad-district'],
  },
  {
    teamId: 'night-shift',
    teamName: 'The Night Shift',
    teamColor: '#60a5fa',
    territoryControl: 0.27,
    controlledAreaIds: ['lake-parsons'],
  },
];

export const DEFAULT_LIVE_RACES = [
  {
    id: 'race-treasure-sprint',
    type: 'first_claim',
    title: 'Live Race',
    subtitle: 'First to claim treasure',
    teamsCompeting: 3,
    prize: '500 coins + relic',
    endsAt: null,
    countdownMinutes: 42,
    active: true,
  },
  {
    id: 'race-legendary-hunt',
    type: 'legendary_hunt',
    title: 'Timed Legendary Hunt',
    subtitle: 'Iron Horse expedition',
    teamsCompeting: 2,
    prize: 'Founder badge',
    countdownMinutes: 118,
    active: true,
  },
];

export function getTeamTerritories(options = {}) {
  const { devMode = false } = options;
  return DEFAULT_TERRITORY_TEAMS.map((t) => ({
    ...t,
    showOnMap: devMode,
  }));
}

export function getLiveRaceEvents() {
  return DEFAULT_LIVE_RACES.filter((r) => r.active).slice(0, 3);
}

export function buildSocialActivityToasts(timeline = []) {
  return timeline
    .filter((e) => ['completion', 'team', 'nearby'].includes(e.kind))
    .slice(0, 3)
    .map((e) => ({
      id: `toast-${e.id}`,
      text: e.text,
      minutesAgo: e.minutesAgo,
    }));
}
