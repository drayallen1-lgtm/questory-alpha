import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Pause,
  Play,
  QrCode,
  Rocket,
  ShieldCheck,
  Target,
  Wallet,
} from 'lucide-react';
import { formatUserErrorMessage } from './claimSystem';
import {
  depositSponsorCredits,
  redeemCouponByQr,
} from './economy';
import { SponsorMarketplacePanel } from './ExpansionUI';
import { SponsorRewardInventoryPanel } from './RewardInventoryUI';
import {
  buildCampaignLaunchForm,
  CAMPAIGN_TYPE_IDS,
  getSponsorHomeSnapshot,
  SPONSOR_TAB_IDS,
} from './sponsorExperienceEngine';
import {
  buildSponsorExpressAdventureSync,
  publishQuickAdventure,
} from './invitation';
import { markPersonaTested, trackCreatePublished } from './stability';
import { upsertAdventure } from './supabase/dataService';

function SponsorTabBar({ tabs, activeTab, onSelect }) {
  return (
    <div className="sponsor-home-tabs vault-tabs-scroll" role="tablist" aria-label="Sponsor home">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function SponsorLaunchPanel({
  state,
  setState,
  userId,
  isSupabaseMode,
  campaignType = CAMPAIGN_TYPE_IDS.LAUNCH_PROMOTION,
  compact = false,
  onCampaignTypeChange,
}) {
  const snapshot = useMemo(
    () => getSponsorHomeSnapshot(state, state?.adventures || [], { campaignType }),
    [state, campaignType]
  );
  const selected = snapshot.selectedCampaign;
  const [form, setForm] = useState({
    businessName: snapshot.sponsorName === "McDonald's Parsons" ? '' : snapshot.sponsorName,
    couponValue: selected.defaultCoupon,
    durationDays: '14',
    city: 'Parsons',
  });
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');

  async function launch() {
    if (!form.businessName.trim()) {
      setError('Enter your business name to launch.');
      return;
    }
    setLaunching(true);
    setError('');
    try {
      const launchForm = buildCampaignLaunchForm(campaignType, form);
      const adventure = buildSponsorExpressAdventureSync(launchForm, { userId });
      adventure.title = launchForm.title;
      adventure.story = launchForm.story;
      if (isSupabaseMode && userId) {
        await upsertAdventure(adventure, userId);
      }
      setState((s) =>
        markPersonaTested(
          trackCreatePublished(publishQuickAdventure(s, adventure, { goToInvite: true })),
          'sponsor'
        )
      );
    } catch (err) {
      setError(formatUserErrorMessage(err) || 'Could not launch campaign.');
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className={`card sponsor-launch-panel${compact ? ' sponsor-launch-panel--compact' : ''}`}>
      {!compact && (
        <>
          <div className="sponsor-launch-head">
            <h3>
              <Rocket size={18} /> Launch a Campaign
            </h3>
            <p className="admin-meta">Pick an outcome — Questory turns it into a living map promotion.</p>
          </div>
          <div className="sponsor-campaign-grid">
            {snapshot.campaignTypes.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                className={`sponsor-campaign-card${
                  campaign.id === campaignType ? ' sponsor-campaign-card--active' : ''
                }`}
                onClick={() => onCampaignTypeChange?.(campaign.id)}
              >
                <span className="sponsor-campaign-icon" aria-hidden>
                  {campaign.icon}
                </span>
                <strong>{campaign.label}</strong>
                <small>{campaign.outcome}</small>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="sponsor-launch-outcome">
        <Target size={16} aria-hidden />
        <span>{selected.outcome}</span>
      </div>
      <p className="admin-meta">{selected.description}</p>

      <label>Business name</label>
      <input
        value={form.businessName}
        onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))}
        placeholder="Main Street Coffee"
      />
      <label>Reward hunters unlock</label>
      <input
        value={form.couponValue}
        onChange={(event) => setForm((current) => ({ ...current, couponValue: event.target.value }))}
        placeholder={selected.defaultCoupon}
      />
      <label>Campaign duration (days)</label>
      <input
        type="number"
        value={form.durationDays}
        onChange={(event) => setForm((current) => ({ ...current, durationDays: event.target.value }))}
      />
      <label>City</label>
      <input
        value={form.city}
        onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
        placeholder="Parsons"
      />
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="sponsor-launch-cta" onClick={launch} disabled={launching}>
        {launching ? 'Lighting up the map…' : `Launch ${selected.label}`}
      </button>
    </div>
  );
}

function SponsorOverviewPanel({ snapshot, onSelectTab }) {
  return (
    <div className="sponsor-overview-grid">
      <div className="card sponsor-hero">
        <Building2 size={28} />
        <h3>{snapshot.sponsorName}</h3>
        <p className="sponsor-hero-outcome">
          Turn explorers into customers — launch a promotion that lights up the living world map.
        </p>
      </div>
      <div className="grid sponsor-metrics">
        <div className="card mini metric">
          <small>Active Campaigns</small>
          <strong>{snapshot.analytics.activeAdventures}</strong>
        </div>
        <div className="card mini metric">
          <small>Completed Hunts</small>
          <strong>{snapshot.analytics.completedHunts}</strong>
        </div>
        <div className="card mini metric">
          <small>Coupons Redeemed</small>
          <strong>{snapshot.analytics.couponsRedeemed}</strong>
        </div>
        <div className="card mini metric">
          <small>Foot Traffic</small>
          <strong>{snapshot.analytics.footTraffic}</strong>
        </div>
      </div>
      <div className="sponsor-outcome-cards">
        {snapshot.outcomes.slice(0, 3).map((outcome) => (
          <button
            key={outcome.id}
            type="button"
            className="card sponsor-outcome-card"
            onClick={() => onSelectTab(SPONSOR_TAB_IDS.LAUNCH, outcome.id)}
          >
            <span aria-hidden>{outcome.icon}</span>
            <div>
              <strong>{outcome.label}</strong>
              <small>{outcome.outcome}</small>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SponsorCampaignsPanel({ snapshot, paused, setPaused }) {
  return (
    <div className="card">
      <h3>Live Campaigns</h3>
      {!snapshot.campaigns.length && (
        <p className="admin-meta">No live campaigns yet — launch one to light up the map.</p>
      )}
      {snapshot.campaigns.map((campaign) => (
        <div className="campaign-row" key={campaign.id}>
          <div>
            <b>{campaign.title}</b>
            <small>{campaign.playersCompleted || 0} completions</small>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={() => setPaused((current) => ({ ...current, [campaign.id]: !current[campaign.id] }))}
          >
            {paused[campaign.id] ? <Play size={14} /> : <Pause size={14} />}
            {paused[campaign.id] ? 'Resume' : 'Pause'}
          </button>
        </div>
      ))}
    </div>
  );
}

function SponsorAnalyticsPanel({ snapshot }) {
  const { analytics } = snapshot;
  return (
    <div className="card">
      <h3>
        <BarChart3 size={18} /> Campaign Analytics
      </h3>
      <ul className="analytics-list">
        <li>
          Adventure opens: <strong>{analytics.adventureOpens}</strong>
        </li>
        <li>
          Completions: <strong>{analytics.completedHunts}</strong>
        </li>
        <li>
          Coupon redemptions: <strong>{analytics.couponsRedeemed}</strong>
        </li>
        <li>
          First-time visitors: <strong>{analytics.firstTimeVisitors}</strong>
        </li>
        <li>
          Repeat visitors: <strong>{analytics.repeatVisitors}</strong>
        </li>
      </ul>
      <div className="sponsor-spend-row">
        <div>
          <small>Questory Spend</small>
          <strong>${analytics.questorySpend}</strong>
        </div>
        <div>
          <small>Estimated Revenue</small>
          <strong>${analytics.estimatedRevenue.toLocaleString()}</strong>
        </div>
      </div>
    </div>
  );
}

function SponsorRewardsPanel({ state, setState, adventures, snapshot, qrInput, setQrInput, scanMsg, setScanMsg }) {
  function handleDeposit() {
    setState((s) => depositSponsorCredits(s, 125, 'Sponsor credit deposit'));
  }

  function handleScanCoupon() {
    const result = redeemCouponByQr(state, qrInput.trim());
    if (!result.ok) {
      setScanMsg(formatUserErrorMessage(result));
      return;
    }
    setState(result.state);
    setScanMsg(`Redeemed: ${result.reward.title}`);
    setQrInput('');
  }

  return (
    <>
      <div className="card">
        <h3>
          <Wallet size={18} /> Sponsor Wallet
        </h3>
        <p>
          Balance: <strong>${snapshot.wallet.balanceCredits?.toFixed(2) || '0.00'}</strong> credits
        </p>
        <p className="admin-meta">Fund campaigns and reward redemptions</p>
        <button type="button" onClick={handleDeposit}>
          Deposit $125 Credits
        </button>
      </div>
      <div className="card">
        <h3>
          <QrCode size={18} /> Scan Coupon QR
        </h3>
        <input
          value={qrInput}
          onChange={(event) => setQrInput(event.target.value)}
          placeholder="Paste customer coupon QR payload"
        />
        <button type="button" onClick={handleScanCoupon}>
          Mark Redeemed
        </button>
        {scanMsg && <p className="loc-feedback">{scanMsg}</p>}
      </div>
      <SponsorRewardInventoryPanel
        state={state}
        setState={setState}
        adventures={adventures}
        sponsorName={snapshot.sponsorName}
      />
      <SponsorMarketplacePanel state={state} setState={setState} />
    </>
  );
}

export function SponsorExperienceUI({ state, adventures, auth, setState, nav, userId, isSupabaseMode }) {
  const sponsorName = auth?.profile?.display_name || auth?.profile?.business_name || "McDonald's Parsons";
  const [paused, setPaused] = useState({});
  const [qrInput, setQrInput] = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const [campaignType, setCampaignType] = useState(
    state?.sponsorCampaignType || CAMPAIGN_TYPE_IDS.LAUNCH_PROMOTION
  );

  const snapshot = useMemo(
    () =>
      getSponsorHomeSnapshot(state, adventures, {
        sponsorName,
        tab: state?.sponsorTab,
        campaignType,
      }),
    [state, adventures, sponsorName, campaignType]
  );

  function selectTab(tab, nextCampaignType = campaignType) {
    setState((current) => ({
      ...current,
      sponsorTab: tab,
      sponsorCampaignType: nextCampaignType,
      quickSponsor: tab === SPONSOR_TAB_IDS.LAUNCH,
    }));
    if (nextCampaignType !== campaignType) {
      setCampaignType(nextCampaignType);
    }
  }

  return (
    <div className="sponsor-home">
      <div className="section-head sponsor-home-head">
        <div>
          <h2>Sponsor Home</h2>
          <p>Launch promotions that light up the map and bring explorers to your door.</p>
        </div>
        {auth?.profile?.role === 'sponsor' && (
          <span className="verified-sponsor-badge">
            <ShieldCheck size={14} /> Verified Sponsor
          </span>
        )}
      </div>

      <SponsorTabBar tabs={snapshot.tabs} activeTab={snapshot.tab} onSelect={selectTab} />

      {snapshot.tab === SPONSOR_TAB_IDS.OVERVIEW && (
        <SponsorOverviewPanel snapshot={snapshot} onSelectTab={selectTab} />
      )}

      {snapshot.tab === SPONSOR_TAB_IDS.LAUNCH && (
        <SponsorLaunchPanel
          state={{ ...state, adventures }}
          setState={setState}
          userId={userId}
          isSupabaseMode={isSupabaseMode}
          campaignType={campaignType}
          onCampaignTypeChange={(id) => selectTab(SPONSOR_TAB_IDS.LAUNCH, id)}
        />
      )}

      {snapshot.tab === SPONSOR_TAB_IDS.CAMPAIGNS && (
        <SponsorCampaignsPanel snapshot={snapshot} paused={paused} setPaused={setPaused} />
      )}

      {snapshot.tab === SPONSOR_TAB_IDS.ANALYTICS && <SponsorAnalyticsPanel snapshot={snapshot} />}

      {snapshot.tab === SPONSOR_TAB_IDS.REWARDS && (
        <SponsorRewardsPanel
          state={state}
          setState={setState}
          adventures={adventures}
          snapshot={snapshot}
          qrInput={qrInput}
          setQrInput={setQrInput}
          scanMsg={scanMsg}
          setScanMsg={setScanMsg}
        />
      )}

      <button type="button" className="ghost" onClick={() => nav('create')}>
        Build a custom sponsored adventure
      </button>
    </div>
  );
}
