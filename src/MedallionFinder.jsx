import React, { useEffect, useRef, useState } from 'react';
import { Compass, LocateFixed, MapPin, QrCode, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import {
  CLAIM_METHOD,
  CLAIM_METHOD_OPTIONS,
  normalizeClaimMethod,
  claimMethodUsesFinder,
  isPhysicalMedallionClaim,
  handleClaimResponse,
  formatUserErrorMessage,
} from './claimSystem';
import {
  canCaptureMedallion,
  canUnlockFinderMode,
  computeSignalStrength,
  getCaptureRadius,
  getFinderSearchRadius,
  getMedallionLocation,
  measureMedallionDistance,
  usesFinderGps,
} from './finderMode';
import { formatDistanceAway, getCurrentPosition } from './geolocation';
import { usesArFinder } from './expansion';
import { ARFinderOverlay } from './ExpansionUI';
import { CinematicAROverlay } from './CinematicAR';
import {
  getAdventureArFinale,
  getArSceneId,
  markArSceneComplete,
  shouldPlayArScene,
} from './arEngine';

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

function FinderSignalPreview({ distance, accuracy, signal, searchRadius }) {
  return (
    <div className="finder-signal-preview">
      <div className="finder-stat">
        <small>Signal strength</small>
        <div className="signal-meter" aria-label={`Signal ${signal}%`}>
          <i style={{ width: `${signal}%` }} />
        </div>
        <strong>{signal}%</strong>
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

export function MedallionSignalScreen({ adventure, nav, adminPreview }) {
  const physical = isPhysicalMedallionClaim(adventure);
  const { distance, accuracy, gpsError, searchRadius, medallion, inSearchArea, signal, locating } =
    useMedallionGps(adventure);

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
        <p>
          {physical
            ? 'The trail is complete. A hidden physical medallion is nearby — enter Finder Mode within the search area and follow the signal.'
            : 'The trail is complete. A virtual medallion is broadcasting nearby — enter Finder Mode within the search area and follow the signal.'}
        </p>
        <SponsorLine adventure={adventure} />
        {locating && <p className="finder-gps-status">Locating your position…</p>}
        {gpsError && <p className="loc-feedback denied">{gpsError}</p>}
        {!locating && !gpsError && !inSearchArea && (
          <p className="loc-feedback denied finder-activate-hint">
            Move closer to activate signal.
            {distance != null && (
              <span className="distance-away">{formatDistanceAway(distance)}</span>
            )}
          </p>
        )}
        {inSearchArea && (
          <FinderSignalPreview
            distance={distance}
            accuracy={accuracy}
            signal={signal}
            searchRadius={searchRadius}
          />
        )}
        <button
          type="button"
          disabled={!inSearchArea}
          onClick={() => nav('finder', adventure.id, { adminPreview })}
        >
          <Compass size={18} /> Enter Finder Mode
        </button>
        {!inSearchArea && !locating && (
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
  const { distance, gpsError, searchRadius, medallion, inSearchArea, signal, locating } =
    useMedallionGps(adventure);

  if (!medallion) {
    return (
      <p>Complete the trail — add GPS to the final clue to enable Finder Mode.</p>
    );
  }

  return (
    <>
      <p>
        {physical
          ? 'All clues solved. Follow the physical medallion signal in Finder Mode.'
          : 'All clues solved. The virtual medallion is broadcasting — enter Finder Mode to track the signal.'}
      </p>
      {locating && <p className="finder-gps-status">Locating your position…</p>}
      {gpsError && <p className="loc-feedback denied">{gpsError}</p>}
      {!locating && !gpsError && !inSearchArea && (
        <p className="loc-feedback denied finder-activate-hint">
          Move closer to activate signal.
          {distance != null && (
            <span className="distance-away">{formatDistanceAway(distance)}</span>
          )}
        </p>
      )}
      {inSearchArea && (
        <FinderSignalPreview
          distance={distance}
          signal={signal}
          searchRadius={searchRadius}
        />
      )}
      <button
        type="button"
        disabled={!inSearchArea}
        onClick={() => nav('finder', adventure.id, { adminPreview })}
      >
        <Compass size={18} /> Enter Finder Mode
      </button>
      {!inSearchArea && !locating && (
        <p className="admin-meta">
          Signal activates within {searchRadius} m · tap unlocks in capture range.
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
  const tapDisabled = !inCaptureRange || progress.medallionTapped || capturing;
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
      <CinematicAROverlay
        open={finaleArOpen}
        scene={arFinale}
        onComplete={completeFinaleAr}
        onSkip={completeFinaleAr}
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
        <Compass size={16} /> Finder Mode ·{' '}
        {inCaptureRange
          ? 'Capture ready'
          : inSearchArea
            ? 'Signal active'
            : 'Searching…'}
      </div>

      <div className="card finder-stats">
        <div className="finder-stat">
          <small>Signal strength</small>
          <div className="signal-meter" aria-label={`Signal ${signal}%`}>
            <i style={{ width: `${inSearchArea ? signal : 0}%` }} />
          </div>
          <strong>{inSearchArea ? `${signal}%` : '—'}</strong>
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
        {!inSearchArea && effectiveDistance != null && !gpsError && (
          <p className="loc-feedback denied finder-activate-hint">
            Move closer to activate signal.
          </p>
        )}
        {gpsError && <p className="loc-feedback denied">{gpsError}</p>}
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
        <div className={`card finder-medallion-card ${inCaptureRange ? 'ready' : ''}`}>
          <div className="finder-medallion-visual" aria-hidden="true">
            <span className="finder-chest">{physical ? '📍' : '🧭'}</span>
            <span className="finder-medallion">🥇</span>
          </div>
          <h3>{physical ? 'Physical Medallion Signal' : 'Virtual Medallion'}</h3>
          <p>
            {capturing
              ? 'Capturing medallion...'
              : inCaptureRange
                ? physical
                  ? 'Signal peak reached. Tap to mark this search zone.'
                  : 'You are within capture range. Tap the medallion to secure it.'
                : inSearchArea
                  ? `Signal active. Move within ~${Math.round(captureRadius)} m to tap the medallion.`
                  : effectiveDistance != null
                    ? 'Move closer to activate signal.'
                    : 'Locating your position…'}
          </p>
          {tapError && <p className="form-error finder-tap-error">{tapError}</p>}
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
              : progress.medallionTapped
                ? 'Signal captured'
                : 'Tap Medallion'}
          </button>
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

export function TreasureClaimPanel({ adventure, progress, onClaim }) {
  const method = normalizeClaimMethod(adventure.claimMethod);
  const [qrInput, setQrInput] = useState('');
  const [physicalInput, setPhysicalInput] = useState('');

  async function handleCodeClaim() {
    const code = document.getElementById('claim-code')?.value?.trim().toUpperCase();
    await handleClaimResponse(onClaim, code);
  }

  async function handleQrClaim() {
    await handleClaimResponse(onClaim, qrInput.trim().toUpperCase());
  }

  async function handlePhysicalClaim() {
    await handleClaimResponse(onClaim, physicalInput.trim().toUpperCase());
  }

  if (progress.claimed) {
    return <p>Treasure claimed. Open your Reward Vault to see everything you earned.</p>;
  }

  if (claimMethodUsesFinder(adventure) && !progress.medallionTapped) {
    return (
      <p>
        Enter Finder Mode and tap the medallion signal to unlock the final treasure claim.
      </p>
    );
  }

  if (method === CLAIM_METHOD.QR_CODE) {
    return (
      <>
        <p>Find the sponsor QR code and scan it to claim your rewards.</p>
        <input
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value.toUpperCase())}
          placeholder="QR payload"
        />
        <button type="button" onClick={handleQrClaim}>
          <QrCode size={18} /> Verify QR & Claim
        </button>
      </>
    );
  }

  if (method === CLAIM_METHOD.PHYSICAL_MEDALLION && progress.medallionTapped) {
    return (
      <div className="physical-search-card">
        <h4>The signal is strongest here. Search carefully.</h4>
        {adventure.hintAfterTap && (
          <p className="physical-hint">
            <MapPin size={14} /> {adventure.hintAfterTap}
          </p>
        )}
        <p>
          Discover the hidden physical medallion nearby. Enter the engraved code from the
          medallion to unlock your rewards.
        </p>
        <input
          value={physicalInput}
          onChange={(e) => setPhysicalInput(e.target.value.toUpperCase())}
          placeholder="Engraved physical code"
        />
        <button type="button" onClick={handlePhysicalClaim}>
          <Sparkles size={18} /> Claim Treasure
        </button>
      </div>
    );
  }

  if (method === CLAIM_METHOD.SECRET_CODE) {
    return (
      <>
        <p>Enter the final claim code to unlock your rewards.</p>
        <input id="claim-code" placeholder="Enter secret code" />
        <button type="button" onClick={handleCodeClaim}>
          <Sparkles size={18} /> Claim Treasure
        </button>
      </>
    );
  }

  if (method === CLAIM_METHOD.HYBRID) {
    return (
      <>
        <p>Virtual medallion secured. Enter the final claim code to complete your claim.</p>
        <input id="claim-code" placeholder="Enter secret code" />
        <button type="button" onClick={handleCodeClaim}>
          <Sparkles size={18} /> Claim Treasure
        </button>
      </>
    );
  }

  return null;
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
