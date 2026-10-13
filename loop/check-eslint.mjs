// check-eslint.mjs - fails only when a round makes lint WORSE.
// The repo has old lint errors (65 at setup time). Running "eslint ." would stop every round.
// For each file changed since <base>, compare its error count now with its error count at <base>.
// Usage: node loop/check-eslint.mjs main
import { execFileSync } from 'node:child_process';
import { ESLint } from 'eslint';

const base = process.argv[2] || 'main';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const changed = git(['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`])
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f))
  .filter((f) => !f.startsWith('review/') && !/^scripts\/_\d+cha-/.test(f) && !f.startsWith('loop/'));

if (changed.length === 0) {
  console.log('check-eslint: no changed source files, nothing to check');
  process.exit(0);
}

const eslint = new ESLint();
const worse = [];

for (const file of changed) {
  let now = 0;
  try {
    const res = await eslint.lintFiles([file]);
    now = res.reduce((n, r) => n + r.errorCount, 0);
  } catch (e) {
    console.log(`check-eslint: could not lint ${file}: ${e.message}`);
    worse.push(`${file} (lint crashed)`);
    continue;
  }

  let before = 0;
  try {
    const old = git(['show', `${base}:${file}`]);
    const res = await eslint.lintText(old, { filePath: file });
    before = res.reduce((n, r) => n + r.errorCount, 0);
  } catch {
    before = 0; // new file: no baseline, so any error counts
  }

  if (now > before) worse.push(`${file}: errors ${before} -> ${now}`);
  else console.log(`ok  ${file}: errors ${before} -> ${now}`);
}

if (worse.length > 0) {
  console.log('check-eslint: lint got worse in:');
  for (const w of worse) console.log('  ' + w);
  process.exit(1);
}
console.log('check-eslint: no file got worse');
