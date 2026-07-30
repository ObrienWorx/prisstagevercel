'use client';

import { useEffect, useState, useCallback } from 'react';
import Pagination from '@/components/Pagination';

const PER_PAGE = 20;

type FilterType = 'all' | 'soon' | 'expired';

interface ExpiringRow {
  _id: string;
  expiryDate: string;
  startDate: string;
  isActive: boolean;
  subscriber: { _id: string; name: string; email: string; phone: string; isActive: boolean };
  product: { _id: string; name: string } | null;
}

export default function AboutToExpirePage() {
  const [items, setItems]     = useState<ExpiringRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter]   = useState<FilterType>('all');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE), filter });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      const r = await fetch(`/api/subscribers/expiring?${params}`, { headers: h });
      const d = await r.json();
      if (d.success) { setItems(d.data); setTotal(d.total ?? d.data.length); setPages(d.pages ?? 1); }
    } finally { setLoading(false); }
  }, [page, filter, debouncedSearch]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { if (page > pages) setPage(pages); }, [pages, page]);

  const now = new Date();

  const daysFromNow = (dateStr: string) => {
    const diff = Math.round((new Date(dateStr).getTime() - now.getTime()) / 86400000);
    return diff;
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'soon',    label: 'Expires Soon' },
    { key: 'expired', label: 'Expired' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h4>About To Expire</h4>
          <p>Subscribers with products expiring within 30 days or already expired</p>
        </div>
      </div>

      <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
        <div className="btn-group">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="form-control"
          style={{ maxWidth: 320 }}
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
        ) : total === 0 ? (
          debouncedSearch
            ? <div className="empty-state"><div className="empty-icon">🔍</div><p>No results match "{debouncedSearch}".</p></div>
            : <div className="empty-state"><div className="empty-icon">✅</div><p>No expiring subscriptions found.</p></div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Product Name</th>
                  <th>Expiry Date</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {items.map(row => {
                  const days = daysFromNow(row.expiryDate);
                  const isExpired = days < 0;
                  return (
                    <tr key={row._id}>
                      <td className="fw-semibold">{row.subscriber.name}</td>
                      <td className="text-muted">{row.subscriber.email}</td>
                      <td className="text-muted">{row.subscriber.phone || '—'}</td>
                      <td>
                        <span className={`badge ${row.subscriber.isActive ? 'bg-success' : 'bg-danger'}`}>
                          {row.subscriber.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{row.product?.name || '—'}</td>
                      <td className="small" style={{ color: isExpired ? '#ef4444' : '#d97706' }}>
                        {fmtDate(row.expiryDate)}
                      </td>
                      <td>
                        {isExpired ? (
                          <span className="badge bg-danger">
                            Expired {Math.abs(days)}d ago
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark">
                            Expires in {days}d
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} pages={pages} total={total} onChange={setPage} />
    </div>
  );
}
