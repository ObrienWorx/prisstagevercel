'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { slugify } from '@/lib/slugify';
import dynamic from 'next/dynamic';
import ImageUpload from '@/components/ImageUpload';

const TinyEditor = dynamic(() => import('@/components/TinyEditor'), { ssr: false });

interface Plan {
  name: string;
  regularPrice: string;
  salePrice: string;
  durationValue: string;
  durationType: 'days' | 'months' | 'years';
}

interface Product {
  _id: string; name: string; slug: string;
  regularPrice: number; salePrice: number | null;
  saleOverPrice: number | null; saleOverContent: string;
  saleStartDate: string | null; saleEndDate: string | null;
  riskRating: string | null;
  durationType: 'days' | 'months' | 'years'; durationValue: number;
  plans: { name: string; regularPrice: number; salePrice: number | null; durationValue: number; durationType: string }[];
  shortDescription: string; fullDescription: string;
  features: string[];
  featuredImage: string; saleBanner: string;
  status: 'draft' | 'published'; isActive: boolean;
  metaTitle: string; metaDescription: string; metaImage: string;
}

const RISK_COLORS: Record<string, { bg: string; color: string }> = {
  'Low': { bg: '#f0fdf4', color: '#15803d' },
  'Medium': { bg: '#fefce8', color: '#a16207' },
  'High': { bg: '#fff7ed', color: '#c2410c' },
  'Very High': { bg: '#fef2f2', color: '#dc2626' },
};

const emptyPlan: Plan = { name: '', regularPrice: '', salePrice: '', durationValue: '1', durationType: 'months' };

const empty = {
  name: '', slug: '',
  plans: [{ ...emptyPlan }] as Plan[],
  saleStartDate: '', saleEndDate: '',
  saleOverPrice: '', saleOverContent: '',
  riskRating: '',
  shortDescription: '', fullDescription: '',
  features: [] as string[],
  featuredImage: '', saleBanner: '',
  status: 'published' as 'draft' | 'published', isActive: true,
  metaTitle: '', metaDescription: '', metaImage: '',
};

function toDateInput(d: string | null | undefined) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

