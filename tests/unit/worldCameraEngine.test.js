import { describe, expect, it } from 'vitest';
import {
  DOWNTOWN_PARSONS,
  resolveInitialCamera,
  resolveWorldScaleLevel,
  WORLD_CAMERA_ZOOM,
  buildCameraRememberPatch,
} from '../../src/worldCameraEngine.js';

describe('worldCameraEngine', () => {
  it('opens at street-block zoom on downtown fallback', () => {
    const camera = resolveInitialCamera({ adventures: [] });
    expect(camera.zoom).toBe(WORLD_CAMERA_ZOOM.STREET_BLOCKS);
    expect(camera.latitude).toBe(DOWNTOWN_PARSONS.latitude);
    expect(camera.source).toBe('downtown');
  });

  it('prefers player location when available', () => {
    const camera = resolveInitialCamera({
      userLocation: { latitude: 37.34, longitude: -95.26 },
      adventures: [],
    });
    expect(camera.source).toBe('player');
    expect(camera.zoom).toBeGreaterThanOrEqual(WORLD_CAMERA_ZOOM.STREET);
  });

  it('restores remembered camera position', () => {
    const remembered = {
      latitude: 37.34,
      longitude: -95.26,
      zoom: 15.2,
      lastSavedAt: '2026-01-01T00:00:00.000Z',
    };
    const camera = resolveInitialCamera({
      userLocation: { latitude: 37.33, longitude: -95.25 },
      remembered,
    });
    expect(camera.source).toBe('remembered');
    expect(camera.zoom).toBe(15.2);
  });

  it('maps zoom to continuous world scale levels', () => {
    expect(resolveWorldScaleLevel(16)).toBe('building');
    expect(resolveWorldScaleLevel(14.5)).toBe('street');
    expect(resolveWorldScaleLevel(2)).toBe('country');
  });

  it('persists camera remember patch in state shape', () => {
    const patch = buildCameraRememberPatch({
      latitude: 37.34,
      longitude: -95.26,
      zoom: 15,
    });
    expect(patch.lastSavedAt).toBeTruthy();
    expect(patch.zoom).toBe(15);
    expect(patch.latitude).toBe(37.34);
    expect(patch.longitude).toBe(-95.26);
  });
});
