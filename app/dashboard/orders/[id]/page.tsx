'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import InvoiceModal from '@/components/InvoiceModal';

interface Subscriber { _id: string; name: string; email: string; phone?: string; }
interface ProductRef { _id: string; name: string; regularPrice: number; salePrice?: number; durationValue: number; durationType: string; }
interface OrderItem { product: ProductRef; pricePaid: number; sellingPrice?: number; startDate: string; expiryDate: string; durationValue: number; durationType: string; }
interface Order {
  _id: string; orderNumber: string; subscriber: Subscriber;
  product: ProductRef; pricePaid: number; sellingPrice?: number;
  paymentStatus: string; orderStatus: string;
  purchaseDate: string; expiryDate: string;
  items: OrderItem[]; notes: string; createdAt: string;
}
interface AccessProduct { _id: string; name: string; featuredImage?: string; }
interface UserProduct { _id: string; product: AccessProduct | null; startDate: string; expiryDate: string; isActive: boolean; }

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-success', pending: 'bg-warning text-dark',
  cancelled: 'bg-danger', refunded: 'bg-secondary', failed: 'bg-danger',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDaysLeft(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [form, setForm] = useState({ paymentStatus: '', orderStatus: '', notes: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/orders/${id}`, { headers: h });
      const d = await r.json();
      if (d.success) {
        setOrder(d.data.order);
        setUserProducts(d.data.userProducts ?? []);
        setForm({
          paymentStatus: d.data.order.paymentStatus,
          orderStatus: d.data.order.orderStatus,
          notes: d.data.order.notes || '',
        });
      }
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const update = async () => {
    setSaving(true); setErr('');
    try {
      const r = await fetch(`/api/orders/${id}`, { method: 'PUT', headers: h, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) {
        setOk('Order updated');
        setOrder(prev => prev ? { ...prev, ...d.data } : prev);
        setTimeout(() => setOk(''), 3000);
      } else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center p-5"><div className="spinner-border text-primary" /></div>;
  if (!order) return <div className="alert alert-danger m-4">Order not found.</div>;

  const items: OrderItem[] = order.items?.length
    ? order.items
    : [{
      product: order.product,
      pricePaid: order.pricePaid,
      startDate: order.purchaseDate,
      expiryDate: order.expiryDate,
      durationValue: order.product?.durationValue,
      durationType: order.product?.durationType,
    }];

  const invoiceTotal = order.sellingPrice ?? order.pricePaid;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <Link href="/dashboard/orders" className="btn btn-sm btn-outline-secondary">← Back</Link>
            <h4 className="mb-0">{order.orderNumber}</h4>
            <span className={`badge ${STATUS_COLORS[order.orderStatus] || 'bg-secondary'}`}>{order.orderStatus}</span>
            <span className={`badge ${STATUS_COLORS[order.paymentStatus] || 'bg-secondary'}`}>{order.paymentStatus}</span>
          </div>
          <p className="mb-0 text-muted" style={{ fontSize: 13 }}>{fmtDate(order.createdAt)} — {order.subscriber?.name}</p>
        </div>
        <button className="btn btn-dark" onClick={() => setShowInvoice(true)}>🖨️ Invoice</button>
      </div>

      {ok && <div className="alert alert-success mb-3">✓ {ok}</div>}
      {err && <div className="alert alert-danger mb-3">{err}</div>}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header"><h6 className="mb-0">Products ({items.length})</h6></div>
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Duration</th>
                    <th>Start</th>
                    <th>Expiry</th>
                    <th className="text-end">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="fw-semibold">{item.product?.name ?? '—'}</td>
                      <td style={{ fontSize: 13 }}>{item.durationValue} {item.durationType}</td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(item.startDate)}</td>
                      <td style={{ fontSize: 12, color: new Date() > new Date(item.expiryDate) ? '#ef4444' : '#16a34a' }}>
                        {fmtDate(item.expiryDate)}
                      </td>
                      <td className="text-end fw-semibold" style={{ color: '#059669' }}>
                        A${item.pricePaid.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={4} className="text-end fw-bold" style={{ fontSize: 14 }}>Final Sale Total</td>
                    <td className="text-end fw-bold" style={{ fontSize: 15, color: '#0f172a' }}>
                      A${invoiceTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {userProducts.length > 0 && (
            <div className="card mt-4">
              <div className="card-header d-flex align-items-center justify-content-between">
                <h6 className="mb-0">Unlocked Subscriptions ({userProducts.length})</h6>
                {userProducts.length > items.length && (
                  <span className="badge bg-info text-dark">includes bundled products</span>
                )}
              </div>
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Start</th>
                      <th>Expiry</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userProducts.map(up => {
                      const daysLeft = getDaysLeft(up.expiryDate);
                      const active = up.isActive && daysLeft > 0;
                      const isBundled = !items.some(it => it.product?._id === up.product?._id);
                      return (
                        <tr key={up._id}>
                          <td className="fw-semibold">
                            {up.product?.name ?? '—'}
                            {isBundled && <span className="badge bg-light text-secondary border ms-2" style={{ fontSize: 10 }}>bundled</span>}
                          </td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(up.startDate)}</td>
                          <td style={{ fontSize: 12, color: active ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{fmtDate(up.expiryDate)}</td>
                          <td className="text-center">
                            {active
                              ? <span className={`badge ${daysLeft <= 7 ? 'bg-warning text-dark' : 'bg-success'}`}>{daysLeft <= 7 ? `⚠ ${daysLeft}d left` : '✓ Active'}</span>
                              : <span className="badge bg-secondary">Expired</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header"><h6 className="mb-0">Subscriber</h6></div>
            <div className="card-body">
              <div className="fw-semibold">{order.subscriber?.name}</div>
              <div className="small text-muted">{order.subscriber?.email}</div>
              {order.subscriber?.phone && <div className="small text-muted">{order.subscriber.phone}</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h6 className="mb-0">Update Status</h6></div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Payment Status</label>
                <select className="form-select form-select-sm" value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Order Status</label>
                <select className="form-select form-select-sm" value={form.orderStatus} onChange={e => setForm({ ...form, orderStatus: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Notes</label>
                <textarea className="form-control form-control-sm" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <button className="btn btn-primary btn-sm w-100" onClick={update} disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-2" />}Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {showInvoice && (
        <InvoiceModal
          orderNumber={order.orderNumber}
          purchaseDate={order.purchaseDate}
          billTo={{ name: order.subscriber?.name, email: order.subscriber?.email, phone: order.subscriber?.phone }}
          items={items.map(it => ({
            name: it.product?.name ?? '—',
            durationValue: it.durationValue,
            durationType: it.durationType,
            startDate: it.startDate,
            expiryDate: it.expiryDate,
            pricePaid: it.pricePaid,
          }))}
          total={invoiceTotal}
          paid={order.paymentStatus === 'completed'}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
}
