'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Product { _id: string; name: string; slug: string; featuredImage?: string; durationType: string; durationValue: number; }
interface Order { _id: string; orderNumber: string; pricePaid: number; paymentStatus: string; paymentGateway: string; }
interface UserProduct { _id: string; product: Product; order: Order; startDate: string; expiryDate: string; isActive: boolean; createdAt: string; }
interface DashData { subscriber: { _id: string; name: string; email: string; createdAt: string }; products: UserProduct[]; }

function getDaysLeft(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }

function DashboardContent() {
  const searchParams = useSearchParams();
  const paySuccess = searchParams.get('success');
  const codSuccess = searchParams.get('cod');
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) return;
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  const activeProducts = data?.products.filter(p => p.isActive && getDaysLeft(p.expiryDate) > 0) ?? [];
  const totalSpent = data?.products.reduce((s, p) => s + (p.order?.pricePaid ?? 0), 0) ?? 0;
  const nearestExpiry = activeProducts.length
    ? activeProducts.reduce((m, p) => getDaysLeft(p.expiryDate) < getDaysLeft(m.expiryDate) ? p : m).expiryDate
    : null;

  const firstName = data?.subscriber.name.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const stats = [
    { icon: '📦', label: 'Active Subscriptions', value: activeProducts.length.toString(), bg: '#eff6ff' },
    { icon: '💰', label: 'Total Invested', value: `A$${totalSpent.toFixed(2)}`, bg: '#f0fdf4' },
    { icon: '📅', label: 'Next Expiry', value: nearestExpiry ? `${getDaysLeft(nearestExpiry)}d` : '—', bg: '#fefce8' },
  ];

  const quickLinks = [
    { href: '/user/subscriptions', icon: '📦', label: 'My Subscriptions', sub: 'View & manage packages' },
    { href: '/user/transactions', icon: '💳', label: 'Payment History', sub: 'All your transactions' },
    { href: '/user/profile', icon: '👤', label: 'Edit Profile', sub: 'Update your details' },
    { href: '/subscribe', icon: '🛒', label: 'Browse Plans', sub: 'Add more subscriptions' },
  ];

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

      {/* Welcome banner */}
      <div className="welcome-banner">
        <div className="welcome-banner-bg">🔭</div>
        <div className="welcome-banner-date">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <h2 className="welcome-banner-title">{greeting}, {firstName} 👋</h2>
        <p className="welcome-banner-sub">
          {activeProducts.length > 0
            ? `You have ${activeProducts.length} active subscription${activeProducts.length > 1 ? 's' : ''}. Access your research below.`
            : 'Welcome to PristineGaze. Browse our plans to get started with premium research.'}
        </p>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {stats.map(s => (
          <div className="col-md-4" key={s.label}>
            <div className="dash-stat">
              <div className="dash-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
              <div>
                <div className="dash-stat-value">{s.value}</div>
                <div className="dash-stat-label">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Active subscriptions */}
        <div className="col-lg-7">
          <div className="panel">
            <div className="panel-header d-flex align-items-center justify-content-between">
              <span className="panel-title">Active Subscriptions</span>
              <Link href="/user/subscriptions" className="small fw-semibold text-primary text-decoration-none">View all →</Link>
            </div>
            {activeProducts.length === 0 ? (
              <div className="py-5 text-center p-4">
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <div className="fw-semibold mb-2">No active subscriptions</div>
                <p className="text-muted small mb-3">Start your investment research journey today.</p>
                <Link href="/subscribe" className="btn btn-primary btn-sm">Browse Plans</Link>
              </div>
            ) : (
              activeProducts.slice(0, 5).map(up => {
                const days = getDaysLeft(up.expiryDate);
                return (
                  <div key={up._id} className="d-flex align-items-center gap-3 px-4 py-3 border-bottom">
                    <div className="sub-thumb-sm">
                      {up.product?.featuredImage
                        ? <img src={up.product.featuredImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 16 }}>📊</span>}
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-semibold text-truncate" style={{ fontSize: 13.5, color: '#0f172a' }}>
                        {up.product?.name ?? 'Unknown Product'}
                      </div>
                      <div className="small text-muted">Expires {fmtDate(up.expiryDate)}</div>
                    </div>
                    <span className={days <= 7 ? 'badge-expiring' : 'badge-active'}>
                      {days <= 7 ? `⚠ ${days}d left` : '✓ Active'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick links + research */}
        <div className="col-lg-5 d-flex flex-column gap-3">
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
