import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Real React/DOM, isolated from expensive WebGL. Only the external clock is
// controlled; assertions observe painted words, buttons and scroll position.
// Uses the existing WSL Chromium cache; no server or added test framework.
const root = fileURLToPath(new URL('..', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'starlit-reader-test-'));
const esbuild = createRequire(import.meta.url)('esbuild');
const { outputFiles } = await esbuild.build({
  stdin: {
    resolveDir: root,
    contents: `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { StarlitReader } from './components/starlit-shell.tsx';

const check = (ok, message) => { if (!ok) throw new Error(message); };
let time = 0, timerId = 0;
const timers = new Map();
Date.now = () => time;
window.setInterval = (callback, delay) => {
  const id = ++timerId;
  timers.set(id, { callback, delay, at: time + delay });
  return id;
};
window.clearInterval = id => timers.delete(id);
const advance = milliseconds => {
  const end = time + milliseconds;
  while (timers.size) {
    const next = Math.min(...[...timers.values()].map(t => t.at));
    if (next > end) break;
    time = next;
    flushSync(() => {
      for (const timer of [...timers.values()]) if (timer.at <= time) {
        timer.at += timer.delay;
        timer.callback();
      }
    });
  }
  time = end;
};
const root = createRoot(document.getElementById('reader'));
let props = { step: 2, settled: true, paused: false, language: 'zh', replay: 0 };
const draw = changes => {
  props = { ...props, ...changes };
  flushSync(() => root.render(createElement(StarlitReader, {
    ...props,
    text: props.step === 2 ? '我追求\\n技藝\\n自由\\n極限' : '我是皇家奶茶大師。\\n一位創作者。',
    onStepChange: step => draw({ step }), onEnter: () => {},
  })));
};
const word = () => document.querySelector('.starlit-keywords > [data-on="true"]')?.textContent ?? null;
const ink = () => document.querySelectorAll('.starlit-ink[data-on="true"]').length;
const scroll = () => document.querySelector('.starlit-reader');
const click = (target = scroll(), button = 0, stamp) => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button });
  if (stamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: stamp });
  flushSync(() => target.dispatchEvent(event));
};
const visit = (step, changes = {}) => {
  draw({ step, settled: true, paused: false, ...changes });
  scroll().scrollTop = step * 100;
};
const blocked = message => {
  const before = scroll().scrollTop;
  click(); click();
  check(scroll().scrollTop === before, message);
};
try {
  draw({});
  scroll().scrollTop = 200;
  check(word() === null, 'pursuit starts blank');
  blocked('pursuit starts gated');
  // Ticket 34-B: the beat is 4000ms now (was 5000). Lead = first 20% = 800ms,
  // then the three words share the remaining 3200ms equally (~1067ms each):
  // 技藝 800–1867, 自由 1867–2933, 極限 2933–4000. Checkpoints sit inside each
  // window on 80ms ticks; the gate opens at 4000.
  advance(880);
  check(document.querySelectorAll('.starlit-pursue-lead .starlit-ink[data-on="true"]').length === 3, 'pursuit lead finishes near 0.8s');
  advance(720);
  check(word() === '技藝', 'craft remains readable at 1.6s');
  blocked('craft does not unlock pursuit');
  advance(800);
  check(word() === '自由', 'freedom is readable at 2.4s');
  advance(1120);
  check(word() === '極限', 'limits is readable at 3.5s');
  advance(400);
  blocked('pursuit cannot unlock before four seconds');
  advance(80);
  draw({ settled: false });
  blocked('travelling closes completed gate');
  draw({ settled: true, paused: true });
  blocked('paused scene closes completed gate');
  draw({ paused: false });
  click();
  check(scroll().scrollTop === 300, 'finished pursuit left click advances one beat');
  click();
  check(scroll().scrollTop === 300, 'repeated click cannot reuse prior permission');

  visit(1, { settled: false });
  visit(2);
  check(word() === null && ink() === 0, 'quick return resets pursuit');
  // Ticket 34-B: 1600ms sits inside the 技藝 window (800–1867) of the 4000ms beat.
  advance(1600);
  draw({ paused: true });
  const held = ink();
  advance(6000);
  check(word() === '技藝' && ink() === held, 'background time cannot consume reveal');
  blocked('background stays gated');
  draw({ paused: false, language: 'en' });
  advance(1040);
  check(word() === '自由', 'language change keeps elapsed progress');
  blocked('language change cannot unlock early');
  advance(2000);
  click();
  check(scroll().scrollTop === 300, 'resumed visit finishes with remaining time');

  visit(0, { replay: 1 });
  for (let beat = 0; beat < 5; beat++) {
    if (beat) visit(beat);
    if (beat) {
      const premature = performance.now();
      blocked('premature burst is refused at beat ' + beat);
      if (beat !== 2) {
        advance(2000);
        blocked('modestly slower reveal remains gated at old deadline');
        // Ticket 26 lengthened the introduction beat only; the rest keep 2400ms.
        // Beat 1 is checked at the old 2400ms deadline as well, so shortening the
        // introduction back to REVEAL_MS fails here instead of passing silently.
        if (beat === 1) {
          advance(400);
          blocked('lengthened introduction is still gated at the old 2400ms');
        }
        advance(400);
      } else advance(4080); // Ticket 34-B: pursuit opens at 4000ms now; 4080 is the first tick past it.
      check(scroll().scrollTop === beat * 100, 'premature clicks are not queued');
      click(scroll(), 0, premature);
      check(scroll().scrollTop === beat * 100, 'delayed premature event is refused');
    }
    click(scroll(), 1); click(scroll(), 2);
    check(scroll().scrollTop === beat * 100, 'only left click advances');
    // Controls bubble through the same reading surface but own their click.
    for (const tag of ['button', 'a', 'input', 'select', 'textarea']) {
      const control = document.createElement(tag);
      scroll().append(control); click(control); control.remove();
      check(scroll().scrollTop === beat * 100, tag + ' does not advance');
    }
    const text = document.querySelector('.starlit-beat[data-beat="' + beat + '"] .starlit-copy-inner');
    click(beat % 2 ? text : scroll());
    check(scroll().scrollTop === (beat + 1) * 100, 'finished background/text click advances at beat ' + beat);
    click(); click();
    check(scroll().scrollTop === (beat + 1) * 100, 'burst advances only one beat');
  }
  visit(5); advance(2400);
  blocked('ending background retains entry choice');
  check(!document.querySelector('.starlit-reading-hint'), 'visual hint row is removed');
  visit(1); advance(2800); visit(2, { settled: false }); visit(1);
  check(ink() === 0, 'intro replays on return');
  blocked('returned intro needs fresh reveal');
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowUp',bubbles:true}));
  check(scroll().scrollTop === 0, 'keyboard back works before reveal completes');
  visit(2);
  document.dispatchEvent(new WheelEvent('wheel', {deltaY:-100,bubbles:true,cancelable:true}));
  check(scroll().scrollTop === 100, 'wheel back works before reveal completes');
  visit(2);
  const touch = y => new Touch({identifier:1,target:scroll(),clientY:y});
  document.dispatchEvent(new TouchEvent('touchstart',{touches:[touch(100)],bubbles:true}));
  document.dispatchEvent(new TouchEvent('touchmove',{touches:[touch(200)],bubbles:true}));
  document.dispatchEvent(new TouchEvent('touchend',{touches:[],bubbles:true}));
  check(scroll().scrollTop === 100, 'touch back works before reveal completes');
  visit(0, { replay: 2 }); advance(6000);
  check(scroll().scrollTop === 0, 'replay stays at opening');
  visit(1); advance(2800); click();
  check(scroll().scrollTop === 200, 'click requests next beat before scroll callback');
  scroll().style.height = '200px';
  document.querySelectorAll('.starlit-scroll-step').forEach(n => n.style.height = '200px');
  window.dispatchEvent(new Event('resize'));
  check(scroll().scrollTop === 400, 'same-frame resize preserves requested beat before prop catches up');
  flushSync(() => root.unmount());
  document.getElementById('result').textContent = 'PASS starlit-reader mounted behavior';
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
    name: 'omit-layout-css',
    setup(build: { onLoad: (options: { filter: RegExp }, callback: () => { contents: string; loader: string }) => void }) {
      build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
    },
  }],
});
const html = join(dir, 'reader.html');
writeFileSync(html, '<!doctype html><style>.starlit-reader{height:100px;overflow:hidden}.starlit-scroll-step{height:100px}</style><div id="reader"></div><pre id="result">PENDING</pre><script>' + outputFiles[0].text.replaceAll('</script', '<\\/script') + '</script>');
const chrome = process.env.CHROME_BIN ?? join(homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome');
const output = execFileSync(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
  '--disable-background-networking', '--disable-extensions',
  '--dump-dom', pathToFileURL(html).href,
], { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024 });
const result = output.match(/<pre id="result">([^<]*)<\/pre>/)?.[1];
assert.equal(result, 'PASS starlit-reader mounted behavior', result ?? 'Chromium did not run reader checks');
console.log(result);