function plansFromItem(item: Product): Plan[] {
  if (item.plans?.length > 0) {
    return item.plans.map(pl => ({
      name: pl.name ?? '',
      regularPrice: pl.regularPrice != null ? String(pl.regularPrice) : '',
      salePrice: pl.salePrice != null ? String(pl.salePrice) : '',
      durationValue: pl.durationValue != null ? String(pl.durationValue) : '1',
      durationType: (pl.durationType as 'days' | 'months' | 'years') ?? 'months',
    }));
  }
  // Migrate legacy single-plan data
  return [{
    name: '',
    regularPrice: item.regularPrice != null ? String(item.regularPrice) : '',
    salePrice: item.salePrice != null ? String(item.salePrice) : '',
    durationValue: item.durationValue != null ? String(item.durationValue) : '1',
    durationType: (item.durationType as 'days' | 'months' | 'years') ?? 'months',
  }];
}

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [del, setDel] = useState<Product | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/products', { headers: h });
      const d = await r.json();
      if (d.success) setItems(d.data);
    } finally { setLoading(false); }
  }, [h]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { load(); }, 0);
    return () => { window.clearTimeout(timeout); };
  }, [load]);

  const flash = (msg: string) => { setOk(msg); setTimeout(() => setOk(''), 3000); };

  const openCreate = () => { setEditing(null); setForm(empty); setErr(''); setShowModal(true); };
  const openEdit = (item: Product) => {
    setEditing(item);
    setForm({
      name: item.name ?? '', slug: item.slug ?? '',
      plans: plansFromItem(item),
      saleStartDate: toDateInput(item.saleStartDate),
      saleEndDate: toDateInput(item.saleEndDate),
      saleOverPrice: item.saleOverPrice != null ? String(item.saleOverPrice) : '',
      saleOverContent: item.saleOverContent ?? '',
      riskRating: item.riskRating ?? '',
      shortDescription: item.shortDescription ?? '', fullDescription: item.fullDescription ?? '',
      features: item.features ?? [],
      featuredImage: item.featuredImage ?? '', saleBanner: item.saleBanner ?? '',
      status: item.status ?? 'published', isActive: item.isActive ?? true,
      metaTitle: item.metaTitle ?? '', metaDescription: item.metaDescription ?? '', metaImage: item.metaImage ?? '',
    });
    setErr(''); setShowModal(true);
  };

  const updatePlan = (idx: number, field: keyof Plan, value: string) => {
    setForm(f => {
      const plans = [...f.plans];
      plans[idx] = { ...plans[idx], [field]: value };
      return { ...f, plans };
    });
  };
  const addPlan = () => setForm(f => ({ ...f, plans: [...f.plans, { ...emptyPlan }] }));
  const removePlan = (idx: number) => setForm(f => ({ ...f, plans: f.plans.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.name.trim()) { setErr('Name is required'); return; }
    if (form.plans.length === 0) { setErr('At least one plan is required'); return; }
    for (let i = 0; i < form.plans.length; i++) {
      if (!form.plans[i].regularPrice) { setErr(`Plan ${i + 1}: Regular price is required`); return; }
      if (!form.plans[i].durationValue) { setErr(`Plan ${i + 1}: Duration is required`); return; }
    }
    setErr(''); setSaving(true);
    try {
      const payload = {
        ...form,
        plans: form.plans.map(pl => ({
          name: pl.name,
          regularPrice: Number(pl.regularPrice),
          salePrice: pl.salePrice !== '' ? Number(pl.salePrice) : null,
          durationValue: Number(pl.durationValue),
          durationType: pl.durationType,
        })),
        saleStartDate: form.saleStartDate || null,
        saleEndDate: form.saleEndDate || null,
        saleOverPrice: form.saleOverPrice !== '' ? Number(form.saleOverPrice) : null,
        riskRating: form.riskRating || null,
      };
      const url = editing ? `/api/products/${editing._id}` : '/api/products';
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(payload) });
      const text = await r.text();
      const d = text ? JSON.parse(text) : {};
      if (d.success) { flash(d.message); setShowModal(false); load(); }
      else setErr(d.error || `Server error (${r.status})`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Unexpected error — check console');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!del) return; setSaving(true);
    try {
      const r = await fetch(`/api/products/${del._id}`, { method: 'DELETE', headers: h });
      const d = await r.json();
      if (d.success) { flash('Product deleted'); setDel(null); load(); }
      else { setErr(d.error || 'Delete failed'); setDel(null); }
    } finally { setSaving(false); }
  };

  const isSaleActive = (item: Product) => {
    if (item.salePrice == null) return false;
    const now = new Date();
    if (item.saleStartDate && now < new Date(item.saleStartDate)) return false;
    if (item.saleEndDate && now > new Date(item.saleEndDate)) return false;
    return true;
  };

  const saleOfferPath = (slug: string) => `/subscribe/${slug}-limited-sale-offer`;
  const saleOfferUrl = (slug: string) => {
    if (typeof window === 'undefined') return saleOfferPath(slug);
    return `${window.location.origin}${saleOfferPath(slug)}`;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h4>Products / Packages</h4>
          <p>Manage subscription packages and access plans</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
      </div>

      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}
      {err && !showModal && <div className="alert alert-danger mb-4">{err}</div>}

      <div className="card">
        {loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📦</div><p>No products yet.</p></div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>Price</th><th>Plans</th><th>Sale Period</th>
                  <th>Risk</th><th>Publish</th><th>Active</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const onSale = isSaleActive(item);
                  const planCount = item.plans?.length ?? 0;
                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="fw-semibold">{item.name}</div>
                        <code style={{ fontSize: 11, color: 'var(--muted)' }}>{item.slug}</code>
                      </td>
                      <td>
                        <span className="fw-semibold" style={{ color: onSale ? '#059669' : '#1e293b' }}>
                          {onSale ? `$${item.salePrice!.toFixed(2)}` : `$${(item.regularPrice ?? 0).toFixed(2)}`}
                        </span>
                        {onSale && (
                          <s style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>${(item.regularPrice ?? 0).toFixed(2)}</s>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {planCount > 0 ? (
                          <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600 }}>
                            {planCount} plan{planCount > 1 ? 's' : ''}
                          </span>
                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {item.salePrice != null ? (
                          <div>
                            {item.saleStartDate || item.saleEndDate ? (
                              <div style={{ color: onSale ? '#15803d' : '#64748b' }}>
                                <div>{item.saleStartDate ? new Date(item.saleStartDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' }) : '—'}</div>
                                <div style={{ color: '#94a3b8' }}>to {item.saleEndDate ? new Date(item.saleEndDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : 'ongoing'}</div>
                              </div>
                            ) : (
                              <span style={{ color: '#15803d', fontSize: 11, fontWeight: 600 }}>Always on sale</span>
                            )}
                            {onSale && (
                              <div style={{ marginTop: 8 }}>
                                <div style={{ color: '#15803d', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                                  Sale Period Running
                                </div>
                                <a
                                  href={saleOfferPath(item.slug)}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ display: 'block', color: '#2563eb', fontSize: 11, lineHeight: 1.35, wordBreak: 'break-all', textDecoration: 'none' }}
                                  title={saleOfferUrl(item.slug)}
                                >
                                  {saleOfferUrl(item.slug)}
                                </a>
                              </div>
                            )}
                          </div>
                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td>
                        {item.riskRating ? (
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                            ...(RISK_COLORS[item.riskRating] ?? { bg: '#f8fafc', color: '#64748b' }),
                          }}>{item.riskRating}</span>
                        ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                      </td>
                      <td><span className={`badge ${item.status === 'published' ? 'bg-success' : 'bg-secondary'}`}>{item.status ?? 'draft'}</span></td>
                      <td><span className={`badge ${item.isActive ? 'bg-success' : 'bg-danger'}`}>{item.isActive ? 'Yes' : 'No'}</span></td>
                      <td className="d-flex">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(item)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setDel(item)}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
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
                <h5 className="modal-title">{editing ? 'Edit Product' : 'New Product'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {err && <div className="alert alert-danger mb-3">{err}</div>}
                <div className="row g-3">

                  {/* Name + Slug */}
                  <div className="col-md-8">
                    <label className="form-label">Product Name <span className="text-danger">*</span></label>
                    <input className="form-control" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
                      placeholder="e.g. Premium Annual Plan" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Slug</label>
                    <input className="form-control" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  </div>

                  {/* Plans */}
                  <div className="col-12"><hr className="my-1" /><div className="form-section-title">Plans <span className="text-muted fw-normal" style={{ fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>— add multiple pricing options</span></div></div>
                  <div className="col-12">
                    <div className="d-flex flex-column gap-2">
                      {form.plans.map((pl, idx) => (
                        <div key={idx} className="p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div className="row g-2 align-items-end">
                            <div className="col-md-3">
                              <label className="form-label" style={{ fontSize: 12 }}>Plan Name <span className="text-muted">(optional)</span></label>
                              <input className="form-control form-control-sm" value={pl.name}
                                onChange={e => updatePlan(idx, 'name', e.target.value)}
                                placeholder={`e.g. Monthly, Annual…`} />
                            </div>
                            <div className="col-md-2">
                              <label className="form-label" style={{ fontSize: 12 }}>Regular Price <span className="text-danger">*</span></label>
                              <div className="input-group input-group-sm">
                                <span className="input-group-text">$</span>
                                <input type="number" min="0" step="0.01" className="form-control" value={pl.regularPrice}
                                  onChange={e => updatePlan(idx, 'regularPrice', e.target.value)} placeholder="0.00" />
                              </div>
                            </div>
                            <div className="col-md-2">
                              <label className="form-label" style={{ fontSize: 12 }}>Sale Price <span className="text-muted">(optional)</span></label>
                              <div className="input-group input-group-sm">
                                <span className="input-group-text">$</span>
                                <input type="number" min="0" step="0.01" className="form-control" value={pl.salePrice}
                                  onChange={e => updatePlan(idx, 'salePrice', e.target.value)} placeholder="blank = no sale" />
                              </div>
                              {pl.salePrice && pl.regularPrice && Number(pl.salePrice) < Number(pl.regularPrice) && (
                                <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>
                                  Save ${(Number(pl.regularPrice) - Number(pl.salePrice)).toFixed(2)}
                                </div>
                              )}
                            </div>
                            <div className="col-md-2">
                              <label className="form-label" style={{ fontSize: 12 }}>Duration <span className="text-danger">*</span></label>
                              <input type="number" min="1" className="form-control form-control-sm" value={pl.durationValue}
                                onChange={e => updatePlan(idx, 'durationValue', e.target.value)} placeholder="1" />
                            </div>
                            <div className="col-md-2">
                              <label className="form-label" style={{ fontSize: 12 }}>Type</label>
                              <select className="form-select form-select-sm" value={pl.durationType}
                                onChange={e => updatePlan(idx, 'durationType', e.target.value)}>
                                <option value="days">Days</option>
                                <option value="months">Months</option>
                                <option value="years">Years</option>
                              </select>
                            </div>
                            <div className="col-md-1 d-flex align-items-end">
                              {form.plans.length > 1 && (
                                <button type="button" className="btn btn-sm btn-outline-danger w-100"
                                  onClick={() => removePlan(idx)}>✕</button>
                              )}
                            </div>
                          </div>
                          {pl.regularPrice && pl.durationValue && (
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 8 }}>
                              {pl.name && <strong>{pl.name} — </strong>}
                              {pl.salePrice && Number(pl.salePrice) < Number(pl.regularPrice)
                                ? <><span style={{ color: '#16a34a', fontWeight: 700 }}>${pl.salePrice}</span> <s style={{ color: '#94a3b8' }}>${pl.regularPrice}</s></>
                                : <span style={{ fontWeight: 700 }}>${pl.regularPrice}</span>
                              }
                              {' '}/ {pl.durationValue} {pl.durationType}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-primary mt-2"
                      onClick={addPlan}>+ Add Plan</button>
                  </div>

                  {/* Sale Period */}
                  <div className="col-12">
                    <div className="p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="form-section-title mb-2" style={{ marginBottom: 8 }}>
                        Sale Period <span className="text-muted fw-normal" style={{ fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>— leave blank to always show sale price</span>
                      </div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Sale Start Date</label>
                          <input type="date" className="form-control" value={form.saleStartDate}
                            onChange={(e) => setForm({ ...form, saleStartDate: e.target.value })} />
                          <div className="form-text">Sale activates from this date</div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Sale End Date</label>
                          <input type="date" className="form-control" value={form.saleEndDate}
                            onChange={(e) => setForm({ ...form, saleEndDate: e.target.value })} />
                          <div className="form-text">Sale expires after this date</div>
                        </div>
                      </div>
                      <div className="col-md-12 mt-3">
                        <ImageUpload label="Sale Banner" value={form.saleBanner} onChange={(url) => setForm({ ...form, saleBanner: url })} />
                        <div className="form-text">Shown in the report sidebar and on the product page to promote this plan.</div>
                      </div>
                      <div className="col-md-4 mt-3">
                        <label className="form-label">Sale Over Price</label>
                        <div className="input-group">
                          <span className="input-group-text">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control"
                            value={form.saleOverPrice}
                            onChange={(e) => setForm({ ...form, saleOverPrice: e.target.value })}
                            placeholder="Shown after sale ends"
                          />
                        </div>
                        <div className="form-text">Used only on the limited sale page after the sale period is over.</div>
                      </div>
                      <div className="col-12 mt-3">
                        <label className="form-label">After Sale Over Content</label>
                        <TinyEditor value={form.saleOverContent} onChange={(v) => setForm({ ...form, saleOverContent: v })} />
                      </div>
                    </div>
                  </div>

                  {/* Risk Rating */}
                  <div className="col-12"><hr className="my-1" /><div className="form-section-title">Risk &amp; Classification</div></div>
                  <div className="col-md-4">
                    <label className="form-label">Risk Rating</label>
                    <select className="form-select" value={form.riskRating}
                      onChange={(e) => setForm({ ...form, riskRating: e.target.value })}>
                      <option value="">— Not specified —</option>
                      <option value="Low">🟢 Low</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="High">🟠 High</option>
                      <option value="Very High">🔴 Very High</option>
                    </select>
                    <div className="form-text">Displayed on the product subscribe page</div>
                  </div>
                  {form.riskRating && (
                    <div className="col-md-8 d-flex align-items-end">
                      <div className="p-3 rounded w-100" style={{ background: RISK_COLORS[form.riskRating]?.bg ?? '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13 }}>
                        <strong style={{ color: RISK_COLORS[form.riskRating]?.color }}>Risk Rating: {form.riskRating}</strong>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                          {form.riskRating === 'Low' && 'Conservative investment — suitable for cautious investors.'}
                          {form.riskRating === 'Medium' && 'Balanced investment — moderate risk and return potential.'}
                          {form.riskRating === 'High' && 'Growth investment — higher risk with higher return potential.'}
                          {form.riskRating === 'Very High' && 'Speculative investment — significant risk, only for experienced investors.'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Descriptions */}
                  <div className="col-12"><hr className="my-1" /><div className="form-section-title">Description</div></div>
                  <div className="col-12">
                    <label className="form-label">Short Description</label>
                    <textarea className="form-control" rows={2} value={form.shortDescription}
                      onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                      placeholder="Brief summary shown in cards and listings..." />
                  </div>

                  {/* Features */}
                  <div className="col-12"><hr className="my-1" /><div className="form-section-title">Features / What&apos;s Included</div>
                    <div className="d-flex flex-column gap-2 mb-2">
                      {form.features.map((f, i) => (
                        <div key={i} className="d-flex gap-2 align-items-center">
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>✓</span>
                          <input className="form-control form-control-sm" value={f}
                            onChange={(e) => { const u = [...form.features]; u[i] = e.target.value; setForm({ ...form, features: u }); }}
                            placeholder={`Feature ${i + 1}...`} />
                          <button type="button" className="btn btn-sm btn-outline-danger px-2"
                            onClick={() => setForm({ ...form, features: form.features.filter((_, idx) => idx !== i) })}>✕</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-primary"
                      onClick={() => setForm({ ...form, features: [...form.features, ''] })}>+ Add Feature</button>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Full Description</label>
                    <TinyEditor value={form.fullDescription} onChange={(v) => setForm({ ...form, fullDescription: v })} />
                  </div>

                  {/* Images */}
                  <div className="col-12"><hr className="my-1" /><div className="form-section-title">Images</div></div>
                  <div className="col-md-12">
                    <ImageUpload label="Featured Image" value={form.featuredImage} onChange={(url) => setForm({ ...form, featuredImage: url })} />
                  </div>

                  {/* Status */}
                  <div className="col-12"><hr className="my-1" /><div className="form-section-title">Visibility</div></div>
                  <div className="col-md-4">
                    <label className="form-label">Publish Status</label>
                    <select className="form-select" value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <div className="form-check form-switch mb-2">
                      <input type="checkbox" className="form-check-input" id="isActive" checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                      <label className="form-check-label" htmlFor="isActive">Product Active (available for purchase)</label>
                    </div>
                  </div>

                  {/* SEO */}
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
                  {editing ? 'Save Changes' : 'Create Product'}
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
              <div className="modal-header"><h5 className="modal-title text-danger">Delete Product</h5><button className="btn-close" onClick={() => setDel(null)} /></div>
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
