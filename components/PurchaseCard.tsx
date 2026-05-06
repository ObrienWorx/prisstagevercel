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
  saleEndDate?: string;
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

  const activePlans = saleExpired ? plans.map(pl => ({ ...pl, salePrice: null })) : plans;
  const plan = activePlans[selectedIdx] ?? activePlans[0];
  if (!plan) return null;

  const hasMultiplePlans = activePlans.length > 1;
  const price        = (plan.salePrice != null ? plan.salePrice : plan.regularPrice).toFixed(2);
  const duration     = plan.durationValue ? `${plan.durationValue} ${plan.durationType}` : '';
  const savings      = plan.salePrice != null && plan.regularPrice ? (plan.regularPrice - plan.salePrice).toFixed(2) : null;
  const checkoutSlug = hasMultiplePlans ? `${slug}&planIdx=${selectedIdx}` : slug;

  return (
    <div className="pc-card">
      {saleEndDate && !saleExpired && (
        <SaleCountdownBanner endDate={saleEndDate} onExpired={() => setSaleExpired(true)} compact />
      )}

      {hasMultiplePlans && (
        <div className="pc-plan-wrap">
          <label className="pc-plan-label">Choose your plan</label>
          <select value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))} className="pc-plan-select">
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

      <div className="pc-access-label">Get access for</div>
      <div className="pc-price-row">
        <div className="pc-price">${price}</div>
        {plan.salePrice != null && plan.salePrice < plan.regularPrice && (
          <s className="pc-strike">${plan.regularPrice.toFixed(2)}</s>
        )}
      </div>
      {duration && <div className="pc-duration">{duration} plan</div>}

      {savings && <div className="pc-savings">You save ${savings}!</div>}

      {loggedIn === null ? (
        <div className="pc-skeleton" />
      ) : loggedIn ? (
        <>
          <div className="pc-logged-badge">
            <span>✓</span> You&apos;re logged in and ready to subscribe
          </div>
          <Link href={`/user/checkout?plan=${checkoutSlug}`} className="btn-subscribe pc-btn-main">
            Proceed to Checkout →
          </Link>
          <Link href="/user/dashboard" className="btn-subscribe outlined pc-btn-outline">
            Go to My Dashboard
          </Link>
        </>
      ) : (
        <>
          <Link href={`/checkout/guest?plan=${checkoutSlug}`} className="btn-subscribe pc-btn-main">
            Subscribe Now — Pay with PayPal →
          </Link>
          <div className="pc-divider">— or —</div>
          <Link href={`/auth/login?plan=${slug}`} className="btn-subscribe outlined pc-btn-outline">
            I already have an account
          </Link>
          <Link href={`/auth/register?plan=${slug}`} className="pc-link-sm">
            Create account first
          </Link>
        </>
      )}

      <div className="pc-footer-note">Cancel anytime · Instant access · Secure checkout</div>
    </div>
  );
}
