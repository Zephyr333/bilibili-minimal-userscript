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

  await page.goto('https://live.bilibili.com/123');
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
        <ul class="right-entry"><li>消息</li><li>动态</li><li>收藏</li><li>历史</li><li>投稿</li></ul>
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

  await expectVisible(page, '.bili-logo');
  await expectVisible(page, '.center-search-container');
  await expectVisible(page, '.right-entry');
  await expectVisible(page, '.left-entry li[data-bili-minimal-logo-entry="true"]');
  await expectHidden(page, '.mini-header__title');
  await expectHidden(page, '.left-entry li:not([data-bili-minimal-logo-entry="true"])');
  assert(await page.locator('.nav-search-input').first().evaluate((input) => input.placeholder) === '搜索', 'home should replace recommended placeholder');
  await expectVisible(page, '.search-panel');
  await expectVisible(page, '.history-item');
  await expectVisible(page, '.normal-suggest');
  await expectHidden(page, '.trending');
  await expectHidden(page, '.suggest-item');
  await expectHidden(page, 'main');
  await expectHidden(page, '.palette-button-wrap');

  await page.close();
}

async function checkVideo() {
  const page = await context.newPage();
  await gotoFixture(page, 'https://www.bilibili.com/video/BV1JPKd6zE4f/', `
    <div class="bili-header__bar">
      <a class="bili-logo" href="//www.bilibili.com"><img alt="B站 b站"></a>
      <ul class="left-entry"><li><a class="left-entry__title" href="https://www.bilibili.com/"><svg></svg><div class="mini-header__title"><span>首页</span></div></a></li><li><a>直播</a></li></ul>
      <div class="center-search-container"><input class="nav-search-input"></div>
      <ul class="right-entry"><li>消息</li><li>投稿</li></ul>
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
  `);

  await page.waitForFunction(() => document.documentElement.dataset.biliMinimalPage === 'video');

  await expectVisible(page, '.left-entry li[data-bili-minimal-logo-entry="true"]');
  await expectHidden(page, '.mini-header__title');
  await expectVisible(page, '.video-pod');
  await expectVisible(page, '.up-panel-container');
  await expectVisible(page, '.danmaku-box');
  await expectHidden(page, '.recommend-list-v1');
  await expectHidden(page, '.video-card-ad-small');
  await expectHidden(page, '.bpx-player-ending-panel');
  await expectHidden(page, '.bpx-player-ctrl-setting-autoplay');
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
      <ul class="right-entry"><li>历史</li><li>投稿</li></ul>
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
  await expectVisible(page, '.left-entry li[data-bili-minimal-logo-entry="true"]');
  await expectHidden(page, '.mini-header__title');
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
          <head><meta charset="utf-8"></head>
          <body>${body}</body>
        </html>`,
    });
  });

  await page.goto(url);
}
