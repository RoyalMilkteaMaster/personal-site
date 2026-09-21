import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import http from 'node:http';
import { promisify } from 'node:util';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Ticket 10（starlit-mobile-optimization）：手機（≤850px）雲場改用預先算好的 alpha 貼圖，
// 桌面維持原即時 SVG。這裡釘的是公開可見的三面：資產本身（非空、透明、尺寸）、元件
// 標記（同一份 DOM 供兩種寬度）、以及真實樣式表在 headless Chrome 裡的兩種寬度行為
// （哪一層在畫、顏色／透明度／漂移是否沿用、桌面不引用貼圖）。不是 Safari、不是效能證據。
const root = fileURLToPath(new URL('..', import.meta.url));
const chrome = process.env.CHROME_BIN ?? join(homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome');
const asset = join(root, 'public/starlit-nebula-cloud.png');

// 1) 資產：PNG、1200×1500、有上限（避免誤產超大檔）。IHDR 直接讀位元組，不需解碼。
const bytes = fs.readFileSync(asset);
assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], '貼圖是 PNG');
assert.equal(bytes.readUInt32BE(16), 1200, '貼圖寬 1200');
assert.equal(bytes.readUInt32BE(20), 1500, '貼圖高 1500');
assert.ok(bytes.length > 50_000 && bytes.length < 400_000, `貼圖大小合理（${bytes.length} bytes）`);
console.log(`asset: 1200x1500 PNG, ${bytes.length} bytes`);

// 2) 標記：Node 不能直接載入 .tsx，沿用 shell 測試的 esbuild 打包方式。
const esbuild = createRequire(import.meta.url)('esbuild');
const outfile = `${root}node_modules/.cache/starlit-ticket-10-build/nebula-test.mjs`;
type PluginBuild = {
  onResolve(options: { filter: RegExp }, callback: () => unknown): void;
  onLoad(options: { filter: RegExp; namespace: string }, callback: () => unknown): void;
};
await esbuild.build({
  entryPoints: [`${root}components/starlit-nebula.tsx`],
  outfile, bundle: true, format: 'esm', jsx: 'automatic', packages: 'external', tsconfig: `${root}tsconfig.json`,
  plugins: [{ name: 'stub-css', setup(build: PluginBuild) {
    build.onResolve({ filter: /\.css$/ }, () => ({ path: 'css', namespace: 'stub' }));
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: '', loader: 'js' }));
  } }],
});
const { default: StarlitNebula } = await import(pathToFileURL(outfile).href);
const markup = renderToStaticMarkup(createElement(StarlitNebula, { hostRef: { current: null }, active: true }));
assert.match(markup, /^<div class="starlit-nebula" aria-hidden="true"><svg class="starlit-nebula-field starlit-nebula-dark"/, '暗雲 svg 仍是第一個孩子（桌面路徑不變）');
assert.match(markup, /<\/svg><div class="starlit-nebula-field starlit-nebula-texture starlit-nebula-dark"><\/div><div class="starlit-nebula-reactive">/, '暗雲貼圖是 svg 的下一個兄弟，沿用 field＋dark 類別');
assert.match(markup, /<div class="starlit-nebula-light"><svg class="starlit-nebula-field"[^]*?<\/svg><div class="starlit-nebula-field starlit-nebula-texture"><\/div><\/div><div class="starlit-nebula-stars">/, '亮雲貼圖在 light 內、svg 之後，沿用 field 類別');
assert.equal((markup.match(/<svg /g) ?? []).length, 2, '仍只有暗／亮兩張 svg');
assert.equal((markup.match(/starlit-nebula-texture/g) ?? []).length, 2, '只有兩個貼圖層');
assert.equal((markup.match(/<feTurbulence/g) ?? []).length, 1, '濾鏡定義只在暗雲 svg 一份');
assert.equal((markup.match(/class="starlit-nebula-star"/g) ?? []).length, 64, '64 顆星不變');
assert.ok(markup.endsWith('<div class="starlit-nebula-far"></div></div>'), '遠星層不變');
console.log('markup: same DOM for both widths, two texture layers beside the two svgs: ok');

