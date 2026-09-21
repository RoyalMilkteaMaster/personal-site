// node lib/fantasy/load-bytes.test.mjs — public loading behaviour of the shared verified loader.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { verifiedBytes, rawBytes, decodeJson, sha, MODEL_MANIFEST_SHA256 } from './load-bytes.mjs';
import fs from 'node:fs';

const raw = new Uint8Array(5000).map((_, i) => (i * 37) % 251), gz = gzipSync(raw), NAME = 'ordinary-support.f32';
const expected = await sha(raw);
const equal = (b) => assert.deepEqual(new Uint8Array(b), raw);
// fetch stub: gzResponse() answers /fantasy/<name>.gz, rawResponse() the raw file; records URLs.
const stub = (gzResponse, rawResponse = () => new Response(raw)) => {
  const calls = [];
  const fetch = async (url) => { calls.push(url); return url.endsWith('.gz') ? gzResponse() : rawResponse(); };
  return { fetch, calls };
};

test('valid gzip twin: inflated, verified, raw never requested', async () => {
  const f = stub(() => new Response(gz));
  equal(await verifiedBytes(NAME, expected, f));
  assert.deepEqual(f.calls, ['/fantasy/ordinary-support.f32.gz']);
});
test('host already inflated the twin (raw bytes at .gz URL): accepted once verified', async () => {
  const f = stub(() => new Response(raw));
  equal(await verifiedBytes(NAME, expected, f));
  assert.deepEqual(f.calls, ['/fantasy/ordinary-support.f32.gz']);
});
test('.gz 404: falls through to the raw file', async () => {
  const f = stub(() => new Response('nf', { status: 404 }));
  equal(await verifiedBytes(NAME, expected, f));
  assert.deepEqual(f.calls, ['/fantasy/ordinary-support.f32.gz', '/fantasy/ordinary-support.f32']);
});
test('.gz answered 200 + HTML catch-all: falls through, raw verified', async () => {
  const f = stub(() => new Response('<!doctype html><html>index</html>'));
  equal(await verifiedBytes(NAME, expected, f));
  assert.equal(f.calls.length, 2);
});
test('truncated gzip: falls through, raw verified', async () => {
  const f = stub(() => new Response(gz.subarray(0, gz.length - 40)));
  equal(await verifiedBytes(NAME, expected, f));
  assert.equal(f.calls.length, 2);
});
test('twin inflates but hashes to something else: falls through, raw verified', async () => {
  const f = stub(() => new Response(gzipSync(new Uint8Array(5000))));
  equal(await verifiedBytes(NAME, expected, f));
  assert.equal(f.calls.length, 2);
});
test('raw file itself does not verify: rejects with the asset name (no silent acceptance)', async () => {
  const f = stub(() => new Response('nf', { status: 404 }), () => new Response(new Uint8Array(5000)));
  await assert.rejects(verifiedBytes(NAME, expected, f), { message: 'Fantasy source hash: ordinary-support.f32' });
  const g = stub(() => new Response('<html>'), () => new Response(new Uint8Array(5000)));
  await assert.rejects(verifiedBytes(NAME, expected, g), { message: 'Fantasy source hash: ordinary-support.f32' });
});
test('raw file missing: rejects Missing <name>', async () => {
  const f = stub(() => new Response('nf', { status: 404 }), () => new Response('nf', { status: 404 }));
  await assert.rejects(verifiedBytes(NAME, expected, f), { message: 'Missing ordinary-support.f32' });
});
test('no DecompressionStream: raw only, .gz never requested', async () => {
  const f = stub(() => { throw Error('must not be called'); });
  equal(await verifiedBytes(NAME, expected, { ...f, canInflate: false }));
  assert.deepEqual(f.calls, ['/fantasy/ordinary-support.f32']);
});
test('files without a twin never request .gz', async () => {
  const f = stub(() => { throw Error('must not be called'); });
  equal(await verifiedBytes('reference-stars.f32', expected, f));
  assert.deepEqual(f.calls, ['/fantasy/reference-stars.f32']);
});
test('expected hash may arrive later (promise) while the download already started', async () => {
  const f = stub(() => new Response(gz));
  equal(await verifiedBytes(NAME, new Promise((r) => setTimeout(() => r(expected), 20)), f));
});

// model-manifest.json pin: the on-disk manifest verifies; any edit, including the node translation, is rejected.
const manifestBytes = fs.readFileSync(new URL('../../public/fantasy/model-manifest.json', import.meta.url));
test('on-disk model-manifest.json matches the pinned hash and parses', async () => {
  const f = stub(null, () => new Response(manifestBytes));
  const m = decodeJson(await verifiedBytes('model-manifest.json', MODEL_MANIFEST_SHA256, f));
  assert.equal(m.sha256, 'db1842943d71f1814bddfd03b6fc38b4a340bf63a4272bb5f24e2f949cf2a72a');
  assert.deepEqual(m.nodes[0].translation, m.localToWorldTranslation);
});
test('tampered manifest (translation changed) is rejected before any value is trusted', async () => {
  const m = JSON.parse(manifestBytes.toString());
  m.nodes[0].translation[0] += 0.01;
  const f = stub(null, () => new Response(JSON.stringify(m)));
  await assert.rejects(verifiedBytes('model-manifest.json', MODEL_MANIFEST_SHA256, f), { message: 'Fantasy source hash: model-manifest.json' });
});
test('tampered manifest (part hash changed) is rejected', async () => {
  const f = stub(null, () => new Response(manifestBytes.toString().replace(/"indexSHA256": "05cf/, '"indexSHA256": "15cf')));
  await assert.rejects(verifiedBytes('model-manifest.json', MODEL_MANIFEST_SHA256, f), /Fantasy source hash/);
});
test('rawBytes: ok → bytes, !ok → Missing', async () => {
  equal(await rawBytes(NAME, stub(null, () => new Response(raw))));
  await assert.rejects(rawBytes(NAME, stub(null, () => new Response('', { status: 500 }))), { message: 'Missing ordinary-support.f32' });
});
