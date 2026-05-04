'use client';

import { useEffect, useState, useCallback } from 'react';
import { slugify } from '@/lib/slugify';
import dynamic from 'next/dynamic';
import ImageUpload from '@/components/ImageUpload';

const TinyEditor = dynamic(() => import('@/components/TinyEditor'), { ssr: false });

interface Ref { _id: string; name: string; }
interface Report {
  _id: string; title: string; slug: string; content: string; featuredImage: string;
  category: Ref | null; sector: Ref | null; product: Ref | null;
  upsellTicker: string; publishStatus: 'draft' | 'published';
  metaTitle: string; metaDescription: string; metaImage: string;
}

const empty = {
  title: '', slug: '', content: '', featuredImage: '',
  category: '', sector: '', product: '',
  upsellTicker: '', publishStatus: 'draft' as 'draft' | 'published',
  metaTitle: '', metaDescription: '', metaImage: '',
};

export default function ReportsPage() {
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
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

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
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const flash = (msg: string) => { setOk(msg); setTimeout(() => setOk(''), 3000); };

  const openCreate = () => { setEditing(null); setForm(empty); setErr(''); setShowModal(true); };
  const openEdit = (item: Report) => {
    setEditing(item);
    setForm({
      title: item.title, slug: item.slug, content: item.content, featuredImage: item.featuredImage,
      category: item.category?._id || '', sector: item.sector?._id || '', product: item.product?._id || '',
      upsellTicker: item.upsellTicker, publishStatus: item.publishStatus,
      metaTitle: item.metaTitle, metaDescription: item.metaDescription, metaImage: item.metaImage,
    });
    setErr(''); setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setErr(''); setSaving(true);
    try {
      const payload = { ...form, category: form.category || null, sector: form.sector || null, product: form.product || null };
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
                <tr><th>Title</th><th>Category</th><th>Sector</th><th>Product</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr>
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
                      <span className={`badge ${item.publishStatus === 'published' ? 'bg-success' : 'bg-secondary'}`}>
                        {item.publishStatus}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(item)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDel(item)}>Del</button>
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
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Title <span className="text-danger">*</span></label>
                    <input className="form-control" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) })}
                      placeholder="Report title..." />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Slug</label>
                    <input className="form-control" value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                    <div className="form-text">Auto-generated</div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Report Category</label>
                    <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      <option value="">— Select Category —</option>
                      {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Sector</label>
                    <select className="form-select" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}>
                      <option value="">— Select Sector —</option>
                      {sectors.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Product <span style={{ fontSize: 11, color: '#f59e0b' }}>(access gate)</span></label>
                    <select className="form-select" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                      <option value="">— No Gate —</option>
                      {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="col-12">
                    <ImageUpload label="Featured Image" value={form.featuredImage} onChange={(url) => setForm({ ...form, featuredImage: url })} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Content</label>
                    <TinyEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} />
                  </div>

                  <div className="col-md-8">
                    <label className="form-label">Upsell Ticker</label>
                    <input className="form-control" value={form.upsellTicker}
                      onChange={(e) => setForm({ ...form, upsellTicker: e.target.value })}
                      placeholder="e.g. Upgrade your plan to unlock this report" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Publish Status</label>
                    <select className="form-select" value={form.publishStatus}
                      onChange={(e) => setForm({ ...form, publishStatus: e.target.value as 'draft' | 'published' })}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>

                  <div className="col-12"><hr className="my-1" /><div className="form-section-title">SEO Settings</div></div>
                  <div className="col-md-6">
                    <label className="form-label">Meta Title</label>
                    <input className="form-control" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Meta Description</label>
                    <input className="form-control" value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <ImageUpload label="Meta Image" value={form.metaImage} onChange={(url) => setForm({ ...form, metaImage: url })} />
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
