// ==UserScript==
// @name         YouTube Desktop/Mobile 両対応 test
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

(function () {
    'use strict';

    var TILE_SELECTOR = 'ytd-rich-item-renderer';
    var MENU_BUTTON_SELECTOR = 'button[aria-label="その他の操作"]';
    var NOT_INTERESTED_BUTTON = 'yt-list-item-view-model.yt-list-item-view-model:nth-child(6)';


    const PROCESSED_ATTR = 'data-yt-menu-opener-added';

    function synthesizePointerTapAt(target, target_name) {
        if (!target) return;
        console.log("target_name:", target_name, "target:", target)

        target.style.backgroundColor = "red"
        const r = target.getBoundingClientRect();
        const cx = Math.round(r.left + r.width / 2);
        const cy = Math.round(r.top + r.height / 2);

        // ★ ここから改善：focus を与える
        try {
            target.focus({ preventScroll: true });
        } catch(e) {}

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

        // ★ pointerdown → pointerup → mouseup → click の順序
        target.dispatchEvent(new PointerEvent('pointerdown', opts));
        target.dispatchEvent(new PointerEvent('pointerup', opts));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
        console.log(target_name + ' synthetic tap dispatched (improved)');
    }

    function dispatchTapLike(target) {
        if (!target) return;
        try { target.focus({preventScroll:true}); } catch(e){}

        // 1) Polymer 等が直接リッスンしている可能性が高い 'tap' を先に投げる
        try {
            target.dispatchEvent(new CustomEvent('tap', { bubbles: true, cancelable: true, composed: true }));
            console.log('dispatched CustomEvent tap');
        } catch(e) { console.warn('tap custom event failed', e); }

        // 2) pointer / mouse の一連を投げる（pointerType:'touch' を含む）
        try {
            const r = target.getBoundingClientRect();
            const cx = Math.round(r.left + r.width/2);
            const cy = Math.round(r.top + r.height/2);
            const pOpts = {
                bubbles: true, cancelable: true, composed: true,
                clientX: cx, clientY: cy, screenX: cx, screenY: cy,
                pointerId: Date.now() & 0xFFFF, pointerType: 'touch', isPrimary: true, pressure: 0.5, buttons: 1
            };
            target.dispatchEvent(new PointerEvent('pointerdown', pOpts));
            target.dispatchEvent(new PointerEvent('pointerup', pOpts));
            target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, buttons: 1 }));
            target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, buttons: 1 }));
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, buttons: 1 }));
            console.log('dispatched pointer/mouse sequence');
        } catch(e) {
            console.warn('pointer/mouse sequence failed', e);
        }

        // 3) TouchEvent を作れる場合は touchstart/touchend も投げる（ブラウザによっては生成不可）
        try {
            const r = target.getBoundingClientRect();
            const cx = Math.round(r.left + r.width/2);
            const cy = Math.round(r.top + r.height/2);
            const touch = new Touch({ identifier: Date.now(), target: target, clientX: cx, clientY: cy, screenX: cx, screenY: cy, pageX: cx, pageY: cy });
            const teStart = new TouchEvent('touchstart', { bubbles: true, cancelable: true, composed: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] });
            const teEnd   = new TouchEvent('touchend',   { bubbles: true, cancelable: true, composed: true, touches: [], targetTouches: [], changedTouches: [touch] });
            target.dispatchEvent(teStart);
            target.dispatchEvent(teEnd);
            console.log('dispatched touchstart/touchend');
        } catch(e) {
            console.warn('TouchEvent creation failed or not allowed', e);
        }

        // 4) 最終フォールバックとして DOM click()
        try {
            target.click();
            console.log('called element.click()');
        } catch(e) {
            console.warn('element.click() threw', e);
        }
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
        tile.appendChild(btn);
        console.log("appended btn to tile")

        // === ここからリスナーを変更 ============================================
        function onActivate(ev) {

            ev.preventDefault();
            ev.stopPropagation();

            const menuBtn = tile.querySelector(MENU_BUTTON_SELECTOR);
            if (!menuBtn) {
                console.log('menu button not found');
                return;
            }

            // 合成 pointer + click をメニューに送る
            //synthesizePointerTapAt(menuBtn, "menu");
            dispatchTapLike(menuBtn)
        }

        // 念のため click もフォールバックとして残す（PC 用）
        btn.addEventListener('click', function(ev) {           // ★ 変更（onActivate呼び出し）
            onActivate(ev);
        });
    }

    function scanTiles() {
        document.querySelectorAll(TILE_SELECTOR).forEach((tile, idx) => attachButton(tile, idx));
    }
    new MutationObserver(scanTiles).observe(document.body, { childList: true, subtree: true });

})();
