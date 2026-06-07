#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const root      = path.join(__dirname, '..');
const nmKuromoji = path.join(root, 'node_modules', 'kuromoji');
const vendorDir  = path.join(root, 'vendor');
const dictDir    = path.join(vendorDir, 'dict');

if (!fs.existsSync(nmKuromoji)) {
  console.error('kuromoji not found in node_modules. Run: npm install');
  process.exit(1);
}

fs.mkdirSync(vendorDir, { recursive: true });
fs.mkdirSync(dictDir,   { recursive: true });

// kuromoji browser build
const src = path.join(nmKuromoji, 'build', 'kuromoji.js');
const dst = path.join(vendorDir, 'kuromoji.js');
fs.copyFileSync(src, dst);
console.log('✓ vendor/kuromoji.js');

// Dictionary files (.dat.gz)
const dictSrc = path.join(nmKuromoji, 'dict');
for (const file of fs.readdirSync(dictSrc)) {
  fs.copyFileSync(path.join(dictSrc, file), path.join(dictDir, file));
  console.log(`✓ vendor/dict/${file}`);
}

console.log('\nVendor files ready — load the extension in Chrome from this directory.');
