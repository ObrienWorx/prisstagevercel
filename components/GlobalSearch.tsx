'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  _id: string;
  title: string;
  slug: string;
  upsellTicker: string;
  sector: { _id: string; name: string } | null;
  recommendation: string;
  publishStatus: 'draft' | 'published';
}

const RECOM_COLOR: Record<string, string> = {
  BUY: '#16a34a', HOLD: '#d97706', SELL: '#dc2626',
  'SPECULATIVE BUY': '#0049AC', REFRAIN: '#64748b', 'Security Under Review': '#9333ea',
};

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        setOpen(true);
        setActiveIdx(-1);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectResult = (r: SearchResult) => {
    setQuery('');
    setOpen(false);
    router.push(`/dashboard/reports?edit=${r._id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectResult(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--muted)', fontSize: 14, pointerEvents: 'none',
        }}>
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder="Search By Stock or Ticker..."
          style={{
            width: '100%',
            paddingLeft: 32,
            paddingRight: loading ? 32 : 10,
            paddingTop: 6,
            paddingBottom: 6,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
            fontSize: 13,
            outline: 'none',
          }}
          autoComplete="off"
        />
        {loading && (
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          }}>
            <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, borderWidth: 2, color: 'var(--muted)' }} />
          </span>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          zIndex: 9999,
          overflow: 'hidden',
          maxHeight: 360,
          overflowY: 'auto',
        }}>
          {results.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 13 }}>
              No reports found
            </div>
          ) : (
            <>
              <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reports ({results.length})
              </div>
              {results.map((r, i) => (
                <button
                  key={r._id}
                  onClick={() => selectResult(r)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 12px',
                    background: i === activeIdx ? 'var(--hover)' : 'transparent',
                    border: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(-1)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, flex: 1, minWidth: 0 }} className="text-truncate">
                      {r.title}
                    </span>
                    <span className={`badge ${r.publishStatus === 'published' ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: 10 }}>
                      {r.publishStatus}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {r.sector?.name && (
                      <span style={{ fontSize: 11, color: 'var(--muted)', background: 'rgba(99,102,241,0.12)', padding: '1px 7px', borderRadius: 20 }}>
                        {r.sector.name}
                      </span>
                    )}
                    {r.upsellTicker && (
                      <span style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '1px 7px', borderRadius: 20 }}>
                        {r.upsellTicker}
                      </span>
                    )}
                    {r.recommendation && (
                      <span style={{ fontSize: 10, color: '#fff', background: RECOM_COLOR[r.recommendation] || '#64748b', padding: '1px 7px', borderRadius: 20 }}>
                        {r.recommendation}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
