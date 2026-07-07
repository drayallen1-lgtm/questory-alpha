import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CreditCard,
  RefreshCw,
  Shield,
  Wallet,
} from 'lucide-react';
import {
  getPaymentSnapshot,
  getWalletSummary,
  recordRefund,
  recordSettlement,
  STRIPE_EXTENSION_HOOKS,
  WALLET_TYPES,
} from './paymentEngine';
import { getComplianceSnapshot } from './complianceEngine';
import { getRiskSnapshot } from './riskEngine';
import { getPartnerSnapshot } from './partnerOperationsEngine';
import { isDev } from './config/env';

const ADMIN_TABS = [
  { id: 'treasury', label: 'Treasury' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'payouts', label: 'Pending Payouts' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'partners', label: 'Partner Campaigns' },
  { id: 'risk', label: 'Risk Alerts' },
  { id: 'settlements', label: 'Settlements' },
  { id: 'reviews', label: 'Manual Reviews' },
  { id: 'compliance', label: 'Compliance' },
];

function RiskChip({ level }) {
  return <span className={`payments-risk-chip ${level}`}>{level}</span>;
}

export function WalletPassportPanel({ state, adventures = [] }) {
  const payment = useMemo(() => getPaymentSnapshot(state, adventures), [state, adventures]);
  const explorer = getWalletSummary(state, WALLET_TYPES.EXPLORER);
  const creator = getWalletSummary(state, WALLET_TYPES.CREATOR);

  return (
    <div className="wallet-passport-panel">
      <p className="admin-meta">
        Simulated wallets — ready for Stripe Connect. <span className="payments-sim-badge">No live money</span>
      </p>
      <div className="payments-wallet-grid">
        <div className="card mini payments-wallet-card">
          <small>Explorer Wallet</small>
          <strong>{explorer.wallet.available} coins</strong>
          <span className="admin-meta">Pending {explorer.wallet.pending}</span>
        </div>
        <div className="card mini payments-wallet-card">
          <small>Creator Wallet</small>
          <strong>{creator.wallet.available} coins</strong>
          <span className="admin-meta">Withdrawable {creator.wallet.withdrawable}</span>
        </div>
        <div className="card mini payments-wallet-card">
          <small>Marketplace Balance</small>
          <strong>{payment.wallets[WALLET_TYPES.EXPLORER]?.reserved || 0}</strong>
          <span className="admin-meta">Held reserve</span>
        </div>
        <div className="card mini payments-wallet-card">
          <small>Season Rewards</small>
          <strong>{payment.wallets[WALLET_TYPES.SEASON]?.available || 0}</strong>
          <span className="admin-meta">Treasury pool</span>
        </div>
      </div>
      <div className="card">
        <h4>Pending Rewards</h4>
        {payment.pendingPayouts.slice(0, 4).map((p) => (
          <p key={p.id} className="creator-payout-row">
            <span>{p.recipientType} · {p.recipientId}</span>
            <span>${(p.amountCents / 100).toFixed(2)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function PaymentsAdminPanel({ state, setState, adventures = [], nav, isAdmin = false }) {
  const [tab, setTab] = useState('treasury');
  const [message, setMessage] = useState('');

  const canView = isDev || isAdmin;
  const payment = useMemo(
    () => (canView ? getPaymentSnapshot(state, adventures) : null),
    [state, adventures, canView]
  );
  const compliance = useMemo(
    () => (canView ? getComplianceSnapshot(state) : null),
    [state, canView]
  );
  const risk = useMemo(() => (canView ? getRiskSnapshot(state) : null), [state, canView]);
  const partners = useMemo(
    () => (canView ? getPartnerSnapshot(state, adventures) : null),
    [state, adventures, canView]
  );

  if (!canView) {
    return (
      <div className="card empty-vault">
        <Shield size={28} />
        <p>Payments admin is restricted to administrators.</p>
        <button type="button" onClick={() => nav('home')}>Back</button>
      </div>
    );
  }

  const handleSettlement = () => {
    const result = recordSettlement(state, {
      batchLabel: 'Manual simulated batch',
      amountCents: 15000,
      recipientCount: 3,
    });
    setState(result.state);
    setMessage(result.message);
  };

  const handleRefund = () => {
    const result = recordRefund(state, { amountCents: 499, reason: 'Admin test refund' });
    setState(result.state);
    setMessage(result.message);
  };

  return (
    <div className="payments-admin-panel">
      <div className="section-head">
        <div>
          <h2>Payments & Treasury</h2>
          <p>Simulated commercial platform — Stripe-ready, no live transfers</p>
        </div>
        <button type="button" className="ghost" onClick={() => nav('admin')}>
          <ArrowLeft size={16} /> Admin
        </button>
      </div>

      <span className="payments-sim-badge">SIMULATED · Live payments disabled</span>
      {message && <p className="draft-sync-banner" role="status">{message}</p>}

      <div className="vault-tabs-scroll">
        {ADMIN_TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'treasury' && payment && (
        <>
          <div className="payments-treasury-banner">
            <div className="card mini"><small>Treasury</small><strong>{payment.treasury.treasuryAvailable.toLocaleString()} coins</strong></div>
            <div className="card mini"><small>Reserved</small><strong>{payment.treasury.treasuryReserved.toLocaleString()}</strong></div>
            <div className="card mini"><small>Pending</small><strong>{payment.treasury.platformPending.toLocaleString()}</strong></div>
            <div className="card mini"><small>Transactions</small><strong>{payment.stats.transactionCount}</strong></div>
          </div>
          <div className="card">
            <h4><CreditCard size={16} /> Stripe Extension Hooks</h4>
            <div className="chips">
              {Object.entries(STRIPE_EXTENSION_HOOKS).map(([k, v]) => (
                <span key={k}>{v.label} · {v.mode}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'wallets' && payment && (
        <div className="payments-wallet-grid">
          {Object.entries(payment.wallets).map(([type, wallet]) => (
            <div key={type} className="card payments-wallet-card">
              <small>{type}</small>
              <strong>Avail {wallet.available}</strong>
              <p className="admin-meta">Pending {wallet.pending} · Reserved {wallet.reserved}</p>
              <p className="admin-meta">Earned {wallet.earned} · Withdrawable {wallet.withdrawable}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'payouts' && payment && (
        <div className="payments-queue-list">
          {payment.pendingPayouts.map((p) => (
            <div key={p.id} className="card">
              <strong>{p.recipientId}</strong>
              <p>${(p.amountCents / 100).toFixed(2)} · {p.status}</p>
              <p className="admin-meta">Scheduled {new Date(p.scheduledAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'refunds' && payment && (
        <>
          <button type="button" onClick={handleRefund}>Queue Test Refund</button>
          <div className="payments-queue-list">
            {payment.refundQueue.map((r) => (
              <div key={r.id} className="card">
                <strong>${(r.amountCents / 100).toFixed(2)}</strong>
                <p>{r.reason} · {r.status}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'disputes' && payment && (
        <div className="payments-queue-list">
          {payment.disputeQueue.length === 0 ? (
            <p className="admin-meta">No open disputes.</p>
          ) : (
            payment.disputeQueue.map((d) => (
              <div key={d.id} className="card"><strong>{d.label || d.id}</strong><p>{d.status}</p></div>
            ))
          )}
        </div>
      )}

      {tab === 'partners' && partners && (
        <div className="payments-queue-list">
          {partners.activeCampaigns.map((c) => (
            <div key={c.id} className="card partner-campaign-card">
              <strong>{c.title}</strong>
              <p>{c.partnerId} · ${(c.spentCents / 100).toFixed(0)} / ${(c.budgetCents / 100).toFixed(0)}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'risk' && risk && (
        <div className="payments-queue-list">
          {risk.alerts.map((a) => (
            <div key={a.id} className="card">
              <AlertTriangle size={14} /> <RiskChip level={a.level} /> <strong>{a.label}</strong>
              <p className="admin-meta">{a.detail}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'settlements' && payment && (
        <>
          <button type="button" onClick={handleSettlement}><RefreshCw size={14} /> Record Settlement Batch</button>
          <div className="payments-queue-list">
            {payment.settlementQueue.map((s) => (
              <div key={s.id} className="card">
                <strong>{s.batchLabel || s.id}</strong>
                <p>${((s.amountCents || 0) / 100).toFixed(2)} · {s.status}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'reviews' && payment && compliance && (
        <div className="payments-queue-list">
          {[...payment.manualReviewQueue, ...compliance.manualReviewQueue].map((r) => (
            <div key={r.id} className="card">
              <strong>{r.label || r.reason || r.id}</strong>
              <p className="admin-meta">{r.subjectType || r.kind} · {r.priority || r.status}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'compliance' && compliance && (
        <div className="card">
          <h4><Building2 size={16} /> Compliance Status</h4>
          <p>KYC: <strong>{compliance.kycStatus}</strong> · Tax: <strong>{compliance.taxStatus}</strong></p>
          <p>Country: {compliance.country} · Risk score: {compliance.riskScore}</p>
          <p>Identity: {compliance.identityVerified ? 'Verified' : 'Pending'} · Business: {compliance.businessVerified ? 'Verified' : 'Pending'}</p>
          <p className="admin-meta">{compliance.sanctionsPlaceholder}</p>
          <p>Open reviews: {compliance.stats.openReviews}</p>
        </div>
      )}
    </div>
  );
}
