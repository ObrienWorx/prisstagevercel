'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteLayout from '@/components/SiteLayout';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setErr('Please enter your email address'); return; }
    setErr(''); setLoading(true);
    try {
      const r = await fetch('/api/subscriber/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (d.success) {
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
      } else {
        setErr(d.error || 'Failed to send reset code');
      }
    } catch { setErr('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <SiteLayout>
      <div className="auth-section">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">🔑</div>
            <div className="auth-logo-name mt-2">Forgot Password?</div>
          </div>

          <p className="auth-desc">
            Enter your registered email address and we&apos;ll send you a 6-digit code to reset your password.
          </p>

          {err && <div className="alert-inline alert-inline-danger">{err}</div>}

          <form onSubmit={submit}>
            <div className="auth-input-group">
              <label className="auth-label">Email Address</label>
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </div>
            <button type="submit" className="auth-btn mt-2" disabled={loading}>
              {loading ? 'Sending code...' : 'Send Reset Code →'}
            </button>
          </form>

          <div className="auth-link-row">
            Remembered your password?{' '}
            <Link href="/auth/login" className="auth-text-link">Back to login</Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
