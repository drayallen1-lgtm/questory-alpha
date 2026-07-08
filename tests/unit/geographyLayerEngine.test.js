import { describe, expect, it } from 'vitest';
import { getGeographyLayerSnapshot } from '../../src/geographyLayerEngine.js';
import { WORLD_CAMERA_ZOOM } from '../../src/worldCameraEngine.js';

describe('geographyLayerEngine', () => {
  it('reveals district labels at neighborhood zoom', () => {
    const snapshot = getGeographyLayerSnapshot({ zoom: WORLD_CAMERA_ZOOM.NEIGHBORHOOD });
    expect(snapshot.features.length).toBeGreaterThan(0);
    expect(snapshot.districts.some((d) => d.label.includes('Parsons'))).toBe(true);
  });

  it('fades labels when zoomed too far out', () => {
    const snapshot = getGeographyLayerSnapshot({ zoom: 6 });
    const visibleLabels = snapshot.features.filter((f) => f.showLabel);
    expect(visibleLabels.length).toBeLessThan(
      getGeographyLayerSnapshot({ zoom: WORLD_CAMERA_ZOOM.STREET_BLOCKS }).features.filter(
        (f) => f.showLabel
      ).length
    );
  });

  it('includes landmark types for living atlas', () => {
    const snapshot = getGeographyLayerSnapshot({ zoom: WORLD_CAMERA_ZOOM.STREET_BLOCKS });
    const types = new Set(snapshot.landmarks.map((l) => l.type));
    expect(types.has('water') || types.has('historic') || types.has('park')).toBe(true);
  });
});
