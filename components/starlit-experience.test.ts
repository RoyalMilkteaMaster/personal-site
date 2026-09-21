import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Ticket 02 (starlit-mobile-optimization): the chapters must not depend on the
// 3D scene. Real React/DOM with the scene replaced by a recording fake through
// the existing `mountScene` prop; assertions observe what the visitor gets —
// the error, its retry, the two entries and the chapter content — and what the
// scene is commanded with. Same harness as starlit-reader.test.ts.
const root = fileURLToPath(new URL('..', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'starlit-experience-test-'));
const esbuild = createRequire(import.meta.url)('esbuild');
const { outputFiles } = await esbuild.build({
  stdin: {
    resolveDir: root,
    contents: `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import StarlitExperience, { SLOW_LOAD_MS } from './components/starlit-experience.tsx';
import { SCENE_ERROR } from './lib/fantasy/starlit-intro.mjs';

const check = (ok, message) => { if (!ok) throw new Error(message); };
const mounts = [];
const mountScene = (canvas, commands, onError) => {
  const m = { canvas, commands, onError, disposed: false };
  mounts.push(m);
  return () => { m.disposed = true; };
};
// Timers are held, not run: the slow-load wait is fired by hand and every
// pending one is accounted for at the end.
const timers = new Map(); let tid = 0;
window.setTimeout = (cb, ms, ...a) => { const id = ++tid; timers.set(id, { cb, ms, a }); return id; };
window.clearTimeout = (id) => { timers.delete(id); };
const settle = () => flushSync(() => {});
const fire = (ms) => { for (const [id, t] of [...timers]) if (t.ms === ms) { timers.delete(id); flushSync(() => t.cb(...t.a)); } settle(); };
const pending = (ms) => [...timers.values()].filter((t) => t.ms === ms).length;
const root = createRoot(document.getElementById('app'));
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const click = (el) => { check(el, 'missing element to click'); flushSync(() => el.click()); settle(); };
const shell = () => $('.starlit')?.dataset.introComplete;
const panel = () => $('[role="tabpanel"]:not([hidden])');
const alertBox = () => $('[role="alert"]');
const cmd = () => mounts[mounts.length - 1].commands();
try {
  flushSync(() => root.render(createElement(StarlitExperience, { mountScene })));
  settle();
  check(mounts.length === 1, 'scene mounted once');
  check(shell() === 'false' && $('.starlit-reader') && !alertBox(), 'opening shows the reader, no error');
  const statusLine = () => ($('output.status')?.textContent ?? '').trim();
  check(statusLine() === '正在凝聚星光…', 'status line reads loading while the scene has not reported');
  const status = () => $('output[data-scene="slow"]');
  const ready = (m) => flushSync(() => m.commands().onIntroState({ stage: 'waiting', readingStep: 0, settled: true, text: 'Royal Milktea Master', language: 'zh', paused: false, visibleChars: 0, canAdvance: true, propReveal: 0, cameraWeights: [1,0,0,0,0,0] }));

  // Reviewer A r1: the scene loads for ever without erroring. After the bounded
  // wait the opening says so and offers both chapters; nothing else changes.
  check(!status() && pending(SLOW_LOAD_MS) === 1, 'one slow-load wait armed at mount');
  fire(SLOW_LOAD_MS);
  check(status() && status().textContent.includes('星光凝聚得比平常久'), 'stalled load is identifiable, not an error');
  check(!alertBox() && !$('output[data-scene="slow"] .retry') && !$('.starlit-reader'), 'no error, no retry, reader withdrawn while stalled');
  check($('output[data-scene="slow"] button[data-pose="0"]') && $('output[data-scene="slow"] button[data-pose="1"]') && shell() === 'false', 'both entries offered while stalled');
  click($('output[data-scene="slow"] button[data-pose="1"]'));
  check(shell() === 'true' && panel() && panel().textContent.length > 50 && !status(), 'works opens from the stalled opening');
  check(cmd().contentOpen === true && cmd().pose === 1, 'scene commanded with works open');
  ready(mounts[0]); settle();
  check(shell() === 'true' && panel() && cmd().pose === 1 && !status(), 'late scene ready keeps the chosen chapter');
  click($$('.starlit-tab')[0]);
  check(cmd().pose === 0 && panel(), 'tabs switch after the late ready');
  click($('.starlit-brand'));
  check(shell() === 'false' && $('.starlit-reader') && !status() && cmd().contentOpen === false, 'replay after ready returns the normal opening');
  check(pending(SLOW_LOAD_MS) === 0 && !status(), 'a scene that has reported is never called slow');

  // 3D fails during the opening: the error stays identifiable, retry is there,
  // and the two chapters are still reachable from the error itself.
  flushSync(() => mounts[0].onError());
  settle();
  check(alertBox() && alertBox().textContent.includes(SCENE_ERROR.zh), 'error text shown');
  check(!$('.starlit-reader'), 'reader hidden while failed in the opening');
  check($('[role="alert"] button[data-pose="0"]') && $('[role="alert"] button[data-pose="1"]'), 'entries offered on failure');
  check(shell() === 'false' && !panel(), 'chapters still closed');

  click($('[role="alert"] button[data-pose="0"]'));
  check(shell() === 'true', 'about opens from the failed opening');
  check(panel() && panel().textContent.length > 50, 'about content is rendered');
  check(alertBox() && $('[role="alert"] .retry, [role="alert"] button'), 'error and retry stay visible beside the content');
  check(!$('[role="alert"] button[data-pose]'), 'entries not repeated once the chapters are open');
  check(cmd().contentOpen === true && cmd().pose === 0, 'scene commanded with content open, pose 0');

  // Retry keeps the chapter open and remounts the scene with the same commands.
  const retry = [...$$('[role="alert"] button')].find((b) => !b.dataset.pose);
  click(retry);
  check(mounts.length === 2 && mounts[0].disposed, 'retry remounts the scene');
  check(!alertBox() && shell() === 'true' && panel(), 'content stays, error cleared after retry');
  check(cmd().contentOpen === true && cmd().pose === 0, 'retried scene sees content open, pose 0');
  flushSync(() => cmd().onIntroState({ stage: 'done', readingStep: 5, settled: true, text: '', language: 'zh', paused: false, visibleChars: 0, canAdvance: false, propReveal: 1, cameraWeights: [0,0,0,0,0,1] }));
  settle();
  check(shell() === 'true' && panel(), 'scene report does not close the chapters');

  // Chapter switch through the header tabs commands the scene.
  click($$('.starlit-tab')[1]);
  check(cmd().pose === 1 && panel() && shell() === 'true', 'works chapter opened, pose 1');

  // 3D fails after the chapters are open (context lost mid-chapter): content
  // remains, chapters still switch, error + retry identifiable.
  flushSync(() => mounts[1].onError());
  settle();
  check(shell() === 'true' && panel() && panel().textContent.length > 50, 'content survives a failure after opening');
  check(alertBox() && alertBox().textContent.includes(SCENE_ERROR.zh) && !$('[role="alert"] button[data-pose]'), 'error identifiable, no entries needed');
  click($$('.starlit-tab')[0]);
  check(cmd().pose === 0 && panel(), 'chapters still switch while the scene is failed');
  click([...$$('[role="alert"] button')].find((b) => !b.dataset.pose));
  check(mounts.length === 3 && mounts[1].disposed && !alertBox() && panel(), 'retry after open keeps the chapter');
  check(cmd().contentOpen === true && cmd().pose === 0, 'retried scene commands preserved');

  // Replay from the brand returns the opening; while failed it returns the
  // error with its entries rather than an empty screen.
  const replayBefore = cmd().replay;
  click($('.starlit-brand'));
  check(shell() === 'false' && $('.starlit-reader') && !panel(), 'replay returns the opening');
  check(cmd().contentOpen === false && cmd().pose === 0 && cmd().replay === replayBefore + 1, 'replay commands the scene');
  flushSync(() => mounts[2].onError());
  settle();
  click($('[role="alert"] button[data-pose="1"]'));
  check(shell() === 'true' && cmd().pose === 1 && cmd().contentOpen === true, 'works opens from a failed replayed opening');
  click($('.starlit-brand'));
  check(shell() === 'false' && alertBox() && $('[role="alert"] button[data-pose="0"]') && !$('.starlit-reader'), 'replay while failed shows the error with entries');

  // Retry from the failed opening: the wait restarts. A failure while the
  // opening still says「loading」blanks that line (the alert carries the
  // message); the next retry stalls → 關於我 from the notice; a failure with
  // the chapter open keeps it; a late ready keeps it too.
  click([...$$('[role="alert"] button')].find((b) => !b.dataset.pose));
  check(mounts.length === 4 && !alertBox() && shell() === 'false' && pending(SLOW_LOAD_MS) === 1, 'retry restarts the slow-load wait');
  check(statusLine() === '正在凝聚星光…', 'status line reads loading again after retry');
  flushSync(() => mounts[3].onError()); settle();
  check(alertBox() && $('[role="alert"] button[data-pose="0"]') && !$('.starlit-reader'), 'failure during the silent opening shows the error with entries');
  check(statusLine() === '', 'status line goes blank while failed (the alert carries the message)');
  click([...$$('[role="alert"] button')].find((b) => !b.dataset.pose));
  check(mounts.length === 5 && shell() === 'false' && statusLine() === '正在凝聚星光…' && pending(SLOW_LOAD_MS) === 1, 'retry after that failure waits again');
  fire(SLOW_LOAD_MS);
  check(status() && $('output[data-scene="slow"] button[data-pose="0"]'), 'stalled again after retry');
  click($('output[data-scene="slow"] button[data-pose="0"]'));
  check(shell() === 'true' && cmd().pose === 0 && cmd().contentOpen === true && !status() && pending(SLOW_LOAD_MS) === 0, 'about opens from the notice; no wait while content is open');
  check(!$('output.status'), 'no opening status line once a chapter is open');
  flushSync(() => mounts[4].onError()); settle();
  check(shell() === 'true' && panel() && alertBox() && !status(), 'failure after the stalled entry is still identified with content kept');
  click([...$$('[role="alert"] button')].find((b) => !b.dataset.pose));
  check(mounts.length === 6 && !alertBox() && shell() === 'true' && pending(SLOW_LOAD_MS) === 1, 'retry is a new attempt with its own wait');
  fire(SLOW_LOAD_MS);
  check(!status() && shell() === 'true' && panel(), 'an elapsed wait shows nothing while a chapter is open');
  ready(mounts[5]); settle();
  check(shell() === 'true' && panel() && cmd().pose === 0, 'late ready keeps about');
  click($('.starlit-brand'));
  check(shell() === 'false' && $('.starlit-reader') && !status(), 'replay after a reported scene returns the reader');
  flushSync(() => mounts[5].onError()); settle();
  click([...$$('[role="alert"] button')].find((b) => !b.dataset.pose));
  check(mounts.length === 7 && shell() === 'false' && $('.starlit-reader') && !status(), 'a fresh silent attempt shows the reader until its wait runs out');
  fire(SLOW_LOAD_MS);
  check(shell() === 'false' && status() && $('output[data-scene="slow"] button[data-pose="1"]') && !$('.starlit-reader'), 'silent attempt shows the notice after its wait');
  click($('output[data-scene="slow"] button[data-pose="1"]'));
  click($('.starlit-brand'));
  check(shell() === 'false' && status() && pending(SLOW_LOAD_MS) === 0, 'replay of a still-silent scene shows the notice at once');
  ready(mounts[6]); settle();
  check(!status() && $('.starlit-reader'), 'the notice leaves as soon as the scene reports');

  flushSync(() => root.unmount());
  check(mounts.every((m) => m.disposed), 'unmount disposes every scene');
  check(pending(SLOW_LOAD_MS) === 0, 'no slow-load timer survives unmount');
  document.getElementById('result').textContent = 'PASS starlit-experience mounted behavior';
} catch (error) {
  document.getElementById('result').textContent = 'FAIL ' + error.message;
}
`,
  },
  bundle: true,
  write: false,
  format: 'iife',
  jsx: 'automatic',
  tsconfig: join(root, 'tsconfig.json'),
  plugins: [{
    name: 'stub-css',
    setup(build: { onLoad: (options: { filter: RegExp }, callback: () => { contents: string; loader: string }) => void }) {
      // CSS modules resolve every class name to itself; plain CSS becomes nothing.
      build.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default new Proxy({}, { get: (_, k) => (typeof k === "string" ? k : undefined) });', loader: 'js' }));
    },
  }],
});
const html = join(dir, 'experience.html');
writeFileSync(html, '<!doctype html><div id="app"></div><pre id="result">PENDING</pre><script>' + outputFiles[0].text.replaceAll('</script', '<\\/script') + '</script>');
const chrome = process.env.CHROME_BIN ?? join(homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome');
const output = execFileSync(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
  '--disable-background-networking', '--disable-extensions',
  '--dump-dom', pathToFileURL(html).href,
], { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
const result = output.match(/<pre id="result">([^<]*)<\/pre>/)?.[1];
assert.equal(result, 'PASS starlit-experience mounted behavior', result ?? 'Chromium did not run experience checks');
console.log(result);
