// ==UserScript==
// @name         YouTube Remove Low-View Videos
// @match        https://*.youtube.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// @version      0.1
// ==/UserScript==
(function () {
    'use strict';
    console.log("YouTube Remove Low-View Videos Init")

    var TILE_SELECTOR = 'yt-lockup-view-model';
    var LIVE_SELECTOR = 'yt-thumbnail-view-model yt-thumbnail-overlay-badge-view-model badge-shape.yt-badge-shape--thumbnail-live';
    var MEMBER_ONLY_SELECTOR = 'div.yt-lockup-view-model__metadata yt-content-metadata-view-model div.yt-content-metadata-view-model__metadata-row';
    var N_VIEWERS_SELECTOR = 'div.yt-lockup-view-model__metadata yt-content-metadata-view-model div.yt-content-metadata-view-model__metadata-row:nth-child(2) span';
    const PROCESSED_ATTR = 'data-yt-low-view-processed';
    const isNumericDotOnly = (str) => /^[0-9.]+$/.test(str);

    function removeLowViewVideos(tile, idx) {
        if (tile.hasAttribute(PROCESSED_ATTR)) {
            return;
        }
        tile.setAttribute(PROCESSED_ATTR, '1');

        // live は処理しない
        const live_badge = tile.querySelector(LIVE_SELECTOR);
        if (live_badge) {
            console.log("Skipped processing with live stream:", tile.textContent)
            return ;
        }

        // まずメン限を消す
        const rowElems = tile.querySelectorAll(MEMBER_ONLY_SELECTOR);
        if (rowElems.length >= 3 && rowElems[2].children.length >= 2) {
            // メン限など、YouTubeからの余計なおすすめが入ってきてる要素なので消す
            tile.style.display = "none";
            console.info("Removed Recommended Video By YouTube:", tile.textContent)
            return;
        }

        // 視聴者数が少ない動画を消す
        const nViewersElem = tile.querySelector(N_VIEWERS_SELECTOR);
        if (!nViewersElem) return ;
        const nViewers = nViewersElem.textContent.split(" ")[0];

        // 万とかK, M などの単位が入っている場合は十分視聴数があるので何もしない
        if (!isNumericDotOnly(nViewers)) return;

        if (parseInt(nViewers) < 2000) {
            tile.style.display = "none"
            console.log("Removed Video with Low-view (under 2000):", tile.textContent)
        }
    }

    function scanTiles() {
        const elems = document.querySelectorAll(TILE_SELECTOR)
        elems.forEach((tile, idx) => removeLowViewVideos(tile, idx));
    }
    new MutationObserver(scanTiles).observe(document.body, { childList: true, subtree: true });
})();
