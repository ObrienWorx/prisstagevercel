'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SaleCountdownBanner from '@/components/SaleCountdownBanner';

interface Plan {
  name: string;
  regularPrice: number;
  salePrice: number | null;
  durationValue: number;
  durationType: string;
}

interface Props {
  slug: string;
  plans: Plan[];
  saleEndDate?: string; // ISO string; when set, shows countdown and reverts price on expiry
}

export default function PurchaseCard({ slug, plans, saleEndDate }: Props) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [saleExpired, setSaleExpired] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) { setLoggedIn(false); return; }
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setLoggedIn(d.success))
      .catch(() => setLoggedIn(false));
  }, []);

  // When sale expires client-side, strip all sale prices so regular price shows
  const activePlans = saleExpired
    ? plans.map(pl => ({ ...pl, salePrice: null }))
    : plans;

  const plan = activePlans[selectedIdx] ?? activePlans[0];
  if (!plan) return null;

  const hasMultiplePlans = activePlans.length > 1;
  const price = (plan.salePrice != null ? plan.salePrice : plan.regularPrice).toFixed(2);
  const duration = plan.durationValue ? `${plan.durationValue} ${plan.durationType}` : '';
  const savings = plan.salePrice != null && plan.regularPrice ? (plan.regularPrice - plan.salePrice).toFixed(2) : null;
  const checkoutSlug = hasMultiplePlans ? `${slug}&planIdx=${selectedIdx}` : slug;

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
      {/* Compact countdown — only when sale is active and has an end date */}
      {saleEndDate && !saleExpired && (
        <SaleCountdownBanner
          endDate={saleEndDate}
          onExpired={() => setSaleExpired(true)}
          compact
        />
      )}

      {/* Plan selector dropdown */}
      {hasMultiplePlans && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>Choose your plan</label>
          <select
            value={selectedIdx}
            onChange={e => setSelectedIdx(Number(e.target.value))}
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '0.55rem 0.75rem', fontSize: 14, color: '#0f172a', background: '#f8fafc', cursor: 'pointer', outline: 'none' }}
          >
            {activePlans.map((pl, i) => (
              <option key={i} value={i}>
                {pl.name || `Plan ${i + 1}`} — {pl.durationValue} {pl.durationType}
                {pl.salePrice != null && pl.salePrice < pl.regularPrice
                  ? ` · $${pl.salePrice.toFixed(2)}`
                  : ` · $${pl.regularPrice.toFixed(2)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ fontSize: 13, color: '#64748b', marginBottom: '0.4rem' }}>Get access for</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>${price}</div>
        {plan.salePrice != null && plan.salePrice < plan.regularPrice && (
          <s style={{ fontSize: 16, color: '#94a3b8' }}>${plan.regularPrice.toFixed(2)}</s>
        )}
      </div>
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
            href={`/user/checkout?plan=${checkoutSlug}`}
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
          <Link
            href={`/checkout/guest?plan=${checkoutSlug}`}
            className="btn-subscribe"
            style={{ marginBottom: '0.75rem', display: 'block', textAlign: 'center', textDecoration: 'none', background: '#3b82f6' }}
          >
            Subscribe Now — Pay with PayPal →
          </Link>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', margin: '0.5rem 0', fontWeight: 500 }}>— or —</div>
          <Link href={`/auth/login?plan=${slug}`} className="btn-subscribe outlined" style={{ marginBottom: '0.5rem', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            I already have an account
          </Link>
          <Link href={`/auth/register?plan=${slug}`} style={{ display: 'block', textAlign: 'center', fontSize: 12, color: '#64748b', textDecoration: 'none', marginTop: '0.25rem' }}>
            Create account first
          </Link>
        </>
      )}

      <div style={{ marginTop: '1rem', fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
        Cancel anytime · Instant access · Secure checkout
      </div>
    </div>
  );
}
