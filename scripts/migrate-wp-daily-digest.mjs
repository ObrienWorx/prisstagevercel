// scripts/migrate-wp-daily-digest.mjs
// One-off migration: WordPress "Daily Newsletter" (service-category id 203) posts
// -> our Report collection, gated behind the "Daily Digest" Product.
//
// SIMPLE, LOW-RISK RULE (deliberately): one WP post -> exactly one Report.
//   * ticker + index come from the TITLE when it has the "<INDEX>: <TICKER>" shape:
//        "Daily Digest – ASX: IPH"            -> index ASX,  ticker IPH
//        "Securities Under Review – NYSE: UBER" -> index NYSE, ticker UBER
//     If the title has no such pair (e.g. "Daily Digest – 11 Feb"), ticker/index are
//     left BLANK. We do NOT try to split those multi-stock posts (that lives in the
//     backup script migrate-wp-daily-digest.complex.mjs.bak).
//   * the full WP post body is kept as-is for content (it already carries the
//     disclaimer and chart images).
//   * recommendation comes from ACF `tagss` (first value); price is best-effort from
//     the body "closing price of $…" line. Both optional — blank/0 when absent.
//
// Brings: title, slug, content, featuredImage, product (Daily Digest), upsellTicker (index),
//         ticker, price, recommendation, recommendations, publishStatus=published,
//         createdAt (original WP date).
//
// Usage:
//   node scripts/migrate-wp-daily-digest.mjs           # import ALL Daily Newsletter posts
//   DRY=1 node scripts/migrate-wp-daily-digest.mjs     # parse + print, write NOTHING
//   LIMIT=20 node scripts/migrate-wp-daily-digest.mjs  # only the 20 latest posts
//
// Re-running is safe: reports already present (matched by slug) are skipped.

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WP_BASE = 'https://pristinegaze.com.au';
const DAILY_NEWSLETTER_TERM = 203; // service-category "Daily Newsletter"
const PRODUCT_NAME = 'Daily Digest';

const DRY = !!process.env.DRY;
const LIMIT = Number(process.env.LIMIT || 0);

const RECO_MAP = {
  buy: 'BUY', sell: 'SELL', hold: 'HOLD',
  'speculative buy': 'SPECULATIVE BUY', refrain: 'REFRAIN',
  'security under review': 'Security Under Review', 'securities under review': 'Security Under Review',
};

// --- env ----------------------------------------------------------------
function loadEnv() {
  const raw = readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

// --- schemas ------------------------------------------------------------
const Report = mongoose.model('Report', new mongoose.Schema({
  title: String, slug: { type: String, unique: true }, content: String, featuredImage: String,
  category: mongoose.Schema.Types.ObjectId, sector: mongoose.Schema.Types.ObjectId, product: mongoose.Schema.Types.ObjectId,
  upsellTicker: String, ticker: String, price: Number, recommendation: String,
  recommendations: [String], publishStatus: String, featured: Boolean,
}, { timestamps: true, strict: false }));
const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));

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

// Title -> { index, ticker } when it ends with "<INDEX>: <TICKER>", else { index:'', ticker:'' }.
function parseTitle(title) {
  const t = decodeEntities(title).trim();
  const m = t.match(/[–—-]\s*([A-Za-z][A-Za-z .]*?):\s*([A-Za-z0-9.]+)\s*$/);
  return m ? { index: m[1].trim().toUpperCase(), ticker: m[2].toUpperCase() } : { index: '', ticker: '' };
}

// Best-effort first price from the body "(closing) price of $<n>".
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

// Fallback reco when ACF is empty: some titles ARE the call, e.g. "Securities Under Review – …".
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

async function uniqueSlug(base) {
  let slug = base || 'daily-digest';
  let n = 2;
  while (await Report.exists({ slug })) slug = `${base}-${n++}`;
  return slug;
}

// --- main ---------------------------------------------------------------
async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log('Connected to MongoDB' + (DRY ? '  (DRY RUN — no writes)' : ''));
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // relax only for the public WP fetch

  const productDoc = await Product.findOne({ name: PRODUCT_NAME }).lean();
  if (!productDoc) throw new Error(`Product "${PRODUCT_NAME}" not found`);
  const productId = productDoc._id;

  let created = 0, skipped = 0, seen = 0, page = 1, noTicker = 0;

  outer:
  while (true) {
    const url = `${WP_BASE}/wp-json/wp/v2/service?service-category=${DAILY_NEWSLETTER_TERM}&per_page=50&page=${page}&status=publish&orderby=date&order=desc&_embed=wp:featuredmedia&_fields=id,date,slug,title,content,acf,_links,_embedded`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`service page ${page} -> HTTP ${res.status}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    const totalPages = Number(res.headers.get('x-wp-totalpages') || 0);

    for (const p of batch) {
      seen++;
      const html = p?.content?.rendered || '';
      const title = decodeEntities(p?.title?.rendered || '').trim();
      const baseSlug = (p?.slug || '').toLowerCase();
      if (await Report.exists({ slug: baseSlug })) { skipped++; if (LIMIT && seen >= LIMIT) break outer; continue; }

      const { index, ticker } = parseTitle(p?.title?.rendered || '');
      if (!ticker) noTicker++;
      const recos = readAcf(p);
      const recommendation = recos[0] || recoFromTitle(p?.title?.rendered || '');
      const price = firstPrice(html);
      const slug = await uniqueSlug(baseSlug);

      if (DRY) {
        console.log(`  [${p.id}] ${index || '—'}: ${ticker || '—'} | ${recommendation || '—'} | $${price} | "${title}" | slug=${slug}`);
      } else {
        await Report.create({
          title, slug, content: html,
          featuredImage: featuredImageOf(p, html),
          product: productId, upsellTicker: index, ticker,
          price, recommendation, recommendations: recos,
          publishStatus: 'published',
          createdAt: p?.date ? new Date(p.date) : undefined,
        });
      }
      created++;
      if (LIMIT && seen >= LIMIT) break outer;
    }

    process.stdout.write(`\r  page ${page}/${totalPages} — seen ${seen}, created ${created}, skipped ${skipped}`);
    if (totalPages && page >= totalPages) break;
    page++;
  }
  process.stdout.write('\n');

  console.log(`\nDone: ${created} reports ${DRY ? 'WOULD BE created' : 'created'} from ${seen} posts, ${skipped} skipped (existing slug). ${noTicker} had no ticker/index in title (left blank).`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error('\nMIGRATION FAILED:', e); process.exit(1); });
