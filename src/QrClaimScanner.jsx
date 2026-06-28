import React, { useEffect, useRef, useState } from 'react';
import { Camera, QrCode, X } from 'lucide-react';

function normalizeQrPayload(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/^https?:\/\//i, '');
}

export function QrClaimScanner({ onScan, onClose, busy = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [scanning, setScanning] = useState(false);
  const supportsDetector =
    typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!supportsDetector) return;
      setScanning(true);
      setError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        loopRef.current = setInterval(async () => {
          if (!videoRef.current || cancelled) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const match = codes.find((c) => c.rawValue);
            if (match?.rawValue) {
              onScan?.(normalizeQrPayload(match.rawValue));
            }
          } catch {
            /* frame skip */
          }
        }, 450);
      } catch {
        if (!cancelled) {
          setError('Camera access denied. Paste the QR code below or scan with your camera app.');
        }
      } finally {
        if (!cancelled) setScanning(false);
      }
    }

    start();
    return () => {
      cancelled = true;
      if (loopRef.current) clearInterval(loopRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [supportsDetector, onScan]);

  return (
    <div className="qr-claim-scanner">
      <div className="qr-scanner-header">
        <h4>Scan Sponsor QR</h4>
        {onClose && (
          <button type="button" className="ghost qr-scanner-close" onClick={onClose} aria-label="Close scanner">
            <X size={16} />
          </button>
        )}
      </div>
      <p className="qr-scanner-help">
        Point your camera at the sponsor QR poster at the finish line.
      </p>

      {supportsDetector ? (
        <div className="qr-scanner-viewport">
          <video ref={videoRef} className="qr-scanner-video" playsInline muted />
          <div className="qr-scanner-frame" aria-hidden />
          {scanning && <p className="qr-scanner-status">Starting camera…</p>}
        </div>
      ) : (
        <div className="qr-scanner-fallback card">
          <Camera size={28} />
          <p>
            Open your phone camera app to scan the QR code, then paste the result below.
          </p>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <label className="qr-manual-label">Or paste scan result</label>
      <input
        value={manual}
        onChange={(e) => setManual(e.target.value.toUpperCase())}
        placeholder="QR scan result"
        aria-label="QR scan result"
      />
      <button
        type="button"
        disabled={busy || !manual.trim()}
        onClick={() => onScan?.(normalizeQrPayload(manual))}
      >
        <QrCode size={18} /> {busy ? 'Verifying…' : 'Verify & Claim'}
      </button>
    </div>
  );
}
