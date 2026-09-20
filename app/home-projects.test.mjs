import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { projects } from '../lib/projects.ts';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.HOME_URL || 'http://localhost:5173/');
  await page.getByRole('tab', { name: '我的作品', exact: false }).click();
  const cards = page.locator('.work-entry');
  assert.equal(await cards.count(), 5);
  const observed = [];
  for (const [i, project] of projects.entries()) {
    const card = cards.nth(i);
    assert.equal(await card.locator('h2').textContent(), project.title);
    assert.equal(await card.locator(':scope > p').nth(1).textContent(), project.summary);
    const detailCount = await card.locator('details').count();
    const skillsCount = await card.locator('.skills').count();
    observed.push({ id: project.id, detailCount, skillsCount });
    if (i < 3) {
      assert.equal(detailCount, 1, 'original projects keep their distinct details');
      await card.locator('summary').click();
      assert.equal(await card.locator('details').getAttribute('open'), '');
      assert.equal(await card.locator('details p').textContent(), project.detail);
      assert.notEqual(project.detail, project.summary);
      assert.deepEqual(await card.locator('.skills span').allTextContents(), project.tech);
    } else {
      assert.equal(detailCount, 0, 'new projects must not disclose duplicate summaries');
      assert.equal(skillsCount, 0, 'empty tech must not render a spacer');
    }
    assert.deepEqual(await card.locator('.work-links a').evaluateAll(nodes => nodes.map(n => n.href)), project.links.map(link => link.url));
    if (process.env.HOME_EVIDENCE_DIR) {
      await mkdir(process.env.HOME_EVIDENCE_DIR, { recursive: true });
      await card.screenshot({ path: `${process.env.HOME_EVIDENCE_DIR}/${i + 1}-${project.id}.png` });
    }
  }
  if (process.env.HOME_EVIDENCE_DIR) await writeFile(`${process.env.HOME_EVIDENCE_DIR}/observed.json`, JSON.stringify(observed, null, 2));
  await page.getByRole('tab', { name: '聯絡資訊', exact: false }).click();
  assert.equal(await page.locator('a[href="mailto:leslie0907@gmail.com"]').count(), 1);
  await page.getByRole('tab', { name: '關於我', exact: false }).click();
  assert.deepEqual(errors, []);
  console.log('PASS: Chinese-only original home: five cards; original three distinct details and tech intact; new two have no duplicate details/empty skills; links and tabs intact.');
} finally {
  await browser.close();
}
