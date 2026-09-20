// Minimal glTF-binary reader for the untouched Tripo source (tripo-original.glb).
// Runs unchanged in Node and in the browser: input is an ArrayBuffer, output is
// the source's own typed arrays. No geometry is modified anywhere in this file.
// ponytail: supports only the features this source actually uses (single buffer,
// non-interleaved accessors, TRS/matrix node chain). Throws loudly otherwise.

const COMPONENT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function parseGlb(buffer) {
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
  let json = null, bin = null, off = 12;
  while (off + 8 <= dv.byteLength) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, off + 8, len)));
    else if (type === 0x004e4942) bin = new Uint8Array(buffer, off + 8, len);
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  if (!json || !bin) throw new Error('GLB missing JSON or BIN chunk');
  return { json, bin };
}

export function readAccessor({ json, bin }, index) {
  const a = json.accessors[index];
  const bv = json.bufferViews[a.bufferView];
  const T = COMPONENT[a.componentType], n = NUM[a.type];
  if (bv.byteStride && bv.byteStride !== n * T.BYTES_PER_ELEMENT) throw new Error('interleaved accessor unsupported');
  const start = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0);
  if (start % T.BYTES_PER_ELEMENT) return new T(bin.buffer.slice(start, start + a.count * n * T.BYTES_PER_ELEMENT));
  return new T(bin.buffer, start, a.count * n);
}

export function bufferViewBytes({ json, bin }, index) {
  const bv = json.bufferViews[index];
  const start = bin.byteOffset + (bv.byteOffset || 0);
  return new Uint8Array(bin.buffer, start, bv.byteLength);
}

const mul = (a, b) => { // column-major 4x4
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
};

function nodeMatrix(node) {
  if (node.matrix) return Float64Array.from(node.matrix);
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  return Float64Array.from([
    (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
    (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
    (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ]);
}

/** Flattens the scene graph to [{ primitive, matrix }] with world matrices. */
export function scenePrimitives(glb) {
  const { json } = glb;
  const out = [];
  const walk = (i, parent) => {
    const node = json.nodes[i];
    const m = mul(parent, nodeMatrix(node));
    if (node.mesh !== undefined) for (const primitive of json.meshes[node.mesh].primitives) out.push({ primitive, matrix: m });
    for (const c of node.children || []) walk(c, m);
  };
  const scene = json.scenes[json.scene ?? 0];
  const I = Float64Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  for (const n of scene.nodes) walk(n, I);
  return out;
}

/** Source vertices/topology in world space. Rigid + uniform node transforms only. */
export function worldMesh(glb) {
  const prims = scenePrimitives(glb);
  if (prims.length !== 1) throw new Error(`expected 1 primitive, got ${prims.length}`);
  const { primitive, matrix } = prims[0];
  if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error('expected TRIANGLES');
  const src = readAccessor(glb, primitive.attributes.POSITION);
  const srcN = readAccessor(glb, primitive.attributes.NORMAL);
  const uv = readAccessor(glb, primitive.attributes.TEXCOORD_0);
  const index = readAccessor(glb, primitive.indices);
  const position = new Float32Array(src.length), normal = new Float32Array(srcN.length);
  for (let i = 0; i < src.length; i += 3) {
    const x = src[i], y = src[i + 1], z = src[i + 2];
    position[i] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    position[i + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    position[i + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    // Node transform here is a pure translation; a uniform-scale/rotation chain
    // stays correct because the rotated normal is renormalised below.
    const nx = matrix[0] * srcN[i] + matrix[4] * srcN[i + 1] + matrix[8] * srcN[i + 2];
    const ny = matrix[1] * srcN[i] + matrix[5] * srcN[i + 1] + matrix[9] * srcN[i + 2];
    const nz = matrix[2] * srcN[i] + matrix[6] * srcN[i + 1] + matrix[10] * srcN[i + 2];
    const len = Math.hypot(nx, ny, nz) || 1;
    normal[i] = nx / len; normal[i + 1] = ny / len; normal[i + 2] = nz / len;
  }
  return { position, normal, uv, index, matrix, material: glb.json.materials[primitive.material] };
}
