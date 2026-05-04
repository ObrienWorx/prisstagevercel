'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Product { _id: string; name: string; slug: string; featuredImage?: string; durationType: string; durationValue: number; regularPrice: number; salePrice?: number; }
interface Order { _id: string; orderNumber: string; pricePaid: number; paymentStatus: string; paymentGateway: string; }
interface UserProduct { _id: string; product: Product; order: Order; startDate: string; expiryDate: string; isActive: boolean; createdAt: string; }

function getDaysLeft(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }

function ProgressBar({ start, end }: { start: string; end: string }) {
  const total = new Date(end).getTime() - new Date(start).getTime();
  const used = Date.now() - new Date(start).getTime();
  const pct = Math.max(0, Math.min(100, (used / total) * 100));
  const fillClass = pct > 85 ? 'progress-fill-red' : pct > 70 ? 'progress-fill-amber' : 'progress-fill-blue';
  return (
    <div>
      <div className="progress-meta">
        <span>Started {fmtDate(start)}</span>
        <span>{(100 - pct).toFixed(0)}% remaining</span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) return;
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data.products ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p => {
    if (filter === 'active') return p.isActive && getDaysLeft(p.expiryDate) > 0;
    if (filter === 'expired') return !p.isActive || getDaysLeft(p.expiryDate) <= 0;
    return true;
  });

  if (loading) return <div className="page-loading">Loading...</div>;

  const activeCount = products.filter(p => p.isActive && getDaysLeft(p.expiryDate) > 0).length;
  const expiredCount = products.filter(p => !p.isActive || getDaysLeft(p.expiryDate) <= 0).length;

  return (
    <div>
      <div className="page-hdr d-flex align-items-flex-start justify-content-between flex-wrap gap-3">
        <div>
          <h4>My Subscriptions</h4>
          <p>{products.length} total subscription{products.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/subscribe" className="btn btn-dark btn-sm d-inline-flex align-items-center gap-1">
          + Browse Plans
        </Link>
      </div>

      <div className="filter-tabs">
        {([
          { key: 'all', label: `All (${products.length})` },
          { key: 'active', label: `Active (${activeCount})` },
          { key: 'expired', label: `Expired (${expiredCount})` },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`filter-tab ${filter === f.key ? 'active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-panel">
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <div className="fw-bold mb-2" style={{ fontSize: 17, color: '#0f172a' }}>
            {filter === 'all' ? 'No subscriptions yet' : `No ${filter} subscriptions`}
          </div>
          <p className="text-muted mb-4" style={{ maxWidth: 380, margin: '0 auto 24px' }}>
            Explore our research packages and get exclusive access to market insights.
          </p>
          <Link href="/subscribe" className="btn btn-primary">View Plans</Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filtered.map(up => {
            const daysLeft = getDaysLeft(up.expiryDate);
            const isActive = up.isActive && daysLeft > 0;
            const accentClass = isActive ? (daysLeft <= 7 ? 'sub-accent-expiring' : 'sub-accent-active') : 'sub-accent-expired';
            return (
              <div key={up._id} className={`sub-item ${!isActive ? 'expired' : ''}`}>
                <div className="sub-item-inner">
                  <div className={`sub-accent ${accentClass}`} />
                  <div className="sub-item-body">
                    <div className="d-flex align-items-flex-start gap-3 mb-3">
                      <div className="sub-thumb">
                        {up.product?.featuredImage
                          ? <img src={up.product.featuredImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 24 }}>📊</span>}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-flex-start justify-content-between flex-wrap gap-2">
                          <div>
                            <h3 className="fw-bold mb-1" style={{ fontSize: 17, color: '#0f172a' }}>
                              {up.product?.name ?? 'Unknown Product'}
                            </h3>
                            <div className="small text-muted">
                              {up.product?.durationValue} {up.product?.durationType} subscription
                              {up.order?.orderNumber && ` · Order #${up.order.orderNumber}`}
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            {isActive
                              ? <span className={daysLeft <= 7 ? 'badge-expiring' : 'badge-active'}>{daysLeft <= 7 ? `⚠ ${daysLeft}d left` : '✓ Active'}</span>
                              : <span className="badge-expired">Expired</span>
                            }
                            {up.order?.pricePaid && (
                              <span className="fw-bold" style={{ fontSize: 14, color: '#0f172a' }}>A${up.order.pricePaid.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <ProgressBar start={up.startDate} end={up.expiryDate} />
                    </div>

                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div className="d-flex gap-4">
                        <div>
                          <div className="meta-label">Started</div>
                          <div className="meta-value">{fmtDate(up.startDate)}</div>
                        </div>
                        <div>
                          <div className="meta-label">Expires</div>
                          <div className="meta-value" style={{ color: isActive ? '#374151' : '#dc2626' }}>{fmtDate(up.expiryDate)}</div>
                        </div>
                        {up.order?.paymentGateway && (
                          <div>
                            <div className="meta-label">Payment</div>
                            <div className="meta-value text-capitalize">{up.order.paymentGateway}</div>
                          </div>
                        )}
                      </div>
                      {!isActive && up.product?.slug && (
                        <Link href={`/subscribe/${up.product.slug}`} className="btn btn-primary btn-sm">Renew →</Link>
                      )}
                    </div>
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
