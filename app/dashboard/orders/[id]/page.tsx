'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-success', pending: 'bg-warning text-dark',
  cancelled: 'bg-danger', refunded: 'bg-secondary', failed: 'bg-danger',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
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
  const gstTotal = invoiceTotal / 11;
  const subtotal = invoiceTotal - gstTotal;

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
                    <td colSpan={4} className="text-end fw-bold" style={{ fontSize: 14 }}>Total</td>
                    <td className="text-end fw-bold" style={{ fontSize: 15, color: '#0f172a' }}>
                      A${order.pricePaid.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
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
        <div className="inv-overlay" onClick={() => setShowInvoice(false)}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-no-print inv-actions">
              <span className="text-muted small">Invoice {order.orderNumber}</span>
              <div className="d-flex gap-2">
                <button className="btn btn-dark btn-sm" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowInvoice(false)}>✕ Close</button>
              </div>
            </div>
            <div className="inv-doc">
              <div className="inv-hdr">
                <div className="inv-brand">
                  <img src="/logo.png" alt="PristineGaze" className="inv-brand-logo w-100" />
                </div>
                <div className="inv-title-block">
                  <div className="inv-title">TAX INVOICE</div>
                  <div className="inv-meta-row"><span>Invoice #</span><strong>{order.orderNumber}</strong></div>
                  <div className="inv-meta-row"><span>Date</span><strong>{fmtDate(order.purchaseDate)}</strong></div>
                </div>
              </div>
              <div className="inv-divider" />
              <div className="inv-parties">
                <div>
                  <div className="inv-section-label">BILL TO</div>
                  <div className="inv-party-name">{order.subscriber?.name}</div>
                  <div className="inv-party-detail">{order.subscriber?.email}</div>
                  {order.subscriber?.phone && <div className="inv-party-detail">{order.subscriber.phone}</div>}
                </div>
                <div className="text-end">
                  <div className="inv-section-label">FROM</div>
                  <div className="inv-party-name">PristineGaze Pty Ltd</div>
                  <div className="inv-party-detail">470 St Kilda Rd, Melbourne VIC 3004</div>
                  <div className="inv-party-detail">support@pristinegaze.com.au</div>
                </div>
              </div>
              <div className="inv-divider" />
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Duration</th>
                    <th>Period</th>
                    <th className="text-end">Amount (AUD)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const itemSub = item.pricePaid - (item.pricePaid / 11);
                    return (
                      <tr key={i}>
                        <td>{item.product?.name ?? '—'}</td>
                        <td>{item.durationValue} {item.durationType}</td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>
                          {fmtDate(item.startDate)} – {fmtDate(item.expiryDate)}
                        </td>
                        <td className="text-end">A${itemSub.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="inv-totals">
                <div className="inv-total-row">
                  <span>Subtotal (excl. GST)</span><span>A${subtotal.toFixed(2)}</span>
                </div>
                <div className="inv-total-row">
                  <span>GST (10%)</span><span>A${gstTotal.toFixed(2)}</span>
                </div>
                <div className="inv-total-row inv-grand-total">
                  <span>Total</span><span>A${invoiceTotal.toFixed(2)}</span>
                </div>
              </div>
              {order.paymentStatus === 'completed' && <div className="inv-paid-stamp">PAID</div>}
              <div className="inv-divider" style={{ marginTop: 32 }} />
              <div className="inv-footer">
                <p>By receiving the invoice, you agree to Pristine Gaze Pty Ltd's Terms and Conditions & Privacy Policy.</p>
                <p>If you have any questions concerning this invoice, contact support@pristinegaze.com.au</p>
                <p><b>THANK YOU FOR YOUR BUSINESS!</b></p>
              </div>

              <table className="inv-table">
                <thead>
                  <tr>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <td>
                    <p>
                      This Pristine Gaze Subscription Agreement is provided to you
                      in connection with your purchase from Pristine Gaze Pty Ltd
                      (ABN 66 680 815 678) and (ACN 680 815 678) ("Pristine
                      Gaze", "we", "our", or "us").
                      This Agreement is entered into between Pristine Gaze Pty Ltd
                      and the Customer ("you" or "Subscriber") in relation to
                      Pristine Gaze's subscription-based research and market
                      insight services.
                      These terms, together with the Website's Terms and
                      Conditions, Privacy Policy, Financial Service Guide and the
                      details specified in your tax invoice or order confirmation,
                      form the complete agreement between you and Pristine Gaze
                      (collectively, the "Agreement"). By completing your purchase
                      or making payment, you acknowledge that you have read,
                      understood, and agreed to be bound by this Agreement.
                    </p>
                    <p><strong>1. Subscription Term and Termination</strong><br />
                      Pristine Gaze will provide access to the subscribed services
                      for the duration specified in the applicable tax invoice or
                      subscription confirmation. Subscriptions will remain active for
                      the agreed period and will expire automatically at the end of
                      the subscription term unless otherwise specified.
                      Unless explicitly stated, subscriptions do not auto-renew.
                      Pristine Gaze reserves the right to suspend or terminate
                      access in the event of misuse, breach of terms, or violation of
                      intellectual property rights.
                    </p>
                    <p>
                      <strong>2. Permitted Use</strong><br />
                      Pristine Gaze grants Subscribers a limited, personal, nontransferable, non-exclusive license to access and use the
                      subscribed content strictly for personal, non-commercial
                      purposes.
                      Subscribers may access, view, and store content for their
                      individual use only. Redistribution, resale, reproduction,
                      sharing, or commercial exploitation of any content, in whole
                      or in part, is strictly prohibited without prior written consent
                      from Pristine Gaze.
                    </p>
                  </td>
                  <td>
                    <p><strong>3. Refund Policy and Pricing</strong><br />
                      A fourteen (14) day cooling-off period applies to new
                      subscriptions only, unless otherwise stated. This cooling-off
                      period is available exclusively to first-time subscribers and
                      does not apply to renewals or existing customers.
                      To request cancellation during the cooling-off period, you
                      must notify Pristine Gaze in writing via email or through
                      official customer support channels within fourteen (14) days
                      from the date of payment. Refund requests submitted after
                      the cooling-off period will not be accepted, except where
                      required under applicable consumer protection laws.
                    </p>
                    <p>
                      <p>   <strong>4. Privacy and Security</strong><br />
                        Pristine Gaze is committed to protecting your privacy and
                        maintaining the security of your personal information. Our
                        Privacy Policy outlines how we collect, use, store, and protect
                        your data and is incorporated into this Agreement by
                        reference.</p>
                      <p><strong>5. Governing Law</strong><br />
                        This Agreement shall be governed by and construed in
                        accordance with the laws of New South Wales, Australia. By
                        entering into this Agreement, you agree to submit to the
                        exclusive jurisdiction of the courts of New South Wales.</p>
                      <p>
                        <strong>6. Liability and General Advice Disclaimer</strong><br />
                        Pristine Gaze, including its employees, directors,
                        representatives, and associates, does not guarantee the
                        performance or future results of any financial product,
                        security, or investment strategy discussed within its services.
                        All content, research, analysis, and market insights provided
                        by Pristine Gaze are general information only and do not take
                        into account your personal financial situation, investment
                        objectives, or individual needs. You should conduct your own
                        research and consider seeking independent professional
                        financial advice before making any investment decisions.
                        Not all investments are suitable for all investors, and past
                        performance is not indicative of future results.
                      </p>
                    </p>
                  </td>
                </tbody>
              </table>

            </div>
          </div>
        </div>

      )}
    </div>
  );
}
