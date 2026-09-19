import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, expectHidden, expectVisible, launchInstalledChromium, requireNpxPackage } from './helpers.mjs';

const { chromium } = requireNpxPackage('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const userscript = await readFile(resolve(root, 'src/bilibili-minimal.user.js'), 'utf8');

const browser = await launchInstalledChromium(chromium, { headless: true });
const context = await browser.newContext();
await context.addInitScript({ content: userscript });

try {
  await checkLiveRedirect();
  await checkHome();
  await checkVideo();
  await checkSearch();
  console.log('fixture smoke checks passed');
} finally {
  await browser.close();
}

async function checkLiveRedirect() {
  const page = await context.newPage();

  await page.route('https://live.bilibili.com/123', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><body>live room</body></html>',
    });
  });

  await page.route('https://www.bilibili.com/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><body>home</body></html>',
    });
  });

  await page.goto('https://live.bilibili.com/123').catch(() => {});
  await page.waitForURL('https://www.bilibili.com/', { timeout: 10000 });
  assert(page.url() === 'https://www.bilibili.com/', 'live pages should redirect to homepage');

  await page.close();
}

async function checkHome() {
  const page = await context.newPage();
  await gotoFixture(page, 'https://www.bilibili.com/', `
    <div class="bili-header">
      <div class="bili-header__bar">
        <a class="bili-logo" href="//www.bilibili.com"><img alt="B站 b站"></a>
        <ul class="left-entry">
          <li><a class="left-entry__title" href="https://www.bilibili.com/"><svg></svg><div class="mini-header__title"><span>首页</span></div></a></li>
          <li><a>番剧</a></li>
          <li><a>直播</a></li>
          <li><a>游戏中心</a></li>
          <li><a>会员购</a></li>
          <li><a>漫画</a></li>
          <li><a>赛事</a></li>
          <li><a>下载客户端</a></li>
        </ul>
        <div class="center-search-container">
          <input class="nav-search-input" placeholder="某某 3小时前更新">
          <div class="search-panel">
            <div class="histories-wrap"><div class="history-item">编程</div></div>
            <div class="trending">bilibili热搜</div>
            <div class="suggestions">
              <div class="suggest-item">某某 3小时前更新</div>
              <div class="suggest-item normal-suggest">编程入门</div>
            </div>
          </div>
        </div>
        <ul class="right-entry">
          <li class="avatar-entry">登录</li>
          <li class="vip-entry">大会员</li>
          <li class="message-entry">消息</li>
          <li class="dynamic-entry">动态</li>
          <li class="favorite-entry v-popover-wrap">
            <a class="right-entry__outside" data-header-fav-entry="true" href="https://space.bilibili.com/123/favlist" target="_blank">
              <span class="right-entry-text">收藏</span>
            </a>
            <div class="v-popover is-bottom">
              <div class="v-popover-content header-favorite-popover">
                <div class="bili-video-card">收藏的视频卡片</div>
                <a class="view-all-fav" href="https://space.bilibili.com/123/favlist" target="_blank">全部收藏</a>
              </div>
            </div>
          </li>
          <li class="history-entry v-popover-wrap">
            <a class="right-entry__outside" href="https://www.bilibili.com/history" target="_blank">
              <span class="right-entry-text">历史</span>
            </a>
            <div class="v-popover is-bottom">
              <div class="v-popover-content header-history-popover">
                <div class="bili-video-card">历史记录视频卡片</div>
              </div>
            </div>
          </li>
          <li class="creator-entry">创作中心</li>
          <li class="upload-entry">投稿</li>
        </ul>
      </div>
      <div class="channel-icons">动态 热门</div>
    </div>
    <main>
      <div class="recommended-swipe">轮播</div>
      <div class="feed-card">推荐视频</div>
      <div class="bili-video-card">视频卡片</div>
    </main>
    <div class="palette-button-wrap">刷新内容 三点 顶部</div>
  `);

  await page.waitForFunction(() => document.documentElement.dataset.biliMinimalPage === 'home');

  await expectHidden(page, '.bili-logo');
  await expectVisible(page, '.center-search-container');
  await expectVisible(page, '.right-entry');
  await expectVisible(page, '.left-entry li[data-bili-minimal-home-entry="true"]');
  await expectVisible(page, '.mini-header__title');
  await expectHidden(page, '.left-entry svg');
  await expectHidden(page, '.left-entry li:not([data-bili-minimal-home-entry="true"])');
  await expectVisible(page, '.avatar-entry');
  await expectVisible(page, '.message-entry');
  await expectVisible(page, '.favorite-entry');
  await expectVisible(page, '.history-entry');
  await expectHidden(page, '.vip-entry');
  await expectHidden(page, '.dynamic-entry');
  await expectHidden(page, '.creator-entry');
  await expectHidden(page, '.upload-entry');
  assert(await page.locator('.nav-search-input').first().evaluate((input) => input.placeholder) === '搜索', 'home should replace recommended placeholder');
  await expectVisible(page, '.search-panel');
  await expectVisible(page, '.history-item');
  await expectVisible(page, '.normal-suggest');
  await expectHidden(page, '.trending');
  await expectHidden(page, '.suggest-item');
  await expectHidden(page, 'main');
  await expectHidden(page, 'main .bili-video-card');
  await expectHidden(page, '.palette-button-wrap');

  // Verify click on "收藏" prevents navigation and pins popover open ("点一下悬停")
  let popupOpened = false;
  context.on('page', () => { popupOpened = true; });

  await page.locator('.favorite-entry .right-entry__outside').click();
  assert(!popupOpened, 'clicking 收藏 should not open a new tab');
  await expectVisible(page, '.favorite-entry .v-popover');
  await expectVisible(page, '.favorite-entry .bili-video-card');

  // Move mouse away to body, popover should remain visible because it is pinned
  await page.mouse.move(10, 10);
  await expectVisible(page, '.favorite-entry .v-popover');

  // Click outside (e.g. on search input) should unpin and close popover
  await page.locator('.nav-search-input').click();
  await expectHidden(page, '.favorite-entry .v-popover');

  // Verify click on "历史" also pins and displays popover video cards
  await page.locator('.history-entry .right-entry__outside').click();
  assert(!popupOpened, 'clicking 历史 should not open a new tab');
  await expectVisible(page, '.history-entry .v-popover');
  await expectVisible(page, '.history-entry .bili-video-card');

  // Verify route change unpins any pinned popover
  await page.locator('.favorite-entry .right-entry__outside').click();
  await expectVisible(page, '.favorite-entry .v-popover');
  await page.evaluate(() => history.pushState({}, '', 'https://www.bilibili.com/?page=2'));
  await page.mouse.move(10, 10);
  await expectHidden(page, '.favorite-entry .v-popover');

  // Verify modifier click (Ctrl+click) does not pin popover
  await page.locator('.favorite-entry .right-entry__outside').click({ modifiers: ['Control'] });
  assert(await page.locator('.favorite-entry').getAttribute('data-bili-minimal-pinned') === null, 'Ctrl+click should not pin popover');

  await page.close();
}

