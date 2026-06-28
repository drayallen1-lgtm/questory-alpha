import React, { useEffect, useRef, useState } from 'react';
import { Compass, LocateFixed, MapPin, QrCode, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import {
  CLAIM_METHOD,
  CLAIM_METHOD_OPTIONS,
  normalizeClaimMethod,
  claimMethodUsesFinder,
  isPhysicalMedallionClaim,
  autoClaimsOnTap,
  handleClaimResponse,
  formatUserErrorMessage,
  getClaimCodeDiscoveryHint,
  canShowClaimCodeEntry,
  getTreasureClaimStep,
} from './claimSystem';
import {
  canCaptureMedallion,
  canUnlockFinderMode,
  computeSignalStrength,
  getCaptureRadius,
  getFinderSearchRadius,
  getMedallionLocation,
  measureMedallionDistance,
  resolveFinderPhase,
  getFinderPhaseUI,
  FINDER_PHASE,
  usesFinderGps,
} from './finderMode';
import { formatDistanceAway, getCurrentPosition } from './geolocation';
import { usesArFinder } from './expansion';
import { ARFinderOverlay } from './ExpansionUI';
import { CinematicAROverlay } from './CinematicAR';
import { QrClaimScanner } from './QrClaimScanner';
import {
  getAdventureArFinale,
  getArSceneId,
  markArSceneComplete,
  shouldPlayArScene,
} from './arEngine';
import { DirectorMoodBadge } from './ExperienceUI';

function useMedallionGps(adventure, watching = true) {
  const [distance, setDistance] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const medallion = getMedallionLocation(adventure);
  const searchRadius = getFinderSearchRadius(adventure);

  useEffect(() => {
    if (!watching || !medallion) return undefined;
    let cancelled = false;

    async function poll() {
      try {
        const position = await getCurrentPosition();
        if (cancelled) return;
        const dist = measureMedallionDistance(
          adventure,
          position.coords.latitude,
          position.coords.longitude
        );
        setDistance(dist);
        setAccuracy(position.coords.accuracy ?? null);
        setGpsError('');
      } catch {
        if (!cancelled) {
          setGpsError('Location unavailable. Enable GPS to track the medallion signal.');
        }
      }
    }

    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adventure, watching, medallion]);

  const inSearchArea = canUnlockFinderMode(distance, accuracy, false, searchRadius);
  const signal = computeSignalStrength(distance, searchRadius);
  const locating = distance == null && !gpsError;

  return {
    distance,
    accuracy,
    gpsError,
    searchRadius,
    medallion,
    inSearchArea,
    signal,
    locating,
  };
}

function FinderSignalPreview({ distance, accuracy, signal, searchRadius, phase, phaseUi }) {
  return (
    <div className="finder-signal-preview">
      <p className={`finder-excitement ${phaseUi.excitement.className}`}>{phaseUi.excitement.label}</p>
      <div className="finder-stat">
        <small>Signal strength</small>
        <div
          className={`signal-meter ${phaseUi.signalPercent > 50 ? 'strong' : ''} ${phase === FINDER_PHASE.CAPTURE_READY ? 'capture-ready' : ''}`}
          aria-label={`Signal ${phaseUi.signalPercent}%`}
        >
          <i style={{ width: `${phaseUi.signalPercent}%` }} />
        </div>
        <strong>{phaseUi.signalPercent > 0 ? `${phaseUi.signalPercent}%` : '—'}</strong>
      </div>
      <div className="finder-stat-row">
        <div>
          <small>Distance to medallion</small>
          <strong>{distance != null ? formatDistanceAway(distance) : 'Locating…'}</strong>
        </div>
        <div>
          <small>Search area</small>
          <strong>{searchRadius} m radius</strong>
        </div>
      </div>
      {accuracy != null && (
        <p className="admin-meta">
          GPS accuracy ±{Math.round(accuracy)} m
        </p>
      )}
    </div>
  );
}

function buildFinderContext({
  adventure,
  distance,
  accuracy,
  gpsError,
  locating,
  inSearchArea,
  inCaptureRange,
  medallionTapped,
  capturing,
  signal,
  medallion,
  searchRadius,
  captureRadius,
  physical,
}) {
  const phase = resolveFinderPhase({
    medallion,
    distance,
    gpsError,
    locating,
    inSearchArea,
    inCaptureRange,
    medallionTapped,
  });
  const phaseUi = getFinderPhaseUI(phase, {
    distance,
    accuracy,
    captureRadius,
    searchRadius,
    physical,
    capturing,
    gpsError,
    signal,
  });
  return { phase, phaseUi };
}

export function MedallionSignalScreen({ adventure, nav, adminPreview }) {
  const physical = isPhysicalMedallionClaim(adventure);
  const { distance, accuracy, gpsError, searchRadius, medallion, inSearchArea, signal, locating } =
    useMedallionGps(adventure);
  const captureRadius = getCaptureRadius(adventure, accuracy);
  const { phase, phaseUi } = buildFinderContext({
    adventure,
    distance,
    accuracy,
    gpsError,
    locating,
    inSearchArea,
    inCaptureRange: false,
    medallionTapped: false,
    signal,
    medallion,
    searchRadius,
    captureRadius,
    physical,
  });

  if (!medallion) {
    return (
      <div className="card">
        <p>Add GPS coordinates to the final clue to enable Finder Mode.</p>
        <button type="button" className="ghost" onClick={() => nav('play', adventure.id, { adminPreview })}>
          Back
        </button>
      </div>
    );
  }

  return (
    <>
      <DirectorMoodBadge
        adventure={adventure}
        context={{
          atClaim: true,
          awaitingFinder: true,
          onFinderScreen: true,
          finderPhase: phase,
          signalPercent: phaseUi.signalPercent,
        }}
      />
      <button
        type="button"
        className="ghost back"
        onClick={() => nav('play', adventure.id, { adminPreview })}
      >
        ← Adventure Play
      </button>
      <div className="card medallion-signal-card">
        <div className={`signal-pulse-ring ${inSearchArea ? 'active' : ''}`} aria-hidden />
        <Radio size={36} className="signal-icon" />
        <h2>Medallion Signal Activated.</h2>
        <p>{phaseUi.body}</p>
        <SponsorLine adventure={adventure} />
        {phase === FINDER_PHASE.LOCATING && (
          <p className="finder-gps-status">Locating your position…</p>
        )}
        {phase === FINDER_PHASE.GPS_ERROR && (
          <p className="loc-feedback denied">{phaseUi.body}</p>
        )}
        {phase === FINDER_PHASE.OUTSIDE_SEARCH && phaseUi.hint && (
          <p className="loc-feedback denied finder-activate-hint">
            {phaseUi.hint}
          </p>
        )}
        {(phase === FINDER_PHASE.SEARCH_ACTIVE || phase === FINDER_PHASE.CAPTURE_READY) && (
          <FinderSignalPreview
            distance={distance}
            accuracy={accuracy}
            signal={signal}
            searchRadius={searchRadius}
            phase={phase}
            phaseUi={phaseUi}
          />
        )}
        <button
          type="button"
          disabled={phase !== FINDER_PHASE.SEARCH_ACTIVE && phase !== FINDER_PHASE.CAPTURE_READY}
          onClick={() => nav('finder', adventure.id, { adminPreview })}
        >
          <Compass size={18} /> Enter Finder Mode
        </button>
        {phase === FINDER_PHASE.OUTSIDE_SEARCH && (
          <p className="admin-meta">
            Finder unlocks within {searchRadius} m of the medallion.
          </p>
        )}
      </div>
    </>
  );
}

/** Play-screen panel: enter Finder when inside search area, not capture range. */
export function FinderAwaitingPanel({ adventure, nav, adminPreview }) {
  const physical = isPhysicalMedallionClaim(adventure);
  const { distance, gpsError, searchRadius, medallion, inSearchArea, signal, locating, accuracy } =
    useMedallionGps(adventure);
  const captureRadius = getCaptureRadius(adventure, accuracy);
  const { phase, phaseUi } = buildFinderContext({
    adventure,
    distance,
    accuracy,
    gpsError,
    locating,
    inSearchArea,
    inCaptureRange: false,
    medallionTapped: false,
    signal,
    medallion,
    searchRadius,
    captureRadius,
    physical,
  });

  if (!medallion) {
    return (
      <p>Complete the trail — add GPS to the final clue to enable Finder Mode.</p>
    );
  }

  return (
    <>
      <p>{phaseUi.body}</p>
      {phase === FINDER_PHASE.LOCATING && (
        <p className="finder-gps-status">Locating your position…</p>
      )}
      {phase === FINDER_PHASE.GPS_ERROR && (
        <p className="loc-feedback denied">{phaseUi.body}</p>
      )}
      {phase === FINDER_PHASE.OUTSIDE_SEARCH && phaseUi.hint && (
        <p className="loc-feedback denied finder-activate-hint">{phaseUi.hint}</p>
      )}
      {(phase === FINDER_PHASE.SEARCH_ACTIVE || phase === FINDER_PHASE.CAPTURE_READY) && (
        <FinderSignalPreview
          distance={distance}
          accuracy={accuracy}
          signal={signal}
          searchRadius={searchRadius}
          phase={phase}
          phaseUi={phaseUi}
        />
      )}
      <button
        type="button"
        disabled={phase !== FINDER_PHASE.SEARCH_ACTIVE && phase !== FINDER_PHASE.CAPTURE_READY}
        onClick={() => nav('finder', adventure.id, { adminPreview })}
      >
        <Compass size={18} /> Enter Finder Mode
      </button>
      {phase === FINDER_PHASE.OUTSIDE_SEARCH && (
        <p className="admin-meta">
          Signal activates within {searchRadius} m · capture unlocks in Finder Mode.
        </p>
      )}
    </>
  );
}

function SponsorLine({ adventure }) {
  const name = adventure.sponsorInfo?.name || adventure.sponsor;
  if (!name) return null;
  return <p className="finder-sponsor">Sponsored by {name}</p>;
}

export function FinderModeScreen({ adventure, progress, nav, adminPreview, onMedallionTap, setState }) {
  const [watching, setWatching] = useState(true);
  const [devOverride, setDevOverride] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [tapError, setTapError] = useState('');
  const [finaleArOpen, setFinaleArOpen] = useState(false);
  const [pendingTapContext, setPendingTapContext] = useState(null);
  const tapLockRef = useRef(false);

  const { distance, accuracy, gpsError, searchRadius, medallion } = useMedallionGps(
    adventure,
    watching
  );
  const effectiveDistance = devOverride ? 10 : distance;
  const effectiveAccuracy = devOverride ? 5 : accuracy;
  const captureRadius = getCaptureRadius(adventure, effectiveAccuracy);
  const signal = computeSignalStrength(effectiveDistance, searchRadius);
  const inSearchArea = canUnlockFinderMode(
    effectiveDistance,
    effectiveAccuracy,
    devOverride,
    searchRadius
  );
  const inCaptureRange = canCaptureMedallion(
    effectiveDistance,
    effectiveAccuracy,
    devOverride,
    adventure
  );
  const physical = isPhysicalMedallionClaim(adventure);
  const claimMethod = normalizeClaimMethod(adventure.claimMethod);

  const { phase, phaseUi } = buildFinderContext({
    adventure,
    distance: effectiveDistance,
    accuracy: effectiveAccuracy,
    gpsError,
    locating: effectiveDistance == null && !gpsError,
    inSearchArea,
    inCaptureRange,
    medallionTapped: progress.medallionTapped,
    capturing,
    signal,
    medallion,
    searchRadius,
    captureRadius,
    physical,
  });

  const tapDisabled =
    !inCaptureRange || progress.medallionTapped || capturing || phase === FINDER_PHASE.CAPTURED;
  const arFinale = getAdventureArFinale(adventure);
  const finaleSceneId = getArSceneId(adventure.id, 'finale', 'finale');

  async function finishMedallionTap(context) {
    tapLockRef.current = true;
    setCapturing(true);
    setTapError('');

    try {
      const result = await Promise.resolve(onMedallionTap?.(context));
      console.log('[Finder] claim result/error:', result);
      if (result && !result.ok) {
        setTapError(formatUserErrorMessage(result) || 'Could not capture medallion. Try again.');
      }
    } catch (err) {
      console.error('[Finder] tap error:', err);
      setTapError(formatUserErrorMessage(err) || 'Could not capture medallion. Try again.');
    } finally {
      setCapturing(false);
      tapLockRef.current = false;
    }
  }

  function completeFinaleAr() {
    setFinaleArOpen(false);
    if (setState) {
      setState((s) => markArSceneComplete(s, adventure.id, finaleSceneId));
    }
    const ctx = pendingTapContext;
    setPendingTapContext(null);
    if (ctx) finishMedallionTap(ctx);
  }

  async function handleTap() {
    if (tapLockRef.current || tapDisabled) return;

    console.log('[Finder] button clicked');
    console.log('[Finder] within capture range:', inCaptureRange);
    console.log('[Finder] claim method:', claimMethod);

    const context = {
      distance: effectiveDistance,
      accuracy: effectiveAccuracy,
      inCaptureRange,
      devOverride,
    };

    if (arFinale.enabled && shouldPlayArScene(arFinale, progress, finaleSceneId)) {
      setPendingTapContext(context);
      setFinaleArOpen(true);
      return;
    }

    await finishMedallionTap(context);
  }

  function handleDevOverride() {
    setDevOverride(true);
    setTapError('');
    console.log('[Finder] Dev Override enabled');
  }

  if (!medallion) {
    return (
      <div className="card">
        <p>Add GPS coordinates to the final clue to enable Finder Mode.</p>
        <button type="button" className="ghost" onClick={() => nav('play', adventure.id, { adminPreview })}>
          Back
        </button>
      </div>
    );
  }

  return (
    <>
      <DirectorMoodBadge
        adventure={adventure}
        context={{
          atClaim: true,
          awaitingFinder: !progress.medallionTapped,
          medallionTapped: progress.medallionTapped,
          onFinderScreen: true,
          finderPhase: phase,
          signalPercent: phaseUi.signalPercent,
          arActive: finaleArOpen,
        }}
      />
      <CinematicAROverlay
        open={finaleArOpen}
        scene={arFinale}
        onComplete={completeFinaleAr}
        useCamera={usesArFinder(adventure)}
      />
      <button
        type="button"
        className="ghost back"
        onClick={() => nav('medallion-signal', adventure.id, { adminPreview })}
      >
        ← Signal
      </button>
      <div className="preview-banner finder-mode-banner">
        <Compass size={16} /> {phaseUi.banner}
      </div>

      <div className="card finder-stats">
        <p className={`finder-excitement ${phaseUi.excitement.className}`}>{phaseUi.excitement.label}</p>
        <div className="finder-stat">
          <small>Signal strength</small>
          <div
            className={`signal-meter ${phaseUi.signalPercent > 50 ? 'strong' : ''} ${phase === FINDER_PHASE.CAPTURE_READY ? 'capture-ready' : ''}`}
            aria-label={`Signal ${phaseUi.signalPercent}%`}
          >
            <i style={{ width: `${phaseUi.signalPercent}%` }} />
          </div>
          <strong>{phaseUi.signalPercent > 0 ? `${phaseUi.signalPercent}%` : '—'}</strong>
        </div>
        <div className="finder-stat-row">
          <div>
            <small>Distance to medallion</small>
            <strong>
              {effectiveDistance != null ? formatDistanceAway(effectiveDistance) : 'Locating…'}
            </strong>
          </div>
          <div>
            <small>GPS accuracy</small>
            <strong>
              {effectiveAccuracy != null ? `±${Math.round(effectiveAccuracy)} m` : '—'}
            </strong>
          </div>
        </div>
        <div className="finder-stat-row">
          <div>
            <small>Search area</small>
            <strong>{searchRadius} m radius</strong>
          </div>
          <div>
            <small>Capture range</small>
            <strong>~{Math.round(captureRadius)} m</strong>
          </div>
        </div>
        {phaseUi.hint && <p className="finder-phase-hint">{phaseUi.hint}</p>}
        {phaseUi.showMoveCloser && (
          <p className="loc-feedback denied finder-activate-hint">{phaseUi.body}</p>
        )}
      </div>

      {usesArFinder(adventure) ? (
        <div className="card finder-ar-card">
          <ARFinderOverlay
            adventure={adventure}
            inCaptureRange={inCaptureRange}
            capturing={capturing}
            onCapture={handleTap}
          />
          {tapError && <p className="form-error finder-tap-error">{tapError}</p>}
        </div>
      ) : (
        <div
          className={`card finder-medallion-card ${
            phase === FINDER_PHASE.CAPTURE_READY
              ? 'ready capture-pulse'
              : phase === FINDER_PHASE.SEARCH_ACTIVE
                ? 'signal-active'
                : ''
          }`}
        >
          <div className="finder-medallion-visual" aria-hidden="true">
            <span className="finder-chest">{physical ? '📍' : '🧭'}</span>
            <span className="finder-medallion">🥇</span>
          </div>
          <h3>{physical ? 'Physical Medallion Signal' : 'Virtual Medallion'}</h3>
          <p>{phaseUi.body}</p>
          {tapError && <p className="form-error finder-tap-error">{tapError}</p>}
          {phase === FINDER_PHASE.CAPTURED ? (
            <button type="button" onClick={() => nav('play', adventure.id, { adminPreview })}>
              <Sparkles size={18} /> Continue to Treasure Claim
            </button>
          ) : (
            <button
              type="button"
              className="finder-tap-btn"
              onClick={handleTap}
              disabled={tapDisabled}
              aria-busy={capturing}
            >
              <Sparkles size={18} />
              {capturing
                ? 'Capturing medallion...'
                : autoClaimsOnTap(adventure)
                  ? 'Tap to Claim Treasure'
                  : 'Tap Medallion'}
            </button>
          )}
        </div>
      )}

      <div className="card finder-actions">
        <button type="button" className="ghost" onClick={() => setWatching((v) => !v)}>
          <LocateFixed size={16} /> {watching ? 'Pause GPS' : 'Resume GPS'}
        </button>
        <button type="button" className="ghost dev-unlock" onClick={handleDevOverride}>
          <ShieldCheck size={16} /> Dev Override
        </button>
        <p className="admin-meta">
          <MapPin size={12} /> Search area {searchRadius} m · capture ~{Math.round(captureRadius)} m
        </p>
      </div>
    </>
  );
}

function getClaimGuide(method, adventure) {
  const hint = adventure.claimHint || adventure.hintAfterTap;
  switch (method) {
    case CLAIM_METHOD.QR_CODE:
      return {
        title: 'Scan Sponsor QR',
        why: 'Your trail is complete. Scan the sponsor QR code to verify your visit and unlock rewards.',
        where: hint || 'Look for the Questory QR poster at the finish line or sponsor location.',
        after: 'Rewards appear in your Passport. Share your certificate when you are done.',
        steps: ['Open the QR scanner', 'Scan the sponsor poster', 'Rewards unlock automatically'],
      };
    case CLAIM_METHOD.PHYSICAL_MEDALLION:
      return {
        title: 'Physical Medallion Code',
        why: 'You found the signal zone. The hidden physical medallion holds your final unlock code.',
        where: hint || adventure.hintAfterTap || 'Search the area shown on the map — check landmarks and hiding spots.',
        after: 'Enter the engraved code to claim coins, badges, and vault rewards.',
        steps: ['Search for the physical medallion', 'Read the engraved code', 'Enter it below to claim'],
      };
    case CLAIM_METHOD.HYBRID:
      return {
        title: 'Final Claim Code',
        why: 'Virtual medallion secured. Enter the final claim code to complete your treasure.',
        where:
          hint ||
          'The claim code unlocks after medallion capture — check your invite or sponsor card.',
        after: 'Full rewards unlock and your celebration screen appears.',
        steps: ['Virtual medallion captured ✓', 'Enter the final claim code', 'Tap Claim Treasure'],
      };
    case CLAIM_METHOD.TAP_MEDALLION:
      return {
        title: 'Virtual Treasure',
        why: 'Tap the virtual medallion in Finder Mode to auto-claim your rewards.',
        where: 'Follow the signal in Finder Mode until capture range.',
        after: 'Rewards land in your Passport instantly.',
        steps: ['Enter Finder Mode', 'Follow the signal', 'Tap the medallion to claim'],
      };
    default:
      return {
        title: 'Secret Claim Code',
        why: 'Your trail is complete. Enter the secret code to unlock coins, badges, and vault rewards.',
        where: hint || 'Check your adventure invite, final clue, or sponsor card for the code.',
        after: 'Rewards appear in your Passport. Share your certificate when you are done.',
        steps: ['Enter the claim code below', 'Tap Claim Treasure', 'Celebrate your victory'],
      };
  }
}

function ClaimGuidePanel({ guide }) {
  return (
    <div className="claim-guide">
      <h4>{guide.title}</h4>
      <div className="claim-guide-section">
        <small>Why enter a code?</small>
        <p>{guide.why}</p>
      </div>
      <div className="claim-guide-section">
        <small>Where to find it</small>
        <p>{guide.where}</p>
      </div>
      <div className="claim-guide-section">
        <small>What happens next</small>
        <p>{guide.after}</p>
      </div>
      <ol className="claim-steps">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

function ClaimCodeDiscoveryCard({ adventure, state }) {
  const hint = getClaimCodeDiscoveryHint(adventure, state);
  return (
    <div className="claim-discovery-card">
      <h4>Where to find your code</h4>
      <p>{hint}</p>
    </div>
  );
}

export function TreasureClaimPanel({ adventure, progress, onClaim, state }) {
  const method = normalizeClaimMethod(adventure.claimMethod);
  const [physicalInput, setPhysicalInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(method === CLAIM_METHOD.QR_CODE);
  const step = getTreasureClaimStep(adventure, progress);
  const guide = getClaimGuide(method, adventure);

  async function submitClaim(code) {
    setClaiming(true);
    try {
      const result = await handleClaimResponse(onClaim, code);
      return result;
    } finally {
      setClaiming(false);
    }
  }

  if (progress.claimed) {
    return (
      <div className="claim-success-card">
        <Sparkles size={24} />
        <p>Treasure claimed! Open your Passport to see everything you earned.</p>
      </div>
    );
  }

  if (step === 'finder_required') {
    return (
      <div className="claim-awaiting-finder">
        <ClaimGuidePanel guide={getClaimGuide(CLAIM_METHOD.TAP_MEDALLION, adventure)} />
        <p className="claim-hint">
          Enter Finder Mode and tap the medallion signal to unlock the final treasure claim.
        </p>
      </div>
    );
  }

  if (step === 'auto_claim_pending') {
    return (
      <div className="claim-success-card">
        <Sparkles size={24} />
        <p>Medallion captured.</p>
        <button type="button" onClick={() => submitClaim(adventure.claimCode)} disabled={claiming}>
          <Sparkles size={18} /> {claiming ? 'Claiming…' : 'Claim Your Rewards'}
        </button>
      </div>
    );
  }

  return (
    <div className="treasure-claim-flow">
      {method === CLAIM_METHOD.HYBRID && progress.medallionTapped && (
        <div className="claim-unlocked-banner">
          <Sparkles size={16} /> Virtual medallion secured — enter your final claim code below.
        </div>
      )}

      <ClaimGuidePanel guide={guide} />

      {(method === CLAIM_METHOD.SECRET_CODE || method === CLAIM_METHOD.HYBRID) &&
        canShowClaimCodeEntry(adventure, progress) && (
          <>
            <ClaimCodeDiscoveryCard adventure={adventure} state={state} />
            <div className="claim-input-block">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter secret code"
                aria-label="Secret claim code"
              />
              <button
                type="button"
                onClick={() => submitClaim(codeInput.trim().toUpperCase())}
                disabled={claiming || !codeInput.trim()}
              >
                <Sparkles size={18} /> {claiming ? 'Claiming…' : 'Claim Treasure'}
              </button>
            </div>
          </>
        )}

      {method === CLAIM_METHOD.QR_CODE && (
        <div className="claim-input-block">
          {showQrScanner ? (
            <QrClaimScanner
              busy={claiming}
              onScan={(payload) => submitClaim(payload)}
              onClose={() => setShowQrScanner(false)}
            />
          ) : (
            <button type="button" onClick={() => setShowQrScanner(true)}>
              <QrCode size={18} /> Open QR Scanner
            </button>
          )}
        </div>
      )}

      {method === CLAIM_METHOD.PHYSICAL_MEDALLION && progress.medallionTapped && (
        <div className="claim-input-block physical-search-card">
          {adventure.hintAfterTap && (
            <p className="physical-hint">
              <MapPin size={14} /> {adventure.hintAfterTap}
            </p>
          )}
          <p className="claim-hint">
            Find the hidden physical medallion and enter the engraved code.
          </p>
          <input
            value={physicalInput}
            onChange={(e) => setPhysicalInput(e.target.value.toUpperCase())}
            placeholder="Engraved physical code"
            aria-label="Physical medallion code"
          />
          <button
            type="button"
            onClick={() => submitClaim(physicalInput.trim().toUpperCase())}
            disabled={claiming || !physicalInput.trim()}
          >
            <Sparkles size={18} /> {claiming ? 'Claiming…' : 'Claim Treasure'}
          </button>
        </div>
      )}
    </div>
  );
}

export function ClaimMethodSelector({ value, onChange }) {
  return (
    <div className="claim-method-grid">
      {CLAIM_METHOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`claim-method-card ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          <span className="claim-method-icon">{opt.icon}</span>
          <strong>{opt.label}</strong>
          <small>{opt.desc}</small>
        </button>
      ))}
    </div>
  );
}

export { usesFinderGps, claimMethodUsesFinder };
