'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Props {
  slug: string;
  price: string;
  duration: string;
  regularPrice?: number;
  salePrice?: number;
}

export default function PurchaseCard({ slug, price, duration, regularPrice, salePrice }: Props) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) { setLoggedIn(false); return; }
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setLoggedIn(d.success))
      .catch(() => setLoggedIn(false));
  }, []);

  const savings = salePrice != null && regularPrice ? (regularPrice - salePrice).toFixed(2) : null;

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: '0.4rem' }}>Get access for</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>${price}</div>
      {duration && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, marginBottom: '1.5rem' }}>{duration} plan</div>}

      {savings && (
        <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: '1rem' }}>
          You save ${savings}!
        </div>
      )}

      {loggedIn === null ? (
        <div style={{ height: 48, background: '#f1f5f9', borderRadius: 10, marginBottom: '0.75rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : loggedIn ? (
        <>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#15803d', fontWeight: 500, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✓</span> You&apos;re logged in and ready to subscribe
          </div>
          <Link
            href={`/user/checkout?plan=${slug}`}
            className="btn-subscribe"
            style={{ marginBottom: '0.75rem', display: 'block', textAlign: 'center', textDecoration: 'none', background: '#3b82f6' }}
          >
            Proceed to Checkout →
          </Link>
          <Link href="/user/dashboard" className="btn-subscribe outlined" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Go to My Dashboard
          </Link>
        </>
      ) : (
        <>
          <Link href={`/auth/register?plan=${slug}`} className="btn-subscribe" style={{ marginBottom: '0.75rem', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Subscribe Now →
          </Link>
          <Link href={`/auth/login?plan=${slug}`} className="btn-subscribe outlined" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            I already have an account
          </Link>
        </>
      )}

      <div style={{ marginTop: '1rem', fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
        Cancel anytime · Instant access · Secure checkout
      </div>
    </div>
  );
}
