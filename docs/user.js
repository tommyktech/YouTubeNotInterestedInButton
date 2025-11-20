// ==UserScript==
// @name         YouTube Desktop/Mobile 両対応 (improved)
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
  /* <<< CHANGED >>>: 追加ボタンの識別用クラス */
  .yt-trash-btn {
    touch-action: manipulation;
  }
`);

(function() {
  'use strict';

  console.log("init YouTube Desktop/Mobile 両対応 (improved)");
  var isMobile = (window.location.hostname === "m.youtube.com");

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

  // === utils ===
  function isVisible(el) {
    if (!el) return false;
    const s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity || '1') === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    if (r.bottom < 0 || r.top > (window.innerHeight || document.documentElement.clientHeight)) return false;
    return true;
  }

  function waitForElementVisible(selectorOrElGetter, timeout = 1500, interval = 120) {
    return new Promise(resolve => {
      const start = performance.now();
      const tick = () => {
        let el = (typeof selectorOrElGetter === 'string') ? document.querySelector(selectorOrElGetter) : (selectorOrElGetter());
        if (el && isVisible(el)) return resolve(el);
        if (performance.now() - start >= timeout) return resolve(null);
        setTimeout(tick, interval);
      };
      tick();
    });
  }

  // === <<< CHANGED >>>: 合成タップ＋フォールバッククリック改善 ===
  function synthesizePointerTapAt(target, target_name) {
    if (!target) return false;
    try {
      const r = target.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2);
      const cy = Math.round(r.top + r.height / 2);
      const opts = {
        bubbles: true, cancelable: true, composed: true,
        clientX: cx, clientY: cy, screenX: cx, screenY: cy,
        pointerType: 'touch', isPrimary: true
      };
      try {
        target.dispatchEvent(new PointerEvent('pointerdown', opts));
        target.dispatchEvent(new PointerEvent('pointerup', opts));
      } catch (e) {}
      try {
        target.click(); // まずはネイティブ click を使う（最も互換性高い）
      } catch (e) {
        // fallback
        target.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, clientX:cx, clientY:cy}));
      }
      console.log(target_name + ' synthetic tap dispatched ->', target);
      return true;
    } catch (err) {
      console.log('synthesizePointerTapAt failed', err);
      return false;
    }
  }
  // <<< CHANGED END >>>

  // === <<< CHANGED >>>: menu ボタンの「実際にイベントを受け取る要素」を探索するヘルパー ===
  function findActionableMenuButton(tile) {
    if (!tile) return null;
    // 1) まず素直にセレクタで探す
    let cand = tile.querySelector(MENU_BUTTON_SELECTOR);
    if (cand && isVisible(cand)) return cand;

    // 2) よくある内部要素を探す（候補リスト）
    const fallbacks = [
      'yt-touch-feedback-shape',
      '.yt-spec-touch-feedback-shape__fill',
      'tp-yt-paper-icon-button',
      'button[aria-pressed]', // 例
      'button'
    ];
    for (const s of fallbacks) {
      const e = tile.querySelector(s);
      if (e && isVisible(e)) return e;
    }

    // 3) タイル右側（サムネイル上）付近の visible な button を選ぶ
    const buttons = Array.from(tile.querySelectorAll('button, [role="button"]')).filter(isVisible);
    if (buttons.length) {
      // choose the one closest to tile right edge (heuristic)
      const tileRect = tile.getBoundingClientRect();
      buttons.sort((a,b)=>{
        const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
        const da = Math.abs((ra.left+ra.right)/2 - (tileRect.left+tileRect.right)/2);
        const db = Math.abs((rb.left+rb.right)/2 - (tileRect.left+tileRect.right)/2);
        return da - db;
      });
      return buttons[0];
    }
    return null;
  }
  // <<< CHANGED END >>>

  // attachButton: ここではボタンを作るだけ。イベントは委譲で処理する。
  function attachButton(tile, idx) {
    if (!tile) {
      //console.log("tile is null:", tile)
      return;
    }
    if (tile.hasAttribute(PROCESSED_ATTR)) {
      //console.log("button already attached")
      return;
    }
    tile.setAttribute(PROCESSED_ATTR, '1');

    const btn = document.createElement('button');
    btn.className = 'yt-trash-btn'; // <<< CHANGED: class を付与
    btn.textContent = '🗑️';
    btn.style.position = 'absolute';
    btn.style.right = '6px';
    btn.style.top = '6px';
    btn.style.zIndex = 2000;
    btn.style.fontSize = '20px';
    btn.style.padding = '6px';
    btn.style.color = 'black';
    btn.style.backgroundColor = 'transparent';
    btn.style.border = 'none';
    btn.style.height = '36px';
    btn.style.width = '36px';
    btn.setAttribute('aria-label','script-trash-button');

    // 既知の aria-hidden 問題を避けるため tile に直接 append（以前と同様）
    tile.style.position = tile.style.position || 'relative';
    tile.appendChild(btn);
  }

  // === <<< CHANGED >>>: イベント委譲ハンドラ（document レベル） ===
  async function handleTrashActivate(ev) {
    // 対象ボタンを特定（イベント委譲）
    const btn = (ev.target && ev.target.closest && ev.target.closest('.yt-trash-btn'));
    if (!btn) return;
    ev.preventDefault(); ev.stopPropagation();

    // 「最新の」タイルを取得（btn の時点での closest）
    let tile = btn.closest(TILE_SELECTOR);
    if (!tile) {
      // フォールバック: DOMツリーを遡って tile を探す
      tile = document.querySelector(TILE_SELECTOR);
    }
    if (!tile) {
      console.log('no tile found for trash btn');
      return;
    }

    // menu ボタンを探索（最新の DOM を参照）
    let menuBtn = findActionableMenuButton(tile);
    if (!menuBtn) {
      console.log('menu button not found for tile', tile);
      return;
    }

    // 1) メニューを開く（複数回試行）
    const MAX_OPEN_TRIES = 3;
    let menuOpened = false;
    for (let i=0;i<MAX_OPEN_TRIES && !menuOpened;i++) {
      synthesizePointerTapAt(menuBtn, 'menu');
      // メニュー中の NOT_INTERESTED_BUTTON が visible になるまで待つ
      const notInterested = await waitForElementVisible(NOT_INTERESTED_BUTTON, 800, 120);
      if (notInterested) {
        menuOpened = true;
        // 2) 見つかった要素の「実際にイベントを受け取る要素」をできるだけ探す
        const actionableNI = (function(el){
          if (!el) return null;
          if (isVisible(el) && typeof el.click === 'function') return el;
          const innerBtn = el.querySelector('button, [role="button"]');
          if (innerBtn && isVisible(innerBtn)) return innerBtn;
          return el;
        })(notInterested);
        // 3) 複数回叩いて反応を見る
        let success = false;
        for (let k=0;k<3 && !success;k++) {
          synthesizePointerTapAt(actionableNI, 'not interested');
          await new Promise(r => setTimeout(r, 220));
          if (!tile.isConnected) { success = true; break; } // tile が消えたら成功と判断
          // あるいは notInterested が消えていれば成功と判断
          const niNow = document.querySelector(NOT_INTERESTED_BUTTON);
          if (!niNow || !isVisible(niNow)) { success = true; break; }
        }
        if (success) {
          console.log('not interested action succeeded');
          return;
        } else {
          console.log('not interested did not respond; will retry open if tries remain');
        }
      } else {
        // メニューが出てこなかった → 再試行
        await new Promise(r => setTimeout(r, 120));
        // menuBtn may have been replaced; re-find
        menuBtn = findActionableMenuButton(tile) || document.querySelector(MENU_BUTTON_SELECTOR);
        if (!menuBtn) break;
      }
    }
    console.log('handleTrashActivate: attempts exhausted');
  }
  // イベント委譲を追加（pointerup を主に）
  document.addEventListener('pointerup', handleTrashActivate, {passive:false});
  document.addEventListener('click', handleTrashActivate, {passive:false});
  // <<< CHANGED END >>>

  function scanTiles() {
    document.querySelectorAll(TILE_SELECTOR).forEach((tile, idx) => attachButton(tile, idx));
  }

  setTimeout(() => {
    scanTiles();
    new MutationObserver(scanTiles).observe(document.body, { childList: true, subtree: true });
    // <<< CHANGED >>>: 定期スキャンで attach の漏れを埋める
    setInterval(scanTiles, 1000);
    // <<< CHANGED END >>>
  }, 1000);

})();
