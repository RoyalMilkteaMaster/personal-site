export const identity = () =>
  new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
export function inverse(m) {
  const rows = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) =>
      c < 4 ? m[c * 4 + r] : +(c - 4 === r),
    ),
  );
  for (let c = 0; c < 4; c++) {
    let pivot = c;
    for (let r = c + 1; r < 4; r++)
      if (Math.abs(rows[r][c]) > Math.abs(rows[pivot][c])) pivot = r;
    [rows[c], rows[pivot]] = [rows[pivot], rows[c]];
    const v = rows[c][c];
    if (Math.abs(v) < 1e-12) throw Error('Singular camera');
    for (let k = 0; k < 8; k++) rows[c][k] /= v;
    for (let r = 0; r < 4; r++)
      if (r !== c) {
        const f = rows[r][c];
        for (let k = 0; k < 8; k++) rows[r][k] -= f * rows[c][k];
      }
  }
  return Float32Array.from(
    Array.from({ length: 16 }, (_, i) => rows[i % 4][4 + Math.floor(i / 4)]),
  );
}
