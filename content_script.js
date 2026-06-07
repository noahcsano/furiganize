"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/utils.js
  var require_utils = __commonJS({
    "src/utils.js"(exports, module) {
      "use strict";
      function toHiragana2(str) {
        return str.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 96));
      }
      var KANJI_RE = /[一-龯㐀-䶿豈-﫿]/;
      var JAPANESE_RE = /[぀-ゟ゠-ヿ一-龯㐀-䶿]/;
      var hasKanji2 = (str) => KANJI_RE.test(str);
      var isJapanese2 = (str) => JAPANESE_RE.test(str);
      function esc2(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      function buildHTML2(tokens) {
        return tokens.map(({ surface_form: surface, reading }) => {
          if (!reading || !hasKanji2(surface)) {
            return `<span>${esc2(surface)}</span>`;
          }
          const hira = toHiragana2(reading);
          if (toHiragana2(surface) === hira) {
            return `<span>${esc2(surface)}</span>`;
          }
          return `<ruby>${esc2(surface)}<rt>${esc2(hira)}</rt></ruby>`;
        }).join("");
      }
      module.exports = { toHiragana: toHiragana2, hasKanji: hasKanji2, isJapanese: isJapanese2, esc: esc2, buildHTML: buildHTML2 };
    }
  });

  // src/content_script.js
  var { toHiragana, hasKanji, isJapanese, esc, buildHTML } = require_utils();
  var TOOLTIP_ID = "furigana-tooltip-overlay";
  var tokenizerInstance = null;
  var tokenizerPromise = null;
  function loadTokenizer() {
    if (tokenizerInstance) return Promise.resolve(tokenizerInstance);
    if (tokenizerPromise) return tokenizerPromise;
    tokenizerPromise = new Promise((resolve, reject) => {
      const dicPath = chrome.runtime.getURL("vendor/dict/");
      kuromoji.builder({ dicPath }).build((err, tokenizer) => {
        if (err) {
          reject(err);
          return;
        }
        tokenizerInstance = tokenizer;
        resolve(tokenizer);
      });
    });
    return tokenizerPromise;
  }
  var tooltipEl = null;
  var contentEl = null;
  function buildTooltipElement() {
    tooltipEl = document.createElement("div");
    tooltipEl.id = TOOLTIP_ID;
    const closeBtn = document.createElement("button");
    closeBtn.className = "ft-close";
    closeBtn.textContent = "\xD7";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      activeToken = null;
      hideTooltip();
    });
    contentEl = document.createElement("div");
    contentEl.className = "ft-content";
    tooltipEl.appendChild(closeBtn);
    tooltipEl.appendChild(contentEl);
    tooltipEl.addEventListener("mousedown", (e) => e.stopPropagation());
    document.documentElement.appendChild(tooltipEl);
  }
  function getTooltip() {
    if (!tooltipEl) buildTooltipElement();
    return { tooltipEl, contentEl };
  }
  function rangeRect(range) {
    const r = range.getBoundingClientRect();
    if (r.width || r.height) return r;
    const rects = range.getClientRects();
    return rects.length ? rects[rects.length - 1] : null;
  }
  function positionAndShow(selRect) {
    const { tooltipEl: tip } = getTooltip();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 10;
    tip.style.visibility = "hidden";
    tip.style.display = "block";
    tip.style.top = "0px";
    tip.style.left = "0px";
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let top = selRect.top - th - gap;
    if (top < gap) top = selRect.bottom + gap;
    top = Math.max(gap, Math.min(top, vh - th - gap));
    let left = selRect.left + selRect.width / 2 - tw / 2;
    left = Math.max(gap, Math.min(left, vw - tw - gap));
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
    tip.style.visibility = "visible";
  }
  function setContent(html) {
    const { contentEl: el } = getTooltip();
    el.innerHTML = html;
  }
  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = "none";
  }
  var activeToken = null;
  async function handleSelectionEnd() {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || !isJapanese(text)) {
      hideTooltip();
      return;
    }
    let rect;
    try {
      rect = rangeRect(selection.getRangeAt(0));
    } catch {
      return;
    }
    if (!rect) {
      hideTooltip();
      return;
    }
    setContent('<span class="ft-loading">\u8AAD\u8FBC\u4E2D\u2026</span>');
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
      console.warn("[Furigana Tooltip]", err);
    }
  }
  document.addEventListener("mouseup", (e) => {
    if (tooltipEl?.contains(e.target)) return;
    setTimeout(handleSelectionEnd, 50);
  });
  document.addEventListener("keyup", (e) => {
    if (e.shiftKey) setTimeout(handleSelectionEnd, 50);
  });
  document.addEventListener("mousedown", () => {
    activeToken = null;
    hideTooltip();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      activeToken = null;
      hideTooltip();
    }
  });
})();
