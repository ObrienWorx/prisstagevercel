// scripts/map-past-recommendations.mjs
// Auto-link each SELL report to the matching BUY / SPECULATIVE BUY report (same INDEX
// + TICKER) via `pastStockRecommendation`. This is what /past-recommendations + the
// homepage read (SELL.pastStockRecommendation -> the original buy).
//
// Rules (per user):
//   - Match on upsellTicker (INDEX) + ticker.
//   - Classify by the primary `recommendation` column: BUY/SPECULATIVE BUY = buy, SELL = sell.
//   - Only fill sells that are currently UNLINKED (skip ones already mapped).
//   - When several buys exist for a ticker, link to BUY_PICK (default: earliest by date).
//
// Usage:
//   DRY=1 node scripts/map-past-recommendations.mjs            # preview (no writes)
//   node scripts/map-past-recommendations.mjs                  # apply
//   BUY_PICK=earliest|latest|lowest DRY=1 node scripts/...     # change tie-break

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = !!process.env.DRY;
const BUY_PICK = (process.env.BUY_PICK || 'earliest').toLowerCase();

function loadEnv() {
  const raw = readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));

const isBuy = (r) => r.recommendation === 'BUY' || r.recommendation === 'SPECULATIVE BUY';
const isSell = (r) => r.recommendation === 'SELL';

function pickBuy(buys) {
  const byDate = [...buys].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (BUY_PICK === 'latest') return byDate[byDate.length - 1];
  if (BUY_PICK === 'lowest') return [...buys].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
  return byDate[0]; // earliest
}

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log(`Connected to MongoDB${DRY ? '  (DRY RUN — no writes)' : ''}  | buy pick: ${BUY_PICK}`);

  const rs = await Report.find({ ticker: { $nin: ['', null] }, upsellTicker: { $nin: ['', null] } })
    .select('title ticker upsellTicker recommendation price pastStockRecommendation createdAt').lean();

  const groups = new Map();
  for (const r of rs) {
    const k = `${r.upsellTicker}|${r.ticker}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }

  let mapped = 0, skippedLinked = 0, skippedNoBuy = 0;
  const rows = [];
  for (const [k, arr] of groups) {
    const buys = arr.filter(isBuy);
    const sells = arr.filter(isSell);
    if (sells.length === 0) continue;
    for (const sell of sells) {
      if (sell.pastStockRecommendation) { skippedLinked++; continue; }
      if (buys.length === 0) { skippedNoBuy++; continue; }
      const buy = pickBuy(buys);
      const gain = buy.price > 0 ? ((sell.price - buy.price) / buy.price) * 100 : null;
      rows.push(`  ${k.padEnd(12)} SELL $${sell.price} <- BUY $${buy.price}${buys.length > 1 ? ` (of ${buys.length} buys)` : ''}  ${gain != null ? (gain >= 0 ? '+' : '') + gain.toFixed(1) + '%' : 'n/a'}`);
      if (!DRY) await Report.updateOne({ _id: sell._id }, { $set: { pastStockRecommendation: buy._id } });
      mapped++;
    }
  }

  rows.sort().forEach((r) => console.log(r));
  console.log(`\n${DRY ? 'Would map' : 'Mapped'} ${mapped} sell report(s). Skipped — already linked ${skippedLinked}, no buy for ticker ${skippedNoBuy}.`);
  await mongoose.disconnect();
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) main().catch((e) => { console.error('\nFAILED:', e); process.exit(1); });
