'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  badge?: string;
  title?: string;
  buttonText?: string;
  successText?: string;
  source?: string;
  onSuccess?: () => void;
}

const AU_PHONE_RE = /^(?:0[23478]\d{8}|(?:\+?61)[23478]\d{8}|[23478]\d{8})$/;
const AU_POSTAL_CODE_RE = /^\d{4}$/;

function normalisePhone(value: string) {
  return value.replace(/[\s()-]/g, '');
}

export default function LeadCaptureForm({
  badge = 'Pristine Gaze',
  title = 'Grab Your FREE Report on Top 5 ASX Stocks to Buy in 2026',
  buttonText = 'Grab your free report',
  successText = 'We\'ll be in touch with your free report shortly.',
  source = 'general',
  onSuccess,
}: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', postalCode: '' });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setError('Please accept the terms to continue.'); return; }
    const phone = normalisePhone(form.phone);
    const postalCode = form.postalCode.trim();

    if (!AU_PHONE_RE.test(phone)) {
      setError('Please enter a valid Australian phone number.');
      return;
    }

    if (!AU_POSTAL_CODE_RE.test(postalCode)) {
      setError('Please enter a valid 4 digit Australian postal code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone, postalCode, consent, source }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        onSuccess?.();
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="lcf-card">
        <div className="lcf-success">
          <div className="lcf-success-icon">✓</div>
          <div className="lcf-success-title">Thank you!</div>
          <div className="lcf-success-sub">{successText}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="lcf-card">
      {badge && (
        <div className="lcf-badge">{badge}</div>
      )}
      <h4 className="lcf-title">{title}</h4>
      {error && <div className="lcf-error">{error}</div>}
      <form className="lcf-form" onSubmit={handleSubmit}>
        <input
          type="text" required placeholder="Full Name"
          className="lcf-input"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <input
          type="email" required placeholder="Email Address"
          className="lcf-input"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        />
        <div className="lcf-phone-wrap">
          <span className="lcf-phone-flag">🇦🇺 +61</span>
          <input
            type="tel" required placeholder="Phone number"
            className="lcf-input lcf-phone-input"
            value={form.phone}
            inputMode="tel"
            pattern="[0-9+() -]{9,16}"
            title="Enter an Australian phone number, for example 0489 990 844 or 489 990 844."
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <input
          type="text" required placeholder="Postal Code"
          className="lcf-input"
          value={form.postalCode}
          inputMode="numeric"
          maxLength={4}
          pattern="[0-9]{4}"
          title="Enter a 4-digit Australian postal code."
          onChange={e => setForm(f => ({ ...f, postalCode: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
        />
        <label className="lcf-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
          />
          <span>
            By submitting my details and clicking on the button, I agree to Pristine Gaze Pty Ltd{' '}
            <Link href="/terms-of-use">Terms and Conditions</Link> and{' '}
            <Link href="/privacy-policy">Privacy Policy</Link>. I consent to receive marketing calls from Pristine Gaze Pty. Ltd.
          </span>
        </label>
        <button type="submit" className="lcf-btn" disabled={loading}>
          {loading ? 'Submitting…' : buttonText}
        </button>
      </form>
    </div>
  );
}