async function checkVideo() {
  const page = await context.newPage();
  await gotoFixture(page, 'https://www.bilibili.com/video/BV1JPKd6zE4f/', `
    <div class="bili-header__bar">
      <a class="bili-logo" href="//www.bilibili.com"><img alt="B站 b站"></a>
      <ul class="left-entry"><li><a class="left-entry__title" href="https://www.bilibili.com/"><svg></svg><div class="mini-header__title"><span>首页</span></div></a></li><li><a>直播</a></li></ul>
      <div class="center-search-container"><input class="nav-search-input"></div>
      <ul class="right-entry"><li class="avatar-entry">登录</li><li class="message-entry">消息</li><li class="favorite-entry">收藏</li><li class="history-entry">历史</li><li class="upload-entry">投稿</li></ul>
    </div>
    <div class="video-container">播放器</div>
    <div class="right-container">
      <div class="right-container-inner">
        <div class="up-panel-container">UP 主信息</div>
        <div class="danmaku-box">弹幕列表</div>
        <div class="video-card-ad-small">广告</div>
        <div class="rcmd-tab">
          <div class="video-pod">当前合集 分 P 自动连播</div>
          <div class="recommend-list-v1"><div class="rec-list">相关推荐</div></div>
        </div>
      </div>
    </div>
    <div class="bpx-player-ending-panel">播放结束推荐</div>
    <div class="bpx-player-ctrl-setting-autoplay">自动连播</div>
    <div class="video-desc">本期视频涉及的事件以及信息来源如下</div>
    <div class="ordinary-tag">欧洲热浪</div>
    <a class="activity-banner" href="https://www.bilibili.com/blackboard/activity-debate.html">
      <span>投稿赢流量、奖金和老友赛门票！</span>
      <img alt="B站辩论季 上B站聊观点">
    </a>
    <a class="mobile-topic-promo" href="https://www.bilibili.com/blackboard/activity/debate">
      B站辩论季 活动推广
    </a>
    <div class="comment-container">评论区</div>
  `);

  await page.waitForFunction(() => document.documentElement.dataset.biliMinimalPage === 'video');

  await expectHidden(page, '.bili-logo');
  await expectVisible(page, '.left-entry li[data-bili-minimal-home-entry="true"]');
  await expectVisible(page, '.mini-header__title');
  await expectHidden(page, '.left-entry svg');
  await expectVisible(page, '.avatar-entry');
  await expectVisible(page, '.message-entry');
  await expectVisible(page, '.favorite-entry');
  await expectVisible(page, '.history-entry');
  await expectHidden(page, '.upload-entry');
  await expectVisible(page, '.video-pod');
  await expectVisible(page, '.up-panel-container');
  await expectVisible(page, '.danmaku-box');
  await expectHidden(page, '.recommend-list-v1');
  await expectHidden(page, '.video-card-ad-small');
  await expectHidden(page, '.bpx-player-ending-panel');
  await expectHidden(page, '.bpx-player-ctrl-setting-autoplay');
  await expectVisible(page, '.video-desc');
  await expectVisible(page, '.ordinary-tag');
  await expectVisible(page, '.comment-container');
  await expectHidden(page, '.activity-banner');
  await expectHidden(page, '.mobile-topic-promo');
  assert(await page.evaluate(() => localStorage.getItem('recommend_auto_play')) === 'close', 'video should disable autoplay storage flag');

  await page.close();
}

