'use client';

import { useEffect, useState, useCallback, type ClipboardEvent, type FocusEvent, type KeyboardEvent } from 'react';
import { slugify } from '@/lib/slugify';
import { toDateInput, todayInput } from '@/lib/dates';
import dynamic from 'next/dynamic';
import ImageUpload from '@/components/ImageUpload';
import Pagination from '@/components/Pagination';

const TinyEditor = dynamic(() => import('@/components/TinyEditor'), { ssr: false });

interface Ref { _id: string; name: string; }
interface Blog {
  _id: string; title: string; slug: string; content: string; featuredImage: string;
  tags: string[]; authorName: string;
  category: Ref | null; categories?: Ref[]; publishStatus: 'draft' | 'published';
  publishedAt?: string | null; createdAt?: string;
  metaTitle: string; metaDescription: string; metaImage: string;
}

type QuizQ = { q: string; opts: [string, string, string, string]; correct: number; explanation: string };

const emptyQ = (): QuizQ => ({ q: '', opts: ['', '', '', ''], correct: 0, explanation: '' });

const empty = {
  title: '', slug: '', content: '', featuredImage: '',
  quizQuestions: [] as QuizQ[],
  tags: '', authorName: '',
  categories: [] as string[], publishStatus: 'draft' as 'draft' | 'published',
  publishedAt: '',
  metaTitle: '', metaDescription: '', metaImage: '',
};

