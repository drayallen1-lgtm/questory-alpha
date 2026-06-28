/** Bundled offline family / education-safe media — served from /public/media/family */

export const FAMILY_MEDIA_BASE = '/media/family';

export function familyPath(segment) {
  return `${FAMILY_MEDIA_BASE}${segment}`;
}

const img = (file) => familyPath(`/images/${file}`);

export const FAMILY_IMAGES = {
  friendlyDragon: img('friendly-dragon.svg'),
  wiseOwl: img('wise-owl.svg'),
  magicBook: img('magic-book.svg'),
  starCompass: img('star-compass.svg'),
  gardenFairy: img('garden-fairy.svg'),
  historyScroll: img('history-scroll.svg'),
};

export function resolveFamilyAssetUrl(asset) {
  if (!asset) return '';
  return asset.assetUrl || asset.previewUrl || asset.publicUrl || '';
}
