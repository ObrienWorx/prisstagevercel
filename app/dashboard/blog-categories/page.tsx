'use client';
import { useEffect, useState, useCallback } from 'react';
import { slugify } from '@/lib/slugify';
import ImageUpload from '@/components/ImageUpload';

interface Item { _id: string; name: string; slug: string; description: string; status: string; showInNav: boolean; navHighlight: boolean; metaTitle: string; metaDescription: string; metaImage: string; }
const empty = { name: '', slug: '', description: '', status: 'active', showInNav: false, navHighlight: false, metaTitle: '', metaDescription: '', metaImage: '' };

export default function BlogCategoriesPage() {
  const [items, setItems] = useState<Item[]>([]); const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [showModal, setShowModal] = useState(false); const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(empty); const [del, setDel] = useState<Item | null>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const load = useCallback(async () => { setLoading(true); try { const r = await fetch('/api/blog-categories', { headers: h }); const d = await r.json(); if (d.success) setItems(d.data); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const flash = (m: string) => { setOk(m); setTimeout(() => setOk(''), 3000); };
  const openCreate = () => { setEditing(null); setForm(empty); setErr(''); setShowModal(true); };
  const openEdit = (x: Item) => { setEditing(x); setForm({ name: x.name, slug: x.slug, description: x.description, status: x.status, showInNav: x.showInNav ?? false, navHighlight: x.navHighlight ?? false, metaTitle: x.metaTitle, metaDescription: x.metaDescription, metaImage: x.metaImage }); setErr(''); setShowModal(true); };
  const save = async () => {
    if (!form.name.trim()) { setErr('Name is required'); return; }
    setErr(''); setSaving(true);
    try {
      const url = editing ? `/api/blog-categories/${editing._id}` : '/api/blog-categories';
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) { flash(d.message); setShowModal(false); load(); } else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!del) return; setSaving(true);
    try { const r = await fetch(`/api/blog-categories/${del._id}`, { method: 'DELETE', headers: h }); const d = await r.json(); if (d.success) { flash('Deleted'); setDel(null); load(); } } finally { setSaving(false); }
  };
  return (
    <div>
      <div className="page-header">
        <div className="page-header-text"><h4>Blog Categories</h4><p>Categories used only for Blog posts</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Category</button>
      </div>
      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}
      {err && !showModal && <div className="alert alert-danger mb-4">{err}</div>}
      <div className="card">
        {loading ? <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
          : items.length === 0 ? <div className="empty-state"><div className="empty-icon">📝</div><p>No blog categories yet.</p></div>
          : <div className="table-responsive"><table className="table"><thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>In Nav</th><th>Highlight</th><th>Actions</th></tr></thead><tbody>
            {items.map((x) => (<tr key={x._id}>
              <td className="fw-semibold">{x.name}</td>
              <td><code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{x.slug}</code></td>
              <td><span className={`badge ${x.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>{x.status}</span></td>
              <td>{x.showInNav ? <span className="badge bg-primary">Yes</span> : <span className="badge bg-light text-muted">No</span>}</td>
              <td>{x.navHighlight ? <span className="badge bg-warning text-dark">🔥 Hot</span> : <span className="badge bg-light text-muted">No</span>}</td>
              <td><button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(x)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={() => setDel(x)}>Del</button></td>
            </tr>))}
          </tbody></table></div>}
      </div>
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable"><div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">{editing ? 'Edit' : 'New'} Blog Category</h5><button className="btn-close" onClick={() => setShowModal(false)} /></div>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Name *</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} /></div>
                <div className="col-md-6"><label className="form-label">Slug</label><input className="form-control" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
                <div className="col-md-8"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                <div className="col-12"><hr className="my-1" /><div className="form-section-title">Header Navigation</div></div>
                <div className="col-md-6">
                  <div className="form-check form-switch">
                    <input type="checkbox" className="form-check-input" id="showInNav" checked={form.showInNav} onChange={(e) => setForm({ ...form, showInNav: e.target.checked, navHighlight: e.target.checked ? form.navHighlight : false })} />
                    <label className="form-check-label" htmlFor="showInNav"><strong>Show in header menu</strong><div className="form-text" style={{ marginTop: 2 }}>Adds this category to the site navigation bar.</div></label>
                  </div>
                </div>
                {form.showInNav && (
                  <div className="col-md-6">
                    <div className="form-check form-switch">
                      <input type="checkbox" className="form-check-input" id="navHighlight" checked={form.navHighlight} onChange={(e) => setForm({ ...form, navHighlight: e.target.checked })} />
                      <label className="form-check-label" htmlFor="navHighlight"><strong>🔥 Highlight / Blink</strong><div className="form-text" style={{ marginTop: 2 }}>Makes the menu item pulse in amber with a "HOT" badge.</div></label>
                    </div>
                  </div>
                )}
                <div className="col-12"><hr className="my-1" /><div className="form-section-title">SEO</div></div>
                <div className="col-md-6"><label className="form-label">Meta Title</label><input className="form-control" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} /></div>
                <div className="col-md-6"><label className="form-label">Meta Description</label><input className="form-control" value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} /></div>
                <div className="col-12"><ImageUpload label="Meta Image" value={form.metaImage} onChange={(u) => setForm({ ...form, metaImage: u })} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-2" />}{editing ? 'Save' : 'Create'}</button></div>
          </div></div>
        </div>
      )}
      {del && (<div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}><div className="modal-dialog"><div className="modal-content"><div className="modal-header"><h5 className="modal-title text-danger">Delete</h5><button className="btn-close" onClick={() => setDel(null)} /></div><div className="modal-body">Delete <strong>{del.name}</strong>?</div><div className="modal-footer"><button className="btn btn-secondary" onClick={() => setDel(null)}>Cancel</button><button className="btn btn-danger" onClick={remove} disabled={saving}>Delete</button></div></div></div></div>)}
    </div>
  );
}
