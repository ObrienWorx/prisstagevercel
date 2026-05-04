'use client';

import { useEffect, useState, useCallback } from 'react';

interface Product { _id: string; name: string; durationType: string; durationValue: number; regularPrice: number; salePrice: number | null; }
interface UserProd { _id: string; product: Product; startDate: string; expiryDate: string; isActive: boolean; order?: { orderNumber: string; pricePaid: number; }; }
interface Sub { _id: string; name: string; email: string; phone: string; isActive: boolean; createdAt: string; }

const emptyForm = { name: '', email: '', password: '', phone: '', isActive: true };
const emptyAssign = { productId: '', pricePaid: '', paymentGateway: 'Manual', paymentStatus: 'completed', startDate: '' };

export default function SubscribersPage() {
  const [items, setItems] = useState<Sub[]>([]); const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [showModal, setShowModal] = useState(false); const [editing, setEditing] = useState<Sub | null>(null);
  const [form, setForm] = useState(emptyForm); const [del, setDel] = useState<Sub | null>(null);
  const [viewSub, setViewSub] = useState<Sub | null>(null);
  const [subProducts, setSubProducts] = useState<UserProd[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState(emptyAssign);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sR, pR] = await Promise.all([fetch('/api/subscribers', { headers: h }), fetch('/api/products', { headers: h })]);
      const [s, p] = await Promise.all([sR.json(), pR.json()]);
      if (s.success) setItems(s.data);
      if (p.success) setProducts(p.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const flash = (m: string) => { setOk(m); setTimeout(() => setOk(''), 3000); };
  const openCreate = () => { setEditing(null); setForm(emptyForm); setErr(''); setShowModal(true); };
  const openEdit = (x: Sub) => {
    setEditing(x); setForm({ name: x.name, email: x.email, password: '', phone: x.phone, isActive: x.isActive });
    setErr(''); setShowModal(true);
  };

  const viewProducts = async (sub: Sub) => {
    setViewSub(sub);
    const r = await fetch(`/api/subscribers/${sub._id}/products`, { headers: h });
    const d = await r.json();
    if (d.success) setSubProducts(d.data);
  };

  const save = async () => {
    if (!form.name || !form.email) { setErr('Name and email required'); return; }
    if (!editing && !form.password) { setErr('Password required'); return; }
    setErr(''); setSaving(true);
    try {
      const url = editing ? `/api/subscribers/${editing._id}` : '/api/subscribers';
      const payload: Record<string, unknown> = { name: form.name, email: form.email, phone: form.phone, isActive: form.isActive };
      if (form.password) payload.password = form.password;
      if (!editing) payload.password = form.password;
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.success) { flash(d.message); setShowModal(false); loadAll(); } else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!del) return; setSaving(true);
    try { await fetch(`/api/subscribers/${del._id}`, { method: 'DELETE', headers: h }); flash('Deleted'); setDel(null); loadAll(); } finally { setSaving(false); }
  };

  const assignProduct = async () => {
    if (!assignForm.productId) { setErr('Select a product'); return; }
    if (!viewSub) return;
    setErr(''); setSaving(true);
    try {
      const r = await fetch(`/api/subscribers/${viewSub._id}/products`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ ...assignForm, pricePaid: Number(assignForm.pricePaid) || 0 }),
      });
      const d = await r.json();
      if (d.success) { flash('Product assigned'); setShowAssign(false); setAssignForm(emptyAssign); viewProducts(viewSub); }
      else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };

  const isExpired = (date: string) => new Date() > new Date(date);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text"><h4>Subscribers</h4><p>Frontend registered users and their product access</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Subscriber</button>
      </div>

      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}
      {err && !showModal && !viewSub && <div className="alert alert-danger mb-4">{err}</div>}

      <div className="card">
        {loading ? <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
          : items.length === 0 ? <div className="empty-state"><div className="empty-icon">👤</div><p>No subscribers yet.</p></div>
          : <div className="table-responsive"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
            {items.map((x) => (<tr key={x._id}>
              <td className="fw-semibold">{x.name}</td>
              <td style={{ color: 'var(--muted)' }}>{x.email}</td>
              <td style={{ color: 'var(--muted)' }}>{x.phone || '—'}</td>
              <td><span className={`badge ${x.isActive ? 'bg-success' : 'bg-danger'}`}>{x.isActive ? 'Active' : 'Inactive'}</span></td>
              <td style={{ color: 'var(--muted)', fontSize: 12 }}>{fmtDate(x.createdAt)}</td>
              <td className="d-flex gap-1 flex-wrap">
                <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(x)}>Edit</button>
                <button className="btn btn-sm btn-outline-success" onClick={() => viewProducts(x)}>Products</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => setDel(x)}>Del</button>
              </td>
            </tr>))}
          </tbody></table></div>}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">{editing ? 'Edit Subscriber' : 'New Subscriber'}</h5><button className="btn-close" onClick={() => setShowModal(false)} /></div>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Full Name *</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="col-md-6"><label className="form-label">Email *</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="col-md-6"><label className="form-label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label><input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" /></div>
                <div className="col-12"><div className="form-check form-switch"><input type="checkbox" className="form-check-input" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><label className="form-check-label" htmlFor="isActive">Account Active</label></div></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-2" />}{editing ? 'Save' : 'Create'}</button></div>
          </div></div>
        </div>
      )}

      {/* View Products Drawer */}
      {viewSub && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable"><div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title mb-0">{viewSub.name} — Products</h5>
                <small className="text-muted">{viewSub.email}</small>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <button className="btn btn-sm btn-success" onClick={() => { setShowAssign(true); setErr(''); }}>+ Assign Product</button>
                <button className="btn-close" onClick={() => { setViewSub(null); setSubProducts([]); setShowAssign(false); setErr(''); }} />
              </div>
            </div>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}
              {showAssign && (
                <div className="card mb-3" style={{ border: '1px solid #3b82f6' }}>
                  <div className="card-body">
                    <div className="form-section-title mb-3">Assign Product</div>
                    <div className="row g-3">
                      <div className="col-md-6"><label className="form-label">Product *</label>
                        <select className="form-select" value={assignForm.productId} onChange={(e) => { const p = products.find(x => x._id === e.target.value); setAssignForm({ ...assignForm, productId: e.target.value, pricePaid: p ? String(p.salePrice ?? p.regularPrice) : '' }); }}>
                          <option value="">— Select Product —</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name} (${p.salePrice ?? p.regularPrice} / {p.durationValue} {p.durationType})</option>)}
                        </select>
                      </div>
                      <div className="col-md-3"><label className="form-label">Price Paid ($)</label><input type="number" min="0" className="form-control" value={assignForm.pricePaid} onChange={(e) => setAssignForm({ ...assignForm, pricePaid: e.target.value })} /></div>
                      <div className="col-md-3"><label className="form-label">Gateway</label>
                        <select className="form-select" value={assignForm.paymentGateway} onChange={(e) => setAssignForm({ ...assignForm, paymentGateway: e.target.value })}>
                          <option>Manual</option><option>Stripe</option><option>PayPal</option><option>Bank Transfer</option>
                        </select>
                      </div>
                      <div className="col-md-4"><label className="form-label">Payment Status</label>
                        <select className="form-select" value={assignForm.paymentStatus} onChange={(e) => setAssignForm({ ...assignForm, paymentStatus: e.target.value })}>
                          <option value="completed">Completed</option><option value="pending">Pending</option>
                        </select>
                      </div>
                      <div className="col-md-4"><label className="form-label">Start Date</label><input type="date" className="form-control" value={assignForm.startDate} onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })} /></div>
                      <div className="col-md-4 d-flex align-items-end gap-2">
                        <button className="btn btn-primary flex-grow-1" onClick={assignProduct} disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-1" />}Assign</button>
                        <button className="btn btn-secondary" onClick={() => setShowAssign(false)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {subProducts.length === 0 ? <div className="text-center p-4 text-muted">No products assigned.</div>
                : <div className="table-responsive"><table className="table table-sm"><thead><tr><th>Product</th><th>Start</th><th>Expiry</th><th>Status</th><th>Order</th></tr></thead><tbody>
                  {subProducts.map((up) => (
                    <tr key={up._id}>
                      <td className="fw-semibold">{up.product.name}</td>
                      <td style={{ fontSize: 12 }}>{fmtDate(up.startDate)}</td>
                      <td style={{ fontSize: 12, color: isExpired(up.expiryDate) ? '#ef4444' : '#16a34a' }}>{fmtDate(up.expiryDate)}{isExpired(up.expiryDate) && ' ⚠️'}</td>
                      <td><span className={`badge ${up.isActive && !isExpired(up.expiryDate) ? 'bg-success' : 'bg-danger'}`}>{up.isActive && !isExpired(up.expiryDate) ? 'Active' : 'Expired'}</span></td>
                      <td style={{ fontSize: 12 }}>{up.order?.orderNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody></table></div>}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => { setViewSub(null); setSubProducts([]); }}>Close</button></div>
          </div></div>
        </div>
      )}

      {del && (<div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}><div className="modal-dialog"><div className="modal-content"><div className="modal-header"><h5 className="modal-title text-danger">Delete Subscriber</h5><button className="btn-close" onClick={() => setDel(null)} /></div><div className="modal-body">Delete <strong>{del.name}</strong>? All their data will be removed.</div><div className="modal-footer"><button className="btn btn-secondary" onClick={() => setDel(null)}>Cancel</button><button className="btn btn-danger" onClick={remove} disabled={saving}>Delete</button></div></div></div></div>)}
    </div>
  );
}
