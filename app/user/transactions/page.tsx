'use client';

import { useEffect, useState } from 'react';

interface Product { _id: string; name: string; slug: string; featuredImage?: string; }
interface Order { _id: string; orderNumber: string; orderStatus: string; expiryDate: string; }
interface Transaction {
  _id: string; product: Product; order: Order; amount: number; currency: string;
  paymentGateway: string; paymentStatus: string; paymentDate: string; transactionId?: string; notes?: string;
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

  useEffect(() => {
    const token = localStorage.getItem('subscriber_token');
    if (!token) return;
    fetch('/api/subscriber/my-transactions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setTxns(d.data ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = txns.filter(t => t.paymentStatus === 'completed').reduce((s, t) => s + (t.amount ?? 0), 0);

  if (loading) return <div className="page-loading">Loading...</div>;

  const stats = [
    { icon: '💰', label: 'Total Invested', value: `A$${totalSpent.toFixed(2)}`, bg: '#f0fdf4' },
    { icon: '📋', label: 'Total Transactions', value: txns.length.toString(), bg: '#eff6ff' },
    { icon: '✅', label: 'Successful', value: txns.filter(t => t.paymentStatus === 'completed').length.toString(), bg: '#f0fdf4' },
  ];

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
                  {['Date', 'Product', 'Order #', 'Gateway', 'Amount', 'Status'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map(txn => {
                  const gw = GATEWAY_MAP[txn.paymentGateway] ?? { icon: '💳', label: txn.paymentGateway };
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
    </div>
  );
}
