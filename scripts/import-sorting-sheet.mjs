// scripts/import-sorting-sheet.mjs
// Import historical orders/transactions from Sorting-Sheet.xlsx (pre-extracted to JSON
// by tools — see _sorting_orders.json). Each sheet ROW = one purchase:
//   - Name (forward-filled per block) -> matched to an existing Subscriber BY NAME
//   - Start Date / End Date           -> UserProduct window (and order purchase/expiry)
//   - Amount                          -> order total + single Transaction
//   - "Reports Sold" columns          -> one or MORE products (line-items on the order)
//
// One row creates: 1 Order (multi-item), 1 Transaction (total amount), N UserProducts.
//
// Product names in the sheet are messy (typos/dupes) -> matched via norm() then ALIAS_MAP.
// Anything unmatched is REPORTED, never invented. Subscribers are matched by name; if a
// name has 0 or >1 matches it is skipped and reported (we never guess identity).
//
// Usage:
//   DRY=1 ONLY="Ross Rizzo" node scripts/import-sorting-sheet.mjs <orders.json>   # preview one user
//   ONLY="Ross Rizzo" node scripts/import-sorting-sheet.mjs <orders.json>         # import one user
//   DRY=1 node scripts/import-sorting-sheet.mjs <orders.json>                     # preview ALL
//
// Idempotent: a row is skipped if an Order already exists for the same subscriber with the
// same purchaseDate + pricePaid + the [sorting-sheet] marker.

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = !!process.env.DRY;
const ONLY = process.env.ONLY ? String(process.env.ONLY) : null;
const MARKER = '[sorting-sheet]';
const norm = (s = '') => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

// Confident typo/variant -> real product name. Ambiguous ones are intentionally
// left out so the DRY run reports them for a human decision.
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
  'Global Commodity': 'Global Commodity Report',
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

function parseDate(s) {
  if (!s) return null;
  const v = String(s).trim();
  let m;
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)))
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const t = Date.parse(v); return isNaN(t) ? null : new Date(t);
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/import-sorting-sheet.mjs <orders.json>');
  let rows = JSON.parse(readFileSync(path.isAbsolute(file) ? file : path.join(process.cwd(), file), 'utf8'));
  if (ONLY) rows = rows.filter((r) => norm(r.name) === norm(ONLY));
  console.log(`Loaded ${rows.length} order rows${ONLY ? ` for "${ONLY}"` : ''}.`);

  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log('Connected to MongoDB' + (DRY ? '  (DRY RUN — no writes)' : ''));

  const products = await Product.find({}).select('name').lean();
  const productByName = new Map(products.map((p) => [norm(p.name), p._id]));
  const resolveProduct = (raw) => productByName.get(norm(ALIAS_MAP[raw] || raw)) || productByName.get(norm(raw)) || null;

  // Seed from the HIGHEST existing number (zero-padded => sort by the field itself).
  // Do NOT seed from latest createdAt: imported rows carry historical/future createdAt.
  const lastOrder = await Order.findOne({}).sort({ orderNumber: -1 }).select('orderNumber').lean();
  const lastTxn = await Transaction.findOne({}).sort({ transactionNumber: -1 }).select('transactionNumber').lean();
  orderSeq = lastOrder?.orderNumber ? parseInt(String(lastOrder.orderNumber).replace(/\D/g, ''), 10) : await Order.countDocuments();
  txnSeq = lastTxn?.transactionNumber ? parseInt(String(lastTxn.transactionNumber).replace(/\D/g, ''), 10) : await Transaction.countDocuments();

  const now = Date.now();
  const unmatchedProducts = new Map();
  const unmatchedUsers = new Map();
  let created = 0, skippedDup = 0, skippedNoProduct = 0, skippedNoUser = 0, upCount = 0;

  // group by user name (cache subscriber lookups)
  const subCache = new Map();
  async function findSub(name) {
    const key = norm(name);
    if (subCache.has(key)) return subCache.get(key);
    const matches = await Subscriber.find({ name: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }).select('name email').lean();
    const res = matches.length === 1 ? matches[0] : { error: matches.length === 0 ? 'NOT_FOUND' : 'DUPLICATE', count: matches.length };
    subCache.set(key, res); return res;
  }

  for (const row of rows) {
    const sub = await findSub(row.name);
    if (sub.error) {
      unmatchedUsers.set(row.name, sub.error);
      skippedNoUser++; continue;
    }
    const start = parseDate(row.start);
    const end = parseDate(row.end);
    const amount = Number(row.amount) || 0;
    const months = Number(row.months) || 1;

    // map products
    const ids = [];
    for (const raw of row.products || []) {
      const id = resolveProduct(raw);
      if (id) ids.push(id);
      else unmatchedProducts.set(raw, (unmatchedProducts.get(raw) || 0) + 1);
    }
    if (ids.length === 0 || !start || !end) { skippedNoProduct++; continue; }

    const isActive = end.getTime() > now;
    const primary = ids[0];
    const items = ids.map((id, i) => ({ product: id, pricePaid: i === 0 ? amount : 0, startDate: start, expiryDate: end, durationValue: months, durationType: 'months' }));
    const notes = `${MARKER} imported (${(row.products || []).join(', ')})`;

    // idempotency: match the full row signature (notes carry the product list, so two
    // distinct $0 orders on the same date for different products don't collide).
    if (!DRY) {
      const dup = await Order.findOne({ subscriber: sub._id, purchaseDate: start, pricePaid: amount, notes }).lean();
      if (dup) { skippedDup++; continue; }
    }

    if (DRY) {
      console.log(`  ${row.name} | ${row.start?.slice(0,10)}→${row.end?.slice(0,10)} | $${amount} | ${ids.length} product(s): ${row.products.join(', ')}`);
      created++; upCount += ids.length; continue;
    }

    const order = await Order.create({
      orderNumber: nextOrderNo(), subscriber: sub._id, product: primary,
      pricePaid: amount, paymentStatus: 'completed', orderStatus: 'completed',
      purchaseDate: start, expiryDate: end, items, notes, createdAt: start, updatedAt: start,
    });
    await Transaction.create({
      transactionNumber: nextTxnNo(), order: order._id, subscriber: sub._id, product: primary,
      amount, paymentGateway: 'Manual', paymentStatus: 'completed', paymentDate: start, notes, createdAt: start, updatedAt: start,
    });
    for (const id of ids) {
      await UserProduct.create({ subscriber: sub._id, product: id, order: order._id, startDate: start, expiryDate: end, isActive, createdAt: start, updatedAt: start });
      upCount++;
    }
    created++;
  }

  console.log(`\nDone${DRY ? ' (DRY)' : ''}: ${created} orders, ${upCount} userproducts; skipped — dup ${skippedDup}, no-product/date ${skippedNoProduct}, no-user ${skippedNoUser}.`);
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
