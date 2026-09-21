import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Ticket 09: the opt-in nebula diagnostic. Real React/DOM in headless Chromium
// through the existing `mountScene` fake (same harness as
// starlit-experience.test.ts). The chapter is entered through the scene-error
// entry buttons — a test seam, not the visitor's normal navigation. rAF is
// replaced by a fake stream with chosen timestamps so a 10 s trial is quick and
// its statistics are known; nothing here is a performance claim.
const root = fileURLToPath(new URL('..', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'starlit-nebula-diag-test-'));
const esbuild = createRequire(import.meta.url)('esbuild');
const { outputFiles } = await esbuild.build({
  stdin: {
    resolveDir: root,
    contents: `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import StarlitExperience from './components/starlit-experience.tsx';
import { TRIAL_MS } from './lib/nebula-diagnostic.ts';

const check = (ok, message) => { if (!ok) throw new Error(message); };
const mounts = [];
const mountScene = (canvas, commands, onError) => { const m = { canvas, commands, onError }; mounts.push(m); return () => {}; };
// One fake rAF stream: 16 ms apart, with gaps queued by the test.
let vt = 0; const gaps = [];
window.requestAnimationFrame = (fn) => setTimeout(() => fn(vt += gaps.shift() ?? 16), 0);
window.cancelAnimationFrame = (id) => clearTimeout(id);
const settle = () => flushSync(() => {});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const click = (el) => { check(el, 'missing element to click'); flushSync(() => el.click()); settle(); };
const button = (text) => $$('.starlit-diag button').find((b) => b.textContent === text);
const nebula = () => $('.starlit-nebula');
const scroll = (n) => { for (let i = 0; i < n; i++) { document.dispatchEvent(new Event('touchmove')); document.dispatchEvent(new Event('scroll')); } };
// Past the trial's settle phase on the fake clock (input inside it is discarded by design).
const settled = async () => { const s = vt; while (vt < s + 600) await wait(0); };
const untilIdle = async () => { for (let i = 0; i < 2000 && $('.starlit-diag[data-running="true"]'); i++) await wait(0); settle(); };
const diag = location.search.includes('nebula-diag=1');
const simple = location.search.includes('nebula-diag=off');
(async () => {
  try {
    const appRoot = createRoot(document.getElementById('app'));
    flushSync(() => appRoot.render(createElement(StarlitExperience, { mountScene })));
    settle(); await wait(0); settle();
    if (simple) {
      // r3 simple mode: the status bar is there from the opening, nothing else.
      check($('.starlit-diag') && $('.starlit-diag').textContent.includes('星雲已暫停（測試）') && button('恢復星雲') && !button('開始') && !$('.starlit-diag-note'), 'simple mode shows only the paused status and restore button during the opening');
    }
    // Enter About through the scene-error entries (test seam).
    flushSync(() => mounts[0].onError()); settle();
    click($('[role="alert"] button[data-pose="0"]'));
    check($('.starlit')?.dataset.introComplete === 'true' && nebula(), 'chapter open with the nebula layer mounted');
    if (simple) {
      // Never attached in this mode, so data-running is absent rather than 'false'.
      check(nebula().hidden && nebula().dataset.running !== 'true', 'simple mode: nebula paused on chapter entry through the visible seam (layer display:none, attachNebula never ran)');
      check(!button('開始') && !button('複製結果') && !$('[data-blank-question]'), 'simple mode renders none of the comparison UI');
      click(button('恢復星雲'));
      check(!nebula().hidden && nebula().dataset.running === 'true' && $('.starlit-diag').textContent.includes('星雲已恢復（正常效果）') && button('再次暫停'), 'restore brings the nebula back and says so');
      click(button('再次暫停'));
      check(nebula().hidden && nebula().dataset.running === 'false' && $('.starlit-diag').textContent.includes('星雲已暫停（測試）'), 're-pause works');
      document.getElementById('result').textContent = 'PASS simple pause mode';
      return;
    }
    check(!nebula().hidden && nebula().dataset.running === 'true', 'nebula attached by default');
    if (!diag) {
      check(!$('.starlit-diag'), 'no diagnostic panel without the query flag');
      document.getElementById('result').textContent = 'PASS normal route unaffected';
      return;
    }
    const panel = () => $('.starlit-diag');
    check(panel() && panel().textContent.includes('星雲診斷'), 'panel present with the flag');
    check(button('開始') && button('結束並恢復') && !button('複製結果'), 'start and exit only before any result');
    // 3D visible (the canvas is in the flow): start is refused with a hint.
    await wait(50); settle();
    click(button('開始'));
    check(!panel().dataset.running || panel().dataset.running === 'false', 'not running while 3D is visible');
    check(panel().textContent.includes('3D 完全捲出畫面'), 'hint asks to scroll the 3D away');
    check(nebula().dataset.running === 'true', 'refused start leaves the nebula attached');
    // Take the canvas out of view: IntersectionObserver reports not intersecting.
    const canvas = $('.starlit-stage canvas');
    canvas.style.display = 'none';
    for (let i = 0; i < 100 && panel().textContent.includes('畫面內'); i++) { await wait(10); settle(); }
    check(panel().textContent.includes('3D：畫面外'), '3D reported offscreen');

    // Step 1 = on. Real scroll events, one 120 ms gap; ends by rAF timestamps.
    click(button('開始'));
    check(panel().dataset.running === 'true' && panel().textContent.includes('第1段 星雲開啟'), 'step 1 running with the nebula on');
    check(!nebula().hidden && nebula().dataset.running === 'true', 'on: layer mounted and listeners attached');
    // The gap is queued once the trial has its first frame (other rAF users
    // share the fake stream, so a trial interval may include their frames).
    await settled(); gaps.push(120); scroll(30);
    await untilIdle();
    check(panel().textContent.includes('本輪 1/4（第 1 輪）') && panel().textContent.includes('第2段 星雲暫停'), 'step 1 valid, next is off');
    check(button('複製結果') && $('.starlit-diag-text').value.includes('第1段 開啟 有效'), 'summary text lists step 1');
    const longest = Number($('.starlit-diag-text').value.match(/最長 ([\\d.]+)ms/)?.[1]);
    const scrolls = Number($('.starlit-diag-text').value.match(/scroll (\\d+)/)?.[1]);
    check(longest >= 120 && scrolls >= 30 && $('.starlit-diag-text').value.includes('>100ms 1'), 'summary carries the gap and the scroll count: longest=' + longest + ' scrolls=' + scrolls + ' ' + $('.starlit-diag-text').value);
    check($('[data-blank-question]'), 'blank-screen question asked after the step');
    click(button('有'));
    check(!$('[data-blank-question]') && $('.starlit-diag-text').value.includes('內容空白 有'), 'blank answer recorded in the summary');

    // Step 2 = off: the layer is hidden and attachNebula is detached.
    click(button('開始'));
    check(panel().textContent.includes('第2段 星雲暫停'), 'step 2 running with the nebula paused');
    check(nebula().hidden && nebula().dataset.running === 'false', 'off: layer hidden and listeners detached');
    const host = $('.starlit-glow-host');
    host.dispatchEvent(Object.assign(new Event('touchstart', { bubbles: true }), { touches: [{ clientX: 50, clientY: 50 }] }));
    await wait(0); settle();
    check($('.starlit-nebula-light').style.opacity !== '1', 'touch while paused does not light the nebula');
    // No scroll at all: the window runs out and the step is invalid.
    await untilIdle();
    check(panel().textContent.includes('本輪 1/4') && panel().textContent.includes('此段無效：沒有實際捲動'), 'no-scroll step invalid and retried');
    // Scroll without touch (wheel / programmatic): invalid under the phone protocol.
    click(button('開始')); await settled();
    for (let i = 0; i < 5; i++) document.dispatchEvent(new Event('scroll'));
    await untilIdle();
    check(panel().textContent.includes('此段無效：沒有實際手指滑動'), 'scroll without touch is invalid');
    check($('.starlit-diag-text').value.includes('第2段 暫停 無效（沒有實際捲動）'), 'invalid step kept in the summary');
    // Manual stop is invalid too.
    click(button('開始')); scroll(5); click(button('停止'));
    check(panel().textContent.includes('此段無效：手動停止'), 'manual stop invalidates');
    check(nebula().hidden, 'stopping keeps the current (paused) mode until the next step or exit');
    // 3D scrolling back into view during a trial invalidates it.
    click(button('開始')); scroll(5);
    canvas.style.display = '';
    for (let i = 0; i < 100 && panel().dataset.running === 'true'; i++) { await wait(10); settle(); }
    check(panel().textContent.includes('此段無效：3D 進入畫面'), '3D becoming visible invalidates');
    canvas.style.display = 'none';
    for (let i = 0; i < 100 && panel().textContent.includes('畫面內'); i++) { await wait(10); settle(); }
    // Reviewer A: a scene retry replaces the canvas (key={attempt}). The gate
    // must follow the new node instead of the detached one reporting offscreen.
    click([...document.querySelectorAll('[role="alert"] button')].find((b) => !b.dataset.pose));
    const canvas2 = $('.starlit-stage canvas');
    check(canvas2 && canvas2 !== canvas && !canvas.isConnected, 'retry mounted a new canvas');
    for (let i = 0; i < 100 && panel().textContent.includes('畫面外'); i++) { await wait(10); settle(); }
    check(panel().textContent.includes('3D：畫面內'), 'new canvas in view is reported visible');
    click(button('開始'));
    check(panel().dataset.running !== 'true' && panel().textContent.includes('3D 完全捲出畫面'), 'start refused against the new canvas');
    canvas2.style.display = 'none';
    for (let i = 0; i < 100 && panel().textContent.includes('畫面內'); i++) { await wait(10); settle(); }
    check(panel().textContent.includes('3D：畫面外'), 'new canvas hidden is reported offscreen');
    // Blank question is still answerable for an earlier unanswered step.
    check($('[data-blank-question] legend'), 'blank question grouped with its legend');

    // Copy: clipboard rejects → manual fallback with the text selected.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    click(button('複製結果'));
    await wait(0); settle();
    check(panel().textContent.includes('無法自動複製'), 'clipboard failure shows the manual hint');
    const area = $('.starlit-diag-text');
    check(area.selectionEnd - area.selectionStart === area.value.length && area.value.includes('rAF 間隔不是 GPU 耗時'), 'summary selected for manual copy, with the limitation line');
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });
    click(button('複製結果'));
    await wait(0); settle();
    check(button('已複製'), 'clipboard success acknowledged');

    // Exit: with results not yet copied it asks once; copied results exit at once.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    click(button('開始')); click(button('停止')); // a new uncopied result
    click(button('結束並恢復'));
    check($('.starlit-diag') && button('再按一次結束') && panel().textContent.includes('結果尚未複製'), 'first exit press asks for confirmation');
    click(button('再按一次結束'));
    check(!$('.starlit-diag'), 'panel gone after confirmed exit');
    check(!nebula().hidden && nebula().dataset.running === 'true', 'exit restores the nebula layer and its listeners');
    document.getElementById('result').textContent = 'PASS nebula diagnostic behavior';
  } catch (error) {
    document.getElementById('result').textContent = 'FAIL ' + error.message;
  }
})();
`,
  },
  bundle: true,
  write: false,
  format: 'iife',
  charset: 'utf8',
  jsx: 'automatic',
  tsconfig: join(root, 'tsconfig.json'),
  plugins: [{
    name: 'stub-css',
    setup(build: { onLoad: (options: { filter: RegExp }, callback: () => { contents: string; loader: string }) => void }) {
      build.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default new Proxy({}, { get: (_, k) => (typeof k === "string" ? k : undefined) });', loader: 'js' }));
    },
  }],
});
const html = join(dir, 'diagnostic.html');
writeFileSync(html, '<!doctype html><div id="app"></div><pre id="result">PENDING</pre><script>' + outputFiles[0].text.replaceAll('</script', '<\\/script') + '</script>');
// Playwright lives in the coordinator's e2e project (as in the Ticket 08 browser
// test): real rendering frames are needed for IntersectionObserver delivery,
// which `--dump-dom` with a virtual time budget never runs.
const { chromium } = createRequire(process.env.PLAYWRIGHT_ROOT || '/home/leslie/coordinator-e2e/package.json')('playwright');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || join(homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'),
  headless: true,
  args: ['--no-sandbox'],
});
const run = async (query: string) => {
  const page = await browser.newPage({ viewport: { width: 402, height: 681 } });
  page.on('pageerror', (e: Error) => console.error('pageerror', e));
  await page.goto(pathToFileURL(html).href + query);
  await page.waitForFunction(() => document.getElementById('result')?.textContent !== 'PENDING', null, { timeout: 90000 });
  const result = await page.evaluate(() => document.getElementById('result')?.textContent);
  await page.close();
  return result;
};
try {
  const normal = await run('');
  assert.equal(normal, 'PASS normal route unaffected', normal ?? 'Chromium did not run the normal-route check');
  console.log(normal);
  const diagnostic = await run('?nebula-diag=1');
  assert.equal(diagnostic, 'PASS nebula diagnostic behavior', diagnostic ?? 'Chromium did not run the diagnostic checks');
  console.log(diagnostic);
  const simple = await run('?nebula-diag=off');
  assert.equal(simple, 'PASS simple pause mode', simple ?? 'Chromium did not run the simple-mode checks');
  console.log(simple);
} finally {
  await browser.close();
}
