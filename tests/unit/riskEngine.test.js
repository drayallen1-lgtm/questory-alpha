import { describe, expect, it } from 'vitest';
import {
  evaluateRiskSignals,
  getRiskSnapshot,
  RISK_LEVELS,
  recordRiskAlert,
} from '../../src/riskEngine.js';
import { buildTestState } from './fixtures.js';

describe('riskEngine', () => {
  it('snapshot loads with risk level', () => {
    const snapshot = getRiskSnapshot(buildTestState());
    expect(snapshot.initialized).toBe(true);
    expect(Object.values(RISK_LEVELS)).toContain(snapshot.overallLevel);
    expect(snapshot.autoEnforcementEnabled).toBe(false);
  });

  it('evaluateRiskSignals returns array', () => {
    const signals = evaluateRiskSignals(buildTestState());
    expect(Array.isArray(signals)).toBe(true);
  });

  it('detects duplicate marketplace listings', () => {
    const state = buildTestState({
      marketplace: {
        listings: [
          { itemId: 'a', id: '1' },
          { itemId: 'a', id: '2' },
        ],
      },
    });
    const signals = evaluateRiskSignals(state);
    expect(signals.some((s) => s.kind === 'duplicate_listings')).toBe(true);
  });

  it('recordRiskAlert updates overall level', () => {
    const result = recordRiskAlert(buildTestState(), {
      level: RISK_LEVELS.HIGH,
      label: 'Test alert',
    });
    expect(result.ok).toBe(true);
    expect(result.state.risk.alerts.length).toBeGreaterThan(0);
  });
});
