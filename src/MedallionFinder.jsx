import React, { useEffect, useState } from 'react';
import { Compass, LocateFixed, MapPin, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import {
  canCaptureMedallion,
  canUnlockFinderMode,
  computeSignalStrength,
  getCaptureRadius,
  getFinderSearchRadius,
  getMedallionLocation,
  measureMedallionDistance,
  usesFinderMode,
} from './finderMode';
import { formatDistanceAway, getCurrentPosition } from './geolocation';

export function MedallionSignalScreen({ adventure, nav, adminPreview }) {
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
          The trail is complete. A virtual medallion is broadcasting nearby — enter Finder Mode
          and follow the signal to claim your rewards.
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

export function FinderModeScreen({
  adventure,
  progress,
  nav,
  adminPreview,
  onMedallionTap,
}) {
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
        <p>No medallion GPS set for this adventure.</p>
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
          <span className="finder-chest">🧭</span>
          <span className="finder-medallion">🥇</span>
        </div>
        <h3>Virtual Medallion</h3>
        <p>
          {inCaptureRange
            ? 'You are within capture range. Tap the medallion to secure it.'
            : unlocked
              ? `Move closer — within ~${Math.round(captureRadius)} m including GPS buffer.`
              : `Enter the search area (within ${searchRadius} m) to strengthen the signal.`}
        </p>
        <button onClick={handleTap} disabled={!inCaptureRange || progress.medallionTapped}>
          <Sparkles size={18} />
          {progress.medallionTapped ? 'Medallion secured' : 'Tap Medallion'}
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
  const method = adventure.claimMethod || 'secret_code';
  const [qrInput, setQrInput] = useState('');

  function handleCodeClaim() {
    const code = document.getElementById('claim-code')?.value?.trim().toUpperCase();
    const result = onClaim(code);
    if (result && !result.ok) alert(result.message);
  }

  function handleQrClaim() {
    const result = onClaim(qrInput.trim().toUpperCase());
    if (result && !result.ok) alert(result.message);
  }

  if (progress.claimed) {
    return <p>Treasure claimed. Open your Reward Vault to see everything you earned.</p>;
  }

  if (!progress.medallionTapped && usesFinderMode(adventure)) {
    return <p>Complete Finder Mode and tap the virtual medallion to unlock claiming.</p>;
  }

  if (method === 'qr_code') {
    return (
      <>
        <p>Scan the trail QR code or enter the QR payload below.</p>
        <input
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value.toUpperCase())}
          placeholder="QR payload"
        />
        <button onClick={handleQrClaim}>
          <Sparkles size={18} /> Verify QR & Claim
        </button>
      </>
    );
  }

  if (method === 'secret_code' || method === 'hybrid') {
    return (
      <>
        <p>
          {method === 'hybrid'
            ? 'Medallion secured. Enter the secret code to complete your claim.'
            : 'Signal unlocked. Enter the secret code from the trail to claim your rewards.'}
        </p>
        <input id="claim-code" placeholder="Enter secret code" />
        <button onClick={handleCodeClaim}>
          <Sparkles size={18} /> Claim Treasure
        </button>
      </>
    );
  }

  return null;
}
