'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRecaptchaToken } from '@/lib/recaptcha-client';

export default function SidebarLoginForm({ redirectPath }: { redirectPath: string }) {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const recaptchaToken = await getRecaptchaToken('login');
      const res  = await fetch('/api/subscriber/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('subscriber_token', data.data.token);
        localStorage.setItem('subscriber_user', JSON.stringify(data.data.user));
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  void redirectPath;

  return (
    <div className="slf-card">
      <div className="slf-title">Already a subscriber?</div>
      <div className="slf-subtitle">Sign in to read this report.</div>

      {error && <div className="slf-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="slf-field">
          <input
            type="email" required placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)}
            className="slf-input"
          />
        </div>
        <div className="slf-field">
          <input
            type="password" required placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            className="slf-input"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="slf-submit"
          style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="slf-footer">
        <a href="/auth/forgot-password" className="slf-link">Forgot password?</a>
        {' · '}
        <a href="/auth/register" className="slf-link">Create account</a>
      </div>
    </div>
  );
}
