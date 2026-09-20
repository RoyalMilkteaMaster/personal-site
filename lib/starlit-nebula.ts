import { glowPoint } from './cursor-glow.ts';

// 雲光與星芒共用時長及衰減曲線。
export const NEBULA_FADE_MS = 1500;
// 與 particle-morph.ts backgroundStars 的 RGB 比例同步；不引用角色粒子模組。
export const NEBULA_STAR_COLORS = [
  'rgb(100% 81% 53%)', 'rgb(67% 75% 100%)', 'rgb(85% 64% 100%)',
];
export function nebulaStrength(releasedAt: number | null, now: number): number {
  if (releasedAt === null) return 0;
  const remaining = Math.max(0, Math.min(1, 1 - (now - releasedAt) / NEBULA_FADE_MS));
  return remaining * remaining * (3 - 2 * remaining);
}

// 固定分布不在待機時隨機閃亮；以比例座標隨內容高度伸展。
export const NEBULA_STARS = Array.from({ length: 64 }, (_, i) => ({
  x: ((i * 0.61803398875 + 0.13) % 1) * 100,
  y: ((i * 0.41421356237 + 0.07) % 1) * 100,
  size: 3 + (i % 4),
  color: NEBULA_STAR_COLORS[[0, 1, 0, 2][i % 4]],
}));

/** host 是在內容流中的定位祖先；輸入只觀察，不接管點擊或捲動。 */
export function attachNebula(host: HTMLElement, layer: HTMLElement): () => void {
  const doc = host.ownerDocument;
  const win = doc.defaultView!;
  const light = layer.querySelector<HTMLElement>('.starlit-nebula-light')!;
  const starField = layer.querySelector<HTMLElement>('.starlit-nebula-stars')!;
  const stars = [...layer.querySelectorAll<HTMLElement>('.starlit-nebula-star')];
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  let point: { x: number; y: number } | null = null;
  let held = false;
  let releasedAt: number | null = null;
  let raf = 0;
  let disposed = false;
  let sampleStars = true;
  let starOffset = { x: 0, y: 0 };
  // 固定 64 個有限餘光，共用既有 RAF；不為每顆星建立循環。
  const afterglows = stars.map(() => ({ target: 0, from: 0, at: 0, value: 0 }));
  const clear = () => {
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    point = null;
    held = false;
    releasedAt = null;
    light.style.opacity = '0';
    for (const star of stars) star.style.opacity = '0';
    for (const glow of afterglows) Object.assign(glow, { target: 0, from: 0, at: 0, value: 0 });
  };
  const paint = () => {
    raf = 0;
    if (disposed || doc.hidden || !point) return;
    const rect = host.getBoundingClientRect();
    // 只在輸入／捲動時採樣一次星群；餘光不追逐 CSS 漂移而反覆重設計時。
    if (sampleStars) {
      const starRect = starField.getBoundingClientRect();
      starOffset = { x: starRect.left - rect.left, y: starRect.top - rect.top };
      sampleStars = false;
    }
    const local = glowPoint(point.x, point.y, rect);
    const strength = held ? 1 : nebulaStrength(releasedAt, win.performance.now());
    light.style.setProperty('--nebula-x', `${local.x}px`);
    light.style.setProperty('--nebula-y', `${local.y}px`);
    light.style.opacity = String(strength);
    const radiusX = Math.min(260, Math.max(190, rect.width * 0.28));
    light.style.setProperty('--nebula-radius', `${radiusX}px`);
    let starsFading = false;
    const now = win.performance.now();
    stars.forEach((star, i) => {
      const at = NEBULA_STARS[i];
      const distance = Math.hypot((at.x * rect.width / 100 + starOffset.x - local.x) / radiusX,
        (at.y * rect.height / 100 + starOffset.y - local.y) / 180);
      const target = held ? Math.max(0, 1 - distance) ** 2 * 0.85 : 0;
      const glow = afterglows[i];
      if (target !== glow.target) {
        glow.from = Math.max(glow.value, target);
        glow.at = held ? now : releasedAt!;
        glow.target = target;
      }
      glow.value = reduced.matches ? target : Math.max(target,
        glow.from * nebulaStrength(glow.at, now));
      star.style.opacity = String(glow.value);
      if (glow.value > target) starsFading = true;
    });
    if ((!held && strength > 0) || starsFading) schedule();
  };
  const schedule = () => {
    if (!raf && !disposed && !doc.hidden) raf = win.requestAnimationFrame(paint);
  };
  const wake = (x: number, y: number) => {
    if (doc.hidden) return;
    point = { x, y };
    sampleStars = true;
    held = true;
    releasedAt = null;
    schedule();
  };
  const release = () => {
    if (!held) return;
    held = false;
    releasedAt = win.performance.now();
    if (reduced.matches) clear();
    else schedule();
  };
  const pointer = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') wake(event.clientX, event.clientY);
  };
  const touch = (event: TouchEvent) => {
    const at = event.touches[0];
    if (at) wake(at.clientX, at.clientY);
  };
  const scroll = () => { sampleStars = true; if (point) schedule(); };
  const visibility = () => {
    layer.dataset.running = String(!doc.hidden);
    clear();
  };
  const motion = () => { if (reduced.matches && !held) clear(); };
  layer.dataset.running = String(!doc.hidden);
  clear();
  host.addEventListener('pointermove', pointer, { passive: true });
  host.addEventListener('pointerdown', pointer, { passive: true });
  host.addEventListener('pointerleave', release, { passive: true });
  host.addEventListener('pointercancel', release, { passive: true });
  host.addEventListener('touchstart', touch, { passive: true });
  host.addEventListener('touchmove', touch, { passive: true });
  doc.addEventListener('touchend', release, { passive: true });
  doc.addEventListener('touchcancel', release, { passive: true });
  doc.addEventListener('scroll', scroll, { passive: true, capture: true });
  doc.addEventListener('visibilitychange', visibility);
  win.addEventListener('blur', release);
  reduced.addEventListener('change', motion);
  return () => {
    disposed = true;
    clear();
    layer.dataset.running = 'false';
    host.removeEventListener('pointermove', pointer);
    host.removeEventListener('pointerdown', pointer);
    host.removeEventListener('pointerleave', release);
    host.removeEventListener('pointercancel', release);
    host.removeEventListener('touchstart', touch);
    host.removeEventListener('touchmove', touch);
    doc.removeEventListener('touchend', release);
    doc.removeEventListener('touchcancel', release);
    doc.removeEventListener('scroll', scroll, { capture: true });
    doc.removeEventListener('visibilitychange', visibility);
    win.removeEventListener('blur', release);
    reduced.removeEventListener('change', motion);
  };
}
