'use client';

import { usePathname } from 'next/navigation';

export default function DynamicCanonical() {
  const pathname = usePathname();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pristinegaze.com.au';
  const cleanBase = siteUrl.replace(/\/+$/, '');
  const cleanPath = !pathname || pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const canonicalUrl = cleanPath === '/' ? `${cleanBase}/` : `${cleanBase}${cleanPath}`;

  return <link rel="canonical" href={canonicalUrl} />;
}
