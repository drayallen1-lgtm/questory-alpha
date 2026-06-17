/**
 * Vite inlines import.meta.env.VITE_* at build time (including on Vercel).
 * Values must be set in the Vercel project Environment Variables UI before deploy.
 */
function readEnv(key) {
  const value = import.meta.env[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export const env = {
  supabaseUrl: readEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY'),
  mapboxToken: readEnv('VITE_MAPBOX_TOKEN'),
};

export const isDev = import.meta.env.DEV;

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasMapboxEnv() {
  return Boolean(env.mapboxToken);
}
