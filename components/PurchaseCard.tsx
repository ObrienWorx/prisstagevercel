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
  saleOffer?: boolean;
}

export default function PurchaseCard({ slug, plans, saleEndDate, saleOffer = false }: Props) {
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
  const saleOfferQuery = saleOffer ? '&saleOffer=1' : '';
  const authPlanSlug = saleOffer ? `${slug}-limited-sale-offer` : slug;

  return (
    <div className="pc-card">

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

      <p>By providing your details and clicking on the button below, you agree to Pristine Gaze Pty. Ltd.&nbsp;<a href="https://pristinegaze.com.au//terms-of-use/">Terms and Conditions</a>&nbsp;and&nbsp;<a href="https://pristinegaze.com.au//privacy-policy/">Privacy Policy</a>. And you consent to receive marketing offers by email, text message or phone call from us or our agents until you opt out. Before you access our services,. I understand and agree that these calls may be made using an auto-dialer. please read the&nbsp;<a href="https://pristinegaze.com.au/financial-services-guide/">Financial Service Guide</a>&nbsp;available here.</p>
      {loggedIn === null ? (
        <div className="pc-skeleton" />
      ) : loggedIn ? (
        <>
          <Link href={`/user/checkout?plan=${checkoutSlug}${saleOfferQuery}`} className="btn-subscribe pc-btn-main">
            Proceed to Checkout →
          </Link>
        </>
      ) : (
        <>
          <Link href={`/checkout/guest?plan=${checkoutSlug}${saleOfferQuery}`} className="btn-subscribe pc-btn-main">
            Subscribe Now — Pay with PayPal →
          </Link>
          <div className="pc-divider">— or —</div>
          <Link href={`/auth/login?plan=${authPlanSlug}`} className="btn-subscribe outlined pc-btn-outline">
            I already have an account
          </Link>
          <Link href={`/auth/register?plan=${authPlanSlug}`} className="pc-link-sm">
            Create account first
          </Link>
        </>
      )}

    </div>
  );
}
