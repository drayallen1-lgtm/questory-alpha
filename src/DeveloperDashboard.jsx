/**
 * Questory 2.0 — Phase 14.5/14.75: Developer Dashboard (dev / admin only)
 */
import React, { useMemo, useState } from 'react';
import { Activity, ArrowLeft, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
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
          <p>Engine snapshots, timing, state size, and inspector — read-only diagnostics.</p>
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
          <span className="dev-summary-pill">
            {active.summary.totalTimingMs}ms total probe time
          </span>
          {active.stateSize && (
            <span className={`dev-summary-pill ${active.stateSize.safe ? 'ok' : 'warn'}`}>
              State: {active.stateSize.formatted}
            </span>
          )}
          {active.dependencyCycles && (
            <span className="dev-summary-pill">
              ~{active.dependencyCycles.knownCount} known import cycles
            </span>
          )}
          <small>Last check: {active.ranAt}</small>
        </div>
      )}

      {active?.summary?.stateSizeWarning && (
        <div className="card dev-warning-card">
          <AlertTriangle size={16} />
          <p>{active.summary.stateSizeWarning}</p>
        </div>
      )}

      {active?.summary?.worldPerformanceWarning && (
        <div className="card dev-warning-card" data-testid="world-performance-warning">
          <AlertTriangle size={16} />
          <p>{active.summary.worldPerformanceWarning}</p>
        </div>
      )}

      {active?.worldPerformance?.warnings?.length > 0 && (
        <div className="card dev-inspector-card">
          <h3>World Performance</h3>
          <div className="dev-inspector-grid">
            <div className="dev-inspector-item">
              <small>hudCards</small>
              <strong>{active.worldPerformance.hudCardCount}</strong>
            </div>
            <div className="dev-inspector-item">
              <small>visibleLayers</small>
              <strong>{active.worldPerformance.visibleLayerCount}</strong>
            </div>
            <div className="dev-inspector-item">
              <small>animations</small>
              <strong>{active.worldPerformance.animationCount}</strong>
            </div>
          </div>
        </div>
      )}

      {(active?.activeErrors?.length > 0 || active?.launchErrors?.length > 0) && (
        <div className="card dev-errors-card">
          <h3>Active Errors</h3>
          {active.activeErrors?.map((entry) => (
            <p key={entry.id} className="dev-engine-error">
              <strong>{entry.id}:</strong> {entry.error}
            </p>
          ))}
          {active.launchErrors?.map((entry) => (
            <p key={entry.id} className="dev-engine-error">
              <strong>launch/{entry.context}:</strong> {entry.message}
            </p>
          ))}
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
