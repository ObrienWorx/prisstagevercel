// scripts/migrate-wp-members.mjs
// One-off migration: WordPress members (from wp-export-members.php) -> our DB.
//
// For each exported subscriber we create / reuse a Subscriber, then for each of
// their package subscriptions (matched to our Product BY NAME) we create:
//   - an Order   (paymentStatus/orderStatus = completed, with one line-item)
//   - a Transaction (paymentGateway = WordPress, completed)
//   - a UserProduct (start/expiry, isActive = expiry in the future)
//
// Imported subscribers get a RANDOM password + isEmailVerified=true; they recover
// access via forgot-password / OTP (no plaintext is shipped).
//
// Package -> Product name matching: case/space-insensitive exact match first,
// then ALIAS_MAP (WP package name -> our product name) for known differences,
// then BUNDLE_MAP (one package -> MANY products) for membership bundles.
// Anything still unmatched is reported at the end (nothing is invented).
//
// Usage:
//   node scripts/migrate-wp-members.mjs members-export.json          # import
//   DRY=1 node scripts/migrate-wp-members.mjs members-export.json    # report only
//   LIMIT=25 node scripts/migrate-wp-members.mjs members-export.json # first N subs
//
// Re-running is safe: existing subscribers are matched by email and a UserProduct
// is not recreated when one already exists for the same (subscriber, product, expiry).

import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = !!process.env.DRY;
const LIMIT = Number(process.env.LIMIT || 0);

// WP package name -> our Product name (fill in after the first DRY run reports gaps).
const ALIAS_MAP = {
  // 'Daily Newsletter': 'Daily Digest',
};
// Membership bundles: one WP package -> MANY of our products (fill in as needed).
const BUNDLE_MAP = {
  // 'Imperial Membership Plan': ['Dividend Yield Report', 'Daily Digest', ...],
};

const norm = (s = '') => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

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

// --- schemas (match existing collections) -------------------------------
const Subscriber = mongoose.model('Subscriber', new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String, plainPassword: String,
  phone: String, isActive: Boolean, isEmailVerified: Boolean,
}, { timestamps: true, strict: false }));
const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
const Order = mongoose.model('Order', new mongoose.Schema({
  orderNumber: { type: String, unique: true }, subscriber: mongoose.Schema.Types.ObjectId,
  product: mongoose.Schema.Types.ObjectId, pricePaid: Number, sellingPrice: Number,
  paymentStatus: String, orderStatus: String, purchaseDate: Date, expiryDate: Date,
  items: [{ _id: false, product: mongoose.Schema.Types.ObjectId, pricePaid: Number, sellingPrice: Number, startDate: Date, expiryDate: Date, durationValue: Number, durationType: String }],
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

// --- sequential number helpers (Order/Transaction need unique strings) --
let orderSeq = 0, txnSeq = 0;
const nextOrderNo = () => `ORD-${String(++orderSeq).padStart(5, '0')}`;
const nextTxnNo = () => `TXN-${String(++txnSeq).padStart(6, '0')}`;

async function hashRandomPassword() {
  const pw = crypto.randomBytes(18).toString('base64url');
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(pw, salt);
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + (months || 1));
  return d;
}

// WP access/subscription dates arrive in 3 shapes: "Y-m-d H:i:s", "Y-m-dTH:i",
// and US "m/d/Y" (plus nulls). Parse as UTC for determinism (day-level accuracy
// is all subscription windows need).
function parseWpDate(s) {
  if (!s) return null;
  const v = String(s).trim();
  let m;
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)))
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)))
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) // m/d/Y
    return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
  const t = Date.parse(v);
  return isNaN(t) ? null : new Date(t);
}

