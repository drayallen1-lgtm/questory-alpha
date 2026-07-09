import { describe, expect, it, vi } from 'vitest';
import {
  ATLAS_CAMERA_MOVE_REASONS,
  createMapCameraController,
} from '../../src/mapCamera.js';

describe('mapCamera atlas guards', () => {
  it('blocks initialUser recenter after atlas camera is applied', () => {
    const ctrl = createMapCameraController(() => ({}));
    ctrl.setLivingAtlas(true);
    ctrl.markInitialAtlasCameraApplied();

    const moveFn = vi.fn();
    const ok = ctrl.requestCameraMove(ATLAS_CAMERA_MOVE_REASONS.INITIAL_USER, moveFn);

    expect(ok).toBe(false);
    expect(moveFn).not.toHaveBeenCalled();
  });

  it('allows Find Me after atlas camera is applied', () => {
    const map = { flyTo: vi.fn() };
    const ctrl = createMapCameraController(() => map);
    ctrl.setLivingAtlas(true);
    ctrl.markInitialAtlasCameraApplied();

    const moveFn = vi.fn();
    const ok = ctrl.requestCameraMove(ATLAS_CAMERA_MOVE_REASONS.FIND_ME, moveFn);

    expect(ok).toBe(true);
    expect(moveFn).toHaveBeenCalledWith(map);
  });

  it('allows venue fly-to after atlas camera is applied', () => {
    const map = {};
    const ctrl = createMapCameraController(() => map);
    ctrl.setLivingAtlas(true);
    ctrl.markInitialAtlasCameraApplied();

    const moveFn = vi.fn();
    expect(ctrl.requestCameraMove(ATLAS_CAMERA_MOVE_REASONS.VENUE, moveFn)).toBe(true);
  });

  it('does not block moves before atlas camera is applied', () => {
    const ctrl = createMapCameraController(() => ({}));
    ctrl.setLivingAtlas(true);

    const moveFn = vi.fn();
    expect(ctrl.requestCameraMove(ATLAS_CAMERA_MOVE_REASONS.INITIAL_USER, moveFn)).toBe(true);
    expect(moveFn).toHaveBeenCalled();
  });
});
