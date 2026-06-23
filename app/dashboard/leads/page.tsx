'use client';

import { useEffect, useState } from 'react';

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  source: string;
  createdAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLeads = (p: number, q = search) => {
    setLoading(true);
    const token = localStorage.getItem('token') ?? '';
    fetch(`/api/leads?page=${p}&search=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setLeads(d.data.leads);
          setTotal(d.data.total);
          setPages(d.data.pages);
          setPage(d.data.page);
        }
      })
      .finally(() => setLoading(false));
  };

  // Debounce search; reset to page 1 on each query change.
  useEffect(() => {
    const t = setTimeout(() => fetchLeads(1, search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 gap-3 flex-wrap">
        <div>
          <h4 className="mb-1">Lead Submissions</h4>
          <p className="text-muted mb-0 small">{total} total submission{total !== 1 ? 's' : ''}</p>
        </div>
        <input
          type="search"
          className="form-control"
          style={{ maxWidth: 320 }}
          placeholder="Search name, email, phone or source…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : leads.length === 0 ? (
        <div className="text-center py-5 text-muted">No lead submissions yet.</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Postal Code</th>
                  <th>Source</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead._id}>
                    <td className="text-muted small">{(page - 1) * 20 + i + 1}</td>
                    <td><strong>{lead.name}</strong></td>
                    <td><a href={`mailto:${lead.email}`}>{lead.email}</a></td>
                    <td>{lead.phone}</td>
                    <td>{lead.postalCode}</td>
                    <td><span className="badge bg-light text-dark border">{lead.source}</span></td>
                    <td className="text-muted small">{fmtDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="d-flex align-items-center justify-content-between mt-3">
              <div className="text-muted small">Page {page} of {pages}</div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page <= 1}
                  onClick={() => fetchLeads(page - 1)}
                >Previous</button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page >= pages}
                  onClick={() => fetchLeads(page + 1)}
                >Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
