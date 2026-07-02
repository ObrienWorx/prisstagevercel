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
  memberSale?: boolean;
}

export default function PurchaseCard({ slug, plans, saleEndDate, saleOffer = false, memberSale = false }: Props) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [hasMembership, setHasMembership] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [saleExpired, setSaleExpired] = useState(false);
  const [showMemberGate, setShowMemberGate] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) { setLoggedIn(false); return; }
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setLoggedIn(d.success);
        if (d.success && Array.isArray(d.data?.products)) {
          setHasMembership(d.data.products.length > 0);
        }
      })
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

  /* Member-sale guard: true when the product is member-only AND user is either
     not logged in or logged in but has no active subscription */
  const isMemberGated = memberSale && (!loggedIn || !hasMembership);

  const handleGatedClick = (e: React.MouseEvent) => {
    if (isMemberGated) {
      e.preventDefault();
      setShowMemberGate(true);
    }
  };

  return (
    <>
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

        <p>By providing your details and clicking on the button below, you agree to Pristine Gaze Pty. Ltd.&nbsp;<a href="https://pristinegaze.com.au//terms-of-use/">Terms and Conditions</a>&nbsp;and&nbsp;<a href="https://pristinegaze.com.au//privacy-policy/">Privacy Policy</a>. And you consent to receive marketing offers by email, text message or phone call from us or our agents until you opt out. Before you access our services. I understand and agree that these calls may be made using an auto-dialer. please read the&nbsp;<a href="https://pristinegaze.com.au/financial-services-guide/">Financial Service Guide</a>&nbsp;available here.</p>

        {loggedIn === null ? (
          <div className="pc-skeleton" />
        ) : loggedIn ? (
          <>
            <Link
              href={`/user/checkout?plan=${checkoutSlug}${saleOfferQuery}`}
              className="btn-subscribe pc-btn-main"
              onClick={handleGatedClick}
            >
              Proceed to Checkout →
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/checkout/guest?plan=${checkoutSlug}${saleOfferQuery}`}
              className="btn-subscribe pc-btn-main"
              onClick={handleGatedClick}
            >
              Subscribe Now — Pay with PayPal →
            </Link>
            <div className="pc-divider">— or —</div>
            <Link href={`/member-account?plan=${authPlanSlug}`} className="btn-subscribe outlined pc-btn-outline">
              I already have an account
            </Link>
            <Link href={`/auth/register?plan=${authPlanSlug}`} className="pc-link-sm">
              Create account first
            </Link>
          </>
        )}

      </div>

      {/* Member-only sale popup */}
      {showMemberGate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setShowMemberGate(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 18, padding: '2.5rem 2rem', maxWidth: 480, width: '100%', textAlign: 'center', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowMemberGate(false)}
              style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}
              aria-label="Close"
            >×</button>

            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
              Exclusive Member&apos;s Only Sale
            </h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.75rem' }}>
              This is an Exclusive Member&apos;s Only Sale. You need to be a member with us to access this special offer. Click the button below to explore our latest research reports.
            </p>
            <Link
              href="/subscribe"
              className="btn btn-primary btn-lg px-5"
              style={{ borderRadius: 8, fontWeight: 700 }}
            >
              Explore Membership Plans
            </Link>
            <div style={{ marginTop: '1rem' }}>
              <button type="button" onClick={() => setShowMemberGate(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
