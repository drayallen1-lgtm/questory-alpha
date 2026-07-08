/**
 * Questory V3 — Immersive audio framework (zones only — muted by default, no sounds)
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { WORLD_CAMERA_ZOOM } from './worldCameraEngine.js';

export const AUDIO_ZONE_IDS = {
  FOREST: 'forest',
  CITY: 'city',
  WATER: 'water',
  CHURCH: 'church',
  MARKET: 'market',
  GHOST: 'ghost',
  WIND: 'wind',
  BIRDS: 'birds',
};

const BASE_ZONES = [
  { id: AUDIO_ZONE_IDS.CITY, label: 'City hum', minZoom: 12, peakZoom: 15 },
  { id: AUDIO_ZONE_IDS.MARKET, label: 'Market bustle', minZoom: 14, peakZoom: 16 },
  { id: AUDIO_ZONE_IDS.WATER, label: 'Water lap', minZoom: 11, peakZoom: 13 },
  { id: AUDIO_ZONE_IDS.GHOST, label: 'Ghost whisper', minZoom: 14, peakZoom: 16 },
  { id: AUDIO_ZONE_IDS.CHURCH, label: 'Church bell', minZoom: 15, peakZoom: 17 },
  { id: AUDIO_ZONE_IDS.BIRDS, label: 'Birdsong', minZoom: 13, peakZoom: 15 },
  { id: AUDIO_ZONE_IDS.WIND, label: 'Wind', minZoom: 8, peakZoom: 11 },
  { id: AUDIO_ZONE_IDS.FOREST, label: 'Forest', minZoom: 10, peakZoom: 12 },
];

function zoneVolume(zoom, zone) {
  if (zoom <= zone.minZoom || zoom >= zone.maxZoom) return 0;
  const peak = zone.peakZoom ?? (zone.minZoom + zone.maxZoom) / 2;
  const dist = Math.abs(zoom - peak);
  const spread = (zone.maxZoom - zone.minZoom) / 2;
  return Math.max(0, 1 - dist / spread);
}

export function getImmersiveAudioSnapshot(options = {}) {
  const {
    zoom = WORLD_CAMERA_ZOOM.STREET_BLOCKS,
    muted = true,
    buildings = [],
    geography = {},
  } = options;

  const hasGhost = buildings.some((b) => b.role === 'haunted' && b.intensity > 0.6);
  const hasMarket = buildings.some((b) => b.role === 'market' || b.role === 'merchant');

  const zones = BASE_ZONES.map((z) => {
    const maxZoom = z.maxZoom ?? z.peakZoom + 2;
    let volume = zoneVolume(zoom, { ...z, maxZoom });
    if (z.id === AUDIO_ZONE_IDS.GHOST && !hasGhost) volume *= 0.2;
    if (z.id === AUDIO_ZONE_IDS.MARKET && hasMarket) volume = Math.min(1, volume * 1.3);
    if (z.id === AUDIO_ZONE_IDS.WATER && geography.features?.some((f) => f.type === 'water')) {
      volume = Math.min(1, volume * 1.2);
    }
    return {
      ...z,
      maxZoom,
      volume: muted ? 0 : volume,
      active: volume > 0.08,
    };
  });

  return wrapEngineSnapshot({
    muted,
    zoom,
    zones: zones.filter((z) => z.active),
    masterVolume: muted ? 0 : Math.min(1, zoom / WORLD_CAMERA_ZOOM.STREET_BLOCKS),
  });
}

export function emitAudioZoneEvent(zoneId, payload = {}) {
  if (typeof window === 'undefined') return;
  const bus = window.questoryImmersiveAudio;
  if (!bus || typeof bus.emit !== 'function') return;
  try {
    bus.emit(zoneId, payload);
  } catch {
    /* framework only */
  }
}
