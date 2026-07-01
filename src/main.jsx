import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  Crown,
  Flame,
  Pencil,
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
  normalizeClaimMethod,
  claimMethodLabel,
  validateAdventureClaimFields,
  buildAdventureClaimFields,
  getClaimFieldConfig,
  formatUserErrorMessage,
  formatSuccessMessage,
} from './claimSystem';
import { AdminClaimCode } from './AdminClaimCode';
import {
  MedallionSignalScreen,
  FinderModeScreen,
  FinderAwaitingPanel,
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
  copyShareText,
  downloadProofCard,
  formatProofDate,
} from './share';
import {
  filterRewardsForAccess,
  evaluateAccessContext,
  getMapVisibleAdventures,
} from './accessRules';
import { recordMapReveal } from './mapDiscovery';
import { getDirectorChapterBeat, resolveDirectorClue } from './directorRuntime';
import { advanceClueForAdventure, continueAfterBonus, applyPlayNavigation } from './progressionEngine';
import { useArSceneFlow } from './arFlow';
import {
  createSyncHelpers,
  mergeRemoteDataIntoState,
  refreshAdventuresFromRemote as fetchMergedAdventures,
  syncDailyLoginIfNeeded,
} from './supabase/syncHelpers';
import { applyDailyLogin } from './engagement';
import {
  canCreateAdventure,
  hasPremiumUnlock,
  isPremiumAdventure,
  normalizeEconomy,
  purchaseExtraAdventureSlot,
  purchaseHint,
  purchasePremiumUnlock,
  purchaseRevealSearchRadius,
  purchaseSkipClue,
  spendCoins,
  submitRating,
  getCreatorForAdventure,
  COIN_SPEND,
} from './economy';
import {
  addPhotoMemory,
  computeAdventureHeat,
  getHeatCategory,
  getHeatLabel,
  normalizeSocial,
} from './social';
import {
  SocialHub,
  AdventureComments,
  PhotoMemoryPrompt,
  GhostTrailHint,
  SeasonRankCard,
  TeamHuntBadge,
  LiveMapOverlay,
} from './SocialUI';
import { getMyTeam } from './social';
import {
  canAccessPremiumHunt,
  normalizeExpansion,
  usesArFinder,
  FINDER_MODES,
} from './expansion';
import {
  PlatformHub,
  LegendaryHuntBadge,
  CashHuntBadge,
  SponsoredDropBadge,
  PremiumSubscriptionBadge,
  FinderModeSelector,
  ArAssetSelector,
} from './ExpansionUI';
import {
  GoodMorningHome,
  EnhancedAdventureFeed,
  QuestoryPassport,
  LeaderboardScreen,
  EnhancedVictoryScreen,
  CollectionProgressCard,
} from './SweepUI';
import {
  SponsorDashboard,
  CreatorProfileScreen,
  CoinShopPanel,
  PremiumGate,
  RatingModal,
  CreationFeeBanner,
  VerifiedSponsorBadge,
} from './EconomyUI';
import './style.css';
import './discoveryBloom.css';
import './livingWorld.css';
import './livingWorldEvents.css';
import './socialDiscovery.css';
import './questoryIdentity.css';
import './worldDiscovery.css';
import './codex.css';
import './progression.css';
import './crafting.css';
import './legendaryHunt.css';
import { LegendaryHuntPanel } from './LegendaryHuntUI';
import { getInitialState, persistState } from './persistence';
import {
  draftSyncBadgeLabel,
  getDraftSyncBadge,
  mergeAdventuresWithLocalDrafts,
  mergeSavedDraftIntoAdventures,
  removeLocalDraft,
  retryDraftCloudSync,
  saveAdventureDraft,
} from './draftIntegrity';
import {
  applyWhisperingHollowToCreateForm,
  emptyArScene,
  getArSceneId,
  normalizeArScene,
} from './arEngine';
import { CinematicAROverlay, ARSceneReplayButton } from './CinematicAR';
import { ArFinaleBuilder, ClueArSceneBuilder, WhisperingHollowQuickButton } from './ARSceneBuilder';
import { MediaStudioPanel, insertAssetIntoScene } from './MediaStudioUI';
import { applyCollectionSeriesPreset, COLLECTION_SERIES_PRESETS } from './collectionSeries';
import {
  adventureToCreateFormState,
  canRepairWhisperingHollow,
  duplicateAdventureAsDraft,
  mergeAdventurePreserveFields,
  repairWhisperingHollowClues,
  replaceAdventureInList,
  validateAdventureCluesForPublish,
} from './adventureEditor';
import { MapScreen, MiniClueMap } from './QuestoryMap';
import {
  AccessTypeSelector,
  AccessStatusBanner,
  AccessTypeBadge,
  usePlayerLocation,
} from './AccessRulesUI';
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
  claimLimitedRewardRemote,
} from './supabase/dataService';
import {
  isAdventureEnded,
  normalizeFinalRewards,
  END_RULES,
  REWARD_POLICIES,
} from './rewardInventory';
import {
  RewardInventoryFields,
  AdventureEndRulesFields,
  RewardStatusPanel,
  AdventureEndedBanner,
  AdminRewardControls,
  PlayForBadgeOnlyNotice,
} from './RewardInventoryUI';
import { normalizeExperience } from './experience';
import {
  isAdventureUnlocked,
  normalizeWorld,
  normalizeWorldConfig,
} from './worldEngine';
import {
  initWorldEventEngine,
  safeApplyWorldEventToAdventure,
  safeGetWorldEventContext,
} from './worldEventEngine';
import { WorldEventAtmosphereOverlay, ActiveWorldEventBadge } from './WorldEventUI';
import { ADVENTURE_TEMPLATES, SCALE_PRESETS, buildTemplateClues, buildTemplateRewards, buildTemplateStory, getTemplateMeta } from './templates';
import {
  TemplatePicker,
  ScaleSelector,
  SmartBuilderPanel,
  ToolkitPanel,
  QuestoryAssistant,
  AdventureDirectorPanel,
  AdventureDirectorStrip,
  ClueTypeFields,
  CluePlayContent,
  DynamicHintPanel,
  AdventureHealthDashboard,
  VerificationModePanel,
  CreatorVerifiedBadge,
  BackyardPrecisionBanner,
  ExperienceVictoryMessage,
  HorrorAtmosphereOverlay,
  ClueChapterHeader,
  AdventureIntroModal,
  DirectorLoreRevealPanel,
  DirectorMoodBadge,
} from './ExperienceUI';
import {
  WorldEngineHub,
  WeatherOverlay,
  GlobalLoreBanner,
  WorldEventBadge,
  CreatorPrestigeBadge,
  LockedAdventureNotice,
  BranchChoicePanel,
  BranchPathTracker,
  NpcPlayCard,
  WorldHealthDashboard,
  EndingRevealBanner,
} from './WorldEngineUI';
import {
  shouldShowWelcome,
  shouldShowJourney,
  shouldShowPlayerGuide,
  getAccessibilityClassName,
  DEMO_ADVENTURE_ID,
} from './invitation';
import {
  normalizeGrowth,
  recordAdventureStart,
  recordAdventureView,
} from './growth';
import {
  WelcomeOnboarding,
  PlayerGuideOnboarding,
  ChooseYourJourney,
  QuickCreateWizard,
  InvitePlayersPanel,
  FirstCompletionCelebration,
  SponsorExpressPanel,
  KidModeCreator,
  InvitationHomeBanner,
} from './InvitationUI';
import {
  GrowthEngineHub,
  GrowthHomeBanner,
  QuestCodeBadge,
} from './GrowthUI';
import {
  AppLoadingOverlay,
  ErrorRecoveryBanner,
  AdminLaunchAnalytics,
  AppErrorBoundary,
} from './StabilityUI';
import {
  normalizeLaunchFunnel,
  recordSessionStart,
  recordLaunchError,
  trackCreatePublished,
} from './stability';

function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <QuestoryApp />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

