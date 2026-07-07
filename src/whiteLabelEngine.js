/**
 * Questory 2.0 — Phase 18: White Label Engine
 * Brand packs, themes, terminology, feature toggles, adventure templates, extension registry.
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';

export const ADVENTURE_TEMPLATES = {
  MUSEUM: { id: 'museum', label: 'Museum Tour', icon: '🏺', durationMin: 45 },
  CITY_TOUR: { id: 'city_tour', label: 'City Tour', icon: '🏙️', durationMin: 90 },
  GHOST_HUNT: { id: 'ghost_hunt', label: 'Ghost Hunt', icon: '👻', durationMin: 60 },
  CAMPUS_TOUR: { id: 'campus_tour', label: 'Campus Tour', icon: '🎓', durationMin: 75 },
  CORPORATE_HUNT: { id: 'corporate_hunt', label: 'Corporate Hunt', icon: '💼', durationMin: 45 },
  BIRTHDAY: { id: 'birthday', label: 'Birthday Adventure', icon: '🎂', durationMin: 30 },
  ESCAPE_TRAIL: { id: 'escape_trail', label: 'Escape Trail', icon: '🔐', durationMin: 50 },
  HISTORICAL_WALK: { id: 'historical_walk', label: 'Historical Walk', icon: '📜', durationMin: 60 },
  NATIONAL_PARK: { id: 'national_park', label: 'National Park', icon: '🌲', durationMin: 120 },
  CREATOR_BUNDLE: { id: 'creator_bundle', label: 'Creator Bundle', icon: '✨', durationMin: 0 },
};

export const EXTENSION_REGISTRY = [
  { id: 'ext-marketplace', label: 'Global Marketplace', version: '1.0.0', required: false },
  { id: 'ext-payments', label: 'Payments & Treasury', version: '1.0.0', required: false },
  { id: 'ext-ai-director', label: 'AI Director', version: '1.0.0', required: false },
  { id: 'ext-factions', label: 'Factions & Territories', version: '1.0.0', required: false },
  { id: 'ext-white-label', label: 'White Label Branding', version: '1.0.0', required: false },
  { id: 'ext-enterprise', label: 'Enterprise SSO', version: '0.1.0', required: false, placeholder: true },
];

export const DEFAULT_BRAND_PACK = {
  id: 'questory-alpha',
  name: 'Questory Alpha',
  logo: '🧭',
  primaryColor: '#6c5ce7',
  accentColor: '#00b894',
  fontFamily: 'system-ui',
  terminology: {
    adventure: 'Adventure',
    explorer: 'Explorer',
    claim: 'Claim',
    passport: 'Passport',
    guild: 'Guild',
  },
  navigation: ['home', 'map', 'passport', 'social'],
  featureToggles: {
    marketplace: true,
    factions: true,
    aiDirector: true,
    payments: true,
    livingEarth: true,
  },
};

export const DEFAULT_WHITE_LABEL = {
  activeBrandId: 'questory-alpha',
  brandPacks: [DEFAULT_BRAND_PACK],
  installedExtensions: ['ext-marketplace', 'ext-payments', 'ext-ai-director', 'ext-factions'],
  templatesUsed: [],
};

export function normalizeWhiteLabel(raw = {}) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_WHITE_LABEL };
  return {
    activeBrandId: raw.activeBrandId || 'questory-alpha',
    brandPacks: Array.isArray(raw.brandPacks) ? raw.brandPacks.slice(0, 12) : [DEFAULT_BRAND_PACK],
    installedExtensions: Array.isArray(raw.installedExtensions) ? raw.installedExtensions.slice(0, 20) : [],
    templatesUsed: Array.isArray(raw.templatesUsed) ? raw.templatesUsed.slice(0, 20) : [],
  };
}

export function getWhiteLabelSnapshot(state = null) {
  const stored = normalizeWhiteLabel(state?.whiteLabel);
  const activeBrand =
    stored.brandPacks.find((b) => b.id === stored.activeBrandId) || DEFAULT_BRAND_PACK;
  const installed = EXTENSION_REGISTRY.filter((e) => stored.installedExtensions.includes(e.id));

  return wrapEngineSnapshot({
    initialized: true,
    activeBrand,
    brandPacks: stored.brandPacks,
    templates: Object.values(ADVENTURE_TEMPLATES),
    extensions: EXTENSION_REGISTRY,
    installedExtensions: installed,
    dependencyGraph: installed.map((e) => ({
      id: e.id,
      dependsOn: e.required ? [] : ['ext-marketplace'],
    })),
    stats: {
      brandCount: stored.brandPacks.length,
      extensionCount: installed.length,
      templateCount: Object.keys(ADVENTURE_TEMPLATES).length,
    },
    simulated: true,
    stored,
  });
}

export function applyBrandPack(state, brandId) {
  const stored = normalizeWhiteLabel(state?.whiteLabel);
  const pack = stored.brandPacks.find((b) => b.id === brandId);
  if (!pack) return { ok: false, message: 'Brand pack not found.', state };
  return {
    ok: true,
    brand: pack,
    state: { ...state, whiteLabel: { ...stored, activeBrandId: brandId } },
  };
}

export function installExtension(state, extensionId) {
  const stored = normalizeWhiteLabel(state?.whiteLabel);
  if (!EXTENSION_REGISTRY.some((e) => e.id === extensionId)) {
    return { ok: false, message: 'Unknown extension.', state };
  }
  const installed = [...new Set([...stored.installedExtensions, extensionId])];
  return {
    ok: true,
    state: { ...state, whiteLabel: { ...stored, installedExtensions: installed } },
  };
}

export function recordTemplateUse(state, templateId) {
  const stored = normalizeWhiteLabel(state?.whiteLabel);
  const exists = Object.values(ADVENTURE_TEMPLATES).some((t) => t.id === templateId);
  if (!exists) {
    return { ok: false, message: 'Unknown template.', state };
  }
  return {
    ok: true,
    state: {
      ...state,
      whiteLabel: {
        ...stored,
        templatesUsed: [templateId, ...stored.templatesUsed.filter((t) => t !== templateId)].slice(0, 20),
      },
    },
  };
}
