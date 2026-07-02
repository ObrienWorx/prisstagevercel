'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SaleProduct {
  _id: string;
  name: string;
  slug: string;
  featuredImage?: string;
  saleBanner?: string;
  salePrice: number | null;
  regularPrice: number;
  saleEndDate?: string | null;
  plans?: { regularPrice: number; salePrice: number | null }[];
  memberSale?: boolean;
}

function useCountdown(endDate?: string | null) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!endDate) return;
    const tick = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setTime({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);
  return time;
}

function SaleCard({ product }: { product: SaleProduct }) {
  const regPrice = (product.plans?.[0]?.regularPrice ?? product.regularPrice) || 0;
  const salePrice = product.plans?.[0]?.salePrice ?? product.salePrice;
  const pct = regPrice > 0 && salePrice != null ? Math.round((1 - salePrice / regPrice) * 100) : 0;
  const { d, h, m, s } = useCountdown(product.saleEndDate);
  const img = product.saleBanner || product.featuredImage;

  return (
    <div className="ssw-card">
      {/* Discount headline */}
      <div className="ssw-pct">{pct}% OFF</div>
      <div className="ssw-name">{product.name}</div>

      {/* Image with Members Only badge overlaid */}
      {img && (
        <div className="ssw-img-wrap">
          <img src={img} alt={product.name} className="ssw-img" />
          {product.memberSale && (
            <span className="ssw-member-badge">Members Only</span>
          )}
        </div>
      )}
      {!img && product.memberSale && (
        <span className="ssw-member-badge ssw-member-badge--standalone">Members Only</span>
      )}

      {/* Countdown */}
      {product.saleEndDate && (
        <div className="ssw-countdown-wrap">
          <div className="ssw-offer-label">Limited-Time Offer – {pct}% OFF Retail Price</div>
          <div className="ssw-timer">
            {[{ v: d, l: 'DAYS' }, { v: h, l: 'HOURS' }, { v: m, l: 'MINUTES' }, { v: s, l: 'SECONDS' }].map(({ v, l }) => (
              <div key={l} className="ssw-unit">
                <div className="ssw-val">{String(v).padStart(2, '0')}</div>
                <div className="ssw-lbl">{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href={`/subscribe/${product.slug}-limited-sale-offer`} className="ssw-btn">
        See the Offer →
      </Link>
    </div>
  );
}

export default function SaleSidebarWidget() {
  const [products, setProducts] = useState<SaleProduct[]>([]);

  useEffect(() => {
    fetch('/api/public/sale-products')
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data); })
      .catch(() => {});
  }, []);

  if (!products.length) return null;

  return (
    <aside className="ssw-wrap">
      {products.map((p, i) => (
        <div key={p._id}>
          {i > 0 && <div className="ssw-divider" />}
          <SaleCard product={p} />
        </div>
      ))}
    </aside>
  );
}
