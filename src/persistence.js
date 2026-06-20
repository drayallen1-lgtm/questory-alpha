import { STORAGE_KEY, loadState, defaultState } from './seed';
import { hasSupabase } from './supabase/client';
import { normalizeLaunchFunnel } from './stability';
import { normalizeGrowth } from './growth';
import { loadLocalDrafts, mergeAdventuresWithLocalDrafts } from './draftIntegrity';

function normalizeAppState(state) {
  return {
    ...state,
    growth: normalizeGrowth(state?.growth),
    launchFunnel: normalizeLaunchFunnel(state?.launchFunnel),
  };
}

/** Initial React state — adventures come from Supabase when cloud mode is on. */
export function getInitialState() {
  try {
    const local = normalizeAppState(loadState());
    if (hasSupabase()) {
      const localDrafts = loadLocalDrafts();
      return { ...local, adventures: mergeAdventuresWithLocalDrafts([], localDrafts) };
    }
    return local;
  } catch (err) {
    console.error('Questory state init failed:', err);
    const fallback = normalizeAppState(defaultState);
    return hasSupabase() ? { ...fallback, adventures: mergeAdventuresWithLocalDrafts([], loadLocalDrafts()) } : fallback;
  }
}

/** Persist user progress locally; adventures stay in Supabase in cloud mode. */
export function persistState(state) {
  const payload = { ...state };
  if (hasSupabase()) {
    delete payload.adventures;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
