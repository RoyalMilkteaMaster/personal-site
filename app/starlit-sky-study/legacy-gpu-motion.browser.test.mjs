// Ticket 08: the Works/About chapter motion moved from a per-frame CPU
// rotateHeldObjects + full bufferData into the legacy-study vertex shader.
// This probe runs the real WebGL path (transform-feedback snapshot, drawn
// pixels, buffer uploads) in headless Chromium and compares the current
// legacy-study against the frozen pre-08 baseline (CPU reference).
// Usage: node app/starlit-sky-study/legacy-gpu-motion.browser.test.mjs [evidence.json]
// Software GL only: no FPS or device claim. Not Safari.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)),
  root = path.resolve(here, '../..'),
  baseline = path.join(
    root,
    'work/starlit-mobile-optimization/scroll-performance/ticket-08/baseline/legacy-study.mjs',
  );
const esbuild = createRequire(path.join(root, 'package.json'))('esbuild');
// Playwright lives in the coordinator's e2e project, not in this repo.
const { chromium } = createRequire(
  process.env.PLAYWRIGHT_ROOT || '/home/leslie/coordinator-e2e/package.json',
)('playwright');
const TIMES = [0, 0.4, 0.8, 1, 7.3, 61.7, 600, 3600];
const TOLERANCE = { clip: 1e-4, color: 1e-3, alpha: 1e-3, size: 1e-3 };
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't08-'));
  const bundle = async (name, entry) => {
    const options = entry
      ? { entryPoints: [entry] }
      : {
          stdin: {
            contents: fs.readFileSync(baseline, 'utf8'),
            resolveDir: here,
            loader: 'js',
          },
        };
    await esbuild.build({
      ...options,
      bundle: true,
      format: 'esm',
      outfile: path.join(tmp, name),
      logLevel: 'warning',
    });
  };
  await bundle('new.js', path.join(here, 'legacy-study.mjs'));
  await bundle('old.js');
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    const file =
      url === '/' ? null : url.endsWith('.js') ? path.join(tmp, path.basename(url)) : path.join(root, 'public', url);
    if (!file) return res.end('<!doctype html><title>t08</title>');
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', url.endsWith('.js') ? 'text/javascript' : 'image/png');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_EXECUTABLE || '/home/leslie/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 402, height: 681 } });
    page.on('pageerror', (e) => console.error('pageerror', e));
    await page.goto(base + '/');
    const result = await page.evaluate(async ({ TIMES }) => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:fixed;left:0;top:0;width:402px;height:681px';
      document.body.append(canvas);
      canvas.width = 402; canvas.height = 681;
      const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
      gl.viewport(0, 0, 402, 681);
      const uploads = { calls: 0, bytes: 0, subCalls: 0, subBytes: 0, on: false };
      for (const [name, sizeOf] of [
        ['bufferData', (a) => (typeof a[1] === 'number' ? a[1] : a[1].byteLength)],
        ['bufferSubData', (a) => a[2].byteLength],
      ]) {
        const original = gl[name].bind(gl);
        gl[name] = (...a) => {
          if (uploads.on) {
            if (name === 'bufferData') { uploads.calls++; uploads.bytes += sizeOf(a); }
            else { uploads.subCalls++; uploads.subBytes += sizeOf(a); }
          }
          return original(...a);
        };
      }
      const [{ createLegacy: createOld }, { createLegacy: createNew }] = await Promise.all([
        import('/old.js'),
        import('/new.js'),
      ]);
      const t0 = performance.now();
      const old = await createOld(gl, canvas),
        next = await createNew(gl, canvas);
      const buildMs = performance.now() - t0;
      const count = old.pool.count;
      let sameTargets = true;
      for (const pose of [1, 2])
        for (let i = 0; i < old.targets[pose].length; i++)
          if (old.targets[pose][i] !== next.targets[pose][i]) { sameTargets = false; break; }
      const roleOf = (source, i) => { const r = source[i * 13 + 12]; return r < -0.5 ? 'sky' : r < 0.5 ? 'body' : 'held'; };
      const compare = (a, b, n, source) => {
        const out = {};
        for (const role of ['sky', 'body', 'held'])
          out[role] = { count: 0, clip: 0, color: 0, alpha: 0, size: 0, rim: 0, sumClip: 0, visibleA: 0, visibleB: 0 };
        for (let i = 0; i < n; i++) {
          const r = out[source ? roleOf(source, i) : 'sky'], k = i * 10;
          r.count++;
          for (let j = 0; j < 4; j++) { const d = Math.abs(a[k + j] - b[k + j]); r.clip = Math.max(r.clip, d); r.sumClip += d; }
          for (let j = 4; j < 7; j++) r.color = Math.max(r.color, Math.abs(a[k + j] - b[k + j]));
          r.alpha = Math.max(r.alpha, Math.abs(a[k + 7] - b[k + 7]));
          r.size = Math.max(r.size, Math.abs(a[k + 8] - b[k + 8]));
          r.rim = Math.max(r.rim, Math.abs(a[k + 9] - b[k + 9]));
          r.visibleA += a[k + 7] > 0; r.visibleB += b[k + 7] > 0;
        }
        for (const r of Object.values(out)) { r.meanClip = r.count ? r.sumClip / (r.count * 4) : 0; delete r.sumClip; }
        return out;
      };
      const snapshots = [];
      for (const pose of [1, 2])
        for (const seconds of TIMES)
          for (const reduced of seconds === 0 || seconds === 7.3 ? [false, true] : [false])
            snapshots.push({ pose, seconds, reduced, ...compare(old.snapshot(pose, seconds, reduced), next.snapshot(pose, seconds, reduced), count, old.targets[pose]) });
      for (const seconds of [0, 0.4, 61.7, 3600])
        for (const reduced of seconds === 0 ? [false, true] : [false])
          snapshots.push({ pose: 0, skyOnly: true, seconds, reduced, sky: compare(old.snapshot(0, seconds, reduced, true), next.snapshot(0, seconds, reduced, true), old.skyCount, null).sky });
      // Same time and reduced state in draw and snapshot: the chapter morph
      // starts from snapshot(pose, atHold) while the screen shows draw(pose, atHold).
      const pixels = [];
      const read = (fn) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        fn();
        const px = new Uint8Array(402 * 681 * 4);
        gl.readPixels(0, 0, 402, 681, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return px;
      };
      for (const [pose, seconds, reduced, skyOnly, opening] of [[1, 7.3, false, false, 0], [2, 61.7, false, false, 0], [1, 0, true, false, 0], [0, 600, false, true, 0], [0, 3, false, true, 0.5]]) {
        const a = read(() => old.draw(pose, seconds, reduced, skyOnly, opening)),
          b = read(() => next.draw(pose, seconds, reduced, skyOnly, opening));
        // Histogram of per-pixel max channel difference: 1-2 = rounding of a
        // point's shade; larger = a point edge or depth tie landing on the
        // other side of a pixel after a ~1e-6 position change.
        let lit = 0, differing = 0, max = 0, litBoth = 0;
        const buckets = { '1-2': 0, '3-15': 0, '16+': 0 };
        for (let i = 0; i < a.length; i += 4) {
          const la = a[i] + a[i + 1] + a[i + 2] > 0, lb = b[i] + b[i + 1] + b[i + 2] > 0;
          if (la) lit++;
          let d = 0;
          for (let j = 0; j < 3; j++) d = Math.max(d, Math.abs(a[i + j] - b[i + j]));
          if (d > 0) { differing++; if (la && lb) litBoth++; buckets[d <= 2 ? '1-2' : d <= 15 ? '3-15' : '16+']++; }
          max = Math.max(max, d);
        }
        pixels.push({ pose, seconds, reduced, skyOnly, opening, lit, differing, litInBoth: litBoth, buckets, maxChannelDiff: max, differingShare: differing / (402 * 681) });
      }
      // Steady-state uploads: warm one frame per pose, then count 30 frames.
      const steady = {};
      for (const [name, legacy] of [['new', next], ['old', old]]) {
        legacy.draw(1, 3, false); legacy.draw(2, 3, false); legacy.draw(0, 3, false, true, 0); legacy.draw(1, 3, false);
        Object.assign(uploads, { calls: 0, bytes: 0, subCalls: 0, subBytes: 0, on: true });
        for (let frame = 0; frame < 30; frame++) legacy.draw(1, 3 + frame / 60, false);
        uploads.on = false;
        steady[name] = { frames: 30, bufferData: uploads.calls, bufferDataBytes: uploads.bytes, bufferSubData: uploads.subCalls, bufferSubDataBytes: uploads.subBytes, bytesPerFrame: (uploads.bytes + uploads.subBytes) / 30 };
        Object.assign(uploads, { calls: 0, bytes: 0, subCalls: 0, subBytes: 0, on: true });
        for (let frame = 0; frame < 30; frame++) { legacy.draw(0, 3 + frame / 60, false, true, 0); legacy.draw(2, 3 + frame / 60, false); }
        uploads.on = false;
        steady[name].mixedSkyAndPose2 = { frames: 60, bufferData: uploads.calls, bytes: uploads.bytes + uploads.subBytes, bufferSubData: uploads.subCalls };
      }
      const glError = gl.getError();
      old.dispose(); next.dispose();
      return { count, skyCount: old.skyCount, buildMs, sameTargets, snapshots, pixels, steady, glError, renderer: gl.getParameter(gl.RENDERER) };
    }, { TIMES });
    if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 1));
    console.log(JSON.stringify({ count: result.count, skyCount: result.skyCount, buildMs: Math.round(result.buildMs), sameTargets: result.sameTargets, steady: result.steady, pixels: result.pixels, glError: result.glError, renderer: result.renderer }, null, 1));
    const worst = { clip: 0, color: 0, alpha: 0, size: 0, rim: 0 };
    for (const s of result.snapshots)
      for (const role of ['sky', 'body', 'held']) {
        const r = s[role]; if (!r) continue;
        for (const key of Object.keys(worst)) if (r[key] > worst[key]) worst[key] = r[key];
        assert.equal(r.visibleA, r.visibleB, `visible particle count pose ${s.pose} t=${s.seconds} ${role}`);
      }
    console.log('worst snapshot deviation', JSON.stringify(worst));
    assert.equal(result.glError, 0);
    assert.ok(result.sameTargets, 'both builds sample identical targets');
    assert.equal(result.count, 68155, 'iPhone 17 viewport pool size');
    for (const key of Object.keys(TOLERANCE)) assert.ok(worst[key] <= TOLERANCE[key], `${key} deviation ${worst[key]} within ${TOLERANCE[key]}`);
    assert.equal(worst.rim, 0);
    for (const p of result.pixels) assert.ok(p.differingShare < 0.01 && p.lit > 1000, `drawn frame matches: ${JSON.stringify(p)}`);
    assert.equal(result.steady.new.bufferData + result.steady.new.bufferSubData, 0, `steady Works frames upload nothing: ${JSON.stringify(result.steady.new)}`);
    assert.equal(result.steady.new.mixedSkyAndPose2.bufferData + result.steady.new.mixedSkyAndPose2.bufferSubData, 0, 'steady sky/pose alternation uploads nothing');
    console.log('PASS: legacy-study GPU motion equals the CPU reference; steady frames upload nothing');
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => { console.error(e); process.exit(1); });
