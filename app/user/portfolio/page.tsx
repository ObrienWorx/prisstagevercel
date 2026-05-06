'use client';

import { useEffect, useRef, useState } from 'react';

interface Stock {
  _id: string;
  symbol: string;
  companyName: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
}

interface Portfolio {
  _id: string;
  name: string;
  stocks: Stock[];
}

interface PriceMap {
  [symbol: string]: { price: number | null; name: string };
}

const PER_PAGE = 10;
const fmtAUD = (n: number) => `$${n.toFixed(2)}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

function normalizeSymbol(raw: string) {
  const s = raw.trim().toUpperCase();
  return s.includes('.') ? s : `${s}.AX`;
}

export default function PortfolioPage() {
  const [portfolios, setPortfolios]   = useState<Portfolio[]>([]);
  const [activeId,   setActiveId]     = useState<string | null>(null);
  const [prices,     setPrices]       = useState<PriceMap>({});
  const [updatedAt,  setUpdatedAt]    = useState('');
  const [loading,    setLoading]      = useState(true);
  const [addOpen,    setAddOpen]      = useState(false);
  const [page,       setPage]         = useState(1);

  const [form, setForm] = useState({ symbol: '', quantity: '', buyPrice: '', buyDate: '' });
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState('');

  /* ── New Portfolio modal ── */
  const [npModal, setNpModal] = useState({ open: false, name: '', err: '', saving: false });

  /* ── Delete Portfolio modal ── */
  const [delModal, setDelModal] = useState<{ portfolio: Portfolio | null; saving: boolean }>({ portfolio: null, saving: false });

  const tokenRef = useRef('');
  const activePortfolio = portfolios.find(p => p._id === activeId) ?? null;

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenRef.current}`,
  });

  /* ── load portfolios ── */
  useEffect(() => {
    tokenRef.current = localStorage.getItem('subscriber_token') ?? '';
    fetch('/api/subscriber/portfolios', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPortfolios(d.data);
          if (d.data.length > 0) setActiveId(d.data[0]._id);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── fetch prices for active portfolio ── */
  useEffect(() => {
    if (!activePortfolio || activePortfolio.stocks.length === 0) { setPrices({}); return; }
    const symbols = [...new Set(activePortfolio.stocks.map(s => s.symbol))].join(',');
    fetch(`/api/proxy/yahoo-finance?symbols=${symbols}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) { setPrices(d.data); setUpdatedAt(new Date().toLocaleTimeString()); }
      });
  }, [activeId, activePortfolio?.stocks.length]); // eslint-disable-line

  /* ── summary calculations ── */
  const stocks = activePortfolio?.stocks ?? [];
  const totalInvested = stocks.reduce((s, h) => s + h.quantity * h.buyPrice, 0);
  const currentValue  = stocks.reduce((s, h) => s + h.quantity * (prices[h.symbol]?.price ?? h.buyPrice), 0);
  const overallPL     = currentValue - totalInvested;
  const plPct         = totalInvested > 0 ? (overallPL / totalInvested) * 100 : 0;

  /* ── new portfolio (opens modal) ── */
  const createPortfolio = () => setNpModal({ open: true, name: '', err: '', saving: false });

  const handleCreatePortfolio = async () => {
    const name = npModal.name.trim();
    if (!name) { setNpModal(m => ({ ...m, err: 'Portfolio name is required' })); return; }
    setNpModal(m => ({ ...m, saving: true, err: '' }));
    const r = await fetch('/api/subscriber/portfolios', {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ name }),
    });
    const d = await r.json();
    if (d.success) {
      setPortfolios(p => [...p, d.data]);
      setActiveId(d.data._id);
      setNpModal({ open: false, name: '', err: '', saving: false });
    } else {
      setNpModal(m => ({ ...m, saving: false, err: d.error || 'Failed to create portfolio' }));
    }
  };

  /* ── delete portfolio (opens modal) ── */
  const deletePortfolio = (id: string) => {
    const p = portfolios.find(x => x._id === id);
    if (p) setDelModal({ portfolio: p, saving: false });
  };

  const handleDeletePortfolio = async () => {
    if (!delModal.portfolio) return;
    setDelModal(m => ({ ...m, saving: true }));
    const id = delModal.portfolio._id;
    const r = await fetch(`/api/subscriber/portfolios/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json();
    if (d.success) {
      setPortfolios(p => p.filter(x => x._id !== id));
      setActiveId(prev => (prev === id ? (portfolios.find(x => x._id !== id)?._id ?? null) : prev));
      setDelModal({ portfolio: null, saving: false });
    } else {
      setDelModal(m => ({ ...m, saving: false }));
    }
  };

  /* ── add stock ── */
  const addStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErr('');
    if (!activeId) return;
    const sym = normalizeSymbol(form.symbol);

    setAdding(true);
    try {
      const priceRes = await fetch(`/api/proxy/yahoo-finance?symbols=${sym}`).then(r => r.json());
      const info = priceRes?.data?.[sym];
      if (!info || info.price === null) { setAddErr(`Symbol "${sym}" not found on Yahoo Finance.`); return; }

      const r = await fetch(`/api/subscriber/portfolios/${activeId}/stocks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          symbol:      sym,
          companyName: info.name,
          quantity:    Number(form.quantity),
          buyPrice:    Number(form.buyPrice),
          buyDate:     form.buyDate,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setPortfolios(p => p.map(x => x._id === activeId ? d.data : x));
        setPrices(prev => ({ ...prev, [sym]: info }));
        setForm({ symbol: '', quantity: '', buyPrice: '', buyDate: '' });
        setUpdatedAt(new Date().toLocaleTimeString());
      } else {
        setAddErr(d.error ?? 'Failed to add stock.');
      }
    } finally {
      setAdding(false);
    }
  };

  /* ── delete stock ── */
  const deleteStock = async (stockId: string) => {
    if (!activeId) return;
    const r = await fetch(`/api/subscriber/portfolios/${activeId}/stocks/${stockId}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    const d = await r.json();
    if (d.success) setPortfolios(p => p.map(x => x._id === activeId ? d.data : x));
  };

  /* ── pagination ── */
  const totalPages = Math.max(1, Math.ceil(stocks.length / PER_PAGE));
  const pageStocks = stocks.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => setPage(1), [activeId]);

  if (loading) return <div className="pf-loading">Loading portfolios…</div>;

  return (
    <div className="pf-page">

      {/* ── Header ── */}
      <div className="pf-header">
        <div>
          <h1 className="pf-title">My Portfolio</h1>
          <p className="pf-subtitle">Keep track of your favorite stocks and stay updated on their performance.</p>
        </div>
        <button className="pf-new-btn" onClick={createPortfolio}>+ New Portfolio</button>
      </div>

      {/* ── Portfolio tabs ── */}
      {portfolios.length === 0 ? (
        <div className="pf-empty">
          <div className="pf-empty-icon">📈</div>
          <div className="pf-empty-title">No portfolios yet</div>
          <div className="pf-empty-sub">Click &quot;+ New Portfolio&quot; to get started.</div>
        </div>
      ) : (
        <>
          <div className="pf-tabs">
            {portfolios.map(p => (
              <div key={p._id} className={`pf-tab ${p._id === activeId ? 'active' : ''}`}
                   onClick={() => setActiveId(p._id)}>
                {p.name}
                <button className="pf-tab-close" onClick={e => { e.stopPropagation(); deletePortfolio(p._id); }}
                  title="Delete portfolio">×</button>
              </div>
            ))}
          </div>

          {activePortfolio && (
            <div className="pf-panel">

              {/* ── Add Stock ── */}
              <div className="pf-add-section">
                <button className="pf-add-toggle" onClick={() => setAddOpen(o => !o)}>
                  <span className="pf-add-icon">⊕</span> Add Stock to Portfolio
                  <span className="pf-add-chevron">{addOpen ? '∧' : '∨'}</span>
                </button>
                {addOpen && (
                  <form className="pf-add-form" onSubmit={addStock}>
                    <div className="pf-add-fields">
                      <div className="pf-field">
                        <label>Company Code</label>
                        <input type="text" placeholder="e.g. BHP or BHP.AX" required
                          value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} />
                      </div>
                      <div className="pf-field">
                        <label>Quantity</label>
                        <input type="number" placeholder="100" min="1" step="any" required
                          value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                      </div>
                      <div className="pf-field">
                        <label>Buy Price</label>
                        <input type="number" placeholder="$0.00" min="0" step="0.01" required
                          value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} />
                      </div>
                      <div className="pf-field">
                        <label>Buy Date</label>
                        <input type="date" required
                          value={form.buyDate} onChange={e => setForm(f => ({ ...f, buyDate: e.target.value }))} />
                      </div>
                      <button type="submit" className="pf-add-btn" disabled={adding}>
                        {adding ? '…' : 'Add'}
                      </button>
                    </div>
                    {addErr && <div className="pf-add-err">{addErr}</div>}
                  </form>
                )}
              </div>

              {/* ── Summary bar ── */}
              <div className="pf-summary">
                <div className="pf-summary-item">
                  <div className="pf-sum-label">TOTAL INVESTED</div>
                  <div className="pf-sum-value">{fmtAUD(totalInvested)}</div>
                  <div className="pf-sum-meta">{stocks.length} holding{stocks.length !== 1 ? 's' : ''}{updatedAt && ` · updated ${updatedAt}`}</div>
                </div>
                <div className="pf-summary-item">
                  <div className="pf-sum-label">CURRENT VALUE</div>
                  <div className="pf-sum-value">{fmtAUD(currentValue)}</div>
                </div>
                <div className="pf-summary-item">
                  <div className="pf-sum-label">OVERALL P/L</div>
                  <div className={`pf-sum-value ${overallPL >= 0 ? 'gain' : 'loss'}`}>
                    {fmtAUD(overallPL)} {overallPL >= 0 ? '▲' : '▼'}
                  </div>
                </div>
                <div className="pf-summary-item">
                  <div className="pf-sum-label">P/L %</div>
                  <div className={`pf-sum-value ${plPct >= 0 ? 'gain' : 'loss'}`}>
                    {plPct.toFixed(2)}% {plPct >= 0 ? '▲' : '▼'}
                  </div>
                </div>
              </div>

              {/* ── Holdings ── */}
              <div className="pf-holdings">
                <div className="pf-holdings-title">☰ My Holdings</div>
                {stocks.length === 0 ? (
                  <div className="pf-no-holdings">No stocks yet. Use &quot;Add Stock to Portfolio&quot; above.</div>
                ) : (
                  <>
                    <div className="pf-table-wrap">
                      <table className="pf-table">
                        <thead>
                          <tr>
                            <th>SR. NO.</th>
                            <th>COMPANY</th>
                            <th>QUANTITY</th>
                            <th>AVG BUY PRICE</th>
                            <th>BUY DATE</th>
                            <th>CURRENT PRICE</th>
                            <th>TOTAL VALUE</th>
                            <th>GAIN / LOSS %</th>
                            <th>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageStocks.map((h, i) => {
                            const curPrice = prices[h.symbol]?.price ?? null;
                            const totalVal = h.quantity * (curPrice ?? h.buyPrice);
                            const gl       = curPrice !== null ? ((curPrice - h.buyPrice) / h.buyPrice) * 100 : null;
                            return (
                              <tr key={h._id}>
                                <td>{(page - 1) * PER_PAGE + i + 1}</td>
                                <td><strong>{h.companyName}</strong></td>
                                <td>{h.quantity}</td>
                                <td>{fmtAUD(h.buyPrice)}</td>
                                <td>{fmtDate(h.buyDate)}</td>
                                <td>{curPrice !== null ? fmtAUD(curPrice) : '—'}</td>
                                <td>{fmtAUD(totalVal)}</td>
                                <td className={gl === null ? '' : gl >= 0 ? 'gain' : 'loss'}>
                                  {gl === null ? '—' : `${gl.toFixed(1)}% ${gl >= 0 ? '▲' : '▼'}`}
                                </td>
                                <td>
                                  <button className="pf-del-btn" onClick={() => deleteStock(h._id)} title="Remove">×</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ── Pagination ── */}
                    <div className="pf-pagination">
                      <div className="pf-pag-info">
                        Showing {(page - 1) * PER_PAGE + 1} to {Math.min(page * PER_PAGE, stocks.length)} of {stocks.length} entr{stocks.length === 1 ? 'y' : 'ies'}
                      </div>
                      <div className="pf-pag-btns">
                        {['«', '‹', ...Array.from({ length: totalPages }, (_, i) => i + 1), '›', '»'].map((btn, i) => {
                          let target: number | null = null;
                          if (btn === '«') target = 1;
                          else if (btn === '‹') target = Math.max(1, page - 1);
                          else if (btn === '›') target = Math.min(totalPages, page + 1);
                          else if (btn === '»') target = totalPages;
                          else target = btn as number;
                          return (
                            <button
                              key={i}
                              className={`pf-pag-btn ${target === page && typeof btn === 'number' ? 'active' : ''}`}
                              onClick={() => setPage(target!)}
                              disabled={
                                ((btn === '«' || btn === '‹') && page === 1) ||
                                ((btn === '›' || btn === '»') && page === totalPages)
                              }
                            >{btn}</button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── New Portfolio Modal ── */}
      {npModal.open && (
        <div className="pf-modal-overlay" onClick={() => setNpModal({ open: false, name: '', err: '', saving: false })}>
          <div className="pf-modal" onClick={e => e.stopPropagation()}>
            <div className="pf-modal-header">
              <span className="pf-modal-title">New Portfolio</span>
              <button className="pf-modal-close" onClick={() => setNpModal({ open: false, name: '', err: '', saving: false })}>×</button>
            </div>
            <div className="pf-modal-body">
              <label className="pf-modal-label">Portfolio Name</label>
              <input
                className="pf-modal-input"
                placeholder="e.g. My ASX Portfolio"
                value={npModal.name}
                autoFocus
                onChange={e => setNpModal(m => ({ ...m, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleCreatePortfolio(); }}
              />
              {npModal.err && <div className="pf-modal-err">{npModal.err}</div>}
            </div>
            <div className="pf-modal-footer">
              <button className="pf-modal-cancel" onClick={() => setNpModal({ open: false, name: '', err: '', saving: false })}>Cancel</button>
              <button className="pf-modal-confirm" onClick={handleCreatePortfolio} disabled={npModal.saving}>
                {npModal.saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Portfolio Modal ── */}
      {delModal.portfolio && (
        <div className="pf-modal-overlay" onClick={() => setDelModal({ portfolio: null, saving: false })}>
          <div className="pf-modal" onClick={e => e.stopPropagation()}>
            <div className="pf-modal-header">
              <span className="pf-modal-title">Delete Portfolio</span>
              <button className="pf-modal-close" onClick={() => setDelModal({ portfolio: null, saving: false })}>×</button>
            </div>
            <div className="pf-modal-body">
              <p className="pf-modal-text">
                Are you sure you want to delete <strong>&quot;{delModal.portfolio.name}&quot;</strong>?
                All holdings in this portfolio will be permanently removed.
              </p>
            </div>
            <div className="pf-modal-footer">
              <button className="pf-modal-cancel" onClick={() => setDelModal({ portfolio: null, saving: false })}>Cancel</button>
              <button className="pf-modal-del" onClick={handleDeletePortfolio} disabled={delModal.saving}>
                {delModal.saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
