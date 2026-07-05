/**
 * Shared safe message formatting — breaks stability ↔ draftIntegrity import cycle.
 */

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

function mapReasonToMessage(reason) {
  if (!reason) return null;
  return REASON_MESSAGES[reason] || null;
}

export { mapReasonToMessage };

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
