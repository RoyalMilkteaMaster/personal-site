// Real rendered pixels, not a particular mask/gradient implementation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/home/leslie/coordinator-e2e/node_modules/playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'starlit-moon-'));
  let browser;
  try {
    await build({
      stdin: {
        contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Shell from './components/starlit-shell';createRoot(document.getElementById('root')).render(<Shell introComplete language="zh" active="0" onActiveChange={()=>{}} onReplay={()=>{}}/>);`,
        resolveDir: root, loader: 'tsx',
      },
      outfile: path.join(out, 'moon.js'), bundle: true, jsx: 'automatic',
      tsconfig: path.join(root, 'tsconfig.json'),
    });
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await page.route('http://moon.test/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      return pathname === '/'
        ? route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' })
        : route.fulfill({ path: path.join(root, 'public', pathname) });
    });
    await page.goto('http://moon.test/');
    await page.addStyleTag({ path: path.join(out, 'moon.css') });
    await page.addScriptTag({ path: path.join(out, 'moon.js') });
    const img = page.locator('.starlit-about-portrait img');
    await img.waitFor();
    assert.equal(await img.getAttribute('src'), '/portrait-milktea-moon-v3.webp',
      'About portrait must use the restored petting-hand moon asset');
    await img.evaluate(async el => { await el.decode(); });
    assert.deepEqual(await img.evaluate(el => [el.naturalWidth, el.naturalHeight]), [768, 768],
      'Delivered WebP dimensions must match the square layout reservation');
    assert.deepEqual(await img.evaluate(el => [Number(el.getAttribute('width')), Number(el.getAttribute('height'))]), [768, 768],
      'Existing square layout reservation must remain unchanged');
    // Isolate the actual portrait DOM on a known backdrop, including the
    // stacking isolation that exposed black corners during the original reveal.
    await page.evaluate(() => {
      const portrait = document.querySelector('.starlit-about-portrait');
      document.body.replaceChildren(portrait);
      document.body.style.cssText = 'margin:0;background:rgb(17,29,43);isolation:isolate';
    });
    for (const size of [346, 256]) {
      await img.evaluate((el, width) => { el.style.width = width + 'px'; }, size);
      const screenshot = await img.screenshot();
      const pixels = await page.evaluate(async data => {
        const shot = new Image(); shot.src = data; await shot.decode();
        const canvas = document.createElement('canvas'); canvas.width = shot.width; canvas.height = shot.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(shot, 0, 0);
        const at = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3);
        return { corners: [at(2, 2), at(shot.width - 3, 2), at(2, shot.height - 3), at(shot.width - 3, shot.height - 3)], center: at(shot.width >> 1, shot.height >> 1) };
      }, 'data:image/png;base64,' + screenshot.toString('base64'));
      for (const corner of pixels.corners) {
        assert.ok(corner.every((v, i) => Math.abs(v - [17, 29, 43][i]) <= 2),
          `Moon corners must reveal the backdrop at ${size}px: ${corner}`);
      }
      assert.ok(pixels.center.reduce((a, b) => a + b, 0) > 180, 'Moon itself must remain visible');
    }
    console.log('PASS restored asset filename, source/layout dimensions, visible moon and transparent corners at desktop/mobile sizes');
  } finally {
    if (browser) await browser.close();
    fs.rmSync(out, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
