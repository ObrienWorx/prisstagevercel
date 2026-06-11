'use client';

import { useEffect, useRef } from 'react';

export default function TickerTape() {
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tickerRef.current;
    if (!el) return;
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.text = JSON.stringify({
      symbols: [
        { proName: 'ASX:CBA', title: 'CBA' },
        { proName: 'ASX:BHP', title: 'BHP' },
        { proName: 'ASX:REA', title: 'REA' },
        { proName: 'ASX:PNV', title: 'PNV' },
        { proName: 'ASX:LKE', title: 'LKE' },
        { proName: 'ASX:BC8', title: 'BC8' },
        { proName: 'ASX:ANZ', title: 'ANZ' },
        { proName: 'ASX:NAB', title: 'NAB' },
        { proName: 'ASX:WBC', title: 'WBC' },
        { proName: 'ASX:CSL', title: 'CSL' },
      ],
      showSymbolLogo: false,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'light',
      locale: 'en',
    });
    el.appendChild(script);
    return () => { el.innerHTML = ''; };
  }, []);

  return (
    <div className="header-ticker">
      <div className="tradingview-widget-container w-100" ref={tickerRef} />
    </div>
  );
}
