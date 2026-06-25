// scripts/migrate-wp-daily-digest-rebuild.mjs
// Rebuild of the WordPress "Daily Newsletter" (service-category 203) import into our
// Report collection, gated behind the "Daily Digest" Product.
//
// RULES:
//   • MULTI-stock post (≥2 stock headings) -> SPLIT into one report per stock.
//       - title   = original WP post title + " (INDEX:TICKER)"  e.g. "Daily Digest – 19 Dec 2025 (ASX:PYC)"
//       - content = that stock's section (company heading + ASX heading + body),
//                   with terms.txt appended at the end. The WP disclaimer is NOT kept.
//       - slug    = WP post slug + "-" + ticker  (parent slug, kept unique per stock)
//   • SINGLE-ticker post -> left exactly as the original simple import:
//       - title = WP post title, content = full WP body as-is, slug = WP post slug.
//       - No splitting, no terms.txt, nothing modified.
//
// Usage:
//   PURGE=1 node scripts/migrate-wp-daily-digest-rebuild.mjs       # delete all Daily Digest reports, then re-import
//   DRY=1   node scripts/migrate-wp-daily-digest-rebuild.mjs       # parse + print, write NOTHING
//   ONLY=41166 DRY=1 node scripts/migrate-wp-daily-digest-rebuild.mjs   # one post (debug)

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WP_BASE = 'https://pristinegaze.com.au';
const DAILY_NEWSLETTER_TERM = 203;
const PRODUCT_NAME = 'Daily Digest';

const DRY = !!process.env.DRY;
const LIMIT = Number(process.env.LIMIT || 0);
const ONLY = process.env.ONLY ? String(process.env.ONLY) : '';
const PURGE = !!process.env.PURGE;

// Shared "Terms and Disclaimer" block appended to every split report.
const TERMS = readFileSync(path.join(__dirname, '..', 'terms.txt'), 'utf8').trim();

const RECO_MAP = {
  buy: 'BUY', sell: 'SELL', hold: 'HOLD',
  'speculative buy': 'SPECULATIVE BUY', refrain: 'REFRAIN',
  'security under review': 'Security Under Review', 'securities under review': 'Security Under Review',
};
const RECO_RULES = [
  [/speculative\s+buy/i, 'SPECULATIVE BUY'],
  [/securit(?:y|ies)\s+under\s+review/i, 'Security Under Review'],
  [/refrain/i, 'REFRAIN'], [/\bhold\b/i, 'HOLD'], [/\bsell\b/i, 'SELL'], [/\bbuy\b/i, 'BUY'],
];
function mapReco(phrase = '') {
  for (const [re, label] of RECO_RULES) if (re.test(phrase)) return label;
  return '';
}

