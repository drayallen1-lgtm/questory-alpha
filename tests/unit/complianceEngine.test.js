import { describe, expect, it } from 'vitest';
import {
  getComplianceSnapshot,
  KYC_STATUS,
  queueManualReview,
  updateKycStatus,
} from '../../src/complianceEngine.js';
import { buildTestState } from './fixtures.js';

describe('complianceEngine', () => {
  it('snapshot loads with KYC and tax status', () => {
    const snapshot = getComplianceSnapshot(buildTestState());
    expect(snapshot.initialized).toBe(true);
    expect(snapshot.kycStatus).toBeTruthy();
    expect(snapshot.taxStatus).toBeTruthy();
    expect(snapshot.liveVerificationEnabled).toBe(false);
  });

  it('queueManualReview adds review item', () => {
    const result = queueManualReview(buildTestState(), {
      subjectType: 'creator',
      subjectId: 'test',
      reason: 'Document check',
    });
    expect(result.ok).toBe(true);
    expect(result.state.compliance.manualReviewQueue.length).toBeGreaterThan(0);
  });

  it('updateKycStatus sets identity verified on verified status', () => {
    const result = updateKycStatus(buildTestState(), KYC_STATUS.VERIFIED);
    expect(result.ok).toBe(true);
    expect(result.state.compliance.identityVerified).toBe(true);
  });
});
