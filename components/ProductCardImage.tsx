'use client';

import { useState } from 'react';

type Props = {
  src?: string;
  alt: string;
};

export default function ProductCardImage({ src, alt }: Props) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return <div className="product-card-img-placeholder">📊</div>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className="product-card-img"
      onError={() => setBroken(true)}
    />
  );
}
