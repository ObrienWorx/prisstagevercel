'use client';

import { useEffect, useState, useCallback } from 'react';
import Pagination from '@/components/Pagination';

const PER_PAGE = 20;

interface Product { _id: string; name: string; durationType: string; durationValue: number; regularPrice: number; salePrice: number | null; }
interface UserProd { _id: string; product: Product; startDate: string; expiryDate: string; isActive: boolean; order?: { orderNumber: string; pricePaid: number; }; }
interface Sub { _id: string; name: string; email: string; phone: string; isActive: boolean; createdAt: string; plainPassword?: string; }
interface ActivityLog { _id: string; action: string; field?: string; oldValue?: string; newValue?: string; performedBy: 'admin' | 'user'; performedByEmail: string; createdAt: string; }

function calcEndDate(startDate: string, durationValue: string, durationType: string): string {
  if (!startDate || !durationValue) return '';
  const d = new Date(startDate);
  const n = parseInt(durationValue, 10);
  if (isNaN(n) || n <= 0) return '';
  if (durationType === 'months') d.setMonth(d.getMonth() + n);
  else if (durationType === 'days') d.setDate(d.getDate() + n);
  else if (durationType === 'years') d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
}

const getEmptyLine = () => ({
  productId: '', pricePaid: '',
  startDate: new Date().toISOString().slice(0, 10),
  durationValue: '12', durationType: 'months',
});

const getEmptyAssign = () => ({
  paymentGateway: 'Manual', paymentStatus: 'completed',
  lines: [getEmptyLine()],
});

const emptyForm = { name: '', email: '', password: '', phone: '', isActive: true };

