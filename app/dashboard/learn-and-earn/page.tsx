'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  contents: string[];
  quizQuestions: QuizQ[];
}

interface Module {
  _id: string;
  title: string;
  slug: string;
  description: string;
  featuredImage?: string;
  authModalTitle?: string;
  authModalSubtitle?: string;
  publishStatus: 'draft' | 'published';
  chapters: Chapter[];
  createdAt: string;
}

const emptyChapter = (): Chapter => ({ title: '', slug: '', content: '', contents: [''], quizQuestions: [] });

const emptyForm = {
  title: '', slug: '', description: '', featuredImage: '',
  authModalTitle: '', authModalSubtitle: '',
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
  const [openSlides, setOpenSlides] = useState<Record<string, boolean>>({});
  const [openQuizzes, setOpenQuizzes] = useState<Record<string, boolean>>({});
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

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
    setOpenSlides({});
    setOpenQuizzes({});
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
      authModalTitle: (full as any).authModalTitle || '',
      authModalSubtitle: (full as any).authModalSubtitle || '',
      publishStatus: full.publishStatus,
      chapters: full.chapters?.length
        ? full.chapters.map(c => ({
            title: c.title, slug: c.slug, content: c.content || '',
            contents: Array.isArray((c as any).contents) && (c as any).contents.length > 0
              ? (c as any).contents
              : (c.content ? [c.content] : ['']),
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
    setOpenSlides({});
    setOpenQuizzes({});
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

  const persistOrder = async (ordered: Module[]) => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    try {
      const r = await fetch('/api/learn-and-earn/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ ids: ordered.map(m => m._id) }),
      });
      const d = await r.json();
      if (d.success) flash('Order saved');
      else setErr(d.error || 'Failed to save order');
    } catch { setErr('Failed to save order'); }
  };

  const handleDrop = () => {
    const from = dragItem.current, to = dragOverItem.current;
    dragItem.current = null; dragOverItem.current = null; setDragging(null);
    if (from == null || to == null || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    persistOrder(next);
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

  /* ── Content Slides helpers ── */
  const isSlideOpen = (ci: number, cntIdx: number) => {
    const key = `${ci}-${cntIdx}`;
    return openSlides[key] ?? (cntIdx === 0);
  };

  const toggleSlide = (ci: number, cntIdx: number) => {
    const key = `${ci}-${cntIdx}`;
    setOpenSlides(prev => ({
      ...prev,
      [key]: !(prev[key] ?? (cntIdx === 0)),
    }));
  };

  const toggleAllSlides = (ci: number, total: number) => {
    const allOpen = Array.from({ length: total }, (_, i) => isSlideOpen(ci, i)).every(Boolean);
    setOpenSlides(prev => {
      const next = { ...prev };
      for (let i = 0; i < total; i++) {
        next[`${ci}-${i}`] = !allOpen;
      }
      return next;
    });
  };

  const areAllSlidesOpen = (ci: number, total: number) => {
    return Array.from({ length: total }, (_, i) => isSlideOpen(ci, i)).every(Boolean);
  };

  const addChapterContent = (ci: number) => {
    let nextIdx = 1;
    setForm(f => {
      const chs = [...f.chapters];
      const cur = Array.isArray(chs[ci].contents) && chs[ci].contents.length > 0
        ? [...chs[ci].contents, '']
        : [chs[ci].content || '', ''];
      chs[ci] = { ...chs[ci], contents: cur, content: cur[0] || '' };
      nextIdx = cur.length - 1;
      return { ...f, chapters: chs };
    });
    setOpenSlides(prev => ({ ...prev, [`${ci}-${nextIdx}`]: true }));
  };

  const updateChapterContent = (ci: number, cntIdx: number, val: string) => {
    setForm(f => {
      const chs = [...f.chapters];
      const cur = Array.isArray(chs[ci].contents) && chs[ci].contents.length > 0
        ? [...chs[ci].contents]
        : [chs[ci].content || ''];
      cur[cntIdx] = val;
      chs[ci] = { ...chs[ci], contents: cur, content: cur[0] || '' };
      return { ...f, chapters: chs };
    });
  };

  const removeChapterContent = (ci: number, cntIdx: number) => {
    setForm(f => {
      const chs = [...f.chapters];
      const cur = Array.isArray(chs[ci].contents)
        ? chs[ci].contents.filter((_, i) => i !== cntIdx)
        : [];
      const safe = cur.length > 0 ? cur : [''];
      chs[ci] = { ...chs[ci], contents: safe, content: safe[0] || '' };
      return { ...f, chapters: chs };
    });
  };

  /* ── Quiz helpers ── */
  const isQuizOpen = (ci: number, qi: number) => {
    const key = `${ci}-${qi}`;
    return openQuizzes[key] ?? false;
  };

  const toggleQuiz = (ci: number, qi: number) => {
    const key = `${ci}-${qi}`;
    setOpenQuizzes(prev => ({
      ...prev,
      [key]: !(prev[key] ?? false),
    }));
  };

  const toggleAllQuizzes = (ci: number, total: number) => {
    const allOpen = Array.from({ length: total }, (_, i) => isQuizOpen(ci, i)).every(Boolean);
    setOpenQuizzes(prev => {
      const next = { ...prev };
      for (let i = 0; i < total; i++) {
        next[`${ci}-${i}`] = !allOpen;
      }
      return next;
    });
  };

  const areAllQuizzesOpen = (ci: number, total: number) => {
    return Array.from({ length: total }, (_, i) => isQuizOpen(ci, i)).every(Boolean);
  };

  const addQuizQuestion = (ci: number) => {
    let nextQi = 0;
    setForm(f => {
      const chs = [...f.chapters];
      const qs = [...chs[ci].quizQuestions, emptyQ()];
      chs[ci] = { ...chs[ci], quizQuestions: qs };
      nextQi = qs.length - 1;
      return { ...f, chapters: chs };
    });
    setOpenQuizzes(prev => ({ ...prev, [`${ci}-${nextQi}`]: true }));
  };

  const removeQuizQuestion = (ci: number, qi: number) => {
    setForm(f => {
      const chs = [...f.chapters];
      chs[ci] = { ...chs[ci], quizQuestions: chs[ci].quizQuestions.filter((_, i) => i !== qi) };
      return { ...f, chapters: chs };
    });
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
        <>
          <div className="text-muted mb-2" style={{ fontSize: 12 }}>
            Tip: drag the <span style={{ color: '#94a3b8' }}>⋮⋮</span> handle to reorder how modules appear on the public page.
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead><tr>
                <th style={{ width: 32 }}></th>
                <th>Title</th><th>Slug</th><th>Chapters</th><th>Status</th><th>Created</th><th style={{ width: 110 }}>Actions</th>
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-4">No modules yet</td></tr>}
                {items.map((item, index) => (
                  <tr key={item._id}
                    draggable
                    onDragStart={() => { dragItem.current = index; setDragging(index); }}
                    onDragEnter={() => { dragOverItem.current = index; }}
                    onDragEnd={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    style={{ opacity: dragging === index ? 0.4 : 1 }}
                  >
                    <td style={{ cursor: 'move', color: '#94a3b8', textAlign: 'center', userSelect: 'none' }} title="Drag to reorder">⋮⋮</td>
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
        </>
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
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Signup Popup Title</label>
                    <input className="form-control" placeholder="Create your account" value={form.authModalTitle}
                      onChange={e => setForm(f => ({ ...f, authModalTitle: e.target.value }))} />
                    <div className="form-text">Signup popup heading (default: &quot;Create your account&quot;)</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Signup Popup Subtitle</label>
                    <input className="form-control" placeholder="Join thousands of Australian investors" value={form.authModalSubtitle}
                      onChange={e => setForm(f => ({ ...f, authModalSubtitle: e.target.value }))} />
                    <div className="form-text">Signup popup subtext (default: &quot;Join thousands of Australian investors&quot;)</div>
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

                        {/* ── Multiple Contents / Slides Accordion Repeater ── */}
                        {(() => {
                          const slides = ch.contents && ch.contents.length > 0 ? ch.contents : [ch.content || ''];
                          return (
                            <div className="mb-4">
                              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                                <div>
                                  <label className="form-label mb-0 fw-semibold">
                                    Chapter Content Slides ({slides.length})
                                  </label>
                                  <div className="form-text mt-0">
                                    Each slide represents one step/pointer on the frontend slideshow. Click any slide to expand/edit.
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                  {slides.length > 1 && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link text-decoration-none text-muted p-0 me-2"
                                      onClick={() => toggleAllSlides(ci, slides.length)}
                                    >
                                      {areAllSlidesOpen(ci, slides.length) ? 'Collapse all slides' : 'Expand all slides'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => addChapterContent(ci)}
                                  >
                                    + Add Content Slide
                                  </button>
                                </div>
                              </div>

                              <div className="d-flex flex-column gap-2">
                                {slides.map((cnt, cntIdx) => {
                                  const isOpen = isSlideOpen(ci, cntIdx);
                                  const snippet = cnt ? cnt.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';

                                  return (
                                    <div key={cntIdx} className="border rounded-3 bg-white overflow-hidden shadow-sm">
                                      {/* Slide Accordion Header */}
                                      <div
                                        className="d-flex align-items-center justify-content-between px-3 py-2"
                                        style={{
                                          cursor: 'pointer',
                                          userSelect: 'none',
                                          background: isOpen ? '#f1f5f9' : '#f8fafc',
                                          borderBottom: isOpen ? '1px solid #e2e8f0' : 'none',
                                        }}
                                        onClick={() => toggleSlide(ci, cntIdx)}
                                      >
                                        <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                                          <span className="badge bg-primary">Slide #{cntIdx + 1}</span>
                                          <span className="small text-muted text-truncate" style={{ maxWidth: 480 }}>
                                            {snippet ? snippet.slice(0, 90) + (snippet.length > 90 ? '…' : '') : <em className="text-muted">Empty slide content…</em>}
                                          </span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                          {slides.length > 1 && (
                                            <button
                                              type="button"
                                              className="btn btn-sm btn-outline-danger py-0 px-2"
                                              style={{ fontSize: 12, lineHeight: '20px' }}
                                              onClick={e => {
                                                e.stopPropagation();
                                                removeChapterContent(ci, cntIdx);
                                              }}
                                              title="Remove this slide"
                                            >
                                              Remove
                                            </button>
                                          )}
                                          <span className="text-secondary fw-bold" style={{ fontSize: 13, width: 14, textAlign: 'center' }}>
                                            {isOpen ? '▲' : '▼'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Slide Body: TinyEditor kept in DOM with display: block/none */}
                                      <div style={{ display: isOpen ? 'block' : 'none' }} className="p-3 bg-white">
                                        <TinyEditor
                                          value={cnt}
                                          onChange={val => updateChapterContent(ci, cntIdx, val)}
                                          height={280}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* ── Quiz Accordion ── */}
                        <div className="mt-4 pt-3 border-top">
                          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                            <div>
                              <label className="form-label mb-0 fw-semibold">
                                Quiz Questions ({ch.quizQuestions.length}) <span className="text-muted fw-normal small">(optional)</span>
                              </label>
                              <div className="form-text mt-0">
                                Practice questions for this chapter. Click any question to expand/edit.
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {ch.quizQuestions.length > 1 && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-decoration-none text-muted p-0 me-2"
                                  onClick={() => toggleAllQuizzes(ci, ch.quizQuestions.length)}
                                >
                                  {areAllQuizzesOpen(ci, ch.quizQuestions.length) ? 'Collapse all questions' : 'Expand all questions'}
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => addQuizQuestion(ci)}
                              >
                                + Add Question
                              </button>
                            </div>
                          </div>

                          {ch.quizQuestions.length === 0 ? (
                            <div className="p-3 text-center text-muted border rounded-3 bg-light-subtle small">
                              No quiz questions added for this chapter yet. Click "+ Add Question" to create one.
                            </div>
                          ) : (
                            <div className="d-flex flex-column gap-2">
                              {ch.quizQuestions.map((qItem, qi) => {
                                const isOpen = isQuizOpen(ci, qi);
                                return (
                                  <div key={qi} className="border rounded-3 bg-white overflow-hidden shadow-sm">
                                    {/* Question Accordion Header */}
                                    <div
                                      className="d-flex align-items-center justify-content-between px-3 py-2"
                                      style={{
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        background: isOpen ? '#f1f5f9' : '#f8fafc',
                                        borderBottom: isOpen ? '1px solid #e2e8f0' : 'none',
                                      }}
                                      onClick={() => toggleQuiz(ci, qi)}
                                    >
                                      <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                                        <span className="badge bg-secondary">Q{qi + 1}</span>
                                        <span className="fw-semibold text-truncate" style={{ maxWidth: 500 }}>
                                          {qItem.q || <em className="text-muted fw-normal">Untitled question…</em>}
                                        </span>
                                        {qItem.opts[qItem.correct] && (
                                          <span className="badge bg-success-subtle text-success border border-success-subtle small d-none d-md-inline">
                                            Ans: {['A', 'B', 'C', 'D'][qItem.correct]}
                                          </span>
                                        )}
                                      </div>
                                      <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-danger py-0 px-2"
                                          style={{ fontSize: 12, lineHeight: '20px' }}
                                          onClick={e => {
                                            e.stopPropagation();
                                            removeQuizQuestion(ci, qi);
                                          }}
                                          title="Remove this question"
                                        >
                                          Remove
                                        </button>
                                        <span className="text-secondary fw-bold" style={{ fontSize: 13, width: 14, textAlign: 'center' }}>
                                          {isOpen ? '▲' : '▼'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Question Accordion Body */}
                                    {isOpen && (
                                      <div className="p-3 bg-white">
                                        <div className="mb-3">
                                          <label className="form-label small fw-semibold text-muted mb-1">Question Prompt *</label>
                                          <input
                                            className="form-control"
                                            placeholder="Question text…"
                                            value={qItem.q}
                                            onChange={e => updateQuiz(ci, qi, { q: e.target.value })}
                                          />
                                        </div>
                                        <div className="mb-3">
                                          <label className="form-label small fw-semibold text-muted mb-1">
                                            Options (Choose correct answer radio)
                                          </label>
                                          <div className="row g-2">
                                            {(['A', 'B', 'C', 'D'] as const).map((lbl, oi) => (
                                              <div className="col-md-6" key={lbl}>
                                                <div className="input-group">
                                                  <span className="input-group-text fw-semibold" style={{ minWidth: 38, justifyContent: 'center' }}>{lbl}</span>
                                                  <input
                                                    className="form-control"
                                                    placeholder={`Option ${lbl}`}
                                                    value={qItem.opts[oi]}
                                                    onChange={e => {
                                                      const opts = [...qItem.opts] as [string, string, string, string];
                                                      opts[oi] = e.target.value;
                                                      updateQuiz(ci, qi, { opts });
                                                    }}
                                                  />
                                                  <div
                                                    className={`input-group-text ${qItem.correct === oi ? 'bg-success text-white' : ''}`}
                                                    title="Mark as correct answer"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => updateQuiz(ci, qi, { correct: oi })}
                                                  >
                                                    <input
                                                      type="radio"
                                                      name={`correct-${ci}-${qi}`}
                                                      checked={qItem.correct === oi}
                                                      onChange={() => updateQuiz(ci, qi, { correct: oi })}
                                                      style={{ cursor: 'pointer' }}
                                                    />
                                                    <span className="ms-1 small fw-semibold d-none d-sm-inline">
                                                      {qItem.correct === oi ? 'Correct' : ''}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="form-label small fw-semibold text-muted mb-1">Explanation</label>
                                          <input
                                            className="form-control"
                                            placeholder="Explanation (shown after answer)…"
                                            value={qItem.explanation}
                                            onChange={e => updateQuiz(ci, qi, { explanation: e.target.value })}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
