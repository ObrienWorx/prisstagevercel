'use client';

import { useEffect, useState, useCallback } from 'react';
import { slugify } from '@/lib/slugify';
import ImageUpload from '@/components/ImageUpload';

interface Sector { _id: string; name: string; slug: string; featuredImage: string; description: string; }
const empty = { name: '', slug: '', featuredImage: '', description: '' };

export default function SectorsPage() {
  const [items, setItems] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Sector | null>(null);
  const [form, setForm] = useState(empty);
  const [del, setDel] = useState<Sector | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/sectors', { headers: h });
      const d = await r.json();
      if (d.success) setItems(d.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg: string) => { setOk(msg); setTimeout(() => setOk(''), 3000); };
  const openCreate = () => { setEditing(null); setForm(empty); setErr(''); setShowModal(true); };
  const openEdit = (item: Sector) => { setEditing(item); setForm({ name: item.name, slug: item.slug, featuredImage: item.featuredImage || '', description: item.description || '' }); setErr(''); setShowModal(true); };

  const save = async () => {
    if (!form.name.trim()) { setErr('Name is required'); return; }
    setErr(''); setSaving(true);
    try {
      const url = editing ? `/api/sectors/${editing._id}` : '/api/sectors';
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) { flash(d.message); setShowModal(false); load(); }
      else setErr(d.error || 'Something went wrong');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!del) return; setSaving(true);
    try {
      const r = await fetch(`/api/sectors/${del._id}`, { method: 'DELETE', headers: h });
      const d = await r.json();
      if (d.success) { flash('Sector deleted'); setDel(null); load(); }
      else { setErr(d.error || 'Delete failed'); setDel(null); }
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h4>Sectors</h4>
          <p>Manage industry sectors</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Sector</button>
      </div>

      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}
      {err && !showModal && <div className="alert alert-danger mb-4">{err}</div>}

      <div className="card">
        {loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏭</div><p>No sectors yet.</p></div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead><tr><th>#</th><th>Name</th><th>Slug</th><th style={{ width: 120 }}>Actions</th></tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item._id}>
                    <td style={{ color: 'var(--muted)', width: 40 }}>{i + 1}</td>
                    <td className="fw-semibold">{item.name}</td>
                    <td><code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{item.slug}</code></td>
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
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit Sector' : 'New Sector'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {err && <div className="alert alert-danger mb-3">{err}</div>}
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Name <span className="text-danger">*</span></label>
                    <input className="form-control" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} placeholder="e.g. Technology" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Slug</label>
                    <input className="form-control" value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                    <div className="form-text">Auto-generated from name</div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={2} value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description of this sector..." />
                  </div>
                  <div className="col-12">
                    <ImageUpload label="Featured Image" value={form.featuredImage} onChange={(url) => setForm({ ...form, featuredImage: url })} />
                    <div className="form-text">Shown in the header dropdown and sector hero page</div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-2" />}
                  {editing ? 'Save Changes' : 'Create Sector'}
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
              <div className="modal-header"><h5 className="modal-title text-danger">Delete Sector</h5><button className="btn-close" onClick={() => setDel(null)} /></div>
              <div className="modal-body">Delete <strong>{del.name}</strong>? This cannot be undone.</div>
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
