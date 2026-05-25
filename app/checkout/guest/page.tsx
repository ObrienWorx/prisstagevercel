'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';

interface Product {
  _id: string; name: string; slug: string; regularPrice: number; salePrice?: number;
  saleOverPrice?: number | null;
  saleStartDate?: string; saleEndDate?: string;
  durationType: string; durationValue: number; shortDescription?: string; featuredImage?: string;
}

declare global { interface Window { paypal?: any; } }

function GuestCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planSlug = searchParams.get('plan') ?? '';
  const saleOffer = searchParams.get('saleOffer') === '1';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [paypalReady, setPaypalReady] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState<{ name: string; email: string; isNewAccount: boolean } | null>(null);
  const [savedToken, setSavedToken] = useState('');
  const paypalRef = useRef<HTMLDivElement>(null);
  const paypalRendered = useRef(false);

  useEffect(() => {
    if (!planSlug) { router.replace('/subscribe'); return; }
    fetch('/api/public/products')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const p = d.data.find((x: Product) => x.slug === planSlug);
          if (!p) router.replace('/subscribe');
          else setProduct(p);
        }
      })
      .finally(() => setLoading(false));
  }, [planSlug, router]);

  useEffect(() => {
    if (!product || paypalRendered.current) return;
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) { setErr('PayPal is not configured.'); return; }
    const scriptId = 'paypal-sdk';
    const existing = document.getElementById(scriptId);
    if (existing) { setPaypalReady(true); renderPayPalButtons(); return; }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=AUD&intent=capture`;
    script.async = true;
    script.onload = () => { setPaypalReady(true); renderPayPalButtons(); };
    script.onerror = () => setErr('Failed to load PayPal. Please try again.');
    document.body.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  function renderPayPalButtons() {
    if (!window.paypal || !paypalRef.current || paypalRendered.current) return;
    paypalRendered.current = true;
    paypalRef.current.innerHTML = '';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' },
      createOrder: async () => {
        setErr('');
        const res = await fetch('/api/checkout/guest/paypal/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planSlug, saleOffer }),
        });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || 'Failed to create order');
        return d.data.orderId;
      },
      onApprove: async (data: { orderID: string }) => {
        setMsg('Processing payment...');
        const res = await fetch('/api/checkout/guest/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paypalOrderId: data.orderID, planSlug, saleOffer }),
        });
        const d = await res.json();
        if (d.success) {
          // Save the auto-generated token so the user is logged in
          if (d.data.token) {
            localStorage.setItem('subscriber_token', d.data.token);
            setSavedToken(d.data.token);
          }
          setSuccess({
            name: d.data.subscriber.name,
            email: d.data.subscriber.email,
            isNewAccount: d.data.isNewAccount,
          });
          setMsg('');
        } else {
          setErr(d.error || 'Payment failed. Please try again.');
          setMsg('');
        }
      },
      onError: (e: Error) => setErr('PayPal error: ' + e.message),
      onCancel: () => setMsg(''),
    }).render(paypalRef.current);
  }

  if (loading) return (
    <SiteLayout>
      <div className="page-loading">Loading checkout...</div>
    </SiteLayout>
  );

  if (!product) return null;

  const subscribePath = `/subscribe/${product.slug}${saleOffer ? '-limited-sale-offer' : ''}`;
  const isSaleActive = (() => {
    if (!saleOffer || product.salePrice == null) return false;
    const now = new Date();
    if (product.saleStartDate && new Date(product.saleStartDate) > now) return false;
    if (product.saleEndDate && new Date(product.saleEndDate) < now) return false;
    return true;
  })();
  const isSaleEnded = saleOffer && product.saleEndDate ? new Date(product.saleEndDate) < new Date() : false;
  const effectivePrice = isSaleActive
    ? product.salePrice!
    : isSaleEnded && product.saleOverPrice != null
      ? product.saleOverPrice
      : product.regularPrice;
  const price = effectivePrice.toFixed(2);
  const savings = saleOffer && effectivePrice < product.regularPrice
    ? (product.regularPrice - effectivePrice).toFixed(2) : null;

  if (success) {
    return (
      <SiteLayout>
        <div className="site-section">
          <div className="container">
            <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ fontSize: 64, marginBottom: '1rem' }}>🎉</div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>Payment Successful!</h2>
              <p style={{ fontSize: 15, color: '#475569', marginBottom: '2rem', lineHeight: 1.7 }}>
                Welcome, <strong>{success.name}</strong>! Your subscription to <strong>{product.name}</strong> is now active.
              </p>

              {success.isNewAccount && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '0.5rem', fontSize: 14 }}>
                    ✅ Account Created Automatically
                  </div>
                  <p style={{ fontSize: 13, color: '#3b82f6', margin: 0, lineHeight: 1.6 }}>
                    We created an account using your PayPal email <strong>{success.email}</strong>.
                    Use <strong>Forgot Password</strong> to set your password and access your dashboard.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  href="/user/dashboard"
                  style={{ display: 'block', background: '#3b82f6', color: '#fff', padding: '14px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
                >
                  Go to My Dashboard →
                </Link>
                {success.isNewAccount && (
                  <Link
                    href="/auth/forgot-password"
                    style={{ display: 'block', background: '#f1f5f9', color: '#475569', padding: '12px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
                  >
                    Set My Password
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="site-section">
        <div className="container">
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="mb-4">
              <Link href={subscribePath} className="small text-muted text-decoration-none">← Back to plan</Link>
              <h2 className="fw-bold mt-2 mb-1" style={{ fontSize: 24, color: '#0f172a' }}>Quick Checkout</h2>
              <p className="text-muted small mb-0">Pay with PayPal — no account needed. We&apos;ll set one up for you automatically.</p>
            </div>

            <div className="row g-4">
              {/* Order summary */}
              <div className="col-lg-5">
                <div className="checkout-panel" style={{ position: 'sticky', top: 20 }}>
                  <div className="checkout-panel-title border-bottom pb-3 mb-3">Order Summary</div>
                  <div className="d-flex gap-3 mb-3">
                    <div className="sub-thumb-sm flex-shrink-0">
                      {product.featuredImage
                        ? <img src={product.featuredImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 24 }}>📊</span>}
                    </div>
                    <div>
                      <div className="fw-bold" style={{ fontSize: 15, color: '#0f172a' }}>{product.name}</div>
                      <div className="small text-muted mt-1">{product.durationValue} {product.durationType} subscription</div>
                    </div>
                  </div>

                  <div className="checkout-total-box">
                    {saleOffer && effectivePrice < product.regularPrice && (
                      <div className="checkout-summary-line mb-1">
                        <span className="small text-muted">Regular price</span>
                        <span className="small text-muted text-decoration-line-through">A${product.regularPrice.toFixed(2)}</span>
                      </div>
                    )}
                    {savings && (
                      <div className="checkout-summary-line mb-1">
                        <span className="small text-success">Discount</span>
                        <span className="small text-success">-A${savings}</span>
                      </div>
                    )}
                    <div className="checkout-summary-line mt-2">
                      <span className="fw-bold" style={{ fontSize: 14, color: '#0f172a' }}>Total</span>
                      <span className="fw-black" style={{ fontSize: 24, color: '#0f172a' }}>A${price}</span>
                    </div>
                  </div>

                  <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#15803d', marginTop: '1rem' }}>
                    ✅ Your account is created automatically using your PayPal email — no registration required.
                  </div>

                  <div className="text-center small text-muted mt-3">🔒 Secure checkout · Cancel anytime · Instant access</div>
                </div>
              </div>

              {/* Payment */}
              <div className="col-lg-7">
                <div className="checkout-panel">
                  <div className="checkout-panel-title">Pay with PayPal</div>
                  <p className="small text-muted mb-3">
                    Complete your payment of <strong>A${price}</strong> via PayPal. Your subscription activates instantly.
                  </p>

                  {err && <div className="alert-inline alert-inline-danger mb-3">{err}</div>}
                  {msg && <div className="alert-inline alert-inline-success mb-3">{msg}</div>}

                  {!paypalReady && <div className="text-center py-4 text-muted small">⏳ Loading PayPal...</div>}
                  <div ref={paypalRef} style={{ minHeight: paypalReady ? 48 : 0 }} />

                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 8, fontSize: 12.5, color: '#64748b', lineHeight: 1.6 }}>
                    Already have an account?{' '}
                    <Link href={`/auth/login?plan=${product.slug}${saleOffer ? '-limited-sale-offer' : ''}`} style={{ color: '#3b82f6' }}>Sign in here</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

export default function GuestCheckoutPage() {
  return (
    <Suspense fallback={<SiteLayout><div className="page-loading">Loading...</div></SiteLayout>}>
      <GuestCheckoutContent />
    </Suspense>
  );
}
