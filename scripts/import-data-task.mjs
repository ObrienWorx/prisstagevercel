// scripts/import-data-task.mjs
// Import historical orders from data-task.xlsx, pre-grouped by extract-data-task.py.
//
// Input JSON (one element = one ORDER, already grouped by the sheet's Order ID):
//   { name, orderId, amount, purchaseDate, expiryDate,
//     items:[{ product, start, end, months, srcRow }], issues:[...] }
//
// Each order creates: 1 Order (multi-item), 1 Transaction (total amount), N UserProducts.
// The first line-item carries the full amount; the rest are $0 (bundled). The sheet's
// Order ID is stored in notes for traceability; the real orderNumber is generated fresh
// (seeded from the highest existing) so it never collides with live orders.
//
// Products are matched by norm() then ALIAS_MAP; unmatched are REPORTED, never invented.
// Subscribers are matched by exact name; 0 or >1 matches => skip + report (never guess).
// Orders whose extractor `issues[]` is non-empty are skipped + reported unless KEEP_FLAGGED=1.
//
// Usage:
//   DRY=1 ONLY="Ross Rizzo" node scripts/import-data-task.mjs <orders.json>   # preview one user
//   ONLY="Ross Rizzo" node scripts/import-data-task.mjs <orders.json>         # import one user
//   DRY=1 node scripts/import-data-task.mjs <orders.json>                     # preview ALL
//
// Idempotent: an order is skipped if one already exists for the same subscriber whose
// notes carry the same [data-task] <orderId> marker.

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = !!process.env.DRY;
const ONLY = process.env.ONLY ? String(process.env.ONLY) : null;
const KEEP_FLAGGED = !!process.env.KEEP_FLAGGED;
const MARKER = '[data-task]';
const norm = (s = '') => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

// Confident typo/variant -> real product name. Ambiguous ones are left out so the DRY
// run reports them for a human decision.
const ALIAS_MAP = {
  'PG Weekly Pick Pick': 'PG Weekly Pick', 'PG Weekly Pick Report': 'PG Weekly Pick',
  'PG Weekly Pick Gem': 'PG Weekly Pick', 'PG Weekly Pick pick': 'PG Weekly Pick',
  'US Equity Report Report': 'US Equity Report',
  'The The ETF Navigator': 'The ETF Navigator',
  'Techincal Swing Insights': 'Technical Swing Insights', 'Techinal Swing Insights': 'Technical Swing Insights',
  'Techincal Swing Report': 'Technical Swing Insights', 'Technical Swing Insight': 'Technical Swing Insights',
  'Technical Swing Report': 'Technical Swing Insights', 'Technical Swings Insights': 'Technical Swing Insights',
  'Technical Swing Insights Reports': 'Technical Swing Insights',
  'Mining Resource Insights Insights': 'Mining Resource Insights', 'Mining Resources Report': 'Mining Resource Insights',
  'Mining Resource Report': 'Mining Resource Insights', 'Mining Insights': 'Mining Resource Insights',
  'Mining Resource': 'Mining Resource Insights',
  'AI Equity Vision Report Vision': 'AI Equity Vision Report', 'AI Equity Vision Report Vision Report': 'AI Equity Vision Report',
  'AI Equity Vision Report Report': 'AI Equity Vision Report', 'AI Equity Vision Report vision report': 'AI Equity Vision Report',
  'Energy Spectrum': 'Energy Spectrum Report', 'Energy Sepctrum Report': 'Energy Spectrum Report',
  'Dividend Yield': 'Dividend Yield Report', 'Dividend Yield Report Extesnion': 'Dividend Yield Report',
  'Daily Digest Extesnion': 'Daily Digest',
  'Penny Stock Spotlight Report Reprt': 'Penny Stock Spotlight Report',
  'Penny Stock Spotlight Report Spotlight': 'Penny Stock Spotlight Report',
  'Penny': 'Penny Stock Spotlight Report',
  'Global Commodity': 'Global Commodity Report',
  'US Report': 'US Equity Report',
  'Dividend': 'Dividend Yield Report',
  'Mining Report': 'Mining Resource Insights',
  'Imperial membership plan FREE TRIAL': 'Imperial Membership Plan',
};

