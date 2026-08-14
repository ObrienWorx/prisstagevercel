import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import BlogCategory from '@/models/BlogCategory';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pristinegaze.com.au';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

type P = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  const { slug } = await params;
  await connectDB();

  const category = await BlogCategory.findOne({ slug, status: 'active' }).lean();
  if (!category) {
    return new NextResponse('Category not found', { status: 404 });
  }

  const blogs = await Blog.find({
    publishStatus: 'published',
    $or: [{ category: category._id }, { categories: category._id }],
  })
    .select('title slug content metaDescription publishedAt createdAt authorName')
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(50)
    .lean();

  const selfUrl  = `${BASE_URL}/api/rss/blogs/${slug}`;
  const catUrl   = `${BASE_URL}/${slug}`;
  const catName  = (category as { name: string }).name;

  const items = blogs.map(b => {
    const link    = `${BASE_URL}/${slug}/${b.slug}`;
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
    <title>Pristine Gaze — ${esc(catName)}</title>
    <link>${catUrl}</link>
    <description>Latest posts in ${esc(catName)} from Pristine Gaze.</description>
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
