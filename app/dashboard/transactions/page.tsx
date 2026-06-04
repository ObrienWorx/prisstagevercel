'use client';

import { useEffect, useState, useCallback } from 'react';

interface Txn {
  _id: string; transactionNumber: string;
  order: { orderNumber: string } | null;
  subscriber: { name: string; email: string } | null;
  product: { name: string } | null;
  amount: number; paymentGateway: string;
  paymentStatus: string; paymentDate: string;
}

const STATUS_COLORS: Record<string, string> = { completed: 'bg-success', pending: 'bg-warning text-dark', failed: 'bg-danger', refunded: 'bg-secondary' };

export default function TransactionsPage() {
  const [items, setItems] = useState<Txn[]>([]); const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/transactions', { headers: h });
      const text = await r.text();
      if (!text) return;
      const d = JSON.parse(text);
      if (d.success) setItems(d.data);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  const filtered = filter === 'all' ? items : items.filter(x => x.paymentStatus === filter);

  const total = filtered.filter(x => x.paymentStatus === 'completed').reduce((sum, x) => sum + x.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text"><h4>Transactions</h4><p>All payment transactions</p></div>
        <div className="d-flex gap-2 align-items-center">
          <span className="fw-semibold text-success">Total: ${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {['all', 'completed', 'pending', 'failed', 'refunded'].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilter(s)} style={{ textTransform: 'capitalize' }}>
            {s} {s !== 'all' && <span className="ms-1 badge bg-white text-dark">{items.filter(x => x.paymentStatus === s).length}</span>}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
          : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon">💳</div><p>No transactions found.</p></div>
          : <div className="table-responsive"><table className="table"><thead><tr><th>TXN #</th><th>Order #</th><th>Subscriber</th><th>Product</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Date</th></tr></thead><tbody>
            {filtered.map((x) => (<tr key={x._id}>
              <td><span className="fw-semibold" style={{ color: 'var(--primary)', fontSize: 12 }}>{x.transactionNumber}</span></td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>{x.order?.orderNumber || '—'}</td>
              <td><div style={{ fontSize: 13 }} className="fw-semibold">{x.subscriber?.name || '(deleted)'}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{x.subscriber?.email || ''}</div></td>
              <td style={{ fontSize: 13 }}>{x.product?.name || '(deleted)'}</td>
              <td className="fw-semibold" style={{ color: '#059669' }}>${x.amount.toFixed(2)}</td>
              <td><span className="badge bg-light text-dark border" style={{ fontSize: 11 }}>{x.paymentGateway}</span></td>
              <td><span className={`badge ${STATUS_COLORS[x.paymentStatus] || 'bg-secondary'}`}>{x.paymentStatus}</span></td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(x.paymentDate)}</td>
            </tr>))}
          </tbody></table></div>}
      </div>
    </div>
  );
}
