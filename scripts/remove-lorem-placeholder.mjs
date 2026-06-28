// Remove the imported "Lorem ipsum dolor sit amet…" placeholder body from reports.
// The text came across verbatim from the old WordPress posts (migrate-wp-reports.mjs).
// It removes the exact placeholder sentence; if that leaves the body effectively
// empty, the whole `content` field is cleared so the listing excerpt and the
// report detail page render nothing instead of junk.
//
// Usage:
//   DRY=1 node scripts/remove-lorem-placeholder.mjs   # preview, no writes
//   node scripts/remove-lorem-placeholder.mjs         # apply
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = !!process.env.DRY;

const raw = readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (!m) continue;
  if (!(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const PLACEHOLDER = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.';
// Flexible whitespace so HTML line-wrapping inside the body still matches.
const placeholderRe = new RegExp(
  PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
  'gi',
);
const emptyTagRe = /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;

function clean(content) {
  let c = content.replace(placeholderRe, '');
  c = c.replace(emptyTagRe, '');
  const textLeft = c.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
  return textLeft ? c.trim() : '';
}

const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));

await mongoose.connect(process.env.MONGODB_URI);
const matches = await Report.find({ content: placeholderRe }).select('title slug content').lean();

let cleared = 0, trimmed = 0, unchanged = 0;
for (const r of matches) {
  const next = clean(r.content || '');
  if (next === r.content) { unchanged++; continue; }
  if (next === '') cleared++; else trimmed++;
  if (!DRY) await Report.updateOne({ _id: r._id }, { $set: { content: next } });
}

console.log(`${DRY ? '[DRY RUN] ' : ''}Reports with the placeholder: ${matches.length}`);
console.log(`  Body was only the placeholder -> content cleared: ${cleared}`);
console.log(`  Placeholder removed, real text kept:              ${trimmed}`);
console.log(`  No effective change:                             ${unchanged}`);
console.log(DRY ? 'No writes performed (DRY).' : 'Writes applied.');
await mongoose.disconnect();
