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
  await checkHome();
  await checkVideo();
  await checkSearch();
  console.log('fixture smoke checks passed');
} finally {
  await browser.close();
}

async function checkHome() {
  const page = await context.newPage();
  await gotoFixture(page, 'https://www.bilibili.com/', `
    <div class="bili-header">
      <div class="bili-header__bar">
        <a class="bili-logo" href="//www.bilibili.com"><img alt="B站 b站"></a>
        <ul class="left-entry">
          <li><a href="//www.bilibili.com">首页</a></li>
          <li><a>番剧</a></li>
          <li><a>直播</a></li>
          <li><a>游戏中心</a></li>
          <li><a>会员购</a></li>
          <li><a>漫画</a></li>
          <li><a>赛事</a></li>
          <li><a>下载客户端</a></li>
        </ul>
        <div class="center-search-container">
          <input class="nav-search-input" placeholder="搜索">
          <div class="search-panel"><div class="trending">bilibili热搜</div></div>
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
  `);

  await page.waitForFunction(() => document.documentElement.dataset.biliMinimalPage === 'home');

  await expectVisible(page, '.bili-logo');
  await expectVisible(page, '.center-search-container');
  await expectVisible(page, '.right-entry');
  await expectHidden(page, '.left-entry li');
  await expectHidden(page, '.trending');
  await expectHidden(page, 'main');

  await page.close();
}

async function checkVideo() {
  const page = await context.newPage();
  await gotoFixture(page, 'https://www.bilibili.com/video/BV1JPKd6zE4f/', `
    <div class="bili-header__bar">
      <a class="bili-logo" href="//www.bilibili.com"><img alt="B站 b站"></a>
      <ul class="left-entry"><li><a>首页</a></li><li><a>直播</a></li></ul>
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
      <ul class="left-entry"><li><a>首页</a></li><li><a>番剧</a></li></ul>
      <div class="center-search-container">
        <input class="nav-search-input">
        <div class="search-panel-popover">零基础编程入门教程</div>
      </div>
      <ul class="right-entry"><li>历史</li><li>投稿</li></ul>
    </div>
    <div class="search-page-wrapper">
      <div class="search-tabs">综合 视频 番剧 直播 专栏 用户</div>
      <div class="search-condition-row">综合排序 最多播放</div>
      <div class="brand-ad-list">广告</div>
      <div class="activity-game-list search-all-list">活动推广</div>
      <div class="video i_wrapper search-all-list">
        <div class="video-list row"><div class="bili-video-card">搜索到的视频</div></div>
      </div>
    </div>
  `);

  await page.waitForFunction(() => document.documentElement.dataset.biliMinimalPage === 'search');

  assert(new URL(page.url()).pathname === '/all', 'search should not redirect /all to /video');
  await expectVisible(page, '.search-tabs');
  await expectVisible(page, '.search-condition-row');
  await expectVisible(page, '.bili-video-card');
  await expectVisible(page, '.search-panel-popover');
  await expectHidden(page, '.brand-ad-list');
  await expectHidden(page, '.activity-game-list');

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
