// scripts/update-wp-report-recommendations.mjs
// Fix-up for the WP report migration.
//
// Background: migrate-wp-reports.mjs took the recommendation from the ACF `tagss`
// field. Many WP posts left `tagss` empty even though the body clearly states it,
// e.g.:
//   As per Pristine Gaze, you may consider a "Buy" on "Regal Partners Limited"
//   at the closing price of "$2.51" (As of 12 June 2026).
// Those reports were imported with a BLANK recommendation. This script re-parses
// the recommendation (and backfills price when missing) from the stored body text.
//
// It reads the already-imported `content` in MongoDB — no WordPress refetch needed.
// Only reports that currently have NO recommendation are touched; price is only
// filled when it is currently 0/empty. Existing recommendations are never overwritten.
//
// Usage:
//   node scripts/update-wp-report-recommendations.mjs            # apply updates
//   DRY=1 node scripts/update-wp-report-recommendations.mjs      # report only, change nothing
//   FORCE=1 node scripts/update-wp-report-recommendations.mjs    # re-parse ALL reports (overwrite reco+price from body)

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RECO_MAP = {
  buy: 'BUY', sell: 'SELL', hold: 'HOLD',
  'speculative buy': 'SPECULATIVE BUY', refrain: 'REFRAIN',
  'security under review': 'Security Under Review',
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

const toText = (html) => decodeEntities(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

// Recommendation(s) from the body line: '...consider a "Buy" on "<stock>"...'.
// Accepts quoted or unquoted reco words and validates each against RECO_MAP, so
// only real recommendation words are kept. Order is preserved, duplicates removed.
function parseBodyRecommendations(html) {
  const text = toText(html);
  const re = new RegExp(`consider(?:ing)?\\s+(?:a|an)\\s+${Q}?\\s*([A-Za-z][A-Za-z ]*?)\\s*${Q}?\\s+on\\b`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const reco = RECO_MAP[m[1].trim().toLowerCase()];
    if (reco && !out.includes(reco)) out.push(reco);
  }
  return out;
}

// Price(s) from the body line '...at the closing price of $<price>...'.
function parsePrices(html) {
  const text = toText(html);
  const re = new RegExp(`closing price of\\s*${Q}?\\s*\\$?\\s*([\\d,]+(?:\\.\\d+)?)`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(parseFloat(m[1].replace(/,/g, '')));
  return out;
}

const Report = mongoose.model('Report', new mongoose.Schema({
  title: String, slug: String, content: String,
  price: Number, recommendation: String, recommendations: [String],
}, { timestamps: true, strict: false }));

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  const DRY = !!process.env.DRY;
  const FORCE = !!process.env.FORCE;

  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log(`Connected to MongoDB${DRY ? ' (DRY RUN — no writes)' : ''}${FORCE ? ' (FORCE — re-parse all)' : ''}`);

  const reports = await Report.find({}, 'title slug content price recommendation recommendations').lean();
  console.log(`Scanning ${reports.length} reports...`);

  let recoFilled = 0, priceFilled = 0, noBodyReco = 0;
  const stillMissing = [];
  const filledSample = [];

  for (const r of reports) {
    const hasReco = Array.isArray(r.recommendations) ? r.recommendations.length > 0 : !!r.recommendation;
    const bodyRecos = parseBodyRecommendations(r.content);
    const prices = parsePrices(r.content);

    const set = {};

    // Recommendation: fill when missing (or always, under FORCE) and the body has one.
    if ((FORCE || !hasReco) && bodyRecos.length) {
      const changed = FORCE
        ? (r.recommendation !== bodyRecos[0] || JSON.stringify(r.recommendations || []) !== JSON.stringify(bodyRecos))
        : true;
      if (changed) {
        set.recommendations = bodyRecos;
        set.recommendation = bodyRecos[0];
        recoFilled++;
        if (filledSample.length < 12) filledSample.push(`${bodyRecos.join(', ').padEnd(22)} | ${r.title}`);
      }
    } else if (!hasReco && !bodyRecos.length) {
      noBodyReco++;
      stillMissing.push(r.title);
    }

    // Price: fill when currently 0/empty (or always, under FORCE) and the body has one.
    if ((FORCE || !r.price) && prices.length && prices[0] !== r.price) {
      set.price = prices[0];
      priceFilled++;
    }

    if (Object.keys(set).length && !DRY) {
      await Report.updateOne({ _id: r._id }, { $set: set });
    }
  }

  console.log(`\nDone${DRY ? ' (DRY)' : ''}:`);
  console.log(`  recommendation set : ${recoFilled}`);
  console.log(`  price backfilled   : ${priceFilled}`);
  console.log(`  no body reco found : ${noBodyReco} (left blank)`);
  if (filledSample.length) console.log('\n  filled sample:\n   ' + filledSample.join('\n   '));
  if (stillMissing.length) console.log('\n  still missing reco (sample):', stillMissing.slice(0, 20));

  await mongoose.disconnect();
}

main().catch((e) => { console.error('\nUPDATE FAILED:', e); process.exit(1); });
