import { describe, expect, it } from 'vitest';
import {
  createPendingPayment,
  getPaymentSnapshot,
  getWalletSummary,
  recordPayment,
  recordRefund,
  WALLET_TYPES,
} from '../../src/paymentEngine.js';
import { buildTestState } from './fixtures.js';

describe('paymentEngine', () => {
  it('snapshot loads with wallets and simulated flag', () => {
    const state = buildTestState();
    const snapshot = getPaymentSnapshot(state, state.adventures);

    expect(snapshot.initialized).toBe(true);
    expect(snapshot.simulated).toBe(true);
    expect(snapshot.livePaymentsEnabled).toBe(false);
    expect(snapshot.wallets[WALLET_TYPES.EXPLORER]).toBeTruthy();
    expect(snapshot.stats.transactionCount).toBeGreaterThan(0);
  });

  it('wallet summary calculates total balance', () => {
    const state = buildTestState({ coins: 500 });
    const summary = getWalletSummary(state, WALLET_TYPES.EXPLORER);
    expect(summary.totalBalance).toBeGreaterThanOrEqual(500);
    expect(summary.simulated).toBe(true);
  });

  it('createPendingPayment does not mutate unrelated state', () => {
    const state = buildTestState();
    const before = JSON.stringify(state.progress);
    const result = createPendingPayment(state, { amountCents: 999, label: 'Test' });
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result.state.progress)).toBe(before);
    expect(result.state.payment.pendingPayments.length).toBeGreaterThan(0);
  });

  it('recordPayment completes pending payment', () => {
    const pending = createPendingPayment(buildTestState(), { amountCents: 1200, label: 'Checkout' });
    const payId = pending.payment.id;
    const result = recordPayment(pending.state, payId);
    expect(result.ok).toBe(true);
    expect(result.payment.status).toBe('completed');
  });

  it('recordRefund queues refund without live transfer', () => {
    const state = buildTestState();
    const result = recordRefund(state, { amountCents: 500, reason: 'Test' });
    expect(result.ok).toBe(true);
    expect(result.state.payment.refunds.length).toBeGreaterThan(0);
    expect(result.refund.simulated).toBe(true);
  });
});
