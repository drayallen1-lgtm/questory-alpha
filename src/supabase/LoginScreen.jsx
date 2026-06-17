import React, { useState } from 'react';
import { LogIn, Mail, Lock } from 'lucide-react';
import { useAuth } from './AuthContext';
import { formatAuthError } from './authErrors';

export function LoginScreen({ onClose, initialError = '' }) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        onClose?.();
      } else {
        await signUpWithEmail(email.trim(), password);
        setMessage('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(formatAuthError(err));
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="card login-card">
        <h2>Sign in to Questory</h2>
        <p>Save rewards, claim history, and progress to your account.</p>

        {error && <p className="form-error login-error-top">{error}</p>}

        <button onClick={handleGoogle} disabled={busy}>
          <LogIn size={18} /> Continue with Google
        </button>

        <div className="login-divider">or email</div>

        <form onSubmit={handleEmailSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
          {message && <p className="loc-feedback success">{message}</p>}
          <button type="submit" disabled={busy}>
            <Mail size={16} />
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          className="ghost"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError('');
            setMessage('');
          }}
        >
          <Lock size={16} />
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>

        {onClose && (
          <button className="ghost" onClick={onClose}>
            Continue in local mode
          </button>
        )}
      </div>
    </div>
  );
}
