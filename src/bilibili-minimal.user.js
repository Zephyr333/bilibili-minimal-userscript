// ==UserScript==
// @name         B站极简：保留搜索与当前内容
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  保留首页入口、搜索框、头像/私信/收藏/历史；隐藏热搜、首页推荐、直播入口、相关推荐和活动推广。
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
  const HOME_ENTRY = 'data-bili-minimal-home-entry';
  const HOT_RE = /(?:bilibili|哔哩哔哩)?\s*热搜|热门搜索|大家都在搜|搜索发现/i;
  const UPDATE_RE = /(?:刚刚|分钟前|小时前|天前|昨天|前天).{0,12}更新|更新.{0,12}(?:刚刚|分钟前|小时前|天前|昨天|前天)|已更\d+|更新至/;
  const TOP_NAV_RE = /^(首页|新剧|番剧|直播|游戏中心|会员购|漫画|赛事|下载客户端|MSI)$/;
  const SEARCH_TAB_HIDE_RE = /^(番剧|影视|直播)(?:\d+|\+|99\+)?$/;
  const RIGHT_ENTRY_KEEP_RE = /^(登录|头像|消息|私信|收藏|历史)$/;
  const VIDEO_PROMO_RE = /B站辩论季|投稿赢流量|老友赛|活动推广|广告|推广|征稿|创作激励|话题活动|上B站聊观点/i;

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

      [${HOME_ENTRY}="true"] {
        display: flex !important;
        visibility: visible !important;
      }

      [${HOME_ENTRY}="true"] svg,
      [${HOME_ENTRY}="true"] img {
        display: none !important;
      }

      [${HOME_ENTRY}="true"] .mini-header__title,
      [${HOME_ENTRY}="true"] .left-entry__title span {
        display: flex !important;
        visibility: visible !important;
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
      html[data-bili-minimal-page="video"] .video-page-game-card-small,
      html[data-bili-minimal-page="video"] .ad-report,
      html[data-bili-minimal-page="video"] .ad-card,
      html[data-bili-minimal-page="video"] .ad-wrap,
      html[data-bili-minimal-page="video"] .activity-m-v1,
      html[data-bili-minimal-page="video"] .activity-card,
      html[data-bili-minimal-page="video"] .activity-banner,
      html[data-bili-minimal-page="video"] .video-activity,
      html[data-bili-minimal-page="video"] .promo-card,
      html[data-bili-minimal-page="video"] .operation-card,
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

      .v-popover-wrap.favorite-entry:hover > .v-popover,
      .v-popover-wrap.history-entry:hover > .v-popover,
      .favorite-entry:hover > .v-popover,
      .history-entry:hover > .v-popover,
      .v-popover-wrap.header-avatar-wrap:hover > .v-popover,
      .header-avatar-wrap:hover > .v-popover,
      .v-popover-wrap.message-entry:hover > .v-popover,
      .message-entry:hover > .v-popover {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      .favorite-entry .v-popover,
      .history-entry .v-popover,
      .header-avatar-wrap .v-popover,
      .message-entry .v-popover {
        pointer-events: auto !important;
      }

      .favorite-entry .v-popover *,
      .history-entry .v-popover * {
        pointer-events: auto !important;
      }

      .favorite-entry .bili-video-card,
      .history-entry .bili-video-card,
      .favorite-entry .feed-card,
      .history-entry .feed-card,
      .header-favorite-popover .bili-video-card,
      .header-history-popover .bili-video-card {
        display: block !important;
        visibility: visible !important;
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
    cleanRightBar();
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
    return /^(?:www\.|m\.)?bilibili\.com$/.test(location.hostname) &&
      /^\/video\//.test(location.pathname);
  }

  function isSearchPage() {
    return location.hostname === 'search.bilibili.com';
  }

  function cleanTopBar() {
    document.querySelectorAll('.left-entry').forEach((entry) => {
      Array.from(entry.children).forEach((child) => {
        if (isHeaderHomeEntry(entry, child)) {
          keepHeaderHomeEntry(child);
          return;
        }

        hide(child);
      });
    });

    document.querySelectorAll('.bili-header a, .bili-header__bar a, .mini-header a, header a').forEach((link) => {
      if (link.closest(`[${HOME_ENTRY}="true"]`)) return;
      if (link.closest('.right-entry, .center-search-container, .nav-search')) return;
      if (isLogoLike(link)) {
        hide(link.closest('li, .bili-logo, a') || link);
        return;
      }

      const label = normalize(link.innerText || link.title || link.getAttribute('aria-label'));
      if (TOP_NAV_RE.test(label)) {
        hide(link.closest('li, .left-entry__title, .download-entry') || link);
      }
    });
  }

  function cleanRightBar() {
    document.querySelectorAll('.right-entry').forEach((entry) => {
      const main = entry.querySelector('.right-entry__main');
      const items = main ? Array.from(main.children) : Array.from(entry.children);

      items.forEach((child, index) => {
        if (isKeptRightEntry(child, index)) {
          show(child);
          return;
        }

        hide(child);
      });

      if (main) {
        show(main);
        Array.from(entry.children).forEach((child) => {
          if (child !== main && !isKeptRightEntry(child, -1)) {
            hide(child);
          }
        });
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
      if (isProtectedPopoverContent(anchor)) return;
      const target = getLiveTarget(anchor);
      if (target) hide(target);
    });

    document.querySelectorAll('.search-tabs li, .vui_tabs--nav-item').forEach((tab) => {
      if (isProtectedPopoverContent(tab)) return;
      if (SEARCH_TAB_HIDE_RE.test(normalize(tab.innerText || tab.textContent))) hide(tab);
    });

    document.querySelectorAll('.bili-video-card, .video-list-item, .feed-card, .user-list, .bili-user-card').forEach((card) => {
      if (isProtectedPopoverContent(card)) return;
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
      if (isSearchHistory(section) || isProtectedPopoverContent(section)) return;

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
      if (isSearchHistory(node) || isProtectedPopoverContent(node) || node.closest('.right-entry')) return;

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
      '.video-page-game-card-small',
      '.ad-report',
      '.ad-card',
      '.ad-wrap',
      '.activity-m-v1',
      '.activity-card',
      '.activity-banner',
      '.video-activity',
      '.promo-card',
      '.operation-card',
      '.bpx-player-ctrl-setting-autoplay',
    ]);

    cleanVideoPromotions();

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

  function cleanVideoPromotions() {
    document.querySelectorAll([
      '.ad-report',
      '.ad-card',
      '.ad-wrap',
      '.ad-container',
      '.activity-m-v1',
      '.activity-card',
      '.activity-banner',
      '.video-activity',
      '.promo-card',
      '.operation-card',
      '.operate-card',
      '.banner-card',
      'a[href*="blackboard/activity"]',
      'a[href*="activity"]',
      'a[href*="cm.bilibili.com"]',
      '[class*="activity-card"]',
      '[class*="activity-banner"]',
      '[class*="ActivityCard"]',
      '[class*="ActivityBanner"]',
      '[class*="promo"]',
      '[class*="Promo"]',
      '[class*="operation"]',
      '[class*="Operation"]',
    ].join(',')).forEach((node) => {
      if (isProtectedVideoContent(node)) return;
      if (!VIDEO_PROMO_RE.test(getElementDescriptor(node))) return;

      const target = getVideoPromoTarget(node);
      if (target && !isProtectedVideoContent(target)) hide(target);
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
      document.querySelectorAll(selector).forEach((el) => {
        if (!isProtectedPopoverContent(el)) {
          hide(el);
        }
      });
    });
  }

  function hide(el) {
    if (!el || el.nodeType !== 1) return;
    if (isProtectedPopoverContent(el)) return;
    el.setAttribute(HIDDEN, 'true');
  }

  function show(el) {
    if (!el || el.nodeType !== 1) return;
    el.removeAttribute(HIDDEN);
  }

  function normalize(text) {
    return String(text || '').replace(/\s+/g, '').trim();
  }

  function isSearchHistory(el) {
    return Boolean(el?.closest?.(
      '.history, .histories, .history-item, .history-wrap, .histories-wrap, .search-history, .bili-search-history'
    ));
  }

  function isProtectedPopoverContent(node) {
    return Boolean(node?.closest?.(
      '.header-favorite-popover, .header-history-popover, .favorite-panel-popover, .history-panel-popover, ' +
      '[data-header-fav-entry="true"], .favorite-entry .v-popover, .history-entry .v-popover'
    ));
  }

  function isHeaderHomeEntry(entry, child) {
    if (child !== entry.firstElementChild) return false;

    const link = child.querySelector('a[href]');
    if (!link) return false;

    const href = link.href || link.getAttribute('href') || '';
    return /\/\/www\.bilibili\.com\/?$|^https?:\/\/www\.bilibili\.com\/?$|^\/$/.test(href) &&
      Boolean(link.querySelector('svg, img') || /首页/.test(normalize(link.innerText || link.textContent)));
  }

  function keepHeaderHomeEntry(entry) {
    show(entry);
    entry.setAttribute(HOME_ENTRY, 'true');

    const link = entry.querySelector('a[href]');
    if (link) {
      show(link);
      link.setAttribute(HOME_ENTRY, 'true');
    }

    entry.querySelectorAll('svg, img').forEach(hide);
    entry.querySelectorAll('.mini-header__title, .left-entry__title span').forEach(show);
  }

  function isKeptRightEntry(entry, index) {
    if (!entry) return false;
    const text = normalize(entry.innerText || entry.textContent);
    const descriptor = [
      text,
      entry.className,
      entry.getAttribute('data-idx'),
      Array.from(entry.querySelectorAll('[class], [data-idx], a[href], img')).map((node) => [
        node.className,
        node.getAttribute('data-idx'),
        node.getAttribute('href'),
        node.alt,
      ].filter(Boolean).join(' ')).join(' '),
    ].filter(Boolean).join(' ');

    if ((index === 0 || entry.classList.contains('header-avatar-wrap') || entry.classList.contains('avatar-entry')) &&
        /登录|头像|avatar|face|bili-avatar|header-avatar|go-login/i.test(descriptor)) {
      return true;
    }
    if (RIGHT_ENTRY_KEEP_RE.test(text)) return true;
    if (/^(消息|私信|收藏|历史)/.test(text)) return true;
    if (/(message|whisper|fav|favorite|history)/i.test(descriptor)) return true;
    return false;
  }

  function getLiveTarget(node) {
    if (!node || node.nodeType !== 1) return null;
    if (isProtectedPopoverContent(node) || node.closest('.right-entry')) return null;

    const target = node.closest(
      '.col_3, .col_xs_1_5, .col_md_2, .col_xl_1_7, .video-list-item, .bili-video-card, .feed-card, .search-card, .live-card, .live-card-wrap, ' +
      '.bili-dyn-list__item, .bili-dyn-card, .dyn-card, .user-list-item, .bili-user-card, ' +
      'li'
    ) || node.closest('a[href*="live.bilibili.com"], [class*="live"], [class*="living"]') || node;

    if (isProtectedPopoverContent(target) || target.closest('.right-entry')) return null;
    return target;
  }

  function getVideoPromoTarget(node) {
    if (!node || node.nodeType !== 1) return null;

    return node.closest(
      '.ad-report, .ad-card, .ad-wrap, .ad-container, .activity-m-v1, .activity-card, .activity-banner, .video-activity, ' +
      '.promo-card, .operation-card, .operate-card, .banner-card, [class*="activity-card"], [class*="activity-banner"], ' +
      '[class*="ActivityCard"], [class*="ActivityBanner"], [class*="promo"], [class*="Promo"], [class*="operation"], [class*="Operation"]'
    ) || node.closest('a, section, aside, li, div') || node;
  }

  function isProtectedVideoContent(node) {
    return Boolean(node?.closest?.(
      '.bili-header, .bili-header__bar, .mini-header, header, .center-search-container, .right-entry, .nav-search, ' +
      '.bpx-player-container, .video-container, .player-wrap, .up-panel-container, .video-pod, ' +
      '.video-desc, .basic-desc-info, .desc-info, .ordinary-tag, .tag-panel, .video-tag-container, ' +
      '.comment, .comment-container, .bili-comment, .bb-comment, .comment-list, .reply, #comment'
    ));
  }

  function getElementDescriptor(node) {
    if (!node || node.nodeType !== 1) return '';

    const own = [
      node.innerText,
      node.textContent,
      node.className,
      node.id,
      node.title,
      node.getAttribute('aria-label'),
      node.getAttribute('href'),
      node.getAttribute('src'),
      node.getAttribute('alt'),
    ];

    const childAttrs = Array.from(node.querySelectorAll('a[href], img, [title], [aria-label]')).map((child) => [
      child.innerText,
      child.textContent,
      child.className,
      child.title,
      child.getAttribute('aria-label'),
      child.getAttribute('href'),
      child.getAttribute('src'),
      child.getAttribute('alt'),
    ].filter(Boolean).join(' '));

    return normalize(own.concat(childAttrs).filter(Boolean).join(' '));
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
