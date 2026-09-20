// 執行前啟動 dev server。可指定 PLAYWRIGHT_MODULE、CHROMIUM_EXECUTABLE、PREVIEW_URL。
// 檢查公開主預覽的內聯圖標及重載契約，不比對 SVG／CSS 原始碼字串。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
// 卡片上的名稱就是作品資料本身（starlit-shell 直接渲染 `p.title`），所以期望值
// 從唯一來源推導——改文案不會再讓這支驗收測試寫著上一版的名字。
import { localizedProjects } from '../lib/projects.ts';
import { SITE_COPY } from '../lib/site-copy.ts';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.PREVIEW_URL || 'http://localhost:5173/starlit-full-preview');
  await page.waitForFunction(() => document.querySelector('canvas')?.__fantasy?.snapshot().ready, null, { timeout: 90000 });
  const enter = page.getByRole('button', { name: '我的專案', exact: false });
  for (let i = 0; i < 14 && !(await enter.isVisible()); i++) {
    if (i) await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(4500);
  }
  await enter.click();
  const panel = page.locator('.starlit-ember-grid');
  await panel.waitFor({ state: 'visible' });
  await page.waitForFunction(() => [...document.querySelectorAll('.starlit-ember-grid .starlit-ember-icon')].every(svg => svg.getBBox().width > 0));
  const result = await panel.evaluate(async root => {
    const rows = [];
    // Canvas uses the browser's color parser to normalize hex and computed RGB.
    const colors = document.createElement('canvas').getContext('2d');
    const normalizeColor = color => { colors.fillStyle = color; return colors.fillStyle; };
    for (const item of root.querySelectorAll('.starlit-ember')) {
      const icons = [];
      for (const svg of item.querySelectorAll('.starlit-ember-icon, .starlit-ember-head-icon')) {
        icons.push({
          inlineGeometry: svg.querySelectorAll('path, circle, ellipse').length,
          externalReferences: svg.querySelectorAll('use, image').length,
          width: svg.getBoundingClientRect().width, height: svg.getBoundingClientRect().height,
          renderedWidth: svg.getBBox().width, hostColor: normalizeColor(getComputedStyle(svg).color) });
      }
      rows.push({ name: item.querySelector('.starlit-ember-name').textContent, tint: normalizeColor(getComputedStyle(item).getPropertyValue('--ember-tint').trim()), icons });
    }
    return rows;
  });
  assert.deepEqual(result.map(r => r.name), localizedProjects('zh').map(p => p.title));
  for (const row of result) {
    assert.deepEqual(row.icons.map(i => [i.width, i.height]), [[24, 24], [68, 68]]);
    for (const icon of row.icons) {
      assert.ok(icon.inlineGeometry > 0, row.name);
      assert.equal(icon.externalReferences, 0, row.name);
      assert.ok(icon.renderedWidth > 0, row.name);
      assert.equal(icon.hostColor, row.tint, `${row.name}: closed/open icon matches resolved base tint`);
    }
  }
  if (process.env.ICON_EVIDENCE_DIR) {
    const out = process.env.ICON_EVIDENCE_DIR;
    await mkdir(out, { recursive: true });
    await writeFile(`${out}/public-contract.json`, JSON.stringify(result, null, 2));
    await panel.screenshot({ path: `${out}/after-panel.png` });
    await page.screenshot({ path: `${out}/after-page.png` });
  }
  const desktop = await panel.locator('.starlit-ember').evaluateAll(nodes => nodes.map(n => { const r=n.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width}; }));
  assert.equal(desktop.length, 5);
  assert.equal(desktop[0].y, desktop[2].y);
  assert.equal(desktop[3].y, desktop[4].y);
  assert.ok(desktop[3].y > desktop[0].y);
  assert.equal(desktop[0].x, desktop[3].x, 'second row left aligned');
  assert.equal(desktop[1].x, desktop[4].x);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await panel.locator('.starlit-ember').evaluateAll(nodes => nodes.map(n => { const r=n.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right}; }));
  for (const [i, r] of mobile.entries()) {
    assert.ok(r.x >= 0 && r.right <= 391, 'mobile cards fit viewport');
    assert.equal(r.x, mobile[0].x);
    if (i) assert.ok(r.y > mobile[i-1].y, 'mobile single column in order');
  }
  if (process.env.ICON_EVIDENCE_DIR) await panel.screenshot({ path: `${process.env.ICON_EVIDENCE_DIR}/mobile-zh-closed.png` });
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
  const englishPanel = page.locator('.starlit-ember-grid');
  await englishPanel.waitFor({ state: 'visible' });
  assert.deepEqual(await englishPanel.locator('.starlit-ember-name').allTextContents(), localizedProjects('en').map(p => p.title));
  assert.doesNotMatch(await englishPanel.textContent(), /[\u3400-\u9fff]/);
  assert.equal(await englishPanel.locator('.starlit-ember-icon, .starlit-ember-head-icon').count(), 10);
  if (process.env.ICON_EVIDENCE_DIR) await englishPanel.screenshot({ path: `${process.env.ICON_EVIDENCE_DIR}/after-english-panel.png` });
  const faces = panel.locator('.starlit-ember-face');
  for (let i=0;i<5;i++) await faces.nth(i).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.starlit-ember')].every(n => n.dataset.lit === 'true' && n.dataset.burning === 'false'));
  assert.deepEqual(await panel.locator('.starlit-ember').evaluateAll(nodes => nodes.map(n => n.dataset.tint)), ['gold','blue','purple','pink','indigo']);
  assert.deepEqual(await panel.locator('.starlit-ember').nth(3).locator('a').evaluateAll(nodes => nodes.map(n => n.href)), ['https://github.com/RoyalMilkteaMaster/lol-highlights']);
  assert.deepEqual(await panel.locator('.starlit-ember').nth(4).locator('a').evaluateAll(nodes => nodes.map(n => n.href)), ['https://github.com/RoyalMilkteaMaster/xuerong-clawd']);
  await page.waitForFunction(() => [...document.querySelectorAll('.starlit-ember')].every(n => getComputedStyle(n, '::before').top === '-2.5px'));
  for (const card of await panel.locator('.starlit-ember').all()) {
    const sizes = await card.evaluate(n => ({ title:getComputedStyle(n.querySelector('.starlit-ember-head-name')).fontSize, summary:getComputedStyle(n.querySelector('.starlit-ember-open > p')).fontSize, ring:parseFloat(getComputedStyle(n.querySelector('.starlit-ember-open')).marginTop)-parseFloat(getComputedStyle(n,'::before').top) }));
    assert.equal(sizes.title, '16px'); assert.equal(sizes.summary, '14px'); assert.equal(sizes.ring, 3.5);
  }
  if (process.env.ICON_EVIDENCE_DIR) await panel.screenshot({ path: `${process.env.ICON_EVIDENCE_DIR}/mobile-en-open.png` });
  await page.setViewportSize({ width:1440,height:1100 });
  if (process.env.ICON_EVIDENCE_DIR) await panel.screenshot({ path: `${process.env.ICON_EVIDENCE_DIR}/desktop-en-open.png` });
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('menuitemradio', { name: '繁體中文', exact: true }).click();
  if (process.env.ICON_EVIDENCE_DIR) await panel.screenshot({ path: `${process.env.ICON_EVIDENCE_DIR}/desktop-zh-open.png` });
  // 文案自帶的換行必須在畫面上真的斷行。量的是渲染結果（`\n` 兩側字元的行框位置），
  // 不比對任何 CSS 宣告或來源字串：換行若被摺成空白，兩側會落在同一行框。
  assert.ok(localizedProjects('zh').every(p => p.summary.includes('\n')), '五件文案都自帶換行，這個檢查才不是空轉');
  const joinedLines = () =>
    panel.locator('.starlit-ember-open > p').evaluateAll(nodes => nodes.flatMap(node => {
      const text = node.firstChild;
      const value = text.textContent;
      const joined = [];
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== '\n' || i === 0 || i + 1 >= value.length) continue;
        const before = document.createRange(); before.setStart(text, i - 1); before.setEnd(text, i);
        const after = document.createRange(); after.setStart(text, i + 1); after.setEnd(text, i + 2);
        if (Math.abs(before.getBoundingClientRect().top - after.getBoundingClientRect().top) < 1)
          joined.push(value.slice(0, i + 1).trim());
      }
      return joined;
    }));
  assert.deepEqual(await joinedLines(), [], '作品文案的換行沒有斷行（畫面上被連成同一行）');
  // 反向對照：暫時讓換行摺成空白，同一個量測必須抓得到——證明上面那條不是空轉。
  const collapse = await page.addStyleTag({ content: '.starlit-ember-open p { white-space: normal !important }' });
  assert.ok((await joinedLines()).length > 0, '反向對照失效：關掉換行後量測仍回報全部斷行');
  await collapse.evaluate(node => node.remove());
  assert.deepEqual(await joinedLines(), [], '移除反向對照後換行必須恢復');
  await page.setViewportSize({ width:390,height:844 });
  if (process.env.ICON_EVIDENCE_DIR) await panel.screenshot({ path: `${process.env.ICON_EVIDENCE_DIR}/mobile-zh-open.png` });
  // A real click must open the supplied destination and keep the card open.
  for (const i of [3,4]) {
    const popupPromise = page.waitForEvent('popup');
    await panel.locator('.starlit-ember').nth(i).locator('a').click();
    const popup = await popupPromise;
    await popup.waitForURL(/github\.com\/RoyalMilkteaMaster\//, {waitUntil:'commit'}).catch(() => {});
    assert.ok(popup.url().includes(['lol-highlights','xuerong-clawd'][i-3]));
    await popup.close();
    assert.equal(await panel.locator('.starlit-ember').nth(i).getAttribute('data-lit'),'true');
  }
  for (let i=0;i<5;i++) await panel.locator('.starlit-ember-head-name').nth(i).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.starlit-ember')].every(n => n.dataset.lit === 'false' && n.dataset.closing === 'false'));
  assert.equal(await panel.locator('canvas').count(), 0);

  await panel.waitFor({ state: 'visible' });
  assert.ok((await panel.textContent()).includes(localizedProjects('zh')[1].title), '切回中文後卡片回到中文名稱');
  console.log('PASS: cards switch zh → en → zh with the site; no Chinese text in English cards.');
  const geometry = await panel.locator('.starlit-ember-icon, .starlit-ember-head-icon').evaluateAll(nodes => nodes.map(svg => svg.innerHTML));
  // 同一 context 保留瀏覽器快取。模擬舊交付路徑失敗與回傳過期造型。
  for (const mode of ['unavailable', 'stale']) {
    let legacyRequests = 0;
    await page.route('**/project-icons/*.svg', async route => {
      legacyRequests++;
      if (mode === 'unavailable') await route.abort('connectionclosed');
      else await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"><g id="art"><rect width="1" height="1"/></g></svg>' });
    });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('canvas')?.__fantasy?.snapshot().ready, null, { timeout: 90000 });
    for (let i = 0; i < 14 && !(await enter.isVisible()); i++) {
      if (i) await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(4500);
    }
    await enter.click();
    await panel.waitFor({ state: 'visible' });
    const reloaded = await panel.locator('.starlit-ember-icon, .starlit-ember-head-icon').evaluateAll(nodes => nodes.map(svg => ({ geometry: svg.innerHTML, width: svg.getBBox().width })));
    assert.equal(reloaded.length, 10);
    assert.ok(reloaded.every(svg => svg.width > 0), `reload ${mode}: all icons visible`);
    assert.deepEqual(reloaded.map(svg => svg.geometry), geometry, `reload ${mode}: same shapes`);
    assert.equal(legacyRequests, 0, 'rendering must not depend on legacy external SVG requests');
    if (process.env.ICON_EVIDENCE_DIR) await panel.screenshot({ path: `${process.env.ICON_EVIDENCE_DIR}/reload-${mode}.png` });
    console.log(`PASS: same-context main-route reload (${mode}); 10 visible icons, same shapes, zero external SVG requests.`);
    await page.unroute('**/project-icons/*.svg');
  }
  // 2026-09-20 使用者修訂：聯絡標題只有「奶茶」那個詞是奶茶色，其餘與其他標題文字同色，
  // 而且它是句子裡的一個詞、不是自成一行。量的是實際算出來的顏色與行框位置。
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole('tab', { name: '聯絡資訊', exact: false }).click();
  const title = page.locator('.starlit-chapter h1').last();
  await title.waitFor({ state: 'visible' });
  const measureTitle = () => title.evaluate(h1 => {
    const canvas = document.createElement('canvas').getContext('2d');
    const normalize = color => { canvas.fillStyle = color; return canvas.fillStyle; };
    const em = h1.querySelector('em.starlit-title-accent');
    // 標題裡除了那個詞以外的文字，各自的行框；用來看那個詞有沒有被迫自成一行。
    const others = [...h1.childNodes]
      .filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
      .flatMap(n => { const r = document.createRange(); r.selectNodeContents(n); return [...r.getClientRects()]; });
    return {
      text: h1.textContent,
      accent: em && em.textContent,
      accentColor: em && normalize(getComputedStyle(em).color),
      plainColor: normalize(getComputedStyle(h1).color),
      // 代幣定義在 `.starlit` 上而不是 :root，所以從標題自己的計算樣式取繼承值。
      gold: normalize(getComputedStyle(h1).getPropertyValue('--starlit-gold').trim()),
      display: em && getComputedStyle(em).display,
      // 那個詞的行框中，至少有一個和標題其他文字落在同一行——若它被當成整行
      //（display: block）就會自己獨占一行，這裡會是 false。
      sharesLineWithOtherText: em
        ? [...em.getClientRects()].some(a => others.some(b => Math.abs(a.top - b.top) < 2))
        : false,
    };
  });
  for (const language of ['zh', 'en']) {
    if (language === 'en') {
      await page.getByRole('button', { name: 'Language', exact: true }).click();
      await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
      await page.waitForFunction(accent => document.querySelector('em.starlit-title-accent')?.textContent === accent, SITE_COPY.en.contact.titleAccent);
    }
    const copy = SITE_COPY[language].contact;
    const tinted = await measureTitle();
    assert.equal(tinted.accent, copy.titleAccent, `${language}：上色的就是文案指定的那個詞`);
    assert.equal(tinted.text, copy.title + copy.titleEm, `${language}：畫面上的標題仍是完整兩段文字`);
    assert.equal(tinted.accentColor, tinted.gold, `${language}：那個詞算出來是奶茶色`);
    assert.notEqual(tinted.plainColor, tinted.gold, `${language}：標題其餘文字不是奶茶色`);
    assert.equal(tinted.display, 'inline', `${language}：它是句子裡的一個詞，不是整行`);
    assert.ok(tinted.sharesLineWithOtherText, `${language}：它和標題其他文字同行，沒有被當成整行`);
    if (process.env.ICON_EVIDENCE_DIR) await title.screenshot({ path: `${process.env.ICON_EVIDENCE_DIR}/contact-title-${language}.png` });
    console.log(`PASS: ${language} contact title tints only ${JSON.stringify(tinted.accent)} (${tinted.accentColor}) against ${tinted.plainColor}.`);
  }
  // 上色的詞不從中間斷開（`white-space: nowrap`），所以窄螢幕要確認它沒有撐破版面。
  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = await title.evaluate(h1 => {
    const em = h1.querySelector('em.starlit-title-accent');
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      escapesHeading: em.getBoundingClientRect().right > h1.getBoundingClientRect().right + 1,
    };
  });
  assert.equal(narrow.overflow, false, '390 寬時聯絡標題沒有造成橫向溢出');
  assert.equal(narrow.escapesHeading, false, '390 寬時上色的詞沒有超出標題欄寬');
  if (process.env.ICON_EVIDENCE_DIR) await title.screenshot({ path: `${process.env.ICON_EVIDENCE_DIR}/contact-title-en-390.png` });
  console.log('PASS: contact title at 390 keeps the tinted word inside the column, no horizontal overflow.');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: normal main preview shows five integrated inline project icons at 68/24px. closed/open computed icon colors match normalized base tints; likeness still needs visual review.');
} finally {
  await browser.close();
}
