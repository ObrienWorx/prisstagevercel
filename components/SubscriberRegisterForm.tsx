'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRecaptchaToken } from '@/lib/recaptcha-client';

type Props = {
  plan?: string | null;
  onSwitchToLogin?: () => void;
};

export default function SubscriberRegisterForm({ plan = null, onSwitchToLogin }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) return;
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) router.replace(plan ? `/subscribe/${plan}` : '/user/dashboard'); })
      .catch(() => {});
  }, [router, plan]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) { setErr('Please fill in all required fields'); return; }
    if (!agree) { setErr('Please agree to the Terms and Conditions and Financial Services Guide to continue.'); return; }
    setErr(''); setLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken('register');
      const r = await fetch('/api/subscriber/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, recaptchaToken }),
      });
      const d = await r.json();
      if (d.success) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(form.email)}${plan ? `&plan=${plan}` : ''}`);
      } else {
        setErr(d.error || 'Registration failed');
      }
    } catch { setErr('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <img src="/logo2.png" alt="Pristine Gaze" className="w-75" />
      </div>

      <h2 className="auth-title">Create your account</h2>
      <p className="auth-sub">{plan ? 'Subscribe to get started with your plan' : 'Join thousands of Australian investors'}</p>

      {err && <div className="alert-inline alert-inline-danger">{err}</div>}

      <form onSubmit={submit}>
        <div className="auth-input-group">
          <label className="auth-label">Full Name <span className="auth-required">*</span></label>
          <input className="auth-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Smith" autoComplete="name" />
        </div>
        <div className="auth-input-group">
          <label className="auth-label">Email Address <span className="auth-required">*</span></label>
          <input type="email" className="auth-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="auth-input-group">
          <label className="auth-label">Phone Number <span className="auth-required">*</span></label>
          <input type="tel" className="auth-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+61 4xx xxx xxx" autoComplete="tel" />
        </div>

        <label className="auth-check">
          <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
          <span>
            I agree to the Pristine Gaze{' '}
            <Link href="/terms-of-use" className="auth-text-link" target="_blank">Terms and Conditions</Link> and{' '}
            <Link href="/financial-services-guide" className="auth-text-link" target="_blank">Financial Services Guide</Link>.
          </span>
        </label>

        <button type="submit" className="auth-btn mt-2" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account & Verify Email →'}
        </button>
      </form>

      <div className="auth-link-row">
        Already have an account?{' '}
        {onSwitchToLogin ? (
          <button type="button" className="auth-text-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} onClick={onSwitchToLogin}>
            Sign in
          </button>
        ) : (
          <Link href={`/member-account${plan ? `?plan=${plan}` : ''}`} className="auth-text-link">Sign in</Link>
        )}
      </div>

      <p className="auth-terms">
        By creating an account you agree to our{' '}
        <Link href="/terms-of-use" className="auth-text-link" target="_blank">Terms of Use</Link> and{' '}
        <Link href="/privacy-policy" className="auth-text-link" target="_blank">Privacy Policy</Link>.
      </p>
    </div>
  );
}
