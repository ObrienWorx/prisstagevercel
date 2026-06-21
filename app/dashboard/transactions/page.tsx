'use client';

import { useEffect, useState, useCallback } from 'react';
import Pagination from '@/components/Pagination';

const PER_PAGE = 20;

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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [completedTotal, setCompletedTotal] = useState(0);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE), status: filter });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      const r = await fetch(`/api/transactions?${params.toString()}`, { headers: h });
      const text = await r.text();
      if (!text) return;
      const d = JSON.parse(text);
      if (d.success) {
        setItems(d.data);
        setTotal(d.total ?? d.data.length);
        setPages(d.pages ?? 1);
        if (d.statusCounts) setStatusCounts(d.statusCounts);
        if (typeof d.completedTotal === 'number') setCompletedTotal(d.completedTotal);
      }
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally { setLoading(false); }
  }, [page, debouncedSearch, filter]);

  // debounce the search box; reset to page 1 on a new query
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // keep page in range when the result set shrinks
  useEffect(() => { if (page > pages) setPage(pages); }, [pages, page]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text"><h4>Transactions</h4><p>All payment transactions</p></div>
        <div className="d-flex gap-2 align-items-center">
          <span className="fw-semibold text-success">Completed Total: ${completedTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          className="form-control"
          style={{ maxWidth: 360 }}
          placeholder="Search by txn #, order #, subscriber, or product…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {['all', 'completed', 'pending', 'failed', 'refunded'].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setFilter(s); setPage(1); }} style={{ textTransform: 'capitalize' }}>
            {s} {s !== 'all' && <span className="ms-1 badge bg-white text-dark">{statusCounts[s] ?? 0}</span>}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
          : total === 0 ? <div className="empty-state"><div className="empty-icon">{debouncedSearch ? '🔍' : '💳'}</div><p>{debouncedSearch ? `No transactions match “${debouncedSearch}”.` : 'No transactions found.'}</p></div>
          : <div className="table-responsive"><table className="table"><thead><tr><th>TXN #</th><th>Order #</th><th>Subscriber</th><th>Product</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Date</th></tr></thead><tbody>
            {items.map((x) => (<tr key={x._id}>
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

      <Pagination page={page} pages={pages} total={total} onChange={setPage} />
    </div>
  );
}
