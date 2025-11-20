// ==UserScript==
// @name         YouTube Desktop/Mobile 両対応
// @match        https://*.youtube.com/
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

GM_addStyle(`
  div.yt-lockup-metadata-view-model__menu-button button.yt-spec-button-shape-next {
    width: 60px !important;
    height: 80px !important;
  }
  ytm-menu-renderer ytm-menu button c3-icon {
    width: 50px !important;
    height: 50px !important;
  }
`);

(function() {
  'use strict';

  var isMobile = false;
  const host = window.location.hostname;
  if (host == "m.youtube.com") {
      isMobile = true;
  }

//  const TILE_SELECTOR = 'ytd-rich-item-renderer';
  // const MENU_BUTTON_SELECTOR = 'button-view-model.ytSpecButtonViewModelHost';
  // const MENU_BUTTON_SELECTOR = 'div.yt-spec-touch-feedback-shape__fill';

  var TILE_SELECTOR = 'ytd-rich-item-renderer';
  //var MENU_BUTTON_SELECTOR = 'div.yt-spec-touch-feedback-shape__fill';
  var MENU_BUTTON_SELECTOR = 'button[aria-label="その他の操作"]';
  var NOT_INTERESTED_BUTTON = 'yt-list-item-view-model.yt-list-item-view-model:nth-child(6)'
  var THUMBNAIL_VIEW = 'yt-thumbnail-view-model'

  if (isMobile) {
      //TILE_SELECTOR = 'ytm-rich-item-renderer';
      TILE_SELECTOR = 'ytm-video-with-context-renderer';
      MENU_BUTTON_SELECTOR = 'ytm-menu-renderer ytm-menu button';
      NOT_INTERESTED_BUTTON = 'ytm-menu-service-item-renderer:nth-child(1) > ytm-menu-item > button'
      THUMBNAIL_VIEW = 'ytm-thumbnail-cover'
  }

  const PROCESSED_ATTR = 'data-yt-menu-opener-added';

  function attachButton(tile, idx) {
    //console.log("tile:", tile)
    //console.log("idx:", idx)

    if (!tile || tile.hasAttribute(PROCESSED_ATTR)) return;
    tile.setAttribute(PROCESSED_ATTR, '1');

    const btn = document.createElement('button');
    btn.textContent = '🗑️';
    btn.style.position = 'absolute';
    btn.style.right = '0px';
    btn.style.bottom = '0px';
    btn.style.zIndex = 2000;
    btn.style.fontSize = '24px';
    btn.style.padding = '24px 24px 64px 24px';
    btn.style.color = "black";
    btn.style.backgroundColor = "transparent";

    btn.style.borderColor = "transparent";
    btn.style.height = "64px";
    btn.style.width = "64px";


    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      //const menuBtn = tile.querySelector('button[aria-label="その他の操作"]');
      const menuBtn = tile.querySelector(MENU_BUTTON_SELECTOR);
      if (!menuBtn) return console.log('menu button not found');

      menuBtn.click(); // ここでメニューを開く
      console.log('menu button clicked');

        setTimeout(() => {
            const notInterestedButton = document.querySelector(NOT_INTERESTED_BUTTON);
            if (notInterestedButton) {
                notInterestedButton.click();
            }
        }, 100);


    });

    tile.style.position = 'relative';
    tile.querySelector(THUMBNAIL_VIEW).appendChild(btn);
  }

  function scanTiles() {
    document.querySelectorAll(TILE_SELECTOR).forEach((tile, idx) => attachButton(tile, idx));
  }

    setTimeout(() => {
        scanTiles();
        new MutationObserver(scanTiles).observe(document.body, { childList: true, subtree: true });
    }, 1000);

})();