async function checkSearch() {
  const page = await context.newPage();
  await gotoFixture(page, 'https://search.bilibili.com/all?keyword=%E7%BC%96%E7%A8%8B', `
    <div class="bili-header__bar">
      <a class="bili-logo" href="//www.bilibili.com"><img alt="B站 b站"></a>
      <ul class="left-entry"><li><a class="left-entry__title" href="https://www.bilibili.com/"><svg></svg><div class="mini-header__title"><span>首页</span></div></a></li><li><a>番剧</a></li></ul>
      <div class="center-search-container">
        <input class="nav-search-input">
        <div class="search-panel-popover">零基础编程入门教程</div>
      </div>
      <ul class="right-entry"><li class="avatar-entry">登录</li><li class="private-entry">私信</li><li class="favorite-entry">收藏</li><li class="history-entry">历史</li><li class="dynamic-entry">动态</li><li class="upload-entry">投稿</li></ul>
    </div>
    <div class="search-page-wrapper">
      <div class="search-tabs">
        <ul class="vui_tabs--nav">
          <li class="vui_tabs--nav-item">综合</li>
          <li class="vui_tabs--nav-item">视频 99+</li>
          <li class="vui_tabs--nav-item">番剧 1</li>
          <li class="vui_tabs--nav-item">影视 0</li>
          <li class="vui_tabs--nav-item">直播 20</li>
          <li class="vui_tabs--nav-item">专栏 99+</li>
        </ul>
      </div>
      <div class="search-condition-row">综合排序 最多播放</div>
      <div class="brand-ad-list">广告</div>
      <div class="activity-game-list search-all-list">活动推广</div>
      <div class="video i_wrapper search-all-list">
        <div class="video-list row">
          <div class="col_3 normal-result"><div class="bili-video-card">搜索到的视频</div></div>
          <div class="col_3 live-result"><div class="bili-video-card"><a href="https://live.bilibili.com/123">直播视频</a><div class="bili-video-card__info--living">直播中</div></div></div>
        </div>
        <div class="vui_pagenation">上一页 1 2 3 下一页</div>
      </div>
      <div class="bili-footer">页脚</div>
      <div class="login-tip">登录提示</div>
      <div class="lt-row">底部登录条</div>
    </div>
  `);

  await page.waitForFunction(() => document.documentElement.dataset.biliMinimalPage === 'search');

  assert(new URL(page.url()).pathname === '/all', 'search should not redirect /all to /video');
  await expectHidden(page, '.bili-logo');
  await expectVisible(page, '.left-entry li[data-bili-minimal-home-entry="true"]');
  await expectVisible(page, '.mini-header__title');
  await expectHidden(page, '.left-entry svg');
  await expectVisible(page, '.avatar-entry');
  await expectVisible(page, '.private-entry');
  await expectVisible(page, '.favorite-entry');
  await expectVisible(page, '.history-entry');
  await expectHidden(page, '.dynamic-entry');
  await expectHidden(page, '.upload-entry');
  await expectVisible(page, '.search-tabs');
  await expectVisible(page, '.search-condition-row');
  await expectVisible(page, '.normal-result .bili-video-card');
  await expectHidden(page, '.live-result');
  await expectHidden(page, '.vui_tabs--nav-item:nth-child(3)');
  await expectHidden(page, '.vui_tabs--nav-item:nth-child(4)');
  await expectHidden(page, '.vui_tabs--nav-item:nth-child(5)');
  await expectVisible(page, '.vui_pagenation');
  await expectVisible(page, '.search-panel-popover');
  await expectHidden(page, '.brand-ad-list');
  await expectHidden(page, '.activity-game-list');
  await expectHidden(page, '.bili-footer');
  await expectHidden(page, '.login-tip');
  await expectHidden(page, '.lt-row');

  await page.close();
}

async function gotoFixture(page, url, body) {
  await page.route(url, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              .v-popover { display: none; }
            </style>
          </head>
          <body>${body}</body>
        </html>`,
    });
  });

  await page.goto(url);
}
