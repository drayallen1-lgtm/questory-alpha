import { supabase, hasSupabase } from './client';
import {
  MEDIA_BUCKET,
  detectMediaType,
  fileToDataUrl,
  normalizeMediaAsset,
} from '../mediaStudio';

function sanitizeFilename(name = 'file') {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function storagePathFor(userId, adventureId, filename) {
  return `media/${userId}/${adventureId}/${Date.now()}-${sanitizeFilename(filename)}`;
}

export async function uploadMediaFile({
  file,
  userId,
  adventureId,
  title,
  category = 'upload',
  onProgress,
}) {
  if (!file) return { ok: false, message: 'No file selected.' };
  if (!userId) return { ok: false, message: 'Sign in to upload media.' };

  const type = detectMediaType(file);
  const advId = adventureId || 'draft';
  onProgress?.(10);

  if (!hasSupabase() || !supabase) {
    try {
      if (file.size > 3 * 1024 * 1024) {
        return { ok: false, message: 'Local mode: files must be under 3 MB.' };
      }
      const dataUrl = await fileToDataUrl(file);
      onProgress?.(100);
      const asset = normalizeMediaAsset({
        id: `local-${Date.now()}`,
        type,
        title: title || file.name,
        category,
        publicUrl: dataUrl,
        thumbnailUrl: type === 'image' ? dataUrl : null,
        source: 'local',
      });
      return { ok: true, asset };
    } catch (err) {
      return { ok: false, message: err?.message || 'Upload failed.' };
    }
  }

  const path = storagePathFor(userId, advId, file.name);
  onProgress?.(30);

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    return { ok: false, message: uploadError.message || 'Storage upload failed.' };
  }

  onProgress?.(70);
  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl || '';

  let record = null;
  try {
    const { data, error } = await supabase
      .from('media_assets')
      .insert({
        owner_id: userId,
        adventure_id: advId !== 'draft' ? advId : null,
        type,
        title: title || file.name,
        storage_path: path,
        public_url: publicUrl,
        category,
      })
      .select()
      .single();

    if (!error && data) {
      record = data;
    }
  } catch {
    /* media_assets table may not exist yet */
  }

  onProgress?.(100);
  const asset = normalizeMediaAsset({
    id: record?.id || `upload-${Date.now()}`,
    type,
    title: title || file.name,
    category,
    publicUrl,
    storagePath: path,
    thumbnailUrl: type === 'image' ? publicUrl : null,
    source: 'upload',
    createdAt: record?.created_at,
  });

  return { ok: true, asset };
}

export async function fetchMediaAssetsForAdventure(userId, adventureId) {
  if (!hasSupabase() || !supabase || !userId) return [];
  try {
    let query = supabase
      .from('media_assets')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (adventureId && adventureId !== 'draft') {
      query = query.eq('adventure_id', adventureId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) =>
      normalizeMediaAsset({
        id: row.id,
        type: row.type,
        title: row.title,
        category: row.category,
        publicUrl: row.public_url,
        storagePath: row.storage_path,
        thumbnailUrl: row.type === 'image' ? row.public_url : null,
        source: 'upload',
        createdAt: row.created_at,
      })
    );
  } catch {
    return [];
  }
}

export function libraryAssetToMediaAsset(libraryItem) {
  const base = normalizeMediaAsset({
    id: libraryItem.id,
    type: libraryItem.type,
    title: libraryItem.title,
    category: libraryItem.category,
    publicUrl: libraryItem.assetUrl || libraryItem.audioUrl || '',
    thumbnailUrl: libraryItem.previewUrl || libraryItem.icon,
    source: 'library',
  });
  return {
    ...base,
    audioUrl: libraryItem.audioUrl,
    assetUrl: libraryItem.assetUrl,
    atmosphere: libraryItem.atmosphere,
    icon: libraryItem.icon,
    previewUrl: libraryItem.previewUrl,
  };
}
