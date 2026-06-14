// scripts/migrate-wp-reports.mjs
// One-off migration: WordPress `service` post type -> our Report collection.
//
// Rules (confirmed with the data owner):
//   * EXCLUDE any service post tagged with the "Daily Newsletter" service-category.
//   * WordPress merged Sector + Category + Product into one flat `service-category`
//     taxonomy. Each term is routed to the correct segment BY VALUE and renamed
//     old -> new (see the maps below). DB segment fact:
//        - cap tiers (Blue Chip/Mid Cap/Small Cap)  => ReportCategory  (report.category)
//        - GICS names (Staples/Energy/...)          => Sector          (report.sector)
//        - everything else                          => Product         (report.product, the access gate)
//   * "Featured" term            => report.featured = true
//   * recommendation comes from the ACF custom field `tagss` (Buy/Sell/Hold/Refrain/Speculative Buy).
//   * price comes from the body line: "...at the closing price of $7.39 ..."
//   * index (upsellTicker) + ticker come from the title:  "<name> (ASX: A2M)"
//   * featured image keeps the original WordPress URL.
//
// Brings: title, content (HTML), featuredImage, category, sector, product,
//         featured, upsellTicker, ticker, price, recommendation, publishStatus=published.
//
// Usage:
//   node scripts/migrate-wp-reports.mjs            # import ALL eligible services
//   LIMIT=10 node scripts/migrate-wp-reports.mjs   # import only the 10 latest eligible (sample)
//
// Re-running is safe: reports already present (matched by slug) are skipped.

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WP_BASE = 'https://pristinegaze.com.au';

// --- WP service-category term name -> target segment + new DB name -------
const CATEGORY_MAP = { // -> ReportCategory
  'Blue Chip': 'Blue Chip', 'Midcap': 'Mid Cap', 'Smallcap': 'Small Cap',
};
const SECTOR_MAP = { // -> Sector
  'Consumer': 'Staples', 'Discretionary': 'Discretionary', 'Energy': 'Energy',
  'Financial Services': 'Financials', 'Healthcare': 'Health Care', 'Industrial': 'Industrials',
  'Technology': 'Information Technology',
};
const PRODUCT_MAP = { // -> Product (access gate); 'Daily Newsletter' intentionally omitted (excluded)
  'Dividend Report': 'Dividend Yield Report', 'Emerging Growth Picks': 'Emerging Growth Opportunities',
  'Penny Stocks': 'Penny Stock Spotlight Report', 'USA Report': 'US Equity Report',
  'Energy Spectrum Report': 'Energy Spectrum Report', 'AI Equity Vision Report': 'AI Equity Vision Report',
  'ETF Navigator': 'The ETF Navigator', 'Global Commodity Report': 'Global Commodity Report',
  'Healthcare Pulse Report': 'Healthcare Pulse Report', 'Sector Opportunity': 'Sector Opportunity Report',
  'PG Weekly pick': 'PG Weekly Pick', 'Technical Analysis': 'Technical Swing Insights',
  'Mining Report': 'Mining Resource Insights',
};
const EXCLUDE_TERM = 'Daily Newsletter';
const FEATURED_TERM = 'Featured';

const RECO_MAP = {
  buy: 'BUY', sell: 'SELL', hold: 'HOLD',
  'speculative buy': 'SPECULATIVE BUY', refrain: 'REFRAIN',
  'security under review': 'Security Under Review',
};

