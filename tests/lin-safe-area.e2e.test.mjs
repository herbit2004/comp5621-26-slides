import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import {chromium} from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test('Lin slides stay within the invisible safe area', async () => {
  const browser = await chromium.launch({headless: true, executablePath: chrome});
  try {
    // The viewer reserves 32 px around the 1920 px slide in editing mode.
    const page = await browser.newPage({viewport: {width: 1952, height: 1080}});
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.waitForFunction(() => window.deckReady === true);
    const result = await page.evaluate(() => {
      const slides = [...document.querySelectorAll('.slide[data-owner="Lin Fengyan"]:not(.title-slide)')];
      const safe = {left: 1920 * 0.08, right: 1920 * 0.92, top: 1080 * 0.07, bottom: 1080 * 0.93};
      const violations = [];
      for (const slide of slides) {
        for (const element of slide.querySelectorAll('.page > header,.page > .body,.page > footer')) {
          const box = element.getBoundingClientRect();
          const slideBox = slide.getBoundingClientRect();
          const local = {
            left: box.left - slideBox.left,
            right: box.right - slideBox.left,
            top: box.top - slideBox.top,
            bottom: box.bottom - slideBox.top,
          };
          if (local.left < safe.left - 1 || local.right > safe.right + 1 || local.top < safe.top - 1 || local.bottom > safe.bottom + 1) {
            violations.push({key: slide.dataset.key, className: element.className, local});
          }
        }
      }
      return {count: slides.length, violations};
    });
    assert.equal(result.count, 8);
    assert.deepEqual(result.violations, []);
  } finally {
    await browser.close();
  }
});

test('guides can be inspected but stay hidden in print', async () => {
  const browser = await chromium.launch({headless: true, executablePath: chrome});
  try {
    const page = await browser.newPage({viewport: {width: 1952, height: 1080}});
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.waitForFunction(() => window.deckReady === true);
    await page.click('#guides');
    assert.equal(await page.getAttribute('#guides', 'aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.slide[data-key="1a-circuit"]'), ':after').display), 'block');
    await page.emulateMedia({media: 'print'});
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.slide[data-key="1a-circuit"]'), ':after').display), 'none');
  } finally {
    await browser.close();
  }
});
