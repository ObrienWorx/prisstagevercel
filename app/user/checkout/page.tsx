'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { effectivePrice as computePrice } from '@/lib/effectivePrice';

interface Product {
  _id: string; name: string; slug: string; regularPrice: number; salePrice?: number;
  saleOverPrice?: number | null;
  saleStartDate?: string; saleEndDate?: string;
  durationType: string; durationValue: number; shortDescription?: string; featuredImage?: string;
}

declare global { interface Window { paypal?: any; } }

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planSlug = searchParams.get('plan') ?? '';
  const saleOffer = searchParams.get('saleOffer') === '1';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [payMethod, setPayMethod] = useState<'paypal' | 'cod'>('paypal');
  const [codLoading, setCodLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const paypalRef = useRef<HTMLDivElement>(null);
  const paypalRendered = useRef(false);
  const createErrRef = useRef('');
  const [token, setToken] = useState('');

  useEffect(() => { setToken(localStorage.getItem('subscriber_token') ?? ''); }, []);

  useEffect(() => {
    if (!planSlug) { router.replace('/subscribe'); return; }
    fetch(`/api/public/products/${planSlug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) setProduct(d.data);
        else router.replace('/subscribe');
      })
      .catch(() => router.replace('/subscribe'))
      .finally(() => setLoading(false));
  }, [planSlug, router]);

  useEffect(() => {
    if (payMethod !== 'paypal' || !product || paypalRendered.current) return;
    if (computePrice(product, saleOffer) <= 0) return;
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) { setErr('PayPal is not configured. Please choose another payment method.'); return; }
    const scriptId = 'paypal-sdk';
    if (document.getElementById(scriptId)) { setPaypalReady(true); renderPayPalButtons(); return; }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=AUD&intent=capture`;
    script.async = true;
    script.onload = () => { setPaypalReady(true); renderPayPalButtons(); };
    script.onerror = () => setErr('Failed to load PayPal. Please try again or use another payment method.');
    document.body.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payMethod, product]);

  function renderPayPalButtons() {
    if (!window.paypal || !paypalRef.current || paypalRendered.current) return;
    paypalRendered.current = true;
    paypalRef.current.innerHTML = '';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' },
      createOrder: async () => {
        setErr('');
        createErrRef.current = '';
        try {
          const res = await fetch('/api/checkout/paypal/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ planSlug, saleOffer }),
          });
          const d = await res.json();
          if (!d.success) {
            const detail = d.error || `Failed to create PayPal order (HTTP ${res.status})`;
            throw new Error(detail);
          }
          return d.data.orderId;
        } catch (e) {
          const detail = e instanceof Error ? e.message : 'Failed to create PayPal order';
          createErrRef.current = detail;
          console.error('PayPal createOrder failed:', e);
          setErr(detail);
          throw e;
        }
      },
      onApprove: async (data: { orderID: string }) => {
        setMsg('Processing payment...');
        const res = await fetch('/api/checkout/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paypalOrderId: data.orderID, planSlug, saleOffer }),
        });
        const d = await res.json();
        if (d.success) { router.push('/user/dashboard?success=1'); }
        else { setErr(d.error || 'Payment failed. Please try again.'); setMsg(''); }
      },
      onError: (e: Error) => {
        console.error('PayPal onError:', e);
        setErr(createErrRef.current || 'PayPal error: ' + (e?.message || 'Something went wrong. Please try again.'));
      },
      onCancel: () => setMsg(''),
    }).render(paypalRef.current);
  }

  const claimFree = async () => {
    setErr(''); setFreeLoading(true);
    try {
      const res = await fetch('/api/checkout/free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planSlug, saleOffer }),
      });
      const d = await res.json();
      if (d.success) router.push('/user/dashboard?success=1');
      else setErr(d.error || 'Failed to activate free access');
    } catch { setErr('Network error. Please try again.'); }
    finally { setFreeLoading(false); }
  };

  const placeCOD = async () => {
    setErr(''); setCodLoading(true);
    try {
      const res = await fetch('/api/checkout/cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planSlug, saleOffer }),
      });
      const d = await res.json();
      if (d.success) router.push('/user/dashboard?cod=1');
      else setErr(d.error || 'Failed to place order');
    } catch { setErr('Network error. Please try again.'); }
    finally { setCodLoading(false); }
  };

  if (loading) return <div className="page-loading">Loading checkout...</div>;
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
  const isFree = effectivePrice <= 0;
  const savings = saleOffer && effectivePrice < product.regularPrice
    ? (product.regularPrice - effectivePrice).toFixed(2) : null;

  return (
    <div>
      <div className="mb-4">
        <Link href={subscribePath} className="small text-muted text-decoration-none">← Back to plan</Link>
        <h4 className="fw-bold mt-2 mb-1" style={{ fontSize: 22, color: '#0f172a' }}>Checkout</h4>
        <p className="text-muted small mb-0">Complete your subscription</p>
      </div>

      <div className="row g-4">
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

            <div className="text-center small text-muted">🔒 Secure checkout · Cancel anytime · Instant access</div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="checkout-panel">
            <div className="checkout-panel-title">{isFree ? 'Free Subscription' : 'Payment Method'}</div>

            {!isFree && (
            <div className="d-flex gap-2 mb-4">
              {([
                { id: 'paypal', icon: '💳', label: 'PayPal' },
                ...(process.env.NEXT_PUBLIC_SHOW_COD === 'true' ? [{ id: 'cod', icon: '💵', label: 'Cash on Delivery' }] : []),
              ] as { id: 'paypal' | 'cod'; icon: string; label: string }[]).map(m => (
                <button
                  key={m.id}
                  onClick={() => { setPayMethod(m.id); setErr(''); if (m.id === 'paypal') paypalRendered.current = false; }}
                  className={`checkout-method-btn ${payMethod === m.id ? 'active' : ''}`}
                >
                  <span style={{ fontSize: 18 }}>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>
            )}

            {err && <div className="alert-inline alert-inline-danger mb-3">{err}</div>}
            {msg && <div className="alert-inline alert-inline-success mb-3">{msg}</div>}

            {isFree && (
              <div>
                <p className="small text-muted mb-3">
                  This subscription is <strong>free</strong> — no payment needed. Click below to activate instant access.
                </p>
                <button onClick={claimFree} disabled={freeLoading} className="checkout-place-btn">
                  {freeLoading ? 'Activating...' : 'Get Free Access'}
                </button>
              </div>
            )}

            {!isFree && payMethod === 'paypal' && (
              <div>
                <p className="small text-muted mb-3">
                  You will be redirected to PayPal to complete your secure payment of <strong>A${price}</strong>.
                </p>
                {!paypalReady && <div className="text-center py-4 text-muted small">⏳ Loading PayPal...</div>}
                <div ref={paypalRef} style={{ minHeight: paypalReady ? 48 : 0 }} />
              </div>
            )}

            {!isFree && payMethod === 'cod' && (
              <div>
                <div className="checkout-cod-box">
                  <div className="checkout-cod-title">📦 Cash on Delivery</div>
                  <ul className="checkout-cod-list">
                    <li>Place your order now, pay when confirmed</li>
                    <li>Our team will contact you to arrange payment</li>
                    <li>Subscription activates after payment confirmation</li>
                    <li>You&apos;ll receive an order confirmation email</li>
                  </ul>
                </div>
                <div className="checkout-total-summary">
                  <strong>Order total: A${price}</strong> · {product.durationValue} {product.durationType} subscription
                </div>
                <button onClick={placeCOD} disabled={codLoading} className="checkout-place-btn">
                  {codLoading ? 'Placing order...' : `Place Order — A$${price}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="page-loading">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
