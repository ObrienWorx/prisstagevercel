'use client';

import { useEffect, useState, useCallback } from 'react';

interface Sub { _id: string; name: string; email: string; }
interface Prod { _id: string; name: string; regularPrice: number; salePrice: number | null; }
interface Order {
  _id: string; orderNumber: string; subscriber: Sub; product: Prod;
  pricePaid: number; paymentStatus: string; orderStatus: string;
  purchaseDate: string; expiryDate: string;
}

const STATUS_COLORS: Record<string, string> = { completed: 'bg-success', pending: 'bg-warning text-dark', cancelled: 'bg-danger', refunded: 'bg-secondary', failed: 'bg-danger' };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]); const [subscribers, setSubscribers] = useState<Sub[]>([]); const [products, setProducts] = useState<Prod[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [showCreate, setShowCreate] = useState(false); const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [form, setForm] = useState({ subscriberId: '', productId: '', pricePaid: '', paymentStatus: 'completed', orderStatus: 'completed', paymentGateway: 'Manual', startDate: '', notes: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [oR, sR, pR] = await Promise.all([fetch('/api/orders', { headers: h }), fetch('/api/subscribers', { headers: h }), fetch('/api/products', { headers: h })]);
      const [o, s, p] = await Promise.all([oR.json(), sR.json(), pR.json()]);
      if (o.success) setOrders(o.data); if (s.success) setSubscribers(s.data); if (p.success) setProducts(p.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  const flash = (m: string) => { setOk(m); setTimeout(() => setOk(''), 3000); };
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

  const createOrder = async () => {
    if (!form.subscriberId || !form.productId) { setErr('Subscriber and product required'); return; }
    setErr(''); setSaving(true);
    try {
      const r = await fetch('/api/orders', { method: 'POST', headers: h, body: JSON.stringify({ ...form, pricePaid: Number(form.pricePaid) || 0 }) });
      const d = await r.json();
      if (d.success) { flash('Order created'); setShowCreate(false); loadAll(); } else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };

  const updateOrder = async () => {
    if (!editOrder) return; setErr(''); setSaving(true);
    try {
      const r = await fetch(`/api/orders/${editOrder._id}`, { method: 'PUT', headers: h, body: JSON.stringify({ paymentStatus: form.paymentStatus, orderStatus: form.orderStatus, notes: form.notes }) });
      const d = await r.json();
      if (d.success) { flash('Order updated'); setEditOrder(null); loadAll(); } else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };

  const isExpired = (d: string) => new Date() > new Date(d);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text"><h4>Orders</h4><p>All subscriber product orders and access records</p></div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); setErr(''); setForm({ subscriberId: '', productId: '', pricePaid: '', paymentStatus: 'completed', orderStatus: 'completed', paymentGateway: 'Manual', startDate: '', notes: '' }); }}>+ New Order</button>
      </div>

      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}
      {err && !showCreate && !editOrder && <div className="alert alert-danger mb-4">{err}</div>}

      <div className="card">
        {loading ? <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
          : orders.length === 0 ? <div className="empty-state"><div className="empty-icon">🛍️</div><p>No orders yet.</p></div>
          : <div className="table-responsive"><table className="table"><thead><tr><th>Order #</th><th>Subscriber</th><th>Product</th><th>Price</th><th>Payment</th><th>Status</th><th>Expiry</th><th>Actions</th></tr></thead><tbody>
            {orders.map((o) => (<tr key={o._id}>
              <td><span className="fw-semibold" style={{ color: 'var(--primary)' }}>{o.orderNumber}</span></td>
              <td><div className="fw-semibold" style={{ fontSize: 13 }}>{o.subscriber.name}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{o.subscriber.email}</div></td>
              <td>{o.product.name}</td>
              <td className="fw-semibold" style={{ color: '#059669' }}>${o.pricePaid.toFixed(2)}</td>
              <td><span className={`badge ${STATUS_COLORS[o.paymentStatus] || 'bg-secondary'}`}>{o.paymentStatus}</span></td>
              <td><span className={`badge ${STATUS_COLORS[o.orderStatus] || 'bg-secondary'}`}>{o.orderStatus}</span></td>
              <td style={{ fontSize: 12, color: isExpired(o.expiryDate) ? '#ef4444' : '#16a34a' }}>{fmtDate(o.expiryDate)}</td>
              <td><button className="btn btn-sm btn-outline-primary" onClick={() => { setEditOrder(o); setForm({ ...form, paymentStatus: o.paymentStatus, orderStatus: o.orderStatus, notes: '' }); setErr(''); }}>Edit</button></td>
            </tr>))}
          </tbody></table></div>}
      </div>

      {showCreate && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog modal-lg"><div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">New Order</h5><button className="btn-close" onClick={() => setShowCreate(false)} /></div>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Subscriber *</label><select className="form-select" value={form.subscriberId} onChange={(e) => setForm({ ...form, subscriberId: e.target.value })}><option value="">— Select Subscriber —</option>{subscribers.map(s => <option key={s._id} value={s._id}>{s.name} ({s.email})</option>)}</select></div>
                <div className="col-md-6"><label className="form-label">Product *</label><select className="form-select" value={form.productId} onChange={(e) => { const p = products.find(x => x._id === e.target.value); setForm({ ...form, productId: e.target.value, pricePaid: p ? String(p.salePrice ?? p.regularPrice) : '' }); }}><option value="">— Select Product —</option>{products.map(p => <option key={p._id} value={p._id}>{p.name} (${p.salePrice ?? p.regularPrice})</option>)}</select></div>
                <div className="col-md-4"><label className="form-label">Price Paid ($)</label><input type="number" min="0" className="form-control" value={form.pricePaid} onChange={(e) => setForm({ ...form, pricePaid: e.target.value })} /></div>
                <div className="col-md-4"><label className="form-label">Payment Status</label><select className="form-select" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option></select></div>
                <div className="col-md-4"><label className="form-label">Gateway</label><select className="form-select" value={form.paymentGateway} onChange={(e) => setForm({ ...form, paymentGateway: e.target.value })}><option>Manual</option><option>Stripe</option><option>PayPal</option><option>Bank Transfer</option></select></div>
                <div className="col-md-6"><label className="form-label">Start Date (default: today)</label><input type="date" className="form-control" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                <div className="col-md-6"><label className="form-label">Notes</label><input className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={createOrder} disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-2" />}Create Order</button></div>
          </div></div>
        </div>
      )}

      {editOrder && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">Update Order {editOrder.orderNumber}</h5><button className="btn-close" onClick={() => setEditOrder(null)} /></div>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Payment Status</label><select className="form-select" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}><option value="pending">Pending</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></div>
                <div className="col-md-6"><label className="form-label">Order Status</label><select className="form-select" value={form.orderStatus} onChange={(e) => setForm({ ...form, orderStatus: e.target.value })}><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select></div>
                <div className="col-12"><label className="form-label">Notes</label><input className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setEditOrder(null)}>Cancel</button><button className="btn btn-primary" onClick={updateOrder} disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-2" />}Update</button></div>
          </div></div>
        </div>
      )}
    </div>
  );
}
