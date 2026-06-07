'use strict';

// Katakana codepoints sit exactly 0x60 above their hiragana equivalents,
// including small kana (ッ→っ, ャ→ゃ, etc.).
function toHiragana(str) {
  return str.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

// CJK Unified Ideographs, Extension A, and CJK Compatibility Ideographs
const KANJI_RE    = /[一-龯㐀-䶿豈-﫿]/;
// Hiragana, katakana, and kanji blocks
const JAPANESE_RE = /[぀-ゟ゠-ヿ一-龯㐀-䶿]/;

const hasKanji   = str => KANJI_RE.test(str);
const isJapanese = str => JAPANESE_RE.test(str);

// Minimal HTML escaping — applied to all kuromoji surface_form values
// before they are written into innerHTML to prevent XSS.
function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Convert a kuromoji token array into a string of <ruby>/<span> HTML.
// All text that enters innerHTML is escaped via esc().
function buildHTML(tokens) {
  return tokens.map(({ surface_form: surface, reading }) => {
    if (!reading || !hasKanji(surface)) {
      return `<span>${esc(surface)}</span>`;
    }
    const hira = toHiragana(reading);
    // Skip ruby when the surface is already the same kana as the reading
    if (toHiragana(surface) === hira) {
      return `<span>${esc(surface)}</span>`;
    }
    return `<ruby>${esc(surface)}<rt>${esc(hira)}</rt></ruby>`;
  }).join('');
}

module.exports = { toHiragana, hasKanji, isJapanese, esc, buildHTML };
