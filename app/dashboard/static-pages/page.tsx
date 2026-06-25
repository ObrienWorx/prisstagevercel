'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const RichEditor = dynamic(() => import('@/components/RichEditor'), { ssr: false, loading: () => <div style={{ minHeight: 200, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>Loading editor…</div> });

interface Page {
  _id: string; title: string; slug: string; content: string;
  metaTitle: string; metaDescription: string;
  isPublished: boolean; showInFooter: boolean;
  footerColumn: 'quick-links' | 'policies' | 'none';
  sortOrder: number;
  updatedAt: string;
}

const emptyForm: { title: string; slug: string; content: string; metaTitle: string; metaDescription: string; isPublished: boolean; showInFooter: boolean; footerColumn: 'quick-links' | 'policies' | 'none' } = { title: '', slug: '', content: '', metaTitle: '', metaDescription: '', isPublished: true, showInFooter: false, footerColumn: 'none' };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function StaticPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/static-pages', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setPages(d.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setErr('');
    setShowModal(true);
  };

  const openEdit = (p: Page) => {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug, content: p.content,
      metaTitle: p.metaTitle, metaDescription: p.metaDescription,
      isPublished: p.isPublished, showInFooter: p.showInFooter,
      footerColumn: p.footerColumn,
    });
    setErr('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim()) { setErr('Title and slug are required'); return; }
    setSaving(true); setErr('');
    try {
      const url = editing ? `/api/static-pages/${editing._id}` : '/api/static-pages';
      const r = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) { setShowModal(false); load(); }
      else setErr(d.error || 'Save failed');
    } catch { setErr('Network error'); }
    finally { setSaving(false); }
  };

  const deletePage = async (id: string) => {
    if (!confirm('Delete this page? It will no longer be accessible.')) return;
    await fetch(`/api/static-pages/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const persistOrder = async (ordered: Page[]) => {
    try {
      const r = await fetch('/api/static-pages/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: ordered.map(p => p._id) }),
      });
      const d = await r.json();
      if (!d.success) setErr(d.error || 'Failed to save order');
    } catch { setErr('Failed to save order'); }
  };

  const handleDrop = () => {
    const from = dragItem.current, to = dragOverItem.current;
    dragItem.current = null; dragOverItem.current = null; setDragging(null);
    if (from == null || to == null || from === to) return;
    setPages(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      persistOrder(next);
      return next;
    });
  };

  const filtered = pages.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-text">
          <h4>Static Pages</h4>
          <p>Manage pages like Privacy Policy, Terms of Use, About Us, etc.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Page</button>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <span>{filtered.length} pages</span>
          <input className="form-control form-control-sm" style={{ maxWidth: 260 }} placeholder="Search pages…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="px-3 pt-3 text-muted" style={{ fontSize: 12 }}>
          Tip: drag the <span style={{ color: '#94a3b8' }}>⋮⋮</span> handle to reorder how pages appear in the footer.
          {search && <span> (clear the search to reorder)</span>}
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 32 }} title="Drag rows to reorder"></th>
                <th>Title</th>
                <th>Slug</th>
                <th>Footer</th>
                <th>Status</th>
                <th>Updated</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4 text-muted">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-muted">No pages found</td></tr>
              ) : filtered.map((p, index) => (
                <tr key={p._id}
                  draggable={!search}
                  onDragStart={() => { if (search) return; dragItem.current = index; setDragging(index); }}
                  onDragEnter={() => { if (!search) dragOverItem.current = index; }}
                  onDragEnd={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  style={{ opacity: dragging === index ? 0.4 : 1 }}
                >
                  <td style={{ cursor: search ? 'not-allowed' : 'move', color: '#94a3b8', textAlign: 'center', userSelect: 'none' }} title={search ? 'Clear search to reorder' : 'Drag to reorder'}>⋮⋮</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.title}</div>
                  </td>
                  <td>
                    <a href={`/${p.slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#3b82f6', textDecoration: 'none' }}>
                      /{p.slug} ↗
                    </a>
                  </td>
                  <td>
                    {p.showInFooter ? (
                      <span className="badge" style={{ background: p.footerColumn === 'policies' ? '#eff6ff' : '#f0fdf4', color: p.footerColumn === 'policies' ? '#1d4ed8' : '#15803d' }}>
                        {p.footerColumn === 'policies' ? 'Policies' : 'Quick Links'}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{ background: p.isPublished ? '#dcfce7' : '#fee2e2', color: p.isPublished ? '#15803d' : '#dc2626' }}>
                      {p.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12.5, color: '#64748b' }}>
                    {new Date(p.updatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deletePage(p._id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit Page' : 'New Static Page'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {err && <div className="alert alert-danger mb-3">{err}</div>}

                <div className="row g-3 mb-3">
                  <div className="col-md-7">
                    <label className="form-label">Page Title <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })}
                      placeholder="e.g. Privacy Policy"
                    />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label">URL Slug <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text" style={{ fontSize: 12 }}>/</span>
                      <input
                        className="form-control"
                        value={form.slug}
                        onChange={e => setForm({ ...form, slug: slugify(e.target.value) })}
                        placeholder="privacy-policy"
                      />
                    </div>
                    <div className="form-text">URL: domain.com/{form.slug || 'slug'}</div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Page Content</label>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    <RichEditor value={form.content} onChange={v => setForm({ ...form, content: v })} />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Meta Title</label>
                    <input className="form-control" value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })} placeholder="SEO title (optional)" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Meta Description</label>
                    <input className="form-control" value={form.metaDescription} onChange={e => setForm({ ...form, metaDescription: e.target.value })} placeholder="SEO description (optional)" />
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="isPublished" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} />
                      <label className="form-check-label" htmlFor="isPublished">Published</label>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="showInFooter" checked={form.showInFooter} onChange={e => setForm({ ...form, showInFooter: e.target.checked })} />
                      <label className="form-check-label" htmlFor="showInFooter">Show in Footer</label>
                    </div>
                  </div>
                  {form.showInFooter && (
                    <div className="col-md-4">
                      <label className="form-label">Footer Column</label>
                      <select className="form-select" value={form.footerColumn} onChange={e => setForm({ ...form, footerColumn: e.target.value as any })}>
                        <option value="none">None</option>
                        <option value="quick-links">Quick Links</option>
                        <option value="policies">Policies</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update Page' : 'Create Page'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
