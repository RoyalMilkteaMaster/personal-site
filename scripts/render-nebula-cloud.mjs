// Ticket 10：從 components/starlit-nebula.tsx 的同一份雲場幾何，離線算出手機用的
// 透明 alpha 貼圖 public/starlit-nebula-cloud.png。只存形狀（白描邊、透明底），
// 顏色與透明度仍由 starlit-nebula.css 決定。桌面不用此檔，仍用即時 SVG。
//   node scripts/render-nebula-cloud.mjs            # 預設 1200×1500（viewBox 800×1000 的 1.5×）
//   CHROME_BIN=/path/to/chrome node scripts/render-nebula-cloud.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const width = Number(process.env.NEBULA_WIDTH ?? 1200);
const height = Number(process.env.NEBULA_HEIGHT ?? 1500);
const out = join(root, 'public/starlit-nebula-cloud.png');

// 同 starlit-shell.test.ts：Node 不能直接載入 .tsx，先用 esbuild 打包到專案內快取。
const esbuild = createRequire(import.meta.url)('esbuild');
const outfile = join(root, 'node_modules/.cache/starlit-ticket-10-build/nebula.mjs');
mkdirSync(join(outfile, '..'), { recursive: true });
await esbuild.build({
  entryPoints: [join(root, 'components/starlit-nebula.tsx')],
  outfile, bundle: true, format: 'esm', jsx: 'automatic', packages: 'external',
  tsconfig: join(root, 'tsconfig.json'),
  plugins: [{ name: 'stub-css', setup(build) {
    build.onResolve({ filter: /\.css$/ }, () => ({ path: 'css', namespace: 'stub' }));
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: '', loader: 'js' }));
  } }],
});
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { default: StarlitNebula } = await import(pathToFileURL(outfile).href);
const markup = renderToStaticMarkup(createElement(StarlitNebula, { hostRef: { current: null }, active: true }));
// 第一個 svg 就是暗雲場（含 defs 與 <use>）；亮雲場只是同一幾何再引用一次。
const svg = markup.match(/<svg[^>]*starlit-nebula-dark[^]*?<\/svg>/)?.[0];
if (!svg) throw new Error('starlit-nebula.tsx 找不到 .starlit-nebula-dark svg');

const dir = mkdtempSync(join(tmpdir(), 'starlit-nebula-cloud-'));
const html = join(dir, 'cloud.html');
writeFileSync(html, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:transparent;color:#fff">${
  svg.replace('<svg ', `<svg width="${width}" height="${height}" `)}`);
execFileSync(process.env.CHROME_BIN ?? join(homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'),
  ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--hide-scrollbars',
    `--window-size=${width},${height}`, '--default-background-color=00000000', '--virtual-time-budget=2000',
    `--screenshot=${out}`, pathToFileURL(html).href],
  { timeout: 60000, stdio: ['ignore', 'ignore', 'pipe'] });
console.log(`${out}: ${width}x${height}, ${statSync(out).size} bytes`);
