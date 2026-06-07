#!/usr/bin/env node
'use strict';

/**
 * Creates furiganize.zip for Chrome Web Store submission.
 * Includes only the files Chrome needs; excludes source, tests, and tooling.
 *
 * Usage: npm run pack
 */

const { execSync } = require('child_process');
const fs           = require('fs');
const path         = require('path');

const ROOT    = path.join(__dirname, '..');
const OUT_ZIP = path.join(ROOT, 'furiganize.zip');

// ── Pre-flight checks ─────────────────────────────────────────────────────────

const required = [
  'manifest.json',
  'content_script.js',
  'tooltip.css',
  'vendor/kuromoji.js',
  'vendor/dict/base.dat.gz',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

let ok = true;
for (const f of required) {
  if (!fs.existsSync(path.join(ROOT, f))) {
    console.error(`  ✗ Missing: ${f}`);
    ok = false;
  }
}
if (!ok) {
  console.error('\nRun the following first:\n  npm install\n  npm run build\n');
  process.exit(1);
}

// ── Package ───────────────────────────────────────────────────────────────────

if (fs.existsSync(OUT_ZIP)) fs.unlinkSync(OUT_ZIP);

// Use the macOS/Linux system zip. The items listed here are everything
// referenced by manifest.json plus nothing else.
execSync(
  'zip -r furiganize.zip manifest.json content_script.js tooltip.css vendor/ icons/',
  { cwd: ROOT, stdio: 'inherit' }
);

const { size } = fs.statSync(OUT_ZIP);
const mb = (size / 1024 / 1024).toFixed(1);
console.log(`\n✓ furiganize.zip — ${mb} MB`);
console.log('  Upload at: https://chrome.google.com/webstore/devconsole\n');
