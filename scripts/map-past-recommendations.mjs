// scripts/map-past-recommendations.mjs
// Link each SELL report to EVERY prior open BUY / SPECULATIVE BUY of the same INDEX
// + TICKER via `pastStockRecommendations` (array). One sell closes all the buys that
// were opened since the previous sell. This is what /past-recommendations + the
// homepage read (a row per buy -> sell). `pastStockRecommendation` (singular) is kept
// in sync with the primary/earliest buy for back-compat.
//
// Rules (per user):
//   - Match on upsellTicker (INDEX) + ticker.
//   - BUY and SPECULATIVE BUY are the same ("buy"); SELL is a sell.
//   - A sell closes every buy opened after the previous sell and before it.
//   - Deterministic + idempotent: re-running recomputes the same links.
//
// Usage:
//   DRY=1 node scripts/map-past-recommendations.mjs            # preview (no writes)
//   node scripts/map-past-recommendations.mjs                  # apply

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = !!process.env.DRY;

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

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log(`Connected to MongoDB${DRY ? '  (DRY RUN — no writes)' : ''}`);

  const rs = await Report.find({ ticker: { $nin: ['', null] }, upsellTicker: { $nin: ['', null] } })
    .select('title ticker upsellTicker recommendation price pastStockRecommendation pastStockRecommendations createdAt').lean();

  const groups = new Map();
  for (const r of rs) {
    const k = `${r.upsellTicker}|${r.ticker}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }

  let mapped = 0, linkedBuys = 0, skippedNoBuy = 0;
  const rows = [];
  for (const [k, arr] of groups) {
    // Walk the group oldest -> newest, accumulating open buys; each sell closes them all.
    const sorted = [...arr].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let openBuys = [];
    for (const r of sorted) {
      if (isBuy(r)) { openBuys.push(r); continue; }
      if (!isSell(r)) continue;
      if (openBuys.length === 0) { skippedNoBuy++; continue; }
      const buyIds = openBuys.map((b) => b._id);
      const avgBuy = openBuys.reduce((s, b) => s + (b.price || 0), 0) / openBuys.length;
      const gain = avgBuy > 0 ? ((r.price - avgBuy) / avgBuy) * 100 : null;
      rows.push(`  ${k.padEnd(12)} SELL $${r.price} <- ${openBuys.length} buy(s) avg $${avgBuy.toFixed(3)}  ${gain != null ? (gain >= 0 ? '+' : '') + gain.toFixed(1) + '%' : 'n/a'}`);
      if (!DRY) await Report.updateOne({ _id: r._id }, { $set: { pastStockRecommendations: buyIds, pastStockRecommendation: buyIds[0] } });
      mapped++;
      linkedBuys += buyIds.length;
      openBuys = []; // position closed
    }
  }

  rows.sort().forEach((r) => console.log(r));
  console.log(`\n${DRY ? 'Would map' : 'Mapped'} ${mapped} sell report(s) covering ${linkedBuys} buy link(s). Skipped — no open buy for ${skippedNoBuy} sell(s).`);
  await mongoose.disconnect();
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) main().catch((e) => { console.error('\nFAILED:', e); process.exit(1); });
