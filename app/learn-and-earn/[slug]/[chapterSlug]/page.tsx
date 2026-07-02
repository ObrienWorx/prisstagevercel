import { redirect, notFound } from 'next/navigation';
import connectDB from '@/lib/mongoose';
import LearnAndEarn from '@/models/LearnAndEarn';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string; chapterSlug: string }> };

export default async function LearnChapterSlugPage({ params }: P) {
  const { slug, chapterSlug } = await params;
  await connectDB();
  const mod = await LearnAndEarn.findOne({ slug, publishStatus: 'published' }).lean() as any;
  if (!mod) notFound();
  const chIndex = (mod.chapters || []).findIndex((c: any) => c.slug === chapterSlug);
  redirect(`/learn-and-earn/${slug}?ch=${chIndex >= 0 ? chIndex + 1 : 1}`);
}
