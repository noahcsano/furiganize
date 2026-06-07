'use strict';

chrome.action.onClicked.addListener(tab => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['vendor/kuromoji.js', 'content_script.js'],
  });
  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ['tooltip.css'],
  });
});
