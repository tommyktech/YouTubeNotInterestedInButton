// ==UserScript==
// @name         YouTube: 各動画のメニューを開くボタンを追加
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const processedAttr = 'data-menu-opener-added';

  // 動画タイル候補セレクタ（必要に応じて追加）
  const tileSelectors = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-rich-grid-media',
    'ytd-rich-item-renderer ytd-rich-grid-media'
  ];

  // メニューボタンを見つけるための候補セレクタ（言語差・構造差に対応）
  const menuButtonSelectors = [
    'ytd-menu-renderer yt-icon-button',
    'ytd-menu-renderer button',
    'button[aria-label*="メニュー"]',
    'button[aria-label*="その他の操作"]',
    'button[aria-label*="Action menu"]',
    'button[aria-label*="More actions"]',
    'yt-icon-button[aria-label]',
    'tp-yt-paper-icon-button[aria-label]'
  ];

  // スタイルをページに注入
  const style = document.createElement('style');
  style.textContent = `
  .yt-menu-open-btn {
    position: absolute;
    right: 6px;
    top: 6px;
    z-index: 99999999;
    padding: 4px 6px;
    font-size: 12px;
    border-radius: 4px;
    border: 1px solid rgba(0,0,0,0.2);
    background: rgba(255,255,255,0.92);
    color: #000;
    cursor: pointer;
    opacity: 0.9;
  }
  .yt-menu-open-wrapper { position: relative; }
  `;
  document.head.appendChild(style);

  function findMenuButtonWithin(tile) {
    for (const sel of menuButtonSelectors) {
      const btn = tile.querySelector(sel);
      if (btn) return btn;
    }
    // 見つからなければ親領域を探索（動画タイルの DOM はネストが深い）
    for (const sel of menuButtonSelectors) {
      const btn = document.querySelector(sel);
      if (btn && tile.contains(btn)) return btn;
    }
    return null;
  }

  function addButtonToTile(tile) {
    if (!tile || tile.hasAttribute(processedAttr)) return;
    tile.setAttribute(processedAttr, '1');

    // wrapper を作って absolute ボタン配置がしやすくする（既に relative なら変更しない）
    const wrapper = tile;
    const computed = window.getComputedStyle(wrapper);
    if (computed.position === 'static') {
      wrapper.classList.add('yt-menu-open-wrapper');
    }

    const btn = document.createElement('button');
    btn.className = 'yt-menu-open-btn';
    btn.type = 'button';
    btn.innerText = '開く';
    // クリックで該当タイルのメニューを開く
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const menuBtn = findMenuButtonWithin(tile);
      if (!menuBtn) {
        console.warn('メニューボタンを検出できませんでした', tile);
        // 試しに tile 内の全ボタンを列挙してログ出力（デバッグ用）
        // console.log(Array.from(tile.querySelectorAll('button, tp-yt-paper-icon-button, yt-icon-button')).map(x => x.getAttribute('aria-label') || x.innerText));
        return;
      }
      // クリックを2回トライ（タップが効かない環境があるため）
      try {
        menuBtn.click();
      } catch (err) {
        // fallback: dispatchMouseEvent
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        menuBtn.dispatchEvent(ev);
      }
    });

    // 挿入場所：thumbnail 付近に入れたいがレイアウト差があるため tile の先頭に入れる
    wrapper.appendChild(btn);
  }

  function scanAndAttach() {
    for (const sel of tileSelectors) {
      const nodes = Array.from(document.querySelectorAll(sel));
      for (const n of nodes) addButtonToTile(n);
    }
  }

  // 初回スキャン
  scanAndAttach();

  // 動的追加に対応するため MutationObserver を張る
  const obs = new MutationObserver(() => {
    scanAndAttach();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // 追加：画面が切り替わったとき（YouTube の SPA ナビ）に再スキャン
  window.addEventListener('yt-navigate-finish', () => setTimeout(scanAndAttach, 200));
})();
