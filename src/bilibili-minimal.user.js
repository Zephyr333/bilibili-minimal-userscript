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
  const LOGO_ENTRY = 'data-bili-minimal-logo-entry';
  const HOT_RE = /(?:bilibili|哔哩哔哩)?\s*热搜|热门搜索|大家都在搜|搜索发现/i;
  const UPDATE_RE = /(?:刚刚|分钟前|小时前|天前|昨天|前天).{0,12}更新|更新.{0,12}(?:刚刚|分钟前|小时前|天前|昨天|前天)|已更\d+|更新至/;
  const TOP_NAV_RE = /^(首页|新剧|番剧|直播|游戏中心|会员购|漫画|赛事|下载客户端|MSI)$/;
  const SEARCH_TAB_HIDE_RE = /^(番剧|影视|直播)(?:\d+|\+|99\+)?$/;

  if (redirectLivePage()) return;

  boot();

  function redirectLivePage() {
    if (location.hostname !== 'live.bilibili.com') return false;

    location.replace('https://www.bilibili.com/');
    return true;
  }

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

      [${LOGO_ENTRY}="true"] {
        display: flex !important;
        visibility: visible !important;
      }

      [${LOGO_ENTRY}="true"] .mini-header__title,
      [${LOGO_ENTRY}="true"] .left-entry__title span {
        display: none !important;
      }

      .trending,
      .search-trending,
      .search-hot,
      .hot-search,
      .bili-search-hot,
      .bili-search-trending,
      .trendings-single {
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
      html[data-bili-minimal-page="home"] .recommended-container,
      html[data-bili-minimal-page="home"] .palette-button-wrap,
      html[data-bili-minimal-page="home"] .feed-roll-btn,
      html[data-bili-minimal-page="home"] .storage-box {
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
      html[data-bili-minimal-page="search"] .recommend-list,
      html[data-bili-minimal-page="search"] .bili-footer,
      html[data-bili-minimal-page="search"] .login-tip,
      html[data-bili-minimal-page="search"] .lt-row,
      html[data-bili-minimal-page="search"] .palette-button-wrap,
      html[data-bili-minimal-page="search"] .storage-box,
      html[data-bili-minimal-page="search"] .fixed-sidenav-storage,
      html[data-bili-minimal-page="search"] .side-bar,
      html[data-bili-minimal-page="search"] .elevator {
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
    cleanLiveEntrypoints();
    cleanSearchInput();
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
        if (isHeaderLogoEntry(entry, child)) {
          keepHeaderLogoEntry(child);
          return;
        }

        hide(child);
      });
    });

    document.querySelectorAll('.bili-header__bar a, .mini-header a, header a').forEach((link) => {
      if (link.closest(`[${LOGO_ENTRY}="true"]`)) return;
      if (link.closest('.right-entry, .center-search-container, .nav-search')) return;
      if (isLogoLike(link)) return;

      const label = normalize(link.innerText || link.title || link.getAttribute('aria-label'));
      if (TOP_NAV_RE.test(label)) {
        hide(link.closest('li, .left-entry__title, .download-entry') || link);
      }
    });
  }

  function cleanLiveEntrypoints() {
    hideAll([
      '.bili-video-card__info--living',
      '.bili-video-card__info--living__text',
      '[class*="live-card"]',
      '[class*="liveCard"]',
      '[class*="live-entry"]',
      '[class*="liveEntry"]',
      '[class*="living"]',
    ]);

    document.querySelectorAll('a[href*="live.bilibili.com"]').forEach((anchor) => {
      const target = getLiveTarget(anchor);
      if (target) hide(target);
    });

    document.querySelectorAll('.search-tabs li, .vui_tabs--nav-item').forEach((tab) => {
      if (SEARCH_TAB_HIDE_RE.test(normalize(tab.innerText || tab.textContent))) hide(tab);
    });

    document.querySelectorAll('.bili-video-card, .video-list-item, .feed-card, .user-list, .bili-user-card').forEach((card) => {
      const text = normalize(card.innerText || card.textContent);
      const hasLiveLink = Boolean(card.querySelector('a[href*="live.bilibili.com"]'));
      if (hasLiveLink || /直播中/.test(text)) {
        const target = getLiveTarget(card);
        if (target) hide(target);
      }
    });
  }

  function cleanHotSearch() {
    hideAll([
      '.trending',
      '.trendings-single',
      '.search-trending',
      '.search-hot',
      '.hot-search',
      '.bili-search-hot',
      '.bili-search-trending',
    ]);

    document.querySelectorAll('.search-panel > *, .nav-search-panel > *').forEach((section) => {
      if (isSearchHistory(section)) return;

      const text = normalize(section.innerText || section.textContent);
      if (HOT_RE.test(text)) {
        hide(section);
        return;
      }

      if (!UPDATE_RE.test(text)) return;

      const updateItems = Array.from(section.querySelectorAll('.suggest-item, .search-suggest-item, .suggestions-item'))
        .filter((item) => UPDATE_RE.test(normalize(item.innerText || item.textContent)));

      if (updateItems.length > 0) {
        updateItems.forEach(hide);
      } else {
        hide(section);
      }
    });

    document.querySelectorAll('.center-search-container *, .nav-search *, .bili-header *').forEach((node) => {
      if (isSearchHistory(node)) return;

      const text = normalize(node.innerText || node.textContent);
      if (!text || (!HOT_RE.test(text) && !UPDATE_RE.test(text))) return;

      const target = node.closest('.trending, .search-trending, .search-hot, .hot-search, .bili-search-hot, .bili-search-trending') ||
        node.closest('.suggest-item, .search-suggest-item, .suggestions-item') ||
        node.closest('.search-panel, .nav-search-panel') ||
        node.querySelector('.trending, .search-trending, .search-hot, .hot-search, .bili-search-hot, .bili-search-trending');

      if (target && !target.matches('.search-panel, .nav-search-panel') && !isSearchHistory(target)) {
        hide(target);
      }
    });
  }

  function cleanSearchInput() {
    document.querySelectorAll('.nav-search-input').forEach((input) => {
      if (input.placeholder && input.placeholder !== '搜索') {
        input.placeholder = '搜索';
      }
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
      '.palette-button-wrap',
      '.feed-roll-btn',
      '.storage-box',
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
    cleanSearchTabs();

    hideAll([
      '.brand-ad-list',
      '.activity-game-list.search-all-list',
      '.ad-floor-exp',
      '.cm-module',
      '.search-ad',
      '.game-card',
      '.recommend-list',
      '.bili-footer',
      '.login-tip',
      '.lt-row',
      '.palette-button-wrap',
      '.storage-box',
      '.fixed-sidenav-storage',
      '.side-bar',
      '.elevator',
    ]);

    document.querySelectorAll('.search-page-wrapper *').forEach((node) => {
      const text = normalize(node.innerText || node.textContent);
      if (!/广告|推广|活动推广/.test(text)) return;

      const target = node.closest('.brand-ad-list, .activity-game-list, .ad-floor-exp, .cm-module, .search-ad') || node;
      hide(target);
    });

    hideSearchPageBelowPagination();
  }

  function cleanSearchTabs() {
    document.querySelectorAll('.search-tabs li, .vui_tabs--nav-item').forEach((tab) => {
      if (SEARCH_TAB_HIDE_RE.test(normalize(tab.innerText || tab.textContent))) hide(tab);
    });
  }

  function hideSearchPageBelowPagination() {
    const pagination = document.querySelector('.vui_pagenation, .vui_pagination, .pagination, .page-box, .page-navigator');
    if (!pagination) return;

    const bottom = pagination.getBoundingClientRect().bottom;
    Array.from(document.body.children).forEach((child) => {
      if (child.contains(pagination)) return;

      const rect = child.getBoundingClientRect();
      if (rect.top >= bottom) hide(child);
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

  function isSearchHistory(el) {
    return Boolean(el?.closest?.(
      '.history, .histories, .history-item, .history-wrap, .histories-wrap, .search-history, .bili-search-history'
    ));
  }

  function isHeaderLogoEntry(entry, child) {
    if (child !== entry.firstElementChild) return false;

    const link = child.querySelector('a[href]');
    if (!link) return false;

    const href = link.href || link.getAttribute('href') || '';
    return /\/\/www\.bilibili\.com\/?$|^https?:\/\/www\.bilibili\.com\/?$|^\/$/.test(href) &&
      Boolean(link.querySelector('svg, img') || /首页/.test(normalize(link.innerText || link.textContent)));
  }

  function keepHeaderLogoEntry(entry) {
    entry.removeAttribute(HIDDEN);
    entry.setAttribute(LOGO_ENTRY, 'true');

    const link = entry.querySelector('a[href]');
    if (link) {
      link.removeAttribute(HIDDEN);
      link.setAttribute(LOGO_ENTRY, 'true');
    }

    entry.querySelectorAll('*').forEach((node) => {
      if (node.matches('svg, svg *, img')) return;
      if (node.querySelector('svg, img')) return;

      const text = normalize(node.innerText || node.textContent);
      if (text === '首页') hide(node);
    });
  }

  function getLiveTarget(node) {
    if (!node || node.nodeType !== 1) return null;

    return node.closest(
      '.col_3, .col_xs_1_5, .col_md_2, .col_xl_1_7, .video-list-item, .bili-video-card, .feed-card, .search-card, .live-card, .live-card-wrap, ' +
      '.bili-dyn-list__item, .bili-dyn-card, .dyn-card, .user-list-item, .bili-user-card, ' +
      'li'
    ) || node.closest('a[href*="live.bilibili.com"], [class*="live"], [class*="living"]') || node;
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
