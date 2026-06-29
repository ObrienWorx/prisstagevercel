import { normalizeBlogTags } from './blogTags';

export const LISTING_PER_PAGE = 12;

export function fmtListDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' });
}

export function cleanExcerpt(html: string, len = 160) {
  if (!html) return '';
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > len ? `${text.slice(0, len).trim()}...` : text;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toReportListItem(r: any) {
  return {
    _id: r._id.toString(),
    title: r.title,
    slug: r.slug,
    featuredImage: r.featuredImage,
    date: fmtListDate(r.publishedAt ?? r.createdAt),
    href: `/reports/${r.slug}`,
    cta: 'Read Report »',
    recommendation: r.recommendation || '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toBlogListItem(b: any, catSlug: string, catName: string) {
  return {
    _id: b._id.toString(),
    title: b.title,
    slug: b.slug,
    featuredImage: b.featuredImage,
    tags: normalizeBlogTags(b.tags),
    authorName: b.authorName || '',
    date: fmtListDate(b.publishedAt ?? b.createdAt),
    excerpt: b.metaDescription || cleanExcerpt(b.content || '', 120),
    href: `/${catSlug}/${b.slug}`,
    cta: `Read ${catName} »`,
  };
}
