import { describe, expect, it } from 'vitest';
import {
  applyBrandPack,
  getWhiteLabelSnapshot,
  installExtension,
} from '../../src/whiteLabelEngine.js';
import { buildTestState } from './fixtures.js';

describe('whiteLabelEngine', () => {
  it('snapshot includes templates and extensions', () => {
    const snapshot = getWhiteLabelSnapshot(buildTestState());
    expect(snapshot.initialized).toBe(true);
    expect(snapshot.templates.length).toBeGreaterThan(5);
    expect(snapshot.installedExtensions.length).toBeGreaterThan(0);
  });

  it('installExtension adds module', () => {
    const state = buildTestState();
    const result = installExtension(state, 'ext-white-label');
    expect(result.ok).toBe(true);
    expect(result.state.whiteLabel.installedExtensions).toContain('ext-white-label');
  });

  it('applyBrandPack switches active brand', () => {
    const result = applyBrandPack(buildTestState(), 'questory-alpha');
    expect(result.ok).toBe(true);
  });
});
