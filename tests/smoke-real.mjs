import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, expectHidden, expectVisible, isVisible, launchInstalledChromium, requireNpxPackage } from './helpers.mjs';

const { chromium } = requireNpxPackage('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const userscript = await readFile(resolve(root, 'src/bilibili-minimal.user.js'), 'utf8');

const browser = await launchInstalledChromium(chromium, { headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
});

await context.addInitScript({ content: userscript });

try {
  await checkRealHome();
  await checkRealVideo();
  await checkRealSearch();
  console.log('real bilibili smoke checks passed');
} finally {
  await browser.close();
}

async function checkRealHome() {
  const page = await context.newPage();
  await page.goto('https://www.bilibili.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => document.documentElement.dataset.biliMinimalPage === 'home', null, { timeout: 15000 });
  await waitForLayout(page, '.center-search-container');

  if (!(await isVisible(page, '.center-search-container'))) {
    console.error(await page.evaluate(() => {
      const inspectElement = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          className: String(el.className || ''),
          hidden: el.getAttribute('data-bili-minimal-hidden'),
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          parent: el.parentElement ? {
            tag: el.parentElement.tagName,
            className: String(el.parentElement.className || ''),
            display: getComputedStyle(el.parentElement).display,
            hidden: el.parentElement.getAttribute('data-bili-minimal-hidden'),
          } : null,
        };
      };

      return JSON.stringify({
        url: location.href,
        title: document.title,
        bodyText: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 500),
        selectorCounts: {
          centerSearch: document.querySelectorAll('.center-search-container').length,
          navSearchInput: document.querySelectorAll('.nav-search-input').length,
          rightEntry: document.querySelectorAll('.right-entry').length,
          leftEntry: document.querySelectorAll('.left-entry').length,
          biliHeader: document.querySelectorAll('.bili-header').length,
        },
        centerSearch: inspectElement('.center-search-container'),
        rightEntry: inspectElement('.right-entry'),
        header: inspectElement('.bili-header'),
      }, null, 2);
    }));
  }

  await expectVisible(page, '.center-search-container');
  await expectVisible(page, '.right-entry');
  assert(await hasVisibleLogo(page), 'real home should keep logo visible');
  await expectHidden(page, '.feed-card, .recommended-swipe, main');

  const input = page.locator('.nav-search-input').first();
  if (await input.count()) {
    await input.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    await expectHidden(page, '.trending');
  }

  await page.close();
}

async function checkRealVideo() {
  const page = await context.newPage();
  await page.goto('https://www.bilibili.com/video/BV1JPKd6zE4f/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => document.documentElement.dataset.biliMinimalPage === 'video', null, { timeout: 15000 });
  await waitForLayout(page, '.center-search-container');

  await expectVisible(page, '.center-search-container');
  assert(await hasVisibleLogo(page), 'real video should keep logo visible');
  await expectHidden(page, '.recommend-list-v1, .rec-list');
  await expectHidden(page, '.bpx-player-ending-panel');
  assert(await page.evaluate(() => localStorage.getItem('recommend_auto_play')) === 'close', 'real video should disable autoplay storage flag');

  if (await page.locator('.video-pod').count()) {
    await expectVisible(page, '.video-pod');
  }

  await page.close();
}

async function checkRealSearch() {
  const page = await context.newPage();
  await page.goto('https://search.bilibili.com/all?keyword=%E7%BC%96%E7%A8%8B', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => document.documentElement.dataset.biliMinimalPage === 'search', null, { timeout: 15000 });
  await waitForLayout(page, '.center-search-container');

  assert(new URL(page.url()).pathname === '/all', 'real search should not redirect /all to /video');
  await expectVisible(page, '.search-tabs, .vui_tabs');
  await expectVisible(page, '.video-list, .bili-video-card');
  await expectHidden(page, '.brand-ad-list, .activity-game-list.search-all-list');

  await page.close();
}

async function hasVisibleLogo(page) {
  return page.evaluate(() => {
    const isVisibleElement = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    return Array.from(document.querySelectorAll('a, img, svg')).some((el) => {
      const text = [
        el.textContent,
        el.alt,
        el.title,
        el.getAttribute('aria-label'),
        el.getAttribute('href'),
      ].filter(Boolean).join(' ');

      return /bilibili|B站|b站/i.test(text) && isVisibleElement(el);
    });
  });
}

async function waitForLayout(page, selector) {
  await page.waitForFunction((targetSelector) => {
    const el = document.querySelector(targetSelector);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, selector, { timeout: 20000 }).catch(() => {});
}
