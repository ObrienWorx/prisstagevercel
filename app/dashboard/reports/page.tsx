'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { slugify } from '@/lib/slugify';
import { fmtDateShort, fmtDateTime, toLocalDateTimeInput } from '@/lib/dates';
import dynamic from 'next/dynamic';
import ImageUpload from '@/components/ImageUpload';
import Pagination from '@/components/Pagination';

const TinyEditor = dynamic(() => import('@/components/TinyEditor'), { ssr: false });
const PER_PAGE = 20;

interface Ref { _id: string; name: string; }
interface ReportRef { _id: string; title: string; slug?: string; upsellTicker?: string; ticker?: string; }
interface Report {
  _id: string; title: string; slug: string; content: string; featuredImage: string;
  category: Ref | null; sector: Ref | null; product: Ref | null;
  pastStockRecommendation: ReportRef | string | null;
  pastStockRecommendations?: (ReportRef | string)[];
  upsellTicker: string; ticker: string; price: number; recommendation: string; recommendations?: string[];
  publishStatus: 'draft' | 'published';
  featured: boolean;
  publishedAt?: string | null;
  metaTitle: string; metaDescription: string; metaImage: string;
  createdAt: string;
}


const RECOMMENDATION_OPTIONS = ['BUY', 'SELL', 'HOLD', 'SPECULATIVE BUY', 'REFRAIN', 'Security Under Review'];

const RECOM_COLOR: Record<string, string> = {
  'BUY': '#16a34a', 'HOLD': '#d97706', 'SELL': '#dc2626',
  'SPECULATIVE BUY': '#0049AC', 'REFRAIN': '#64748b', 'Security Under Review': '#9333ea',
};

const refId = (ref: ReportRef | string | null | undefined) => typeof ref === 'string' ? ref : ref?._id || '';
const refIds = (refs: (ReportRef | string)[] | null | undefined) => (refs || []).map(refId).filter(Boolean);

const empty = {
  title: '', slug: '', content: '', featuredImage: '',
  category: '', sector: '', product: '', pastStockRecommendations: [] as string[],
  upsellTicker: '', ticker: '', price: '', recommendations: [] as string[],
  publishStatus: 'draft' as 'draft' | 'published',
  featured: false,
  publishedAt: '',
  metaTitle: '', metaDescription: '', metaImage: '',
};