// --- load MONGODB_URI from .env ----------------------------------------
function loadEnv() {
  const raw = readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

// --- minimal schemas (match existing collections) -----------------------
const Report = mongoose.model('Report', new mongoose.Schema({
  title: String, slug: { type: String, unique: true }, content: String, featuredImage: String,
  category: mongoose.Schema.Types.ObjectId, sector: mongoose.Schema.Types.ObjectId, product: mongoose.Schema.Types.ObjectId,
  upsellTicker: String, ticker: String, price: Number, recommendation: String,
  recommendations: [String],
  publishStatus: String, featured: Boolean,
}, { timestamps: true, strict: false }));
const Sector = mongoose.model('Sector', new mongoose.Schema({}, { strict: false }));
const ReportCategory = mongoose.model('ReportCategory', new mongoose.Schema({}, { strict: false }));
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

// quote-agnostic: straight " ' and curly “ ” ‘ ’
const Q = '["“”‘’]';

// Price(s) come from the body line "...at the closing price of $<price>...". (Recommendation
// is NOT parsed from the body — it comes from the ACF `tagss` field, see readTagss.)
function parsePrices(html) {
  const text = decodeEntities(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const re = new RegExp(`closing price of\\s*${Q}?\\s*\\$?\\s*([\\d,]+(?:\\.\\d+)?)`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(parseFloat(m[1].replace(/,/g, '')));
  return out;
}

// Recommendation actions come from the ACF `tagss` field (array of Buy/Sell/Hold/Refrain/Speculative Buy).
function readTagss(acf) {
  const raw = acf && acf.tagss;
  const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  return arr.map((t) => RECO_MAP[String(t).trim().toLowerCase()] || '').filter(Boolean);
}

function extractIndexTicker(title) {
  const t = decodeEntities(title);
  // "(ASX: A2M)", "(NYSE: LVS)", "(NYSE ARCA: CPER)"
  let m = t.match(/\(\s*([A-Za-z][A-Za-z ]*?)\s*:\s*([A-Za-z0-9.\-]+)\s*\)/);
  // or trailing dash form: "Name – ASX: QOZ"
  if (!m) m = t.match(/[–—-]\s*([A-Za-z][A-Za-z ]*?)\s*:\s*([A-Za-z0-9.\-]+)\s*$/);
  return m ? { upsellTicker: m[1].trim().toUpperCase(), ticker: m[2].toUpperCase() } : { upsellTicker: '', ticker: '' };
}

async function uniqueSlug(base) {
  let slug = base || 'report';
  let n = 2;
  while (await Report.exists({ slug })) slug = `${base}-${n++}`;
  return slug;
}

function featuredImageOf(post) {
  const media = post?._embedded?.['wp:featuredmedia'];
  return (Array.isArray(media) && media[0]?.source_url) ? media[0].source_url : '';
}

async function fetchTermMap() {
  const map = {}; // id -> name
  let page = 1;
  while (true) {
    const url = `${WP_BASE}/wp-json/wp/v2/service-category?per_page=100&page=${page}&_fields=id,name`;
    const res = await fetch(url);
    if (!res.ok) break;
    const batch = await res.json();
    if (!batch.length) break;
    for (const t of batch) map[t.id] = t.name;
    if (page >= Number(res.headers.get('x-wp-totalpages') || 1)) break;
    page++;
  }
  return map;
}

// --- migrate ------------------------------------------------------------
async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  const limit = Number(process.env.LIMIT || 0); // 0 = all eligible

  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log('Connected to MongoDB');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // relax only for the public WP fetch

  // DB name -> _id resolvers
  const byName = (docs) => Object.fromEntries(docs.map((d) => [d.name, d._id]));
  const catId = byName(await ReportCategory.find({}).lean());
  const secId = byName(await Sector.find({}).lean());
  const prodId = byName(await Product.find({}).lean());

  const termMap = await fetchTermMap();
  console.log(`Loaded ${Object.keys(termMap).length} service-category terms`);

  let created = 0, excluded = 0, skipped = 0, page = 1;
  const unresolved = new Set();
  const noReco = [];

  outer:
  while (true) {
    const url = `${WP_BASE}/wp-json/wp/v2/service?per_page=50&page=${page}&_embed=wp:featuredmedia&status=publish&orderby=date&order=desc`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`service page ${page} -> HTTP ${res.status}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    const totalPages = Number(res.headers.get('x-wp-totalpages') || 0);

    for (const p of batch) {
      const termIds = p['service-category'] || [];
      const termNames = termIds.map((id) => termMap[id]).filter(Boolean);

      if (termNames.includes(EXCLUDE_TERM)) { excluded++; continue; }

      const title = decodeEntities(p?.title?.rendered || '').trim();
      if (!title) { skipped++; continue; }
      const baseSlug = (p?.slug || '').toLowerCase();
      if (baseSlug && await Report.exists({ slug: baseSlug })) { skipped++; continue; }

      let category = null, sector = null, product = null, featured = false;
      for (const name of termNames) {
        if (name === FEATURED_TERM) { featured = true; continue; }
        if (CATEGORY_MAP[name]) { const id = catId[CATEGORY_MAP[name]]; id ? (category = id) : unresolved.add(`category:${CATEGORY_MAP[name]}`); }
        else if (SECTOR_MAP[name]) { const id = secId[SECTOR_MAP[name]]; id ? (sector = id) : unresolved.add(`sector:${SECTOR_MAP[name]}`); }
        else if (PRODUCT_MAP[name]) { const id = prodId[PRODUCT_MAP[name]]; id ? (product = id) : unresolved.add(`product:${PRODUCT_MAP[name]}`); }
        else unresolved.add(`UNMAPPED-term:${name}`);
      }

      const postDate = p?.date ? new Date(p.date) : null;
      const prices = parsePrices(p?.content?.rendered || '');   // price from body
      const actions = readTagss(p?.acf);                        // recommendation tags from ACF tagss (multi-select)
      const recommendation = actions[0] || '';                 // primary drives /past-recommendations
      const price = prices[0] ?? 0;
      if (!recommendation) noReco.push(title);
      const { upsellTicker, ticker } = extractIndexTicker(p?.title?.rendered || '');

      await Report.create({
        title,
        slug: await uniqueSlug(baseSlug),
        content: p?.content?.rendered || '',
        featuredImage: featuredImageOf(p),
        category, sector, product, featured,
        upsellTicker, ticker, price, recommendation,
        recommendations: actions,
        publishStatus: 'published',
        createdAt: postDate || undefined,
      });
      created++;
      if (limit && created >= limit) break outer;
    }

    process.stdout.write(`\r  page ${page}/${totalPages} — created ${created}, excluded ${excluded}, skipped ${skipped}`);
    if (totalPages && page >= totalPages) break;
    page++;
  }
  process.stdout.write('\n');

  console.log(`\nDone: ${created} reports created, ${excluded} excluded (Daily Newsletter), ${skipped} skipped (dupe/no title)`);
  if (unresolved.size) console.log('UNRESOLVED mappings (left blank):', [...unresolved]);
  if (noReco.length) console.log(`Posts with no parsed recommendation (${noReco.length}):`, noReco.slice(0, 15));

  await mongoose.disconnect();
}

main().catch((e) => { console.error('\nMIGRATION FAILED:', e); process.exit(1); });
