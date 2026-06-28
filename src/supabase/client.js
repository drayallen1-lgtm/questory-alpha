import { createClient } from '@supabase/supabase-js';
import { env, hasSupabaseEnv } from '../config/env';

export function hasSupabase() {
  return hasSupabaseEnv();
}

export const supabase = hasSupabase()
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
