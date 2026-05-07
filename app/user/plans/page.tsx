'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Plan { _id: string; name: string; price: number; durationValue: number; durationType: string; }
interface Product {
  _id: string; name: string; slug: string; featuredImage?: string;
  regularPrice: number; salePrice?: number;
  durationValue: number; durationType: string;
  shortDescription?: string; features?: string[];
  plans?: Plan[];
}
interface UserProduct { _id: string; product: { _id: string } | null; expiryDate: string; isActive: boolean; }

function getDaysLeft(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }

export default function PlansPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    Promise.all([
      fetch('/api/public/products').then(r => r.json()),
      token
        ? fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
        : Promise.resolve({ success: false }),
    ]).then(([pRes, meRes]) => {
      if (pRes.success) setProducts(pRes.data);
      if (meRes.success) setUserProducts(meRes.data.products ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  const activeSet = new Set(
    userProducts
      .filter(up => up.isActive && getDaysLeft(up.expiryDate) > 0)
      .map(up => up.product?._id)
      .filter(Boolean) as string[]
  );

  const getSubscription = (productId: string) =>
    userProducts.find(up => up.product?._id === productId && up.isActive && getDaysLeft(up.expiryDate) > 0) ?? null;

  return (
    <div>
      <div className="page-hdr">
        <h4>My Plans</h4>
        <p>All available research plans — your active subscriptions are unlocked</p>
      </div>

      {products.length === 0 ? (
        <div className="empty-panel text-center py-5">
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <div className="fw-bold mb-2">No plans available</div>
          <p className="text-muted">Check back soon for new research packages.</p>
        </div>
      ) : (
        <div className="row g-4">
          {products.map(product => {
            const isUnlocked = activeSet.has(product._id);
            const sub = getSubscription(product._id);
            const daysLeft = sub ? getDaysLeft(sub.expiryDate) : null;
            const price = product.salePrice ?? product.regularPrice;

            return (
              <div className="col-md-6 col-lg-4" key={product._id}>
                <div className={`plan-card ${isUnlocked ? 'plan-card-unlocked' : 'plan-card-locked'}`}>
                  <div className="plan-card-img">
                    {product.featuredImage
                      ? <img src={product.featuredImage} alt={product.name} />
                      : <div className="plan-card-img-placeholder">📊</div>}
                    <div className={`plan-card-badge ${isUnlocked ? 'plan-badge-unlocked' : 'plan-badge-locked'}`}>
                      {isUnlocked ? '🔓 Active' : '🔒 Locked'}
                    </div>
                  </div>

                  <div className="plan-card-body">
                    <h5 className="plan-card-title">{product.name}</h5>
                    {product.shortDescription && (
                      <p className="plan-card-desc">{product.shortDescription}</p>
                    )}

                    <div className="plan-card-meta">
                      <span className="plan-card-price">A${price.toFixed(2)}</span>
                      <span className="plan-card-duration">/ {product.durationValue} {product.durationType}</span>
                    </div>

                    {product.features && product.features.length > 0 && (
                      <ul className="plan-card-features">
                        {product.features.slice(0, 4).map((f, i) => (
                          <li key={i}>✓ {f}</li>
                        ))}
                      </ul>
                    )}

                    {isUnlocked && daysLeft !== null ? (
                      <div className="plan-card-status-bar">
                        <span className={daysLeft <= 7 ? 'badge-expiring' : 'badge-active'}>
                          {daysLeft <= 7 ? `⚠ ${daysLeft} days left` : `✓ Active · ${daysLeft}d remaining`}
                        </span>
                      </div>
                    ) : (
                      <Link href={`/subscribe/${product.slug}`} className="btn btn-primary btn-sm w-100 mt-2">
                        Subscribe →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
