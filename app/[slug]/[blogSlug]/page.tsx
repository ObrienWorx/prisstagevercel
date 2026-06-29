import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogSidebarPromo from '@/components/BlogSidebarPromo';
import LeadCapturePopup from '@/components/LeadCapturePopup';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string; blogSlug: string }> };

export async function generateMetadata({ params }: P) {
  const { blogSlug } = await params;
  await connectDB();
  const blog = await Blog.findOne({ slug: blogSlug, publishStatus: 'published' }).lean() as any;
  if (!blog) return { title: 'Not Found – PristineGaze' };
  return {
    title: blog.metaTitle || `${blog.title} – PristineGaze`,
    description: blog.metaDescription || '',
    openGraph: blog.metaImage ? { images: [blog.metaImage] } : undefined,
  };
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' });
}

export default async function BlogDetailPage({ params }: P) {
  const { slug: categorySlug, blogSlug } = await params;
  await connectDB();

  const blog = await Blog.findOne({ slug: blogSlug, publishStatus: 'published' })
    .populate('category', 'name slug')
    .populate('categories', 'name slug')
    .lean() as any;

  if (!blog) notFound();

  const legacyCategory = blog.category as { _id: unknown; name: string; slug: string } | null;
  const categories = (blog.categories as { _id: unknown; name: string; slug: string }[] | undefined) ?? [];
  const category = categories.find(item => item.slug === categorySlug)
    ?? (legacyCategory?.slug === categorySlug ? legacyCategory : null);
  if ((categories.length > 0 || legacyCategory) && !category) notFound();

  const latestFilter: Record<string, unknown> = {
    publishStatus: 'published',
    _id: { $ne: blog._id },
    ...(category ? { $or: [{ category: category._id }, { categories: category._id }] } : {}),
  };
  const latestBlogs = await Blog.find(latestFilter)
    .select('title slug featuredImage createdAt')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean() as any[];

  return (
    <SiteLayout>
      <LeadCapturePopup source={category?.slug || categorySlug} />
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #101251 100%)', color: '#fff', padding: '4rem 0 3rem' }}>
        <div className="container">
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 1rem', lineHeight: 1.2 }}>
            {blog.title}
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Published {fmtDate(blog.publishedAt ?? blog.createdAt)}
          </div>
        </div>
      </div>

      <div className="site-section">
        <div className="container">
          <div className="row g-5">
            <div className="col-lg-8">
              {blog.featuredImage && (
                <img
                  src={blog.featuredImage}
                  alt={blog.title}
                  style={{ width: '100%', borderRadius: 14, marginBottom: '2rem', maxHeight: 420, objectFit: 'cover' }}
                />
              )}
              <div
                className="tiptap-prose"
                style={{ fontSize: 16, lineHeight: 1.85, color: '#1e293b' }}
                dangerouslySetInnerHTML={{ __html: blog.content }}
              />
            </div>

            <div className="col-lg-4 d-none d-lg-block">
              <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <BlogSidebarPromo source={category?.slug || categorySlug} />

                {category && (
                  <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: 8 }}>Category</div>
                    <Link
                      href={`/${category.slug}`}
                      style={{ fontSize: 15, fontWeight: 700, color: '#0049AC', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      {category.name} <span style={{ color: '#3b82f6' }}>→</span>
                    </Link>
                    <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>View all {category.name} articles</div>
                  </div>
                )}

                {latestBlogs.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
                      More {category?.name || 'Articles'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {latestBlogs.map((b: any) => (
                        <Link
                          key={b._id.toString()}
                          href={category ? `/${category.slug}/${b.slug}` : '#'}
                          style={{ display: 'flex', gap: 10, textDecoration: 'none', alignItems: 'center' }}
                        >
                          <div style={{ width: 54, height: 40, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#e2e8f0' }}>
                            {b.featuredImage && (
                              <img src={b.featuredImage} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b', lineHeight: 1.35 }}>{b.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