// 3) 真實樣式表在 headless Chrome 裡：402（iPhone 17 邏輯寬）與 1024。
const css = fs.readFileSync(`${root}components/starlit-nebula.css`, 'utf8');
assert.equal((css.match(/starlit-nebula-cloud\.png/g) ?? []).length, 2, '貼圖 URL 只出現在手機規則（標準＋-webkit-）');
const png = bytes.toString('base64');
const run = (extraArgs: string[]) => {
  const dir = fs.mkdtempSync(join(tmpdir(), 'starlit-nebula-texture-'));
  const script = `
    const markup = ${JSON.stringify(markup)};
    const css = ${JSON.stringify(css)};
    const check = (ok, why) => { if (!ok) throw Error(why); };
    const out = {};
    // 3a) 資產：非空、透明底、四角透明（canvas 只吃 data URL，避免 file:// 污染）。
    const img = new Image();
    const assetDone = new Promise((resolve) => { img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let opaque = 0, clear = 0, max = 0;
      for (let p = 3; p < d.length; p += 4) { if (d[p] > 0) opaque++; else clear++; if (d[p] > max) max = d[p]; }
      const corners = [[0, 0], [c.width - 1, 0], [0, c.height - 1], [c.width - 1, c.height - 1]].map(([x, y]) => d[(y * c.width + x) * 4 + 3]);
      out.asset = { opaque, clear, max, corners };
      const total = d.length / 4;
      check(opaque > total * 0.1 && opaque < total * 0.9, 'texture is neither empty nor solid: ' + opaque + '/' + total);
      check(clear > total * 0.1, 'texture keeps transparent background');
      check(corners.every((a) => a === 0), 'corners transparent');
      resolve();
    }; });
    img.src = 'data:image/png;base64,${png}';
    // 3b) 兩種寬度各一個 iframe，載入真實樣式表與真實標記。
    const widths = [402, 1024];
    let pending = widths.length;
    const frames = {};
    for (const w of widths) {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'border:0;width:' + w + 'px;height:900px';
      frame.onload = () => { frames[w] = frame; if (--pending === 0) finish(); };
      frame.srcdoc = '<!doctype html><meta charset="utf-8"><style>body{margin:0}.host{position:relative;width:100%;height:2000px}' + css + '</style><div class="host">' + markup + '</div>';
      document.body.append(frame);
    }
    const finish = () => assetDone.then(() => {
      for (const w of widths) {
        const d = frames[w].contentDocument, win = frames[w].contentWindow;
        const cs = (el) => win.getComputedStyle(el);
        const layer = d.querySelector('.starlit-nebula');
        const svgs = [...d.querySelectorAll('svg.starlit-nebula-field')];
        const textures = [...d.querySelectorAll('.starlit-nebula-texture')];
        const [darkTexture, lightTexture] = textures;
        const mobile = w <= 850;
        const label = w + 'px: ';
        check(svgs.length === 2 && textures.length === 2, label + 'two svgs and two textures');
        check(svgs.every((s) => (cs(s).display === 'none') === mobile), label + (mobile ? 'svgs hidden' : 'svgs shown'));
        check(textures.every((t) => (cs(t).display === 'none') === !mobile), label + (mobile ? 'textures shown' : 'textures hidden'));
        check(textures.every((t) => cs(t).maskImage.includes('starlit-nebula-cloud.png') === mobile), label + (mobile ? 'texture masks by the png' : 'no rule references the png'));
        check((cs(d.querySelector('.starlit-nebula-light')).maskImage.includes('radial-gradient')), label + 'light halo mask unchanged');
        if (!mobile) continue;
        // 顏色／透明度／漂移沿用同一組選擇器，與原 svg 相同。
        check(cs(darkTexture).backgroundColor === 'rgb(136, 132, 168)' && cs(darkTexture).opacity === '0.07', label + 'dark texture #8884a8 @ .07');
        check(cs(lightTexture).backgroundColor === 'rgb(224, 196, 157)' && cs(lightTexture).opacity === '0.24', label + 'light texture #e0c49d @ .24');
        check(textures.every((t) => cs(t).maskSize === '100% 100%' && cs(t).maskRepeat === 'no-repeat'), label + 'mask stretched like preserveAspectRatio=none');
        const rect = darkTexture.getBoundingClientRect(), host = d.querySelector('.host').getBoundingClientRect();
        check(rect.width === host.width && rect.height === host.height && host.height === 2000, label + 'texture fills the host: ' + rect.width + 'x' + rect.height + ' vs ' + host.width + 'x' + host.height);
        check(cs(darkTexture).position === 'absolute', label + 'texture positioned like the svg');
        const reduced = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
        out.reduced = reduced;
        if (reduced) {
          check(textures.every((t) => cs(t).animationName === 'none'), label + 'reduced motion: no drift on textures');
        } else {
          check(textures.every((t) => cs(t).animationName === 'starlit-nebula-drift' && cs(t).animationPlayState === 'paused'), label + 'drift keyframes on textures, paused until attached');
          layer.dataset.running = 'true';
          check(textures.every((t) => cs(t).animationPlayState === 'running'), label + 'data-running starts the texture drift');
          check(cs(d.querySelector('.starlit-nebula-stars')).animationPlayState === 'running', label + 'star drift unchanged');
          layer.dataset.running = 'false';
          check(textures.every((t) => cs(t).animationPlayState === 'paused'), label + 'pause again');
        }
        layer.hidden = true;
        check(cs(layer).display === 'none', label + '[hidden] still hides the whole layer');
        layer.hidden = false;
      }
      document.getElementById('result').textContent = 'PASS ' + JSON.stringify(out);
    }).catch((e) => { document.getElementById('result').textContent = 'FAIL ' + e.message; });
  `;
  const file = join(dir, 'texture.html');
  fs.writeFileSync(file, '<!doctype html><pre id="result">PENDING</pre><script>' + script.replaceAll('</script', '<\\/script') + '</script>');
  const output = execFileSync(chrome,
    ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--virtual-time-budget=3000', '--dump-dom', ...extraArgs, pathToFileURL(file).href],
    { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  const result = output.match(/<pre id="result">([^<]*)<\/pre>/)?.[1] ?? 'no result';
  assert.match(result, /^PASS /, result);
  return JSON.parse(result.slice(5));
};
const normal = run([]);
assert.equal(normal.reduced, false);
console.log(`real CSS 402/1024: mobile texture, desktop svg, asset alpha ${JSON.stringify(normal.asset)}: ok`);
const reduced = run(['--force-prefers-reduced-motion']);
assert.equal(reduced.reduced, true, 'Chrome honoured --force-prefers-reduced-motion');
console.log('real CSS 402 reduced motion: texture drift off: ok');

// 4) 真的畫出來：同源 HTTP 提供真實樣式表、標記與 /starlit-nebula-cloud.png（Chrome 以 CORS
//    抓遮罩圖，file:// 會被擋，所以要走 HTTP），402px 截圖：手機貼圖路徑 vs 拿掉手機規則後
//    的 svg 路徑，逐像素比對。雲場、固定光暈、星點都在畫面裡；差異須極小、且畫面確有雲。
//    貼圖是 tsx 幾何的衍生資產，沒有其他綁定，所以這條門檻同時是「改了幾何忘了重跑
//    scripts/render-nebula-cloud.mjs」的防線：同一次再截一張把主雲帶線寬 +40（現行 110→150）的 svg
//    路徑，證明門檻真的擋得住過期貼圖（Reviewer B：門檻 0.5 時 0.118 會漏過）。
//    基準值在 1400／2581 兩種 host 高度、多次執行皆為 0.016，門檻 0.05 留 3 倍餘裕。
{
  const MEAN_LIMIT = 0.05, MAX_LIMIT = 16;
  const noTexture = css.replace(/@media \(max-width: 850px\) \{\n  svg\.starlit-nebula-field[^]*?\n\}\n/, '');
  assert.notEqual(noTexture, css, '找得到手機貼圖規則才能做對照');
  // 過期幾何樣本：field 內第一條（主雲帶）線寬 +40，不寫死現值，改幾何後仍能做對照。
  const staleMarkup = markup.replace(/(<g id="[^"]*-field"[^]*?stroke-width=")(\d+)"/, (_, head, w) => `${head}${Number(w) + 40}"`);
  assert.notEqual(staleMarkup, markup, '找得到主雲帶線寬才能做過期幾何對照');
  const page = (style: string, body: string) => `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#080c19}.host{position:relative;width:100%;height:1400px}${style}
.starlit-nebula-light{opacity:1;--nebula-x:200px;--nebula-y:700px;--nebula-radius:190px}</style><div class="host">${body}</div>`;
  const server = http.createServer((req, res) => {
    if (req.url === '/starlit-nebula-cloud.png') { res.setHeader('content-type', 'image/png'); res.end(bytes); return; }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(req.url === '/texture' ? page(css, markup) : page(noTexture, req.url === '/svg-stale' ? staleMarkup : markup));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const dir = fs.mkdtempSync(join(tmpdir(), 'starlit-nebula-paint-'));
  const shot = async (name: string) => {
    const file = join(dir, `${name}.png`);
    // 非同步 spawn：同一個 Node 程序要同時回應 HTTP 請求。
    await promisify(execFile)(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--window-size=402,1400', '--virtual-time-budget=3000', `--screenshot=${file}`, `${base}/${name}`], { timeout: 60000 });
    return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
  };
  try {
    const [texture, svg, stale] = [await shot('texture'), await shot('svg'), await shot('svg-stale')];
    const file = join(dir, 'diff.html');
    fs.writeFileSync(file, `<!doctype html><pre id="result">PENDING</pre><script>
const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
Promise.all([load('${texture}'), load('${svg}'), load('${stale}')]).then(([a, b, c]) => {
  const px = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
  const A = px(a);
  const diff = (B) => { let sum = 0, max = 0; for (let i = 0; i < A.length; i += 4) { const d = Math.abs((A[i] + A[i+1] + A[i+2]) / 3 - (B[i] + B[i+1] + B[i+2]) / 3); sum += d; if (d > max) max = d; } return { meanAbsDiff: +(sum / (A.length / 4)).toFixed(3), maxDiff: +max.toFixed(2) }; };
  let bright = 0; for (let i = 0; i < A.length; i += 4) if ((A[i] + A[i+1] + A[i+2]) / 3 > 20) bright++;
  document.getElementById('result').textContent = JSON.stringify({ size: a.width + 'x' + a.height, brightShare: +(bright / (A.length / 4)).toFixed(4), svg: diff(px(b)), stale: diff(px(c)) });
}).catch((e) => { document.getElementById('result').textContent = 'FAIL ' + e.message; });
</script>`);
    const output = execFileSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom', pathToFileURL(file).href], { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    const result = output.match(/<pre id="result">([^<]*)<\/pre>/)?.[1] ?? 'no result';
    assert.match(result, /^\{/, result);
    const paint = JSON.parse(result);
    assert.equal(paint.size, '402x1400');
    assert.ok(paint.brightShare > 0.01, `貼圖路徑真的畫出雲（背景 #080c19 之上有亮處，share=${paint.brightShare}）`);
    assert.ok(paint.svg.meanAbsDiff < MEAN_LIMIT && paint.svg.maxDiff < MAX_LIMIT, `貼圖與現行 svg 幾何幾乎相同（mean=${paint.svg.meanAbsDiff}, max=${paint.svg.maxDiff} / 255）；若剛改過 tsx 雲幾何，請重跑 scripts/render-nebula-cloud.mjs`);
    assert.ok(paint.stale.meanAbsDiff >= MEAN_LIMIT, `同一門檻須擋住過期幾何（主雲帶線寬 +40 對現行貼圖 mean=${paint.stale.meanAbsDiff}）`);
    console.log(`real paint 402 via HTTP: texture vs svg mean ${paint.svg.meanAbsDiff}, max ${paint.svg.maxDiff}, bright ${paint.brightShare}; stale geometry mean ${paint.stale.meanAbsDiff} rejected by ${MEAN_LIMIT}: ok`);
  } finally {
    server.close();
  }
}
