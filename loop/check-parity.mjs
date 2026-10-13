// check-parity.mjs - runs the live<->export parity script and turns its printout into an exit code.
// Why a wrapper: scripts/286cha-type-parity-verify.ts always exits 0 unless it crashes, needs a running dev server,
// and needs SESSION to point at an existing session file. This wrapper handles all three.
//
// Counting rule: a line is a mismatch when it contains "diff=<number>" and the number is not 0.
// Lines with diff=- (nothing measured) and lines that mention illustration_banner (known baseline, hands off) are skipped.
// If the real output format differs, adjust ONLY the regex below, and note it in the round report.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';

const SESSION = process.env.SESSION || 'review/beauty-sample-1012/session.json';
const LABEL = process.env.LABEL || 'loop';
const URL_BASE = process.env.PARITY_URL || 'http://localhost:3000';
const MAX_MISMATCH = 0;

async function up() {
  try {
    const r = await fetch(URL_BASE, { signal: AbortSignal.timeout(5000) });
    return r.status < 500;
  } catch {
    return false;
  }
}

if (!fs.existsSync(SESSION)) {
  console.log(`check-parity: session file not found: ${SESSION}`);
  process.exit(1);
}

let dev = null;
if (!(await up())) {
  console.log('check-parity: dev server is not running, starting "npm run dev"');
  dev = spawn('cmd.exe', ['/c', 'npm run dev'], { stdio: 'ignore', detached: false });
  let ok = false;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if (await up()) { ok = true; break; }
  }
  if (!ok) {
    console.log('check-parity: dev server did not come up within 120 seconds');
    if (dev?.pid) spawnSync('taskkill', ['/PID', String(dev.pid), '/T', '/F']);
    process.exit(1);
  }
}

const run = spawnSync('cmd.exe', ['/c', 'npx tsx scripts/286cha-type-parity-verify.ts'], {
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
  env: { ...process.env, SESSION, LABEL },
});

if (dev?.pid) spawnSync('taskkill', ['/PID', String(dev.pid), '/T', '/F']);

const out = (run.stdout || '') + '\n' + (run.stderr || '');
if (run.status !== 0) {
  console.log('check-parity: the parity script crashed (exit ' + run.status + ')');
  console.log(out.split(/\r?\n/).slice(-30).join('\n'));
  process.exit(1);
}

let measured = 0;
const bad = [];
for (const line of out.split(/\r?\n/)) {
  const m = line.match(/diff=([+-]?\d+(?:\.\d+)?)/);
  if (!m) continue;
  measured++;
  if (/illustration_banner/.test(line)) continue;
  if (Math.abs(parseFloat(m[1])) > 0) bad.push(line.trim());
}

console.log(`check-parity: measured ${measured} lines, mismatches ${bad.length}`);
if (measured === 0) {
  console.log('check-parity: found no "diff=" lines at all - output format changed or nothing was measured');
  process.exit(1);
}
if (bad.length > MAX_MISMATCH) {
  for (const b of bad.slice(0, 30)) console.log('  ' + b);
  process.exit(1);
}
process.exit(0);
