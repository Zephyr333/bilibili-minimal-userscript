// ==UserScript==
// @name         B站极简：保留搜索与当前内容
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  保留 logo、搜索框、右上角控件；隐藏热搜、首页推荐、视频页相关推荐和自动连播。
// @author       You
// @match        *://bilibili.com/*
// @match        *://*.bilibili.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const HIDDEN = 'data-bili-minimal-hidden';
  const HOT_RE = /(?:bilibili|哔哩哔哩)?\s*热搜|热门搜索|大家都在搜|搜索发现/i;
  const TOP_NAV_RE = /^(首页|新剧|番剧|直播|游戏中心|会员购|漫画|赛事|下载客户端|MSI)$/;

  boot();

  function boot() {
    if (!document.documentElement) {
      setTimeout(boot, 0);
      return;
    }

    setAutoPlayOff();
    installStyle();
    patchHistory();
    start();
  }

  function installStyle() {
    const style = document.createElement('style');
    style.id = 'bili-minimal-style';
    style.textContent = `
      [${HIDDEN}="true"] {
        display: none !important;
      }

      .trending,
      .search-trending,
      .search-hot,
      .hot-search,
      .bili-search-hot,
      .bili-search-trending,
      .search-panel:has(.trending) {
        display: none !important;
      }

      html[data-bili-minimal-page="home"] main,
      html[data-bili-minimal-page="home"] .bili-header__channel,
      html[data-bili-minimal-page="home"] .header-channel,
      html[data-bili-minimal-page="home"] .channel-icons,
      html[data-bili-minimal-page="home"] .channel-items__left,
      html[data-bili-minimal-page="home"] .channel-items__right,
      html[data-bili-minimal-page="home"] .primary-channel-menu,
      html[data-bili-minimal-page="home"] .recommended-swipe,
      html[data-bili-minimal-page="home"] .feed-card,
      html[data-bili-minimal-page="home"] .bili-video-card,
      html[data-bili-minimal-page="home"] .recommended-container {
        display: none !important;
      }

      html[data-bili-minimal-page="video"] .recommend-list-v1,
      html[data-bili-minimal-page="video"] .rec-list,
      html[data-bili-minimal-page="video"] .next-play,
      html[data-bili-minimal-page="video"] .bpx-player-ending-panel,
      html[data-bili-minimal-page="video"] .slide-ad-exp,
      html[data-bili-minimal-page="video"] .video-card-ad-small,
      html[data-bili-minimal-page="video"] .ad-floor-exp,
      html[data-bili-minimal-page="video"] .video-page-special-card-small,
      html[data-bili-minimal-page="video"] .bpx-player-ctrl-setting-autoplay {
        display: none !important;
      }

      html[data-bili-minimal-page="search"] .brand-ad-list,
      html[data-bili-minimal-page="search"] .activity-game-list.search-all-list,
      html[data-bili-minimal-page="search"] .ad-floor-exp,
      html[data-bili-minimal-page="search"] .cm-module,
      html[data-bili-minimal-page="search"] .search-ad,
      html[data-bili-minimal-page="search"] .game-card,
      html[data-bili-minimal-page="search"] .recommend-list {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function start() {
    runClean();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runClean, { once: true });
    }

    window.addEventListener('load', runClean, { once: true });

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        runClean();
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    setInterval(runClean, 1500);
  }

  function runClean() {
    markPageType();
    setAutoPlayOff();
    cleanTopBar();
    cleanHotSearch();

    if (isHomePage()) cleanHomePage();
    if (isVideoPage()) cleanVideoPage();
    if (isSearchPage()) cleanSearchPage();
  }

  function markPageType() {
    let page = 'other';
    if (isHomePage()) page = 'home';
    if (isVideoPage()) page = 'video';
    if (isSearchPage()) page = 'search';
    document.documentElement.dataset.biliMinimalPage = page;
  }

  function isHomePage() {
    return location.hostname === 'www.bilibili.com' &&
      /^\/(?:index\.html)?$/.test(location.pathname);
  }

  function isVideoPage() {
    return location.hostname === 'www.bilibili.com' &&
      /^\/video\//.test(location.pathname);
  }

  function isSearchPage() {
    return location.hostname === 'search.bilibili.com';
  }

  function cleanTopBar() {
    document.querySelectorAll('.left-entry').forEach((entry) => {
      Array.from(entry.children).forEach((child) => {
        if (!isLogoLike(child)) hide(child);
      });
    });

    document.querySelectorAll('.bili-header__bar a, .mini-header a, header a').forEach((link) => {
      if (link.closest('.right-entry, .center-search-container, .nav-search')) return;
      if (isLogoLike(link)) return;

      const label = normalize(link.innerText || link.title || link.getAttribute('aria-label'));
      if (TOP_NAV_RE.test(label)) {
        hide(link.closest('li, .left-entry__title, .download-entry') || link);
      }
    });
  }

  function cleanHotSearch() {
    hideAll([
      '.trending',
      '.search-trending',
      '.search-hot',
      '.hot-search',
      '.bili-search-hot',
      '.bili-search-trending',
    ]);

    document.querySelectorAll('.search-panel, .nav-search-panel').forEach((panel) => {
      const text = normalize(panel.innerText || panel.textContent);
      if (HOT_RE.test(text)) hide(panel);
    });

    document.querySelectorAll('.center-search-container *, .nav-search *, .bili-header *').forEach((node) => {
      const text = normalize(node.innerText || node.textContent);
      if (!text || !HOT_RE.test(text)) return;

      const target = node.closest('.trending, .search-panel, .nav-search-panel') ||
        node.querySelector('.trending, .search-panel, .nav-search-panel');
      if (target) hide(target);
    });
  }

  function cleanHomePage() {
    hideAll([
      'main',
      '.bili-header__channel',
      '.header-channel',
      '.channel-icons',
      '.channel-items__left',
      '.channel-items__right',
      '.primary-channel-menu',
      '.recommended-swipe',
      '.feed-card',
      '.bili-video-card',
      '.recommended-container',
    ]);
  }

  function cleanVideoPage() {
    hideAll([
      '.recommend-list-v1',
      '.rec-list',
      '.next-play',
      '.bpx-player-ending-panel',
      '.slide-ad-exp',
      '.video-card-ad-small',
      '.ad-floor-exp',
      '.video-page-special-card-small',
      '.bpx-player-ctrl-setting-autoplay',
    ]);

    document.querySelectorAll('.right-container, .bpx-player-container').forEach((scope) => {
      scope.querySelectorAll('*').forEach((node) => {
        if (node.closest('.video-pod')) return;

        const text = normalize(node.innerText || node.textContent);
        if (!/接下来播放|自动连播|相关推荐|猜你喜欢/.test(text)) return;

        const target = node.closest(
          '.recommend-list-v1, .rec-list, .next-play, .bpx-player-ending-panel, .video-page-card, .rcmd-list'
        );

        if (target && !target.closest('.video-pod')) hide(target);
      });
    });
  }

  function cleanSearchPage() {
    hideAll([
      '.brand-ad-list',
      '.activity-game-list.search-all-list',
      '.ad-floor-exp',
      '.cm-module',
      '.search-ad',
      '.game-card',
      '.recommend-list',
    ]);

    document.querySelectorAll('.search-page-wrapper *').forEach((node) => {
      const text = normalize(node.innerText || node.textContent);
      if (!/广告|推广|活动推广/.test(text)) return;

      const target = node.closest('.brand-ad-list, .activity-game-list, .ad-floor-exp, .cm-module, .search-ad') || node;
      hide(target);
    });
  }

  function setAutoPlayOff() {
    try {
      localStorage.setItem('recommend_auto_play', 'close');
    } catch (_) {}
  }

  function patchHistory() {
    ['pushState', 'replaceState'].forEach((name) => {
      const original = history[name];
      history[name] = function (...args) {
        const result = original.apply(this, args);
        setTimeout(runClean, 80);
        return result;
      };
    });

    window.addEventListener('popstate', () => setTimeout(runClean, 80));
  }

  function hideAll(selectors) {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach(hide);
    });
  }

  function hide(el) {
    if (!el || el.nodeType !== 1) return;
    el.setAttribute(HIDDEN, 'true');
  }

  function normalize(text) {
    return String(text || '').replace(/\s+/g, '').trim();
  }

  function isLogoLike(el) {
    const text = normalize(el.innerText || el.textContent);
    const attrs = Array.from(el.querySelectorAll('img, svg, a'))
      .map((node) => [
        node.alt,
        node.title,
        node.getAttribute('aria-label'),
        node.getAttribute('href'),
      ].filter(Boolean).join(' '))
      .join(' ');

    return /bilibili|B站|b站/i.test(`${text} ${attrs}`) && !TOP_NAV_RE.test(text);
  }
})();
