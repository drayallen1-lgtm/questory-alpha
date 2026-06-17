import React from 'react';
import { useAuth } from './AuthContext';
import { isDev } from '../config/env';

export function AuthDebugPanel() {
  const { isSupabaseMode, user, profile, loading } = useAuth();

  if (!isDev) return null;

  return (
    <aside className="auth-debug-panel" aria-label="Auth debug (dev only)">
      <div className="auth-debug-title">Auth debug</div>
      <dl className="auth-debug-grid">
        <div>
          <dt>Cloud mode</dt>
          <dd>{isSupabaseMode ? 'on' : 'off'}</dd>
        </div>
        <div>
          <dt>Session</dt>
          <dd>{loading ? 'loading…' : user ? 'signed in' : 'signed out'}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user?.email ?? '—'}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{profile?.role ?? '—'}</dd>
        </div>
      </dl>
    </aside>
  );
}
