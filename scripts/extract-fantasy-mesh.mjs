// Slices the parts the renderer actually uses out of public/fantasy/source.glb
// so the browser downloads 37 MB instead of 59.6 MB and every asset stays under
// the 25 MiB Cloudflare Workers asset limit. Output bytes are the untouched
// bufferView bytes; model-manifest.json already pins their SHA-256.
// Usage: node scripts/extract-fantasy-mesh.mjs   (idempotent, verifies hashes)
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { parseGlb, bufferViewBytes, worldMesh } from '../lib/fantasy/glb.mjs';
export const PARTS = {
  'source-position.f32': (m) => m.attributes.POSITION.sha256,
  'source-index.u32': (m) => m.indexSHA256,
  'source-basecolor.jpg': (m) => m.images[1].sha256,
};
const dir = new URL('../public/fantasy/', import.meta.url);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const raw = fs.readFileSync(new URL('source.glb', dir));
const manifest = JSON.parse(fs.readFileSync(new URL('model-manifest.json', dir), 'utf8'));
if (sha(raw) !== manifest.sha256) throw Error('source.glb does not match model-manifest.json');
const g = parseGlb(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const prim = g.json.meshes[0].primitives[0];
const view = (accessor) => bufferViewBytes(g, g.json.accessors[accessor].bufferView);
const out = {
  'source-position.f32': view(prim.attributes.POSITION),
  'source-index.u32': view(prim.indices),
  'source-basecolor.jpg': bufferViewBytes(g, g.json.images[g.json.textures[g.json.materials[0].pbrMetallicRoughness.baseColorTexture.index].source].bufferView),
};
for (const [name, expected] of Object.entries(PARTS)) {
  const bytes = out[name];
  if (sha(bytes) !== expected(manifest)) throw Error('manifest hash mismatch for ' + name);
  fs.writeFileSync(new URL(name, dir), bytes);
  console.log(name, bytes.byteLength, 'bytes', expected(manifest).slice(0, 12));
}
// The node transform is a pure translation; the renderer adds it in double
// precision exactly as worldMesh does. Prove that here once.
const mesh = worldMesh(g), pos = new Float32Array(out['source-position.f32'].buffer.slice(out['source-position.f32'].byteOffset, out['source-position.f32'].byteOffset + out['source-position.f32'].byteLength)), t = manifest.localToWorldTranslation;
if (JSON.stringify(t) !== JSON.stringify(g.json.nodes[0].translation)) throw Error('manifest translation drift');
for (let i = 0; i < pos.length; i++) if (Math.fround(pos[i] + t[i % 3]) !== mesh.position[i]) throw Error('translation mismatch at ' + i);
console.log('translation check passed for', pos.length / 3, 'vertices');
// Pre-gzipped copies for the buffers that actually shrink (indices, sparse palette /
// support, positions); the renderer inflates them with the browser's DecompressionStream
// and still checks the same SHA-256 on the inflated bytes. Textures, surface-stars and
// the small reference/prop buffers stay raw (gzip gains under 10%).
export const GZIPPED = ['source-position.f32', 'source-index.u32', 'ordinary-palette.f32', 'ordinary-support.f32'];
for (const name of GZIPPED) {
  const raw = fs.readFileSync(new URL(name, dir)), gz = gzipSync(raw, { level: 9 });
  fs.writeFileSync(new URL(name + '.gz', dir), gz);
  console.log(name + '.gz', gz.byteLength, 'bytes', Math.round((100 * gz.byteLength) / raw.byteLength) + '%');
}
