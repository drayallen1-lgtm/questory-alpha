import {
  ADVENTURE_STATUS,
  normalizeAdventure,
} from './seed';
import { safeMessage } from './messageUtils.js';

export const LOCAL_DRAFTS_KEY = 'questoryAlpha_local_drafts';

export const DRAFT_SYNC_BADGE = {
  LOCAL: 'local',
  CLOUD: 'cloud',
  SYNCED: 'synced',
};

export function normalizeDraftAdventure(adventure) {
  return normalizeAdventure({
    ...adventure,
    status: ADVENTURE_STATUS.DRAFT,
  });
}

export function loadLocalDrafts() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_DRAFTS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeDraftAdventure);
  } catch {
    return [];
  }
}

export function saveLocalDrafts(drafts) {
  localStorage.setItem(
    LOCAL_DRAFTS_KEY,
    JSON.stringify(drafts.map(normalizeDraftAdventure))
  );
}

export function upsertLocalDraft(adventure) {
  const draft = normalizeDraftAdventure(adventure);
  const drafts = loadLocalDrafts();
  const index = drafts.findIndex((d) => d.id === draft.id);
  if (index >= 0) drafts[index] = draft;
  else drafts.unshift(draft);
  saveLocalDrafts(drafts);
  return draft;
}

export function removeLocalDraft(adventureId) {
  saveLocalDrafts(loadLocalDrafts().filter((d) => d.id !== adventureId));
}

export function attachDraftSyncMeta(adventure, { local = false, cloud = false, cloudError = null } = {}) {
  let badge = DRAFT_SYNC_BADGE.LOCAL;
  if (local && cloud) badge = DRAFT_SYNC_BADGE.SYNCED;
  else if (cloud) badge = DRAFT_SYNC_BADGE.CLOUD;

  return {
    ...adventure,
    _draftSync: {
      local,
      cloud,
      badge,
      cloudError: cloudError || null,
    },
  };
}

export function getDraftSyncBadge(adventure) {
  return adventure?._draftSync?.badge || DRAFT_SYNC_BADGE.LOCAL;
}

export function draftSyncBadgeLabel(badge) {
  if (badge === DRAFT_SYNC_BADGE.SYNCED) return 'Synced';
  if (badge === DRAFT_SYNC_BADGE.CLOUD) return 'Cloud';
  return 'Local';
}

/** Merge cloud adventures with locally stored drafts (dedupe by id). */
export function mergeAdventuresWithLocalDrafts(cloudAdventures = [], localDrafts = loadLocalDrafts()) {
  const cloud = (cloudAdventures || []).map(normalizeAdventure);
  const local = (localDrafts || []).map(normalizeDraftAdventure);

  const nonDrafts = cloud.filter((a) => a.status !== ADVENTURE_STATUS.DRAFT);
  const cloudDrafts = cloud.filter((a) => a.status === ADVENTURE_STATUS.DRAFT);
  const cloudDraftIds = new Set(cloudDrafts.map((d) => d.id));
  const localById = new Map(local.map((d) => [d.id, d]));

  const mergedDrafts = [
    ...cloudDrafts.map((cloudDraft) => {
      const localDraft = localById.get(cloudDraft.id);
      return attachDraftSyncMeta(
        localDraft ? { ...localDraft, ...cloudDraft, status: ADVENTURE_STATUS.DRAFT } : cloudDraft,
        { local: Boolean(localDraft), cloud: true }
      );
    }),
    ...local
      .filter((d) => !cloudDraftIds.has(d.id))
      .map((localDraft) =>
        attachDraftSyncMeta(localDraft, {
          local: true,
          cloud: false,
          cloudError: localDraft._draftSync?.cloudError || null,
        })
      ),
  ];

  return [...mergedDrafts, ...nonDrafts];
}

