import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  MapPin,
  Trophy,
  Wallet,
  Plus,
  Compass,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  Gift,
  ChevronRight,
  Star,
  Trash2,
  LocateFixed,
  History,
  CheckCircle2,
  Copy,
  Download,
  Share2,
  Award,
  Eye,
  Archive,
  RotateCcw,
  LogOut,
} from 'lucide-react';
import {
  STORAGE_KEY,
  getAdventureProgress,
  rewardTypeLabel,
  rewardStatusLabel,
  formatTimestamp,
  createVaultReward,
  isRedeemable,
  syncClaimHistory,
  upsertCertificate,
  REWARD_STATUS,
  getSponsorInfo,
  REWARD_TYPE_OPTIONS,
  ADVENTURE_STATUS,
  adventureStatusLabel,
  getPublishedAdventures,
  isAdventurePlayable,
  generateClaimCode,
} from './seed';
import {
  CLAIM_METHOD,
  CLAIM_METHOD_OPTIONS,
  autoClaimsOnTap,
  validateClaimAttempt,
  claimMethodLabel,
  validateAdventureClaimFields,
  buildAdventureClaimFields,
  getClaimFieldConfig,
  getAdminClaimSecrets,
} from './claimSystem';
import {
  MedallionSignalScreen,
  FinderModeScreen,
  TreasureClaimPanel,
  ClaimMethodSelector,
  claimMethodUsesFinder as adventureUsesFinder,
} from './MedallionFinder';
import {
  CHECKIN_MESSAGES,
  DEFAULT_RADIUS_METERS,
  formatDistanceAway,
  getCurrentPosition,
  isWithinRadius,
} from './geolocation';
import {
  createCompletionCertificate,
  copyShareText,
  downloadProofCard,
  formatProofDate,
} from './share';
import './style.css';
import { getInitialState, persistState } from './persistence';
import { MapScreen, MiniClueMap } from './QuestoryMap';
import { hasSupabase } from './supabase/client';
import { AuthProvider, useAuth } from './supabase/AuthContext';
import { LoginScreen } from './supabase/LoginScreen';
import { AuthDebugPanel } from './supabase/AuthDebugPanel';
import { parseOAuthCallbackError } from './supabase/authErrors';
import {
  loadRemoteData,
  fetchAllAdventuresForAdmin,
  upsertAdventure,
  updateAdventureStatus,
  deleteAdventureRemote,
  saveUserProfileState,
  upsertUserRewards,
  upsertClaimHistory,
} from './supabase/dataService';

function App() {
  return (
    <AuthProvider>
      <QuestoryApp />
    </AuthProvider>
  );
}

