'use strict';

const { toHiragana, hasKanji, isJapanese, esc, buildHTML } = require('./utils');

const TOOLTIP_ID = 'furigana-tooltip-overlay';

// ── Tokenizer ─────────────────────────────────────────────────────────────────

let tokenizerInstance = null;
let tokenizerPromise  = null;

function loadTokenizer() {
  if (tokenizerInstance) return Promise.resolve(tokenizerInstance);
  if (tokenizerPromise)  return tokenizerPromise;

  tokenizerPromise = new Promise((resolve, reject) => {
    const dicPath = chrome.runtime.getURL('vendor/dict/');
    /* global kuromoji */
    kuromoji.builder({ dicPath }).build((err, tokenizer) => {
      if (err) { reject(err); return; }
      tokenizerInstance = tokenizer;
      resolve(tokenizer);
    });
  });

  return tokenizerPromise;
}

// ── Tooltip DOM ───────────────────────────────────────────────────────────────

let tooltipEl = null;
let contentEl = null;

function buildTooltipElement() {
  tooltipEl = document.createElement('div');
  tooltipEl.id = TOOLTIP_ID;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'ft-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    activeToken = null;
    hideTooltip();
  });

  contentEl = document.createElement('div');
  contentEl.className = 'ft-content';

  tooltipEl.appendChild(closeBtn);
  tooltipEl.appendChild(contentEl);

  // Stop mousedown from bubbling so the "click outside" handler ignores it
  tooltipEl.addEventListener('mousedown', e => e.stopPropagation());

  // Append to <html> so body transforms/overflow don't affect position: fixed
  document.documentElement.appendChild(tooltipEl);
}

function getTooltip() {
  if (!tooltipEl) buildTooltipElement();
  return { tooltipEl, contentEl };
}

// ── Positioning ───────────────────────────────────────────────────────────────

// getBoundingClientRect() returns an empty rect for some cross-element
// selections (e.g. spanning two <p> tags). Fall back to getClientRects()
// and take the last entry (the end of the selection).
function rangeRect(range) {
  const r = range.getBoundingClientRect();
  if (r.width || r.height) return r;
  const rects = range.getClientRects();
  return rects.length ? rects[rects.length - 1] : null;
}

function positionAndShow(selRect) {
  const { tooltipEl: tip } = getTooltip();
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const gap = 10;

  // Measure while off-screen to avoid layout thrash
  tip.style.visibility = 'hidden';
  tip.style.display    = 'block';
  tip.style.top        = '0px';
  tip.style.left       = '0px';

  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;

  let top = selRect.top - th - gap;
  if (top < gap) top = selRect.bottom + gap;
  top = Math.max(gap, Math.min(top, vh - th - gap));

  let left = selRect.left + selRect.width / 2 - tw / 2;
  left = Math.max(gap, Math.min(left, vw - tw - gap));

  tip.style.top        = `${top}px`;
  tip.style.left       = `${left}px`;
  tip.style.visibility = 'visible';
}

function setContent(html) {
  const { contentEl: el } = getTooltip();
  el.innerHTML = html;
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}

// ── Selection handling ────────────────────────────────────────────────────────

let activeToken = null;

async function handleSelectionEnd() {
  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (!text || !isJapanese(text)) { hideTooltip(); return; }

  let rect;
  try { rect = rangeRect(selection.getRangeAt(0)); } catch { return; }
  if (!rect) { hideTooltip(); return; }

  setContent('<span class="ft-loading">読込中…</span>');
  positionAndShow(rect);

  const token = Symbol();
  activeToken = token;

  try {
    const tokenizer = await loadTokenizer();
    if (activeToken !== token) return;

    const html = buildHTML(tokenizer.tokenize(text));
    if (activeToken !== token) return;

    setContent(html);
    positionAndShow(rect);
  } catch (err) {
    if (activeToken !== token) return;
    hideTooltip();
    console.warn('[Furigana Tooltip]', err);
  }
}

// ── Event wiring ──────────────────────────────────────────────────────────────

document.addEventListener('mouseup', e => {
  if (tooltipEl?.contains(e.target)) return;
  setTimeout(handleSelectionEnd, 50);
});

document.addEventListener('keyup', e => {
  if (e.shiftKey) setTimeout(handleSelectionEnd, 50);
});

// tooltip's own mousedown stops propagation — so this only fires outside it
document.addEventListener('mousedown', () => {
  activeToken = null;
  hideTooltip();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { activeToken = null; hideTooltip(); }
});
