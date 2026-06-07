'use strict';

const { toHiragana, hasKanji, isJapanese, esc, buildHTML } = require('../src/utils');

// ── toHiragana ────────────────────────────────────────────────────────────────

describe('toHiragana', () => {
  test('converts standard katakana', () => {
    expect(toHiragana('カタカナ')).toBe('かたかな');
  });

  test('converts small katakana — the core bug class', () => {
    expect(toHiragana('ッ')).toBe('っ');
    expect(toHiragana('ャュョ')).toBe('ゃゅょ');
    expect(toHiragana('ァィゥェォ')).toBe('ぁぃぅぇぉ');
  });

  test('preserves small kana inside compound readings', () => {
    expect(toHiragana('ハッピョウ')).toBe('はっぴょう');
    expect(toHiragana('ガッコウ')).toBe('がっこう');
    expect(toHiragana('トッキュウ')).toBe('とっきゅう');
  });

  test('leaves hiragana unchanged', () => {
    expect(toHiragana('ひらがな')).toBe('ひらがな');
  });

  test('leaves kanji and latin unchanged', () => {
    expect(toHiragana('漢字abc')).toBe('漢字abc');
  });

  test('handles empty string', () => {
    expect(toHiragana('')).toBe('');
  });
});

// ── hasKanji ──────────────────────────────────────────────────────────────────

describe('hasKanji', () => {
  test('detects common kanji', () => {
    expect(hasKanji('漢字')).toBe(true);
    expect(hasKanji('日本語')).toBe(true);
    expect(hasKanji('東京')).toBe(true);
  });

  test('rejects pure hiragana', () => {
    expect(hasKanji('ひらがな')).toBe(false);
  });

  test('rejects pure katakana', () => {
    expect(hasKanji('カタカナ')).toBe(false);
  });

  test('rejects latin and punctuation', () => {
    expect(hasKanji('hello!')).toBe(false);
    expect(hasKanji('123')).toBe(false);
  });

  test('detects kanji mixed into other text', () => {
    expect(hasKanji('hello世界')).toBe(true);
    expect(hasKanji('テスト漢字テスト')).toBe(true);
  });
});

// ── isJapanese ────────────────────────────────────────────────────────────────

describe('isJapanese', () => {
  test('detects hiragana', () => {
    expect(isJapanese('ひらがな')).toBe(true);
  });

  test('detects katakana', () => {
    expect(isJapanese('カタカナ')).toBe(true);
  });

  test('detects kanji', () => {
    expect(isJapanese('漢字')).toBe(true);
  });

  test('rejects latin-only text', () => {
    expect(isJapanese('hello world')).toBe(false);
    expect(isJapanese('123')).toBe(false);
  });

  test('returns true for mixed text containing Japanese', () => {
    expect(isJapanese('hello世界')).toBe(true);
  });

  test('handles empty string', () => {
    expect(isJapanese('')).toBe(false);
  });
});

// ── esc ───────────────────────────────────────────────────────────────────────

describe('esc', () => {
  test('escapes < and >', () => {
    expect(esc('<div>')).toBe('&lt;div&gt;');
  });

  test('escapes ampersand', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  test('escapes a full XSS payload', () => {
    expect(esc('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    );
  });

  test('leaves safe characters unchanged', () => {
    expect(esc('日本語テスト')).toBe('日本語テスト');
    expect(esc('hello world')).toBe('hello world');
  });

  test('handles empty string', () => {
    expect(esc('')).toBe('');
  });
});

// ── buildHTML ─────────────────────────────────────────────────────────────────

describe('buildHTML', () => {
  test('wraps kanji token in ruby with hiragana rt', () => {
    const tokens = [{ surface_form: '日本語', reading: 'ニホンゴ' }];
    expect(buildHTML(tokens)).toBe('<ruby>日本語<rt>にほんご</rt></ruby>');
  });

  test('preserves small kana in ruby reading', () => {
    const tokens = [{ surface_form: '学校', reading: 'ガッコウ' }];
    expect(buildHTML(tokens)).toBe('<ruby>学校<rt>がっこう</rt></ruby>');
  });

  test('wraps particle (no kanji) in span', () => {
    const tokens = [{ surface_form: 'の', reading: 'ノ' }];
    expect(buildHTML(tokens)).toBe('<span>の</span>');
  });

  test('wraps token with no reading in span', () => {
    const tokens = [{ surface_form: 'hello', reading: undefined }];
    expect(buildHTML(tokens)).toBe('<span>hello</span>');
  });

  test('skips ruby when surface is already the same kana as reading', () => {
    // てすと is hiragana; reading テスト converts to てすと — same, no ruby
    const tokens = [{ surface_form: 'てすと', reading: 'テスト' }];
    expect(buildHTML(tokens)).toBe('<span>てすと</span>');
  });

  test('escapes HTML in surface_form — XSS via malicious page content', () => {
    const tokens = [{ surface_form: '<script>bad()</script>', reading: undefined }];
    expect(buildHTML(tokens)).toBe('<span>&lt;script&gt;bad()&lt;/script&gt;</span>');
  });

  test('escapes HTML in reading', () => {
    const tokens = [{ surface_form: '漢字', reading: '<bad>' }];
    expect(buildHTML(tokens)).toBe('<ruby>漢字<rt>&lt;bad&gt;</rt></ruby>');
  });

  test('handles multiple tokens correctly', () => {
    const tokens = [
      { surface_form: '東京', reading: 'トウキョウ' },
      { surface_form: 'の', reading: 'ノ' },
      { surface_form: '空', reading: 'ソラ' },
    ];
    expect(buildHTML(tokens)).toBe(
      '<ruby>東京<rt>とうきょう</rt></ruby>' +
      '<span>の</span>' +
      '<ruby>空<rt>そら</rt></ruby>'
    );
  });

  test('handles empty token array', () => {
    expect(buildHTML([])).toBe('');
  });
});
