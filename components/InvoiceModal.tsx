'use client';

export interface InvoiceItem {
  name: string;
  durationValue?: number;
  durationType?: string;
  startDate: string;
  expiryDate: string;
  pricePaid: number;
}

export interface InvoiceModalProps {
  orderNumber: string;
  purchaseDate: string;
  billTo: { name?: string; email?: string; phone?: string };
  items: InvoiceItem[];
  total: number;
  paid: boolean;
  onClose: () => void;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function InvoiceModal({ orderNumber, purchaseDate, billTo, items, total, paid, onClose }: InvoiceModalProps) {
  const gstTotal = total / 11;
  const subtotal = total - gstTotal;

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal" onClick={e => e.stopPropagation()}>
        <div className="inv-no-print inv-actions">
          <span className="text-muted small">Invoice {orderNumber}</span>
          <div className="d-flex gap-2">
            <button className="btn btn-dark btn-sm" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>✕ Close</button>
          </div>
        </div>
        <div className="inv-doc">
          <div className="inv-hdr">
            <div className="inv-brand">
              <img src="/logo2.png" alt="PristineGaze" className="inv-brand-logo w-100" />
            </div>
            <div className="inv-title-block">
              <div className="inv-title">TAX INVOICE</div>
              <div className="inv-meta-row"><span>Invoice #</span><strong>{orderNumber}</strong></div>
              <div className="inv-meta-row"><span>Date</span><strong>{fmtDate(purchaseDate)}</strong></div>
            </div>
          </div>
          <div className="inv-divider" />
          <div className="inv-parties">
            <div>
              <div className="inv-section-label">BILL TO</div>
              <div className="inv-party-name">{billTo.name ?? '—'}</div>
              <div className="inv-party-detail">{billTo.email ?? '—'}</div>
              {billTo.phone && <div className="inv-party-detail">{billTo.phone}</div>}
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
                <th style={{ width: '48%' }}>Description</th>
                <th style={{ width: '20%' }}>Duration</th>
                <th className="text-end" style={{ width: '32%' }}>Period</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{item.name ?? '—'}</td>
                  <td>{item.durationValue} {item.durationType}</td>
                  <td className="text-end" style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(item.startDate)} – {fmtDate(item.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="inv-totals">
            <div className="inv-total-row"><span>Subtotal (excl. GST)</span><span>A${subtotal.toFixed(2)}</span></div>
            <div className="inv-total-row"><span>GST (10%)</span><span>A${gstTotal.toFixed(2)}</span></div>
            <div className="inv-total-row inv-grand-total"><span>Total</span><span>A${total.toFixed(2)}</span></div>
          </div>
          {paid && <div className="inv-paid-stamp">PAID</div>}
          <div className="inv-divider" style={{ marginTop: 32 }} />
          <div className="inv-footer">
            <p>By receiving the invoice, you agree to Pristine Gaze Pty Ltd&apos;s Terms and Conditions &amp; Privacy Policy.</p>
            <p>If you have any questions concerning this invoice, contact support@pristinegaze.com.au</p>
            <p><b>THANK YOU FOR YOUR BUSINESS!</b></p>
          </div>

          <table className="inv-table">
            <thead>
              <tr><th></th><th></th></tr>
            </thead>
            <tbody>
              <td>
                <p>
                  This Pristine Gaze Subscription Agreement is provided to you
                  in connection with your purchase from Pristine Gaze Pty Ltd
                  (ABN 66 680 815 678) and (ACN 680 815 678) (&quot;Pristine
                  Gaze&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
                  This Agreement is entered into between Pristine Gaze Pty Ltd
                  and the Customer (&quot;you&quot; or &quot;Subscriber&quot;) in relation to
                  Pristine Gaze&apos;s subscription-based research and market
                  insight services.
                  These terms, together with the Website&apos;s Terms and
                  Conditions, Privacy Policy, Financial Service Guide and the
                  details specified in your tax invoice or order confirmation,
                  form the complete agreement between you and Pristine Gaze
                  (collectively, the &quot;Agreement&quot;). By completing your purchase
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
                  Pristine Gaze grants Subscribers a limited, personal, non-transferable, non-exclusive license to access and use the
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
                <p><strong>4. Privacy and Security</strong><br />
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
              </td>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
