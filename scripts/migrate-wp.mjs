// scripts/migrate-wp.mjs
// One-off migration: pull WordPress posts via the REST API into the Blog collection.
// Brings ONLY: title, content (HTML), featured image (original WP URL kept as-is).
// Each source post type maps to one existing BlogCategory.
//
//   post  -> trending-stock-market-news
//   case  -> editorials
//
// Usage:
//   node scripts/migrate-wp.mjs            # migrate both
//   node scripts/migrate-wp.mjs post       # only the `post` type
//   node scripts/migrate-wp.mjs case       # only the `case` type
//
// Re-running is safe: posts already present (matched by slug) are skipped.

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- config -------------------------------------------------------------
const WP_BASE = 'https://pristinegaze.com.au';
const JOBS = [
  { restBase: 'posts', categorySlug: 'trending-stock-market-news' },
  { restBase: 'case', categorySlug: 'editorials' },
];

// --- load MONGODB_URI from .env ----------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

// --- minimal schemas (match existing collections) -----------------------
const Blog = mongoose.model('Blog', new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true },
  content: String,
  featuredImage: String,
  tags: [String],
  authorName: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory', default: null },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory' }],
  publishStatus: { type: String, default: 'draft' },
  metaTitle: String,
  metaDescription: String,
  metaImage: String,
}, { timestamps: true }));

const BlogCategory = mongoose.model('BlogCategory', new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true },
  status: { type: String, default: 'active' },
}, { timestamps: true, strict: false }));

// --- helpers ------------------------------------------------------------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#8217': '’', '#8216': '‘', '#8220': '“', '#8221': '”', '#8211': '–', '#8212': '—', '#8230': '…', '#038': '&' };
function decodeEntities(str = '') {
  return str.replace(/&(#?\w+);/g, (full, code) => {
    if (code in ENTITIES) return ENTITIES[code];
    if (/^#\d+$/.test(code)) return String.fromCodePoint(parseInt(code.slice(1), 10));
    if (/^#x[0-9a-f]+$/i.test(code)) return String.fromCodePoint(parseInt(code.slice(2), 16));
    return full;
  });
}

async function getCategory(slug) {
  let cat = await BlogCategory.findOne({ slug });
  if (!cat) {
    const name = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    cat = await BlogCategory.create({ name, slug, status: 'active' });
    console.log(`  + created missing category "${name}" (${slug})`);
  }
  return cat;
}

async function uniqueSlug(base) {
  let slug = base || 'post';
  let n = 2;
  while (await Blog.exists({ slug })) slug = `${base}-${n++}`;
  return slug;
}

async function fetchAll(restBase) {
  const limit = Number(process.env.LIMIT || 0); // 0 = all; otherwise N latest
  const perPage = limit ? Math.min(limit, 100) : 100;
  let page = 1;
  const all = [];
  while (true) {
    const url = `${WP_BASE}/wp-json/wp/v2/${restBase}?per_page=${perPage}&page=${page}&_embed=wp:featuredmedia&status=publish&orderby=date&order=desc`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 400) break; // page beyond range
    if (!res.ok) throw new Error(`${restBase} page ${page} -> HTTP ${res.status}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    const totalPages = Number(res.headers.get('x-wp-totalpages') || 0);
    process.stdout.write(`\r  fetched ${all.length} ${restBase}...`);
    if (limit && all.length >= limit) { all.length = limit; break; }
    if (totalPages && page >= totalPages) break;
    page++;
  }
  process.stdout.write('\n');
  return all;
}

function featuredImageOf(post) {
  const media = post?._embedded?.['wp:featuredmedia'];
  if (Array.isArray(media) && media[0]?.source_url) return media[0].source_url;
  return '';
}

async function migrate({ restBase, categorySlug }) {
  console.log(`\n=== ${restBase} -> ${categorySlug} ===`);
  const cat = await getCategory(categorySlug);
  const posts = await fetchAll(restBase);

  let created = 0, skipped = 0;
  for (const p of posts) {
    const title = decodeEntities(p?.title?.rendered || '').trim();
    if (!title) { skipped++; continue; }
    const baseSlug = (p?.slug || title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')).toLowerCase();

    if (await Blog.exists({ slug: baseSlug })) { skipped++; continue; }

    await Blog.create({
      title,
      slug: await uniqueSlug(baseSlug),
      content: p?.content?.rendered || '',
      featuredImage: featuredImageOf(p),
      category: cat._id,
      categories: [cat._id],
      publishStatus: 'published',
      createdAt: p?.date ? new Date(p.date) : undefined,
    });
    created++;
  }
  console.log(`  done: ${created} created, ${skipped} skipped (already existed / no title)`);
}

// --- run ----------------------------------------------------------------
async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');

  const only = process.argv[2] === 'post' ? 'posts' : process.argv[2];
  const jobs = only ? JOBS.filter((j) => j.restBase === only) : JOBS;
  if (jobs.length === 0) throw new Error(`Unknown post type "${only}". Use: post(s) or case`);

  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log('Connected to MongoDB');

  // Relax TLS only for the public WP fetch (this env has an incomplete CA chain).
  // Done after the Mongo connection so Atlas keeps full certificate verification.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  for (const job of jobs) await migrate(job);

  await mongoose.disconnect();
  console.log('\nAll done.');
}

main().catch((e) => { console.error('\nMIGRATION FAILED:', e); process.exit(1); });
