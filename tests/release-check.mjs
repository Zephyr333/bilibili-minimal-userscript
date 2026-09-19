import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = resolve(root, 'src/bilibili-minimal.user.js');
const pkgPath = resolve(root, 'package.json');

const checks = [];

function check(name, fn) {
  try {
    const detail = fn();
    checks.push({ name, passed: true, detail });
  } catch (err) {
    checks.push({ name, passed: false, detail: err.message });
  }
}

const userscript = await readFile(scriptPath, 'utf8');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

// 1. Metadata Block Checks
check('Userscript Metadata Block Exists', () => {
  if (!userscript.includes('// ==UserScript==') || !userscript.includes('// ==/UserScript==')) {
    throw new Error('Missing UserScript header block');
  }
  return 'Header block found';
});

const metaFields = {};
userscript
  .slice(userscript.indexOf('// ==UserScript=='), userscript.indexOf('// ==/UserScript=='))
  .split(/\r?\n/)
  .forEach((line) => {
    const match = line.match(/^\/\/\s*@([a-zA-Z0-9-]+)\s*(.*)$/);
    if (match) {
      const key = match[1];
      const val = match[2].trim();
      if (!metaFields[key]) metaFields[key] = [];
      metaFields[key].push(val);
    }
  });

check('Metadata Required Fields', () => {
  const required = ['name', 'namespace', 'version', 'description', 'author', 'match', 'run-at', 'grant', 'license'];
  const missing = required.filter((k) => !metaFields[k]);
  if (missing.length > 0) {
    throw new Error(`Missing metadata keys: ${missing.join(', ')}`);
  }
  return `All required keys present (${required.join(', ')})`;
});

check('Version Synchronization', () => {
  const scriptVersion = metaFields.version?.[0];
  const pkgVersion = pkg.version;
  if (!scriptVersion || scriptVersion !== pkgVersion) {
    throw new Error(`Version mismatch: userscript has "${scriptVersion}", package.json has "${pkgVersion}"`);
  }
  return `Version is consistent: v${scriptVersion}`;
});

check('Grant Permission Minimalization', () => {
  const grant = metaFields.grant?.[0];
  if (grant !== 'none') {
    throw new Error(`Grant is "${grant}", expected "none"`);
  }
  return '@grant none (no unnecessary elevated privileges)';
});

check('Domain Match Coverage', () => {
  const matches = metaFields.match || [];
  const expected = ['*://bilibili.com/*', '*://*.bilibili.com/*'];
  for (const exp of expected) {
    if (!matches.includes(exp)) {
      throw new Error(`Missing match pattern: ${exp}`);
    }
  }
  return `Matches: ${matches.join(', ')}`;
});

// 2. Syntax & Quality
check('JavaScript Syntax Validation', () => {
  execSync(`node --check "${scriptPath}"`, { stdio: 'pipe' });
  return 'Syntax valid via node --check';
});

check('Debug Artifacts and Stray Console Calls', () => {
  const lines = userscript.split('\n');
  const issues = [];
  lines.forEach((line, idx) => {
    if (/\bdebugger\b/.test(line)) {
      issues.push(`Line ${idx + 1}: debugger statement found`);
    }
    if (/\bconsole\.log\(/.test(line)) {
      issues.push(`Line ${idx + 1}: console.log call found`);
    }
  });
  if (issues.length > 0) {
    throw new Error(issues.join('; '));
  }
  return 'No debugger or stray console.log calls in userscript';
});

check('IIFE Encapsulation', () => {
  const trimmed = userscript.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();
  if (!trimmed.includes('(function') || !trimmed.endsWith('})();')) {
    throw new Error('Script is not properly encapsulated in an IIFE');
  }
  return 'Encapsulated inside strict IIFE';
});

// 3. Smoke Fixture Test Execution
check('Automated Fixture Test Suite', () => {
  const output = execSync('npm run test:fixture', { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  if (!output.includes('fixture smoke checks passed')) {
    throw new Error('Test suite did not output pass confirmation');
  }
  return 'All DOM fixture smoke tests passed';
});

// 4. Git Cleanliness Check
check('Git Working Tree State', () => {
  const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' }).trim();
  // We allow release-check.mjs and package.json if currently being added
  const modified = status.split('\n').filter(Boolean).filter(line => !line.includes('release-check.mjs') && !line.includes('package.json'));
  if (modified.length > 0) {
    throw new Error(`Uncommitted changes in working tree: \n${modified.join('\n')}`);
  }
  return 'Working tree clean';
});

// Output Summary
console.log('\n=== BILIBILI MINIMAL USERSCRIPT 封版检查报告 ===\n');
let allPassed = true;
checks.forEach((c) => {
  const symbol = c.passed ? '[PASS]' : '[FAIL]';
  console.log(`${symbol} ${c.name}: ${c.detail}`);
  if (!c.passed) allPassed = false;
});

console.log('\n-----------------------------------------------');
if (allPassed) {
  console.log('RESULT: 封版检查全部通过 (READY FOR RELEASE)\n');
  process.exit(0);
} else {
  console.log('RESULT: 封版检查存在未通过项，禁止封版！\n');
  process.exit(1);
}
