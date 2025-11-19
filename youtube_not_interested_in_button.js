// ==UserScript==
// @name         DIYYouTubeNotInterestedButton-TM-Fallback
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  YouTube: add "興味なし" button (works better with @grant none on Tampermonkey Android)
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // -- utilities --
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function dispatchPointerSequence(el) {
    if (!el) return false;
    try {
      // pointer sequence
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true, composed:true }));
      el.dispatchEvent(new PointerEvent('pointerup',   { bubbles:true, cancelable:true, composed:true }));
      // mouse click after pointer
      el.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, composed:true }));
      // optionally try touch events if constructor available
      try {
        el.dispatchEvent(new TouchEvent('touchstart', { bubbles:true, cancelable:true }));
        el.dispatchEvent(new TouchEvent('touchend',   { bubbles:true, cancelable:true }));
      } catch(e) {}
      return true;
    } catch (e) {
      return false;
    }
  }

  // より多めにセレクタ候補を並べる
  function findMenuButton(thumbnail) {
    const candidates = [
      'yt-lockup-metadata-view-model:nth-child(1) > div:nth-child(3) > button-view-model:nth-child(1) > button:nth-child(1)',
      'ytd-menu-renderer yt-icon-button, ytd-menu-renderer yt-icon-button button',
      'button[aria-label*="メニュー"]',
      'button[aria-label*="もっと見る"]',
      'button[aria-label*="動画のオプション"]',
      'button#menu, button[aria-haspopup]'
    ];
    for (const sel of candidates) {
      try {
        const el = thumbnail.querySelector(sel);
        if (el) return el;
      } catch(e) {}
    }
    // 全部だめなら thumbnail 内の最初の button を返す（保険）
    return thumbnail.querySelector('button');
  }

  // メニュー内の "興味なし" を探してクリックする
  async function clickNotInterested() {
    // やや余裕をもって待つ
    await wait(400);
    // popup の候補要素を列挙
    const candidates = document.querySelectorAll(
      'ytd-popup-container yt-list-item-renderer, ytd-popup-container yt-list-item-view-model, ytd-menu-service-item-renderer, yt-formatted-string, yt-formatted-string[role="menuitem"]'
    );
    for (const el of candidates) {
      const txt = (el.textContent || '').trim();
      if (!txt) continue;
      if (txt.includes('興味なし') || txt.includes('Not interested') || txt.includes('Not interested')) {
        try {
          dispatchPointerSequence(el);
          // 再度余裕を持って待つ
          await wait(120);
        } catch(e) {}
        break;
      }
    }
  }

  // ボタンを生成してサムネイルに差す
  let idCounter = 0;
  function addButtons() {
    const thumbs = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-compact-video-renderer');
    thumbs.forEach(th => {
      if (th.querySelector('.not-interested-button')) return;
      if (!(th.offsetWidth > 0 && th.offsetHeight > 0)) return;

      const btn = document.createElement('button');
      btn.className = 'not-interested-button';
      btn.type = 'button';
      btn.title = '興味なし';
      btn.style.position = 'absolute';
      btn.style.bottom = '6px';
      btn.style.right = '8px';
      btn.style.zIndex = '10000';
      btn.style.width = '32px';
      btn.style.height = '32px';
      btn.style.border = 'none';
      btn.style.borderRadius = '4px';
      btn.style.background = 'rgba(0,0,0,0.35)';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.cursor = 'pointer';
      btn.style.padding = '0';

      // simple svg
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '18');
      svg.setAttribute('height', '18');
      svg.style.pointerEvents = 'none';
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', 'M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zM3 12c0 2.31.87 4.41 2.29 6L18 5.29C16.41 3.87 14.31 3 12 3c-4.97 0-9 4.03-9 9zm15.71-6L6 18.71C7.59 20.13 9.69 21 12 21c4.97 0 9-4.03 9-9 0-2.31-.87-4.41-2.29-6z');
      svg.appendChild(path);
      btn.appendChild(svg);

      // make thumbnail findable (debugに便利)
      const unique = 'diythumb-' + Date.now().toString(36) + '-' + (idCounter++);
      th.setAttribute('data-diy-thumb-id', unique);
      th.style.position = th.style.position || 'relative';

      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        ev.preventDefault();

        const menuButton = findMenuButton(th);
        if (!menuButton) {
          console.log('[DIY] menuButton not found for', th);
          return;
        }

        // デバッグ用: クリック前後で document 上の click イベントで isTrusted を確認しておく
        // 開発時のみ有効化可: document.addEventListener('click', e => console.log('click event isTrusted:', e.isTrusted, e.target));

        // まず合成イベントで試す
        const ok = dispatchPointerSequence(menuButton);
        // 少し待ってからメニュー内の興味なしをクリック
        await clickNotInterested();

        // もしメニューが開いてなければ、もう一度遅延して試行する（2回目）
        await wait(300);
        await clickNotInterested();
      }, { passive: false });

      th.appendChild(btn);
    });
  }

  const mo = new MutationObserver(addButtons);
  mo.observe(document.body, { childList: true, subtree: true });
  addButtons();

  // デバッグ用ヘルパ（必要ならコンソールで有効化）
  // window.DIY_debugClickLog = () => document.addEventListener('click', e => console.log('[DIY] click isTrusted=', e.isTrusted, e.target));
})();