function loadEnv() {
  const raw = readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

const Subscriber = mongoose.model('Subscriber', new mongoose.Schema({ name: String, email: String }, { strict: false }));
const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
const Order = mongoose.model('Order', new mongoose.Schema({
  orderNumber: { type: String, unique: true }, subscriber: mongoose.Schema.Types.ObjectId,
  product: mongoose.Schema.Types.ObjectId, pricePaid: Number, paymentStatus: String, orderStatus: String,
  purchaseDate: Date, expiryDate: Date,
  items: [{ _id: false, product: mongoose.Schema.Types.ObjectId, pricePaid: Number, startDate: Date, expiryDate: Date, durationValue: Number, durationType: String }],
  notes: String,
}, { timestamps: true, strict: false }));
const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  transactionNumber: { type: String, unique: true }, order: mongoose.Schema.Types.ObjectId,
  subscriber: mongoose.Schema.Types.ObjectId, product: mongoose.Schema.Types.ObjectId,
  amount: Number, paymentGateway: String, paymentStatus: String, paymentDate: Date, notes: String,
}, { timestamps: true, strict: false }));
const UserProduct = mongoose.model('UserProduct', new mongoose.Schema({
  subscriber: mongoose.Schema.Types.ObjectId, product: mongoose.Schema.Types.ObjectId,
  order: mongoose.Schema.Types.ObjectId, startDate: Date, expiryDate: Date, isActive: Boolean,
}, { timestamps: true, strict: false }));

let orderSeq = 0, txnSeq = 0;
const nextOrderNo = () => `ORD-${String(++orderSeq).padStart(5, '0')}`;
const nextTxnNo = () => `TXN-${String(++txnSeq).padStart(6, '0')}`;