export default function BlogsPage() {
  const [items, setItems] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Ref[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [form, setForm] = useState(empty);
  const [del, setDel] = useState<Blog | null>(null);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagOpen, setTagOpen] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = useCallback(async (p = 1, q = '', cat = '', from = '', to = '') => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const [bR, cR] = await Promise.all([
        fetch(`/api/blogs?page=${p}&search=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}&dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}`, { headers }),
        fetch('/api/blog-categories', { headers }),
      ]);
      const [b, c] = await Promise.all([bR.json(), cR.json()]);
      if (b.success) {
        setItems(b.data.items);
        setPage(b.data.page);
        setPages(b.data.pages);
        setTotal(b.data.total);
      }
      if (c.success) setCategories(c.data);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void load(1, search, category, dateFrom, dateTo); }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load, search, category, dateFrom, dateTo]);

  const goToPage = (p: number) => { void load(p, search, category, dateFrom, dateTo); };

  const flash = (msg: string) => { setOk(msg); setTimeout(() => setOk(''), 3000); };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, publishedAt: todayInput() });
    setCategoryQuery('');
    setCategoryOpen(false);
    setTagInput('');
    setTagOpen(false);
    setErr('');
    setShowModal(true);
  };
  const openEdit = async (item: Blog) => {
    let full = item;
    try {
      const r = await fetch(`/api/blogs/${item._id}`, { headers: h });
      const d = await r.json();
      if (d.success) full = d.data;
    } catch { /* fall back to the list row (content may be blank) */ }
    setEditing(full);
    setForm({
      title: full.title, slug: full.slug, content: full.content || '', featuredImage: full.featuredImage,
      quizQuestions: (full as any).quizQuestions?.length
        ? (full as any).quizQuestions.map((q: any) => ({
            q: q.q || '', opts: [q.opts?.[0]||'', q.opts?.[1]||'', q.opts?.[2]||'', q.opts?.[3]||''] as [string,string,string,string],
            correct: q.correct ?? 0, explanation: q.explanation || '',
          }))
        : [],
      tags: full.tags?.join(', ') || '', authorName: full.authorName || '',
      categories: full.categories?.map(category => category._id) || (full.category?._id ? [full.category._id] : []),
      publishStatus: full.publishStatus,
      publishedAt: toDateInput(full.publishedAt ?? full.createdAt),
      metaTitle: full.metaTitle,
      metaDescription: full.metaDescription, metaImage: full.metaImage,
    });
    setCategoryQuery('');
    setCategoryOpen(false);
    setTagInput('');
    setTagOpen(false);
    setErr(''); setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setErr(''); setSaving(true);
    try {
      const payload = { ...form, category: form.categories[0] || null };
      const url = editing ? `/api/blogs/${editing._id}` : '/api/blogs';
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.success) { flash(d.message); setShowModal(false); load(page, search, category, dateFrom, dateTo); }
      else setErr(d.error || 'Something went wrong');
    } finally { setSaving(false); }
  };

  const tagPreview = form.tags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 12);

  const selectedCategories = categories.filter(category => form.categories.includes(category._id));
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categoryQuery.trim().toLowerCase())
  );
  const existingTags = [...new Set(
    items.flatMap(item => item.tags || [])
      .map(tag => tag.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
  const suggestedTags = existingTags.filter(tag =>
    !tagPreview.some(selected => selected.toLocaleLowerCase() === tag.toLocaleLowerCase()) &&
    tag.toLocaleLowerCase().includes(tagInput.trim().toLocaleLowerCase())
  ).slice(0, 10);

  const setTags = (tags: string[]) => {
    const uniqueTags = new Map<string, string>();
    tags.forEach(tag => {
      const cleanTag = tag.replace(/\s+/g, ' ').trim();
      if (!cleanTag) return;
      const key = cleanTag.toLocaleLowerCase();
      if (!uniqueTags.has(key)) uniqueTags.set(key, cleanTag);
    });
    setForm(current => ({ ...current, tags: [...uniqueTags.values()].slice(0, 12).join(', ') }));
  };

  const addTags = (value: string) => {
    const nextTags = value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    if (nextTags.length === 0) return;
    setTags([...tagPreview, ...nextTags]);
    setTagInput('');
    setTagOpen(false);
  };

  const removeTag = (tag: string) => setTags(tagPreview.filter(item => item !== tag));

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    addTags(tagInput);
  };

  const handleTagPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (!text.includes(',')) return;
    event.preventDefault();
    addTags(text);
  };

  const toggleCategory = (categoryId: string) => {
    setForm(current => ({
      ...current,
      categories: current.categories.includes(categoryId)
        ? current.categories.filter(id => id !== categoryId)
        : [...current.categories, categoryId],
    }));
  };

  const removeCategory = (categoryId: string) => {
    setForm(current => ({
      ...current,
      categories: current.categories.filter(id => id !== categoryId),
    }));
  };

  const closeCategoryDropdown = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setCategoryOpen(false);
  };

  const closeTagDropdown = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setTagOpen(false);
  };

  const remove = async () => {
    if (!del) return; setSaving(true);
    try {
      const r = await fetch(`/api/blogs/${del._id}`, { method: 'DELETE', headers: h });
      const d = await r.json();
      if (d.success) { flash('Blog deleted'); setDel(null); load(page, search, category, dateFrom, dateTo); }
      else { setErr(d.error || 'Delete failed'); setDel(null); }
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h4>Blogs</h4>
          <p>Manage blog posts organized by category</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Blog</button>
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
            placeholder="Search blogs by title..."
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
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
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
        {(dateFrom || dateTo) && (
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => { setDateFrom(''); setDateTo(''); }}
          >Clear dates</button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">✍️</div><p>{search ? `No blogs match “${search}”.` : 'No blogs yet. Write your first post.'}</p></div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr><th>Title</th><th>Tags</th><th>Categories</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td className="fw-semibold" style={{ maxWidth: 300 }}>
                      <div className="text-truncate">{item.title}</div>
                      <code style={{ fontSize: 11, color: 'var(--muted)' }}>{item.slug}</code>
                    </td>
                    <td style={{ maxWidth: 240 }}>
                      <div className="blog-admin-tags">
                        {(item.tags || []).slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}
                        {(item.tags || []).length > 3 && <span>+{item.tags.length - 3}</span>}
                        {(item.tags || []).length === 0 && <span className="is-empty">No tags</span>}
                      </div>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <div className="blog-admin-tags">
                        {(item.categories?.length ? item.categories : item.category ? [item.category] : []).map(category => <span key={category._id}>{category.name}</span>)}
                        {!item.categories?.length && !item.category && <span className="is-empty">No category</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${item.publishStatus === 'published' ? 'bg-success' : 'bg-secondary'}`}>
                        {item.publishStatus}
                      </span>
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
                <h5 className="modal-title">{editing ? 'Edit Blog Post' : 'New Blog Post'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {err && <div className="alert alert-danger mb-3">{err}</div>}
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Title <span className="text-danger">*</span></label>
                    <input className="form-control" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) })}
                      placeholder="Blog post title..." />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Slug</label>
                    <input className="form-control" value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                    <div className="form-text">Auto-generated</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Blog Categories</label>
                    <div className={`multi-picker${categoryOpen ? ' is-open' : ''}`} onBlur={closeCategoryDropdown}>
                      <div
                        role="button"
                        tabIndex={0}
                        className="multi-picker-toggle"
                        onClick={() => setCategoryOpen(open => !open)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return;
                          event.preventDefault();
                          setCategoryOpen(open => !open);
                        }}
                        aria-expanded={categoryOpen}
                      >
                        {selectedCategories.length > 0 ? (
                          selectedCategories.map(category => (
                            <span className="multi-chip" key={category._id}>
                              {category.name}
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(event) => { event.stopPropagation(); removeCategory(category._id); }}
                                onKeyDown={(event) => {
                                  if (event.key !== 'Enter' && event.key !== ' ') return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  removeCategory(category._id);
                                }}
                                aria-label={`Remove ${category.name}`}
                              >
                                ×
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="multi-picker-placeholder">Choose blog categories</span>
                        )}
                        <span className="multi-picker-caret" aria-hidden="true">⌄</span>
                      </div>
                      {categoryOpen && (
                        <div className="multi-picker-dropdown">
                          <input
                            className="multi-picker-search"
                            value={categoryQuery}
                            onChange={(e) => setCategoryQuery(e.target.value)}
                            placeholder="Search categories..."
                            autoFocus
                          />
                          <div className="multi-picker-menu">
                            {filteredCategories.length > 0 ? (
                              filteredCategories.map(category => {
                                const checked = form.categories.includes(category._id);
                                return (
                                  <button
                                    type="button"
                                    className={`multi-picker-option${checked ? ' selected' : ''}`}
                                    key={category._id}
                                    onClick={() => toggleCategory(category._id)}
                                  >
                                    <span className="multi-picker-check" aria-hidden="true">{checked ? '✓' : ''}</span>
                                    <span>{category.name}</span>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="multi-picker-empty">No categories found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="form-text">Search and click categories to add or remove them.</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Publish Status</label>
                    <select className="form-select" value={form.publishStatus}
                      onChange={(e) => setForm({ ...form, publishStatus: e.target.value as 'draft' | 'published' })}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Publish Date</label>
                    <input type="date" className="form-control" value={form.publishedAt}
                      onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} />
                    <div className="form-text">Date shown on the site (AEST/AEDT)</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Author Name</label>
                    <input
                      className="form-control"
                      value={form.authorName}
                      onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                      placeholder="Analyst or writer name"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Tags</label>
                    <div className={`tag-picker${tagOpen ? ' is-open' : ''}`} onBlur={closeTagDropdown}>
                      <div className="tag-input-box">
                      {tagPreview.map(tag => (
                        <span className="multi-chip tag-chip" key={tag}>
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>×</button>
                        </span>
                      ))}
                      <input
                        value={tagInput}
                        onFocus={() => setTagOpen(true)}
                        onChange={(e) => { setTagInput(e.target.value); setTagOpen(true); }}
                        onKeyDown={handleTagKeyDown}
                        onPaste={handleTagPaste}
                        onBlur={() => addTags(tagInput)}
                        placeholder={tagPreview.length ? 'Add another tag' : 'Type tag and press Enter'}
                      />
                      </div>
                      {tagOpen && suggestedTags.length > 0 && (
                        <div className="tag-suggestion-menu">
                          {suggestedTags.map(tag => (
                            <button
                              type="button"
                              className="tag-suggestion-option"
                              key={tag}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => addTags(tag)}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-12">
                    <ImageUpload label="Featured Image" value={form.featuredImage} onChange={(url) => setForm({ ...form, featuredImage: url })} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Content</label>
                    <TinyEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} />
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

                  {/* ── Quiz Builder ─────────────────────────────── */}
                  <div className="col-12"><hr className="my-1" /><div className="form-section-title">Quiz — Test Your Knowledge</div></div>
                  <div className="col-12">
                    <div className="form-text mb-2">Optional. Add multiple-choice questions shown after the article.</div>
                    {form.quizQuestions.map((qItem, qi) => (
                      <div key={qi} className="quiz-builder-question">
                        <div className="quiz-builder-qhead">
                          <span className="quiz-builder-qnum">Q{qi + 1}</span>
                          <button type="button" className="btn btn-sm btn-outline-danger ms-auto"
                            onClick={() => setForm(f => ({ ...f, quizQuestions: f.quizQuestions.filter((_, i) => i !== qi) }))}>
                            Remove
                          </button>
                        </div>
                        <input className="form-control mb-2" placeholder="Question text…" value={qItem.q}
                          onChange={e => setForm(f => { const qs = [...f.quizQuestions]; qs[qi] = { ...qs[qi], q: e.target.value }; return { ...f, quizQuestions: qs }; })} />
                        <div className="row g-2 mb-2">
                          {(['A','B','C','D'] as const).map((lbl, oi) => (
                            <div className="col-md-6" key={lbl}>
                              <div className="input-group">
                                <span className="input-group-text">{lbl}</span>
                                <input className="form-control" placeholder={`Option ${lbl}`} value={qItem.opts[oi]}
                                  onChange={e => setForm(f => {
                                    const qs = [...f.quizQuestions];
                                    const opts = [...qs[qi].opts] as [string,string,string,string];
                                    opts[oi] = e.target.value;
                                    qs[qi] = { ...qs[qi], opts };
                                    return { ...f, quizQuestions: qs };
                                  })} />
                                <div className="input-group-text" title="Mark as correct">
                                  <input type="radio" name={`correct-${qi}`} checked={qItem.correct === oi}
                                    onChange={() => setForm(f => { const qs = [...f.quizQuestions]; qs[qi] = { ...qs[qi], correct: oi }; return { ...f, quizQuestions: qs }; })} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <input className="form-control" placeholder="Explanation (shown after answer)…" value={qItem.explanation}
                          onChange={e => setForm(f => { const qs = [...f.quizQuestions]; qs[qi] = { ...qs[qi], explanation: e.target.value }; return { ...f, quizQuestions: qs }; })} />
                      </div>
                    ))}
                    <button type="button" className="btn btn-outline-secondary btn-sm mt-2"
                      onClick={() => setForm(f => ({ ...f, quizQuestions: [...f.quizQuestions, emptyQ()] }))}>
                      + Add Question
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-2" />}
                  {editing ? 'Save Changes' : 'Publish Blog'}
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
              <div className="modal-header"><h5 className="modal-title text-danger">Delete Blog</h5><button className="btn-close" onClick={() => setDel(null)} /></div>
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
