import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Gift,
  MapPin,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import {
  buildPartnerSettlementHistory,
  getPartnerSnapshot,
  PARTNER_TYPES,
} from './partnerOperationsEngine';
import { getPaymentSnapshot } from './paymentEngine';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'traffic', label: 'Adventure Traffic' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'settlements', label: 'Settlements' },
];

function Metric({ label, value, sub }) {
  return (
    <div className="card mini">
      <small>{label}</small>
      <strong>{value}</strong>
      {sub && <span className="admin-meta">{sub}</span>}
    </div>
  );
}

export function PartnerDashboard({ state, adventures = [], nav, partnerId = 'parsons-tourism' }) {
  const [tab, setTab] = useState('overview');

  const snapshot = useMemo(
    () => getPartnerSnapshot(state, adventures, { partnerId }),
    [state, adventures, partnerId]
  );
  const payment = useMemo(() => getPaymentSnapshot(state, adventures), [state, adventures]);
  const partner = snapshot.partners.find((p) => p.id === partnerId) || snapshot.partners[0];
  const analytics = snapshot.analyticsForPartner;
  const settlements = useMemo(() => buildPartnerSettlementHistory(state), [state]);

  if (!partner) return null;

  return (
    <div className="partner-dashboard">
      <div className="section-head">
        <div>
          <h2>Partner Dashboard</h2>
          <p>{partner.icon} {partner.name} · {partner.type.replace(/_/g, ' ')}</p>
        </div>
        <button type="button" className="ghost" onClick={() => nav('home')}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <span className="payments-sim-badge">SIMULATED partner operations</span>

      <div className="vault-tabs-scroll">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid creator-metrics-row">
          <Metric label="Verified" value={partner.verified ? 'Yes' : 'Pending'} />
          <Metric label="Active Campaigns" value={snapshot.stats.activeCampaignCount} />
          <Metric label="Adventure Traffic" value={analytics.adventureTraffic} />
          <Metric label="Revenue (sim)" value={`$${(analytics.revenueCents / 100).toFixed(0)}`} />
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="payments-queue-list">
          {snapshot.campaigns.filter((c) => c.partnerId === partnerId).map((c) => (
            <div key={c.id} className="card partner-campaign-card">
              <strong>{c.title}</strong>
              <p>{c.status} · ${(c.spentCents / 100).toFixed(0)} / ${(c.budgetCents / 100).toFixed(0)}</p>
              <p className="admin-meta">{c.adventureIds?.join(', ')}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'traffic' && (
        <div className="card">
          <h4><MapPin size={16} /> Adventure Traffic</h4>
          <p><strong>{analytics.adventureTraffic}</strong> sessions this period</p>
          <p className="admin-meta">Sponsored adventures drive map heat and Living World timeline.</p>
        </div>
      )}

      {tab === 'discovery' && (
        <div className="card">
          <h4><TrendingUp size={16} /> Discovery Analytics</h4>
          <Metric label="Discovery views" value={analytics.discoveryViews} />
        </div>
      )}

      {tab === 'coupons' && (
        <div className="card">
          <h4>Coupons Redeemed</h4>
          <p><strong>{analytics.couponsRedeemed}</strong> redemptions</p>
        </div>
      )}

      {tab === 'rewards' && (
        <div className="card">
          <h4><Gift size={16} /> Reward Redemptions</h4>
          <p><strong>{analytics.rewardRedemptions}</strong> rewards claimed via partner campaigns</p>
        </div>
      )}

      {tab === 'revenue' && (
        <div className="card">
          <h4><BarChart3 size={16} /> Revenue</h4>
          <p>Partner share: <strong>${(analytics.revenueCents / 100).toFixed(2)}</strong></p>
          <p className="admin-meta">Treasury pending: ${(payment.treasury.platformPending / 100).toFixed(0)}</p>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="payments-queue-list">
          {snapshot.invoices.filter((i) => i.partnerId === partnerId).map((inv) => (
            <div key={inv.id} className="card">
              <strong><Receipt size={14} /> {inv.id}</strong>
              <p>${(inv.amountCents / 100).toFixed(2)} · {inv.status}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'settlements' && (
        <div className="payments-queue-list">
          {settlements.map((s) => (
            <div key={s.id} className="card">
              <strong>{s.label}</strong>
              <p>${(s.amountCents / 100).toFixed(2)} · {s.status}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h4>Partner Types</h4>
        <div className="chips">
          {Object.values(PARTNER_TYPES).map((t) => (
            <span key={t}>{t.replace(/_/g, ' ')}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
