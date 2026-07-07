import { describe, expect, it } from 'vitest';
import {
  LAUNCH_STEP_IDS,
  buildLaunchPreview,
  generateLaunchDraft,
  getAdventureLaunchSnapshot,
  launchDraftToSaveOverrides,
  resolveLaunchStep,
} from '../../src/adventureLaunchEngine.js';
import { buildTestState } from './fixtures.js';

describe('adventureLaunchEngine', () => {
  it('defaults to the describe step', () => {
    expect(resolveLaunchStep(null, buildTestState())).toBe(LAUNCH_STEP_IDS.DESCRIBE);
  });

  it('generates a launch draft from a prompt', () => {
    const draft = generateLaunchDraft('Haunted backyard ghost hunt for teens');
    expect(draft.ok).toBe(true);
    expect(draft.clues.length).toBeGreaterThan(0);
    expect(draft.meta.title).toBeTruthy();
  });

  it('builds a preview with clue pins and rewards', () => {
    const draft = generateLaunchDraft('Family backyard treasure hunt');
    const preview = buildLaunchPreview(draft);
    expect(preview.ready).toBe(true);
    expect(preview.clues.length).toBeGreaterThan(0);
    expect(preview.rewards.length).toBeGreaterThan(0);
  });

  it('exposes launch flow steps in snapshot', () => {
    const draft = generateLaunchDraft('Educational history trail for my classroom');
    const snapshot = getAdventureLaunchSnapshot(buildTestState(), {
      step: LAUNCH_STEP_IDS.PREVIEW,
      prompt: 'Educational history trail for my classroom',
      draft,
    });
    expect(snapshot.steps).toHaveLength(4);
    expect(snapshot.step).toBe(LAUNCH_STEP_IDS.PREVIEW);
    expect(snapshot.preview.title).toBeTruthy();
  });

  it('maps launch drafts to save overrides', () => {
    const draft = generateLaunchDraft('Sponsor promotion hunt with coupon reward');
    const overrides = launchDraftToSaveOverrides(draft);
    expect(overrides?.meta?.title).toBeTruthy();
    expect(overrides?.clues?.length).toBeGreaterThan(0);
    expect(overrides?.rewards?.length).toBeGreaterThan(0);
  });
});