// extractor emits YYYY-MM-DD (or null); treat as UTC midnight.
function parseDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) { const t = Date.parse(s); return isNaN(t) ? null : new Date(t); }
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/import-data-task.mjs <orders.json>');
  let orders = JSON.parse(readFileSync(path.isAbsolute(file) ? file : path.join(process.cwd(), file), 'utf8'));
  if (ONLY) orders = orders.filter((o) => norm(o.name) === norm(ONLY));
  console.log(`Loaded ${orders.length} orders${ONLY ? ` for "${ONLY}"` : ''}.`);

  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log('Connected to MongoDB' + (DRY ? '  (DRY RUN — no writes)' : ''));

  const products = await Product.find({}).select('name').lean();
  const productByName = new Map(products.map((p) => [norm(p.name), p._id]));
  const resolveProduct = (raw) => productByName.get(norm(ALIAS_MAP[raw] || raw)) || productByName.get(norm(raw)) || null;

  // Seed numbers from the HIGHEST existing (zero-padded => lexical sort == numeric).
  const lastOrder = await Order.findOne({}).sort({ orderNumber: -1 }).select('orderNumber').lean();
  const lastTxn = await Transaction.findOne({}).sort({ transactionNumber: -1 }).select('transactionNumber').lean();
  orderSeq = lastOrder?.orderNumber ? parseInt(String(lastOrder.orderNumber).replace(/\D/g, ''), 10) : await Order.countDocuments();
  txnSeq = lastTxn?.transactionNumber ? parseInt(String(lastTxn.transactionNumber).replace(/\D/g, ''), 10) : await Transaction.countDocuments();

  const now = Date.now();
  const unmatchedProducts = new Map();
  const unmatchedUsers = new Map();
  let created = 0, skippedDup = 0, skippedNoProduct = 0, skippedNoUser = 0, skippedFlagged = 0, skippedHasProduct = 0, upCount = 0;

  const subCache = new Map();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const byName = (n) => Subscriber.find({ name: new RegExp(`^\\s*${esc(n)}\\s*$`, 'i') }).select('name email').lean();
  const byEmail = (e) => Subscriber.find({ email: new RegExp(`^${esc(e.trim())}$`, 'i') }).select('name email').lean();
  async function findSub(name, email) {
    const key = norm(name);
    if (subCache.has(key)) return subCache.get(key);
    let matches = [], how = 'email';

    // Try email first (primary).
    if (email) {
      const cleanEmail = email.split(/[/,\s]/)[0].trim();
      if (cleanEmail && cleanEmail !== name) {
        const m = await byEmail(cleanEmail);
        if (m.length === 1) matches = m;
      }
    }

    // Fall back to name matching if email didn't resolve.
    if (matches.length !== 1) {
      how = 'exact';
      matches = await byName(name);
      if (matches.length !== 1 && /\(.*\)/.test(name)) {
        const base = name.replace(/\s*\(.*\)\s*$/, '').trim();
        if (base && base !== name) { const m = await byName(base); if (m.length === 1) { matches = m; how = 'base'; } }
        if (matches.length !== 1) {
          const inside = (name.match(/\(([^)]*)\)/) || [])[1];
          if (inside) { const m = await byName(inside.trim()); if (m.length === 1) { matches = m; how = 'inside'; } }
        }
      }
    }

    const res = matches.length === 1 ? { ...matches[0], _how: how } : { error: matches.length === 0 ? 'NOT_FOUND' : 'DUPLICATE', count: matches.length };
    subCache.set(key, res); return res;
  }
  const recovered = [];

  for (const o of orders) {
    if (o.issues?.length && !KEEP_FLAGGED) {
      console.log(`  ! SKIP ${o.orderId || '(no id)'} ${o.name}: ${o.issues.join('; ')}`);
      skippedFlagged++; continue;
    }
    const sub = await findSub(o.name, o.email || '');
    if (sub.error) { unmatchedUsers.set(o.name, sub.error); skippedNoUser++; continue; }
    if (sub._how && sub._how !== 'exact' && !subCache.get(`logged:${norm(o.name)}`)) {
      recovered.push(`  [${sub._how}] "${o.name}" -> "${sub.name}"`);
      subCache.set(`logged:${norm(o.name)}`, true);
    }

    const amount = Number(o.amount) || 0;
    const purchaseDate = parseDate(o.purchaseDate);
    const expiryDate = parseDate(o.expiryDate);

    const notes = `${MARKER} ${o.orderId || ''} (${(o.items || []).map((x) => x.product).join(', ')})`.trim();

    // Check for already-imported order first (idempotency).
    if (!DRY) {
      const dup = await Order.findOne({ subscriber: sub._id, notes }).lean();
      if (dup) { skippedDup++; continue; }
    }

    // resolve each line item's product — skip items the subscriber already owns
    const items = [];
    for (const it of o.items || []) {
      const id = resolveProduct(it.product);
      if (!id) { unmatchedProducts.set(it.product, (unmatchedProducts.get(it.product) || 0) + 1); continue; }
      if (!DRY) {
        const alreadyHas = await UserProduct.findOne({ subscriber: sub._id, product: id }).lean();
        if (alreadyHas) { console.log(`  ~ SKIP item "${it.product}" for ${sub.name} — already has product`); skippedHasProduct++; continue; }
      }
      items.push({
        product: id,
        startDate: parseDate(it.start) || purchaseDate,
        expiryDate: parseDate(it.end) || expiryDate,
        durationValue: Number(it.months) || undefined,
        durationType: 'months',
      });
    }
    if (items.length === 0 || !purchaseDate) { skippedNoProduct++; continue; }

    if (DRY) {
      console.log(`  ${o.orderId} | ${o.name} | ${o.purchaseDate}→${o.expiryDate} | $${amount} | ${items.length} item(s): ${o.items.map((x) => x.product).join(', ')}`);
      created++; upCount += items.length; continue;
    }

    const order = await Order.create({
      orderNumber: nextOrderNo(), subscriber: sub._id, product: primary,
      pricePaid: amount, paymentStatus: 'completed', orderStatus: 'completed',
      purchaseDate, expiryDate, items, notes, createdAt: purchaseDate, updatedAt: purchaseDate,
    });
    await Transaction.create({
      transactionNumber: nextTxnNo(), order: order._id, subscriber: sub._id, product: primary,
      amount, paymentGateway: 'Manual', paymentStatus: 'completed', paymentDate: purchaseDate, notes, createdAt: purchaseDate, updatedAt: purchaseDate,
    });
    for (const it of items) {
      await UserProduct.create({
        subscriber: sub._id, product: it.product, order: order._id,
        startDate: it.startDate, expiryDate: it.expiryDate,
        isActive: it.expiryDate ? it.expiryDate.getTime() > now : false,
        createdAt: purchaseDate, updatedAt: purchaseDate,
      });
      upCount++;
    }
    created++;
  }

  console.log(`\nDone${DRY ? ' (DRY)' : ''}: ${created} orders, ${upCount} userproducts; skipped — dup ${skippedDup}, no-product/date ${skippedNoProduct}, no-user ${skippedNoUser}, flagged ${skippedFlagged}, already-has-product ${skippedHasProduct}.`);
  if (recovered.length) {
    console.log(`\nUSERS MATCHED VIA FALLBACK (${recovered.length}) — verify these are the right people:`);
    recovered.forEach((r) => console.log(r));
  }
  if (unmatchedUsers.size) {
    console.log(`\nUNMATCHED USERS (${unmatchedUsers.size}):`);
    [...unmatchedUsers.entries()].forEach(([n, why]) => console.log(`  [${why}] ${n}`));
  }
  if (unmatchedProducts.size) {
    console.log(`\nUNMATCHED PRODUCTS (${unmatchedProducts.size}) — add to ALIAS_MAP, then re-run:`);
    [...unmatchedProducts.entries()].sort((a, b) => b[1] - a[1]).forEach(([n, c]) => console.log(`  ${String(c).padStart(4)}  "${n}"`));
  }
  await mongoose.disconnect();
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) main().catch((e) => { console.error('\nIMPORT FAILED:', e); process.exit(1); });
