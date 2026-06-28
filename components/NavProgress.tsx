'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => {
    if (trickle.current) { clearInterval(trickle.current); trickle.current = null; }
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const start = () => {
    clearAll();
    setVisible(true);
    setWidth(8);
    trickle.current = setInterval(() => {
      setWidth(w => (w < 90 ? w + Math.max(0.5, (90 - w) * 0.08) : w));
    }, 200);
    timers.current.push(setTimeout(() => done(), 15000));
  };

  const done = () => {
    clearAll();
    setWidth(100);
    timers.current.push(setTimeout(() => { setVisible(false); setWidth(0); }, 350));
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.('a');
      if (!a) return;
      const href = a.getAttribute('href');
      const target = a.getAttribute('target');
      if (!href || target === '_blank' || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search) return;
      } catch { return; }
      start();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', start);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', start);
      clearAll();
    };
  }, []);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    done();
  }, [pathname]);

  if (!visible) return null;
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, height: 3,
        width: `${width}%`,
        background: 'linear-gradient(90deg,#df9000,#f5b301)',
        boxShadow: '0 0 8px rgba(223,144,0,0.7)',
        zIndex: 100000,
        transition: 'width 0.2s ease',
        borderTopRightRadius: 2, borderBottomRightRadius: 2,
        pointerEvents: 'none',
      }}
    />
  );
}
