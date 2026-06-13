'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { slugify } from '@/lib/slugify';
import dynamic from 'next/dynamic';
import ImageUpload from '@/components/ImageUpload';

const TinyEditor = dynamic(() => import('@/components/TinyEditor'), { ssr: false });

interface Ref { _id: string; name: string; }
interface ReportRef { _id: string; title: string; slug: string; }
interface Report {
  _id: string; title: string; slug: string; content: string; featuredImage: string;
  category: Ref | null; sector: Ref | null; product: Ref | null;
  pastStockRecommendation: ReportRef | string | null;
  upsellTicker: string; ticker: string; price: number; recommendation: string;
  publishStatus: 'draft' | 'published';
  featured: boolean;
  metaTitle: string; metaDescription: string; metaImage: string;
}

const RECOM_COLOR: Record<string, string> = {
  'BUY': '#16a34a', 'HOLD': '#d97706', 'SELL': '#dc2626',
  'SPECULATIVE BUY': '#0049AC', 'REFRAIN': '#64748b', 'Security Under Review': '#9333ea',
};

const refId = (ref: ReportRef | string | null | undefined) => typeof ref === 'string' ? ref : ref?._id || '';

const empty = {
  title: '', slug: '', content: '', featuredImage: '',
  category: '', sector: '', product: '', pastStockRecommendation: '',
  upsellTicker: '', ticker: '', price: '', recommendation: '',
  publishStatus: 'draft' as 'draft' | 'published',
  featured: false,
  metaTitle: '', metaDescription: '', metaImage: '',
};

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Report[]>([]);
  const [categories, setCategories] = useState<Ref[]>([]);
  const [sectors, setSectors] = useState<Ref[]>([]);
  const [products, setProducts] = useState<Ref[]>([]);
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

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rR, cR, sR, pR] = await Promise.all([
        fetch('/api/reports', { headers: h }),
        fetch('/api/report-categories', { headers: h }),
        fetch('/api/sectors', { headers: h }),
        fetch('/api/products', { headers: h }),
      ]);
      const [r, c, s, p] = await Promise.all([rR.json(), cR.json(), sR.json(), pR.json()]);
      if (r.success) setItems(r.data);
      if (c.success) setCategories(c.data);
      if (s.success) setSectors(s.data);
      if (p.success) setProducts(p.data);
    } finally { setLoading(false); }
  }, [h]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { loadAll(); }, 0);
    return () => { window.clearTimeout(timeout); };
  }, [loadAll]);

  // Open edit modal when navigated from search with ?edit=<id>
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || loading || items.length === 0) return;
    const target = items.find((r) => r._id === editId);
    if (!target) return;
    const timeout = window.setTimeout(() => {
      setEditing(target);
      setForm({
        title: target.title, slug: target.slug, content: target.content, featuredImage: target.featuredImage,
        category: target.category?._id || '', sector: target.sector?._id || '', product: target.product?._id || '', pastStockRecommendation: refId(target.pastStockRecommendation),
        upsellTicker: target.upsellTicker, ticker: target.ticker || '', price: String(target.price ?? ''), recommendation: target.recommendation || '',
        publishStatus: target.publishStatus,
        featured: target.featured ?? false,
        metaTitle: target.metaTitle, metaDescription: target.metaDescription, metaImage: target.metaImage,
      });
      setErr('');
      setShowModal(true);
    }, 0);
    return () => { window.clearTimeout(timeout); };
  }, [searchParams, loading, items]);

  const flash = (msg: string) => { setOk(msg); setTimeout(() => setOk(''), 3000); };

  const openCreate = () => { setEditing(null); setForm(empty); setErr(''); setShowModal(true); };
  const openEdit = (item: Report) => {
    setEditing(item);
    setForm({
      title: item.title, slug: item.slug, content: item.content, featuredImage: item.featuredImage,
      category: item.category?._id || '', sector: item.sector?._id || '', product: item.product?._id || '', pastStockRecommendation: refId(item.pastStockRecommendation),
      upsellTicker: item.upsellTicker, ticker: item.ticker || '', price: String(item.price ?? ''), recommendation: item.recommendation || '',
      publishStatus: item.publishStatus,
      featured: item.featured ?? false,
      metaTitle: item.metaTitle, metaDescription: item.metaDescription, metaImage: item.metaImage,
    });
    setErr(''); setShowModal(true);
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
        pastStockRecommendation: form.pastStockRecommendation || null,
        upsellTicker: form.upsellTicker.trim().toUpperCase(),
        ticker: form.ticker.trim().toUpperCase(),
        price: form.price !== '' ? Number(form.price) : 0,
      };
      const url = editing ? `/api/reports/${editing._id}` : '/api/reports';
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.success) { flash(d.message); setShowModal(false); loadAll(); }
      else setErr(d.error || 'Something went wrong');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!del) return; setSaving(true);
    try {
      const r = await fetch(`/api/reports/${del._id}`, { method: 'DELETE', headers: h });
      const d = await r.json();
      if (d.success) { flash('Report deleted'); setDel(null); loadAll(); }
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

      <div className="card">
        {loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📈</div><p>No reports yet. Create your first one.</p></div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr><th>Title</th><th>Category</th><th>Sector</th><th>Product</th><th>Recommendation</th><th>Status</th><th>Featured</th><th style={{ width: 120 }}>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td className="fw-semibold" style={{ maxWidth: 240 }}>
                      <div className="text-truncate">{item.title}</div>
                      <code style={{ fontSize: 11, color: 'var(--muted)' }}>{item.slug}</code>
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{item.category?.name || <span className="text-danger small">None</span>}</td>
                    <td style={{ color: 'var(--muted)' }}>{item.sector?.name || <span className="text-danger small">None</span>}</td>
                    <td style={{ color: 'var(--muted)' }}>{item.product?.name || <span style={{ color: '#f59e0b', fontSize: 12 }}>No gate</span>}</td>
                    <td>
                      {item.recommendation
                        ? <span className="badge" style={{ background: RECOM_COLOR[item.recommendation] || '#64748b', fontSize: 11 }}>{item.recommendation}</span>
                        : <span className="text-muted small">—</span>}
                    </td>
                    <td>
                      <span className={`badge ${item.publishStatus === 'published' ? 'bg-success' : 'bg-secondary'}`}>
                        {item.publishStatus}
                      </span>
                    </td>
                    <td>
                      {item.featured
                        ? <span className="badge bg-warning text-dark">Featured</span>
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
                  <div className="col-md-6">
                    <label className="form-label">Publish Status</label>
                    <select className="form-select" value={form.publishStatus}
                      onChange={(e) => setForm(prev => ({ ...prev, publishStatus: e.target.value as 'draft' | 'published' }))}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <div className="col-md-6 d-flex align-items-end">
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
                    <label className="form-label">Past Stock Recommendations</label>
                    <select className="form-select" value={form.pastStockRecommendation} onChange={(e) => setForm(prev => ({ ...prev, pastStockRecommendation: e.target.value }))}>
                      <option value="">Select Report</option>
                      {items
                        .filter((report) => report._id !== editing?._id)
                        .map((report) => <option key={report._id} value={report._id}>{report.title}</option>)}
                    </select>
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
                  <div className="col-md-3">
                    <label className="form-label">Recommendation</label>
                    <select className="form-select" value={form.recommendation}
                      onChange={(e) => setForm(prev => ({ ...prev, recommendation: e.target.value }))}>
                      <option value="">— None —</option>
                      <option value="BUY">BUY</option>
                      <option value="HOLD">HOLD</option>
                      <option value="SELL">SELL</option>
                      <option value="SPECULATIVE BUY">SPECULATIVE BUY</option>
                      <option value="REFRAIN">REFRAIN</option>
                      <option value="Security Under Review">Security Under Review</option>
                    </select>
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
