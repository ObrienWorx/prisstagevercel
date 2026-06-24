'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import InvoiceModal from '@/components/InvoiceModal';

interface Product { _id: string; name: string; slug: string; featuredImage?: string; durationType: string; durationValue: number; regularPrice: number; salePrice?: number; }
interface OrderRef { _id: string; orderNumber: string; pricePaid: number; sellingPrice?: number; paymentStatus: string; paymentGateway: string; }
interface UserProduct { _id: string; product: Product; order: OrderRef; startDate: string; expiryDate: string; isActive: boolean; createdAt: string; }
interface SubscriberUser { name: string; email: string; phone?: string; }
interface InvProduct { name: string; durationValue?: number; durationType?: string; }
interface OrderItem { product: InvProduct; pricePaid: number; startDate: string; expiryDate: string; durationValue: number; durationType: string; }
interface FullOrder { _id: string; orderNumber: string; pricePaid: number; sellingPrice?: number; purchaseDate: string; paymentStatus: string; orderStatus: string; items: OrderItem[]; product?: InvProduct; expiryDate: string; }

interface OrderGroup {
  orderId: string;
  orderNumber: string;
  pricePaid: number;
  paymentStatus: string;
  paymentGateway: string;
  items: UserProduct[];
  minStartDate: string;
  maxExpiryDate: string;
  maxCreatedAt: string;
  isAnyActive: boolean;
}

function getDaysLeft(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }

const GW_MAP: Record<string, { icon: string; label: string }> = {
  paypal: { icon: '🅿', label: 'PayPal' }, stripe: { icon: '💳', label: 'Stripe' },
  manual: { icon: '🏦', label: 'Manual' }, bank_transfer: { icon: '🏦', label: 'Bank Transfer' }, cod: { icon: '💵', label: 'COD' },
};

