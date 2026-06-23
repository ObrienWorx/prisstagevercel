// scripts/clear-subscriber-passwords.mjs
// One-off: remove password + plainPassword from ALL subscribers so migrated users
// can't log in with the random/throwaway hash. They sign in via OTP, then the app
// prompts them to set a password (login-otp -> requiresPasswordSetup -> set-password).
//
// Usage:
//   DRY=1 node scripts/clear-subscriber-passwords.mjs   # show how many would change
//   node scripts/clear-subscriber-passwords.mjs         # apply

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

const Subscriber = mongoose.model('Subscriber', new mongoose.Schema({}, { strict: false }));

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log('Connected to MongoDB' + (DRY ? '  (DRY RUN — no writes)' : ''));

  const total = await Subscriber.countDocuments();
  const withPw = await Subscriber.countDocuments({
    $or: [{ password: { $exists: true, $ne: null } }, { plainPassword: { $exists: true, $ne: null } }],
  });
  console.log(`Subscribers: ${total} total, ${withPw} have a password/plainPassword set.`);

  if (!DRY) {
    const res = await Subscriber.updateMany({}, { $unset: { password: '', plainPassword: '' } });
    console.log(`Cleared password fields on ${res.modifiedCount} subscribers.`);
  }
  await mongoose.disconnect();
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) main().catch((e) => { console.error('\nFAILED:', e); process.exit(1); });
