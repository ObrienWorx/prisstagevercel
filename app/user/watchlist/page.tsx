'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

interface SearchResult { symbol: string; name: string; exchange: string; }

interface WatchlistStock { _id: string; symbol: string; companyName: string; }
interface Watchlist { _id: string; name: string; stocks: WatchlistStock[]; }
interface StockDetail {
  name: string; open: number | null; high: number | null; low: number | null;
  price: number | null; volume: number | null; prevClose: number | null;
  change: number | null; changePct: number | null; marketCap: number | null;
}
type QuoteMap = Record<string, StockDetail>;

const fmtPrice  = (n: number | null) => n == null ? '—' : `$${n.toFixed(2)}`;
const fmtVol    = (n: number | null) => {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};
const fmtCap    = (n: number | null) => {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  return String(n);
};

function normalizeSymbol(raw: string) {
  const s = raw.trim().toUpperCase();
  return s.includes('.') ? s : `${s}.AX`;
}

const PER_PAGE_OPTIONS = [10, 25, 50];

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeId,   setActiveId]   = useState<string | null>(null);
  const [quotes,     setQuotes]     = useState<QuoteMap>({});
  const [loading,    setLoading]    = useState(true);
  const [addOpen,    setAddOpen]    = useState(true);
  const [code,       setCode]       = useState('');
  const [adding,     setAdding]     = useState(false);
  const [addErr,     setAddErr]     = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [selected,    setSelected]    = useState<SearchResult | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [search,     setSearch]     = useState('');
  const [perPage,    setPerPage]    = useState(10);
  const [page,       setPage]       = useState(1);
  const [delModal,   setDelModal]   = useState<{ wl: Watchlist | null; saving: boolean }>({ wl: null, saving: false });
  const [newModal,   setNewModal]   = useState({ open: false, name: '', err: '', saving: false });
  const tokenRef = useRef('');

  const active = watchlists.find(w => w._id === activeId) ?? null;

  const onCodeChange = useCallback((val: string) => {
    setCode(val); setSelected(null); setAddErr('');
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setSuggestions([]); setShowDrop(false); return; }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/proxy/yahoo-search?q=${encodeURIComponent(val)}`).then(r => r.json());
      if (res.success) { setSuggestions(res.results); setShowDrop(res.results.length > 0); }
    }, 300);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenRef.current}`,
  });

  useEffect(() => {
    tokenRef.current = localStorage.getItem('subscriber_token') ?? '';
    fetch('/api/subscriber/watchlists', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) { setWatchlists(d.data); if (d.data.length > 0) setActiveId(d.data[0]._id); } })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active || active.stocks.length === 0) { setQuotes({}); return; }
    const symbols = [...new Set(active.stocks.map(s => s.symbol))].join(',');
    fetch(`/api/proxy/yahoo-finance-detail?symbols=${symbols}`)
      .then(r => r.json())
      .then(d => { if (d.success) setQuotes(d.data); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.stocks.length]);

  useEffect(() => { setPage(1); setSearch(''); }, [activeId]);

  const filteredStocks = useMemo(() => {
    const q = search.toLowerCase();
    return (active?.stocks ?? []).filter(s =>
      !q || s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q)
    );
  }, [active, search]);

  const totalPages  = Math.max(1, Math.ceil(filteredStocks.length / perPage));
  const pageStocks  = filteredStocks.slice((page - 1) * perPage, page * perPage);

  const createWatchlist = async () => {
    const name = newModal.name.trim();
    if (!name) { setNewModal(m => ({ ...m, err: 'Name is required' })); return; }
    setNewModal(m => ({ ...m, saving: true, err: '' }));
    const r = await fetch('/api/subscriber/watchlists', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name }) });
    const d = await r.json();
    if (d.success) { setWatchlists(p => [...p, d.data]); setActiveId(d.data._id); setNewModal({ open: false, name: '', err: '', saving: false }); }
    else setNewModal(m => ({ ...m, saving: false, err: d.error || 'Failed' }));
  };

  const deleteWatchlist = async () => {
    if (!delModal.wl) return;
    setDelModal(m => ({ ...m, saving: true }));
    const id = delModal.wl._id;
    const r = await fetch(`/api/subscriber/watchlists/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json();
    if (d.success) {
      setWatchlists(p => p.filter(x => x._id !== id));
      setActiveId(prev => prev === id ? (watchlists.find(x => x._id !== id)?._id ?? null) : prev);
      setDelModal({ wl: null, saving: false });
    } else setDelModal(m => ({ ...m, saving: false }));
  };

  const addStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId) return;
    setAddErr(''); setAdding(true);
    const sym = normalizeSymbol(selected ? selected.symbol : code);
    const knownName = selected?.name ?? '';
    try {
      const priceRes = await fetch(`/api/proxy/yahoo-finance-detail?symbols=${encodeURIComponent(sym)}`).then(r => r.json());
      const info = priceRes?.data?.[sym];
      if (!info || info.price === null) { setAddErr(`"${sym.replace('.AX', '')}" not found. Please check the code and try again.`); return; }
      const r = await fetch(`/api/subscriber/watchlists/${activeId}/stocks`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ symbol: sym, companyName: info.name || knownName || sym }),
      });
      const d = await r.json();
      if (d.success) {
        setWatchlists(p => p.map(x => x._id === activeId ? d.data : x));
        setQuotes(prev => ({ ...prev, [sym]: info }));
        setCode(''); setSelected(null); setSuggestions([]); setShowDrop(false);
      } else setAddErr(d.error ?? 'Failed to add.');
    } finally { setAdding(false); }
  };

  const removeStock = async (stockId: string) => {
    if (!activeId) return;
    const r = await fetch(`/api/subscriber/watchlists/${activeId}/stocks/${stockId}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json();
    if (d.success) setWatchlists(p => p.map(x => x._id === activeId ? d.data : x));
  };

  if (loading) return <div className="pf-loading">Loading watchlists…</div>;

  return (
    <div className="wl-page">
      <div className="wl-header">
        <div>
          <h1 className="wl-title">My Watchlist</h1>
          <p className="wl-subtitle">Keep track of your favorite stocks and stay updated on their performance.</p>
        </div>
      </div>

      <div className="wl-card">
        {/* Tabs */}
        <div className="wl-tabs-row">
          {watchlists.map(wl => (
            <div key={wl._id} className={`wl-tab ${wl._id === activeId ? 'active' : ''}`} onClick={() => setActiveId(wl._id)}>
              {wl.name}
              <button className="wl-tab-del" title="Delete group"
                onClick={e => { e.stopPropagation(); setDelModal({ wl, saving: false }); }}>
                🗑
              </button>
            </div>
          ))}
          <button className="wl-add-group-btn" onClick={() => setNewModal({ open: true, name: '', err: '', saving: false })}>
            + Add Watchlist Group
          </button>
        </div>

        {watchlists.length === 0 ? (
          <div className="pf-empty">
            <div className="pf-empty-icon">👀</div>
            <div className="pf-empty-title">No watchlists yet</div>
            <div className="pf-empty-sub">Click &quot;+ Add Watchlist Group&quot; to get started.</div>
          </div>
        ) : active && (
          <>
            {/* Add stock collapsible */}
            <div className="wl-add-section">
              <div className="wl-add-header" onClick={() => setAddOpen(o => !o)}>
                <span>Add Stock/Company to Watchlist Group</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: addOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {addOpen && (
                <form className="wl-add-form" onSubmit={addStock}>
                  <div className="wl-search-wrap" ref={dropRef}>
                    <input
                      className="wl-code-input"
                      type="text"
                      placeholder="Enter company code or name"
                      value={code}
                      onChange={e => onCodeChange(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                      autoComplete="off"
                      required
                    />
                    {showDrop && (
                      <div className="wl-dropdown">
                        {suggestions.map(s => (
                          <div
                            key={s.symbol}
                            className="wl-dropdown-item"
                            onMouseDown={e => { e.preventDefault(); setSelected(s); setCode(s.name); setShowDrop(false); }}
                          >
                            <span className="wl-drop-name">{s.name}</span>
                            <span className="wl-drop-code">({s.symbol.replace('.AX', '')})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" className="wl-add-btn" disabled={adding}>
                    {adding ? '…' : 'Add'}
                  </button>
                  {addErr && <div className="wl-add-err">{addErr}</div>}
                </form>
              )}
            </div>

            {/* Table */}
            <div className="wl-table-section">
              <div className="wl-table-title">My Watchlist</div>
              <div className="wl-table-controls">
                <div className="wl-per-page">
                  <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}>
                    {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span>entries per page</span>
                </div>
                <div className="wl-search">
                  <label>Search:</label>
                  <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
              </div>

              {active.stocks.length === 0 ? (
                <div className="pf-no-holdings">No stocks yet. Add a company code above.</div>
              ) : (
                <>
                  <div className="wl-table-wrap">
                    <table className="wl-table">
                      <thead>
                        <tr>
                          <th>Sr. No.</th>
                          <th>Company</th>
                          <th>Code</th>
                          <th>Open</th>
                          <th>High</th>
                          <th>Low</th>
                          <th>Current Price</th>
                          <th>Volume</th>
                          <th>Prev Close</th>
                          <th>Change</th>
                          <th>Change %</th>
                          <th>Market Cap</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageStocks.map((s, i) => {
                          const q = quotes[s.symbol];
                          const isNeg = q && q.change !== null && q.change < 0;
                          const isPos = q && q.change !== null && q.change > 0;
                          return (
                            <tr key={s._id}>
                              <td>{(page - 1) * perPage + i + 1}</td>
                              <td><strong>{q?.name ?? s.companyName}</strong></td>
                              <td className="wl-code-cell">{s.symbol.replace('.AX', '')}</td>
                              <td>{fmtPrice(q?.open ?? null)}</td>
                              <td>{fmtPrice(q?.high ?? null)}</td>
                              <td>{fmtPrice(q?.low ?? null)}</td>
                              <td><strong>{fmtPrice(q?.price ?? null)}</strong></td>
                              <td>{fmtVol(q?.volume ?? null)}</td>
                              <td>{fmtPrice(q?.prevClose ?? null)}</td>
                              <td className={isPos ? 'wl-gain' : isNeg ? 'wl-loss' : ''}>
                                {q?.change != null ? `${isPos ? '+' : ''}${fmtPrice(q.change)} ${isPos ? '▲' : isNeg ? '▼' : ''}` : '—'}
                              </td>
                              <td className={isPos ? 'wl-gain' : isNeg ? 'wl-loss' : ''}>
                                {q?.changePct != null ? `${isPos ? '+' : ''}${q.changePct.toFixed(2)}% ${isPos ? '▲' : isNeg ? '▼' : ''}` : '—'}
                              </td>
                              <td>{fmtCap(q?.marketCap ?? null)}</td>
                              <td>
                                <button className="wl-del-btn" onClick={() => removeStock(s._id)} title="Remove">✕</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="pf-pagination">
                    <div className="pf-pag-info">
                      {filteredStocks.length === 0 ? 'No entries' : `Showing ${(page - 1) * perPage + 1} to ${Math.min(page * perPage, filteredStocks.length)} of ${filteredStocks.length} entr${filteredStocks.length === 1 ? 'y' : 'ies'}`}
                    </div>
                    <div className="pf-pag-btns">
                      {(['«', '‹', ...Array.from({ length: totalPages }, (_, i) => i + 1), '›', '»'] as (string | number)[]).map((btn, i) => {
                        let target = typeof btn === 'number' ? btn : btn === '«' ? 1 : btn === '‹' ? Math.max(1, page - 1) : btn === '›' ? Math.min(totalPages, page + 1) : totalPages;
                        return (
                          <button key={i}
                            className={`pf-pag-btn ${target === page && typeof btn === 'number' ? 'active' : ''}`}
                            onClick={() => setPage(target)}
                            disabled={((btn === '«' || btn === '‹') && page === 1) || ((btn === '›' || btn === '»') && page === totalPages)}>
                            {btn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* New Watchlist Modal */}
      {newModal.open && (
        <div className="pf-modal-overlay" onClick={() => setNewModal({ open: false, name: '', err: '', saving: false })}>
          <div className="pf-modal" onClick={e => e.stopPropagation()}>
            <div className="pf-modal-header">
              <span className="pf-modal-title">New Watchlist Group</span>
              <button className="pf-modal-close" onClick={() => setNewModal({ open: false, name: '', err: '', saving: false })}>×</button>
            </div>
            <div className="pf-modal-body">
              <label className="pf-modal-label">Watchlist Name</label>
              <input className="pf-modal-input" placeholder="e.g. Watchlist 1" autoFocus
                value={newModal.name} onChange={e => setNewModal(m => ({ ...m, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') createWatchlist(); }} />
              {newModal.err && <div className="pf-modal-err">{newModal.err}</div>}
            </div>
            <div className="pf-modal-footer">
              <button className="pf-modal-cancel" onClick={() => setNewModal({ open: false, name: '', err: '', saving: false })}>Cancel</button>
              <button className="pf-modal-confirm" onClick={createWatchlist} disabled={newModal.saving}>
                {newModal.saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Watchlist Modal */}
      {delModal.wl && (
        <div className="pf-modal-overlay" onClick={() => setDelModal({ wl: null, saving: false })}>
          <div className="pf-modal" onClick={e => e.stopPropagation()}>
            <div className="pf-modal-header">
              <span className="pf-modal-title">Delete Watchlist</span>
              <button className="pf-modal-close" onClick={() => setDelModal({ wl: null, saving: false })}>×</button>
            </div>
            <div className="pf-modal-body">
              <p className="pf-modal-text">Delete <strong>&quot;{delModal.wl.name}&quot;</strong>? All stocks in this group will be removed.</p>
            </div>
            <div className="pf-modal-footer">
              <button className="pf-modal-cancel" onClick={() => setDelModal({ wl: null, saving: false })}>Cancel</button>
              <button className="pf-modal-del" onClick={deleteWatchlist} disabled={delModal.saving}>
                {delModal.saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