export default function SubscriptionsPage() {
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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
      .then(d => {
        if (d.success) {
          setProducts(d.data.products ?? []);
          // Prefer the server's subscriber (localStorage copy can be missing/stale).
          if (d.data.subscriber) setSubscriber({ name: d.data.subscriber.name, email: d.data.subscriber.email, phone: d.data.subscriber.phone });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Group UserProducts by order — one card per order
  const orderGroups = useMemo<OrderGroup[]>(() => {
    const map = new Map<string, OrderGroup>();
    products.forEach(up => {
      const orderId = up.order?._id ?? `solo-${up._id}`;
      if (!map.has(orderId)) {
        map.set(orderId, {
          orderId,
          orderNumber: up.order?.orderNumber ?? '—',
          pricePaid: up.order?.sellingPrice ?? up.order?.pricePaid ?? 0,
          paymentStatus: up.order?.paymentStatus ?? '—',
          paymentGateway: up.order?.paymentGateway ?? '—',
          items: [],
          minStartDate: up.startDate,
          maxExpiryDate: up.expiryDate,
          maxCreatedAt: up.createdAt,
          isAnyActive: false,
        });
      }
      const g = map.get(orderId)!;
      g.items.push(up);
      if (new Date(up.startDate) < new Date(g.minStartDate)) g.minStartDate = up.startDate;
      if (new Date(up.expiryDate) > new Date(g.maxExpiryDate)) g.maxExpiryDate = up.expiryDate;
      if (new Date(up.createdAt) > new Date(g.maxCreatedAt)) g.maxCreatedAt = up.createdAt;
    });
    map.forEach(g => {
      g.isAnyActive = g.items.some(up => up.isActive && getDaysLeft(up.expiryDate) > 0);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.maxCreatedAt).getTime() - new Date(a.maxCreatedAt).getTime()
    );
  }, [products]);

  const toggle = (group: OrderGroup) => {
    const next = new Set(expanded);
    if (next.has(group.orderId)) { next.delete(group.orderId); } else { next.add(group.orderId); }
    setExpanded(next);
  };

  const openInvoice = async (orderId: string) => {
    if (!orderId || orderId.startsWith('solo-')) return;
    setInvoiceLoading(true);
    try {
      const r = await fetch(`/api/subscriber/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setInvoiceOrder(d.data);
    } finally { setInvoiceLoading(false); }
  };

  const filtered = orderGroups.filter(g => {
    if (filter === 'active') return g.isAnyActive;
    if (filter === 'expired') return !g.isAnyActive;
    return true;
  });

  const activeCount = orderGroups.filter(g => g.isAnyActive).length;
  const expiredCount = orderGroups.filter(g => !g.isAnyActive).length;

  // Invoice line items come from the order (items.product + product are populated by the
  // order API), so per-line amounts and names are available — same as the admin invoice.
  const invItems: OrderItem[] = invoiceOrder
    ? (invoiceOrder.items?.length ? invoiceOrder.items : invoiceOrder.product
      ? [{ product: invoiceOrder.product, pricePaid: invoiceOrder.pricePaid, startDate: invoiceOrder.purchaseDate, expiryDate: invoiceOrder.expiryDate, durationValue: invoiceOrder.product.durationValue ?? 0, durationType: invoiceOrder.product.durationType ?? '' }]
      : [])
    : [];
  const invTotal = invoiceOrder?.sellingPrice ?? invoiceOrder?.pricePaid ?? 0;

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div>
      <div className="page-hdr d-flex align-items-flex-start justify-content-between flex-wrap gap-3">
        <div>
          <h4>My Subscriptions</h4>
          <p>{orderGroups.length} order{orderGroups.length !== 1 ? 's' : ''} · {products.length} subscription{products.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/subscribe" className="btn btn-dark btn-sm d-inline-flex align-items-center gap-1">+ Browse Plans</Link>
      </div>

      <div className="filter-tabs">
        {([
          { key: 'all', label: `All (${orderGroups.length})` },
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
          {filtered.map(group => {
            const daysLeft = getDaysLeft(group.maxExpiryDate);
            const isActive = group.isAnyActive;
            const isOpen = expanded.has(group.orderId);
            const gw = GW_MAP[group.paymentGateway?.toLowerCase?.() ?? ''] ?? { icon: '💳', label: group.paymentGateway ?? '—' };
            const firstProduct = group.items[0]?.product;

            return (
              <div key={group.orderId} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

                {/* ── Order row header ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.1rem', flexWrap: 'wrap' }}>
                  {/* Thumbnail */}
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f1f5f9', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {firstProduct?.featuredImage
                      ? <img src={firstProduct.featuredImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 20 }}>📊</span>}
                  </div>

                  {/* Order + product summary */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                      Order <span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>#{group.orderNumber}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.items.map(up => up.product?.name).filter(Boolean).join(' · ')}
                      {group.items.length > 1 && <span style={{ marginLeft: 4, color: '#3b82f6', fontWeight: 600 }}>({group.items.length} plans)</span>}
                    </div>
                  </div>

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
                    onClick={() => openInvoice(group.orderId)}
                    disabled={invoiceLoading}
                  >
                    {invoiceLoading ? <span className="spinner-border spinner-border-sm" /> : '🧾 Invoice'}
                  </button>

                  {/* Expand toggle */}
                  <button
                    onClick={() => toggle(group)}
                    style={{ background: isOpen ? '#eff6ff' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569', flexShrink: 0, transition: 'background 0.15s' }}
                  >
                    {isOpen ? '▲ Hide' : '▼ Details'}
                  </button>
                </div>

                {/* ── Expanded detail ── */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '1.1rem 1.1rem 1.25rem', background: '#fafbfc' }}>

                    {/* Order meta row */}
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.07em' }}>Purchase Date</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{fmtDate(group.minStartDate)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.07em' }}>Payment</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{gw.icon} {gw.label}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.07em' }}>Payment Status</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: group.paymentStatus === 'completed' ? '#16a34a' : '#f59e0b', marginTop: 2, textTransform: 'capitalize' }}>{group.paymentStatus}</div>
                      </div>
                    </div>

                    {/* Products table */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.07em', marginBottom: 8 }}>
                        Subscriptions ({group.items.length})
                      </div>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11 }}>Product</th>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11 }}>Start</th>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11 }}>Expiry</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: 11 }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((up, idx) => {
                              const upDaysLeft = getDaysLeft(up.expiryDate);
                              const upActive = up.isActive && upDaysLeft > 0;
                              return (
                                <tr key={up._id} style={{ borderBottom: idx < group.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                  <td style={{ padding: '10px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      {up.product?.featuredImage
                                        ? <img src={up.product.featuredImage} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                                        : <div style={{ width: 28, height: 28, borderRadius: 4, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>📊</div>}
                                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{up.product?.name ?? '—'}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{fmtDate(up.startDate)}</td>
                                  <td style={{ padding: '10px 12px', color: upActive ? '#0f172a' : '#ef4444', fontWeight: 600 }}>{fmtDate(up.expiryDate)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    {upActive
                                      ? <span className={upDaysLeft <= 7 ? 'badge-expiring' : 'badge-active'} style={{ fontSize: 11 }}>{upDaysLeft <= 7 ? `⚠ ${upDaysLeft}d` : '✓ Active'}</span>
                                      : <span className="badge-expired" style={{ fontSize: 11 }}>Expired</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Invoice Modal ── */}
      {invoiceOrder && (
        <InvoiceModal
          orderNumber={invoiceOrder.orderNumber}
          purchaseDate={invoiceOrder.purchaseDate}
          billTo={{ name: subscriber?.name, email: subscriber?.email, phone: subscriber?.phone }}
          items={invItems.map(it => ({
            name: it.product?.name ?? '—',
            durationValue: it.durationValue,
            durationType: it.durationType,
            startDate: it.startDate,
            expiryDate: it.expiryDate,
            pricePaid: it.pricePaid,
          }))}
          total={invTotal}
          paid={invoiceOrder.paymentStatus === 'completed'}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  );
}
