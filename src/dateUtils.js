/**
 * Safe date normalization for values from state, localStorage, APIs, and demo data.
 */

function warnInvalidDate(value) {
  if (value != null && value !== '') {
    console.warn('Invalid date normalized', value);
  }
}

export function toSafeDate(value, fallback = new Date()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'number') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      warnInvalidDate(value);
      return fallback;
    }
    return d;
  }

  if (typeof value === 'string') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      warnInvalidDate(value);
      return fallback;
    }
    return d;
  }

  if (value && typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      const d = value.toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
      warnInvalidDate(value);
      return fallback;
    }

    if ('seconds' in value && typeof value.seconds === 'number') {
      const d = new Date(value.seconds * 1000);
      if (Number.isNaN(d.getTime())) {
        warnInvalidDate(value);
        return fallback;
      }
      return d;
    }

    if ('timestamp' in value) return toSafeDate(value.timestamp, fallback);
    if ('createdAt' in value) return toSafeDate(value.createdAt, fallback);
    if ('date' in value) return toSafeDate(value.date, fallback);
  }

  if (value != null && value !== '') warnInvalidDate(value);
  return fallback;
}

export function safeGetHours(value, fallback = new Date()) {
  return toSafeDate(value, fallback).getHours();
}

export function safeGetTime(value, fallback = new Date()) {
  return toSafeDate(value, fallback).getTime();
}

export function safeNowDate(value) {
  return toSafeDate(value, new Date());
}
