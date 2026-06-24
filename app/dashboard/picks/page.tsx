'use client';

import { useEffect, useState, useCallback } from 'react';

interface Pick {
  _id: string;
  ticker: string;
  convictionLevel: 'High' | 'Medium' | 'Low';
  potentialReturn: number;
  capType: string;
  entryPrice: number;
  isActive: boolean;
  displayOrder: number;
}

interface PickForm {
  ticker: string;
  convictionLevel: 'High' | 'Medium' | 'Low';
  potentialReturn: string;
  capType: string;
  entryPrice: string;
  isActive: boolean;
  displayOrder: string;
}

const emptyForm: PickForm = { ticker: '', convictionLevel: 'High', potentialReturn: '', capType: 'Small-Cap', entryPrice: '', isActive: true, displayOrder: '0' };

const CONVICTION_COLORS: Record<string, string> = { High: 'bg-danger', Medium: 'bg-warning text-dark', Low: 'bg-secondary' };

export default function PicksPage() {
  const [items, setItems]       = useState<Pick[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [ok, setOk]             = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<Pick | null>(null);
  const [form, setForm]         = useState<PickForm>(emptyForm);
  const [del, setDel]           = useState<Pick | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/picks', { headers: h });
      const d = await r.json();
      if (d.success) setItems(d.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setOk(m); setTimeout(() => setOk(''), 3000); };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErr(''); setShowModal(true); };
  const openEdit = (x: Pick) => {
    setEditing(x);
    setForm({ ticker: x.ticker, convictionLevel: x.convictionLevel, potentialReturn: String(x.potentialReturn), capType: x.capType, entryPrice: String(x.entryPrice), isActive: x.isActive, displayOrder: String(x.displayOrder) });
    setErr(''); setShowModal(true);
  };

  const save = async () => {
    if (!form.ticker || !form.potentialReturn || !form.capType || !form.entryPrice) { setErr('All fields are required'); return; }
    setErr(''); setSaving(true);
    try {
      const payload = {
        ticker: form.ticker.toUpperCase().trim(),
        convictionLevel: form.convictionLevel,
        potentialReturn: parseFloat(form.potentialReturn),
        capType: form.capType,
        entryPrice: parseFloat(form.entryPrice),
        isActive: form.isActive,
        displayOrder: parseInt(form.displayOrder) || 0,
      };
      const url = editing ? `/api/picks/${editing._id}` : '/api/picks';
      const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: h, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.success) { flash(editing ? 'Pick updated' : 'Pick created'); setShowModal(false); load(); }
      else setErr(d.error || 'Error');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!del) return; setSaving(true);
    try {
      await fetch(`/api/picks/${del._id}`, { method: 'DELETE', headers: h });
      flash('Deleted'); setDel(null); load();
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h4>Expert Picks</h4>
          <p>Manage the &ldquo;Recent Picks from our Experts&rdquo; section on the homepage</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Pick</button>
      </div>

      {ok && <div className="alert alert-success mb-4">✓ {ok}</div>}

      <div className="card">
        {loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📈</div><p>No picks yet. Add one to show on the homepage.</p></div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr><th>#</th><th>Ticker</th><th>Conviction</th><th>Potential Return</th><th>Cap Type</th><th>Entry Price</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((x) => (
                  <tr key={x._id}>
                    <td className="text-muted small">{x.displayOrder}</td>
                    <td className="fw-bold font-monospace">{x.ticker}</td>
                    <td><span className={`badge ${CONVICTION_COLORS[x.convictionLevel]}`}>{x.convictionLevel}</span></td>
                    <td className="fw-semibold" style={{ color: '#16a34a' }}>{x.potentialReturn.toFixed(2)}%</td>
                    <td className="text-muted small">{x.capType}</td>
                    <td className="fw-semibold">${x.entryPrice.toFixed(2)}</td>
                    <td><span className={`badge ${x.isActive ? 'bg-success' : 'bg-secondary'}`}>{x.isActive ? 'Active' : 'Hidden'}</span></td>
                    <td className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(x)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDel(x)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header justify-content-between">
              <h5 className="modal-title">{editing ? 'Edit Pick' : 'New Pick'}</h5>
              <button className="btn-close" onClick={() => setShowModal(false)} />
            </div>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Ticker *</label>
                  <input className="form-control font-monospace text-uppercase" value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} placeholder="e.g. CBA" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Conviction Level</label>
                  <select className="form-select" value={form.convictionLevel} onChange={e => setForm({ ...form, convictionLevel: e.target.value as 'High' | 'Medium' | 'Low' })}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Potential Return (%) *</label>
                  <input type="number" step="0.01" className="form-control" value={form.potentialReturn} onChange={e => setForm({ ...form, potentialReturn: e.target.value })} placeholder="e.g. 6.00" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Cap Type *</label>
                  <select className="form-select" value={form.capType} onChange={e => setForm({ ...form, capType: e.target.value })}>
                    <option>Small-Cap</option><option>Mid-Cap</option><option>Large-Cap</option><option>Micro-Cap</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Entry Price ($) *</label>
                  <input type="number" step="0.01" className="form-control" value={form.entryPrice} onChange={e => setForm({ ...form, entryPrice: e.target.value })} placeholder="e.g. 12.50" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Display Order</label>
                  <input type="number" className="form-control" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.value })} placeholder="0 = first" />
                </div>
                <div className="col-12">
                  <div className="form-check form-switch">
                    <input type="checkbox" className="form-check-input" id="isActive" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                    <label className="form-check-label" htmlFor="isActive">Show on Homepage</label>
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

      {del && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header justify-content-between">
              <h5 className="modal-title text-danger">Delete Pick</h5>
              <button className="btn-close" onClick={() => setDel(null)} />
            </div>
            <div className="modal-body">Delete ticker <strong>{del.ticker}</strong>? This removes it from the homepage.</div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDel(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={remove} disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-2" />}Delete
              </button>
            </div>
          </div></div>
        </div>
      )}
    </div>
  );
}
