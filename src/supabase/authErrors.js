import { safeMessage } from '../stability';

const AUTH_ERROR_MESSAGES = {
  invalid_credentials: 'Incorrect email or password. Please try again.',
  email_not_confirmed:
    'Confirm your email before signing in. Check your inbox for the verification link.',
  user_already_registered: 'An account with this email already exists. Try signing in instead.',
  signup_disabled: 'New sign-ups are disabled. Contact the Questory team for access.',
  weak_password: 'Password must be at least 6 characters.',
  over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
  validation_failed: 'Please check your email and password and try again.',
  oauth_cancelled: 'Google sign-in was cancelled. You can try again when ready.',
  access_denied: 'Google sign-in was denied. Allow access to continue with Questory.',
};

export function formatAuthError(err) {
  if (!err) return 'Something went wrong. Please try again.';

  const code = err.code || '';
  const message = err.message || String(err);

  if (AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];

  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return AUTH_ERROR_MESSAGES.invalid_credentials;
  }
  if (lower.includes('email not confirmed')) {
    return AUTH_ERROR_MESSAGES.email_not_confirmed;
  }
  if (lower.includes('user already registered')) {
    return AUTH_ERROR_MESSAGES.user_already_registered;
  }
  if (lower.includes('password should be at least')) {
    return AUTH_ERROR_MESSAGES.weak_password;
  }
  if (lower.includes('rate limit')) {
    return AUTH_ERROR_MESSAGES.over_request_rate_limit;
  }
  if (lower.includes('provider is not enabled')) {
    return 'Google sign-in is not enabled for this project. Ask an admin to enable it in Supabase.';
  }
  if (lower.includes('redirect') || lower.includes('redirect_uri')) {
    return 'Google sign-in redirect is misconfigured. Add your site URL to Supabase Auth redirect URLs.';
  }

  return safeMessage(message, 'Something went wrong. Please try again.');
}

/** Parse Supabase OAuth error returned in the URL hash after redirect. */
export function parseOAuthCallbackError() {
  const hash = window.location.hash?.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const error = params.get('error');
  const description = params.get('error_description');
  if (!error && !description) return null;

  window.history.replaceState({}, '', window.location.pathname + window.location.search);

  if (description) {
    return formatAuthError({
      message: description.replace(/\+/g, ' '),
      code: error === 'access_denied' ? 'access_denied' : error,
    });
  }

  if (error === 'access_denied') {
    return AUTH_ERROR_MESSAGES.access_denied;
  }

  return formatAuthError({ message: error, code: error });
}
