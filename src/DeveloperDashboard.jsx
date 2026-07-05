/**
 * Questory 2.0 — Phase 14.5: Developer Dashboard (dev / admin only)
 */
import React, { useMemo, useState } from 'react';
import { Activity, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { runDeveloperHealthCheck } from './developerHealthEngine';
import { isDev } from './config/env';

export function DeveloperDashboard({ state, adventures = [], nav, isAdmin = false }) {
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);

  const canView = isDev || isAdmin;
  const initial = useMemo(
    () => (canView ? runDeveloperHealthCheck(state, adventures) : null),
    [state, adventures, canView]
  );

  if (!canView) {
    return (
      <div className="card dev-dashboard-locked">
        <p>Developer Health is available in dev mode or for admin users.</p>
      </div>
    );
  }

  function handleRunCheck() {
    setRunning(true);
    try {
      setReport(runDeveloperHealthCheck(state, adventures));
    } finally {
      setRunning(false);
    }
  }

  const active = report || initial;

  return (
    <div className="dev-dashboard">
      <div className="section-head dev-dashboard-head">
        <div>
          <h2>
            <Activity size={20} /> Dev Health
          </h2>
          <p>Engine snapshots, timing, and state inspector — read-only diagnostics.</p>
        </div>
        <div className="dev-dashboard-actions">
          <button type="button" className="ghost" onClick={() => nav?.('admin')}>
            <ArrowLeft size={16} /> Admin
          </button>
          <button type="button" onClick={handleRunCheck} disabled={running}>
            <RefreshCw size={16} /> {running ? 'Running…' : 'Run Health Check'}
          </button>
        </div>
      </div>

      {active?.summary && (
        <div className="card dev-summary-card">
          <span className="dev-summary-pill ok">
            <ShieldCheck size={14} /> {active.summary.healthy}/{active.summary.total} engines healthy
          </span>
          <small>Ran {active.ranAt}</small>
        </div>
      )}

      <div className="card dev-inspector-card">
        <h3>State Inspector</h3>
        <div className="dev-inspector-grid">
          {active?.inspector &&
            Object.entries(active.inspector).map(([key, value]) => (
              <div key={key} className="dev-inspector-item">
                <small>{key}</small>
                <strong>{String(value)}</strong>
              </div>
            ))}
        </div>
      </div>

      <div className="dev-engine-grid">
        {(active?.engines || []).map((engine) => (
          <div
            key={engine.id}
            className={`card dev-engine-card ${engine.error ? 'failed' : engine.snapshotOk ? 'ok' : 'warn'}`}
          >
            <div className="dev-engine-head">
              <strong>{engine.label}</strong>
              <span>{engine.timingMs}ms</span>
            </div>
            <div className="dev-engine-meta">
              <span>Init: {engine.initialized ? 'yes' : 'no'}</span>
              <span>Snapshot: {engine.snapshotOk ? 'yes' : 'no'}</span>
              <span>Items: {engine.itemCount}</span>
            </div>
            {engine.error && <p className="dev-engine-error">{engine.error}</p>}
            {engine.sample && (
              <pre className="dev-engine-sample">{JSON.stringify(engine.sample, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
