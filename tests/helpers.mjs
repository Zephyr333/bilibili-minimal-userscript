import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { delimiter, dirname, resolve } from 'node:path';

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

export async function launchInstalledChromium(chromium, options = {}) {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const executablePath of candidates) {
    if (!existsSync(executablePath)) continue;
    return chromium.launch({ ...options, executablePath });
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
