import React, { useEffect, useState } from 'react';
import { Compass, LocateFixed, MapPin, QrCode, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import {
  CLAIM_METHOD,
  CLAIM_METHOD_OPTIONS,
  normalizeClaimMethod,
  claimMethodUsesFinder,
  isPhysicalMedallionClaim,
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

export function MedallionSignalScreen({ adventure, nav, adminPreview }) {
  const physical = isPhysicalMedallionClaim(adventure);

  return (
    <>
      <button
        className="ghost back"
        onClick={() => nav('play', adventure.id, { adminPreview })}
      >
        ← Adventure Play
      </button>
      <div className="card medallion-signal-card">
        <div className="signal-pulse-ring" aria-hidden />
        <Radio size={36} className="signal-icon" />
        <h2>Medallion Signal Activated.</h2>
        <p>
          {physical
            ? 'The trail is complete. A hidden physical medallion is nearby — enter Finder Mode, follow the signal, and search the area.'
            : 'The trail is complete. A virtual medallion is broadcasting nearby — enter Finder Mode and follow the signal.'}
        </p>
        <SponsorLine adventure={adventure} />
        <button onClick={() => nav('finder', adventure.id, { adminPreview })}>
          <Compass size={18} /> Enter Finder Mode
        </button>
      </div>
    </>
  );
}

function SponsorLine({ adventure }) {
  const name = adventure.sponsorInfo?.name || adventure.sponsor;
  if (!name) return null;
  return <p className="finder-sponsor">Sponsored by {name}</p>;
}

export function FinderModeScreen({ adventure, progress, nav, adminPreview, onMedallionTap }) {
  const [distance, setDistance] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [watching, setWatching] = useState(true);
  const [devOverride, setDevOverride] = useState(false);

  const searchRadius = getFinderSearchRadius(adventure);
  const captureRadius = getCaptureRadius(adventure, accuracy);
  const signal = computeSignalStrength(distance, searchRadius);
  const unlocked = canUnlockFinderMode(distance, accuracy, devOverride, searchRadius);
  const inCaptureRange = canCaptureMedallion(distance, accuracy, devOverride, adventure);
  const medallion = getMedallionLocation(adventure);
  const physical = isPhysicalMedallionClaim(adventure);

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
          setGpsError('Location unavailable. Enable GPS or use Dev Override.');
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

  function handleTap() {
    if (!inCaptureRange) return;
    onMedallionTap();
  }

  function handleDevOverride() {
    setDevOverride(true);
    setDistance(10);
    setAccuracy(5);
    setGpsError('');
  }

  if (!medallion) {
    return (
      <div className="card">
        <p>Add GPS coordinates to the final clue to enable Finder Mode.</p>
        <button className="ghost" onClick={() => nav('play', adventure.id, { adminPreview })}>
          Back
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        className="ghost back"
        onClick={() => nav('medallion-signal', adventure.id, { adminPreview })}
      >
        ← Signal
      </button>
      <div className="preview-banner finder-mode-banner">
        <Compass size={16} /> Finder Mode · {unlocked ? 'Signal locked' : 'Searching…'}
      </div>

      <div className="card finder-stats">
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
            <small>GPS accuracy</small>
            <strong>{accuracy != null ? `±${Math.round(accuracy)} m` : '—'}</strong>
          </div>
        </div>
        <div className="finder-stat-row">
          <div>
            <small>Search area</small>
            <strong>{searchRadius} m radius</strong>
          </div>
          <div>
            <small>Capture range</small>
            <strong>~{Math.round(captureRadius)} m + buffer</strong>
          </div>
        </div>
        {gpsError && <p className="loc-feedback denied">{gpsError}</p>}
      </div>

      <div className={`card finder-medallion-card ${inCaptureRange ? 'ready' : ''}`}>
        <div className="finder-medallion-visual" aria-hidden>
          <span className="finder-chest">{physical ? '📍' : '🧭'}</span>
          <span className="finder-medallion">🥇</span>
        </div>
        <h3>{physical ? 'Physical Medallion Signal' : 'Virtual Medallion'}</h3>
        <p>
          {inCaptureRange
            ? physical
              ? 'Signal peak reached. Tap to mark this search zone.'
              : 'You are within capture range. Tap the medallion to secure it.'
            : unlocked
              ? `Move closer — within ~${Math.round(captureRadius)} m including GPS buffer.`
              : `Enter the search area (within ${searchRadius} m) to strengthen the signal.`}
        </p>
        <button onClick={handleTap} disabled={!inCaptureRange || progress.medallionTapped}>
          <Sparkles size={18} />
          {progress.medallionTapped ? 'Signal captured' : 'Tap Medallion'}
        </button>
      </div>

      <div className="card finder-actions">
        <button className="ghost" onClick={() => setWatching((v) => !v)}>
          <LocateFixed size={16} /> {watching ? 'Pause GPS' : 'Resume GPS'}
        </button>
        <button className="ghost dev-unlock" onClick={handleDevOverride}>
          <ShieldCheck size={16} /> Dev Override
        </button>
        <p className="admin-meta">
          <MapPin size={12} /> Hot zone begins at 75 m · unlock within {searchRadius} m
        </p>
      </div>
    </>
  );
}

export function TreasureClaimPanel({ adventure, progress, onClaim }) {
  const method = normalizeClaimMethod(adventure.claimMethod);
  const [qrInput, setQrInput] = useState('');
  const [physicalInput, setPhysicalInput] = useState('');

  function handleCodeClaim() {
    const code = document.getElementById('claim-code')?.value?.trim().toUpperCase();
    const result = onClaim(code);
    if (result && !result.ok) alert(result.message);
  }

  function handleQrClaim() {
    const result = onClaim(qrInput.trim().toUpperCase());
    if (result && !result.ok) alert(result.message);
  }

  function handlePhysicalClaim() {
    const result = onClaim(physicalInput.trim().toUpperCase());
    if (result && !result.ok) alert(result.message);
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
        <button onClick={handleQrClaim}>
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
        <button onClick={handlePhysicalClaim}>
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
        <button onClick={handleCodeClaim}>
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
        <button onClick={handleCodeClaim}>
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
