// scripts/import-subscribers-only.mjs
// Import ONLY subscriber accounts from a WP export (wp-export-all-subscribers.php
// or wp-export-members.php). No packages, orders, transactions, or userproducts —
// just the account. Orders are added separately from the Excel sheet afterwards.
//
// Each missing subscriber is created with: name, email, phone, a RANDOM password,
// isEmailVerified=true, isActive=true, createdAt = WP registered date. They recover
// access via forgot-password / OTP (no plaintext is shipped).
//
// Matching is by email. Existing subscribers are left untouched (counted, not modified).
//
// Usage:
//   DRY=1 node scripts/import-subscribers-only.mjs <export.json>   # report only (no writes)
//   node scripts/import-subscribers-only.mjs <export.json>         # import missing accounts
//   LIMIT=25 node scripts/import-subscribers-only.mjs <export.json>
//
// Re-running is safe: nothing is duplicated (email match) and nothing existing is changed.

import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = !!process.env.DRY;
const LIMIT = Number(process.env.LIMIT || 0);

function loadEnv() {
  const raw = readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

const Subscriber = mongoose.model('Subscriber', new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String,
  phone: String, isActive: Boolean, isEmailVerified: Boolean,
}, { timestamps: true, strict: false }));

async function hashRandomPassword() {
  const pw = crypto.randomBytes(18).toString('base64url');
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(pw, salt);
}

// WP registered dates are UTC 'Y-m-d H:i:s' (also tolerate ISO / m/d/Y).
function parseWpDate(s) {
  if (!s) return null;
  const v = String(s).trim();
  let m;
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)))
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)))
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)))
    return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
  const t = Date.parse(v);
  return isNaN(t) ? null : new Date(t);
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/import-subscribers-only.mjs <export.json>');
  const data = JSON.parse(readFileSync(path.isAbsolute(file) ? file : path.join(process.cwd(), file), 'utf8'));
  const subscribersIn = data.subscribers || [];
  console.log(`Loaded export: ${subscribersIn.length} users (site: ${data.site || 'unknown'})`);

  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log('Connected to MongoDB' + (DRY ? '  (DRY RUN — no writes)' : ''));

  let subsNew = 0, subsExisting = 0, noEmail = 0, seen = 0;
  const newOnes = [];

  for (const s of subscribersIn) {
    seen++;
    if (!s.email) { noEmail++; continue; }
    const email = String(s.email).toLowerCase().trim();
    const name = (s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.login || email).trim();
    const phone = (s.phone || '').trim() || 'N/A';
    const registered = parseWpDate(s.registered) || new Date();

    const existing = await Subscriber.findOne({ email }).select('_id').lean();
    if (existing) { subsExisting++; continue; }

    subsNew++;
    newOnes.push(`${name} <${email}>`);
    if (!DRY) {
      await Subscriber.create({
        name, email, phone, isActive: true, isEmailVerified: true,
        password: await hashRandomPassword(), createdAt: registered, updatedAt: registered,
      });
    }

    if (LIMIT && seen >= LIMIT) break;
    if (seen % 100 === 0) process.stdout.write(`\r  processed ${seen}/${subscribersIn.length} — new ${subsNew}, existing ${subsExisting}`);
  }
  process.stdout.write('\n');

  console.log(`\nDone${DRY ? ' (DRY)' : ''}: ${subsNew} new account(s) ${DRY ? 'WOULD BE created' : 'created'}, ${subsExisting} already existed, ${noEmail} skipped (no email).`);
  if (newOnes.length) {
    console.log(`\nNEW ACCOUNTS (${newOnes.length}):`);
    newOnes.forEach((n, i) => console.log(`  ${String(i + 1).padStart(4)}  ${n}`));
  }
  await mongoose.disconnect();
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) main().catch((e) => { console.error('\nIMPORT FAILED:', e); process.exit(1); });
