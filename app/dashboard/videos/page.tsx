'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { getYouTubeId } from '@/lib/orderHelpers';
import Pagination from '@/components/Pagination';

const PER_PAGE = 20;

interface Video { _id: string; title: string; youtubeUrl: string; isActive: boolean; }
const empty = { title: '', youtubeUrl: '', isActive: true };

export default function VideosPage() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [showModal, setShowModal] = useState(false); const [editing, setEditing] = useState<Video | null>(null);
  const [form, setForm] = useState(empty); const [del, setDel] = useState<Video | null>(null);
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const safePage = Math.min(page, pages);
  const paged = items.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch('/api/videos', { headers: h }); const d = await r.json(); if (d.success) setItems(d.data); }
    finally { setLoading(false); }
  }, [h]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { load(); }, 0);
    return () => { window.clearTimeout(timeout); };
  }, [load]);
  const flash = (m: string) => { setOk(m); setTimeout(() => setOk(''), 3000); };

  const openCreate = () => { setEditing(null); setForm(empty); setErr(''); setShowModal(true); };
  const openEdit = (x: Video) => { setEditing(x); setForm({ title: x.title, youtubeUrl: x.youtubeUrl, isActive: x.isActive }); setErr(''); setShowModal(true); };

  const save = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    if (!form.youtubeUrl.trim()) { setErr('YouTube URL is required'); return; }
    setErr(''); setSaving(true);
    try {
      const url = editing ? `/api/videos/${editing._id}` : '/api/videos';
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) { flash(editing ? 'Video updated' : 'Video added'); setShowModal(false); load(); }
      else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!del) return; setSaving(true);
    try {
      const r = await fetch(`/api/videos/${del._id}`, { method: 'DELETE', headers: h });
      const d = await r.json();
      if (d.success) { flash('Deleted'); setDel(null); load(); }
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text"><h4>Videos</h4><p>Manage YouTube videos shown on the frontend</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Video</button>
      </div>

      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}
      {err && !showModal && <div className="alert alert-danger mb-4">{err}</div>}

      <div className="card">
        {loading ? <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
          : items.length === 0 ? <div className="empty-state"><div className="empty-icon">🎥</div><p>No videos yet. Add your first YouTube video.</p></div>
          : <div className="table-responsive"><table className="table"><thead><tr><th>Preview</th><th>Title</th><th>URL</th><th>Active</th><th>Actions</th></tr></thead><tbody>
            {paged.map(v => {
              const vid = getYouTubeId(v.youtubeUrl);
              return (
                <tr key={v._id}>
                  <td style={{ width: 100 }}>
                    {vid
                      ? <img src={`https://img.youtube.com/vi/${vid}/default.jpg`} alt="" style={{ width: 88, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                      : <div style={{ width: 88, height: 56, background: '#f1f5f9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>▶️</div>
                    }
                  </td>
                  <td className="fw-semibold" style={{ maxWidth: 220 }}><div className="text-truncate">{v.title}</div></td>
                  <td><a href={v.youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--primary)', wordBreak: 'break-all' }}>{v.youtubeUrl.length > 40 ? v.youtubeUrl.slice(0, 40) + '...' : v.youtubeUrl}</a></td>
                  <td><span className={`badge ${v.isActive ? 'bg-success' : 'bg-secondary'}`}>{v.isActive ? 'Active' : 'Hidden'}</span></td>
                  <td className="d-flex">
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(v)}>Edit</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setDel(v)}>Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody></table></div>}
      </div>

      <Pagination page={safePage} pages={pages} total={items.length} onChange={setPage} />

      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog modal-lg"><div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">{editing ? 'Edit Video' : 'Add Video'}</h5><button className="btn-close" onClick={() => setShowModal(false)} /></div>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}
              <div className="row g-3">
                <div className="col-12"><label className="form-label">Title *</label><input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Market Wrap – April 2025" /></div>
                <div className="col-12">
                  <label className="form-label">YouTube URL *</label>
                  <input className="form-control" value={form.youtubeUrl} onChange={e => setForm({ ...form, youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                  {form.youtubeUrl && getYouTubeId(form.youtubeUrl) && (
                    <div className="mt-2">
                      <img src={`https://img.youtube.com/vi/${getYouTubeId(form.youtubeUrl)}/hqdefault.jpg`} alt="preview" style={{ width: 240, height: 135, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    </div>
                  )}
                </div>
                <div className="col-12"><div className="form-check form-switch"><input type="checkbox" className="form-check-input" id="isActive" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /><label className="form-check-label" htmlFor="isActive">Show on website</label></div></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-2" />}{editing ? 'Save' : 'Add Video'}</button></div>
          </div></div>
        </div>
      )}

      {del && (<div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}><div className="modal-dialog"><div className="modal-content"><div className="modal-header"><h5 className="modal-title text-danger">Delete Video</h5><button className="btn-close" onClick={() => setDel(null)} /></div><div className="modal-body">Delete <strong>{del.title}</strong>?</div><div className="modal-footer"><button className="btn btn-secondary" onClick={() => setDel(null)}>Cancel</button><button className="btn btn-danger" onClick={remove} disabled={saving}>Delete</button></div></div></div></div>)}
    </div>
  );
}
