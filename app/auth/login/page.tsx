'use client';

import { useState, useEffect, useRef, KeyboardEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SiteLayout from '@/components/SiteLayout';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const resetSuccess = searchParams.get('reset') === '1';

  // Password login state
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP login state
  const [otpMode, setOtpMode] = useState(false);
  const [otpStep, setOtpStep] = useState<'email' | 'verify'>('email');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [otpMsg, setOtpMsg] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) return;
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) router.replace(plan ? `/subscribe/${plan}` : '/user/dashboard'); })
      .catch(() => {});
  }, [router, plan]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Password login submit
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setErr('Please fill in all fields'); return; }
    setErr(''); setLoading(true);
    try {
      const r = await fetch('/api/subscriber/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) {
        localStorage.setItem('subscriber_token', d.data.token);
        localStorage.setItem('subscriber_user', JSON.stringify(d.data.subscriber));
        router.push(plan ? `/subscribe/${plan}` : '/user/dashboard');
      } else if (d.data?.requiresVerification) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(d.data.email)}${plan ? `&plan=${plan}` : ''}`);
      } else {
        setErr(d.error || 'Login failed');
      }
    } catch { setErr('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  // OTP step 1: send OTP
  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail) { setErr('Please enter your email address'); return; }
    setErr(''); setOtpLoading(true);
    try {
      const r = await fetch('/api/subscriber/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, purpose: 'login' }),
      });
      const d = await r.json();
      if (d.success) {
        setOtpStep('verify');
        setDigits(['', '', '', '', '', '']);
        setCountdown(60);
        setOtpMsg('');
        setTimeout(() => inputs.current[0]?.focus(), 100);
      } else {
        setErr(d.error || 'Failed to send OTP');
      }
    } catch { setErr('Network error. Please try again.'); }
    finally { setOtpLoading(false); }
  };

  // OTP step 2: verify OTP
  const verifyOtp = async () => {
    const code = digits.join('');
    if (code.length < 6) { setErr('Please enter the 6-digit code'); return; }
    setErr(''); setOtpLoading(true);
    try {
      const r = await fetch('/api/subscriber/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, code }),
      });
      const d = await r.json();
      if (d.success) {
        localStorage.setItem('subscriber_token', d.data.token);
        localStorage.setItem('subscriber_user', JSON.stringify(d.data.subscriber));
        router.push(plan ? `/subscribe/${plan}` : '/user/dashboard');
      } else {
        setErr(d.error || 'Verification failed');
      }
    } catch { setErr('Network error. Please try again.'); }
    finally { setOtpLoading(false); }
  };

  const resendOtp = async () => {
    setOtpLoading(true); setErr(''); setOtpMsg('');
    try {
      const r = await fetch('/api/subscriber/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, purpose: 'login' }),
      });
      const d = await r.json();
      if (d.success) { setOtpMsg('A new code has been sent.'); setCountdown(60); }
      else setErr(d.error || 'Failed to resend');
    } catch { setErr('Network error.'); }
    finally { setOtpLoading(false); }
  };

  const handleDigit = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setDigits(pasted.split('')); inputs.current[5]?.focus(); }
  };

  const switchToOtp = () => {
    setOtpMode(true);
    setOtpEmail(form.email);
    setOtpStep('email');
    setErr('');
    setDigits(['', '', '', '', '', '']);
  };

  const switchToPassword = () => {
    setOtpMode(false);
    setOtpStep('email');
    setErr('');
    setDigits(['', '', '', '', '', '']);
  };

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <img src="/logo.png" alt="Pristine Gaze" className="w-100" />
      </div>

      <h2 className="auth-title">Welcome back</h2>
      <p className="auth-sub">
        {otpMode
          ? otpStep === 'email' ? 'Enter your email to receive a login code' : 'Enter the code sent to your email'
          : 'Sign in to access your research & insights'}
      </p>

      {resetSuccess && !otpMode && (
        <div className="alert-inline alert-inline-success text-center">
          Password reset successfully! You can now sign in.
        </div>
      )}
      {err && <div className="alert-inline alert-inline-danger">{err}</div>}
      {otpMsg && <div className="alert-inline alert-inline-success text-center">{otpMsg}</div>}

      {!otpMode ? (
        /* ── Password login ── */
        <form onSubmit={submitPassword}>
          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input
              type="email" className="auth-input" value={form.email} autoComplete="email"
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div className="auth-input-group">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="auth-label mb-0">Password</label>
              <Link href="/auth/forgot-password" className="auth-forgot">Forgot password?</Link>
            </div>
            <input
              type="password" className="auth-input" value={form.password} autoComplete="current-password"
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Your password"
            />
          </div>

          <button type="submit" className="auth-btn mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>

          <button type="button" className="auth-otp-switch" onClick={switchToOtp}>
            Prefer OTP? <b>Login with a one-time code instead</b>
          </button>
        </form>
      ) : otpStep === 'email' ? (
        /* ── OTP step 1: enter email ── */
        <form onSubmit={sendOtp}>
          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input
              type="email" className="auth-input" value={otpEmail} autoComplete="email"
              onChange={e => setOtpEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </div>

          <button type="submit" className="auth-btn mt-2" disabled={otpLoading}>
            {otpLoading ? 'Sending code...' : 'Send Login Code →'}
          </button>

          <button type="button" className="auth-otp-switch" onClick={switchToPassword}>
            <b>Back to password login</b>
          </button>
        </form>
      ) : (
        /* ── OTP step 2: enter code ── */
        <div>
          <p className="auth-desc mb-3">
            We sent a 6-digit code to <strong>{otpEmail}</strong>
          </p>

          <div className="otp-input-row" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1} value={d}
                className="otp-digit"
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
                onFocus={e => e.target.select()}
              />
            ))}
          </div>

          <button onClick={verifyOtp} className="auth-btn" disabled={otpLoading}>
            {otpLoading ? 'Verifying...' : 'Verify & Sign In →'}
          </button>

          <div className="auth-link-row mt-3">
            Didn&apos;t receive the code?{' '}
            {countdown > 0 ? (
              <span className="auth-countdown">Resend in {countdown}s</span>
            ) : (
              <button onClick={resendOtp} disabled={otpLoading} className="auth-resend-btn">
                {otpLoading ? 'Sending...' : 'Resend code'}
              </button>
            )}
          </div>

          <button type="button" className="auth-otp-switch" onClick={switchToPassword}>
            <b>Back to password login</b>
          </button>
        </div>
      )}

      <div className="auth-link-row">
        Don&apos;t have an account?{' '}
        <Link href={`/auth/register${plan ? `?plan=${plan}` : ''}`} className="auth-text-link">
          Create account
        </Link>
      </div>
    </div>
  );
}

export default function SubscriberLoginPage() {
  return (
    <SiteLayout>
      <div className="auth-section">
        <Suspense fallback={<div className="auth-card text-center auth-countdown">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