function loadEnv() {
  const raw = readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

const Report = mongoose.model('Report', new mongoose.Schema({
  title: String, slug: { type: String, unique: true }, content: String, featuredImage: String,
  category: mongoose.Schema.Types.ObjectId, sector: mongoose.Schema.Types.ObjectId, product: mongoose.Schema.Types.ObjectId,
  upsellTicker: String, ticker: String, price: Number, recommendation: String,
  recommendations: [String], publishStatus: String, featured: Boolean,
}, { timestamps: true, strict: false }));
const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#8217': '’', '#8216': '‘', '#8220': '“', '#8221': '”', '#8211': '–', '#8212': '—', '#8230': '…', '#038': '&' };
function decodeEntities(str = '') {
  return str.replace(/&(#?\w+);/g, (full, code) => {
    if (code in ENTITIES) return ENTITIES[code];
    if (/^#\d+$/.test(code)) return String.fromCodePoint(parseInt(code.slice(1), 10));
    if (/^#x[0-9a-f]+$/i.test(code)) return String.fromCodePoint(parseInt(code.slice(2), 16));
    return full;
  });
}
const stripTags = (s = '') => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const Q = '["“”‘’]';
function parseRecLine(html) {
  const text = stripTags(html);
  const re = new RegExp(
    `you may consider\\s*(?:placing\\s+)?an?\\s*${Q}\\s*([^"“”]+?)\\s*${Q}\\s*on\\s*${Q}\\s*([^"“”]+?)\\s*${Q}\\s*at the\\s*(?:closing\\s+)?price of\\s*${Q}?\\s*\\$?\\s*([\\d,]+(?:\\.\\d+)?)\\s*${Q}?\\s*\\(As of\\s*([^)]+)\\)`,
    'i'
  );
  const m = text.match(re);
  if (!m) return null;
  return { reco: mapReco(m[1]), company: m[2].replace(/\s+/g, ' ').trim(), price: parseFloat(m[3].replace(/,/g, '')), asOf: m[4].trim() };
}

// Keep headings + paragraphs + images/figures + lists, in document order.
function richContent(slice) {
  const nodes = slice.match(/<h2\b[^>]*>[\s\S]*?<\/h2>|<h3\b[^>]*>[\s\S]*?<\/h3>|<h4\b[^>]*>[\s\S]*?<\/h4>|<p\b[^>]*>[\s\S]*?<\/p>|<figure\b[^>]*>[\s\S]*?<\/figure>|<ul\b[^>]*>[\s\S]*?<\/ul>|<ol\b[^>]*>[\s\S]*?<\/ol>|<img\b[^>]*?\/?>/gi) || [];
  return nodes.map((n) => n.trim()).filter((n) => stripTags(n).length > 0 || /<img|<figure/i.test(n)).join('\n');
}
function firstImage(slice) {
  const m = slice.match(/<img\b[^>]*?\bsrc="([^"]+)"[^>]*?>/i);
  return m ? m[1] : '';
}
function disclaimerStart(html) {
  const i = html.search(new RegExp('<p[^>]*>(?:(?!<\\/p>)[\\s\\S])*?Disclaimer:', 'i'));
  return i === -1 ? html.length : i;
}

// Gutenberg: h4 headings carrying "INDEX: <mark>TICKER</mark>"
function gutenbergTickers(html) {
  const re = /<h4[^>]*wp-block-heading[^>]*>(?:(?!<\/h4>)[\s\S])*?([A-Za-z][A-Za-z .]*?):\s*<mark[^>]*>\s*([A-Za-z0-9.]+)\s*<\/mark>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push({ index: m[1].trim().toUpperCase(), ticker: m[2].toUpperCase(), pos: m.index });
  return out;
}
// Gutenberg: company-name h2 headings
function gutenbergCompanies(html) {
  const re = /<h2[^>]*wp-block-heading[^>]*>([\s\S]*?)<\/h2>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push({ start: m.index, text: stripTags(m[1]) });
  return out;
}
// Elementor: <h2 class="pxl-item--title">ASX: TICKER</h2>
function findHeadings(html) {
  const re = /<h2[^>]*pxl-item--title[^>]*>\s*([A-Za-z][A-Za-z .]*?):\s*<span class="pxl-title--highlight">[\s\S]*?<span class="pxl-item--text active">\s*([A-Za-z0-9.]+)\s*<\/span>[\s\S]*?<\/h2>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push({ index: m[1].trim().toUpperCase(), ticker: m[2].toUpperCase(), start: m.index, end: re.lastIndex });
  return out;
}

// --- single-post helpers (match the original simple importer exactly) ----
function parseTitleSimple(title) {
  const t = decodeEntities(title).trim();
  const m = t.match(/[–—-]\s*([A-Za-z][A-Za-z .]*?):\s*([A-Za-z0-9.]+)\s*$/);
  return m ? { index: m[1].trim().toUpperCase(), ticker: m[2].toUpperCase() } : { index: '', ticker: '' };
}
function firstPrice(html) {
  const text = decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  const m = text.match(/price of\s*["“”]?\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1].replace(/,/g, '')) : 0;
}
function readAcf(post) {
  const raw = post?.acf?.tagss;
  const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  return arr.map((t) => RECO_MAP[String(t).trim().toLowerCase()] || '').filter(Boolean);
}
function recoFromTitle(title) {
  const head = decodeEntities(title).split(/[–—-]/)[0].trim().toLowerCase();
  return RECO_MAP[head] || '';
}
function featuredImageOf(post, html) {
  const media = post?._embedded?.['wp:featuredmedia'];
  if (Array.isArray(media) && media[0]?.source_url) return media[0].source_url;
  const m = html.match(/<img\b[^>]*?\bsrc="([^"]+)"[^>]*?>/i);
  return m ? m[1] : '';
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
async function uniqueSlug(base) {
  let slug = base || 'daily-digest';
  let n = 2;
  while (await Report.exists({ slug })) slug = `${base}-${n++}`;
  return slug;
}

function buildReports(post) {
  const html = post?.content?.rendered || '';
  const postSlug = (post?.slug || '').toLowerCase();
  const postTitle = decodeEntities(post?.title?.rendered || '').trim();
  const postDate = post?.date ? new Date(post.date) : null;
  const cut = disclaimerStart(html);

  const gTickers = gutenbergTickers(html);
  const eHeads = findHeadings(html);

  // ---- MULTI (Gutenberg): split per stock ----
  if (gTickers.length >= 2) {
    const companies = gutenbergCompanies(html);
    const companyFor = (pos) => { let best = null; for (const c of companies) { if (c.start < pos) best = c; else break; } return best; };
    return gTickers.map((t, i) => {
      const comp = companyFor(t.pos);
      const blockStart = comp ? comp.start : t.pos;
      const nextComp = i + 1 < gTickers.length ? companyFor(gTickers[i + 1].pos) : null;
      const blockEnd = nextComp ? nextComp.start : cut;
      const slice = html.slice(blockStart, blockEnd);
      const rec = parseRecLine(slice) || {};
      return {
        title: `${postTitle} (${t.index}:${t.ticker})`,
        baseSlug: `${postSlug || 'daily-digest'}-${t.ticker.toLowerCase()}`,
        content: `${richContent(slice)}\n${TERMS}`,
        featuredImage: firstImage(slice),
        index: t.index, ticker: t.ticker, price: rec.price ?? 0,
        recommendation: rec.reco || '', recommendations: rec.reco ? [rec.reco] : [], createdAt: postDate,
      };
    });
  }

  // ---- MULTI (Elementor): split per stock ----
  if (eHeads.length >= 2) {
    return eHeads.map((h, i) => {
      const sliceEnd = i + 1 < eHeads.length ? eHeads[i + 1].start : cut;
      const slice = html.slice(h.end, sliceEnd);
      const rec = parseRecLine(slice) || {};
      const cleanHead = `<h4 class="wp-block-heading"><strong>${h.index}: <mark>${h.ticker}</mark></strong></h4>`;
      return {
        title: `${postTitle} (${h.index}:${h.ticker})`,
        baseSlug: `${postSlug || 'daily-digest'}-${h.ticker.toLowerCase()}`,
        content: `${cleanHead}\n${richContent(slice)}\n${TERMS}`,
        featuredImage: firstImage(slice),
        index: h.index, ticker: h.ticker, price: rec.price ?? 0,
        recommendation: rec.reco || '', recommendations: rec.reco ? [rec.reco] : [], createdAt: postDate,
      };
    });
  }

  // ---- SINGLE: leave exactly as the original simple import (full body, WP title/slug) ----
  const { index, ticker } = parseTitleSimple(post?.title?.rendered || '');
  const recos = readAcf(post);
  return [{
    title: postTitle,
    baseSlug: postSlug || slugify(postTitle || 'daily-digest'),
    content: html,
    featuredImage: featuredImageOf(post, html),
    index, ticker, price: firstPrice(html),
    recommendation: recos[0] || recoFromTitle(post?.title?.rendered || ''),
    recommendations: recos, createdAt: postDate,
    single: true,
  }];
}

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log('Connected to MongoDB' + (DRY ? '  (DRY RUN — no writes)' : ''));
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const productDoc = await Product.findOne({ name: PRODUCT_NAME }).lean();
  if (!productDoc) throw new Error(`Product "${PRODUCT_NAME}" not found`);
  const productId = productDoc._id;

  if (PURGE) {
    const n = await Report.countDocuments({ product: productId });
    if (DRY) console.log(`PURGE: would delete ${n} existing Daily Digest reports`);
    else { const r = await Report.deleteMany({ product: productId }); console.log(`PURGE: deleted ${r.deletedCount} existing Daily Digest reports`); }
  }

  let created = 0, skipped = 0, postsSeen = 0, splitPosts = 0, singlePosts = 0, page = 1;

  const handlePost = async (p) => {
    postsSeen++;
    const reports = buildReports(p);
    if (reports[0]?.single) singlePosts++; else splitPosts++;
    for (const r of reports) {
      if (await Report.exists({ slug: r.baseSlug })) { skipped++; continue; }
      const slug = await uniqueSlug(r.baseSlug);
      if (DRY) {
        console.log(`  [${p.id}] ${reports[0]?.single ? 'SINGLE' : 'SPLIT'} | ${r.index || '—'}:${r.ticker || '—'} | title="${r.title}" | slug=${slug}`);
      } else {
        await Report.create({
          title: r.title, slug, content: r.content, featuredImage: r.featuredImage,
          product: productId, upsellTicker: r.index, ticker: r.ticker,
          price: r.price, recommendation: r.recommendation, recommendations: r.recommendations,
          publishStatus: 'published', createdAt: r.createdAt || undefined,
        });
      }
      created++;
    }
  };

  const FIELDS = 'id,date,slug,title,content,acf,_links,_embedded';
  if (ONLY) {
    const res = await fetch(`${WP_BASE}/wp-json/wp/v2/service/${ONLY}?_embed=wp:featuredmedia&_fields=${FIELDS}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`post ${ONLY} -> HTTP ${res.status}`);
    await handlePost(await res.json());
  } else {
    while (true) {
      const url = `${WP_BASE}/wp-json/wp/v2/service?service-category=${DAILY_NEWSLETTER_TERM}&per_page=50&page=${page}&status=publish&orderby=date&order=desc&_embed=wp:featuredmedia&_fields=${FIELDS}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 400) break;
      if (!res.ok) throw new Error(`service page ${page} -> HTTP ${res.status}`);
      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      const totalPages = Number(res.headers.get('x-wp-totalpages') || 0);
      for (const p of batch) {
        await handlePost(p);
        if (LIMIT && postsSeen >= LIMIT) break;
      }
      process.stdout.write(`\r  page ${page}/${totalPages} — posts ${postsSeen}, reports ${created}, skipped ${skipped}`);
      if (LIMIT && postsSeen >= LIMIT) break;
      if (totalPages && page >= totalPages) break;
      page++;
    }
    process.stdout.write('\n');
  }

  console.log(`\nDone: ${created} reports ${DRY ? 'WOULD BE created' : 'created'} from ${postsSeen} posts (${splitPosts} split, ${singlePosts} single), ${skipped} skipped`);
  await mongoose.disconnect();
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) main().catch((e) => { console.error('\nMIGRATION FAILED:', e); process.exit(1); });

export { parseTitleSimple, parseRecLine, findHeadings, gutenbergTickers, gutenbergCompanies, buildReports, mapReco };
