'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Product { _id: string; name: string; slug: string; featuredImage?: string; durationType: string; durationValue: number; regularPrice: number; salePrice?: number; }
interface Order { _id: string; orderNumber: string; pricePaid: number; paymentStatus: string; paymentGateway: string; }
interface UserProduct { _id: string; product: Product; order: Order; startDate: string; expiryDate: string; isActive: boolean; createdAt: string; }
interface ReportItem { _id: string; title: string; slug: string; featuredImage?: string; recommendation?: string; createdAt: string; }
interface SubscriberUser { name: string; email: string; }
interface InvProduct { name: string; durationValue?: number; durationType?: string; }
interface OrderItem { product: InvProduct; pricePaid: number; startDate: string; expiryDate: string; durationValue: number; durationType: string; }
interface FullOrder { _id: string; orderNumber: string; pricePaid: number; purchaseDate: string; paymentStatus: string; orderStatus: string; items: OrderItem[]; product?: InvProduct; expiryDate: string; }

function getDaysLeft(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }

function ProgressBar({ start, end }: { start: string; end: string }) {
  const total = new Date(end).getTime() - new Date(start).getTime();
  const used = Date.now() - new Date(start).getTime();
  const pct = Math.max(0, Math.min(100, (used / total) * 100));
  const color = pct > 85 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#3b82f6';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
        <span>{fmtDate(start)}</span>
        <span style={{ color }}>{(100 - pct).toFixed(0)}% remaining</span>
        <span>{fmtDate(end)}</span>
      </div>
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

const REC_COLOR: Record<string, string> = { BUY: '#16a34a', HOLD: '#d97706', SELL: '#dc2626', 'SPECULATIVE BUY': '#0049AC', REFRAIN: '#64748b' };
const GW_MAP: Record<string, { icon: string; label: string }> = {
  paypal: { icon: '🅿', label: 'PayPal' }, stripe: { icon: '💳', label: 'Stripe' },
  manual: { icon: '🏦', label: 'Manual' }, bank_transfer: { icon: '🏦', label: 'Bank Transfer' }, cod: { icon: '💵', label: 'COD' },
};

export default function SubscriptionsPage() {
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reportsMap, setReportsMap] = useState<Record<string, ReportItem[]>>({});
  const [loadingReports, setLoadingReports] = useState<Set<string>>(new Set());
  const [invoiceOrder, setInvoiceOrder] = useState<FullOrder | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [subscriber, setSubscriber] = useState<SubscriberUser | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('subscriber_token') : '';

  useEffect(() => {
    const raw = localStorage.getItem('subscriber_user');
    if (raw) { try { setSubscriber(JSON.parse(raw)); } catch { /* */ } }
    if (!token) return;
    fetch('/api/subscriber/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data.products ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (up: UserProduct) => {
    const next = new Set(expanded);
    if (next.has(up._id)) { next.delete(up._id); setExpanded(next); return; }
    next.add(up._id); setExpanded(next);
    if (!reportsMap[up._id] && up.product?._id) {
      setLoadingReports(prev => new Set(prev).add(up._id));
      try {
        const r = await fetch(`/api/public/reports?product=${up.product._id}`);
        const d = await r.json();
        if (d.success) setReportsMap(prev => ({ ...prev, [up._id]: d.data }));
      } finally {
        setLoadingReports(prev => { const s = new Set(prev); s.delete(up._id); return s; });
      }
    }
  };

  const openInvoice = async (up: UserProduct) => {
    if (!up.order?._id) return;
    setInvoiceLoading(true);
    try {
      const r = await fetch(`/api/subscriber/orders/${up.order._id}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setInvoiceOrder(d.data);
    } finally { setInvoiceLoading(false); }
  };

  const filtered = products.filter(p => {
    if (filter === 'active') return p.isActive && getDaysLeft(p.expiryDate) > 0;
    if (filter === 'expired') return !p.isActive || getDaysLeft(p.expiryDate) <= 0;
    return true;
  });

  const activeCount = products.filter(p => p.isActive && getDaysLeft(p.expiryDate) > 0).length;
  const expiredCount = products.filter(p => !p.isActive || getDaysLeft(p.expiryDate) <= 0).length;

  const invItems: OrderItem[] = invoiceOrder
    ? (invoiceOrder.items?.length ? invoiceOrder.items : invoiceOrder.product
        ? [{ product: invoiceOrder.product, pricePaid: invoiceOrder.pricePaid, startDate: invoiceOrder.purchaseDate, expiryDate: invoiceOrder.expiryDate, durationValue: invoiceOrder.product.durationValue ?? 0, durationType: invoiceOrder.product.durationType ?? '' }]
        : [])
    : [];
  const invTotal = invoiceOrder?.pricePaid ?? 0;
  const invGst = invTotal / 11;
  const invSub = invTotal - invGst;

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div>
      <div className="page-hdr d-flex align-items-flex-start justify-content-between flex-wrap gap-3">
        <div>
          <h4>My Subscriptions</h4>
          <p>{products.length} total subscription{products.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/subscribe" className="btn btn-dark btn-sm d-inline-flex align-items-center gap-1">+ Browse Plans</Link>
      </div>

      <div className="filter-tabs">
        {([
          { key: 'all', label: `All (${products.length})` },
          { key: 'active', label: `Active (${activeCount})` },
          { key: 'expired', label: `Expired (${expiredCount})` },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`filter-tab ${filter === f.key ? 'active' : ''}`}>{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-panel">
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <div className="fw-bold mb-2" style={{ fontSize: 17, color: '#0f172a' }}>
            {filter === 'all' ? 'No subscriptions yet' : `No ${filter} subscriptions`}
          </div>
          <p className="text-muted mb-4" style={{ maxWidth: 380, margin: '0 auto 24px' }}>Explore our research packages and get exclusive access to market insights.</p>
          <Link href="/subscribe" className="btn btn-primary">View Plans</Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filtered.map(up => {
            const daysLeft = getDaysLeft(up.expiryDate);
            const isActive = up.isActive && daysLeft > 0;
            const isOpen = expanded.has(up._id);
            const gw = GW_MAP[up.order?.paymentGateway?.toLowerCase?.() ?? ''] ?? { icon: '💳', label: up.order?.paymentGateway ?? '—' };
            const reports = reportsMap[up._id] ?? [];
            const loadingRep = loadingReports.has(up._id);

            return (
              <div key={up._id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

                {/* ── Row header ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.1rem', flexWrap: 'wrap' }}>
                  {/* Thumbnail */}
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f1f5f9', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {up.product?.featuredImage
                      ? <img src={up.product.featuredImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 20 }}>📊</span>}
                  </div>

                  {/* Order + product */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                      Order <span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>#{up.order?.orderNumber ?? '—'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                      {up.product?.name ?? 'Unknown Product'} · {up.product?.durationValue} {up.product?.durationType}
                    </div>
                  </div>

                  {/* Amount */}
                  {up.order?.pricePaid != null && (
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', flexShrink: 0 }}>
                      A${up.order.pricePaid.toFixed(2)}
                    </div>
                  )}

                  {/* Status badge */}
                  <div style={{ flexShrink: 0 }}>
                    {isActive
                      ? <span className={daysLeft <= 7 ? 'badge-expiring' : 'badge-active'}>{daysLeft <= 7 ? `⚠ ${daysLeft}d left` : '✓ Active'}</span>
                      : <span className="badge-expired">Expired</span>}
                  </div>

                  {/* Invoice button */}
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    style={{ fontSize: 12, flexShrink: 0 }}
                    onClick={() => openInvoice(up)}
                    disabled={invoiceLoading}
                  >
                    {invoiceLoading ? <span className="spinner-border spinner-border-sm" /> : '🧾 Invoice'}
                  </button>

                  {/* Expand toggle */}
                  <button
                    onClick={() => toggle(up)}
                    style={{ background: isOpen ? '#eff6ff' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569', flexShrink: 0, transition: 'background 0.15s' }}
                  >
                    {isOpen ? '▲ Hide' : '▼ Details'}
                  </button>
                </div>

                {/* ── Expanded details ── */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '1.1rem 1.1rem 1.25rem', background: '#fafbfc' }}>

                    {/* Progress + dates */}
                    <div style={{ marginBottom: '1.1rem' }}>
                      <ProgressBar start={up.startDate} end={up.expiryDate} />
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.07em' }}>Started</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{fmtDate(up.startDate)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.07em' }}>Expires</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#0f172a' : '#dc2626', marginTop: 2 }}>{fmtDate(up.expiryDate)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.07em' }}>Payment</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{gw.icon} {gw.label}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.07em' }}>Status</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: up.order?.paymentStatus === 'completed' ? '#16a34a' : '#f59e0b', marginTop: 2, textTransform: 'capitalize' }}>{up.order?.paymentStatus ?? '—'}</div>
                      </div>
                    </div>

                    {/* Reports section */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.07em', marginBottom: 8 }}>
                        Reports Included {!loadingRep && reports.length > 0 && <span style={{ color: '#3b82f6' }}>({reports.length})</span>}
                      </div>

                      {loadingRep ? (
                        <div style={{ padding: '0.75rem 0', color: '#94a3b8', fontSize: 13 }}>
                          <span className="spinner-border spinner-border-sm me-2" />Loading reports…
                        </div>
                      ) : reports.length === 0 ? (
                        <div style={{ fontSize: 13, color: '#94a3b8', padding: '0.5rem 0' }}>No reports published yet for this subscription.</div>
                      ) : (
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                          {reports.map((r, i) => (
                            <Link
                              key={r._id}
                              href={isActive ? `/reports/${r.slug}` : `/subscribe/${up.product?.slug}`}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', borderBottom: i < reports.length - 1 ? '1px solid #f1f5f9' : 'none', background: '#fff', textDecoration: 'none', transition: 'background 0.12s' }}
                            >
                              {r.featuredImage
                                ? <img src={r.featuredImage} alt="" style={{ width: 34, height: 34, borderRadius: 5, objectFit: 'cover', flexShrink: 0, filter: isActive ? 'none' : 'blur(3px)' }} />
                                : <div style={{ width: 34, height: 34, borderRadius: 5, background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📄</div>}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#0f172a' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', filter: isActive ? 'none' : 'blur(3px)' }}>
                                  {r.title}
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{fmtDate(r.createdAt)}</div>
                              </div>
                              {r.recommendation && (
                                <span style={{ fontSize: 10, fontWeight: 800, color: REC_COLOR[r.recommendation] ?? '#64748b', background: '#f8fafc', border: `1px solid ${REC_COLOR[r.recommendation] ?? '#e2e8f0'}`, borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>
                                  {r.recommendation}
                                </span>
                              )}
                              {isActive
                                ? <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, flexShrink: 0 }}>Read →</span>
                                : <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>🔒</span>}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Renew button */}
                    {!isActive && up.product?.slug && (
                      <div style={{ marginTop: '1rem' }}>
                        <Link href={`/subscribe/${up.product.slug}`} className="btn btn-primary btn-sm">Renew Subscription →</Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Invoice Modal (same as transactions page) ── */}
      {invoiceOrder && (
        <div className="inv-overlay" onClick={() => setInvoiceOrder(null)}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-no-print inv-actions">
              <span className="text-muted small">Invoice {invoiceOrder.orderNumber}</span>
              <div className="d-flex gap-2">
                <button className="btn btn-dark btn-sm" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setInvoiceOrder(null)}>✕ Close</button>
              </div>
            </div>
            <div className="inv-doc">
              <div className="inv-hdr">
                <div className="inv-brand">
                  <img src="/logo2.png" alt="PristineGaze" className="inv-brand-logo w-100" />
                </div>
                <div className="inv-title-block">
                  <div className="inv-title">TAX INVOICE</div>
                  <div className="inv-meta-row"><span>Invoice #</span><strong>{invoiceOrder.orderNumber}</strong></div>
                  <div className="inv-meta-row"><span>Date</span><strong>{fmtDate(invoiceOrder.purchaseDate)}</strong></div>
                </div>
              </div>
              <div className="inv-divider" />
              <div className="inv-parties">
                <div>
                  <div className="inv-section-label">BILL TO</div>
                  <div className="inv-party-name">{subscriber?.name ?? '—'}</div>
                  <div className="inv-party-detail">{subscriber?.email ?? '—'}</div>
                </div>
                <div className="text-end">
                  <div className="inv-section-label">FROM</div>
                  <div className="inv-party-name">PristineGaze Pty Ltd</div>
                  <div className="inv-party-detail">470 St Kilda Rd, Melbourne VIC 3004</div>
                  <div className="inv-party-detail">support@pristinegaze.com.au</div>
                </div>
              </div>
              <div className="inv-divider" />
              <table className="inv-table">
                <thead>
                  <tr><th>Description</th><th>Duration</th><th>Period</th><th className="text-end">Amount (AUD)</th></tr>
                </thead>
                <tbody>
                  {invItems.map((item, i) => (
                    <tr key={i}>
                      <td>{item.product?.name ?? '—'}</td>
                      <td>{item.durationValue} {item.durationType}</td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(item.startDate)} – {fmtDate(item.expiryDate)}</td>
                      <td className="text-end">A${(item.pricePaid - item.pricePaid / 11).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="inv-totals">
                <div className="inv-total-row"><span>Subtotal (excl. GST)</span><span>A${invSub.toFixed(2)}</span></div>
                <div className="inv-total-row"><span>GST (10%)</span><span>A${invGst.toFixed(2)}</span></div>
                <div className="inv-total-row inv-grand-total"><span>Total</span><span>A${invTotal.toFixed(2)}</span></div>
              </div>
              {invoiceOrder.paymentStatus === 'completed' && <div className="inv-paid-stamp">PAID</div>}
              <div className="inv-divider" style={{ marginTop: 32 }} />
              <div className="inv-footer">
                <p>Thank you for your subscription. This is a computer-generated document and does not require a signature.</p>
                <p>PristineGaze Pty Ltd &nbsp;|&nbsp; ABN: XX XXX XXX XXX &nbsp;|&nbsp; support@pristinegaze.com.au</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
