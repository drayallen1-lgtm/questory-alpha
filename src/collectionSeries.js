import { COLLECTION_DEFS } from './engagement';

/** One-tap collection assignment for horror series creators */
export const COLLECTION_SERIES_PRESETS = {
  forgotten_souls: {
    id: 'forgotten-souls',
    label: 'Forgotten Souls Collection',
    desc: 'Whispering Hollow · Black Lantern · Midnight Train · The Red Barn',
    meta: {
      collectionId: 'forgotten-souls',
      collectionName: 'Forgotten Souls Collection',
      collectionBadge: 'Forgotten Souls Survivor Badge',
      collectionRewardCoins: 1000,
      collectionRewardMedallion: 'Forgotten Souls Medallion',
    },
  },
};

export function applyCollectionSeriesPreset(presetId, setMeta) {
  const preset = COLLECTION_SERIES_PRESETS[presetId];
  if (!preset) return { ok: false, message: 'Series not found.' };
  setMeta?.((m) => ({ ...m, ...preset.meta }));
  return { ok: true, message: `${preset.label} assigned.` };
}

export function getCollectionSeriesDef(seriesId) {
  return COLLECTION_DEFS[seriesId] || null;
}
