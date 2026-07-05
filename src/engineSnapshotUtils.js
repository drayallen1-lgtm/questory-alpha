/**
 * Phase 14.75 — read-only snapshot helpers and dev-only diagnostics.
 */
import { isDev } from './config/env.js';

/** Approximate localStorage warning threshold (4 MB). */
export const STATE_SIZE_WARN_BYTES = 4 * 1024 * 1024;

/** Static madge audit count (Phase 14.75) — seed.js hub cycles remain documented. */
export const KNOWN_IMPORT_CYCLE_COUNT = 21;

export function measureEngineSnapshot(_name, fn) {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const result = fn();
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return { result, ms: Math.round(end - start), error: null };
  } catch (err) {
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      result: null,
      ms: Math.round(end - start),
      error: err?.message || String(err),
    };
  }
}

/** Shallow freeze in dev to catch accidental snapshot mutation. */
export function wrapEngineSnapshot(snapshot) {
  if (!isDev || snapshot == null || typeof snapshot !== 'object') return snapshot;
  try {
    return Object.freeze(snapshot);
  } catch {
    return snapshot;
  }
}

export function approximateStateSizeBytes(state) {
  if (state == null) return 0;
  try {
    if (typeof Blob !== 'undefined') {
      return new Blob([JSON.stringify(state)]).size;
    }
  } catch {
    /* fall through */
  }
  try {
    return JSON.stringify(state).length * 2;
  } catch {
    return 0;
  }
}

export function formatStateSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function assessStateSize(bytes) {
  const safe = bytes <= STATE_SIZE_WARN_BYTES;
  return {
    bytes,
    formatted: formatStateSize(bytes),
    safe,
    warning: safe
      ? null
      : `Saved state exceeds ${formatStateSize(STATE_SIZE_WARN_BYTES)} — consider pruning debug data.`,
  };
}
