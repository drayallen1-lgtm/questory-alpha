import { STORAGE_KEY, loadState } from './seed';
import { hasSupabase } from './supabase/client';

/** Initial React state — adventures come from Supabase when cloud mode is on. */
export function getInitialState() {
  const local = loadState();
  if (hasSupabase()) {
    return { ...local, adventures: [] };
  }
  return local;
}

/** Persist user progress locally; adventures stay in Supabase in cloud mode. */
export function persistState(state) {
  const payload = { ...state };
  if (hasSupabase()) {
    delete payload.adventures;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
