import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pristinegaze.com.au';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  await connectDB();

  const products = await Product.find({
    status: 'published',
    isActive: true,
    showOnFrontend: { $ne: false },
  })
    .select('name slug shortDescription metaDescription regularPrice createdAt updatedAt')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  const selfUrl = `${BASE_URL}/api/rss/products`;

  const items = (products as Array<{
    name: string; slug: string; shortDescription?: string; metaDescription?: string;
    regularPrice?: number; createdAt: Date; updatedAt: Date;
  }>).map(p => {
    const link    = `${BASE_URL}/subscribe/${p.slug}`;
    const pubDate = new Date(p.createdAt).toUTCString();
    const priceNote = p.regularPrice ? ` — $${p.regularPrice.toFixed(2)}` : '';
    const desc    = esc((p.shortDescription || p.metaDescription || p.name) + priceNote);
    return `
    <item>
      <title>${esc(p.name)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Pristine Gaze — Subscription Plans</title>
    <link>${BASE_URL}/subscribe</link>
    <description>ASX research subscription products from Pristine Gaze.</description>
    <language>en-AU</language>
    <ttl>1440</ttl>
    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
