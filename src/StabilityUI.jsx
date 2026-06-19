import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  getAdminLaunchAnalytics,
  getLaunchFunnelProgress,
  markPersonaTested,
} from './stability';

export function AppLoadingOverlay({ message = 'Loading Questory…' }) {
  return (
    <div className="stability-loading-overlay" role="status" aria-live="polite">
      <Loader2 size={32} className="stability-spinner" />
      <p>{message}</p>
    </div>
  );
}

export function EmptyStateCard({ icon = '🧭', title, desc, actionLabel, onAction }) {
  return (
    <div className="card empty-state-illustrated stability-empty">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{desc}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorRecoveryBanner({ message, onRetry, onDismiss }) {
  if (!message) return null;
  return (
    <div className="stability-error-banner" role="alert">
      <AlertTriangle size={18} />
      <p>{message}</p>
      <div className="stability-error-actions">
        {onRetry && (
          <button type="button" className="ghost" onClick={onRetry}>
            <RefreshCw size={14} /> Try again
          </button>
        )}
        {onDismiss && (
          <button type="button" className="ghost" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export function LaunchFunnelCard({ state }) {
  const steps = getLaunchFunnelProgress(state);
  const done = steps.filter((s) => s.completed).length;

  return (
    <div className="card stability-funnel-card">
      <h3>Your Launch Journey</h3>
      <p className="admin-meta">Demo → Create → Invite → Return</p>
      <div className="stability-funnel-steps">
        {steps.map((step, i) => (
          <div className={`stability-funnel-step ${step.completed ? 'done' : ''}`} key={step.id}>
            <span className="step-num">{step.completed ? '✓' : i + 1}</span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
      <small>{done} of {steps.length} complete</small>
    </div>
  );
}

export function AdminLaunchAnalytics({ state, setState, adventures }) {
  const analytics = getAdminLaunchAnalytics(state, adventures);

  return (
    <>
      <div className="section-head">
        <h2>Launch Analytics</h2>
        <p>Funnel conversion · persona tests · error log</p>
      </div>

      <div className="card stability-analytics-summary">
        <div className="stability-stat-grid">
          <div>
            <small>Funnel conversion</small>
            <strong>{analytics.conversionRate}%</strong>
          </div>
          <div>
            <small>Sessions</small>
            <strong>{analytics.sessionCount}</strong>
          </div>
          <div>
            <small>Adventures created</small>
            <strong>{analytics.stats.adventuresCreated}</strong>
          </div>
          <div>
            <small>Completions</small>
            <strong>{analytics.stats.adventuresCompleted}</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Demo → Create → Invite → Return</h3>
        {analytics.funnel.map((step) => (
          <div className={`stability-funnel-row ${step.completed ? 'done' : ''}`} key={step.id}>
            {step.completed ? <CheckCircle2 size={16} /> : <span className="step-dot" />}
            <div>
              <strong>{step.label}</strong>
              {step.at && <small>{new Date(step.at).toLocaleString()}</small>}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>
          <Users size={18} /> Persona Tests
        </h3>
        <p className="admin-meta">Verify Grandma, Kid, Friend, and Sponsor flows</p>
        {analytics.personaTests.map((p) => (
          <div className="stability-persona-row" key={p.id}>
            <div>
              <strong>{p.label}</strong>
              <p>{p.desc}</p>
            </div>
            {p.passed ? (
              <span className="chip-done">Passed ✓</span>
            ) : (
              <button
                type="button"
                className="ghost"
                onClick={() => setState(markPersonaTested(state, p.id))}
              >
                Mark passed
              </button>
            )}
          </div>
        ))}
      </div>

      {analytics.recentErrors.length > 0 && (
        <div className="card stability-error-log">
          <h3>Recent errors</h3>
          {analytics.recentErrors.map((e) => (
            <div className="stability-error-row" key={e.id}>
              <small>{e.context}</small>
              <p>{e.message}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function ButtonLoading({ loading, loadingLabel, children }) {
  if (loading) {
    return (
      <>
        <Loader2 size={16} className="stability-spinner inline" /> {loadingLabel || 'Loading…'}
      </>
    );
  }
  return children;
}
