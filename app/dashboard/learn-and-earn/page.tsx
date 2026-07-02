'use client';

import { useEffect, useState, useCallback } from 'react';
import { slugify } from '@/lib/slugify';
import dynamic from 'next/dynamic';
import ImageUpload from '@/components/ImageUpload';

const TinyEditor = dynamic(() => import('@/components/TinyEditor'), { ssr: false });

type QuizQ = { q: string; opts: [string, string, string, string]; correct: number; explanation: string };
const emptyQ = (): QuizQ => ({ q: '', opts: ['', '', '', ''], correct: 0, explanation: '' });

interface Chapter {
  title: string;
  slug: string;
  content: string;
  quizQuestions: QuizQ[];
}

interface Module {
  _id: string;
  title: string;
  slug: string;
  description: string;
  publishStatus: 'draft' | 'published';
  chapters: Chapter[];
  createdAt: string;
}

const emptyChapter = (): Chapter => ({ title: '', slug: '', content: '', quizQuestions: [] });

const emptyForm = {
  title: '', slug: '', description: '', featuredImage: '',
  publishStatus: 'draft' as 'draft' | 'published',
  chapters: [emptyChapter()],
};

export default function LearnAndEarnPage() {
  const [items, setItems] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Module | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [del, setDel] = useState<Module | null>(null);
  const [openChapter, setOpenChapter] = useState<number>(0);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const flash = (msg: string) => { setOk(msg); setTimeout(() => setOk(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/learn-and-earn', { headers: h });
      const d = await r.json();
      if (d.success) setItems(d.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, chapters: [emptyChapter()] });
    setOpenChapter(0);
    setErr('');
    setShowModal(true);
  };

  const openEdit = async (item: Module) => {
    let full = item;
    try {
      const r = await fetch(`/api/learn-and-earn/${item._id}`, { headers: h });
      const d = await r.json();
      if (d.success) full = d.data;
    } catch {}
    setEditing(full);
    setForm({
      title: full.title, slug: full.slug, description: full.description || '',
      featuredImage: (full as any).featuredImage || '',
      publishStatus: full.publishStatus,
      chapters: full.chapters?.length
        ? full.chapters.map(c => ({
            title: c.title, slug: c.slug, content: c.content || '',
            quizQuestions: c.quizQuestions?.length
              ? c.quizQuestions.map((q: any) => ({
                  q: q.q || '', opts: [q.opts?.[0]||'', q.opts?.[1]||'', q.opts?.[2]||'', q.opts?.[3]||''] as [string,string,string,string],
                  correct: q.correct ?? 0, explanation: q.explanation || '',
                }))
              : [],
          }))
        : [emptyChapter()],
    });
    setOpenChapter(0);
    setErr('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    if (!form.chapters.length || !form.chapters[0].title.trim()) { setErr('At least one chapter with a title is required'); return; }
    setErr(''); setSaving(true);
    try {
      const url = editing ? `/api/learn-and-earn/${editing._id}` : '/api/learn-and-earn';
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) { flash(d.message); setShowModal(false); load(); }
      else setErr(d.error || 'Something went wrong');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!del) return; setSaving(true);
    try {
      const r = await fetch(`/api/learn-and-earn/${del._id}`, { method: 'DELETE', headers: h });
      const d = await r.json();
      if (d.success) { flash('Deleted'); setDel(null); load(); }
      else { setErr(d.error || 'Delete failed'); setDel(null); }
    } finally { setSaving(false); }
  };

  /* ── Chapter helpers ── */
  const updateChapter = (ci: number, patch: Partial<Chapter>) =>
    setForm(f => { const chs = [...f.chapters]; chs[ci] = { ...chs[ci], ...patch }; return { ...f, chapters: chs }; });

  const addChapter = () => {
    setForm(f => ({ ...f, chapters: [...f.chapters, emptyChapter()] }));
    setOpenChapter(form.chapters.length);
  };

  const removeChapter = (ci: number) => {
    setForm(f => { const chs = f.chapters.filter((_, i) => i !== ci); return { ...f, chapters: chs }; });
    setOpenChapter(prev => Math.max(0, prev >= ci ? prev - 1 : prev));
  };

  const updateQuiz = (ci: number, qi: number, patch: Partial<QuizQ>) =>
    setForm(f => {
      const chs = [...f.chapters];
      const qs = [...chs[ci].quizQuestions];
      qs[qi] = { ...qs[qi], ...patch };
      chs[ci] = { ...chs[ci], quizQuestions: qs };
      return { ...f, chapters: chs };
    });

  return (
    <div className="container-fluid py-4">
      {ok && <div className="alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3 z-3 shadow">{ok}</div>}

      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0 fw-bold">Learn &amp; Earn</h4>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Module</button>
      </div>

      {loading ? (
        <div className="text-center py-5"><span className="spinner-border" /></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead><tr>
              <th>Title</th><th>Slug</th><th>Chapters</th><th>Status</th><th>Created</th><th style={{ width: 110 }}>Actions</th>
            </tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No modules yet</td></tr>}
              {items.map(item => (
                <tr key={item._id}>
                  <td className="fw-semibold">{item.title}</td>
                  <td><code className="small">{item.slug}</code></td>
                  <td><span className="badge bg-secondary">{item.chapters?.length ?? 0}</span></td>
                  <td>
                    <span className={`badge ${item.publishStatus === 'published' ? 'bg-success' : 'bg-secondary'}`}>
                      {item.publishStatus}
                    </span>
                  </td>
                  <td className="text-muted small">{new Date(item.createdAt).toLocaleDateString()}</td>
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

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit Module' : 'Create Module'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {err && <div className="alert alert-danger">{err}</div>}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Module Title *</label>
                    <input className="form-control" value={form.title}
                      onChange={e => {
                        const title = e.target.value;
                        setForm(f => ({ ...f, title, slug: editing ? f.slug : slugify(title) }));
                      }} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Slug</label>
                    <input className="form-control font-monospace" value={form.slug}
                      onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Short Description <span className="text-muted fw-normal">(shown on listing card)</span></label>
                    <textarea className="form-control" rows={2} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <ImageUpload
                      label="Featured Image"
                      value={form.featuredImage}
                      onChange={(url) => setForm(f => ({ ...f, featuredImage: url }))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Status</label>
                    <select className="form-select" value={form.publishStatus}
                      onChange={e => setForm(f => ({ ...f, publishStatus: e.target.value as 'draft' | 'published' }))}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                {/* ── Chapters ── */}
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="mb-0 fw-bold">Chapters</h6>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={addChapter}>+ Add Chapter</button>
                </div>

                {form.chapters.map((ch, ci) => (
                  <div key={ci} className="border rounded mb-3">
                    {/* Chapter header / accordion toggle */}
                    <div
                      className="d-flex align-items-center px-3 py-2 bg-light rounded-top"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setOpenChapter(openChapter === ci ? -1 : ci)}
                    >
                      <span className="badge bg-primary me-2">Ch {ci + 1}</span>
                      <span className="fw-semibold flex-grow-1">{ch.title || <span className="text-muted fst-italic">Untitled Chapter</span>}</span>
                      <button type="button" className="btn btn-sm btn-outline-danger me-2"
                        onClick={e => { e.stopPropagation(); removeChapter(ci); }}>Remove</button>
                      <span style={{ fontSize: 18 }}>{openChapter === ci ? '▲' : '▼'}</span>
                    </div>

                    {openChapter === ci && (
                      <div className="p-3">
                        <div className="row g-3 mb-3">
                          <div className="col-md-6">
                            <label className="form-label">Chapter Title *</label>
                            <input className="form-control" value={ch.title}
                              onChange={e => {
                                const title = e.target.value;
                                updateChapter(ci, { title, slug: ch.slug || slugify(title) });
                              }} />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">Slug</label>
                            <input className="form-control font-monospace" value={ch.slug}
                              onChange={e => updateChapter(ci, { slug: e.target.value })} />
                          </div>
                        </div>

                        <label className="form-label">Content</label>
                        <TinyEditor
                          value={ch.content}
                          onChange={val => updateChapter(ci, { content: val })}
                          height={350}
                        />

                        {/* ── Quiz ── */}
                        <div className="mt-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <label className="form-label mb-0 fw-semibold">Quiz Questions <span className="text-muted fw-normal small">(optional)</span></label>
                            <button type="button" className="btn btn-sm btn-outline-secondary"
                              onClick={() => setForm(f => {
                                const chs = [...f.chapters];
                                chs[ci] = { ...chs[ci], quizQuestions: [...chs[ci].quizQuestions, emptyQ()] };
                                return { ...f, chapters: chs };
                              })}>+ Add Question</button>
                          </div>
                          {ch.quizQuestions.map((qItem, qi) => (
                            <div key={qi} className="quiz-builder-question">
                              <div className="quiz-builder-qhead">
                                <span className="quiz-builder-qnum">Q{qi + 1}</span>
                                <button type="button" className="btn btn-sm btn-outline-danger ms-auto"
                                  onClick={() => {
                                    const chs = [...form.chapters];
                                    chs[ci] = { ...chs[ci], quizQuestions: chs[ci].quizQuestions.filter((_, i) => i !== qi) };
                                    setForm(f => ({ ...f, chapters: chs }));
                                  }}>Remove</button>
                              </div>
                              <input className="form-control mb-2" placeholder="Question text…" value={qItem.q}
                                onChange={e => updateQuiz(ci, qi, { q: e.target.value })} />
                              <div className="row g-2 mb-2">
                                {(['A','B','C','D'] as const).map((lbl, oi) => (
                                  <div className="col-md-6" key={lbl}>
                                    <div className="input-group">
                                      <span className="input-group-text">{lbl}</span>
                                      <input className="form-control" placeholder={`Option ${lbl}`} value={qItem.opts[oi]}
                                        onChange={e => {
                                          const opts = [...qItem.opts] as [string,string,string,string];
                                          opts[oi] = e.target.value;
                                          updateQuiz(ci, qi, { opts });
                                        }} />
                                      <div className="input-group-text" title="Correct answer">
                                        <input type="radio" name={`correct-${ci}-${qi}`} checked={qItem.correct === oi}
                                          onChange={() => updateQuiz(ci, qi, { correct: oi })} />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <input className="form-control" placeholder="Explanation (shown after answer)…" value={qItem.explanation}
                                onChange={e => updateQuiz(ci, qi, { explanation: e.target.value })} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : (editing ? 'Update Module' : 'Create Module')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {del && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <p className="mb-3">Delete <strong>{del.title}</strong>?</p>
                <button className="btn btn-danger me-2" onClick={remove} disabled={saving}>Delete</button>
                <button className="btn btn-secondary" onClick={() => setDel(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
