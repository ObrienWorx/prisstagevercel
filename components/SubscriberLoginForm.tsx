'use client';

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRecaptchaToken } from '@/lib/recaptcha-client';

type Props = {
  plan?: string | null;
  resetSuccess?: boolean;
  redirectPath?: string;
};

export default function SubscriberLoginForm({ plan = null, resetSuccess = false, redirectPath }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState('');
  const [otpHint, setOtpHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [otpMode, setOtpMode] = useState(false);
  const [otpStep, setOtpStep] = useState<'email' | 'verify'>('email');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [otpMsg, setOtpMsg] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const [setupMode, setSetupMode] = useState(false);
  const [pending, setPending] = useState<{ token: string; subscriber: unknown } | null>(null);
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  const destination = redirectPath || (plan ? `/subscribe/${plan}` : '/user/dashboard');

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) return;
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) router.replace(destination); })
      .catch(() => {});
  }, [router, destination]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const finishLogin = (token: string, subscriber: unknown) => {
    localStorage.setItem('subscriber_token', token);
    localStorage.setItem('subscriber_user', JSON.stringify(subscriber));
    if (redirectPath) {
      router.refresh();
      window.location.reload();
      return;
    }
    router.push(destination);
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setErr('Please fill in all fields'); return; }
    if (!agree) { setErr('Please agree to the Terms and Conditions and Financial Services Guide to continue.'); return; }
    setErr(''); setOtpHint(false); setLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken('login');
      const r = await fetch('/api/subscriber/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptchaToken }),
      });
      const d = await r.json();
      if (d.success) {
        finishLogin(d.data.token, d.data.subscriber);
      } else if (d.data?.requiresVerification) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(d.data.email)}${plan ? `&plan=${plan}` : ''}`);
      } else if (d.data?.requiresOtp) {
        setOtpHint(true);
        setErr(d.error || 'Please log in using OTP authentication.');
      } else {
        setErr(d.error || 'Login failed');
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail) { setErr('Please enter your email address'); return; }
    setErr(''); setOtpLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken('send_otp');
      const r = await fetch('/api/subscriber/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, purpose: 'login', recaptchaToken }),
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
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

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
        if (d.data.requiresPasswordSetup) {
          setPending({ token: d.data.token, subscriber: d.data.subscriber });
          setSetupMode(true);
          setErr('');
        } else {
          finishLogin(d.data.token, d.data.subscriber);
        }
      } else {
        setErr(d.error || 'Verification failed');
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    if (newPw.length < 6) { setErr('Password must be at least 6 characters'); return; }
    if (newPw !== newPw2) { setErr('Passwords do not match'); return; }
    setErr(''); setOtpLoading(true);
    try {
      const r = await fetch('/api/subscriber/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pending.token}` },
        body: JSON.stringify({ password: newPw }),
      });
      const d = await r.json();
      if (d.success) {
        finishLogin(pending.token, pending.subscriber);
      } else {
        setErr(d.error || 'Could not set password');
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    setOtpLoading(true); setErr(''); setOtpMsg('');
    try {
      const recaptchaToken = await getRecaptchaToken('send_otp');
      const r = await fetch('/api/subscriber/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, purpose: 'login', recaptchaToken }),
      });
      const d = await r.json();
      if (d.success) { setOtpMsg('A new code has been sent.'); setCountdown(60); }
      else setErr(d.error || 'Failed to resend');
    } catch {
      setErr('Network error.');
    } finally {
      setOtpLoading(false);
    }
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
    setOtpHint(false);
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
        <img src="/logo2.png" alt="Pristine Gaze" className="w-75" />
      </div>

      <h2 className="auth-title">{setupMode ? 'Set your password' : 'Welcome back'}</h2>
      <p className="auth-sub">
        {setupMode
          ? 'Create a password so you can sign in directly next time'
          : otpMode
          ? otpStep === 'email' ? 'Enter your email to receive a login code' : 'Enter the code sent to your email'
          : 'Sign in to access your research & insights'}
      </p>

      {resetSuccess && !otpMode && (
        <div className="alert-inline alert-inline-success text-center">
          Password reset successfully! You can now sign in.
        </div>
      )}
      {err && (
        <div className="alert-inline alert-inline-danger">
          {err}
          {otpHint && (
            <>
              {' '}
              <button type="button" className="auth-otp-inline-link" onClick={switchToOtp}>
                Click here
              </button>
            </>
          )}
        </div>
      )}
      {otpMsg && <div className="alert-inline alert-inline-success text-center">{otpMsg}</div>}

      {setupMode ? (
        <form onSubmit={submitNewPassword}>
          <div className="auth-input-group">
            <label className="auth-label">New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input" value={newPw} autoComplete="new-password"
              onChange={e => setNewPw(e.target.value)}
              placeholder="At least 6 characters"
              autoFocus
            />
          </div>
          <div className="auth-input-group">
            <label className="auth-label">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input" value={newPw2} autoComplete="new-password"
              onChange={e => setNewPw2(e.target.value)}
              placeholder="Re-enter your password"
            />
          </div>
          <button type="submit" className="auth-btn mt-2" disabled={otpLoading}>
            {otpLoading ? 'Saving...' : 'Save Password & Continue ->'}
          </button>
        </form>
      ) : !otpMode ? (
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
            <div className="auth-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                value={form.password}
                autoComplete="current-password"
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Your password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(prev => !prev)}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.05 10.05 0 0 1 12 20c-7 0-11-8-11-8a18.1 18.1 0 0 1 5.06-5.94" />
                    <path d="M1 1l22 22" />
                    <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                    <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                    <path d="M14.93 14.93A10.05 10.05 0 0 0 23 12s-4-8-11-8a10.05 10.05 0 0 0-5.94 1.94" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <label className="auth-check">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            <span>Remember Me</span>
          </label>
          <label className="auth-check">
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
            <span>
              I agree to the Pristine Gaze{' '}
              <Link href="/terms-of-use" className="auth-text-link">Terms and Conditions</Link> and{' '}
              <Link href="/financial-services-guide" className="auth-text-link">Financial Services Guide</Link>.
            </span>
          </label>

          <button type="submit" className="auth-btn mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In ->'}
          </button>

          <button type="button" className="auth-otp-switch" onClick={switchToOtp}>
            Prefer OTP? <b>Login with a one-time code instead</b>
          </button>
        </form>
      ) : otpStep === 'email' ? (
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
            {otpLoading ? 'Sending code...' : 'Send Login Code ->'}
          </button>

          <button type="button" className="auth-otp-switch" onClick={switchToPassword}>
            <b>Back to password login</b>
          </button>
        </form>
      ) : (
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
            {otpLoading ? 'Verifying...' : 'Verify & Sign In ->'}
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
