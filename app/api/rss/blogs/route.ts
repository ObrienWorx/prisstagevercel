import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import BlogCategory from '@/models/BlogCategory';

void BlogCategory; // ensure model is registered for populate

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pristinegaze.com.au';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export async function GET() {
  await connectDB();

  const blogs = await Blog.find({ publishStatus: 'published' })
    .populate<{ category: { slug: string } | null }>('category', 'slug')
    .select('title slug content metaDescription publishedAt createdAt authorName category')
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(50)
    .lean();

  const selfUrl = `${BASE_URL}/api/rss/blogs`;

  const items = blogs.map(b => {
    const catSlug = (b.category as { slug: string } | null)?.slug || 'uncategorised';
    const link    = `${BASE_URL}/${catSlug}/${b.slug}`;
    const pubDate = new Date((b.publishedAt || b.createdAt) as Date).toUTCString();
    const desc    = esc(b.metaDescription || stripHtml(b.content || '').slice(0, 200));
    return `
    <item>
      <title>${esc(b.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>${b.authorName ? `\n      <author>${esc(b.authorName)}</author>` : ''}
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Pristine Gaze — Blog</title>
    <link>${BASE_URL}</link>
    <description>Investment research, market insights, and ASX analysis from Pristine Gaze.</description>
    <language>en-AU</language>
    <ttl>60</ttl>
    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
