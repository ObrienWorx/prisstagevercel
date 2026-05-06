'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  badge?: string;
  title?: string;
  buttonText?: string;
  source?: string;
}

export default function LeadCaptureForm({
  badge = 'Pristine Gaze',
  title = 'Grab Your FREE Report on Top 5 ASX Stocks to Buy in 2026',
  buttonText = 'Grab your free report',
  source = 'general',
}: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', postalCode: '' });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setError('Please accept the terms to continue.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, consent, source }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
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
          <div className="lcf-success-sub">We&apos;ll be in touch with your free report shortly.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="lcf-card">
      <div className="lcf-badge">{badge}</div>
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
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <input
          type="text" required placeholder="Postal Code"
          className="lcf-input"
          value={form.postalCode}
          onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
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