function ReportMultiSelect({ options, value, onChange, empty = 'No reports available.' }: {
  options: ReportRef[]; value: string[]; onChange: (ids: string[]) => void; empty?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.filter((o) => value.includes(o._id));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) =>
      o.title.toLowerCase().includes(q) ||
      (o.ticker || '').toLowerCase().includes(q) ||
      (o.upsellTicker || '').toLowerCase().includes(q))
    : options;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="form-select text-start"
        onClick={() => setOpen((o) => !o)}
        style={{ minHeight: 38, height: 'auto', whiteSpace: 'normal' }}
      >
        {selected.length === 0
          ? <span style={{ color: 'var(--muted)' }}>Select reports</span>
          : <span className="d-flex flex-wrap gap-1">
            {selected.map((o) => (
              <span key={o._id} className="badge bg-secondary" style={{ fontWeight: 400 }}>
                {o.upsellTicker || o.ticker ? `${o.upsellTicker || ''}${o.upsellTicker && o.ticker ? ':' : ''}${o.ticker || ''}` : o.title}
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); toggle(o._id); }}
                  style={{ marginLeft: 6, cursor: 'pointer' }}
                >×</span>
              </span>
            ))}
          </span>}
      </button>
      {open && (
        <div
          className="card"
          style={{ position: 'absolute', zIndex: 1056, top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 280, display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid var(--border, #e5e7eb)' }}>
            <input
              className="form-control form-control-sm"
              placeholder="Search by title, ticker or index..."
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '6px 12px', color: 'var(--muted)', fontSize: 13 }}>{options.length === 0 ? empty : 'No reports match.'}</div>
            ) : filtered.map((o) => (
              <button
                key={o._id}
                type="button"
                className="dropdown-item d-flex align-items-center gap-2"
                style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: value.includes(o._id) ? 'var(--bs-primary-bg-subtle, #e7f1ff)' : 'none', border: 'none', whiteSpace: 'normal' }}
                onClick={() => toggle(o._id)}
              >
                <input type="checkbox" className="form-check-input m-0" checked={value.includes(o._id)} readOnly />
                <span>{o.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Report[]>([]);
  const [matchReports, setMatchReports] = useState<ReportRef[]>([]);
  const [categories, setCategories] = useState<Ref[]>([]);
  const [sectors, setSectors] = useState<Ref[]>([]);
  const [products, setProducts] = useState<Ref[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);
  const [form, setForm] = useState(empty);
  const [del, setDel] = useState<Report | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async (p = 1, q = '', cat = '', sec = '', prod = '', reco = '', from = '', to = '') => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/reports?page=${p}&limit=${PER_PAGE}&search=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}&sector=${encodeURIComponent(sec)}&product=${encodeURIComponent(prod)}&recommendation=${encodeURIComponent(reco)}&dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}`,
        { headers: h },
      ).then((res) => res.json());
      if (r.success) {
        setItems(r.data.items);
        setPage(r.data.page);
        setPages(r.data.pages);
        setTotal(r.data.total);
      }
    } finally { setLoading(false); }
  }, [h]);

  const loadRefs = useCallback(async () => {
    const [cR, sR, pR] = await Promise.all([
      fetch('/api/report-categories', { headers: h }),
      fetch('/api/sectors', { headers: h }),
      fetch('/api/products', { headers: h }),
    ]);
    const [c, s, p] = await Promise.all([cR.json(), sR.json(), pR.json()]);
    if (c.success) setCategories(c.data);
    if (s.success) setSectors(s.data);
    if (p.success) setProducts(p.data);
  }, [h]);

  useEffect(() => { void loadRefs(); }, [loadRefs]);

  useEffect(() => {
    if (!form.upsellTicker || !form.ticker) { setMatchReports([]); return; }
    void fetch(`/api/reports?match=1&index=${encodeURIComponent(form.upsellTicker)}&ticker=${encodeURIComponent(form.ticker)}`, { headers: h })
      .then(r => r.json()).then(d => { if (d.success) setMatchReports(d.data); });
  }, [form.upsellTicker, form.ticker, h]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(1, search, categoryFilter, sectorFilter, productFilter, recommendationFilter, dateFrom, dateTo); }, 0);
    return () => { window.clearTimeout(timeout); };
  }, [load, search, categoryFilter, sectorFilter, productFilter, recommendationFilter, dateFrom, dateTo]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;
    const timeout = window.setTimeout(() => { void openEditById(editId); }, 0);
    return () => { window.clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const flash = (msg: string) => { setOk(msg); setTimeout(() => setOk(''), 3000); };
  const goToPage = (p: number) => { void load(p, search, categoryFilter, sectorFilter, productFilter, recommendationFilter, dateFrom, dateTo); };

  const fillForm = (item: Report) => {
    setEditing(item);
    setForm({
      title: item.title, slug: item.slug, content: item.content || '', featuredImage: item.featuredImage,
      category: item.category?._id || '', sector: item.sector?._id || '', product: item.product?._id || '',
      pastStockRecommendations: item.pastStockRecommendations?.length ? refIds(item.pastStockRecommendations) : (item.pastStockRecommendation ? [refId(item.pastStockRecommendation)] : []),
      upsellTicker: item.upsellTicker, ticker: item.ticker || '', price: String(item.price ?? ''), recommendations: item.recommendations?.length ? item.recommendations : (item.recommendation ? [item.recommendation] : []),
      publishStatus: item.publishStatus,
      featured: item.featured ?? false,
      publishedAt: toLocalDateTimeInput(item.publishedAt ?? item.createdAt),
      metaTitle: item.metaTitle, metaDescription: item.metaDescription, metaImage: item.metaImage,
    });
    setErr(''); setShowModal(true);
  };

  const openCreate = () => { setEditing(null); setForm({ ...empty, publishedAt: toLocalDateTimeInput(new Date()) }); setErr(''); setShowModal(true); };
  const openEdit = async (item: Report) => {
    try {
      const d = await fetch(`/api/reports/${item._id}`, { headers: h }).then((r) => r.json());
      fillForm(d.success ? d.data : item);
    } catch { fillForm(item); }
  };
  const openEditById = async (id: string) => {
    try {
      const d = await fetch(`/api/reports/${id}`, { headers: h }).then((r) => r.json());
      if (d.success) fillForm(d.data);
    } catch { /* report not found or request failed — leave modal closed */ }
  };

  const save = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setErr(''); setSaving(true);
    try {
      const payload = {
        ...form,
        category: form.category || null,
        sector: form.sector || null,
        product: form.product || null,
        pastStockRecommendations: form.pastStockRecommendations,
        upsellTicker: form.upsellTicker.trim().toUpperCase(),
        ticker: form.ticker.trim().toUpperCase(),
        price: form.price !== '' ? Number(form.price) : 0,
        // datetime-local is in the admin's local tz; convert to a UTC instant.
        // A future time keeps the report hidden on the site until it passes.
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      };
      const url = editing ? `/api/reports/${editing._id}` : '/api/reports';
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.success) { flash(d.message); setShowModal(false); load(page, search, categoryFilter, sectorFilter, productFilter, recommendationFilter, dateFrom, dateTo); loadRefs(); }
      else setErr(d.error || 'Something went wrong');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!del) return; setSaving(true);
    try {
      const r = await fetch(`/api/reports/${del._id}`, { method: 'DELETE', headers: h });
      const d = await r.json();
      if (d.success) { flash('Report deleted'); setDel(null); load(page, search, categoryFilter, sectorFilter, productFilter, recommendationFilter, dateFrom, dateTo); loadRefs(); }
      else { setErr(d.error || 'Delete failed'); setDel(null); }
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h4>Reports</h4>
          <p>Manage research reports with product access control</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Report</button>
      </div>

      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}
      {err && !showModal && <div className="alert alert-danger mb-4">{err}</div>}

      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <form
          className="d-flex gap-2"
          style={{ maxWidth: 420 }}
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}
        >
          <input
            className="form-control"
            placeholder="Search reports by title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button className="btn btn-outline-secondary" type="submit">Search</button>
          {search && (
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => { setSearchInput(''); setSearch(''); }}
            >Clear</button>
          )}
        </form>
        <select
          className="form-select"
          style={{ maxWidth: 240 }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select
          className="form-select"
          style={{ maxWidth: 240 }}
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
        >
          <option value="">All sectors</option>
          {sectors.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select
          className="form-select"
          style={{ maxWidth: 240 }}
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        >
          <option value="">All products</option>
          {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select
          className="form-select"
          style={{ maxWidth: 220 }}
          value={recommendationFilter}
          onChange={(e) => setRecommendationFilter(e.target.value)}
        >
          <option value="">All recommendations</option>
          {RECOMMENDATION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="d-flex align-items-center gap-1">
          <label className="form-label mb-0 small text-muted">From</label>
          <input
            type="date"
            className="form-control"
            style={{ maxWidth: 170 }}
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <label className="form-label mb-0 small text-muted">To</label>
          <input
            type="date"
            className="form-control"
            style={{ maxWidth: 170 }}
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(categoryFilter || sectorFilter || productFilter || recommendationFilter || dateFrom || dateTo) && (
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => {
              setCategoryFilter(''); setSectorFilter(''); setProductFilter('');
              setIndexFilter(''); setTickerFilter(''); setRecommendationFilter('');
              setDateFrom(''); setDateTo('');
            }}
          >Clear filters</button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📈</div><p>{search ? `No reports match “${search}”.` : (categoryFilter || sectorFilter || productFilter || recommendationFilter || dateFrom || dateTo) ? 'No reports match the selected filters.' : 'No reports yet. Create your first one.'}</p></div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr><th>Title</th><th>Index</th><th>Ticker</th><th>Category</th><th>Sector</th><th>Product</th><th>Recommendation</th><th>Published</th><th style={{ width: 120 }}>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td className="fw-semibold" style={{ maxWidth: 240 }}>
                      <div className="text-truncate">{item.title}</div>
                      <code style={{ fontSize: 11, color: 'var(--muted)' }}>{item.slug}</code>
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{item.upsellTicker || <span className="text-muted small">—</span>}</td>
                    <td style={{ color: 'var(--muted)' }}>{item.ticker || <span className="text-muted small">—</span>}</td>
                    <td style={{ color: 'var(--muted)' }}>{item.category?.name || <span className="text-danger small">None</span>}</td>
                    <td style={{ color: 'var(--muted)' }}>{item.sector?.name || <span className="text-danger small">None</span>}</td>
                    <td style={{ color: 'var(--muted)' }}>{item.product?.name || <span style={{ color: '#f59e0b', fontSize: 12 }}>No gate</span>}</td>
                    <td>
                      {item.recommendation
                        ? <span className="badge" style={{ background: RECOM_COLOR[item.recommendation] || '#64748b', fontSize: 11 }}>{item.recommendation}</span>
                        : <span className="text-muted small">—</span>}
                    </td>
                    <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 13 }}>
                      {item.publishStatus === 'published' && item.publishedAt && new Date(item.publishedAt) > new Date() ? (
                        <>
                          <span className="badge" style={{ background: '#f59e0b', fontSize: 11 }}>🕒 Scheduled</span>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{fmtDateTime(item.publishedAt)}</div>
                        </>
                      ) : (item.publishedAt ?? item.createdAt)
                        ? <>
                            {fmtDateShort(item.publishedAt ?? item.createdAt)}
                            {item.createdAt && (
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>added {fmtDateTime(item.createdAt)}</div>
                            )}
                          </>
                        : <span className="text-muted small">—</span>}
                    </td>
                    <td className="d-flex">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(item)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDel(item)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} pages={pages} total={total} onChange={goToPage} />

      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit Report' : 'New Report'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {err && <div className="alert alert-danger mb-3">{err}</div>}
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Publish Status</label>
                    <select className="form-select" value={form.publishStatus}
                      onChange={(e) => setForm(prev => ({ ...prev, publishStatus: e.target.value as 'draft' | 'published' }))}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Publish Date &amp; Time</label>
                    <input type="datetime-local" className="form-control" value={form.publishedAt}
                      onChange={(e) => setForm(prev => ({ ...prev, publishedAt: e.target.value }))} />
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      A future time schedules it (hidden on site until then).
                      {form.publishedAt && ` · Sydney: ${fmtDateTime(new Date(form.publishedAt))}`}
                    </div>
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="featuredCheck"
                        checked={form.featured}
                        onChange={(e) => setForm(prev => ({ ...prev, featured: e.target.checked }))} />
                      <label className="form-check-label fw-semibold" htmlFor="featuredCheck">
                        Featured <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>(shown on /reports page)</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Title <span className="text-danger">*</span></label>
                    <input className="form-control" value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value, slug: slugify(e.target.value) }))}
                      placeholder="Report title..." />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Slug</label>
                    <input className="form-control" value={form.slug}
                      onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))} />
                    <div className="form-text">Auto-generated</div>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Report Category</label>
                    <select className="form-select" value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}>
                      <option value="">— Select Category —</option>
                      {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Sector</label>
                    <select className="form-select" value={form.sector} onChange={(e) => setForm(prev => ({ ...prev, sector: e.target.value }))}>
                      <option value="">— Select Sector —</option>
                      {sectors.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Product <span style={{ fontSize: 11, color: '#f59e0b' }}>(access gate)</span></label>
                    <select className="form-select" value={form.product} onChange={(e) => setForm(prev => ({ ...prev, product: e.target.value }))}>
                      <option value="">— No Gate —</option>
                      {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Past Stock Recommendations <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>(select all matching buys)</span></label>
                    <ReportMultiSelect
                      options={matchReports.filter((r) => r._id !== editing?._id)}
                      value={form.pastStockRecommendations}
                      onChange={(ids) => setForm(prev => ({ ...prev, pastStockRecommendations: ids }))}
                      empty={!form.upsellTicker && !form.ticker
                        ? 'Set INDEX and TICKER to see matching reports.'
                        : 'No other reports for this index & ticker.'}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">INDEX</label>
                    <select className="form-select" value={form.upsellTicker}
                      onChange={(e) => setForm(prev => ({ ...prev, upsellTicker: e.target.value }))}>
                      <option value="">— Select exchange —</option>
                      <option value="ASX">ASX</option>
                      <option value="NASDAQ">NASDAQ</option>
                      <option value="NYSE">NYSE</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">TICKER</label>
                    <input className="form-control" value={form.ticker}
                      onChange={(e) => setForm(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                      placeholder="AAPL" />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Price ($)</label>
                    <input type="number" min="0" step="0.01" className="form-control" value={form.price}
                      onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00" />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Recommendation <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>(select one or more)</span></label>
                    <div className="d-flex flex-wrap gap-3">
                      {RECOMMENDATION_OPTIONS.map((opt) => (
                        <div className="form-check" key={opt}>
                          <input className="form-check-input" type="checkbox" id={`reco-${opt}`}
                            checked={form.recommendations.includes(opt)}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              recommendations: e.target.checked
                                ? [...prev.recommendations, opt]
                                : prev.recommendations.filter((r) => r !== opt),
                            }))} />
                          <label className="form-check-label" htmlFor={`reco-${opt}`}>{opt}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Content</label>
                    <TinyEditor value={form.content} onChange={(v) => setForm(prev => ({ ...prev, content: v }))} />
                  </div>

                  <div className="col-12">
                    <ImageUpload label="Featured Image" value={form.featuredImage} onChange={(url) => setForm(prev => ({ ...prev, featuredImage: url }))} />
                  </div>

                  <div className="col-12"><hr className="my-1" /><div className="form-section-title">SEO Settings</div></div>
                  <div className="col-md-6">
                    <label className="form-label">Meta Title</label>
                    <input className="form-control" value={form.metaTitle} onChange={(e) => setForm(prev => ({ ...prev, metaTitle: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Meta Description</label>
                    <input className="form-control" value={form.metaDescription} onChange={(e) => setForm(prev => ({ ...prev, metaDescription: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <ImageUpload label="Meta Image" value={form.metaImage} onChange={(url) => setForm(prev => ({ ...prev, metaImage: url }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-2" />}
                  {editing ? 'Save Changes' : 'Create Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {del && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title text-danger">Delete Report</h5><button className="btn-close" onClick={() => setDel(null)} /></div>
              <div className="modal-body">Delete <strong>{del.title}</strong>? This cannot be undone.</div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDel(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={remove} disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-2" />}Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
