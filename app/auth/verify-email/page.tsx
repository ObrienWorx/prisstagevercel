'use client';

import { useState, useRef, useEffect, KeyboardEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SiteLayout from '@/components/SiteLayout';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const plan = searchParams.get('plan');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

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
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputs.current[5]?.focus();
    }
  };

  const submit = async () => {
    const code = digits.join('');
    if (code.length < 6) { setErr('Please enter the 6-digit code'); return; }
    setErr(''); setLoading(true);
    try {
      const r = await fetch('/api/subscriber/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const d = await r.json();
      if (d.success) {
        localStorage.setItem('subscriber_token', d.data.token);
        localStorage.setItem('subscriber_user', JSON.stringify(d.data.subscriber));
        router.push(plan ? `/subscribe/${plan}` : '/user/dashboard?verified=1');
      } else {
        setErr(d.error || 'Verification failed');
      }
    } catch { setErr('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const resend = async () => {
    setResendLoading(true); setErr(''); setMsg('');
    try {
      const r = await fetch('/api/subscriber/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'email-verify' }),
      });
      const d = await r.json();
      if (d.success) { setMsg('A new code has been sent to your email.'); setCountdown(60); }
      else setErr(d.error || 'Failed to resend');
    } catch { setErr('Network error.'); }
    finally { setResendLoading(false); }
  };

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <div className="auth-logo-icon">✉️</div>
        <div className="auth-logo-name mt-2">Check Your Email</div>
      </div>

      <p className="auth-desc">
        We sent a 6-digit verification code to<br />
        <strong>{email || 'your email'}</strong>
      </p>

      {err && <div className="alert-inline alert-inline-danger text-center">{err}</div>}
      {msg && <div className="alert-inline alert-inline-success text-center">{msg}</div>}

      <div className="otp-input-row" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            className="otp-digit"
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
            onFocus={e => e.target.select()}
          />
        ))}
      </div>

      <button onClick={submit} className="auth-btn" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify Email →'}
      </button>

      <div className="auth-link-row mt-3">
        Didn&apos;t receive the code?{' '}
        {countdown > 0 ? (
          <span className="auth-countdown">Resend in {countdown}s</span>
        ) : (
          <button onClick={resend} disabled={resendLoading} className="auth-resend-btn">
            {resendLoading ? 'Sending...' : 'Resend code'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <SiteLayout>
      <div className="auth-section">
        <Suspense fallback={<div className="auth-card text-center auth-countdown">Loading...</div>}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
