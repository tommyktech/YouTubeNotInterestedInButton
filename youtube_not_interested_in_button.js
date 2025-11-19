// ==UserScript==
// @name         YouTube Desktop/Mobile 両対応
// @match        https://*.youtube.com/
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const host = window.location.hostname;

//  const TILE_SELECTOR = 'ytd-rich-item-renderer';
  // const MENU_BUTTON_SELECTOR = 'button-view-model.ytSpecButtonViewModelHost';
  // const MENU_BUTTON_SELECTOR = 'div.yt-spec-touch-feedback-shape__fill';

  var TILE_SELECTOR = 'ytd-rich-item-renderer';
  //var MENU_BUTTON_SELECTOR = 'div.yt-spec-touch-feedback-shape__fill';
  var MENU_BUTTON_SELECTOR = 'button[aria-label="その他の操作"]';

  if (host == "m.youtube.com") {
      //TILE_SELECTOR = 'ytm-rich-item-renderer';
      TILE_SELECTOR = 'ytm-video-with-context-renderer';

      MENU_BUTTON_SELECTOR = 'ytm-menu-renderer ytm-menu button';
  }

  const PROCESSED_ATTR = 'data-yt-menu-opener-added';

  function attachButton(tile, idx) {
    if (!tile || tile.hasAttribute(PROCESSED_ATTR)) return;
    tile.setAttribute(PROCESSED_ATTR, '1');

    const btn = document.createElement('button');
    btn.textContent = 'その他';
    btn.style.position = 'absolute';
    btn.style.right = '6px';
    btn.style.top = '6px';
    btn.style.zIndex = 2147483647;
    btn.style.fontSize = '12px';
    btn.style.padding = '4px 6px';
    btn.style.color = "black";
    btn.style.backgroundColor = "white";

      btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();

          //const menuBtn = tile.querySelector('button[aria-label="その他の操作"]');
          const menuBtn = tile.querySelector(MENU_BUTTON_SELECTOR);
          if (!menuBtn) return console.log('menu button not found');

          menuBtn.click(); // ここでメニューを開く
          console.log('menu button clicked');
      });

    tile.style.position = 'relative';
    tile.appendChild(btn);
  }

  function scanTiles() {
    document.querySelectorAll(TILE_SELECTOR).forEach((tile, idx) => attachButton(tile, idx));
  }

    setTimeout(() => {
        scanTiles();
        new MutationObserver(scanTiles).observe(document.body, { childList: true, subtree: true });
    }, 5000);

})();
