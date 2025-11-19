// ==UserScript==
// @name         DIYYouTubeNotInterestedButton
// @namespace    http://tampermonkey.net/
// @version      0.3
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  // --- the code we wanted to run in page context (string form) ---
  const pageCode = `(() => {
    if (window.__DIY_notInterestedInjected) return;
    window.__DIY_notInterestedInjected = true;

    function synthesizeOpen(el) {
      if (!el) return false;
      try {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true, composed:true }));
        el.dispatchEvent(new PointerEvent('pointerup',   { bubbles:true, cancelable:true, composed:true }));
        el.dispatchEvent(new MouseEvent('click',         { bubbles:true, cancelable:true, composed:true }));
        try {
          el.dispatchEvent(new TouchEvent('touchstart', { bubbles:true, cancelable:true }));
          el.dispatchEvent(new TouchEvent('touchend',   { bubbles:true, cancelable:true }));
        } catch(e) {}
        return true;
      } catch(e) {
        return false;
      }
    }

    window.addEventListener('message', async (ev) => {
      const m = ev.data || {};
      if (m && m.type === 'DIY_NOT_INTERESTED_ACTION' && m.thumbId) {
        const thumb = document.querySelector('[data-diy-thumb-id=\"' + m.thumbId + '\"]');
        if (!thumb) return;
        const menuButton = thumb.querySelector('yt-lockup-metadata-view-model:nth-child(1) > div:nth-child(3) > button-view-model:nth-child(1) > button:nth-child(1)') ||
                           thumb.querySelector('ytd-menu-renderer yt-icon-button, ytd-menu-renderer yt-icon-button button') ||
                           thumb.querySelector('button[aria-label*=\"メニュー\"], button[aria-label*=\"もっと見る\"]');
        if (!menuButton) return;
        synthesizeOpen(menuButton);
        await new Promise(r => setTimeout(r, 300));
        const candidates = document.querySelectorAll('ytd-popup-container yt-list-item-renderer, ytd-popup-container yt-list-item-view-model, ytd-menu-service-item-renderer, yt-formatted-string');
        for (const el of candidates) {
          const text = (el.textContent || '').trim();
          if (!text) continue;
          if (text.includes('興味なし') || text.includes('Not interested')) {
            try {
              el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true, composed:true }));
              el.dispatchEvent(new PointerEvent('pointerup',   { bubbles:true, cancelable:true, composed:true }));
              el.click();
            } catch(e) { try { el.click(); } catch(_) {} }
            break;
          }
        }
      }
    }, false);
  })();`;

  // --- try blob injection first (avoids textContent CSP) ---
  function tryInjectWithBlob(codeStr) {
    try {
      const blob = new Blob([codeStr], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => { URL.revokeObjectURL(url); s.remove(); };
      s.onerror = () => { URL.revokeObjectURL(url); s.remove(); throw new Error('blob script error'); };
      document.documentElement.appendChild(s);
      return true;
    } catch (e) {
      console.warn('blob injection failed:', e);
      return false;
    }
  }

  const injected = tryInjectWithBlob(pageCode);

  // --- fallback: do the job from userscript context (no injection) ---
  function synthesizeOpenLocal(el) {
    if (!el) return false;
    try {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true, composed:true }));
      el.dispatchEvent(new PointerEvent('pointerup',   { bubbles:true, cancelable:true, composed:true }));
      el.dispatchEvent(new MouseEvent('click',         { bubbles:true, cancelable:true, composed:true }));
      try {
        el.dispatchEvent(new TouchEvent('touchstart', { bubbles:true, cancelable:true }));
        el.dispatchEvent(new TouchEvent('touchend',   { bubbles:true, cancelable:true }));
      } catch(e){}
      return true;
    } catch(e){
      return false;
    }
  }

  let idCounter = 0;
  function addNotInterestedButton() {
    const videoThumbnails = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-compact-video-renderer');
    videoThumbnails.forEach(thumbnail => {
      if (thumbnail.querySelector('.not-interested-button')) return;
      if (!(thumbnail.offsetWidth > 0 && thumbnail.offsetHeight > 0)) return;

      const button = document.createElement('button');
      button.className = 'not-interested-button';
      button.style.position = 'absolute';
      button.style.bottom = '6px';
      button.style.right = '8px';
      button.style.zIndex = '10000';
      button.style.background = 'rgba(0,0,0,0.35)';
      button.style.width = '32px';
      button.style.height = '32px';
      // icon
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("height", "18");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", "18");
      svg.style.pointerEvents = 'none';
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", "M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zM3 12c0 2.31.87 4.41 2.29 6L18 5.29C16.41 3.87 14.31 3 12 3c-4.97 0-9 4.03-9 9zm15.71-6L6 18.71C7.59 20.13 9.69 21 12 21c4.97 0 9-4.03 9-9 0-2.31-.87-4.41-2.29-6z");
      svg.appendChild(path);
      button.appendChild(svg);

      const uniqueId = 'diythumb-' + Date.now().toString(36) + '-' + (idCounter++);
      thumbnail.setAttribute('data-diy-thumb-id', uniqueId);
      thumbnail.style.position = thumbnail.style.position || 'relative';

      button.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();

        // If injection succeeded, communicate via postMessage to page script
        if (injected) {
          window.postMessage({ type: 'DIY_NOT_INTERESTED_ACTION', thumbId: uniqueId }, '*');
          return;
        }

        // Fallback: try to locate menu button in userscript context and synthesize events locally
        const menuButton = thumbnail.querySelector('yt-lockup-metadata-view-model:nth-child(1) > div:nth-child(3) > button-view-model:nth-child(1) > button:nth-child(1)') ||
                           thumbnail.querySelector('ytd-menu-renderer yt-icon-button, ytd-menu-renderer yt-icon-button button') ||
                           thumbnail.querySelector('button[aria-label*=\"メニュー\"], button[aria-label*=\"もっと見る\"]');
        if (!menuButton) return;
        const ok = synthesizeOpenLocal(menuButton);
        setTimeout(() => {
          const candidates = document.querySelectorAll('ytd-popup-container yt-list-item-renderer, ytd-popup-container yt-list-item-view-model, ytd-menu-service-item-renderer, yt-formatted-string');
          for (const el of candidates) {
            const text = (el.textContent || '').trim();
            if (!text) continue;
            if (text.includes('興味なし') || text.includes('Not interested')) {
              try {
                el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true, composed:true }));
                el.dispatchEvent(new PointerEvent('pointerup',   { bubbles:true, cancelable:true, composed:true }));
                el.click();
              } catch(e) { try{ el.click(); } catch(_){} }
              break;
            }
          }
        }, 400);
      }, { passive: false });

      thumbnail.appendChild(button);
    });
  }

  const observer = new MutationObserver(addNotInterestedButton);
  observer.observe(document.body, { childList: true, subtree: true });
  addNotInterestedButton();

})();
