'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/Pagination';

const PER_PAGE = 20;

interface Sub { _id: string; name: string; email: string; }
interface Prod { _id: string; name: string; regularPrice: number; salePrice: number | null; durationValue: number; durationType: string; }
interface LineItem { productId: string; pricePaid: string; startDate: string; durationValue: string; durationType: string; }
interface Order {
  _id: string; orderNumber: string; subscriber: Sub | null; product: Prod;
  pricePaid: number; paymentStatus: string; orderStatus: string;
  purchaseDate: string; expiryDate: string;
  items?: { product: Prod; pricePaid: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-success', pending: 'bg-warning text-dark',
  cancelled: 'bg-danger', refunded: 'bg-secondary', failed: 'bg-danger',
};

const TODAY = new Date().toISOString().slice(0, 10);

function defaultLine(): LineItem {
  return { productId: '', pricePaid: '', startDate: TODAY, durationValue: '12', durationType: 'months' };
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscribers, setSubscribers] = useState<Sub[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(orders.length / PER_PAGE));
  const safePage = Math.min(page, pages); // clamp during render (e.g. after a delete)
  const paged = orders.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const [cForm, setCForm] = useState({ subscriberId: '', paymentStatus: 'completed', orderStatus: 'completed', paymentGateway: 'Manual', notes: '', sellingPrice: '' });
  const [lines, setLines] = useState<LineItem[]>([defaultLine()]);
  const [eForm, setEForm] = useState({ paymentStatus: 'completed', orderStatus: 'completed', notes: '' });
  const [lineWarnings, setLineWarnings] = useState<Record<number, string>>({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [oR, sR, pR] = await Promise.all([
        fetch('/api/orders', { headers: h }),
        fetch('/api/subscribers', { headers: h }),
        fetch('/api/products', { headers: h }),
      ]);
      const [o, s, p] = await Promise.all([oR.json(), sR.json(), pR.json()]);
      if (o.success) setOrders(o.data);
      if (s.success) setSubscribers(s.data);
      if (p.success) setProducts(p.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const flash = (m: string) => { setOk(m); setTimeout(() => setOk(''), 3000); };

  const addLine = () => setLines(ls => [...ls, defaultLine()]);
  const removeLine = (i: number) => {
    setLines(ls => ls.filter((_, idx) => idx !== i));
    setLineWarnings(w => { const n = { ...w }; delete n[i]; return n; });
  };
  const setLine = (i: number, patch: Partial<LineItem>) =>
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const checkSubscription = async (subscriberId: string, productId: string, lineIdx: number) => {
    if (!subscriberId || !productId) {
      setLineWarnings(w => { const n = { ...w }; delete n[lineIdx]; return n; });
      return;
    }
    try {
      const r = await fetch(
        `/api/orders/check-subscription?subscriberId=${subscriberId}&productId=${productId}`,
        { headers: h },
      );
      const d = await r.json();
      if (d.success && d.data.active) {
        const expiry = new Date(d.data.expiryDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
        setLineWarnings(w => ({ ...w, [lineIdx]: `Already has an active subscription — expires ${expiry}` }));
      } else {
        setLineWarnings(w => { const n = { ...w }; delete n[lineIdx]; return n; });
      }
    } catch {
      setLineWarnings(w => { const n = { ...w }; delete n[lineIdx]; return n; });
    }
  };

  const onProductSelect = (i: number, productId: string) => {
    const p = products.find(x => x._id === productId);
    setLine(i, {
      productId,
      pricePaid: p ? String(p.salePrice ?? p.regularPrice) : '',
      durationValue: p ? String(p.durationValue) : '12',
      durationType: p ? p.durationType : 'months',
    });
    checkSubscription(cForm.subscriberId, productId, i);
  };

  const totalPrice = lines.reduce((s, l) => s + (parseFloat(l.pricePaid) || 0), 0);

  const openCreate = () => {
    setShowCreate(true); setErr('');
    setCForm({ subscriberId: '', paymentStatus: 'completed', orderStatus: 'completed', paymentGateway: 'Manual', notes: '', sellingPrice: '' });
    setLines([defaultLine()]);
    setLineWarnings({});
  };

  const createOrder = async () => {
    if (!cForm.subscriberId) { setErr('Subscriber is required'); return; }
    if (lines.some(l => !l.productId)) { setErr('All product rows need a product selected'); return; }
    setErr(''); setSaving(true);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST', headers: h,
        body: JSON.stringify({
          ...cForm,
          sellingPrice: cForm.sellingPrice !== '' ? parseFloat(cForm.sellingPrice) : undefined,
          products: lines.map(l => ({
            productId: l.productId,
            pricePaid: parseFloat(l.pricePaid) || 0,
            startDate: l.startDate,
            durationValue: parseInt(l.durationValue) || undefined,
            durationType: l.durationType,
          })),
        }),
      });
      const d = await r.json();
      if (d.success) { flash('Order created'); setShowCreate(false); loadAll(); }
      else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };

  const updateOrder = async () => {
    if (!editOrder) return;
    setErr(''); setSaving(true);
    try {
      const r = await fetch(`/api/orders/${editOrder._id}`, {
        method: 'PUT', headers: h, body: JSON.stringify(eForm),
      });
      const d = await r.json();
      if (d.success) { flash('Order updated'); setEditOrder(null); loadAll(); }
      else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };

  const deleteOrder = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/orders/${deleteId}`, { method: 'DELETE', headers: h });
      const d = await r.json();
      if (d.success) { flash('Order deleted'); setDeleteId(null); loadAll(); }
      else setErr(d.error || 'Error');
    } finally { setDeleting(false); }
  };

  const isExpired = (d: string) => new Date() > new Date(d);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

  const productCount = (o: Order) => o.items?.length ? o.items.length : 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h4>Orders</h4>
          <p>All subscriber product orders and access records</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Order</button>
      </div>

      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}
      {err && !showCreate && !editOrder && <div className="alert alert-danger mb-4">{err}</div>}

      <div className="card">
        {loading
          ? <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
          : orders.length === 0
            ? <div className="empty-state"><div className="empty-icon">🛍️</div><p>No orders yet.</p></div>
            : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Subscriber</th>
                      <th>Products</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Expiry</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((o) => (
                      <tr key={o._id}>
                        <td>
                          <span className="fw-semibold" style={{ color: 'var(--primary)' }}>{o.orderNumber}</span>
                        </td>
                        <td>
                          <div className="fw-semibold" style={{ fontSize: 13 }}>{o.subscriber?.name ?? '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{o.subscriber?.email ?? ''}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>{o.product?.name ?? '—'}</div>
                          {productCount(o) > 1 && (
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>+{productCount(o) - 1} more</div>
                          )}
                        </td>
                        <td className="fw-semibold" style={{ color: '#059669' }}>A${o.pricePaid.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${STATUS_COLORS[o.paymentStatus] || 'bg-secondary'}`}>{o.paymentStatus}</span>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_COLORS[o.orderStatus] || 'bg-secondary'}`}>{o.orderStatus}</span>
                        </td>
                        <td style={{ fontSize: 12, color: isExpired(o.expiryDate) ? '#ef4444' : '#16a34a' }}>
                          {fmtDate(o.expiryDate)}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => router.push(`/dashboard/orders/${o._id}`)}
                            >View</button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => { setEditOrder(o); setEForm({ paymentStatus: o.paymentStatus, orderStatus: o.orderStatus, notes: '' }); setErr(''); }}
                            >Edit</button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => { setDeleteId(o._id); setErr(''); }}
                            >Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </div>

      <Pagination page={safePage} pages={pages} total={orders.length} onChange={setPage} />

      {/* ── Create Order Modal ─────────────────────────────── */}
      {showCreate && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">New Order</h5>
                <button className="btn-close" onClick={() => setShowCreate(false)} />
              </div>
              <div className="modal-body">
                {err && <div className="alert alert-danger">{err}</div>}

                <div className="row g-3 mb-3">
                  <div className="col-md-5">
                    <label className="form-label fw-semibold">Subscriber *</label>
                    <select
                      className="form-select"
                      value={cForm.subscriberId}
                      onChange={e => {
                        const sid = e.target.value;
                        setCForm(f => ({ ...f, subscriberId: sid }));
                        lines.forEach((l, i) => checkSubscription(sid, l.productId, i));
                      }}
                    >
                      <option value="">— Select Subscriber —</option>
                      {subscribers.map(s => <option key={s._id} value={s._id}>{s.name} ({s.email})</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Payment Status</label>
                    <select className="form-select" value={cForm.paymentStatus} onChange={e => setCForm({ ...cForm, paymentStatus: e.target.value })}>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">Gateway</label>
                    <select className="form-select" value={cForm.paymentGateway} onChange={e => setCForm({ ...cForm, paymentGateway: e.target.value })}>
                      <option>Manual</option>
                      <option>Stripe</option>
                      <option>PayPal</option>
                      <option>Bank Transfer</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">Notes</label>
                    <input className="form-control" value={cForm.notes} onChange={e => setCForm({ ...cForm, notes: e.target.value })} />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      Selling Price (A$)
                      <span className="text-muted fw-normal ms-1" style={{ fontSize: 12 }}>— shown on invoice</span>
                    </label>
                    <input
                      type="number" min="0" step="0.01"
                      className="form-control"
                      placeholder={`e.g. ${totalPrice.toFixed(2)}`}
                      value={cForm.sellingPrice}
                      onChange={e => setCForm({ ...cForm, sellingPrice: e.target.value })}
                    />
                    {cForm.sellingPrice && (
                      <div className="form-text">
                        Invoice will show A${parseFloat(cForm.sellingPrice).toFixed(2)} instead of the price paid total.
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Lines */}
                <div className="mb-2 d-flex align-items-center justify-content-between">
                  <span className="fw-semibold" style={{ fontSize: 14 }}>Products</span>
                  <button className="btn btn-sm btn-outline-primary" onClick={addLine}>+ Add Product</button>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <table className="table table-sm mb-0">
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ minWidth: 200 }}>Product *</th>
                        <th style={{ minWidth: 100 }}>Price (A$)</th>
                        <th style={{ minWidth: 120 }}>Start Date</th>
                        <th style={{ minWidth: 120 }}>Duration</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => (
                        <tr key={i}>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={line.productId}
                              onChange={e => onProductSelect(i, e.target.value)}
                            >
                              <option value="">— Select —</option>
                              {products.map(p => (
                                <option key={p._id} value={p._id}>
                                  {p.name} (A${p.salePrice ?? p.regularPrice})
                                </option>
                              ))}
                            </select>
                            {lineWarnings[i] && (
                              <div style={{ fontSize: 11, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '3px 7px', marginTop: 4 }}>
                                ⚠ {lineWarnings[i]}
                              </div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number" min="0" step="0.01"
                              className="form-control form-control-sm"
                              value={line.pricePaid}
                              onChange={e => setLine(i, { pricePaid: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              type="date" className="form-control form-control-sm"
                              value={line.startDate}
                              onChange={e => setLine(i, { startDate: e.target.value })}
                            />
                          </td>
                          <td>
                            <div className="input-group input-group-sm">
                              <input
                                type="number" min="1"
                                className="form-control"
                                value={line.durationValue}
                                onChange={e => setLine(i, { durationValue: e.target.value })}
                              />
                              <select
                                className="form-select"
                                value={line.durationType}
                                onChange={e => setLine(i, { durationType: e.target.value })}
                              >
                                <option value="days">Days</option>
                                <option value="months">Months</option>
                                <option value="years">Years</option>
                              </select>
                            </div>
                          </td>
                          <td>
                            {lines.length > 1 && (
                              <button className="btn btn-sm btn-outline-danger" onClick={() => removeLine(i)}>✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ background: '#f8fafc' }}>
                      <tr>
                        <td colSpan={4} className="text-end fw-bold py-2 pe-3" style={{ fontSize: 14 }}>
                          Price Paid Total: A${totalPrice.toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createOrder} disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-2" />}
                  Create Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────── */}
      {deleteId && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Order</h5>
                <button className="btn-close" onClick={() => setDeleteId(null)} />
              </div>
              <div className="modal-body">
                <p>This will permanently delete the order along with its transactions and access records. This cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={deleteOrder} disabled={deleting}>
                  {deleting && <span className="spinner-border spinner-border-sm me-2" />}Delete Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Status Modal ─────────────────────────────── */}
      {editOrder && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update {editOrder.orderNumber}</h5>
                <button className="btn-close" onClick={() => setEditOrder(null)} />
              </div>
              <div className="modal-body">
                {err && <div className="alert alert-danger">{err}</div>}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Payment Status</label>
                    <select className="form-select" value={eForm.paymentStatus} onChange={e => setEForm({ ...eForm, paymentStatus: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Order Status</label>
                    <select className="form-select" value={eForm.orderStatus} onChange={e => setEForm({ ...eForm, orderStatus: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Notes</label>
                    <input className="form-control" value={eForm.notes} onChange={e => setEForm({ ...eForm, notes: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditOrder(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={updateOrder} disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-2" />}Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