function QuestoryApp() {
  const auth = useAuth();
  const { location: playerLocation } = usePlayerLocation();
  const { user, isAdmin, isSponsor, isCreator, isSupabaseMode, loading: authLoading } = auth;
  const [state, setState] = useState(getInitialState);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [remoteLoading, setRemoteLoading] = useState(isSupabaseMode);
  const [adventureSyncError, setAdventureSyncError] = useState('');
  const [showFirstCelebration, setShowFirstCelebration] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const dailyLoginApplied = useRef(false);
  const clueStartRef = useRef(Date.now());
  const { syncProfile, syncRewardsAndHistory, syncProgressionState } = useMemo(
    () => createSyncHelpers({ user, isSupabaseMode }),
    [user, isSupabaseMode]
  );

  useEffect(() => {
    if (dailyLoginApplied.current) return;
    dailyLoginApplied.current = true;
    setState((s) => {
      const result = applyDailyLogin(s);
      if (result.coinsEarned > 0) {
        syncDailyLoginIfNeeded({ user, isSupabaseMode, state: result.state });
      }
      return result.state;
    });
  }, [isSupabaseMode, user?.id]);

  useEffect(() => {
    initWorldEventEngine(state.adventures, state);
  }, []);

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
    const adventures = await fetchMergedAdventures();
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
        setAdventureSyncError('');
        setState((s) => mergeRemoteDataIntoState(s, remote, user));
      } catch (err) {
        console.error('Questory Supabase load failed:', err);
        setAdventureSyncError('Could not load adventures from Supabase. Try refreshing the page.');
        setState((s) => recordLaunchError(s, 'remote_load', err));
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, isAdmin, authLoading, isSupabaseMode]);

  const selected = state.adventures.find((a) => a.id === state.selectedAdventureId);
  const inviteAdventure =
    state.adventures.find((a) => a.id === state.pendingInviteAdventureId) || selected;
  const progress = selected ? getAdventureProgress(state, selected.id) : null;

  function getAccessContext(adventure, previewModeOverride) {
    return evaluateAccessContext(adventure, {
      userLatitude: playerLocation?.latitude ?? null,
      userLongitude: playerLocation?.longitude ?? null,
      adminPreview: state.adminPreview,
      previewMode: previewModeOverride ?? state.previewMode,
      isAdmin,
      userId: user?.id ?? null,
    });
  }

  function nav(screen, adventureId = state.selectedAdventureId, options = {}) {
    setState((s) => {
      let next = {
        ...s,
        screen,
        selectedAdventureId: adventureId ?? s.selectedAdventureId,
        selectedCreatorId: options.creatorId ?? s.selectedCreatorId,
        adminPreview:
          'adminPreview' in options ? options.adminPreview : s.adminPreview,
        previewMode:
          'previewMode' in options ? options.previewMode : screen === 'play' || screen === 'detail' ? s.previewMode : false,
        adminTab: options.adminTab ?? s.adminTab,
        quickSponsor: 'quickSponsor' in options ? options.quickSponsor : s.quickSponsor,
        growthTab: options.growthTab ?? s.growthTab,
        vaultTab: options.tab ?? s.vaultTab,
      };
      if (screen === 'detail' && adventureId) {
        next = recordAdventureView(next, adventureId);
        const adv = next.adventures.find((a) => a.id === adventureId);
        if (adv) next = recordMapReveal(next, adv);
      }
      if (screen === 'play' && adventureId) {
        next = recordAdventureStart(next, adventureId);
        next = applyPlayNavigation(next, adventureId);
      }
      return next;
    });
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
    const adventure = state.adventures.find((a) => a.id === adventureId);
    if (!adventure) return;

    const clueCheck = validateAdventureCluesForPublish(adventure);
    if (!clueCheck.ok) {
      setAdventureSyncError(clueCheck.message);
      alert(clueCheck.message);
      return;
    }

    updateAdventure(adventureId, { status: ADVENTURE_STATUS.PUBLISHED });
    removeLocalDraft(adventureId);
    setState((s) => trackCreatePublished(s));

    if (isSupabaseMode && user) {
      const published = { ...adventure, status: ADVENTURE_STATUS.PUBLISHED };
      upsertAdventure(published, user.id)
        .then(() => refreshAdventuresFromRemote())
        .catch((err) => {
          console.error('Publish sync failed:', err);
          setAdventureSyncError(formatUserErrorMessage(err) || 'Could not publish adventure.');
        });
    }
  }

  function editAdventure(adventureId) {
    setState((s) => ({
      ...s,
      editingAdventureId: adventureId,
      screen: 'create',
      adminPreview: false,
    }));
  }

  function duplicateAdventure(adventureId) {
    const source = state.adventures.find((a) => a.id === adventureId);
    if (!source) return;
    const copy = duplicateAdventureAsDraft(source);
    setState((s) => ({
      ...s,
      adventures: [copy, ...s.adventures],
      adminTab: 'drafts',
    }));
    if (isSupabaseMode && user) {
      upsertAdventure(copy, user.id)
        .then(() => refreshAdventuresFromRemote())
        .catch((err) => console.error('Duplicate sync failed:', err));
    }
  }

  function unpublishAdventure(adventureId) {
    const adventure = state.adventures.find((a) => a.id === adventureId);
    if (!adventure) return;
    updateAdventure(adventureId, { status: ADVENTURE_STATUS.DRAFT });
    if (isSupabaseMode && user) {
      upsertAdventure({ ...adventure, status: ADVENTURE_STATUS.DRAFT }, user.id)
        .then(() => refreshAdventuresFromRemote())
        .catch((err) => {
          console.error('Unpublish sync failed:', err);
          setAdventureSyncError(formatUserErrorMessage(err) || 'Could not unpublish adventure.');
        });
    }
  }

  async function repairAdventureClues(adventureId) {
    const adventure = state.adventures.find((a) => a.id === adventureId);
    if (!adventure || !canRepairWhisperingHollow(adventure)) return;
    const repaired = repairWhisperingHollowClues(adventure);
    setState((s) => ({
      ...s,
      adventures: replaceAdventureInList(s.adventures, repaired),
    }));
    if (isSupabaseMode && user) {
      try {
        await upsertAdventure(repaired, user.id);
        await refreshAdventuresFromRemote();
      } catch (err) {
        console.error('Repair sync failed:', err);
        setAdventureSyncError(formatUserErrorMessage(err) || 'Could not repair adventure clues.');
      }
    }
  }

  function archiveAdventure(adventureId) {
    updateAdventure(adventureId, { status: ADVENTURE_STATUS.ARCHIVED });
    if (isSupabaseMode) {
      updateAdventureStatus(adventureId, ADVENTURE_STATUS.ARCHIVED)
        .then(() => refreshAdventuresFromRemote())
        .catch((err) => {
          console.error('Archive sync failed:', err);
          setAdventureSyncError(formatUserErrorMessage(err) || 'Could not archive adventure.');
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
          setAdventureSyncError(formatUserErrorMessage(err) || 'Could not restore adventure.');
        });
    }
  }

  function deleteAdventure(adventureId) {
    removeLocalDraft(adventureId);
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
          setAdventureSyncError(formatUserErrorMessage(err) || 'Could not delete adventure.');
        });
    }
  }

  function solveClue(adventure) {
    setState((s) => {
      const nextState = advanceClueForAdventure(s, adventure, clueStartRef);
      if (isSupabaseMode && user) syncProgressionState(nextState);
      return nextState;
    });
  }

  async function claimTreasure(adventure, code, options = {}) {
    const accessContext = getAccessContext(adventure, options.previewMode);
    const result = await runClaimTreasure({
      state,
      adventure,
      code,
      options: { ...options, accessContext },
      user,
      isSupabaseMode,
      claimLimitedRewardRemote,
    });

    if (result.showLogin) setShowLogin(true);
    if (!result.applyToState) return result.response;

    setState((s) => {
      const nextState = result.applyToState(s);
      if (result.showFirstCelebration?.(s)) {
        setShowFirstCelebration(true);
      }
      if (result.syncAfterClaim && isSupabaseMode && user) {
        syncProgressionState(nextState);
      }
      return nextState;
    });

    return result.response;
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

  async function handleMedallionCapture(adventure, context = {}) {
    const result = await runMedallionCapture({
      adventure,
      context,
      state,
      claimTreasure,
      setState,
      syncProfile,
    });
    if (!result.ok && result.requiresLogin) {
      setShowLogin(true);
    }
    return result;
  }

  function continueAfterBonusFlow() {
    setState((s) => continueAfterBonus(s));
  }

  function resetPrototype() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  const needsLoginForVault = isSupabaseMode && !user;

  return (
    <div>
      <main className={`app ${getAccessibilityClassName(state.accessibility)}`}>
        {shouldShowWelcome(state) && (
          <WelcomeOnboarding state={state} setState={setState} />
        )}
        {!shouldShowWelcome(state) && shouldShowJourney(state) && (
          <ChooseYourJourney state={state} setState={setState} nav={nav} />
        )}
        {shouldShowPlayerGuide(state) && (
          <PlayerGuideOnboarding state={state} setState={setState} />
        )}
        {showQuickCreate && (
          <QuickCreateWizard
            state={state}
            setState={setState}
            userId={user?.id}
            isSupabaseMode={isSupabaseMode}
            onClose={() => setShowQuickCreate(false)}
          />
        )}
        {(state.screen === 'invite' || state.pendingInviteAdventureId) && inviteAdventure && (
          <InvitePlayersPanel
            adventure={inviteAdventure}
            state={state}
            setState={setState}
            onClose={() =>
              setState((s) => ({
                ...s,
                screen: s.screen === 'invite' ? 'detail' : s.screen,
                pendingInviteAdventureId: null,
              }))
            }
          />
        )}
        {showFirstCelebration && (
          <FirstCompletionCelebration
            state={state}
            setState={setState}
            nav={nav}
            onClose={() => setShowFirstCelebration(false)}
          />
        )}
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
        {authLoading && isSupabaseMode && (
          <AppLoadingOverlay message="Checking sign-in…" />
        )}
        {!authLoading && remoteLoading && isSupabaseMode && (
          <AppLoadingOverlay message="Syncing your adventures…" />
        )}
        {adventureSyncError && (
          <ErrorRecoveryBanner
            message={adventureSyncError}
            onRetry={() => window.location.reload()}
            onDismiss={() => setAdventureSyncError('')}
          />
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
        {state.screen === 'home' && (
          <GoodMorningHome
            state={state}
            setState={setState}
            adventures={state.adventures}
            auth={auth}
            nav={nav}
          />
        )}
        {state.screen === 'feed' && (
          <EnhancedAdventureFeed
            adventures={state.adventures}
            state={state}
            nav={nav}
            auth={auth}
            setState={setState}
          />
        )}
        {state.screen === 'map' && (
          <MapScreen
            adventures={getMapVisibleAdventures(state.adventures, {
              isAdmin,
              userId: user?.id,
            })}
            nav={nav}
            state={state}
            setState={setState}
            isAdmin={isAdmin}
            userId={user?.id}
          />
        )}
        {state.screen === 'detail' && selected && (
          <AdventureDetail
            adventure={selected}
            progress={progress}
            nav={nav}
            adminPreview={state.adminPreview}
            previewMode={state.previewMode}
            accessContext={getAccessContext(selected, state.previewMode)}
            state={state}
            setState={setState}
            adventures={state.adventures}
            isAdmin={isAdmin}
          />
        )}
        {state.screen === 'play' && selected && (
          <AdventurePlay
            adventure={selected}
            progress={progress}
            state={state}
            setState={setState}
            onSolve={() => solveClue(selected)}
            onClaim={(code, options) =>
              claimTreasure(selected, code, { ...options, previewMode: state.previewMode })
            }
            nav={nav}
            adminPreview={state.adminPreview}
            previewMode={state.previewMode}
            accessContext={getAccessContext(selected, state.previewMode)}
            isDevMode={state.adminPreview || isAdmin}
            clueStartRef={clueStartRef}
            advanceClueForAdventure={advanceClueForAdventure}
            onClueAdvanced={(nextState) => {
              if (isSupabaseMode && user) syncProgressionState(nextState);
            }}
          />
        )}
        {state.screen === 'medallion-signal' && selected && (
          <MedallionSignalScreen
            adventure={selected}
            nav={nav}
            adminPreview={state.adminPreview}
            isDevMode={state.adminPreview || isAdmin}
            state={state}
          />
        )}
        {state.screen === 'finder' && selected && (
          <FinderModeScreen
            adventure={selected}
            progress={progress}
            nav={nav}
            adminPreview={state.adminPreview}
            isDevMode={state.adminPreview || isAdmin}
            setState={setState}
            state={state}
            onMedallionTap={(context) => handleMedallionCapture(selected, context)}
          />
        )}
        {state.screen === 'bonus' && state.pendingBonus && selected && (
          <BonusFindModal
            bonus={state.pendingBonus}
            onContinue={continueAfterBonusFlow}
          />
        )}
        {state.screen === 'vault' && (
          needsLoginForVault ? (
            <SignInPrompt onLogin={() => setShowLogin(true)} />
          ) : (
            <QuestoryPassport
              state={state}
              adventures={state.adventures}
              onRedeem={redeemReward}
              setState={setState}
              nav={nav}
            />
          )
        )}
        {state.screen === 'legendary-hunt' && (
          <LegendaryHuntPanel
            state={state}
            adventures={state.adventures}
            setState={setState}
            nav={nav}
          />
        )}
        {state.screen === 'sponsor' &&
          (isSupabaseMode && !user ? (
            <SignInPrompt onLogin={() => setShowLogin(true)} />
          ) : (
            <SponsorDashboard
              state={state}
              adventures={state.adventures}
              auth={auth}
              setState={setState}
              nav={nav}
            />
          ))}
        {state.screen === 'creator' && state.selectedCreatorId && (
          <CreatorProfileScreen
            creatorId={state.selectedCreatorId}
            state={state}
            setState={setState}
            nav={nav}
            adventures={state.adventures}
          />
        )}
        {state.screen === 'social' && (
          <SocialHub
            state={state}
            setState={setState}
            adventures={state.adventures}
            nav={nav}
            auth={auth}
          />
        )}
        {state.screen === 'platform' && (
          <PlatformHub
            state={state}
            setState={setState}
            nav={nav}
            auth={auth}
          />
        )}
        {state.screen === 'world' && (
          <WorldEngineHub
            state={state}
            setState={setState}
            adventures={state.adventures}
            nav={nav}
          />
        )}
        {state.screen === 'growth' && (
          <GrowthEngineHub
            state={state}
            setState={setState}
            adventures={state.adventures}
            nav={nav}
            initialTab={state.growthTab || 'referrals'}
          />
        )}
        {state.screen === 'leaderboard' && (
          <LeaderboardScreen state={state} adventures={state.adventures} />
        )}
        {state.screen === 'victory' && state.victoryCertificate && (
          <>
            {state.pendingRating && selected && (
              <RatingModal
                adventure={selected}
                onSubmit={(rating, review) => {
                  setState((s) => ({
                    ...submitRating(s, selected.id, rating, review),
                    pendingRating: null,
                  }));
                  if (isSupabaseMode && user) {
                    syncProfile(submitRating(state, selected.id, rating, review));
                  }
                }}
                onSkip={() => setState((s) => ({ ...s, pendingRating: null }))}
              />
            )}
            {state.pendingPhotoMemory && selected && (
              <PhotoMemoryPrompt
                adventure={selected}
                onCapture={(caption) => {
                  setState((s) => ({
                    ...addPhotoMemory(s, selected.id, caption),
                    pendingPhotoMemory: null,
                  }));
                }}
                onSkip={() => setState((s) => ({ ...s, pendingPhotoMemory: null }))}
              />
            )}
            <PlayForBadgeOnlyNotice message={state.claimMessage} />
            {selected && <ExperienceVictoryMessage adventure={selected} />}
            <EnhancedVictoryScreen
              certificate={state.victoryCertificate}
              engagementUpdate={state.victoryEngagement}
              nav={nav}
              adventure={selected}
              state={state}
              adventures={state.adventures}
            />
            {selected && (
              <DirectorLoreRevealPanel
                adventure={selected}
                state={state}
                progress={getAdventureProgress(state, selected.id)}
              />
            )}
          </>
        )}
        {state.screen === 'create' && (
          isSupabaseMode && !isAdmin && !isSponsor ? (
            <AdminGate onLogin={() => setShowLogin(true)} />
          ) : (
            <CreateAdventure
              state={state}
              setState={setState}
              reset={resetPrototype}
              userId={user?.id}
              isSupabaseMode={isSupabaseMode}
              auth={auth}
              editingAdventureId={state.editingAdventureId}
              onAdventuresSaved={refreshAdventuresFromRemote}
              onQuickCreate={() => setShowQuickCreate(true)}
              onPublish={publishAdventure}
            />
          )
        )}
        {state.screen === 'admin' && (
          isSupabaseMode && !isAdmin ? (
            <AdminGate onLogin={() => setShowLogin(true)} />
          ) : (
            <AdminReview
              state={state}
              setState={setState}
              adventures={state.adventures}
              adminTab={state.adminTab}
              nav={nav}
              onPublish={publishAdventure}
              onArchive={archiveAdventure}
              onRestore={restoreAdventure}
              onDelete={deleteAdventure}
              onEdit={editAdventure}
              onDuplicate={duplicateAdventure}
              onUnpublish={unpublishAdventure}
              onRepairClues={repairAdventureClues}
              onTabChange={(tab) => setState((s) => ({ ...s, adminTab: tab }))}
              onRetryDraftSync={async (adventureId) => {
                if (!user?.id) {
                  setAdventureSyncError('Sign in to sync drafts to the cloud.');
                  return null;
                }
                const result = await retryDraftCloudSync({
                  adventureId,
                  userId: user.id,
                  upsertAdventure,
                });
                if (result.cloudSaved) {
                  await refreshAdventuresFromRemote();
                } else if (result.localSaved) {
                  setState((s) => ({
                    ...s,
                    adventures: mergeAdventuresWithLocalDrafts(
                      s.adventures.filter(
                        (a) => a.status !== ADVENTURE_STATUS.DRAFT || a._draftSync?.cloud
                      )
                    ),
                  }));
                }
                return result;
              }}
              isSupabaseMode={isSupabaseMode}
              userId={user?.id}
            />
          )
        )}
      </main>
      {!['play', 'finder', 'medallion-signal', 'victory', 'bonus'].includes(state.screen) && (
        <BottomNav
          screen={state.screen}
          nav={nav}
          adminPreview={state.adminPreview}
          isSponsor={isSponsor || isAdmin}
        />
      )}
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
      setSignOutError(formatUserErrorMessage(err) || 'Could not sign out. Please try again.');
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
          {(state.engagement?.streak?.count || 0) > 0 && (
            <div className="header-streak" title="Daily streak">
              🔥 {state.engagement.streak.count}
            </div>
          )}
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

function AdventureDetail({
  adventure,
  progress,
  nav,
  adminPreview,
  previewMode = false,
  accessContext,
  state,
  setState,
  adventures,
  isAdmin,
}) {
  const [showIntro, setShowIntro] = useState(false);
  const ended = isAdventureEnded(adventure);
  const unlocked = isAdventureUnlocked(state, adventure);
  const access = accessContext;
  const canStart = access?.canPlayFull || access?.canPreview || adminPreview;
  const playable =
    isAdventurePlayable(adventure, adminPreview) &&
    (!ended || progress.claimed) &&
    unlocked &&
    canStart;
  const pct = progress.claimed
    ? 100
    : Math.round((progress.step / Math.max(adventure.clues.length, 1)) * 100);
  const myTeam = getMyTeam(state);

  function startPlay(forcePreview = false) {
    const usePreview = forcePreview || previewMode || access?.mode === 'preview';
    nav('play', adventure.id, { adminPreview, previewMode: usePreview });
  }

  return (
    <>
      {showIntro && (
        <AdventureIntroModal
          adventure={adventure}
          onAccept={() => {
            setShowIntro(false);
            startPlay();
          }}
          onSkip={() => {
            setShowIntro(false);
            startPlay();
          }}
        />
      )}
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
      {adventure.isFounderHunt && (
        <div className="preview-banner founder-banner">
          <Crown size={16} /> Founder Hunt · Found What Was Lost
        </div>
      )}
      {adminPreview && <AdminClaimCode adventure={adventure} />}
      <AccessStatusBanner access={access} />
      <div className="card detail-hero">
        <div className="row">
          {adventure.isFounderHunt ? (
            <span className="badge founder-badge">
              <Crown size={12} /> Founder Hunt
            </span>
          ) : (
            <span className={`badge ${adventure.status}`}>
              {adventureStatusLabel(adventure.status)}
            </span>
          )}
          <AccessTypeBadge adventure={adventure} compact />
          <small>{adventure.distance}</small>
        </div>
        <h2>{adventure.title}</h2>
        {adventure.collectionName && (
          <p className="detail-collection">⭐ {adventure.collectionName}</p>
        )}
        <AdventureEndedBanner adventure={adventure} />
        <CreatorVerifiedBadge adventure={adventure} />
        <WorldEventBadge adventure={adventure} />
        <CreatorPrestigeBadge adventure={adventure} adventures={adventures} />
        <BackyardPrecisionBanner adventure={adventure} />
        <VerifiedSponsorBadge adventure={adventure} />
        <TeamHuntBadge adventure={adventure} team={myTeam} />
        <LegendaryHuntBadge adventure={adventure} />
        <CashHuntBadge adventure={adventure} />
        <SponsoredDropBadge adventure={adventure} />
        {isPremiumAdventure(adventure) && (
          <p className="detail-premium">Premium · {adventure.premiumCoinCost || 250} coins to unlock</p>
        )}
        <button
          type="button"
          className="ghost creator-link"
          onClick={() => nav('creator', null, { creatorId: getCreatorForAdventure(adventure).id })}
        >
          Creator: {getCreatorForAdventure(adventure).name}
        </button>
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

      {adventure.collectionId && state && adventures && (
        <CollectionProgressCard
          collectionId={adventure.collectionId}
          state={state}
          adventures={adventures}
        />
      )}

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

      {state && (
        <div className="card heat-adventure-stat">
          <Flame size={16} />{' '}
          {getHeatLabel(adventure.heatCategory || getHeatCategory(adventure))} ·{' '}
          {computeAdventureHeat(adventure, state)}° heat
        </div>
      )}

      <RewardStatusPanel adventure={adventure} />
      {!unlocked && <LockedAdventureNotice adventure={adventure} state={state} nav={nav} />}

      {(isAdmin || adminPreview) && state && setState && (
        <>
          <AdventureHealthDashboard adventure={adventure} state={state} />
          <WorldHealthDashboard adventure={adventure} state={state} />
          <VerificationModePanel
            adventure={adventure}
            state={state}
            setState={setState}
            clueIndex={progress.step}
          />
        </>
      )}

      <AdventureComments
        adventure={adventure}
        state={state}
        setState={setState}
        isAdmin={isAdmin}
      />

      {isAdmin && state && setState && (
        <AdminRewardControls
          adventure={adventure}
          setState={setState}
          onArchive={(id) => setState((s) => ({
            ...s,
            adventures: s.adventures.map((a) =>
              a.id === id ? { ...a, manuallyEnded: true, status: 'archived' } : a
            ),
          }))}
          onRestore={(id) => setState((s) => ({
            ...s,
            adventures: s.adventures.map((a) =>
              a.id === id
                ? { ...a, manuallyEnded: false, reopenedAt: new Date().toISOString(), status: 'published' }
                : a
            ),
          }))}
        />
      )}

      {!unlocked ? (
        <button type="button" onClick={() => nav('world')}>
          <Compass size={18} /> Discover in World to Unlock
        </button>
      ) : (
        <button
          disabled={!playable}
          onClick={() => {
            const usePreview = access?.tooFar && !adminPreview;
            if (!progress.claimed && progress.step === 0 && !adminPreview && !usePreview) {
              setShowIntro(true);
            } else {
              startPlay(usePreview);
            }
          }}
        >
          {ended && !progress.claimed
            ? 'Adventure Ended'
            : progress.claimed
              ? 'Replay Trail'
              : access?.tooFar && !adminPreview
                ? access.ctaLabel
                : progress.step > 0
                  ? 'Continue Adventure'
                  : access?.ctaLabel || 'Start Adventure'}
        </button>
      )}
    </>
  );
}

function GpsCheckIn({ clue, onUnlock, disabled = false, previewMode = false }) {
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

      <button onClick={handleGpsCheckIn} disabled={checking || disabled}>
        <MapPin size={18} /> {checking ? 'Checking…' : previewMode ? 'Preview Unlock' : disabled ? 'Choose a path first' : 'GPS Check-In'}
      </button>

      {previewMode && (
        <button className="ghost dev-unlock" onClick={onUnlock} disabled={checking || disabled}>
          Skip GPS (Preview)
        </button>
      )}

      {!previewMode && (
        <button className="ghost dev-unlock" onClick={onUnlock} disabled={checking || disabled}>
          Dev Unlock
        </button>
      )}
    </div>
  );
}

function AdventurePlay({
  adventure: baseAdventure,
  progress,
  state,
  setState,
  onSolve,
  onClaim,
  nav,
  adminPreview,
  previewMode = false,
  accessContext,
  isDevMode = false,
  clueStartRef,
  advanceClueForAdventure,
  onClueAdvanced,
}) {
  const eventContext = useMemo(
    () => safeGetWorldEventContext(state, state.adventures || []),
    [state]
  );
  const adventure = useMemo(
    () => safeApplyWorldEventToAdventure(baseAdventure, eventContext),
    [baseAdventure, eventContext]
  );
  const clues = Array.isArray(adventure?.clues) ? adventure.clues : [];
  const total = clues.length;
  const atClaim = total === 0 || progress.step >= total;
  const clueIndex = total > 0 ? Math.min(progress.step, total - 1) : 0;
  const rawClue = total > 0 ? clues[clueIndex] : null;
  const clue = rawClue ? resolveDirectorClue(adventure, rawClue, progress) : null;
  const pct = progress.claimed ? 100 : total > 0 ? Math.round((progress.step / total) * 100) : 100;
  const method = adventure.claimMethod || CLAIM_METHOD.SECRET_CODE;
  const finderFlow = adventureUsesFinder(adventure);
  const awaitingFinder = atClaim && finderFlow && !progress.medallionTapped && !progress.claimed;
  const readyToClaim =
    atClaim &&
    !progress.claimed &&
    method !== CLAIM_METHOD.TAP_MEDALLION &&
    (!finderFlow || progress.medallionTapped);
  const hintKey = `${adventure.id}:${clueIndex}`;
  const hintText = state.economy?.hintUnlocks?.[hintKey];
  const [dynamicHint, setDynamicHint] = useState('');
  const premiumLocked =
    isPremiumAdventure(adventure) && !canAccessPremiumHunt(state, adventure) && !adminPreview;

  const { activeAr, completeArScene, queueArScene, canReplayClueAr, clueArScene } =
    useArSceneFlow({
      adventure,
      progress,
      clue,
      atClaim,
      setState,
      advanceClueForAdventure,
      clueStartRef,
      onClueAdvanced,
    });

  const adaptiveAudioContext = useMemo(
    () => ({
      claimed: progress.claimed,
      atClaim,
      awaitingFinder,
      medallionTapped: progress.medallionTapped,
      arActive: Boolean(activeAr),
      clueIndex: progress.step,
      totalClues: total,
      onFinderScreen: false,
    }),
    [
      progress.claimed,
      progress.step,
      progress.medallionTapped,
      atClaim,
      awaitingFinder,
      activeAr,
      total,
    ]
  );

  function handleCoinSpend(type) {
    let result;
    if (type === 'hint') result = purchaseHint(state, adventure.id, clueIndex);
    else if (type === 'skip') {
      result = purchaseSkipClue(state, adventure.id, clueIndex);
      if (result.ok) {
        setState(result.state);
        onSolve();
        return;
      }
    } else if (type === 'reveal') result = purchaseRevealSearchRadius(state, adventure.id);
    else if (type === 'medallion') {
      result = spendCoins(state, COIN_SPEND.EXCLUSIVE_MEDALLION, 'exclusive_medallion', {
        adventureId: adventure.id,
      });
      if (result.ok) {
        setState({
          ...result.state,
          economy: {
            ...result.state.economy,
            exclusiveMedallions: [...(result.state.economy.exclusiveMedallions || []), adventure.id],
          },
        });
        return;
      }
    }
    if (!result) return;
    if (result.ok) setState(result.state);
    else alert(formatUserErrorMessage(result));
  }

  function handlePremiumUnlock() {
    const result = purchasePremiumUnlock(state, adventure);
    if (result.ok) setState(result.state);
    else alert(formatUserErrorMessage(result));
  }

  if (premiumLocked) {
    return (
      <>
        <button type="button" className="ghost back" onClick={() => nav('detail', adventure.id, { adminPreview })}>
          ← Adventure Detail
        </button>
        <PremiumGate adventure={adventure} state={state} onUnlock={handlePremiumUnlock} />
      </>
    );
  }

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
      <AccessStatusBanner access={accessContext} />
      <WeatherOverlay state={state} />
      <WorldEventAtmosphereOverlay context={eventContext} />
      <HorrorAtmosphereOverlay adventure={adventure} eventContext={eventContext} />
      <BackyardPrecisionBanner adventure={adventure} />
      <DirectorMoodBadge adventure={adventure} context={adaptiveAudioContext} />
      <CinematicAROverlay
        open={Boolean(activeAr)}
        scene={activeAr?.scene}
        onComplete={completeArScene}
        useCamera={usesArFinder(adventure)}
      />
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

      <div className={`card clue ${!atClaim && clue ? 'clue-chapter-card' : ''}`}>
        {!atClaim && !progress.claimed && clue ? (
          <ClueChapterHeader
            chapter={progress.step + 1}
            total={total}
            title={clue.title}
            adventureTitle={adventure.title}
            beat={getDirectorChapterBeat(adventure, clueIndex, total)}
            pathVariant={clue._directorVariant}
          />
        ) : (
          <h3>
            {progress.claimed
              ? 'Treasure Claimed'
              : awaitingFinder
                ? 'Medallion Finder'
                : 'Treasure Claim'}
          </h3>
        )}

        {!atClaim && !progress.claimed && clue && (
          <>
            <BranchPathTracker adventure={adventure} progress={progress} />
            <NpcPlayCard
              adventure={adventure}
              state={state}
              setState={setState}
              clueIndex={clueIndex}
              progress={progress}
              eventContext={eventContext}
            />
            <BranchChoicePanel
              clue={clue}
              progress={progress}
              adventure={adventure}
              onSelect={(pathId) => setState((s) => commitBranchPath(s, adventure, pathId, clueIndex))}
            />
            <CluePlayContent
              clue={clue}
              onAnswer={() => queueArScene('after_answer', { advanceClue: true })}
            />
            <GhostTrailHint state={state} adventureId={adventure.id} clueIndex={clueIndex} />
            {dynamicHint && <p className="coin-hint">{dynamicHint}</p>}
            {hintText && <p className="coin-hint">{hintText}</p>}
            <DynamicHintPanel
              clueStartMs={clueStartRef?.current || Date.now()}
              adventure={adventure}
              onAcceptHint={(text) => setDynamicHint(text)}
              onSpendCoins={() => handleCoinSpend('hint')}
            />
            <CoinShopPanel
              adventure={adventure}
              state={state}
              progress={progress}
              clueIndex={clueIndex}
              onSpend={handleCoinSpend}
            />
            <GpsCheckIn
              clue={clue}
              onUnlock={() => queueArScene('after_checkin', { advanceClue: true })}
              disabled={Array.isArray(clue.branchOptions) && clue.branchOptions.length > 0 && !progress.pathId}
              previewMode={previewMode || accessContext?.remoteOnlyRewards}
            />
            {canReplayClueAr && (
              <ARSceneReplayButton
                onClick={() => queueArScene(clueArScene.trigger, { forceReplay: true })}
              />
            )}
          </>
        )}

        {awaitingFinder && (
          <FinderAwaitingPanel
            adventure={adventure}
            nav={nav}
            adminPreview={adminPreview}
            isDevMode={isDevMode}
            state={state}
          />
        )}

        {readyToClaim && (
          <>
            <EndingRevealBanner adventure={adventure} progress={progress} />
            <TreasureClaimPanel
              adventure={adventure}
              progress={progress}
              onClaim={onClaim}
              state={state}
            />
          </>
        )}

        {progress.claimed && (
          <>
            <div className="claim-success-card">
              <Sparkles size={24} />
              <p>Adventure complete! Your rewards are in your Passport.</p>
            </div>
            <button type="button" onClick={() => nav('victory', adventure.id, { adminPreview })}>
              <Award size={18} /> View Celebration
            </button>
            <button type="button" className="ghost" onClick={() => nav('vault')}>
              <Sparkles size={18} /> Open Passport
            </button>
          </>
        )}
      </div>

      {(progress.bonuses?.length ?? 0) > 0 && (
        <div className="card">
          <h3>Bonus Finds Collected</h3>
          <div className="chips">
            {progress.bonuses.map((id) => {
              const bonusFinds = Array.isArray(adventure.bonusFinds) ? adventure.bonusFinds : [];
              const b = bonusFinds.find((x) => x.id === id);
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
    clueType: 'text_riddle',
    choices: [],
    audioUrl: '',
    videoUrl: '',
    imageUrl: '',
    arScene: emptyArScene(),
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

function ClueEditor({ clue, index, total, onChange, onRemove, onUseLocation, locStatus, showArMode }) {
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

      <ClueTypeFields clue={clue} onChange={(patch) => onChange(clue.id, patch)} />

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

      <ClueArSceneBuilder
        clue={clue}
        showArMode={showArMode}
        onChange={(patch) => onChange(clue.id, patch)}
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
    quantityLimit: null,
    claimedCount: 0,
    rewardPolicy: REWARD_POLICIES.REPLACE_WITH_BACKUP,
    rewardWindowStart: null,
    rewardWindowEnd: null,
    backupReward: {
      title: 'Completion Badge',
      desc: '25 coins + badge after rewards ran out.',
      coins: 25,
      badgeLabel: 'Trail Finisher',
    },
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

function RewardEditor({ reward, onChange, adventureId }) {
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
          <RewardInventoryFields
            reward={reward}
            onChange={(patch) => onChange(reward.type, patch)}
          />
        </>
      )}
    </div>
  );
}

function rewardsFromTemplates(templates) {
  const types = ['medallion', 'coupon', 'physical'];
  const templateByType = Object.fromEntries(templates.map((r) => [r.type, r]));
  return types.map((type) => {
    const template = templateByType[type];
    const base = emptyReward(type);
    if (!template) return { type, enabled: false, ...base };
    return {
      type,
      enabled: true,
      icon: template.icon || base.icon,
      title: template.title || '',
      desc: template.desc || '',
      valueLabel: template.valueLabel || '',
      redemptionInstructions: template.redemptionInstructions || '',
      expirationDays: String(template.expirationDays ?? base.expirationDays),
      quantityLimit: null,
      claimedCount: 0,
      rewardPolicy: REWARD_POLICIES.CONTINUE_BADGE_COINS_ONLY,
    };
  });
}

function CreateAdventure({
  state,
  setState,
  reset,
  userId,
  isSupabaseMode,
  auth,
  editingAdventureId,
  onAdventuresSaved,
  onQuickCreate,
  onPublish,
}) {
  const [meta, setMeta] = useState({
    title: '',
    location: '',
    sponsorName: '',
    sponsorLogoUrl: '',
    sponsorWebsite: '',
    story: '',
    claimCode: generateClaimCode(),
    claimMethod: CLAIM_METHOD.SECRET_CODE,
    claimHint: '',
    qrClaimValue: '',
    physicalMedallionCode: '',
    hintAfterTap: '',
    collectionName: '',
    collectionId: '',
    collectionBadge: '',
    collectionRewardCoins: 500,
    collectionRewardMedallion: '',
    isFounderHunt: false,
    playMode: 'both',
    accessType: 'hybrid',
    playRadiusM: '',
    finderMode: FINDER_MODES.FINDER,
    arAssetType: 'ghost_lantern',
    tier: 'standard',
    premiumCoinCost: 250,
    city: '',
    state: '',
    estimatedMinutes: 25,
    couponQuantity: 100,
    couponTerms: 'One per customer.',
    couponExpirationDays: 7,
    endRule: END_RULES.NO_END_DATE,
    endsAt: null,
    endsAfterTotalCompletions: null,
    finderSearchRadiusM: 200,
    finderCaptureBaseM: 25,
  });
  const [adventureTemplate, setAdventureTemplate] = useState(ADVENTURE_TEMPLATES.SCRATCH);
  const [adventureScale, setAdventureScale] = useState('city');
  const [experienceSettings, setExperienceSettings] = useState({});
  const [clues, setClues] = useState([emptyClue(), emptyClue(), emptyClue()]);
  const [rewards, setRewards] = useState([
    emptyReward('medallion'),
    emptyReward('coupon'),
    emptyReward('physical'),
  ]);
  const [formError, setFormError] = useState('');
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locStatus, setLocStatus] = useState(null);
  const [arFinale, setArFinale] = useState(emptyArScene());
  const [arTheme, setArTheme] = useState('none');
  const [mediaManifest, setMediaManifest] = useState([]);
  const [worldConfig, setWorldConfig] = useState(() => normalizeWorldConfig({}));
  const showArMode = meta.finderMode === FINDER_MODES.AR_ENHANCED;
  const editingAdventure = editingAdventureId
    ? state.adventures.find((a) => a.id === editingAdventureId)
    : null;
  const loadedEditIdRef = useRef(null);

  useEffect(() => {
    if (!editingAdventureId) {
      loadedEditIdRef.current = null;
      return;
    }
    if (loadedEditIdRef.current === editingAdventureId) return;
    const adventure = state.adventures.find((a) => a.id === editingAdventureId);
    if (!adventure) return;
    const form = adventureToCreateFormState(adventure);
    if (!form) return;
    setMeta(form.meta);
    setClues(form.clues.length ? form.clues : [emptyClue(), emptyClue(), emptyClue()]);
    setRewards(form.rewards);
    setAdventureTemplate(form.adventureTemplate);
    setAdventureScale(form.adventureScale);
    setExperienceSettings(form.experienceSettings);
    setArFinale(form.arFinale);
    setArTheme(form.arTheme);
    setMediaManifest(form.mediaManifest || []);
    setWorldConfig(normalizeWorldConfig(form.worldConfig || {}));
    setFormError('');
    setSaveFeedback(null);
    loadedEditIdRef.current = editingAdventureId;
  }, [editingAdventureId, state.adventures]);

  function handleTemplateSelect(templateId) {
    setAdventureTemplate(templateId);
    const template = getTemplateMeta(templateId);
    if (template.scale) setAdventureScale(template.scale);
    setExperienceSettings((settings) => ({
      ...settings,
      toolkit: template.toolkit || settings.toolkit,
      atmosphere: template.atmosphere || settings.atmosphere || 'mild',
      clueOrder: template.clueOrder || settings.clueOrder || 'sequence',
      soundEffects: template.soundEffects || settings.soundEffects || [],
      victoryMessage: template.victoryMessage || settings.victoryMessage || '',
    }));
    if (template.scale) {
      const scale = SCALE_PRESETS[template.scale];
      if (scale) {
        setMeta((m) => ({
          ...m,
          estimatedMinutes: scale.estimatedMinutes,
          finderSearchRadiusM: scale.finderSearchRadiusM,
          finderCaptureBaseM: scale.finderCaptureBaseM,
          story: m.story || buildTemplateStory(templateId, m.title || 'Adventure'),
        }));
        setExperienceSettings((settings) => ({ ...settings, backyardPrecision: scale.backyardPrecision }));
      }
    }
    setFormError('');
    if (templateId === 'horror') {
      applyWhisperingHollowToCreateForm({
        setMeta,
        setClues,
        setMetaAr: ({ arFinale: finale, arTheme: theme }) => {
          setArFinale(finale);
          setArTheme(theme);
        },
        clues,
      });
    }
  }

  function handleScaleChange(scaleId) {
    setAdventureScale(scaleId);
    const scale = SCALE_PRESETS[scaleId];
    if (scale) {
      setMeta((m) => ({
        ...m,
        estimatedMinutes: scale.estimatedMinutes,
        finderSearchRadiusM: scale.finderSearchRadiusM,
        finderCaptureBaseM: scale.finderCaptureBaseM,
      }));
      setExperienceSettings((settings) => ({ ...settings, backyardPrecision: scale.backyardPrecision }));
    }
    setFormError('');
  }

  function applyAssistantDraft(draft) {
    if (!draft?.ok) return;
    setMeta((m) => ({ ...m, ...draft.meta }));
    setClues(draft.clues);
    setRewards(draft.rewards);
    if (draft.meta.adventureTemplate) setAdventureTemplate(draft.meta.adventureTemplate);
    if (draft.meta.adventureScale) setAdventureScale(draft.meta.adventureScale);
    if (draft.meta.experienceSettings) setExperienceSettings(draft.meta.experienceSettings);
    setFormError('');
  }

  function applyDirectorDraft(draft) {
    if (!draft?.ok) return;
    applyAssistantDraft(draft);
    if (draft.arFinale) setArFinale(draft.arFinale);
    if (draft.arTheme) setArTheme(draft.arTheme);
    if (draft.worldConfig) setWorldConfig(normalizeWorldConfig(draft.worldConfig));
    if (draft.meta?.finderMode) {
      setMeta((m) => ({
        ...m,
        finderMode: draft.meta.finderMode,
        claimMethod: draft.meta.claimMethod || m.claimMethod,
        claimHint: draft.meta.claimHint || m.claimHint,
        qrClaimValue: draft.meta.qrClaimValue || m.qrClaimValue,
        hintAfterTap: draft.meta.hintAfterTap || m.hintAfterTap,
        collectionName: draft.meta.collectionName || m.collectionName,
        collectionId: draft.meta.collectionId || m.collectionId,
        collectionBadge: draft.meta.collectionBadge || m.collectionBadge,
      }));
    }
    setFormError('');
  }

  function applySmartBuilder(config) {
    setAdventureScale(config.adventureScale);
    setAdventureTemplate(config.adventureTemplate);
    setExperienceSettings((settings) => ({ ...settings, ...config.experienceSettings }));
    setMeta((m) => ({
      ...m,
      estimatedMinutes: config.estimatedMinutes,
      finderSearchRadiusM: config.finderSearchRadiusM,
      finderCaptureBaseM: config.finderCaptureBaseM,
      story: m.story || buildTemplateStory(config.adventureTemplate, m.title || 'Adventure'),
    }));
    const baseLat = clues[0]?.latitude ? parseFloat(clues[0].latitude) : 37.34;
    const baseLng = clues[0]?.longitude ? parseFloat(clues[0].longitude) : -95.26;
    setClues(
      buildTemplateClues(config.adventureTemplate, config.clueCount, baseLat, baseLng).map((clue) => ({
        ...clue,
        radiusMeters: String(config.clueRadiusM),
      }))
    );
    setRewards(rewardsFromTemplates(buildTemplateRewards(config.adventureTemplate)));
    setFormError('');
  }

  function handleGenerateScene(result, target) {
    if (!result?.ok || !result.scene) return;
    if (target === 'finale') {
      setArFinale(result.scene);
      if (result.suggestions?.finaleTheme?.arTheme) {
        setArTheme(result.suggestions.finaleTheme.arTheme);
      }
      return;
    }
    const match = /^clue-(\d+)$/.exec(target || '');
    const index = match ? parseInt(match[1], 10) : 0;
    setClues((list) =>
      list.map((c, i) => (i === index ? { ...c, arScene: result.scene } : c))
    );
  }

  function handleInsertMediaAsset(asset, target) {
    if (target === 'finale') {
      setArFinale((prev) => insertAssetIntoScene(prev || emptyArScene(), asset));
      return;
    }
    const match = /^clue-(\d+)$/.exec(target || '');
    const index = match ? parseInt(match[1], 10) : 0;
    setClues((list) =>
      list.map((c, i) =>
        i === index
          ? { ...c, arScene: insertAssetIntoScene(c.arScene || emptyArScene(), asset) }
          : c
      )
    );
  }

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
    const createCheck = canCreateAdventure(state, {
      isAdmin: auth?.isAdmin,
      isSponsor: auth?.isSponsor,
      userId,
    });
    if (!createCheck.ok) {
      const buy = window.confirm(
        `${createCheck.message}\n\nPurchase an extra slot for ${createCheck.cost} coins?`
      );
      if (!buy) return;
      const slot = purchaseExtraAdventureSlot(state);
      if (!slot.ok) {
        setFormError(formatUserErrorMessage(slot) || 'Not enough coins.');
        return;
      }
      setState(slot.state);
    }

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
      clueType: c.clueType || 'text_riddle',
      choices: Array.isArray(c.choices) ? c.choices : [],
      audioUrl: c.audioUrl?.trim() || '',
      videoUrl: c.videoUrl?.trim() || '',
      imageUrl: c.imageUrl?.trim() || '',
      bonusRewardText: c.bonusRewardText?.trim() || '',
      branchOptions: Array.isArray(c.branchOptions) ? c.branchOptions : [],
      pathVariants: c.pathVariants || undefined,
      arScene: normalizeArScene(c.arScene),
    }));

    const enabledRewards = rewards.filter((r) => r.enabled);
    const finalRewards = enabledRewards.map((r, index) => {
      const option = REWARD_TYPE_OPTIONS.find((o) => o.type === r.type);
      return {
        id: `custom-reward-${index}`,
        type: r.type,
        icon: option?.icon || '🎁',
        title: r.title.trim(),
        desc: r.desc.trim(),
        valueLabel: r.valueLabel.trim(),
        redemptionInstructions: r.redemptionInstructions.trim(),
        expirationDays: parseInt(r.expirationDays, 10) || 0,
        quantityLimit: r.quantityLimit ?? null,
        claimedCount: 0,
        rewardWindowStart: r.rewardWindowStart || null,
        rewardWindowEnd: r.rewardWindowEnd || null,
        rewardPolicy: r.rewardPolicy || REWARD_POLICIES.CONTINUE_BADGE_COINS_ONLY,
        backupReward: r.backupReward || null,
      };
    });

    const prizeLabels = finalRewards.map((r) => r.valueLabel).filter(Boolean);
    const existing = editingAdventureId
      ? state.adventures.find((a) => a.id === editingAdventureId)
      : null;
    const adventure = mergeAdventurePreserveFields(existing, {
      id: existing?.id || `custom-${Date.now()}`,
      title,
      location,
      sponsor: sponsorName,
      sponsorInfo: {
        name: sponsorName,
        logoUrl: meta.sponsorLogoUrl.trim(),
        website: meta.sponsorWebsite.trim(),
      },
      distance: existing?.distance || 'New',
      prize: prizeLabels.length ? prizeLabels.join(' + ') : 'Custom Rewards',
      status: existing?.status || ADVENTURE_STATUS.DRAFT,
      difficulty: Math.min(5, Math.max(1, savedClues.length)),
      claimCode: claimFields.claimCode || claimCode,
      claimMethod: claimFields.claimMethod,
      qrClaimValue: claimFields.qrClaimValue,
      physicalMedallionCode: claimFields.physicalMedallionCode,
      hintAfterTap: claimFields.hintAfterTap,
      claimHint: meta.claimHint?.trim() || '',
      finderSearchRadiusM: parseInt(meta.finderSearchRadiusM, 10) || 200,
      finderCaptureBaseM: parseInt(meta.finderCaptureBaseM, 10) || 25,
      adventureScale,
      adventureTemplate,
      experienceSettings: {
        ...experienceSettings,
        backyardPrecision: experienceSettings.backyardPrecision ?? adventureScale === 'backyard',
        dynamicHintsEnabled: experienceSettings.dynamicHintsEnabled !== false,
      },
      rewardCoins: meta.isFounderHunt ? 10000 : 25,
      potEntries: meta.isFounderHunt ? 10 : 3,
      collectionId: meta.collectionId.trim() || null,
      collectionName: meta.collectionName.trim(),
      collectionBadge: meta.collectionBadge.trim(),
      collectionRewardCoins: parseInt(meta.collectionRewardCoins, 10) || 0,
      collectionRewardMedallion: meta.collectionRewardMedallion.trim(),
      isFounderHunt: Boolean(meta.isFounderHunt),
      playMode: meta.playMode || 'both',
      accessType: meta.accessType || 'hybrid',
      playRadiusM: parseInt(meta.playRadiusM, 10) || null,
      finderMode: meta.finderMode || FINDER_MODES.FINDER,
      arAssetType: meta.arAssetType || 'ghost_lantern',
      arFinale: normalizeArScene(arFinale),
      arTheme: arTheme || 'none',
      mediaManifest,
      worldConfig: normalizeWorldConfig(worldConfig),
      heatCategory: 'trending',
      tier: meta.tier || 'standard',
      premiumCoinCost: parseInt(meta.premiumCoinCost, 10) || 250,
      couponQuantity: parseInt(meta.couponQuantity, 10) || null,
      couponTerms: meta.couponTerms?.trim() || '',
      couponExpirationDays: parseInt(meta.couponExpirationDays, 10) || 7,
      sponsorVerified: auth?.isSponsor || false,
      city: meta.city.trim() || meta.location.split(',')[0]?.trim() || '',
      state: meta.state.trim() || meta.location.split(',')[1]?.trim() || 'Kansas',
      region: meta.state.trim() || 'Kansas',
      estimatedMinutes: parseInt(meta.estimatedMinutes, 10) || 25,
      playersCompleted: existing?.playersCompleted ?? 0,
      firstFinderName: existing?.firstFinderName || '',
      story,
      clues: savedClues,
      bonusFinds: buildBonusFinds(clues),
      finalRewards,
      creatorId: existing?.creatorId || userId || null,
      endRule: meta.endRule || END_RULES.NO_END_DATE,
      endsAt: meta.endsAt || null,
      endsAfterTotalCompletions: meta.endsAfterTotalCompletions ?? null,
      totalCompletions: existing?.totalCompletions ?? 0,
    });

    if (isSupabaseMode) {
      setSaving(true);
      setFormError('');
      setSaveFeedback(null);

      const result = await saveAdventureDraft({
        adventure,
        userId,
        upsertAdventure,
      });

      let nextAdventures;
      if (result.cloudSaved) {
        const cloud = await fetchAllAdventuresForAdmin();
        nextAdventures = mergeAdventuresWithLocalDrafts(cloud);
      } else {
        nextAdventures = mergeAdventuresWithLocalDrafts(
          replaceAdventureInList(
            state.adventures.filter(
              (a) => a.status !== ADVENTURE_STATUS.DRAFT || a._draftSync?.cloud
            ),
            result.adventure
          )
        );
      }

      setState((s) => ({
        ...s,
        adventures: nextAdventures,
        screen: 'admin',
        adminTab: existing?.status === ADVENTURE_STATUS.PUBLISHED ? 'published' : 'drafts',
        adminPreview: false,
        editingAdventureId: null,
      }));

      if (!result.localSaved) {
        setFormError(result.message);
      } else {
        setSaveFeedback(result);
      }

      setSaving(false);
      onAdventuresSaved?.();
      return;
    }

    setSaving(true);
    setFormError('');
    setSaveFeedback(null);

    const result = await saveAdventureDraft({
      adventure,
      userId: null,
      upsertAdventure: null,
    });

    if (!result.localSaved) {
      setFormError(result.message);
      setSaving(false);
      return;
    }

    setState((s) => ({
      ...s,
      adventures: replaceAdventureInList(s.adventures, result.adventure),
      screen: 'admin',
      adminTab: existing?.status === ADVENTURE_STATUS.PUBLISHED ? 'published' : 'drafts',
      adminPreview: false,
      editingAdventureId: null,
    }));
    setSaveFeedback(result);
    setSaving(false);
  }

  return (
    <>
      <div className="section-head">
        <h2>{editingAdventure ? `Edit: ${editingAdventure.title}` : 'Create Adventure'}</h2>
        <p>
          {editingAdventure
            ? 'Update clues, AR scenes, rewards, and claim settings — then save.'
            : 'Build adventures with sponsors, rewards, and GPS clues'}
        </p>
      </div>
      {editingAdventure && (
        <div className="card edit-adventure-banner">
          <p>
            Editing {adventureStatusLabel(editingAdventure.status).toLowerCase()} adventure ·{' '}
            {editingAdventure.clues?.length || 0} clues
          </p>
          <button
            type="button"
            className="ghost"
            onClick={() => setState((s) => ({ ...s, editingAdventureId: null, screen: 'admin' }))}
          >
            Cancel edit
          </button>
        </div>
      )}
      <div className="quick-create-row">
        <button type="button" onClick={onQuickCreate}>
          Quick Create — about 60 seconds
        </button>
        <button type="button" className="ghost" onClick={() => setState((s) => ({ ...s, screen: 'play', selectedAdventureId: DEMO_ADVENTURE_ID }))}>
          Try the demo first
        </button>
      </div>
      {(state.accessibility?.kidMode || auth?.isCreator) && (
        <KidModeCreator
          state={state}
          setState={setState}
          userId={userId}
          isSupabaseMode={isSupabaseMode}
          onClose={() => {}}
        />
      )}
      {(state.quickSponsor || auth?.isSponsor || auth?.isAdmin) && (
        <SponsorExpressPanel
          state={state}
          setState={setState}
          userId={userId}
          isSupabaseMode={isSupabaseMode}
        />
      )}
      <CreationFeeBanner state={state} auth={auth} />
      {!state.accessibility?.simplifiedUI && (
        <>
      <AdventureDirectorPanel onApplyDraft={applyDirectorDraft} />
      <QuestoryAssistant onApplyDraft={applyAssistantDraft} />
      <TemplatePicker selected={adventureTemplate} onSelect={handleTemplateSelect} />
      <ScaleSelector value={adventureScale} onChange={handleScaleChange} />
      <SmartBuilderPanel
        templateId={adventureTemplate}
        scaleId={adventureScale}
        onApply={applySmartBuilder}
      />
      <ToolkitPanel
        toolkit={getTemplateMeta(adventureTemplate).toolkit}
        settings={experienceSettings}
        onChange={(patch) => setExperienceSettings((settings) => ({ ...settings, ...patch }))}
      />
        </>
      )}
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
          <h3>Collection & Engagement</h3>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={meta.isFounderHunt}
            onChange={(e) => setMeta((m) => ({ ...m, isFounderHunt: e.target.checked }))}
          />
          👑 Founder Hunt (+10,000 coins · Lifetime Premium badge)
        </label>
        <label>Adventure Tier</label>
        <select
          value={meta.tier}
          onChange={(e) => setMeta((m) => ({ ...m, tier: e.target.value }))}
        >
          <option value="standard">Standard (Free)</option>
          <option value="premium">Premium (Coins required)</option>
        </select>
        <label>Play Mode</label>
        <select
          value={meta.playMode}
          onChange={(e) => setMeta((m) => ({ ...m, playMode: e.target.value }))}
        >
          <option value="solo">Solo only</option>
          <option value="team">Team only</option>
          <option value="both">Solo & Team</option>
        </select>
        <label>Access Type</label>
        <p className="admin-meta">
          Decide whether players must be on-site, can play remotely, or preview from afar.
        </p>
        <AccessTypeSelector
          value={meta.accessType}
          onChange={(accessType) => setMeta((m) => ({ ...m, accessType }))}
        />
        {(meta.accessType === 'local' || meta.accessType === 'hybrid' || meta.accessType === 'sponsor') && (
          <>
            <label>Play Zone Radius (meters)</label>
            <input
              type="number"
              value={meta.playRadiusM}
              onChange={(e) => setMeta((m) => ({ ...m, playRadiusM: e.target.value }))}
              placeholder={`Default ${meta.finderSearchRadiusM || 200} m`}
            />
            <p className="admin-meta">
              Players outside this radius see &quot;Too far to play — Preview instead.&quot;
            </p>
          </>
        )}
        <FinderModeSelector
          value={meta.finderMode}
          onChange={(mode) => setMeta((m) => ({ ...m, finderMode: mode }))}
        />
        {meta.finderMode === FINDER_MODES.AR_ENHANCED && (
          <>
            <ArAssetSelector
              value={meta.arAssetType}
              onChange={(arAssetType) => setMeta((m) => ({ ...m, arAssetType }))}
            />
            <MediaStudioPanel
              userId={userId}
              adventureId={editingAdventureId || null}
              mediaManifest={mediaManifest}
              onManifestChange={setMediaManifest}
              onInsertAsset={handleInsertMediaAsset}
              onGenerateScene={handleGenerateScene}
              onApplyDirectorDraft={applyDirectorDraft}
              clues={clues}
              setClues={setClues}
              setArFinale={setArFinale}
              showArMode={showArMode}
            />
            <WhisperingHollowQuickButton
              onApply={() =>
                applyWhisperingHollowToCreateForm({
                  setMeta,
                  setClues,
                  setMetaAr: ({ arFinale: finale, arTheme: theme }) => {
                    setArFinale(finale);
                    setArTheme(theme);
                  },
                  clues,
                })
              }
            />
          </>
        )}
        {meta.tier === 'premium' && (
          <>
            <label>Premium Admission (coins)</label>
            <input
              type="number"
              value={meta.premiumCoinCost}
              onChange={(e) => setMeta((m) => ({ ...m, premiumCoinCost: e.target.value }))}
            />
          </>
        )}
        <label>Coupon Quantity</label>
        <input
          type="number"
          value={meta.couponQuantity}
          onChange={(e) => setMeta((m) => ({ ...m, couponQuantity: e.target.value }))}
        />
        <label>Coupon Terms</label>
        <input
          value={meta.couponTerms}
          onChange={(e) => setMeta((m) => ({ ...m, couponTerms: e.target.value }))}
          placeholder="One per customer..."
        />
        <label>Coupon Expiration (days)</label>
        <input
          type="number"
          value={meta.couponExpirationDays}
          onChange={(e) => setMeta((m) => ({ ...m, couponExpirationDays: e.target.value }))}
        />
        <AdventureEndRulesFields meta={meta} onChange={(patch) => setMeta((m) => ({ ...m, ...patch }))} />
        <ArFinaleBuilder
          showArMode={showArMode}
          arFinale={arFinale}
          arTheme={arTheme}
          onFinaleChange={setArFinale}
          onThemeChange={setArTheme}
        />
        {showArMode && (
          <div className="collection-series-picker card mini">
            <h4>Collection Series</h4>
            <p className="admin-meta">
              Group hunts into a series — players unlock badge, medallion, and bonus coins when they finish all.
            </p>
            {Object.entries(COLLECTION_SERIES_PRESETS).map(([presetKey, series]) => (
              <button
                key={series.id}
                type="button"
                className={`ghost media-pack-btn ${meta.collectionId === series.meta.collectionId ? 'active' : ''}`}
                onClick={() => applyCollectionSeriesPreset(presetKey, setMeta)}
              >
                <strong>{series.label}</strong>
                <span>{series.desc}</span>
              </button>
            ))}
          </div>
        )}
        <label>Collection Name</label>
        <input
          value={meta.collectionName}
          onChange={(e) => setMeta((m) => ({ ...m, collectionName: e.target.value }))}
          placeholder="Parsons Legends"
        />
        <label>Collection ID (slug)</label>
        <input
          value={meta.collectionId}
          onChange={(e) => setMeta((m) => ({ ...m, collectionId: e.target.value }))}
          placeholder="parsons-legends"
        />
        <label>Collection Badge</label>
        <input
          value={meta.collectionBadge}
          onChange={(e) => setMeta((m) => ({ ...m, collectionBadge: e.target.value }))}
          placeholder="Keeper of Parsons Badge"
        />
        <label>Collection Reward Medallion</label>
        <input
          value={meta.collectionRewardMedallion}
          onChange={(e) => setMeta((m) => ({ ...m, collectionRewardMedallion: e.target.value }))}
          placeholder="Parsons Legends Exclusive Medallion"
        />
        <label>Collection Reward Coins</label>
        <input
          type="number"
          value={meta.collectionRewardCoins}
          onChange={(e) => setMeta((m) => ({ ...m, collectionRewardCoins: e.target.value }))}
        />
        <label>City</label>
        <input
          value={meta.city}
          onChange={(e) => setMeta((m) => ({ ...m, city: e.target.value }))}
          placeholder="Parsons"
        />
        <label>State</label>
        <input
          value={meta.state}
          onChange={(e) => setMeta((m) => ({ ...m, state: e.target.value }))}
          placeholder="Kansas"
        />
        <label>Estimated Time (minutes)</label>
        <input
          type="number"
          value={meta.estimatedMinutes}
          onChange={(e) => setMeta((m) => ({ ...m, estimatedMinutes: e.target.value }))}
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
            showArMode={showArMode}
          />
        ))}

        {formError && <p className="form-error">{formError}</p>}

        {saveFeedback?.localSaved && (
          <div
            className={`draft-save-feedback ${saveFeedback.cloudSaved ? 'synced' : 'local-only'}`}
            role="status"
          >
            <p>{saveFeedback.message}</p>
            {!saveFeedback.cloudSaved && isSupabaseMode && userId && (
              <button
                type="button"
                className="ghost"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  const retry = await saveAdventureDraft({
                    adventure: saveFeedback.adventure,
                    userId,
                    upsertAdventure,
                  });
                  if (retry.cloudSaved) {
                    const cloud = await fetchAllAdventuresForAdmin();
                    setState((s) => ({
                      ...s,
                      adventures: mergeAdventuresWithLocalDrafts(cloud),
                    }));
                  }
                  setSaveFeedback(retry);
                  setSaving(false);
                }}
              >
                Retry cloud sync
              </button>
            )}
          </div>
        )}

        <button onClick={saveAdventure} disabled={saving}>
          <Plus size={18} /> {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button className="ghost" onClick={reset} disabled={saving}>
          Reset Alpha Prototype
        </button>
        <p className="admin-meta">
          {isSupabaseMode
            ? 'Drafts save locally first · cloud sync when signed in · publish from Admin when ready'
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
  state,
  setState,
  adventures,
  adminTab,
  nav,
  onPublish,
  onArchive,
  onRestore,
  onDelete,
  onEdit,
  onDuplicate,
  onUnpublish,
  onRepairClues,
  onTabChange,
  onRetryDraftSync,
  isSupabaseMode,
  userId,
}) {
  const status = ADMIN_TAB_STATUS[adminTab] || ADVENTURE_STATUS.DRAFT;
  const filtered = adventures.filter((a) => a.status === status);
  const showAnalytics = adminTab === 'analytics';
  const [retryingDraftId, setRetryingDraftId] = useState(null);
  const [draftSyncMessage, setDraftSyncMessage] = useState('');

  async function handleRetryDraftSync(adventureId) {
    if (!onRetryDraftSync) return;
    setRetryingDraftId(adventureId);
    setDraftSyncMessage('');
    const result = await onRetryDraftSync(adventureId);
    setRetryingDraftId(null);
    if (result?.message) setDraftSyncMessage(result.message);
  }

  return (
    <>
      <div className="section-head">
        <h2>Admin Review</h2>
        <p>Preview, publish, analytics, and manage adventures</p>
      </div>

      <div className="vault-tabs admin-tabs">
        {['drafts', 'published', 'archived', 'analytics'].map((tab) => (
          <button
            key={tab}
            className={adminTab === tab ? 'active' : ''}
            onClick={() => onTabChange(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {showAnalytics ? (
        <AdminLaunchAnalytics state={state} setState={setState} adventures={adventures} />
      ) : (
        <>
      {adminTab === 'drafts' && draftSyncMessage && (
        <p className="draft-sync-banner" role="status">{draftSyncMessage}</p>
      )}

      {!filtered.length && (
        <div className="card empty-vault">
          <Archive size={28} />
          <p>No {adminTab} adventures.</p>
          {adminTab === 'drafts' && isSupabaseMode && (
            <small className="admin-meta">
              Drafts are saved locally first. Sign in and use Save Draft in Create to sync to the cloud.
            </small>
          )}
        </div>
      )}

      {filtered.map((adventure) => (
        <div className="card admin-adventure" key={adventure.id}>
          <div className="row">
            <span className={`badge ${adventure.status}`}>
              {adventureStatusLabel(adventure.status)}
            </span>
            {adventure.status === ADVENTURE_STATUS.DRAFT && (
              <span className={`badge draft-sync draft-sync-${getDraftSyncBadge(adventure)}`}>
                {draftSyncBadgeLabel(getDraftSyncBadge(adventure))}
              </span>
            )}
            <small>{adventure.location}</small>
          </div>
          <h3>{adventure.title}</h3>
          {adventure.status === ADVENTURE_STATUS.DRAFT &&
            adventure._draftSync?.cloudError &&
            isSupabaseMode && (
              <div className="draft-sync-warning" role="alert">
                <p>Saved locally. Cloud sync failed.</p>
                <small>{adventure._draftSync.cloudError}</small>
                {userId && (
                  <button
                    type="button"
                    className="ghost admin-action-btn"
                    disabled={retryingDraftId === adventure.id}
                    onClick={() => handleRetryDraftSync(adventure.id)}
                  >
                    {retryingDraftId === adventure.id ? 'Retrying…' : 'Retry'}
                  </button>
                )}
              </div>
            )}
          <AdminClaimCode adventure={adventure} />
          <p className="story-preview">{adventure.story}</p>
          <SponsorBlock sponsor={getSponsorInfo(adventure)} compact />
          <div className="chips">
            <span>{adventure.clues?.length || 0} clues</span>
            <span>{adventure.finalRewards?.length || 0} rewards</span>
            <span>{claimMethodLabel(adventure.claimMethod)}</span>
          </div>
          {(adventure.clues?.length || 0) === 0 && (
            <p className="admin-clue-warning" role="alert">
              0 clues — not playable.
              {canRepairWhisperingHollow(adventure) && onRepairClues && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="ghost admin-action-btn"
                    onClick={() => onRepairClues(adventure.id)}
                  >
                    Repair Missing Clues
                  </button>
                </>
              )}
            </p>
          )}
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
                  disabled={(adventure.clues?.length || 0) === 0}
                >
                  <CheckCircle2 size={16} /> Publish
                </button>
                <button
                  className="ghost admin-action-btn"
                  onClick={() => onEdit?.(adventure.id)}
                >
                  <Pencil size={16} /> Edit
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
              <>
                <button
                  className="ghost admin-action-btn"
                  onClick={() => onEdit?.(adventure.id)}
                >
                  <Pencil size={16} /> Edit
                </button>
                <button
                  className="ghost admin-action-btn"
                  onClick={() => onDuplicate?.(adventure.id)}
                >
                  <Copy size={16} /> Duplicate as Draft
                </button>
                <button
                  className="ghost admin-action-btn"
                  onClick={() => onUnpublish?.(adventure.id)}
                >
                  <RotateCcw size={16} /> Unpublish to Draft
                </button>
                <button
                  className="ghost admin-action-btn"
                  onClick={() => onArchive(adventure.id)}
                >
                  <Archive size={16} /> Archive
                </button>
              </>
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
      )}
    </>
  );
}

function BottomNav({ screen, nav, adminPreview, isSponsor }) {
  const items = isSponsor
    ? [
        ['home', 'Home'],
        ['feed', 'Feed'],
        ['map', 'Map'],
        ['vault', 'Passport'],
        ['social', 'Social'],
        ['sponsor', 'Sponsor'],
        ['create', 'Create'],
        ['admin', 'Admin'],
      ]
    : [
        ['home', 'Home'],
        ['feed', 'Feed'],
        ['map', 'Map'],
        ['vault', 'Passport'],
        ['social', 'Social'],
        ['create', 'Create'],
        ['admin', 'Admin'],
      ];

  const active = (id) => {
    if (screen === id) return true;
    if (screen === 'leaderboard') return id === 'home';
    if (screen === 'creator') return id === 'feed';
    if (screen === 'social') return id === 'social';
    if (screen === 'platform') return id === 'home';
    if (screen === 'world' || screen === 'growth') return id === 'home';
    if (screen === 'play' || screen === 'detail' || screen === 'bonus') {
      return adminPreview ? id === 'admin' : id === 'feed';
    }
    return false;
  };

  const navClass = items.length > 7 ? 'bottom-nav-8' : 'bottom-nav-7';

  return (
    <nav className={navClass}>
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