// --- main ---------------------------------------------------------------
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/migrate-wp-members.mjs <members-export.json>');
  const data = JSON.parse(readFileSync(path.isAbsolute(file) ? file : path.join(process.cwd(), file), 'utf8'));
  const subscribersIn = data.subscribers || [];
  console.log(`Loaded export: ${subscribersIn.length} subscribers, ${data.packages?.length || 0} packages`);

  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log('Connected to MongoDB' + (DRY ? '  (DRY RUN — no writes)' : ''));

  // product name -> id (normalized)
  const products = await Product.find({}).select('name').lean();
  const productByName = new Map(products.map((p) => [norm(p.name), p._id]));

  // seed sequence counters from existing data so numbers stay unique
  const lastOrder = await Order.findOne({}).sort({ createdAt: -1 }).select('orderNumber').lean();
  const lastTxn = await Transaction.findOne({}).sort({ createdAt: -1 }).select('transactionNumber').lean();
  orderSeq = lastOrder?.orderNumber ? parseInt(String(lastOrder.orderNumber).replace(/\D/g, ''), 10) || await Order.countDocuments() : await Order.countDocuments();
  txnSeq = lastTxn?.transactionNumber ? parseInt(String(lastTxn.transactionNumber).replace(/\D/g, ''), 10) || await Transaction.countDocuments() : await Transaction.countDocuments();

  // resolve a WP package name -> [product ids]
  const unmatched = new Map(); // name -> count
  function resolveProducts(pkgName) {
    const bundle = BUNDLE_MAP[pkgName];
    if (bundle) return bundle.map((n) => productByName.get(norm(n))).filter(Boolean);
    const alias = ALIAS_MAP[pkgName];
    const id = productByName.get(norm(alias || pkgName));
    if (id) return [id];
    unmatched.set(pkgName, (unmatched.get(pkgName) || 0) + 1);
    return [];
  }

  const now = Date.now();
  let subsNew = 0, subsExisting = 0, orders = 0, upSkipped = 0, seen = 0;

  for (const s of subscribersIn) {
    seen++;
    if (!s.email) continue;
    const email = String(s.email).toLowerCase().trim();
    const name = (s.display_name || `${s.first_name} ${s.last_name}`.trim() || s.login || email).trim();
    const phone = (s.phone || '').trim() || 'N/A';
    const registered = parseWpDate(s.registered) || new Date();

    let sub = await Subscriber.findOne({ email }).lean();
    if (!sub) {
      if (DRY) {
        sub = { _id: 'DRY', email };
      } else {
        const created = await Subscriber.create({
          name, email, phone, isActive: true, isEmailVerified: true,
          password: await hashRandomPassword(), createdAt: registered, updatedAt: registered,
        });
        sub = created.toObject();
      }
      subsNew++;
    } else {
      subsExisting++;
    }

    for (const sk of s.subscriptions || []) {
      const productIds = resolveProducts(sk.package_name);
      if (productIds.length === 0) continue;

      const start = parseWpDate(sk.start) || registered;
      const end = parseWpDate(sk.end) || addMonths(start, sk.duration_months);
      const isActive = end.getTime() > now;
      const durationValue = sk.duration_months || 1;

      for (const productId of productIds) {
        // idempotency: skip if a UserProduct already exists for this sub+product+expiry
        if (!DRY && sub._id !== 'DRY') {
          const exists = await UserProduct.findOne({ subscriber: sub._id, product: productId, expiryDate: end }).lean();
          if (exists) { upSkipped++; continue; }
        }

        if (DRY) { orders++; continue; }

        const order = await Order.create({
          orderNumber: nextOrderNo(), subscriber: sub._id, product: productId,
          pricePaid: sk.price || 0, paymentStatus: 'completed', orderStatus: 'completed',
          purchaseDate: start, expiryDate: end,
          items: [{ product: productId, pricePaid: sk.price || 0, startDate: start, expiryDate: end, durationValue, durationType: 'months' }],
          notes: `Imported from WordPress package "${sk.package_name}"`,
          createdAt: start, updatedAt: start,
        });
        await Transaction.create({
          transactionNumber: nextTxnNo(), order: order._id, subscriber: sub._id, product: productId,
          amount: sk.price || 0, paymentGateway: 'WordPress', paymentStatus: 'completed', paymentDate: start,
          notes: `Imported from WordPress package "${sk.package_name}"`, createdAt: start, updatedAt: start,
        });
        await UserProduct.create({
          subscriber: sub._id, product: productId, order: order._id,
          startDate: start, expiryDate: end, isActive, createdAt: start, updatedAt: start,
        });
        orders++;
      }
    }

    if (LIMIT && seen >= LIMIT) break;
    if (seen % 100 === 0) process.stdout.write(`\r  processed ${seen}/${subscribersIn.length} — new ${subsNew}, existing ${subsExisting}, orders ${orders}`);
  }
  process.stdout.write('\n');

  console.log(`\nDone${DRY ? ' (DRY)' : ''}: subscribers new ${subsNew}, existing ${subsExisting}; ${orders} order/txn/userproduct sets; ${upSkipped} userproducts skipped (already present).`);
  if (unmatched.size) {
    console.log(`\nUNMATCHED package names (${unmatched.size}) — add to ALIAS_MAP/BUNDLE_MAP, then re-run:`);
    [...unmatched.entries()].sort((a, b) => b[1] - a[1]).forEach(([n, c]) => console.log(`  ${c.toString().padStart(5)}  "${n}"`));
  }
  await mongoose.disconnect();
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) main().catch((e) => { console.error('\nMIGRATION FAILED:', e); process.exit(1); });