function QuestoryApp() {
  const auth = useAuth();
  const { user, isAdmin, isSupabaseMode, loading: authLoading } = auth;
  const [state, setState] = useState(getInitialState);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [remoteLoading, setRemoteLoading] = useState(isSupabaseMode);
  const [adventureSyncError, setAdventureSyncError] = useState('');

  useEffect(() => {
    const oauthError = parseOAuthCallbackError();
    if (oauthError) {
      setLoginError(oauthError);
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  async function refreshAdventuresFromRemote() {
    if (!isSupabaseMode) return;
    const adventures = await fetchAllAdventuresForAdmin();
    setState((s) => ({ ...s, adventures }));
  }

  useEffect(() => {
    if (!isSupabaseMode || authLoading) return;

    let cancelled = false;
    setRemoteLoading(true);

    (async () => {
      try {
        const remote = await loadRemoteData(user?.id, isAdmin);
        if (cancelled) return;
        setState((s) => ({
          ...s,
          adventures: remote.adventures,
          rewards: user ? remote.rewards : s.rewards,
          claimHistory: user ? remote.claimHistory : s.claimHistory,
          coins: user ? remote.coins : s.coins,
          entries: user ? remote.entries : s.entries,
          progress: user ? remote.progress : s.progress,
        }));
      } catch (err) {
        console.error('Questory Supabase load failed:', err);
        setAdventureSyncError('Could not load adventures from Supabase. Try refreshing the page.');
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, isAdmin, authLoading, isSupabaseMode]);

  function syncProfile(s) {
    if (!isSupabaseMode || !user) return;
    saveUserProfileState(user.id, {
      coins: s.coins,
      entries: s.entries,
      progress: s.progress,
    }).catch((err) => console.error('Profile sync failed:', err));
  }

  function syncRewardsAndHistory(rewards, claimHistory) {
    if (!isSupabaseMode || !user) return;
    upsertUserRewards(user.id, rewards).catch((err) =>
      console.error('Rewards sync failed:', err)
    );
    upsertClaimHistory(user.id, claimHistory).catch((err) =>
      console.error('Claim history sync failed:', err)
    );
  }

  const selected = state.adventures.find((a) => a.id === state.selectedAdventureId);
  const progress = selected ? getAdventureProgress(state, selected.id) : null;

  function nav(screen, adventureId = state.selectedAdventureId, options = {}) {
    setState((s) => ({
      ...s,
      screen,
      selectedAdventureId: adventureId ?? s.selectedAdventureId,
      adminPreview:
        'adminPreview' in options ? options.adminPreview : s.adminPreview,
      adminTab: options.adminTab ?? s.adminTab,
    }));
  }

  function updateAdventure(adventureId, patch) {
    setState((s) => ({
      ...s,
      adventures: s.adventures.map((a) =>
        a.id === adventureId ? { ...a, ...patch } : a
      ),
    }));
  }

  function publishAdventure(adventureId) {
    updateAdventure(adventureId, { status: ADVENTURE_STATUS.PUBLISHED });
    if (isSupabaseMode) {
      updateAdventureStatus(adventureId, ADVENTURE_STATUS.PUBLISHED)
        .then(() => refreshAdventuresFromRemote())
        .catch((err) => {
          console.error('Publish sync failed:', err);
          setAdventureSyncError(err.message || 'Could not publish adventure.');
        });
    }
  }

  function archiveAdventure(adventureId) {
    updateAdventure(adventureId, { status: ADVENTURE_STATUS.ARCHIVED });
    if (isSupabaseMode) {
      updateAdventureStatus(adventureId, ADVENTURE_STATUS.ARCHIVED)
        .then(() => refreshAdventuresFromRemote())
        .catch((err) => {
          console.error('Archive sync failed:', err);
          setAdventureSyncError(err.message || 'Could not archive adventure.');
        });
    }
  }

  function restoreAdventure(adventureId) {
    updateAdventure(adventureId, { status: ADVENTURE_STATUS.DRAFT });
    if (isSupabaseMode) {
      updateAdventureStatus(adventureId, ADVENTURE_STATUS.DRAFT)
        .then(() => refreshAdventuresFromRemote())
        .catch((err) => {
          console.error('Restore sync failed:', err);
          setAdventureSyncError(err.message || 'Could not restore adventure.');
        });
    }
  }

  function deleteAdventure(adventureId) {
    setState((s) => ({
      ...s,
      adventures: s.adventures.filter((a) => a.id !== adventureId),
      selectedAdventureId:
        s.selectedAdventureId === adventureId ? null : s.selectedAdventureId,
      adminPreview:
        s.selectedAdventureId === adventureId ? false : s.adminPreview,
    }));
    if (isSupabaseMode) {
      deleteAdventureRemote(adventureId)
        .then(() => refreshAdventuresFromRemote())
        .catch((err) => {
          console.error('Delete sync failed:', err);
          setAdventureSyncError(err.message || 'Could not delete adventure.');
        });
    }
  }

  function solveClue(adventure) {
    const p = getAdventureProgress(state, adventure.id);
    const nextStep = Math.min(adventure.clues.length, p.step + 1);
    const bonus = adventure.bonusFinds.find(
      (b) => b.afterStep === p.step && !p.bonuses.includes(b.id)
    );

    setState((s) => {
      const current = getAdventureProgress(s, adventure.id);
      const bonuses = bonus ? [...current.bonuses, bonus.id] : current.bonuses;
      const bonusRewards = bonus
        ? [
            createVaultReward({
              id: `${adventure.id}-${bonus.id}`,
              type: bonus.type === 'coupon' ? 'coupon' : 'bonus',
              icon: bonus.icon,
              title: bonus.title,
              desc: bonus.couponCode ? `${bonus.desc} Code: ${bonus.couponCode}` : bonus.desc,
              valueLabel: bonus.type === 'coupon' ? 'Bonus coupon' : 'Trail bonus',
              redemptionInstructions: bonus.couponCode
                ? `Use code ${bonus.couponCode} at the sponsor location.`
                : 'Collect your bonus in the Questory Vault.',
              expirationDays: bonus.type === 'coupon' ? 30 : 0,
              adventureId: adventure.id,
              adventureTitle: adventure.title,
              sponsorName: getSponsorInfo(adventure).name,
              sponsorLogoUrl: getSponsorInfo(adventure).logoUrl,
              sponsorWebsite: getSponsorInfo(adventure).website,
            }),
          ]
        : [];

      const nextRewards = [...s.rewards, ...bonusRewards];
      const completedAllClues = nextStep >= adventure.clues.length;
      const nextState = {
        ...s,
        coins: s.coins + (bonus?.coins || 0),
        progress: {
          ...s.progress,
          [adventure.id]: { ...current, step: nextStep, bonuses },
        },
        rewards: nextRewards,
        claimHistory: syncClaimHistory(nextRewards, s.claimHistory),
        screen: bonus
          ? 'bonus'
          : completedAllClues && adventureUsesFinder(adventure)
            ? 'medallion-signal'
            : s.screen,
        pendingBonus: bonus || null,
      };
      if (isSupabaseMode && user) {
        syncProfile(nextState);
        syncRewardsAndHistory(nextState.rewards, nextState.claimHistory);
      }
      return nextState;
    });
  }

  function claimTreasure(adventure, code, options = {}) {
    const p = getAdventureProgress(state, adventure.id);
    if (isSupabaseMode && !user) {
      return { ok: false, message: 'Sign in to claim and save your rewards.' };
    }
    if (p.claimed) {
      return { ok: false, message: 'You already claimed this adventure.' };
    }
    if (p.step < adventure.clues.length) {
      return { ok: false, message: 'Complete all clues first.' };
    }

    const validation = validateClaimAttempt(adventure, p, { code, ...options });
    if (!validation.ok) {
      return validation;
    }

    const claimedAt = new Date().toISOString();
    const sponsorInfo = getSponsorInfo(adventure);
    const vaultRewards = adventure.finalRewards.map((r, i) =>
      createVaultReward({
        ...r,
        id: `${adventure.id}-final-${i}`,
        adventureId: adventure.id,
        adventureTitle: adventure.title,
        claimedAt,
        sponsorName: sponsorInfo.name,
        sponsorLogoUrl: sponsorInfo.logoUrl,
        sponsorWebsite: sponsorInfo.website,
      })
    );

    const primaryReward =
      vaultRewards.find((r) => r.type === 'medallion') || vaultRewards[0];
    const certificate = createCompletionCertificate({
      adventureId: adventure.id,
      adventureName: adventure.title,
      rewardName: primaryReward.title,
      completedAt: claimedAt,
      sponsorInfo,
    });

    setState((s) => {
      const nextRewards = [...s.rewards, ...vaultRewards];
      const baseHistory = syncClaimHistory(nextRewards, s.claimHistory);
      const nextState = {
        ...s,
        coins: s.coins + adventure.rewardCoins,
        entries: s.entries + adventure.potEntries,
        screen: 'victory',
        victoryCertificate: certificate,
        progress: {
          ...s.progress,
          [adventure.id]: { ...p, claimed: true, claimedAt, medallionTapped: true },
        },
        rewards: nextRewards,
        claimHistory: upsertCertificate(baseHistory, certificate),
      };
      if (isSupabaseMode && user) {
        syncProfile(nextState);
        syncRewardsAndHistory(nextState.rewards, nextState.claimHistory);
      }
      return nextState;
    });

    return { ok: true };
  }

  function redeemReward(rewardId) {
    setState((s) => {
      const nextRewards = s.rewards.map((r) =>
        r.id === rewardId && isRedeemable(r)
          ? {
              ...r,
              status: REWARD_STATUS.REDEEMED,
              redeemedAt: new Date().toISOString(),
            }
          : r
      );
      const nextState = {
        ...s,
        rewards: nextRewards,
        claimHistory: syncClaimHistory(nextRewards, s.claimHistory),
      };
      if (isSupabaseMode && user) {
        syncRewardsAndHistory(nextState.rewards, nextState.claimHistory);
      }
      return nextState;
    });
  }

  function markMedallionTapped(adventure) {
    if (autoClaimsOnTap(adventure)) {
      claimTreasure(adventure, adventure.claimCode, { medallionTapped: true });
      return;
    }

    setState((s) => {
      const nextProgress = {
        ...s.progress,
        [adventure.id]: {
          ...getAdventureProgress(s, adventure.id),
          medallionTapped: true,
          finderUnlocked: true,
        },
      };
      const nextState = { ...s, screen: 'play', progress: nextProgress };
      if (isSupabaseMode && user) {
        syncProfile(nextState);
      }
      return nextState;
    });
  }

  function continueAfterBonus() {
    setState((s) => {
      const adventure = s.adventures.find((a) => a.id === s.selectedAdventureId);
      const p = adventure ? getAdventureProgress(s, adventure.id) : null;
      const allDone = p && adventure && p.step >= adventure.clues.length;
      return {
        ...s,
        screen:
          allDone && adventure && adventureUsesFinder(adventure) ? 'medallion-signal' : 'play',
        pendingBonus: null,
      };
    });
  }

  function resetPrototype() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  const needsLoginForVault = isSupabaseMode && !user;

  return (
    <div>
      <main className="app">
        <Header state={state} auth={auth} onLoginClick={() => setShowLogin(true)} />
        <AuthDebugPanel />
        {!isSupabaseMode && (
          <div className="dev-mode-banner">Local dev mode · data saved in localStorage</div>
        )}
        {isSupabaseMode && remoteLoading && (
          <div className="dev-mode-banner syncing">Syncing with Supabase…</div>
        )}
        {adventureSyncError && (
          <div className="dev-mode-banner form-error-inline">{adventureSyncError}</div>
        )}
        {showLogin && (
          <LoginScreen
            initialError={loginError}
            onClose={() => {
              setShowLogin(false);
              setLoginError('');
            }}
          />
        )}
        {state.screen === 'home' && <Home nav={nav} />}
        {state.screen === 'feed' && (
          <AdventureFeed adventures={getPublishedAdventures(state.adventures)} nav={nav} />
        )}
        {state.screen === 'map' && (
          <MapScreen
            adventures={getPublishedAdventures(state.adventures)}
            nav={nav}
          />
        )}
        {state.screen === 'detail' && selected && (
          <AdventureDetail
            adventure={selected}
            progress={progress}
            nav={nav}
            adminPreview={state.adminPreview}
          />
        )}
        {state.screen === 'play' && selected && (
          <AdventurePlay
            adventure={selected}
            progress={progress}
            onSolve={() => solveClue(selected)}
            onClaim={(code, options) => claimTreasure(selected, code, options)}
            nav={nav}
            adminPreview={state.adminPreview}
          />
        )}
        {state.screen === 'medallion-signal' && selected && (
          <MedallionSignalScreen
            adventure={selected}
            nav={nav}
            adminPreview={state.adminPreview}
          />
        )}
        {state.screen === 'finder' && selected && (
          <FinderModeScreen
            adventure={selected}
            progress={progress}
            nav={nav}
            adminPreview={state.adminPreview}
            onMedallionTap={() => markMedallionTapped(selected)}
          />
        )}
        {state.screen === 'bonus' && state.pendingBonus && selected && (
          <BonusFindModal
            bonus={state.pendingBonus}
            onContinue={continueAfterBonus}
          />
        )}
        {state.screen === 'vault' && (
          needsLoginForVault ? (
            <SignInPrompt onLogin={() => setShowLogin(true)} />
          ) : (
            <RewardVault state={state} onRedeem={redeemReward} />
          )
        )}
        {state.screen === 'victory' && state.victoryCertificate && (
          <VictoryScreen certificate={state.victoryCertificate} nav={nav} />
        )}
        {state.screen === 'create' && (
          isSupabaseMode && !isAdmin ? (
            <AdminGate onLogin={() => setShowLogin(true)} />
          ) : (
            <CreateAdventure
              state={state}
              setState={setState}
              reset={resetPrototype}
              userId={user?.id}
              isSupabaseMode={isSupabaseMode}
              onAdventuresSaved={refreshAdventuresFromRemote}
            />
          )
        )}
        {state.screen === 'admin' && (
          isSupabaseMode && !isAdmin ? (
            <AdminGate onLogin={() => setShowLogin(true)} />
          ) : (
            <AdminReview
              adventures={state.adventures}
              adminTab={state.adminTab}
              nav={nav}
              onPublish={publishAdventure}
              onArchive={archiveAdventure}
              onRestore={restoreAdventure}
              onDelete={deleteAdventure}
              onTabChange={(tab) => setState((s) => ({ ...s, adminTab: tab }))}
            />
          )
        )}
      </main>
      <BottomNav screen={state.screen} nav={nav} adminPreview={state.adminPreview} />
    </div>
  );
}

function SponsorBlock({ sponsor, compact = false }) {
  const info =
    typeof sponsor === 'string'
      ? { name: sponsor, logoUrl: '', website: '' }
      : sponsor || { name: '', logoUrl: '', website: '' };

  if (!info.name) return null;

  return (
    <div className={`sponsor-block ${compact ? 'compact' : ''}`}>
      {info.logoUrl ? (
        <img
          src={info.logoUrl}
          alt=""
          className="sponsor-logo"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="sponsor-logo-fallback">{info.name.charAt(0)}</div>
      )}
      <div className="sponsor-copy">
        <small className="sponsor-label">Sponsored by</small>
        {info.website ? (
          <a
            href={info.website}
            target="_blank"
            rel="noopener noreferrer"
            className="sponsor-name"
          >
            {info.name}
          </a>
        ) : (
          <span className="sponsor-name">{info.name}</span>
        )}
      </div>
    </div>
  );
}

function SignInPrompt({ onLogin }) {
  return (
    <div className="card empty-vault">
      <Lock size={28} />
      <p>Sign in to view your Reward Vault and sync progress.</p>
      <button onClick={onLogin}>Sign In</button>
    </div>
  );
}

function AdminGate({ onLogin }) {
  return (
    <div className="card empty-vault">
      <ShieldCheck size={28} />
      <p>Admin access required. Sign in with an admin account to manage adventures.</p>
      <button onClick={onLogin}>Admin Sign In</button>
      <p className="admin-meta">
        Set <code>profiles.role = 'admin'</code> in Supabase for your user.
      </p>
    </div>
  );
}

function Header({ state, auth, onLoginClick }) {
  const displayName =
    auth?.profile?.display_name || auth?.user?.email?.split('@')[0] || 'Explorer';
  const [signOutError, setSignOutError] = useState('');

  async function handleSignOut() {
    setSignOutError('');
    try {
      await auth.signOut();
    } catch (err) {
      setSignOutError(err.message || 'Could not sign out. Please try again.');
    }
  }

  return (
    <div className="header-wrap">
      <div className="top">
        <div className="brand">
          <div className="logo">Q</div>
          <div>
            <h1>QUESTORY</h1>
            <small>
              Alpha · {auth?.isSupabaseMode ? (auth.user ? displayName : 'Cloud mode') : 'Local mode'}
            </small>
          </div>
        </div>
        <div className="header-actions">
          {auth?.isSupabaseMode &&
            (auth.user ? (
              <button type="button" className="ghost header-auth" onClick={handleSignOut}>
                <LogOut size={14} /> Log out
              </button>
            ) : (
              <button type="button" className="ghost header-auth" onClick={onLoginClick}>
                Sign in
              </button>
            ))}
          <div className="wallet">
            <Wallet size={16} />
            {state.coins} coins
          </div>
        </div>
      </div>
      {signOutError && <p className="form-error header-signout-error">{signOutError}</p>}
    </div>
  );
}

function Home({ nav }) {
  return (
    <>
      <section className="hero">
        <div className="badge alpha">Alpha</div>
        <h2>Adventure is nearby.</h2>
        <p>
          Follow clues across real places. Unlock bonus finds. Claim virtual medallions, sponsor
          coupons, and legendary drops in your Vault.
        </p>
        <button onClick={() => nav('feed')}>Explore Adventures</button>
      </section>
      <div className="grid">
        <FeatureCard
          icon={<Trophy />}
          title="$250 Pot"
          text="Complete adventures to earn community pot entries."
        />
        <FeatureCard
          icon={<Compass />}
          title="Clue Trail"
          text="Treasure only unlocks after the full clue path."
        />
        <FeatureCard
          icon={<Gift />}
          title="Bonus Finds"
          text="Hidden rewards appear between clue steps."
        />
        <FeatureCard
          icon={<ShieldCheck />}
          title="Safe Zones"
          text="Future adventures use approved public and sponsor locations."
        />
      </div>
    </>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="card mini">
      <span>{icon}</span>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}

function AdventureFeed({ adventures, nav }) {
  return (
    <>
      <div className="section-head">
        <h2>Adventure Feed</h2>
        <p>Published trails and live drops near you</p>
      </div>
      {!adventures.length && (
        <div className="card empty-vault">
          <Compass size={28} />
          <p>No published adventures yet. Publish a draft from Admin.</p>
        </div>
      )}
      {adventures.map((adventure) => (
        <div className="card hunt" key={adventure.id}>
          <div className="row">
            <span className={`badge ${adventure.status}`}>
              {adventureStatusLabel(adventure.status)}
            </span>
            <small>{adventure.distance}</small>
          </div>
          <h3>{adventure.title}</h3>
          <p className="location">
            <MapPin size={14} /> {adventure.location}
          </p>
          <p className="story-preview">{adventure.story}</p>
          <SponsorBlock sponsor={getSponsorInfo(adventure)} compact />
          <div className="chips">
            <span>{adventure.prize}</span>
            <span>{'★'.repeat(adventure.difficulty)}</span>
          </div>
          <button onClick={() => nav('detail', adventure.id, { adminPreview: false })}>
            View Adventure
            <ChevronRight size={18} />
          </button>
        </div>
      ))}
    </>
  );
}

function AdminClaimCode({ adventure }) {
  const secrets = getAdminClaimSecrets(adventure);
  if (!secrets.length) return null;

  return (
    <div className="admin-claim-secrets">
      {secrets.map((item) => (
        <p key={item.label} className={item.hint ? 'admin-claim-hint' : 'admin-claim-code'}>
          <Lock size={14} /> Admin {item.label.toLowerCase()}:{' '}
          {item.hint ? <span>{item.value}</span> : <code>{item.value}</code>}
        </p>
      ))}
    </div>
  );
}

function AdventureDetail({ adventure, progress, nav, adminPreview }) {
  const playable = isAdventurePlayable(adventure, adminPreview);
  const pct = progress.claimed
    ? 100
    : Math.round((progress.step / Math.max(adventure.clues.length, 1)) * 100);

  return (
    <>
      <button
        className="ghost back"
        onClick={() =>
          nav(adminPreview ? 'admin' : 'feed', adventure.id, { adminPreview })
        }
      >
        ← {adminPreview ? 'Admin' : 'Adventure Feed'}
      </button>
      {adminPreview && (
        <div className="preview-banner">
          <Eye size={16} /> Admin preview · {adventureStatusLabel(adventure.status)}
        </div>
      )}
      {adminPreview && <AdminClaimCode adventure={adventure} />}
      <div className="card detail-hero">
        <div className="row">
          <span className={`badge ${adventure.status}`}>
            {adventureStatusLabel(adventure.status)}
          </span>
          <small>{adventure.distance}</small>
        </div>
        <h2>{adventure.title}</h2>
        <p className="location">
          <MapPin size={14} /> {adventure.location}
        </p>
        <p className="story">{adventure.story}</p>
        <SponsorBlock sponsor={getSponsorInfo(adventure)} />
        <div className="chips">
          <span>{adventure.prize}</span>
          <span>{'★'.repeat(adventure.difficulty)}</span>
        </div>
        <div className="progress">
          <i style={{ width: `${pct}%` }} />
        </div>
        <small className="progress-label">
          {progress.claimed
            ? 'Completed · Rewards in Vault'
            : progress.step === 0
              ? 'Not started'
              : `${progress.step} of ${adventure.clues.length} clues solved`}
        </small>
      </div>

      <div className="card">
        <h3>Trail Overview</h3>
        <ul className="trail-list">
          {adventure.clues.map((clue, i) => {
            const done = progress.step > i;
            const active = progress.step === i && !progress.claimed;
            return (
              <li key={clue.id} className={done ? 'done' : active ? 'active' : ''}>
                <span className="step-num">{done ? '✓' : i + 1}</span>
                <div>
                  <b>{clue.title}</b>
                  <p>{done || active ? clue.text : 'Solve previous clues to unlock'}</p>
                </div>
              </li>
            );
          })}
          <li className={progress.step >= adventure.clues.length ? 'active' : ''}>
            <span className="step-num">
              {progress.claimed ? '✓' : <Lock size={14} />}
            </span>
            <div>
              <b>Medallion Finder</b>
              <p>Track the signal and tap the virtual medallion to unlock claiming</p>
            </div>
          </li>
        </ul>
      </div>

      <div className="card">
        <h3>Reward Types</h3>
        <div className="reward-types">
          <span className="type medallion">Virtual Medallions</span>
          <span className="type coupon">Sponsor Coupons</span>
          <span className="type physical">Legendary Drops</span>
        </div>
      </div>

      <button
        disabled={!playable}
        onClick={() => nav('play', adventure.id, { adminPreview })}
      >
        {progress.claimed
          ? 'Replay Trail'
          : progress.step > 0
            ? 'Continue Adventure'
            : 'Start Adventure'}
      </button>
    </>
  );
}

function GpsCheckIn({ clue, onUnlock }) {
  const [status, setStatus] = useState('idle');
  const [distanceAway, setDistanceAway] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setStatus('idle');
    setDistanceAway(null);
    setChecking(false);
  }, [clue?.id]);

  async function handleGpsCheckIn() {
    if (clue?.latitude == null || clue?.longitude == null) {
      onUnlock();
      return;
    }

    setChecking(true);
    setStatus('checking');
    setDistanceAway(null);

    try {
      const position = await getCurrentPosition();
      const { inside, distance } = isWithinRadius(
        position.coords.latitude,
        position.coords.longitude,
        clue
      );

      if (inside) {
        setStatus('verified');
        setTimeout(() => onUnlock(), 700);
      } else {
        setStatus('too_far');
        setDistanceAway(distance);
        setChecking(false);
      }
    } catch {
      setStatus('denied');
      setChecking(false);
    }
  }

  const hasGps = clue?.latitude != null && clue?.longitude != null;

  return (
    <div className="checkin-block">
      {status !== 'idle' && (
        <div className={`checkin-status ${status}`} role="status">
          <p>{CHECKIN_MESSAGES[status]}</p>
          {status === 'too_far' && distanceAway != null && (
            <p className="distance-away">{formatDistanceAway(distanceAway)}</p>
          )}
          {hasGps && status === 'too_far' && (
            <p className="radius-hint">
              Check-in zone: {clue.radiusMeters ?? DEFAULT_RADIUS_METERS} m
            </p>
          )}
        </div>
      )}

      <button onClick={handleGpsCheckIn} disabled={checking}>
        <MapPin size={18} /> {checking ? 'Checking…' : 'GPS Check-In'}
      </button>

      <button className="ghost dev-unlock" onClick={onUnlock} disabled={checking}>
        Dev Unlock
      </button>
    </div>
  );
}

function AdventurePlay({ adventure, progress, onSolve, onClaim, nav, adminPreview }) {
  const total = adventure.clues.length;
  const atClaim = progress.step >= total;
  const clueIndex = Math.min(progress.step, total - 1);
  const clue = adventure.clues[clueIndex];
  const pct = progress.claimed ? 100 : Math.round((progress.step / total) * 100);
  const method = adventure.claimMethod || CLAIM_METHOD.SECRET_CODE;
  const finderFlow = adventureUsesFinder(adventure);
  const awaitingFinder = atClaim && finderFlow && !progress.medallionTapped && !progress.claimed;
  const readyToClaim =
    atClaim &&
    !progress.claimed &&
    method !== CLAIM_METHOD.TAP_MEDALLION &&
    (!finderFlow || progress.medallionTapped);

  return (
    <>
      <button
        className="ghost back"
        onClick={() => nav('detail', adventure.id, { adminPreview })}
      >
        ← Adventure Detail
      </button>
      {adminPreview && (
        <div className="preview-banner">
          <Eye size={16} /> Admin preview mode
        </div>
      )}
      {adminPreview && <AdminClaimCode adventure={adventure} />}
      <div className="card">
        <h2>{adventure.title}</h2>
        <p>
          {adventure.location} · {adventure.prize}
        </p>
        <SponsorBlock sponsor={getSponsorInfo(adventure)} compact />
        <div className="progress">
          <i style={{ width: `${pct}%` }} />
        </div>
        <small>
          {progress.claimed
            ? 'Completed'
            : awaitingFinder
              ? 'Medallion signal active'
              : atClaim
                ? 'Ready to claim'
                : `Clue ${progress.step + 1} of ${total}`}
        </small>
      </div>

      <MiniClueMap adventure={adventure} activeClueIndex={clueIndex} />

      <div className="card clue">
        <h3>
          {!atClaim
            ? `Clue ${progress.step + 1}: ${clue?.title}`
            : progress.claimed
              ? 'Treasure Claimed'
              : awaitingFinder
                ? 'Medallion Finder'
                : 'Treasure Claim'}
        </h3>

        {!atClaim && !progress.claimed && clue && (
          <>
            <p>{clue.text}</p>
            <GpsCheckIn clue={clue} onUnlock={onSolve} />
          </>
        )}

        {awaitingFinder && (
          <>
            <p>
              All clues solved. The virtual medallion is broadcasting — enter Finder Mode to
              track the signal.
            </p>
            <button onClick={() => nav('medallion-signal', adventure.id, { adminPreview })}>
              <Compass size={18} /> Medallion Signal Activated
            </button>
          </>
        )}

        {readyToClaim && (
          <TreasureClaimPanel adventure={adventure} progress={progress} onClaim={onClaim} />
        )}

        {progress.claimed && (
          <button onClick={() => nav('vault')}>
            <Sparkles size={18} /> Open Reward Vault
          </button>
        )}
      </div>

      {progress.bonuses.length > 0 && (
        <div className="card">
          <h3>Bonus Finds Collected</h3>
          <div className="chips">
            {progress.bonuses.map((id) => {
              const b = adventure.bonusFinds.find((x) => x.id === id);
              return b ? <span key={id}>{b.icon} {b.title}</span> : null;
            })}
          </div>
        </div>
      )}
    </>
  );
}

function BonusFindModal({ bonus, onContinue }) {
  return (
    <div className="modal-overlay">
      <div className="card bonus-modal">
        <div className="bonus-icon">{bonus.icon}</div>
        <div className="badge alpha">Bonus Find</div>
        <h2>{bonus.title}</h2>
        <p>{bonus.desc}</p>
        {bonus.coins > 0 && <p className="coin-bonus">+{bonus.coins} coins added</p>}
        {bonus.couponCode && (
          <div className="coupon-code">Code: {bonus.couponCode}</div>
        )}
        <button onClick={onContinue}>
          <Star size={18} /> Continue Trail
        </button>
      </div>
    </div>
  );
}

function ProofCard({ certificate, cardRef }) {
  return (
    <div className="proof-card" ref={cardRef}>
      <div className="proof-brand">QUESTORY</div>
      <div className="proof-subtitle">Adventure completed</div>
      <div className="proof-adventure">{certificate.adventureName}</div>
      <div className="proof-reward">{certificate.rewardName}</div>
      {certificate.sponsorName && (
        <div className="proof-sponsor">
          {certificate.sponsorLogoUrl && (
            <img src={certificate.sponsorLogoUrl} alt="" className="proof-sponsor-logo" />
          )}
          <span>{certificate.sponsorName}</span>
        </div>
      )}
      <div className="proof-verified">
        <ShieldCheck size={16} />
        Verified on {formatProofDate(certificate.completedAt)}
      </div>
    </div>
  );
}

function VictoryScreen({ certificate, nav }) {
  const cardRef = useRef(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [downloading, setDownloading] = useState(false);

  async function handleCopy() {
    try {
      await copyShareText(certificate.shareText);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch {
      setCopyFeedback('Copy failed');
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: certificate.shareText });
        return;
      } catch {
        /* user cancelled or unsupported */
      }
    }
    handleCopy();
  }

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const slug = certificate.adventureName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      await downloadProofCard(cardRef.current, `questory-${slug}.png`);
    } catch {
      alert('Could not generate proof card. Try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="victory-hero card">
        <div className="victory-icon">
          <Award size={40} />
        </div>
        <div className="badge verified-badge">
          <ShieldCheck size={14} /> Questory Verified
        </div>
        <h2>Victory!</h2>
        <p className="victory-adventure">{certificate.adventureName}</p>
        <p className="victory-reward">{certificate.rewardName}</p>
        <SponsorBlock
          sponsor={{
            name: certificate.sponsorName,
            logoUrl: certificate.sponsorLogoUrl,
            website: certificate.sponsorWebsite,
          }}
          compact
        />
        <small className="victory-date">
          Completed {formatTimestamp(certificate.completedAt)}
        </small>
      </div>

      <ProofCard certificate={certificate} cardRef={cardRef} />

      <div className="share-actions">
        <button onClick={handleShare}>
          <Share2 size={18} /> Share Text
        </button>
        <button className="ghost" onClick={handleCopy}>
          <Copy size={18} /> {copyFeedback || 'Copy Share Text'}
        </button>
        <button className="ghost" onClick={handleDownload} disabled={downloading}>
          <Download size={18} /> {downloading ? 'Generating…' : 'Download Proof Card'}
        </button>
        <button className="ghost" onClick={() => nav('vault')}>
          <Sparkles size={18} /> Open Reward Vault
        </button>
      </div>

      <p className="share-preview">{certificate.shareText}</p>
    </>
  );
}

function RedeemModal({ reward, onConfirm, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="card redeem-modal">
        <h2>Redeem Reward</h2>
        <p className="redeem-title">{reward.title}</p>
        {reward.valueLabel && <p className="value-label">{reward.valueLabel}</p>}
        <p className="redeem-desc">{reward.desc}</p>
        <div className="redeem-instructions">
          <h3>Redemption Instructions</h3>
          <p>
            {reward.redemptionInstructions ||
              'Follow sponsor instructions to complete your redemption.'}
          </p>
        </div>
        {(reward.sponsorName || reward.sponsorLogoUrl) && (
          <SponsorBlock
            sponsor={{
              name: reward.sponsorName,
              logoUrl: reward.sponsorLogoUrl,
              website: reward.sponsorWebsite,
            }}
          />
        )}
        <button onClick={() => onConfirm(reward.id)}>
          <CheckCircle2 size={18} /> Confirm Redemption
        </button>
        <button className="ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function RewardCard({ reward, onRedeem, redeemed = false }) {
  const type = reward.type === 'bonus' ? 'coupon' : reward.type;
  const canRedeem = isRedeemable(reward);

  return (
    <div className={`card reward ${redeemed ? 'reward-redeemed' : ''}`}>
      <span>{reward.icon}</span>
      <div className="reward-body">
        <div className="reward-meta">
          <span className={`type ${type}`}>{rewardTypeLabel(reward.type)}</span>
          <span className={`status-badge ${reward.status}`}>
            {rewardStatusLabel(reward.status)}
          </span>
        </div>
        <b>{reward.title}</b>
        {reward.valueLabel && <p className="value-label">{reward.valueLabel}</p>}
        <p>{reward.desc}</p>
        {(reward.sponsorName || reward.sponsorLogoUrl) && (
          <SponsorBlock
            sponsor={{
              name: reward.sponsorName,
              logoUrl: reward.sponsorLogoUrl,
              website: reward.sponsorWebsite,
            }}
            compact
          />
        )}
        {reward.adventureTitle && <small>From {reward.adventureTitle}</small>}
        {reward.claimedAt && (
          <small className="reward-date">Claimed {formatTimestamp(reward.claimedAt)}</small>
        )}
        {reward.redeemedAt && (
          <small className="reward-date redeemed-date">
            Redeemed {formatTimestamp(reward.redeemedAt)}
          </small>
        )}
        {canRedeem && onRedeem && (
          <button className="redeem-btn" onClick={() => onRedeem(reward)}>
            <CheckCircle2 size={16} /> Redeem
          </button>
        )}
      </div>
    </div>
  );
}

function RewardVault({ state, onRedeem }) {
  const [tab, setTab] = useState('active');
  const [pendingRedeem, setPendingRedeem] = useState(null);

  function handleRedeemClick(reward) {
    setPendingRedeem(reward);
  }

  function confirmRedeem(rewardId) {
    onRedeem(rewardId);
    setPendingRedeem(null);
  }

  const activeRewards = state.rewards.filter(
    (r) => r.status === REWARD_STATUS.ACTIVE || r.status === REWARD_STATUS.EXPIRED
  );
  const redeemedRewards = state.rewards.filter((r) => r.status === REWARD_STATUS.REDEEMED);

  const activeGrouped = {
    medallion: activeRewards.filter((r) => r.type === 'medallion'),
    coupon: activeRewards.filter((r) => r.type === 'coupon' || r.type === 'bonus'),
    physical: activeRewards.filter((r) => r.type === 'physical'),
  };

  return (
    <>
      {pendingRedeem && (
        <RedeemModal
          reward={pendingRedeem}
          onConfirm={confirmRedeem}
          onClose={() => setPendingRedeem(null)}
        />
      )}
      <div className="section-head">
        <h2>Reward Vault</h2>
        <p>Virtual medallions, sponsor coupons, and legendary drops</p>
      </div>

      <div className="vault-tabs">
        <button
          className={tab === 'active' ? 'active' : ''}
          onClick={() => setTab('active')}
        >
          Active
        </button>
        <button
          className={tab === 'redeemed' ? 'active' : ''}
          onClick={() => setTab('redeemed')}
        >
          Redeemed
        </button>
        <button
          className={tab === 'history' ? 'active' : ''}
          onClick={() => setTab('history')}
        >
          <History size={14} /> History
        </button>
      </div>

      {tab === 'active' && (
        <>
          <div className="card balance">
            <h3>{state.coins} Coins</h3>
            <p>{state.entries} Community Pot Entries</p>
          </div>

          {!activeRewards.length && (
            <div className="card empty-vault">
              <Lock size={28} />
              <p>No active rewards. Complete an adventure to fill your Vault.</p>
            </div>
          )}

          {['medallion', 'coupon', 'physical'].map((type) =>
            activeGrouped[type].length ? (
              <section key={type} className="vault-section">
                <h3>{rewardTypeLabel(type)}</h3>
                {activeGrouped[type].map((r) => (
                  <RewardCard key={r.id} reward={r} onRedeem={handleRedeemClick} />
                ))}
              </section>
            ) : null
          )}
        </>
      )}

      {tab === 'redeemed' && (
        <>
          {!redeemedRewards.length ? (
            <div className="card empty-vault">
              <CheckCircle2 size={28} />
              <p>No redeemed rewards yet.</p>
            </div>
          ) : (
            <section className="vault-section">
              <h3>Redeemed Rewards</h3>
              {redeemedRewards.map((r) => (
                <RewardCard key={r.id} reward={r} redeemed />
              ))}
            </section>
          )}
        </>
      )}

      {tab === 'history' && <ClaimHistory history={state.claimHistory} />}
    </>
  );
}

function ClaimHistory({ history }) {
  if (!history.length) {
    return (
      <div className="card empty-vault">
        <History size={28} />
        <p>No claim history yet. Complete adventures to build your trail record.</p>
      </div>
    );
  }

  return (
    <section className="vault-section">
      <h3>Claim History</h3>
      {history.map((entry) => (
        <div
          className={`card history-row ${entry.kind === 'certificate' ? 'history-certificate' : ''}`}
          key={entry.id}
        >
          {entry.kind === 'certificate' ? (
            <>
              <div className="history-main">
                <span className="verified-badge">
                  <ShieldCheck size={12} /> Questory Verified
                </span>
                <b>{entry.adventureName}</b>
                <p>{entry.rewardName}</p>
                {(entry.sponsorName || entry.sponsorLogoUrl) && (
                  <SponsorBlock
                    sponsor={{
                      name: entry.sponsorName,
                      logoUrl: entry.sponsorLogoUrl,
                      website: entry.sponsorWebsite,
                    }}
                    compact
                  />
                )}
              </div>
              <div className="history-dates">
                <small>Completed {formatTimestamp(entry.completedAt || entry.claimedAt)}</small>
              </div>
            </>
          ) : (
            <>
              <div className="history-main">
                <b>{entry.rewardName}</b>
                <p>{entry.adventureName}</p>
                {(entry.sponsorName || entry.sponsorLogoUrl) && (
                  <SponsorBlock
                    sponsor={{
                      name: entry.sponsorName,
                      logoUrl: entry.sponsorLogoUrl,
                      website: entry.sponsorWebsite,
                    }}
                    compact
                  />
                )}
              </div>
              <div className="history-details">
                <span className={`type ${entry.type === 'bonus' ? 'coupon' : entry.type}`}>
                  {rewardTypeLabel(entry.type)}
                </span>
                <span className={`status-badge ${entry.status}`}>
                  {rewardStatusLabel(entry.status)}
                </span>
              </div>
              <div className="history-dates">
                <small>Claimed {formatTimestamp(entry.claimedAt)}</small>
                {entry.redeemedAt && (
                  <small>Redeemed {formatTimestamp(entry.redeemedAt)}</small>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}

function emptyClue() {
  return {
    id: `clue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    text: '',
    latitude: '',
    longitude: '',
    radiusMeters: String(DEFAULT_RADIUS_METERS),
    bonusRewardText: '',
  };
}

function validateClueForm(clues) {
  if (!clues.length) return 'Add at least one clue.';
  for (let i = 0; i < clues.length; i++) {
    const c = clues[i];
    const n = i + 1;
    if (!c.title.trim()) return `Clue ${n}: title is required.`;
    if (!c.text.trim()) return `Clue ${n}: text is required.`;
    const lat = parseFloat(c.latitude);
    const lng = parseFloat(c.longitude);
    const radius = parseFloat(c.radiusMeters);
    if (c.latitude === '' || Number.isNaN(lat) || lat < -90 || lat > 90) {
      return `Clue ${n}: valid latitude is required.`;
    }
    if (c.longitude === '' || Number.isNaN(lng) || lng < -180 || lng > 180) {
      return `Clue ${n}: valid longitude is required.`;
    }
    if (c.radiusMeters === '' || Number.isNaN(radius) || radius <= 0) {
      return `Clue ${n}: radius must be a positive number.`;
    }
  }
  return null;
}

function buildBonusFinds(clues) {
  return clues
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => c.bonusRewardText.trim())
    .map(({ c, index }) => ({
      id: `bonus-${index}`,
      afterStep: index,
      title: 'Bonus Find',
      desc: c.bonusRewardText.trim(),
      icon: '✨',
      coins: 5,
      type: 'bonus',
    }));
}

function ClueEditor({ clue, index, total, onChange, onRemove, onUseLocation, locStatus }) {
  return (
    <div className="clue-editor card">
      <div className="clue-editor-head">
        <h3>Clue {index + 1}</h3>
        {total > 1 && (
          <button
            type="button"
            className="ghost icon-btn"
            onClick={() => onRemove(clue.id)}
            aria-label={`Remove clue ${index + 1}`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <label>Title</label>
      <input
        value={clue.title}
        onChange={(e) => onChange(clue.id, { title: e.target.value })}
        placeholder="Clue title"
      />

      <label>Text</label>
      <textarea
        value={clue.text}
        onChange={(e) => onChange(clue.id, { text: e.target.value })}
        placeholder="Clue riddle or directions"
        rows={2}
      />

      <label>GPS location</label>
      <div className="coord-row">
        <input
          type="number"
          step="any"
          value={clue.latitude}
          onChange={(e) => onChange(clue.id, { latitude: e.target.value })}
          placeholder="Latitude"
        />
        <input
          type="number"
          step="any"
          value={clue.longitude}
          onChange={(e) => onChange(clue.id, { longitude: e.target.value })}
          placeholder="Longitude"
        />
      </div>

      <button
        type="button"
        className="ghost location-btn"
        onClick={() => onUseLocation(clue.id)}
        disabled={locStatus?.clueId === clue.id && locStatus.status === 'loading'}
      >
        <LocateFixed size={16} />
        {locStatus?.clueId === clue.id && locStatus.status === 'loading'
          ? 'Getting location…'
          : 'Use my current location'}
      </button>

      {locStatus?.clueId === clue.id && locStatus.status === 'success' && (
        <p className="loc-feedback success">Location filled from GPS.</p>
      )}
      {locStatus?.clueId === clue.id && locStatus.status === 'denied' && (
        <p className="loc-feedback denied">{CHECKIN_MESSAGES.denied}</p>
      )}

      <label>Radius (meters)</label>
      <input
        type="number"
        min="1"
        step="1"
        value={clue.radiusMeters}
        onChange={(e) => onChange(clue.id, { radiusMeters: e.target.value })}
        placeholder="500"
      />

      <label>Bonus reward (optional)</label>
      <input
        value={clue.bonusRewardText}
        onChange={(e) => onChange(clue.id, { bonusRewardText: e.target.value })}
        placeholder="e.g. Free coffee coupon at this stop"
      />
    </div>
  );
}

function emptyReward(type) {
  const defaults = {
    medallion: {
      icon: '🏅',
      title: '',
      desc: '',
      valueLabel: 'Collectible',
      redemptionInstructions: 'Display in your Questory Vault profile.',
      expirationDays: '0',
    },
    coupon: {
      icon: '🎟',
      title: '',
      desc: '',
      valueLabel: '',
      redemptionInstructions: 'Show this coupon at the sponsor location.',
      expirationDays: '30',
    },
    physical: {
      icon: '📦',
      title: '',
      desc: '',
      valueLabel: 'Limited drop',
      redemptionInstructions: 'Winners are contacted by the sponsor.',
      expirationDays: '90',
    },
  };
  return {
    type,
    enabled: type === 'medallion' || type === 'coupon',
    ...defaults[type],
  };
}

function validateRewards(rewards) {
  const enabled = rewards.filter((r) => r.enabled);
  if (!enabled.length) return 'Enable at least one reward type.';
  for (const r of enabled) {
    const label = REWARD_TYPE_OPTIONS.find((o) => o.type === r.type)?.label || r.type;
    if (!r.title.trim()) return `${label}: reward name is required.`;
    if (!r.desc.trim()) return `${label}: description is required.`;
    if (!r.valueLabel.trim()) return `${label}: value label is required.`;
    if (!r.redemptionInstructions.trim()) {
      return `${label}: redemption instructions are required.`;
    }
    const days = parseInt(r.expirationDays, 10);
    if (r.expirationDays !== '' && (Number.isNaN(days) || days < 0)) {
      return `${label}: expiration days must be 0 or more.`;
    }
  }
  return null;
}

function RewardEditor({ reward, onChange }) {
  const option = REWARD_TYPE_OPTIONS.find((o) => o.type === reward.type);

  return (
    <div className={`reward-editor card ${reward.enabled ? '' : 'reward-disabled'}`}>
      <label className="reward-toggle">
        <input
          type="checkbox"
          checked={reward.enabled}
          onChange={(e) => onChange(reward.type, { enabled: e.target.checked })}
        />
        <span>
          {option?.icon} {option?.label}
        </span>
      </label>

      {reward.enabled && (
        <>
          <label>Reward name</label>
          <input
            value={reward.title}
            onChange={(e) => onChange(reward.type, { title: e.target.value })}
            placeholder={`${option?.label} title`}
          />
          <label>Description</label>
          <textarea
            value={reward.desc}
            onChange={(e) => onChange(reward.type, { desc: e.target.value })}
            placeholder="What the player earns"
            rows={2}
          />
          <label>Value label</label>
          <input
            value={reward.valueLabel}
            onChange={(e) => onChange(reward.type, { valueLabel: e.target.value })}
            placeholder="e.g. Free drink, $50 value"
          />
          <label>Redemption instructions</label>
          <textarea
            value={reward.redemptionInstructions}
            onChange={(e) => onChange(reward.type, { redemptionInstructions: e.target.value })}
            placeholder="How the player redeems this reward"
            rows={2}
          />
          <label>Expiration (days, 0 = never)</label>
          <input
            type="number"
            min="0"
            value={reward.expirationDays}
            onChange={(e) => onChange(reward.type, { expirationDays: e.target.value })}
            placeholder="30"
          />
        </>
      )}
    </div>
  );
}

function CreateAdventure({ state, setState, reset, userId, isSupabaseMode, onAdventuresSaved }) {
  const [meta, setMeta] = useState({
    title: '',
    location: '',
    sponsorName: '',
    sponsorLogoUrl: '',
    sponsorWebsite: '',
    story: '',
    claimCode: generateClaimCode(),
    claimMethod: CLAIM_METHOD.SECRET_CODE,
    qrClaimValue: '',
    physicalMedallionCode: '',
    hintAfterTap: '',
  });
  const [clues, setClues] = useState([emptyClue(), emptyClue(), emptyClue()]);
  const [rewards, setRewards] = useState([
    emptyReward('medallion'),
    emptyReward('coupon'),
    emptyReward('physical'),
  ]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [locStatus, setLocStatus] = useState(null);

  function updateClue(id, patch) {
    setClues((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setFormError('');
  }

  function updateReward(type, patch) {
    setRewards((list) => list.map((r) => (r.type === type ? { ...r, ...patch } : r)));
    setFormError('');
  }

  function removeClue(id) {
    setClues((list) => (list.length <= 1 ? list : list.filter((c) => c.id !== id)));
    setFormError('');
  }

  function addClue() {
    setClues((list) => [...list, emptyClue()]);
    setFormError('');
  }

  async function useCurrentLocation(clueId) {
    setLocStatus({ clueId, status: 'loading' });
    try {
      const position = await getCurrentPosition();
      updateClue(clueId, {
        latitude: String(position.coords.latitude),
        longitude: String(position.coords.longitude),
      });
      setLocStatus({ clueId, status: 'success' });
    } catch {
      setLocStatus({ clueId, status: 'denied' });
    }
  }

  async function saveAdventure() {
    const title = meta.title.trim() || 'New QUESTORY Adventure';
    const location = meta.location.trim() || 'Your City';
    const sponsorName = meta.sponsorName.trim() || 'Local Sponsor';
    const story = meta.story.trim() || 'A new trail awaits.';
    const claimCode = (meta.claimCode.trim() || generateClaimCode()).toUpperCase();

    const claimFieldError = validateAdventureClaimFields({
      ...meta,
      claimCode,
    });
    if (claimFieldError) {
      setFormError(claimFieldError);
      return;
    }

    const claimFields = buildAdventureClaimFields({ ...meta, claimCode });

    const clueError = validateClueForm(clues);
    if (clueError) {
      setFormError(clueError);
      return;
    }

    const rewardError = validateRewards(rewards);
    if (rewardError) {
      setFormError(rewardError);
      return;
    }

    const savedClues = clues.map((c, i) => ({
      id: c.id || `c${i + 1}`,
      title: c.title.trim(),
      text: c.text.trim(),
      latitude: parseFloat(c.latitude),
      longitude: parseFloat(c.longitude),
      radiusMeters: parseFloat(c.radiusMeters),
    }));

    const enabledRewards = rewards.filter((r) => r.enabled);
    const finalRewards = enabledRewards.map((r) => {
      const option = REWARD_TYPE_OPTIONS.find((o) => o.type === r.type);
      return {
        type: r.type,
        icon: option?.icon || '🎁',
        title: r.title.trim(),
        desc: r.desc.trim(),
        valueLabel: r.valueLabel.trim(),
        redemptionInstructions: r.redemptionInstructions.trim(),
        expirationDays: parseInt(r.expirationDays, 10) || 0,
      };
    });

    const prizeLabels = finalRewards.map((r) => r.valueLabel).filter(Boolean);
    const adventure = {
      id: `custom-${Date.now()}`,
      title,
      location,
      sponsor: sponsorName,
      sponsorInfo: {
        name: sponsorName,
        logoUrl: meta.sponsorLogoUrl.trim(),
        website: meta.sponsorWebsite.trim(),
      },
      distance: 'New',
      prize: prizeLabels.length ? prizeLabels.join(' + ') : 'Custom Rewards',
      status: ADVENTURE_STATUS.DRAFT,
      difficulty: Math.min(5, Math.max(1, savedClues.length)),
      claimCode: claimFields.claimCode || claimCode,
      claimMethod: claimFields.claimMethod,
      qrClaimValue: claimFields.qrClaimValue,
      physicalMedallionCode: claimFields.physicalMedallionCode,
      hintAfterTap: claimFields.hintAfterTap,
      finderSearchRadiusM: 200,
      finderCaptureBaseM: 25,
      rewardCoins: 25,
      potEntries: 3,
      story,
      clues: savedClues,
      bonusFinds: buildBonusFinds(clues),
      finalRewards,
      creatorId: userId || null,
    };

    if (isSupabaseMode) {
      if (!userId) {
        setFormError('Sign in as an admin to save drafts to Supabase.');
        return;
      }

      setSaving(true);
      setFormError('');
      try {
        await upsertAdventure(adventure, userId);
        const adventures = await fetchAllAdventuresForAdmin();
        setState((s) => ({
          ...s,
          adventures,
          screen: 'admin',
          adminTab: 'drafts',
          adminPreview: false,
        }));
        onAdventuresSaved?.();
      } catch (err) {
        setFormError(err.message || 'Could not save draft to Supabase.');
      } finally {
        setSaving(false);
      }
      return;
    }

    setState((s) => ({
      ...s,
      adventures: [adventure, ...s.adventures],
      screen: 'admin',
      adminTab: 'drafts',
      adminPreview: false,
    }));
  }

  return (
    <>
      <div className="section-head">
        <h2>Create Adventure</h2>
        <p>Build adventures with sponsors, rewards, and GPS clues</p>
      </div>
      <div className="card admin-form">
        <label>Title</label>
        <input
          value={meta.title}
          onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
          placeholder="Adventure title"
        />
        <label>Location</label>
        <input
          value={meta.location}
          onChange={(e) => setMeta((m) => ({ ...m, location: e.target.value }))}
          placeholder="City, State"
        />

        <div className="clues-section-head">
          <h3>Sponsor</h3>
        </div>
        <label>Sponsor name</label>
        <input
          value={meta.sponsorName}
          onChange={(e) => setMeta((m) => ({ ...m, sponsorName: e.target.value }))}
          placeholder="Sponsor name"
        />
        <label>Sponsor logo URL</label>
        <input
          value={meta.sponsorLogoUrl}
          onChange={(e) => setMeta((m) => ({ ...m, sponsorLogoUrl: e.target.value }))}
          placeholder="https://example.com/logo.png"
        />
        <label>Sponsor website</label>
        <input
          value={meta.sponsorWebsite}
          onChange={(e) => setMeta((m) => ({ ...m, sponsorWebsite: e.target.value }))}
          placeholder="https://sponsor.com"
        />
        {meta.sponsorName && (
          <SponsorBlock
            sponsor={{
              name: meta.sponsorName,
              logoUrl: meta.sponsorLogoUrl,
              website: meta.sponsorWebsite,
            }}
            compact
          />
        )}

        <label>Story</label>
        <textarea
          value={meta.story}
          onChange={(e) => setMeta((m) => ({ ...m, story: e.target.value }))}
          placeholder="Adventure story hook"
          rows={3}
        />
        <div className="clues-section-head">
          <h3>Final Treasure Claim</h3>
        </div>
        <p className="admin-meta">Choose how players unlock rewards after completing all clues.</p>

        <ClaimMethodSelector
          value={meta.claimMethod}
          onChange={(claimMethod) => setMeta((m) => ({ ...m, claimMethod }))}
        />

        {getClaimFieldConfig(meta.claimMethod).showFinalClaimCode && (
          <>
            <label>Final Claim Code</label>
            <input
              value={meta.claimCode}
              onChange={(e) => setMeta((m) => ({ ...m, claimCode: e.target.value.toUpperCase() }))}
              placeholder="QUEST-4821"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="admin-meta">
              Players enter this code to claim. Leave blank to auto-generate.
            </p>
          </>
        )}

        {getClaimFieldConfig(meta.claimMethod).showQrClaimValue && (
          <>
            <label>QR Claim Value</label>
            <input
              value={meta.qrClaimValue}
              onChange={(e) =>
                setMeta((m) => ({ ...m, qrClaimValue: e.target.value.toUpperCase() }))
              }
              placeholder="SPONSOR-EVENT-2026"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="admin-meta">Exact payload encoded in the sponsor QR code.</p>
          </>
        )}

        {getClaimFieldConfig(meta.claimMethod).showPhysicalCode && (
          <>
            <label>Physical Medallion Code</label>
            <input
              value={meta.physicalMedallionCode}
              onChange={(e) =>
                setMeta((m) => ({
                  ...m,
                  physicalMedallionCode: e.target.value.toUpperCase(),
                }))
              }
              placeholder="PHYS-4821"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="admin-meta">Engraved on the hidden physical medallion.</p>
          </>
        )}

        {getClaimFieldConfig(meta.claimMethod).showHintAfterTap && (
          <>
            <label>Optional hint after tap</label>
            <textarea
              value={meta.hintAfterTap}
              onChange={(e) => setMeta((m) => ({ ...m, hintAfterTap: e.target.value }))}
              placeholder="Check beneath the old stone bench."
              rows={2}
            />
            <p className="admin-meta">
              Shown after the player taps the virtual signal in Finder Mode.
            </p>
          </>
        )}

        <div className="clues-section-head">
          <h3>Rewards</h3>
        </div>
        {rewards.map((reward) => (
          <RewardEditor key={reward.type} reward={reward} onChange={updateReward} />
        ))}

        <div className="clues-section-head">
          <h3>Clues</h3>
          <button type="button" className="ghost add-clue-btn" onClick={addClue}>
            <Plus size={16} /> Add Clue
          </button>
        </div>

        {clues.map((clue, index) => (
          <ClueEditor
            key={clue.id}
            clue={clue}
            index={index}
            total={clues.length}
            onChange={updateClue}
            onRemove={removeClue}
            onUseLocation={useCurrentLocation}
            locStatus={locStatus}
          />
        ))}

        {formError && <p className="form-error">{formError}</p>}

        <button onClick={saveAdventure} disabled={saving}>
          <Plus size={18} /> {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button className="ghost" onClick={reset} disabled={saving}>
          Reset Alpha Prototype
        </button>
        <p className="admin-meta">
          {isSupabaseMode
            ? 'Drafts save to Supabase · publish from Admin when ready'
            : 'Drafts save locally · publish from Admin when ready'}
        </p>
      </div>
    </>
  );
}

const ADMIN_TAB_STATUS = {
  drafts: ADVENTURE_STATUS.DRAFT,
  published: ADVENTURE_STATUS.PUBLISHED,
  archived: ADVENTURE_STATUS.ARCHIVED,
};

function AdminReview({
  adventures,
  adminTab,
  nav,
  onPublish,
  onArchive,
  onRestore,
  onDelete,
  onTabChange,
}) {
  const status = ADMIN_TAB_STATUS[adminTab] || ADVENTURE_STATUS.DRAFT;
  const filtered = adventures.filter((a) => a.status === status);

  return (
    <>
      <div className="section-head">
        <h2>Admin Review</h2>
        <p>Preview, publish, and manage adventures</p>
      </div>

      <div className="vault-tabs admin-tabs">
        {['drafts', 'published', 'archived'].map((tab) => (
          <button
            key={tab}
            className={adminTab === tab ? 'active' : ''}
            onClick={() => onTabChange(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {!filtered.length && (
        <div className="card empty-vault">
          <Archive size={28} />
          <p>No {adminTab} adventures.</p>
        </div>
      )}

      {filtered.map((adventure) => (
        <div className="card admin-adventure" key={adventure.id}>
          <div className="row">
            <span className={`badge ${adventure.status}`}>
              {adventureStatusLabel(adventure.status)}
            </span>
            <small>{adventure.location}</small>
          </div>
          <h3>{adventure.title}</h3>
          <AdminClaimCode adventure={adventure} />
          <p className="story-preview">{adventure.story}</p>
          <SponsorBlock sponsor={getSponsorInfo(adventure)} compact />
          <div className="chips">
            <span>{adventure.clues.length} clues</span>
            <span>{adventure.finalRewards?.length || 0} rewards</span>
            <span>{claimMethodLabel(adventure.claimMethod)}</span>
          </div>
          <div className="admin-actions">
            <button
              className="ghost admin-action-btn"
              onClick={() =>
                nav('detail', adventure.id, { adminPreview: true, adminTab })
              }
            >
              <Eye size={16} /> Preview
            </button>
            {adventure.status === ADVENTURE_STATUS.DRAFT && (
              <>
                <button
                  className="admin-action-btn"
                  onClick={() => onPublish(adventure.id)}
                >
                  <CheckCircle2 size={16} /> Publish
                </button>
                <button
                  className="ghost admin-action-btn danger"
                  onClick={() => {
                    if (confirm(`Delete draft "${adventure.title}"?`)) {
                      onDelete(adventure.id);
                    }
                  }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </>
            )}
            {adventure.status === ADVENTURE_STATUS.PUBLISHED && (
              <button
                className="ghost admin-action-btn"
                onClick={() => onArchive(adventure.id)}
              >
                <Archive size={16} /> Archive
              </button>
            )}
            {adventure.status === ADVENTURE_STATUS.ARCHIVED && (
              <button
                className="ghost admin-action-btn"
                onClick={() => onRestore(adventure.id)}
              >
                <RotateCcw size={16} /> Restore to Draft
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function BottomNav({ screen, nav, adminPreview }) {
  const items = [
    ['home', 'Home'],
    ['feed', 'Feed'],
    ['map', 'Map'],
    ['vault', 'Vault'],
    ['create', 'Create'],
    ['admin', 'Admin'],
  ];

  const active = (id) => {
    if (screen === id) return true;
    if (screen === 'play' || screen === 'detail' || screen === 'bonus') {
      return adminPreview ? id === 'admin' : id === 'feed';
    }
    return false;
  };

  return (
    <nav className="bottom-nav-6">
      {items.map(([id, label]) => (
        <button
          className={active(id) ? 'active' : ''}
          onClick={() => nav(id, undefined, { adminPreview: false })}
          key={id}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

createRoot(document.getElementById('root')).render(<App />);
