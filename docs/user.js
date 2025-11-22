// ==UserScript==
// @name         YouTube Desktop/Mobile 両対応 test
// @match        https://*.youtube.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// @version      0.52
// ==/UserScript==

GM_addStyle(`
  div.yt-lockup-metadata-view-model__menu-button button.yt-spec-button-shape-next {
    width: 60px !important;
    height: 44px !important;
  }
  ytm-menu-renderer ytm-menu button c3-icon {
    width: 50px !important;
    height: 50px !important;
  }
  .additional-btn {
    position: absolute;
    font-size: 28px;
    padding: 2px;
    margin-right: 4px;
    border: none;
    background: transparent;
    height: 46px;
    width: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .additional-btn span {
    background: rgba(0,0,0,0.6);
    padding: 0px;
    height: 38px;
    width: 38px;
    border-radius: 4px;
    color: white;
  }

  .read-btn {
    right: 0px;
    bottom: 0px;
  //  top: 40px;
    z-index: 2000;
  }

  .not-interested-in-btn {
    right: 50px;
    bottom: 0px;
//    top: 70px;
    z-index: 2000;
  }

`);

(function () {
    'use strict';

    var TILE_SELECTOR = 'ytd-rich-item-renderer';
    var MENU_BUTTON_SELECTOR = 'button[aria-label="その他の操作"]';
    var MENU_SELECTOR = 'ytd-popup-container tp-yt-iron-dropdown';
    var svgPathData = "M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 018.246 12.605L4.755 6.661A8.99 8.99 0 0112 3ZM3.754 8.393l15.491 8.944A9 9 0 013.754 8.393Z";
    var SVG_SELECTOR = `path[d="${svgPathData}"]`



    const PROCESSED_ATTR = 'data-yt-menu-opener-added';

    function showOverlay(msg, duration = 3000) {
        let el = document.createElement("div");
        el.textContent = msg;
        Object.assign(el.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            padding: "10px 16px",
            background: "rgba(255,255,255,0.5)",
            color: "black",
            fontSize: "24px",
            zIndex: "99999",
            textAlign: "center"
        });
        document.body.appendChild(el);

        setTimeout(() => el.remove(), duration);
    }

    // 要素が表示されるまで待つ
    function waitForElement(selector, rootElem = null, intervalMs = 100, timeoutMs = 2000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();

            const timer = setInterval(() => {
                const elem = (rootElem || document).querySelector(selector);
                if (elem && elem.style.display != "none") {
                    clearInterval(timer);
                    resolve(elem);
                    return;
                }

                if (Date.now() - start > timeoutMs) {
                    clearInterval(timer);
                    reject(new Error("タイムアウト: 要素が見つかりませんでした:" + selector));
                }
            }, intervalMs);
        });
    }
    // タップっぽい動作を発行する
    function dispatchTapLike(target, delay_ms = 0) {
        if (!target) return false;
        try {target.focus({preventScroll:true}); } catch(e){}


        /*
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
        */

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
            console.debug('dispatched touchstart/touchend');
        } catch(e) {
            console.warn('TouchEvent creation failed or not allowed', e);
        }

        // 4) 最終フォールバックとして DOM click()
        try {
            target.click();
            console.debug('called element.click()');
        } catch(e) {
            console.warn('element.click() threw', e);
            return false;
        }
        return true;
    }

    // === ここまで追加部分 ====================================================

    function attachButton(tile, idx) {
        const tileRect = tile.getBoundingClientRect();
        // console.log(tile, tileRect.bottom);

        // const durationBadge = tile.querySelector("yt-thumbnail-overlay-badge-view-model");

        // const minTopPos = durationBadge.offsetTop


        // const rect = durationBadge.getBoundingClientRect();
        // const minTopPos = rect.top;

//         function getTopRelativeToParent(el) {
//             if (!el) return 130; // 描画前だと取れないことがある
//             const parent = el.parentElement
//             const elRect = el.getBoundingClientRect();
//             const parentRect = parent.getBoundingClientRect();

//             // 親のスクロール分を加算（scrollable container 対応）
//             return (elRect.top - parentRect.top) + parent.scrollTop;
//         }

//         const minTopPos = getTopRelativeToParent(durationBadge)

        if (!tile) {
            console.debug("tile is null:", tile)
            return;
        }
        if (tile.hasAttribute(PROCESSED_ATTR)) {
            // console.debug("button already attached")
            return;
        }
        tile.setAttribute(PROCESSED_ATTR, '1');

        // 既読ボタンを生成
        const readBtn = document.createElement('button');
        readBtn.className = 'additional-btn read-btn';
        // readBtn.style.top = minTopPos - 60 * 2 + 4 + "px"
        // readBtn.style.bottom = "0px"
        // readBtn.style.right = "0px"


        // チェックマーク用の span を作成
        const checkSpan = document.createElement('span');
        checkSpan.textContent = '✔️';
        readBtn.appendChild(checkSpan);

        tile.style.position = 'relative';
        tile.appendChild(readBtn);

        // つぎ not interested in button を設置
        const notInterestedBtn = document.createElement('button');
        notInterestedBtn.className = 'additional-btn not-interested-in-btn';
        // notInterestedBtn.style.top = (minTopPos - 60) + "px"
        // notInterestedBtn.style.bottom = "0px"
        // notInterestedBtn.style.right = "40px"

        // チェックマーク用の span を作成
        const zzzSpan = document.createElement('span');
        zzzSpan.textContent = '💤';
        notInterestedBtn.appendChild(zzzSpan);
        tile.appendChild(notInterestedBtn);

        console.debug("appended btns to tile")

        // 興味なしボタンの動作
        function onNotInterestedInButtonClick(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            const menuBtn = tile.querySelector(MENU_BUTTON_SELECTOR);
            if (!menuBtn) {
                console.warn('menu button not found');
                return;
            }

            // menu ボタンを押してメニューを表示させる
            dispatchTapLike(menuBtn)

            // まずメニューが出てきたかをチェック
            waitForElement(MENU_SELECTOR).then(dropdown_el => {
                console.debug("dropdown_el:", dropdown_el)
                // 次にメニュー内にクリック対象が出てきたかをチェック
                waitForElement(SVG_SELECTOR, dropdown_el).then(svg_el => {
                    console.debug("svg_el:", svg_el)
                    const result = dispatchTapLike(svg_el.parentElement.parentElement)
                    if (result) {
                        showOverlay('Sent "Not Interested In"');
                    }
                });
            });
        };

        // 既読ボタンの動作
        function onReadButtonClick(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            const menuBtn = tile.querySelector(MENU_BUTTON_SELECTOR);
            if (!menuBtn) {
                console.warn('menu button not found');
                return;
            }

            // menu ボタンを押してメニューを表示させる
            dispatchTapLike(menuBtn);

            (async () => {
                try {
                    // メニューが出てくるのを待つ
                    const dropdown_el = await waitForElement(MENU_SELECTOR);
                    console.debug("dropdown_el:", dropdown_el);

                    // メニュー内にクリック対象が出てくるのを待つ
                    console.debug("興味なし の項目が出るのを待つ");
                    const svg_el = await waitForElement(SVG_SELECTOR, dropdown_el);
                    console.debug("興味なし 項目が見つかった:", svg_el);

                    console.debug("興味なし をタップする");
                    dispatchTapLike(svg_el.parentElement.parentElement);

                    // 「理由を教えて下さい」ボタンを待つ
                    console.debug("理由を教えて下さいボタンが出てくるのを待つ");
                    const TELL_ME_REASON_BUTTON = "div.ytNotificationMultiActionRendererButtonContainer div:nth-child(2) button-view-model button";
                    const send_reason_button = await waitForElement(TELL_ME_REASON_BUTTON, tile);
                    console.debug("理由を教えて下さいボタンが見つかった:", TELL_ME_REASON_BUTTON);
                    dispatchTapLike(send_reason_button);

                    // 「見たことがある」チェックボックスを待つ
                    console.debug("見たことがある のチェックボックスが出るのを待つ");
                    const checkbox_el = await waitForElement(
                        "tp-yt-paper-dialog ytd-dismissal-follow-up-renderer div#content div#reasons ytd-dismissal-reason-text-renderer:nth-child(1) tp-yt-paper-checkbox:nth-child(1)"
                    );
                    console.debug("checkbox をクリックする:", checkbox_el);
                    dispatchTapLike(checkbox_el);

                    // 送信ボタンを押す
                    console.debug("送信ボタンを押す");
                    const submit_button = await waitForElement(
                        "tp-yt-paper-dialog ytd-dismissal-follow-up-renderer div#buttons ytd-button-renderer#submit"
                    );
                    const result = dispatchTapLike(submit_button);
                    showOverlay(result ? 'Sent "Already Watched"' : 'Failed to send "Already Watched"');

                } catch (err) {
                    console.error("処理中にエラーが発生:", err);
                }
            })();
        }

        // アクションをくっつける
        readBtn.addEventListener('click', function(ev) {           // ★ 変更（onActivate呼び出し）
            onReadButtonClick(ev);
        });
        notInterestedBtn.addEventListener('click', function(ev) {           // ★ 変更（onActivate呼び出し）
            onNotInterestedInButtonClick(ev);
        });
    }

    function scanTiles() {
        document.querySelectorAll(TILE_SELECTOR).forEach((tile, idx) => attachButton(tile, idx));
    }
    new MutationObserver(scanTiles).observe(document.body, { childList: true, subtree: true });

})();
