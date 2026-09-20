import { STRIDE } from '../particle-morph.ts';

// Unbounded soft distribution: the viewport cuts through a larger field.
// Same slot count as the legacy sky; generated once, never during animation.
export function openingSky(count) {
  const points = new Float32Array(count * STRIDE);
  let seed = 7043;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) + 0.5) / 4294967296;
  for (let i = 0; i < count; i++) {
    const depth = 0.15 + random() * 2.6;
    const spread = (i % 6 === 0 ? 0.38 : 1.2) * (1 + depth * 0.2);
    const radius = Math.sqrt(-2 * Math.log(random())) * spread;
    const angle = random() * Math.PI * 2;
    const light = random() < 0.045 ? 0.7 + random() * 0.25 : 0.13 + random() * 0.24;
    // Far stars drift more slowly; per-star variation prevents rigid rotation.
    const speed = (0.013 + random() * 0.015) / (1 + depth * 0.35);
    points.set([
      Math.cos(angle) * radius - 0.06, Math.sin(angle) * radius, depth,
      light * 0.35, light * 0.55, light, 0, 0, 0, speed, 0, 0, -1,
    ], i * STRIDE);
  }
  return points;
}

export function animateOpeningSky(source, seconds, out) {
  out.set(source);
  for (let i = 0; i < source.length; i += STRIDE) {
    const angle = seconds * source[i + 9], c = Math.cos(angle), s = Math.sin(angle);
    out[i] = source[i] * c - source[i + 1] * s;
    out[i + 1] = source[i] * s + source[i + 1] * c;
    // Gentle depth motion uses the legacy perspective, not a flat screen roll.
    out[i + 2] += 0.035 * (Math.sin(seconds * 0.12 + i) - Math.sin(i));
  }
  return out;
}
