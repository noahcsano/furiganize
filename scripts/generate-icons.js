#!/usr/bin/env node
'use strict';

/**
 * Generates icons/icon16.png, icon48.png, icon128.png using pure Node.js.
 * No native dependencies — uses only the built-in zlib module for PNG encoding.
 *
 * Icon design: deep indigo rounded-rect background, light-purple furigana bar
 * at top, white cross-stroke suggesting a kanji character below.
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 (required by PNG spec for chunk integrity) ──────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG encoding ──────────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput  = Buffer.concat([typeBytes, data]);
  const crcBuf    = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function encodePNG(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // color type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Prepend a filter byte (0 = None) to each scanline
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    // filter byte stays 0
    pixels.copy(row, 1, y * size * 4, (y + 1) * size * 4);
    rows.push(row);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon drawing ──────────────────────────────────────────────────────────────

// Returns [r, g, b, a] for the pixel at (x, y) in an icon of the given size.
// All coordinates are normalised to [0, 1] before comparisons so the design
// scales identically across 16/48/128.
function drawPixel(x, y, size) {
  const px = (x + 0.5) / size; // normalised centre of pixel
  const py = (y + 0.5) / size;

  // Rounded-rectangle clip mask
  const radius = 0.18;
  function inRoundedRect() {
    if (px < 0 || px > 1 || py < 0 || py > 1) return false;
    const corners = [
      [radius, radius],
      [1 - radius, radius],
      [radius, 1 - radius],
      [1 - radius, 1 - radius],
    ];
    const inBody = (
      (px >= radius && px <= 1 - radius) ||
      (py >= radius && py <= 1 - radius)
    );
    if (inBody) return true;
    return corners.some(([cx, cy]) => {
      const dx = px - cx, dy = py - cy;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  if (!inRoundedRect()) return [0, 0, 0, 0]; // transparent

  // Background — deep indigo #1e1148
  let r = 30, g = 17, b = 72, a = 255;

  // Furigana indicator — light purple horizontal bar (top area)
  // y: 18–30%, x: 18–82%
  const inFuriganaBar = py >= 0.18 && py <= 0.30 && px >= 0.18 && px <= 0.82;

  // Kanji stroke — white cross shape (lower 55% of icon)
  // Horizontal beam: y 47–57%, x 12–88%
  const inKanjiH = py >= 0.47 && py <= 0.57 && px >= 0.12 && px <= 0.88;
  // Vertical stem: y 37–87%, x 44–56%
  const inKanjiV = py >= 0.37 && py <= 0.87 && px >= 0.44 && px <= 0.56;

  if (inFuriganaBar) { r = 167; g = 139; b = 250; } // #a78bfa
  else if (inKanjiH || inKanjiV) { r = 255; g = 255; b = 255; } // white

  return [r, g, b, a];
}

// ── Main ──────────────────────────────────────────────────────────────────────

const iconsDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a2] = drawPixel(x, y, size);
      const i = (y * size + x) * 4;
      pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = a2;
    }
  }
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, encodePNG(size, pixels));
  console.log(`✓ icons/icon${size}.png`);
}