export function getDraftHealthStats(adventures = [], localDrafts = loadLocalDrafts()) {
  const mergedDrafts = (adventures || []).filter((a) => a.status === ADVENTURE_STATUS.DRAFT);
  const hasSyncMeta = mergedDrafts.some((a) => a._draftSync);

  if (!hasSyncMeta) {
    const count = Math.max(localDrafts.length, mergedDrafts.length);
    return {
      localDraftCount: count,
      cloudDraftCount: 0,
      unsyncedDraftCount: 0,
      syncedDraftCount: count,
      localOnlyCount: count,
      cloudOnlyCount: 0,
    };
  }

  const localOnlyCount = mergedDrafts.filter(
    (a) => getDraftSyncBadge(a) === DRAFT_SYNC_BADGE.LOCAL
  ).length;
  const cloudOnlyCount = mergedDrafts.filter(
    (a) => getDraftSyncBadge(a) === DRAFT_SYNC_BADGE.CLOUD
  ).length;
  const syncedDraftCount = mergedDrafts.filter(
    (a) => getDraftSyncBadge(a) === DRAFT_SYNC_BADGE.SYNCED
  ).length;

  return {
    localDraftCount: localDrafts.length,
    cloudDraftCount: cloudOnlyCount + syncedDraftCount,
    unsyncedDraftCount: localOnlyCount + cloudOnlyCount,
    syncedDraftCount,
    localOnlyCount,
    cloudOnlyCount,
  };
}

export function listDraftAdventures(adventures = []) {
  return adventures.filter((a) => a.status === ADVENTURE_STATUS.DRAFT);
}

/**
 * Save draft locally first, then attempt cloud upsert when authenticated.
 * @returns {{ ok: boolean, localSaved: boolean, cloudSaved: boolean, message: string, adventure: object, cloudError?: string }}
 */
export async function saveAdventureDraft({ adventure, userId, upsertAdventure }) {
  const draft = normalizeDraftAdventure(adventure);
  const result = {
    ok: false,
    localSaved: false,
    cloudSaved: false,
    message: '',
    adventure: draft,
  };

  try {
    upsertLocalDraft(draft);
    result.localSaved = true;
  } catch (err) {
    result.message = safeMessage(err) || 'Could not save draft locally.';
    return result;
  }

  if (!userId || typeof upsertAdventure !== 'function') {
    result.ok = true;
    result.adventure = attachDraftSyncMeta(draft, { local: true, cloud: false });
    result.message = userId
      ? 'Saved locally.'
      : 'Saved locally. Sign in to sync drafts to the cloud.';
    return result;
  }

  try {
    const saved = await upsertAdventure(draft, userId);
    const synced = normalizeDraftAdventure(saved || draft);
    result.cloudSaved = true;
    result.ok = true;
    result.adventure = attachDraftSyncMeta(synced, { local: true, cloud: true });
    upsertLocalDraft(result.adventure);
    result.message = 'Draft saved locally and synced to the cloud.';
    return result;
  } catch (err) {
    const cloudError = safeMessage(err) || 'Cloud sync failed.';
    result.ok = true;
    result.adventure = attachDraftSyncMeta(
      { ...draft, _draftSync: { local: true, cloud: false, cloudError } },
      { local: true, cloud: false, cloudError }
    );
    upsertLocalDraft(result.adventure);
    result.message = 'Saved locally. Cloud sync failed.';
    result.cloudError = cloudError;
    return result;
  }
}

export async function retryDraftCloudSync({ adventureId, userId, upsertAdventure }) {
  const local = loadLocalDrafts().find((d) => d.id === adventureId);
  if (!local) {
    return { ok: false, localSaved: false, cloudSaved: false, message: 'Draft not found locally.' };
  }
  return saveAdventureDraft({ adventure: local, userId, upsertAdventure });
}

export function mergeSavedDraftIntoAdventures(adventures, savedDraft) {
  const nonDrafts = adventures.filter(
    (a) => a.status !== ADVENTURE_STATUS.DRAFT && a.id !== savedDraft.id
  );
  const otherDrafts = adventures.filter(
    (a) => a.status === ADVENTURE_STATUS.DRAFT && a.id !== savedDraft.id
  );
  return [savedDraft, ...otherDrafts, ...nonDrafts];
}

export function applyDraftToAdventures(adventures, savedDraft) {
  return mergeSavedDraftIntoAdventures(adventures, savedDraft);
}
