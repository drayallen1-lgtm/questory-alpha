export const DEMO_ADVENTURE_ID = 'demo-missing-birthday-gift';

export const REASON_MESSAGES = {
  not_authenticated: 'Sign in to claim and save your rewards.',
  unknown: 'Something went wrong. Please try again.',
  already_claimed: 'You already claimed this reward.',
  rewards_paused: 'Rewards are paused for this adventure.',
  outside_window: 'This reward is not available right now.',
  depleted: 'This reward has run out.',
  requires_login: 'Sign in to continue.',
  invalid_code: 'That code is not valid.',
  network_error: 'Connection failed. Check your network and try again.',
};

export const LAUNCH_FUNNEL_STEPS = [
  { id: 'demo', label: 'Demo completed', metric: 'demoCompleted' },
  { id: 'create', label: 'Adventure created', metric: 'adventurePublished' },
  { id: 'invite', label: 'Invite shared', metric: 'inviteShared' },
  { id: 'return', label: 'Returned to app', metric: 'returnVisit' },
];

export const PERSONA_TESTS = [
  { id: 'grandma', label: 'Grandma Mode', desc: 'Large text, high contrast, simplified UI' },
  { id: 'kid', label: 'Kid Mode', desc: 'Kid-friendly creator and play flow' },
  { id: 'friend', label: 'Friend Invite', desc: 'Referral link + quest code join' },
  { id: 'sponsor', label: 'Sponsor Express', desc: 'Quick campaign launch flow' },
];

export const DEFAULT_LAUNCH_FUNNEL = {
  demoAt: null,
  createAt: null,
  inviteAt: null,
  returnAt: null,
  sessionCount: 0,
  lastSessionAt: null,
  personaTests: {
    grandma: false,
    kid: false,
    friend: false,
    sponsor: false,
  },
  errors: [],
};

export function normalizeLaunchFunnel(funnel = {}) {
  return {
    ...DEFAULT_LAUNCH_FUNNEL,
    ...funnel,
    personaTests: {
      ...DEFAULT_LAUNCH_FUNNEL.personaTests,
      ...(funnel.personaTests || {}),
    },
    errors: Array.isArray(funnel.errors) ? funnel.errors : [],
  };
}

export function mapReasonToMessage(reason) {
  if (!reason) return null;
  return REASON_MESSAGES[reason] || null;
}

/** Safe display string — never returns "undefined". */
export function safeMessage(value, fallback = 'Something went wrong.') {
  if (value == null || value === '' || value === 'undefined') return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return (
      value.message ||
      mapReasonToMessage(value.reason) ||
      value.error ||
      fallback
    );
  }
  const str = String(value);
  return str === 'undefined' ? fallback : str;
}

export function recordLaunchError(state, context, error) {
  const funnel = normalizeLaunchFunnel(state.launchFunnel);
  const entry = {
    id: `err-${Date.now()}`,
    context,
    message: safeMessage(error),
    at: new Date().toISOString(),
  };
  return {
    ...state,
    launchFunnel: {
      ...funnel,
      errors: [entry, ...funnel.errors].slice(0, 20),
    },
  };
}

export function recordSessionStart(state) {
  if (!state) return state;
  const funnel = normalizeLaunchFunnel(state.launchFunnel);
  const now = new Date().toISOString();
  const isReturn = funnel.sessionCount >= 1;
  const metrics = { ...(state.firstTimeMetrics || {}) };

  if (isReturn && !metrics.returnVisit) {
    metrics.returnVisit = true;
  }

  return {
    ...state,
    firstTimeMetrics: metrics,
    launchFunnel: {
      ...funnel,
      sessionCount: funnel.sessionCount + 1,
      lastSessionAt: now,
      returnAt: isReturn && !funnel.returnAt ? now : funnel.returnAt,
    },
  };
}

export function trackLaunchFunnelStep(state, stepId, source = '') {
  const step = LAUNCH_FUNNEL_STEPS.find((s) => s.id === stepId);
  if (!step) return state;

  const funnel = normalizeLaunchFunnel(state.launchFunnel);
  const now = new Date().toISOString();
  const atKey = `${stepId}At`;
  const metrics = { ...(state.firstTimeMetrics || {}), [step.metric]: true };

  if (stepId === 'demo' && !metrics.demoStarted) {
    metrics.demoStarted = true;
  }

  return {
    ...state,
    firstTimeMetrics: metrics,
    launchFunnel: {
      ...funnel,
      [atKey]: funnel[atKey] || now,
      lastStep: stepId,
      lastStepSource: source,
    },
  };
}

export function trackDemoStart(state) {
  const metrics = { ...(state.firstTimeMetrics || {}), demoStarted: true };
  return trackLaunchFunnelStep({ ...state, firstTimeMetrics: metrics }, 'demo', 'demo_start');
}

export function trackDemoComplete(state) {
  return trackLaunchFunnelStep(state, 'demo', DEMO_ADVENTURE_ID);
}

export function trackCreatePublished(state) {
  return trackLaunchFunnelStep(state, 'create', 'publish');
}

export function trackInviteShared(state) {
  return trackLaunchFunnelStep(state, 'invite', 'share');
}

export function markPersonaTested(state, personaId) {
  const funnel = normalizeLaunchFunnel(state.launchFunnel);
  if (!PERSONA_TESTS.some((p) => p.id === personaId)) return state;
  return {
    ...state,
    launchFunnel: {
      ...funnel,
      personaTests: { ...funnel.personaTests, [personaId]: true },
    },
  };
}

export function getLaunchFunnelProgress(state) {
  const metrics = state.firstTimeMetrics || {};
  const funnel = normalizeLaunchFunnel(state.launchFunnel);

  return LAUNCH_FUNNEL_STEPS.map((step) => ({
    ...step,
    completed: Boolean(metrics[step.metric]),
    at: funnel[`${step.id}At`],
  }));
}

export function getAdminLaunchAnalytics(state, adventures = []) {
  const safeState = state || {
    launchFunnel: {},
    firstTimeMetrics: {},
    coins: 0,
    engagement: {},
  };
  const funnel = getLaunchFunnelProgress(safeState);
  const lf = normalizeLaunchFunnel(safeState.launchFunnel);
  const published = adventures.filter((a) => a.status === 'published').length;
  const metrics = safeState.firstTimeMetrics || {};

  const completedSteps = funnel.filter((s) => s.completed).length;
  const conversionRate = funnel.length ? Math.round((completedSteps / funnel.length) * 100) : 0;

  return {
    funnel,
    conversionRate,
    sessionCount: lf.sessionCount,
    personaTests: PERSONA_TESTS.map((p) => ({
      ...p,
      passed: lf.personaTests[p.id],
    })),
    stats: {
      demoStarted: Boolean(metrics.demoStarted),
      demoCompleted: Boolean(metrics.demoCompleted),
      adventuresCreated: metrics.adventuresCreatedCount || 0,
      invitesShared: Boolean(metrics.inviteShared),
      returnVisits: Boolean(metrics.returnVisit),
      publishedAdventures: published,
      coins: safeState.coins || 0,
      adventuresCompleted: safeState.engagement?.adventuresCompleted || 0,
    },
    recentErrors: lf.errors.slice(0, 5),
  };
}

export function withLoadingState(setBusy) {
  return async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };
}
