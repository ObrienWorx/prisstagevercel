'use client';

import { useEffect, useState } from 'react';

interface Product { _id: string; name: string; slug: string; featuredImage?: string; durationValue?: number; durationType?: string; }
interface OrderRef { _id: string; orderNumber: string; orderStatus: string; expiryDate: string; purchaseDate?: string; pricePaid?: number; }
interface Transaction {
  _id: string; transactionNumber?: string; product: Product; order: OrderRef; amount: number; currency: string;
  paymentGateway: string; paymentStatus: string; paymentDate: string; transactionId?: string; notes?: string;
}
interface SubscriberUser { name: string; email: string; }
interface OrderItem { product: { name: string; durationValue?: number; durationType?: string }; pricePaid: number; startDate: string; expiryDate: string; durationValue: number; durationType: string; }
interface FullOrder {
  _id: string; orderNumber: string; pricePaid: number; purchaseDate: string;
  paymentStatus: string; orderStatus: string;
  items: OrderItem[];
  product?: { name: string; durationValue?: number; durationType?: string };
  expiryDate: string;
}

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }); }

const BADGE_MAP: Record<string, string> = {
  completed: 'badge-payment badge-payment-completed',
  pending: 'badge-payment badge-payment-pending',
  failed: 'badge-payment badge-payment-failed',
  refunded: 'badge-payment badge-payment-refunded',
};
const BADGE_LABEL: Record<string, string> = {
  completed: 'Completed', pending: 'Pending', failed: 'Failed', refunded: 'Refunded',
};
const GATEWAY_MAP: Record<string, { icon: string; label: string }> = {
  stripe: { icon: '💳', label: 'Stripe' },
  paypal: { icon: '🅿', label: 'PayPal' },
  manual: { icon: '🏦', label: 'Manual' },
  bank_transfer: { icon: '🏦', label: 'Bank Transfer' },
  cod: { icon: '💵', label: 'Cash on Delivery' },
};

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceOrder, setInvoiceOrder] = useState<FullOrder | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [subscriber, setSubscriber] = useState<SubscriberUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('subscriber_user');
    if (raw) { try { setSubscriber(JSON.parse(raw)); } catch { /* ignore */ } }
    const token = localStorage.getItem('subscriber_token');
    if (!token) return;
    fetch('/api/subscriber/my-transactions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setTxns(d.data ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const openInvoice = async (txn: Transaction) => {
    if (!txn.order?._id) return;
    setInvoiceLoading(true);
    const token = localStorage.getItem('subscriber_token');
    try {
      const r = await fetch(`/api/subscriber/orders/${txn.order._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) setInvoiceOrder(d.data);
    } finally { setInvoiceLoading(false); }
  };

  const totalSpent = txns.filter(t => t.paymentStatus === 'completed').reduce((s, t) => s + (t.amount ?? 0), 0);

  if (loading) return <div className="page-loading">Loading...</div>;

  const stats = [
    { icon: '💰', label: 'Total Invested', value: `A$${totalSpent.toFixed(2)}`, bg: '#f0fdf4' },
    { icon: '📋', label: 'Total Transactions', value: txns.length.toString(), bg: '#eff6ff' },
    { icon: '✅', label: 'Successful', value: txns.filter(t => t.paymentStatus === 'completed').length.toString(), bg: '#f0fdf4' },
  ];

  const invItems: OrderItem[] = invoiceOrder
    ? (invoiceOrder.items?.length
        ? invoiceOrder.items
        : invoiceOrder.product
          ? [{ product: invoiceOrder.product, pricePaid: invoiceOrder.pricePaid, startDate: invoiceOrder.purchaseDate, expiryDate: invoiceOrder.expiryDate, durationValue: invoiceOrder.product.durationValue ?? 0, durationType: invoiceOrder.product.durationType ?? '' }]
          : [])
    : [];

  const invTotal = invoiceOrder?.pricePaid ?? 0;
  const invGst = invTotal / 11;
  const invSub = invTotal - invGst;

  return (
    <div>
      <div className="page-hdr">
        <h4>Transaction History</h4>
        <p>All your payment records in one place</p>
      </div>

      {txns.length > 0 && (
        <div className="row g-3 mb-4">
          {stats.map(s => (
            <div className="col-md-4" key={s.label}>
              <div className="stat-box">
                <div className="stat-box-icon" style={{ background: s.bg }}>{s.icon}</div>
                <div>
                  <div className="stat-box-value">{s.value}</div>
                  <div className="stat-box-label">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {txns.length === 0 ? (
        <div className="empty-panel">
          <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
          <div className="fw-bold mb-2" style={{ fontSize: 17, color: '#0f172a' }}>No transactions yet</div>
          <p className="text-muted mb-0">Your payment history will appear here after your first subscription.</p>
        </div>
      ) : (
        <div className="panel">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  {['Date', 'Product', 'Order #', 'Gateway', 'Amount', 'Status', ''].map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map(txn => {
                  const gw = GATEWAY_MAP[txn.paymentGateway?.toLowerCase?.()] ?? { icon: '💳', label: txn.paymentGateway };
                  const badgeClass = BADGE_MAP[txn.paymentStatus] ?? 'badge-payment badge-payment-refunded';
                  const badgeLabel = BADGE_LABEL[txn.paymentStatus] ?? txn.paymentStatus;
                  return (
                    <tr key={txn._id}>
                      <td>
                        <div className="fw-semibold" style={{ fontSize: 13.5, color: '#0f172a' }}>{fmtDate(txn.paymentDate)}</div>
                        <div className="small text-muted">{fmtTime(txn.paymentDate)}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="sub-thumb-xs">
                            {txn.product?.featuredImage
                              ? <img src={txn.product.featuredImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: 14 }}>📊</span>}
                          </div>
                          <span className="fw-semibold text-truncate" style={{ fontSize: 13, color: '#0f172a', maxWidth: 180 }}>
                            {txn.product?.name ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="order-ref">{txn.order?.orderNumber ?? '—'}</span>
                      </td>
                      <td>
                        <span className="d-inline-flex align-items-center gap-1 small">
                          <span>{gw.icon}</span> {gw.label}
                        </span>
                      </td>
                      <td>
                        <div className="fw-bold" style={{ fontSize: 15, color: '#0f172a' }}>A${(txn.amount ?? 0).toFixed(2)}</div>
                        <div className="small text-muted">{txn.currency?.toUpperCase() || 'AUD'}</div>
                      </td>
                      <td>
                        <span className={badgeClass}>{badgeLabel}</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          style={{ fontSize: 12 }}
                          onClick={() => openInvoice(txn)}
                          disabled={invoiceLoading}
                        >
                          {invoiceLoading ? <span className="spinner-border spinner-border-sm" /> : '🧾 Invoice'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {txns.length > 0 && (
        <div className="text-end mt-2 small text-muted">
          Showing {txns.length} transaction{txns.length !== 1 ? 's' : ''}
        </div>
      )}

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
                  <img src="/logo.png" alt="PristineGaze" className="inv-brand-logo" />
                  <span className="inv-brand-name">PristineGaze</span>
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
                  <tr>
                    <th>Description</th>
                    <th>Duration</th>
                    <th>Period</th>
                    <th className="text-end">Amount (AUD)</th>
                  </tr>
                </thead>
                <tbody>
                  {invItems.map((item, i) => {
                    const itemSub = item.pricePaid - (item.pricePaid / 11);
                    return (
                      <tr key={i}>
                        <td>{item.product?.name ?? '—'}</td>
                        <td>{item.durationValue} {item.durationType}</td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>
                          {fmtDate(item.startDate)} – {fmtDate(item.expiryDate)}
                        </td>
                        <td className="text-end">A${itemSub.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="inv-totals">
                <div className="inv-total-row">
                  <span>Subtotal (excl. GST)</span><span>A${invSub.toFixed(2)}</span>
                </div>
                <div className="inv-total-row">
                  <span>GST (10%)</span><span>A${invGst.toFixed(2)}</span>
                </div>
                <div className="inv-total-row inv-grand-total">
                  <span>Total</span><span>A${invTotal.toFixed(2)}</span>
                </div>
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
