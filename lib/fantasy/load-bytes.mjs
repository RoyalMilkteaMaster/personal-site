// Verified loading of /fantasy/ assets, shared by lib/fantasy/renderer.mjs and
// app/starlit-sky-study/renderer-study.mjs. Nothing unverified is ever returned.
export const sha = async (b) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
// Pins the bytes of model-manifest.json (part hashes + node translation) the
// same way palm-prop.mjs pins prop-candidate-manifest.json.
export const MODEL_MANIFEST_SHA256 =
  'a8b1ad8d0709cb05670ad8ba8fcc5007b19d38f487658dba9b9a9dad1fda100b';
// Buffers with a pre-gzipped twin (scripts/extract-fantasy-mesh.mjs).
export const GZIPPED = new Set([
  'source-position.f32',
  'source-index.u32',
  'ordinary-palette.f32',
  'ordinary-support.f32',
]);
const isGzip = (b) => {
  const u = new Uint8Array(b);
  return u[0] === 0x1f && u[1] === 0x8b;
};
const inflate = (b) =>
  new Response(
    new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip')),
  ).arrayBuffer();
export async function rawBytes(
  name,
  { fetch = globalThis.fetch } = {},
) {
  const r = await fetch('/fantasy/' + name);
  if (!r.ok) throw Error('Missing ' + name);
  return r.arrayBuffer();
}
/**
 * /fantasy/<name> whose SHA-256 must equal `expected` (value or promise). The
 * .gz twin is tried first when the browser can inflate; a 404, an HTML
 * catch-all page, a host that already inflated it, a corrupt gzip or a hash
 * mismatch there all fall through once to the raw file, which must verify.
 */
export async function verifiedBytes(
  name,
  expected,
  { fetch = globalThis.fetch, canInflate = typeof DecompressionStream === 'function' } = {},
) {
  const twin =
    GZIPPED.has(name) && canInflate
      ? rawBytes(name + '.gz', { fetch })
          .then((b) => (isGzip(b) ? inflate(b) : b))
          .catch(() => null)
      : null;
  const hash = await expected;
  const candidate = await twin;
  if (candidate && (await sha(candidate)) === hash) return candidate;
  const raw = await rawBytes(name, { fetch });
  if ((await sha(raw)) !== hash) throw Error('Fantasy source hash: ' + name);
  return raw;
}
export const decodeJson = (b) => JSON.parse(new TextDecoder().decode(b));
