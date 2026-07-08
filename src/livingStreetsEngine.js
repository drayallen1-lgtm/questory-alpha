/**
 * Questory V3 — Living streets ambient life (metadata for map overlays)
 */
import { wrapEngineSnapshot } from './engineSnapshotUtils.js';
import { WORLD_CAMERA_ZOOM } from './worldCameraEngine.js';

function stableOffset(seed, range = 0.0004) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h << 5) - h + seed.charCodeAt(i);
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * range;
}

export function getLivingStreetsSnapshot(options = {}) {
  const {
    zoom = WORLD_CAMERA_ZOOM.STREET_BLOCKS,
    livingWorld = {},
    faction = {},
    now = Date.now(),
  } = options;

  const visible = zoom >= WORLD_CAMERA_ZOOM.STREET;
  const explorerDots = (livingWorld.explorerDots || []).slice(0, 8).map((dot, i) => ({
    id: dot.id || `explorer-${i}`,
    kind: 'explorer',
    latitude: (dot.latitude ?? 37.339) + stableOffset(`e-${i}`, 0.0002),
    longitude: (dot.longitude ?? -95.261) + stableOffset(`e-${i}-lng`, 0.0002),
    label: dot.name || 'Explorer',
    drift: true,
  }));

  const patrols =
    (faction.contestedCount || 0) > 0
      ? [
          {
            id: 'guild-patrol-1',
            kind: 'patrol',
            latitude: 37.3388 + stableOffset('patrol', 0.0003),
            longitude: -95.2605 + stableOffset('patrol-lng', 0.0003),
            label: 'Guild patrol',
            drift: true,
          },
        ]
      : [];

  const wagons = [
    {
      id: 'merchant-wagon',
      kind: 'wagon',
      latitude: 37.3395 + stableOffset('wagon', 0.00025),
      longitude: -95.2588 + stableOffset('wagon-lng', 0.00025),
      label: 'Merchant wagon',
      drift: true,
    },
  ];

  const ambient = [
    { id: 'fog-veil', kind: 'fog', active: zoom >= 13 && zoom <= 15 },
    { id: 'fireflies', kind: 'fireflies', active: visible && new Date(now).getHours() >= 19 },
    { id: 'cloud-shadow', kind: 'clouds', active: zoom <= 12 },
    { id: 'birds', kind: 'birds', active: visible && new Date(now).getHours() < 20 },
  ];

  return wrapEngineSnapshot({
    zoom,
    visible,
    dots: [...explorerDots, ...patrols, ...wagons],
    ambient,
    className: ambient
      .filter((a) => a.active)
      .map((a) => `world-streets--${a.kind}`)
      .join(' '),
  });
}
