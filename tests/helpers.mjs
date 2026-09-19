import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';

export function requireNpxPackage(packageName) {
  const localRequire = createRequire(import.meta.url);

  try {
    return localRequire(packageName);
  } catch (_) {
    // Continue with npx cache lookup.
  }

  const binDirs = process.env.PATH
    .split(delimiter)
    .filter((entry) => /[\\/]_npx[\\/].+[\\/]node_modules[\\/]\.bin$/i.test(entry));

  for (const binDir of binDirs) {
    const requireFromNpx = createRequire(resolve(dirname(binDir), 'noop.js'));
    try {
      return requireFromNpx(packageName);
    } catch (_) {
      // Try the next npx cache entry.
    }
  }

  throw new Error(`Cannot resolve ${packageName}. Run this script through npx --package ${packageName}.`);
}

function findManagedChromium() {
  const dirs = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    'D:\\ms-playwright',
    resolve(process.env.LOCALAPPDATA || '', 'ms-playwright'),
  ].filter(Boolean);

  const found = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('chromium_headless_shell-')) {
          found.push(join(dir, entry.name, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'));
        } else if (entry.name.startsWith('chromium-')) {
          found.push(join(dir, entry.name, 'chrome-win64', 'chrome.exe'));
        }
      }
    } catch (_) {}
  }
  return found;
}

export async function launchInstalledChromium(chromium, options = {}) {
  // 1. Managed Playwright Chromium / Chrome Headless Shell (e.g. CFT in D:\ms-playwright)
  const managedCandidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    ...findManagedChromium(),
  ].filter(Boolean);

  for (const executablePath of managedCandidates) {
    if (!existsSync(executablePath)) continue;
    try {
      return await chromium.launch({ ...options, executablePath });
    } catch (_) {}
  }

  // 2. Default launch
  try {
    return await chromium.launch(options);
  } catch (_) {}

  // 3. Fall back to installed system browsers (Chrome / Edge)
  const systemCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const executablePath of systemCandidates) {
    if (!existsSync(executablePath)) continue;
    try {
      return await chromium.launch({ ...options, executablePath });
    } catch (_) {}
  }

  return chromium.launch(options);
}

export async function isVisible(page, selector) {
  return page.locator(selector).first().evaluate((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }).catch(() => false);
}

export async function expectVisible(page, selector) {
  assert(await isVisible(page, selector), `${selector} should be visible`);
}

export async function expectHidden(page, selector) {
  assert(!(await isVisible(page, selector)), `${selector} should be hidden`);
}

export function assert(value, message) {
  if (!value) {
    throw new Error(message);
  }
}
