// ==UserScript==
// @name         YouTube Desktop/Mobile 両対応
// @match        https://*.youtube.com/*
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

  console.log("init YouTube Desktop/Mobile 両対応")
  var isMobile = false;
  const host = window.location.hostname;
  if (host == "m.youtube.com") {
      isMobile = true;
  }

  var TILE_SELECTOR = 'ytd-rich-item-renderer';
  var MENU_BUTTON_SELECTOR = 'button[aria-label="その他の操作"]';
  var NOT_INTERESTED_BUTTON = 'yt-list-item-view-model.yt-list-item-view-model:nth-child(6)';
  var THUMBNAIL_VIEW = 'yt-thumbnail-view-model';

  if (isMobile) {
      TILE_SELECTOR = 'ytm-video-with-context-renderer';
      MENU_BUTTON_SELECTOR = 'ytm-menu-renderer ytm-menu button';
      NOT_INTERESTED_BUTTON = 'ytm-menu-service-item-renderer:nth-child(1) > ytm-menu-item > button';
      THUMBNAIL_VIEW = 'ytm-thumbnail-cover';
  }

  const PROCESSED_ATTR = 'data-yt-menu-opener-added';

  // === ここから追加部分：メニュー用の合成タップヘルパー ======================
  function synthesizePointerTapAt(target) {
    if (!target) return;

    const r = target.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);

    const opts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: cx,
      clientY: cy,
      screenX: cx,
      screenY: cy,
      pointerType: 'touch',
      isPrimary: true
    };

    try {
      target.dispatchEvent(new PointerEvent('pointerdown', opts));
      target.dispatchEvent(new PointerEvent('pointerup',   opts));
    } catch (e) {
      // PointerEvent 非対応環境では無視（後続の click に頼る）
      console.log("failed to dispatch pointerdown or pointerup")
    }

    target.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: cx,
      clientY: cy
    }));

    console.log('menu synthetic tap dispatched');
  }
  // === ここまで追加部分 ====================================================

  function attachButton(tile, idx) {
    if (!tile) {
        console.log("tile is null:", tile)
        return;
    }
    if (tile.hasAttribute(PROCESSED_ATTR)) {
        console.log("button already attached")
        return;
    }
    tile.setAttribute(PROCESSED_ATTR, '1');

    const btn = document.createElement('button');
    btn.textContent = '🗑️';
    btn.style.position = 'absolute';
    btn.style.right = '0px';
    btn.style.top = '40px';
    btn.style.zIndex = 2000;
    btn.style.fontSize = '24px';
    btn.style.padding = '24px 24px 64px 24px';
    btn.style.color = 'black';
    btn.style.backgroundColor = 'transparent';
    btn.style.borderColor = 'transparent';
    btn.style.height = '64px';
    btn.style.width = '64px';

    tile.style.position = 'relative';
      /*
    const thumb = tile.querySelector(THUMBNAIL_VIEW);
    if (!thumb) {
      console.log('thumbnail not found');
      return;
    }
    */
    tile.appendChild(btn);
    console.log("appended btn to tile")

    // === ここからリスナーを変更 ============================================
    // click ではなく pointerup / touchend で処理する
    function onActivate(ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const menuBtn = tile.querySelector(MENU_BUTTON_SELECTOR);
      if (!menuBtn) {
        console.log('menu button not found');
        return;
      }

      // 合成 pointer + click をメニューに送る
      synthesizePointerTapAt(menuBtn);

      setTimeout(() => {
        const notInterestedButton = document.querySelector(NOT_INTERESTED_BUTTON);
        console.log("notInterestedButton:", notInterestedButton)
        if (notInterestedButton) {
            synthesizePointerTapAt(notInterestedButton)
          //notInterestedButton.click();
        }
      }, 3000);
    }

    // PC では click / mousedown だけでも足りるが、モバイルを優先して pointer/touch を見る
    btn.addEventListener('pointerup', function(ev) {       // ★ 追加
      if (!ev.isPrimary) return;
      onActivate(ev);
    });

    btn.addEventListener('touchend', function(ev) {        // ★ 追加
      onActivate(ev);
    }, { passive: false });

    // 念のため click もフォールバックとして残す（PC 用）
    btn.addEventListener('click', function(ev) {           // ★ 変更（onActivate呼び出し）
      onActivate(ev);
    });
    // === ここまでリスナー変更 ==============================================
  }

  function scanTiles() {
    document.querySelectorAll(TILE_SELECTOR).forEach((tile, idx) => attachButton(tile, idx));
  }

  setTimeout(() => {
    scanTiles();
    new MutationObserver(scanTiles).observe(document.body, { childList: true, subtree: true });
  }, 1000);

})();
