// scripts/backfill-recommendations.mjs
// Backfill the multi-select `recommendations` array from the legacy single
// `recommendation` field. Older / imported reports only ever had the single
// `recommendation` column; the dashboard filter + editor now read the
// `recommendations` array, so any report with a recommendation but an empty
// array is invisible to those features. This copies `recommendation` ->
// `recommendations: [recommendation]` for exactly those reports.
//
// Safe to re-run (idempotent): only touches reports whose array is empty/missing.
//
// Usage:
//   DRY=1 node scripts/backfill-recommendations.mjs   # preview (no writes)
//   node scripts/backfill-recommendations.mjs         # apply

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

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log(`Connected to MongoDB${DRY ? '  (DRY RUN — no writes)' : ''}`);

  // Reports with a real recommendation but an empty / missing recommendations array.
  const targets = await Report.find({
    recommendation: { $nin: ['', null] },
    $or: [{ recommendations: { $exists: false } }, { recommendations: { $size: 0 } }],
  }).select('title recommendation').lean();

  let updated = 0;
  for (const r of targets) {
    console.log(`  ${r.recommendation.padEnd(20)} <- ${r.title}`);
    if (!DRY) await Report.updateOne({ _id: r._id }, { $set: { recommendations: [r.recommendation] } });
    updated++;
  }

  console.log(`\n${DRY ? 'Would update' : 'Updated'} ${updated} report(s).`);
  await mongoose.disconnect();
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) main().catch((e) => { console.error('\nFAILED:', e); process.exit(1); });
