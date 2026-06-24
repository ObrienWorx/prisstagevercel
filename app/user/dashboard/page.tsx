'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Product { _id: string; name: string; slug: string; featuredImage?: string; durationType: string; durationValue: number; regularPrice: number; salePrice?: number; }
interface Order { _id: string; orderNumber: string; pricePaid: number; paymentStatus: string; paymentGateway: string; }
interface UserProduct { _id: string; product: Product; order: Order; startDate: string; expiryDate: string; isActive: boolean; createdAt: string; }
interface DashData { subscriber: { _id: string; name: string; email: string; createdAt: string }; products: UserProduct[]; reportCount: number; }

function getDaysLeft(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }

function DashboardContent() {
  const searchParams = useSearchParams();
  const paySuccess = searchParams.get('success');
  const codSuccess = searchParams.get('cod');
  const [data, setData] = useState<DashData | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    Promise.all([
      token
        ? fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
        : Promise.resolve({ success: false }),
      fetch('/api/public/products').then(r => r.json()),
    ]).then(([meRes, prodRes]) => {
      if (meRes.success) setData(meRes.data);
      if (prodRes.success) setAllProducts(prodRes.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  const activeProducts = data?.products.filter(p => p.isActive && getDaysLeft(p.expiryDate) > 0) ?? [];

  const quickLinks = [
    { href: '/user/subscriptions', icon: '📦', label: 'My Subscriptions', sub: 'View & manage packages' },
    { href: '/user/profile', icon: '👤', label: 'Edit Profile', sub: 'Update your details' },
  ];

  // Mark which products are already active for the subscriber
  const activeProductIds = new Set(activeProducts.map(up => up.product?._id).filter(Boolean));

  // Show unlocked (active) products first, preserving original order within each group.
  const sortedProducts = [...allProducts].sort((a, b) => {
    const aUnlocked = activeProductIds.has(a._id) ? 0 : 1;
    const bUnlocked = activeProductIds.has(b._id) ? 0 : 1;
    return aUnlocked - bUnlocked;
  });

  return (
    <div>
      {paySuccess && (
        <div className="alert-inline alert-inline-success d-flex align-items-center gap-2 mb-3">
          <span style={{ fontSize: 20 }}>🎉</span>
          <span>Payment successful! Your subscription is now active. Welcome aboard!</span>
        </div>
      )}
      {codSuccess && (
        <div className="alert-inline" style={{ background: '#fefce8', color: '#92400e', border: '1px solid #fde68a' }}>
          <span style={{ fontSize: 20 }}>📦</span>{' '}
          Order placed! Your subscription activates after payment is confirmed by our team.
        </div>
      )}
      <div className="row g-4">
        <div className="col-lg-8">
          {allProducts.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              {sortedProducts.map(p => {
                const unlocked = activeProductIds.has(p._id);
                return (
                  <Link
                    key={p._id}
                    href={unlocked ? `/reports/${p.slug}` : `/subscribe/${p.slug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s' }}>
                      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: '#f1f5f9' }}>
                        {p.featuredImage
                          ? <img src={p.featuredImage} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: unlocked ? 'none' : 'grayscale(0.2) brightness(0.75)' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: '#e2e8f0' }}>📊</div>}
                        {!unlocked && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,30,30,0.38)' }}>
                            <span style={{ fontSize: 32 }}>🔒</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8', lineHeight: 1.35, textAlign: 'center' }}>{p.name}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="col-lg-4 d-flex flex-column gap-3">
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Quick Access</span></div>
            <div className="p-3 d-flex flex-column gap-2">
              {quickLinks.map(item => (
                <Link key={item.href} href={item.href} className="quick-link">
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <div>
                    <div className="quick-link-title">{item.label}</div>
                    <div className="quick-link-sub">{item.sub}</div>
                  </div>
                  <span className="ms-auto text-muted">›</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="research-promo">
            <div style={{ fontSize: 16, marginBottom: 6 }}>📈</div>
            <div className="research-promo-title">Research &amp; Videos</div>
            <p className="research-promo-sub">Watch our latest market analysis and investment insights.</p>
            <Link href="/videos" className="btn btn-primary btn-sm">Watch Videos →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <Suspense fallback={<div className="page-loading">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