export default function SubscribersPage() {
  const [items, setItems]           = useState<Sub[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');
  const [ok, setOk]                 = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<Sub | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [del, setDel]               = useState<Sub | null>(null);
  const [viewSub, setViewSub]       = useState<Sub | null>(null);
  const [subProducts, setSubProducts] = useState<UserProd[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState<{ paymentGateway: string; paymentStatus: string; lines: ReturnType<typeof getEmptyLine>[] }>(getEmptyAssign());
  const [editProd, setEditProd]     = useState<UserProd | null>(null);
  const [editForm, setEditForm]     = useState({ startDate: '', durationValue: '12', durationType: 'months', isActive: true });
  const [showPwd, setShowPwd]       = useState(false);
  const [activitySub, setActivitySub]   = useState<Sub | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs]   = useState(false);
  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [pages, setPages]               = useState(1);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      const r = await fetch(`/api/subscribers?${params.toString()}`, { headers: h });
      const d = await r.json();
      if (d.success) { setItems(d.data); setTotal(d.total ?? d.data.length); setPages(d.pages ?? 1); }
    } finally { setLoading(false); }
  }, [page, debouncedSearch]);

  // debounce the search box; reset to page 1 on a new query
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadSubscribers(); }, [loadSubscribers]);

  // product catalog loads once (for the assign-product dropdowns)
  useEffect(() => {
    fetch('/api/products', { headers: h }).then(r => r.json()).then(d => { if (d.success) setProducts(d.data); }).catch(() => {});
  }, []);

  // keep page in range when the result set shrinks (e.g. after a delete)
  useEffect(() => { if (page > pages) setPage(pages); }, [pages, page]);

  const flash = (m: string) => { setOk(m); setTimeout(() => setOk(''), 3000); };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowPwd(false); setErr(''); setShowModal(true); };
  const openEdit = (x: Sub) => {
    setEditing(x);
    setForm({ name: x.name, email: x.email, password: x.plainPassword || '', phone: x.phone, isActive: x.isActive });
    setShowPwd(false); setErr(''); setShowModal(true);
  };

  const loadSubProducts = async (sub: Sub) => {
    const r = await fetch(`/api/subscribers/${sub._id}/products`, { headers: h });
    const d = await r.json();
    if (d.success) setSubProducts(d.data);
  };

  const openActivity = async (sub: Sub) => {
    setActivitySub(sub);
    setActivityLogs([]);
    setLoadingLogs(true);
    try {
      const r = await fetch(`/api/subscribers/${sub._id}/activity`, { headers: h });
      const d = await r.json();
      if (d.success) setActivityLogs(d.data);
    } finally { setLoadingLogs(false); }
  };

  const viewProducts = (sub: Sub) => {
    setViewSub(sub);
    setEditProd(null);
    setShowAssign(false);
    setErr('');
    loadSubProducts(sub);
  };

  const save = async () => {
    if (!form.name || !form.email) { setErr('Name and email required'); return; }
    if (!editing && !form.password) { setErr('Password required'); return; }
    setErr(''); setSaving(true);
    try {
      const url = editing ? `/api/subscribers/${editing._id}` : '/api/subscribers';
      const payload: Record<string, unknown> = { name: form.name, email: form.email, phone: form.phone, isActive: form.isActive };
      if (form.password) payload.password = form.password;
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.success) { flash(d.message || 'Saved'); setShowModal(false); loadSubscribers(); }
      else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!del) return; setSaving(true);
    try {
      await fetch(`/api/subscribers/${del._id}`, { method: 'DELETE', headers: h });
      flash('Deleted'); setDel(null); loadSubscribers();
    } finally { setSaving(false); }
  };

  const assignProduct = async () => {
    if (assignForm.lines.some(l => !l.productId)) { setErr('Select a product for each line'); return; }
    if (!viewSub) return;
    setErr(''); setSaving(true);
    try {
      for (const line of assignForm.lines) {
        const r = await fetch(`/api/subscribers/${viewSub._id}/products`, {
          method: 'POST', headers: h,
          body: JSON.stringify({
            productId:      line.productId,
            pricePaid:      Number(line.pricePaid) || 0,
            paymentGateway: assignForm.paymentGateway,
            paymentStatus:  assignForm.paymentStatus,
            startDate:      line.startDate,
            durationValue:  Number(line.durationValue),
            durationType:   line.durationType,
          }),
        });
        const d = await r.json();
        if (!d.success) { setErr(d.error || 'Error assigning product'); setSaving(false); return; }
      }
      flash(`${assignForm.lines.length} product${assignForm.lines.length > 1 ? 's' : ''} assigned`);
      setShowAssign(false);
      setAssignForm(getEmptyAssign());
      loadSubProducts(viewSub);
    } finally { setSaving(false); }
  };

  const openEditProd = (up: UserProd) => {
    setEditProd(up);
    setShowAssign(false);
    setErr('');
    setEditForm({ startDate: up.startDate.slice(0, 10), durationValue: '12', durationType: 'months', isActive: up.isActive });
  };

  const saveEditProd = async () => {
    if (!editProd || !viewSub) return;
    setErr(''); setSaving(true);
    try {
      const r = await fetch(`/api/subscribers/${viewSub._id}/products/${editProd._id}`, {
        method: 'PUT', headers: h,
        body: JSON.stringify({
          startDate:     editForm.startDate,
          durationValue: Number(editForm.durationValue),
          durationType:  editForm.durationType,
          isActive:      editForm.isActive,
        }),
      });
      const d = await r.json();
      if (d.success) { flash('Updated'); setEditProd(null); loadSubProducts(viewSub); }
      else { setErr(d.error || 'Error'); }
    } finally { setSaving(false); }
  };

  const isExpired = (date: string) => new Date() > new Date(date);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const actionLabel = (a: string) => ({ created: 'Account Created', password_changed: 'Password Changed', email_updated: 'Email Updated', phone_updated: 'Phone Updated', name_updated: 'Name Updated', status_changed: 'Status Changed' }[a] ?? a);

  const editEndDate = calcEndDate(editForm.startDate, editForm.durationValue, editForm.durationType);

  const updateLine = (i: number, patch: Partial<ReturnType<typeof getEmptyLine>>) => {
    const lines = assignForm.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l);
    setAssignForm({ ...assignForm, lines });
  };
  const addLine = () => setAssignForm({ ...assignForm, lines: [...assignForm.lines, getEmptyLine()] });
  const removeLine = (i: number) => setAssignForm({ ...assignForm, lines: assignForm.lines.filter((_, idx) => idx !== i) });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h4>Subscribers</h4>
          <p>Frontend registered users and their product access</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Subscriber</button>
      </div>

      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}
      {err && !showModal && !viewSub && <div className="alert alert-danger mb-4">{err}</div>}

      <div className="mb-3">
        <input
          className="form-control"
          style={{ maxWidth: 360 }}
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
        ) : total === 0 ? (
          debouncedSearch
            ? <div className="empty-state"><div className="empty-icon">🔍</div><p>No subscribers match “{debouncedSearch}”.</p></div>
            : <div className="empty-state"><div className="empty-icon">👤</div><p>No subscribers yet.</p></div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Password</th><th>Phone</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((x) => (
                  <tr key={x._id}>
                    <td className="fw-semibold">{x.name}</td>
                    <td className="text-muted">{x.email}</td>
                    <td className="font-monospace small">{x.plainPassword || '—'}</td>
                    <td className="text-muted">{x.phone || '—'}</td>
                    <td><span className={`badge ${x.isActive ? 'bg-success' : 'bg-danger'}`}>{x.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="text-muted small">{fmtDate(x.createdAt)}</td>
                    <td className="d-flex gap-1 flex-wrap">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(x)}>Edit</button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => openActivity(x)}>Activity</button>
                      <button className="btn btn-sm btn-outline-success" onClick={() => viewProducts(x)}>Products</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDel(x)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} pages={pages} total={total} onChange={setPage} />

      {/* ── Create / Edit Subscriber Modal ── */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header justify-content-between">
              <h5 className="modal-title">{editing ? 'Edit Subscriber' : 'New Subscriber'}</h5>
              <button className="btn-close" onClick={() => setShowModal(false)} />
            </div>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Full Name *</label>
                  <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="col-md-6"><label className="form-label">Email *</label>
                  <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="col-md-6"><label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="col-md-6">
                  <label className="form-label">{editing ? 'Password (leave blank to keep)' : 'Password *'}</label>
                  {editing && (
                    <div className="text-muted small mb-1">
                      Current: <span className="font-monospace">{editing.plainPassword || '—'}</span>
                    </div>
                  )}
                  <div className="input-group">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="form-control"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPwd(v => !v)}
                      tabIndex={-1}
                    >
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-check form-switch">
                    <input type="checkbox" className="form-check-input" id="isActive" checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    <label className="form-check-label" htmlFor="isActive">Account Active</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-2" />}
                {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </div></div>
        </div>
      )}

      {/* ── View / Manage Products Modal ── */}
      {viewSub && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable"><div className="modal-content">
            <div className="modal-header justify-content-between">
              <div>
                <h5 className="modal-title mb-0">{viewSub.name} — Assigned Products</h5>
                <small className="text-muted">{viewSub.email}</small>
              </div>
              <button className="btn-close" onClick={() => { setViewSub(null); setSubProducts([]); setShowAssign(false); setEditProd(null); setErr(''); }} />
            </div>

            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}


              {/* Assign Form */}
              {showAssign && (
                <div className="card mb-3 border-primary">
                  <div className="card-header d-flex align-items-center justify-content-between py-2 bg-primary bg-opacity-10">
                    <span className="fw-semibold" style={{ fontSize: 14 }}>Assign Product(s)</span>
                    <button className="btn-close" onClick={() => setShowAssign(false)} />
                  </div>
                  <div className="card-body">

                    {/* Shared payment fields */}
                    <div className="row g-3 mb-3 pb-3 border-bottom">
                      <div className="col-md-6">
                        <label className="form-label">Payment Gateway</label>
                        <select className="form-select" value={assignForm.paymentGateway}
                          onChange={(e) => setAssignForm({ ...assignForm, paymentGateway: e.target.value })}>
                          <option>Manual</option><option>Stripe</option><option>PayPal</option><option>Bank Transfer</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Payment Status</label>
                        <select className="form-select" value={assignForm.paymentStatus}
                          onChange={(e) => setAssignForm({ ...assignForm, paymentStatus: e.target.value })}>
                          <option value="completed">Completed</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </div>

                    {/* Product lines */}
                    {assignForm.lines.map((line, i) => {
                      const endDate = calcEndDate(line.startDate, line.durationValue, line.durationType);
                      return (
                        <div key={i} className="row g-2 align-items-end mb-2 pb-2 border-bottom border-light">
                          <div className="col-12 d-flex justify-content-between align-items-center">
                            <span className="fw-semibold small text-muted">Product {i + 1}</span>
                            {assignForm.lines.length > 1 && (
                              <button className="btn btn-sm btn-outline-danger" style={{ fontSize: 11 }} onClick={() => removeLine(i)}>✕ Remove</button>
                            )}
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Product *</label>
                            <select className="form-select" value={line.productId} onChange={(e) => {
                              const p = products.find(x => x._id === e.target.value);
                              updateLine(i, { productId: e.target.value, pricePaid: p ? String(p.salePrice ?? p.regularPrice) : '' });
                            }}>
                              <option value="">— Select Product —</option>
                              {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name} (${p.salePrice ?? p.regularPrice})</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Price Paid ($)</label>
                            <input type="number" min="0" className="form-control" value={line.pricePaid}
                              onChange={(e) => updateLine(i, { pricePaid: e.target.value })} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Start Date</label>
                            <input type="date" className="form-control" value={line.startDate}
                              onChange={(e) => updateLine(i, { startDate: e.target.value })} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Duration</label>
                            <div className="input-group">
                              <input type="number" min="1" className="form-control" placeholder="12"
                                value={line.durationValue}
                                onChange={(e) => updateLine(i, { durationValue: e.target.value })} />
                              <select className="form-select" value={line.durationType}
                                onChange={(e) => updateLine(i, { durationType: e.target.value })}
                                style={{ maxWidth: 90 }}>
                                <option value="days">Days</option>
                                <option value="months">Months</option>
                                <option value="years">Years</option>
                              </select>
                            </div>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">End Date</label>
                            <input type="date" className="form-control" value={endDate} readOnly
                              style={{ background: '#f8fafc', cursor: 'default' }} />
                          </div>
                        </div>
                      );
                    })}

                    <div className="d-flex gap-2 mt-3">
                      <button className="btn btn-sm btn-outline-primary" onClick={addLine}>+ Add Product</button>
                      <button className="btn btn-primary ms-auto" onClick={assignProduct} disabled={saving}>
                        {saving && <span className="spinner-border spinner-border-sm me-1" />}
                        Assign {assignForm.lines.length > 1 ? `${assignForm.lines.length} Products` : 'Product'}
                      </button>
                      <button className="btn btn-secondary" onClick={() => setShowAssign(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Product Assignment */}
              {editProd && (
                <div className="card mb-3 border-warning">
                  <div className="card-header d-flex align-items-center justify-content-between py-2 bg-warning bg-opacity-10">
                    <span className="fw-semibold" style={{ fontSize: 14 }}>
                      Edit Access: <em>{editProd.product.name}</em>
                    </span>
                    <button className="btn-close" onClick={() => setEditProd(null)} />
                  </div>
                  <div className="card-body">
                    <div className="text-muted small mb-3">
                      Current period: {fmtDate(editProd.startDate)} → {fmtDate(editProd.expiryDate)}
                    </div>
                    <div className="row g-3 align-items-end">
                      <div className="col-md-3">
                        <label className="form-label">New Start Date</label>
                        <input type="date" className="form-control" value={editForm.startDate}
                          onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Duration</label>
                        <div className="input-group">
                          <input type="number" min="1" className="form-control"
                            value={editForm.durationValue}
                            onChange={(e) => setEditForm({ ...editForm, durationValue: e.target.value })} />
                          <select className="form-select" value={editForm.durationType}
                            onChange={(e) => setEditForm({ ...editForm, durationType: e.target.value })}
                            style={{ maxWidth: 100 }}>
                            <option value="days">Days</option>
                            <option value="months">Months</option>
                            <option value="years">Years</option>
                          </select>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">New End Date (auto-calculated)</label>
                        <input type="date" className="form-control" value={editEndDate} readOnly
                          style={{ background: '#f8fafc', cursor: 'default' }} />
                      </div>
                      <div className="col-md-1">
                        <div className="form-check form-switch pt-2">
                          <input type="checkbox" className="form-check-input" id="editIsActive"
                            checked={editForm.isActive}
                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                          <label className="form-check-label small" htmlFor="editIsActive">Active</label>
                        </div>
                      </div>
                      <div className="col-md-2 d-flex gap-2">
                        <button className="btn btn-warning flex-grow-1" onClick={saveEditProd} disabled={saving}>
                          {saving && <span className="spinner-border spinner-border-sm me-1" />}Save
                        </button>
                        <button className="btn btn-secondary" onClick={() => setEditProd(null)}>✕</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Products Table */}
              {subProducts.length === 0 ? (
                <div className="text-center p-4 text-muted">No products assigned yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr><th>Product</th><th>Start</th><th>Expiry</th><th>Status</th><th>Order #</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {subProducts.map((up) => (
                        <tr key={up._id} className={editProd?._id === up._id ? 'table-warning' : ''}>
                          <td className="fw-semibold">{up.product.name}</td>
                          <td className="small text-muted">{fmtDate(up.startDate)}</td>
                          <td className="small" style={{ color: isExpired(up.expiryDate) ? '#ef4444' : '#16a34a' }}>
                            {fmtDate(up.expiryDate)}{isExpired(up.expiryDate) && ' ⚠️'}
                          </td>
                          <td>
                            <span className={`badge ${up.isActive && !isExpired(up.expiryDate) ? 'bg-success' : 'bg-danger'}`}>
                              {up.isActive && !isExpired(up.expiryDate) ? 'Active' : 'Expired'}
                            </span>
                          </td>
                          <td className="small text-muted">{up.order?.orderNumber || '—'}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-warning"
                              style={{ fontSize: 12 }}
                              onClick={() => openEditProd(up)}
                            >Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary"
                onClick={() => { setViewSub(null); setSubProducts([]); setShowAssign(false); setEditProd(null); }}>
                Close
              </button>
            </div>
          </div></div>
        </div>
      )}

      {/* ── Delete Subscriber Modal ── */}
      {del && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header justify-content-between">
              <h5 className="modal-title text-danger">Delete Subscriber</h5>
              <button className="btn-close" onClick={() => setDel(null)} />
            </div>
            <div className="modal-body">
              Delete <strong>{del.name}</strong>? All their data will be permanently removed.
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDel(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={remove} disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-2" />}Delete
              </button>
            </div>
          </div></div>
        </div>
      )}

      {/* ── Activity Log Modal ── */}
      {activitySub && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable"><div className="modal-content">
            <div className="modal-header justify-content-between">
              <div>
                <h5 className="modal-title mb-0">Activity Log — {activitySub.name}</h5>
                <small className="text-muted">{activitySub.email}</small>
              </div>
              <button className="btn-close" onClick={() => { setActivitySub(null); setActivityLogs([]); }} />
            </div>
            <div className="modal-body">
              {loadingLogs ? (
                <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center p-4 text-muted">No activity recorded yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr><th>When</th><th>Action</th><th>Was</th><th>Now</th><th>By</th></tr>
                    </thead>
                    <tbody>
                      {activityLogs.map(log => (
                        <tr key={log._id}>
                          <td className="small text-muted text-nowrap">{fmtDateTime(log.createdAt)}</td>
                          <td><span className="badge bg-secondary">{actionLabel(log.action)}</span></td>
                          <td className="small font-monospace text-muted">{log.oldValue || '—'}</td>
                          <td className="small font-monospace">{log.newValue || '—'}</td>
                          <td>
                            <span className={`badge ${log.performedBy === 'admin' ? 'bg-danger' : 'bg-info text-dark'}`}>
                              {log.performedBy === 'admin' ? 'Admin' : 'User'}
                            </span>
                            <div className="text-muted" style={{ fontSize: 11 }}>{log.performedByEmail}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setActivitySub(null); setActivityLogs([]); }}>Close</button>
            </div>
          </div></div>
        </div>
      )}
    </div>
  );
}
