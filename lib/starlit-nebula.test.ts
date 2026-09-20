import assert from 'node:assert/strict';
import { nebulaStrength } from './starlit-nebula.ts';
assert.equal(nebulaStrength(null, 10000), 0, '未操作不自行亮起');
assert.equal(nebulaStrength(100, 100), 1);
assert.equal(nebulaStrength(100, 850), 0.5, '共同1500ms曲線半程');
assert.equal(nebulaStrength(100, 1600), 0, '放開 1.5 秒後完全熄滅');
console.log('PASS: idle and shared 1.5s afterglow');

// DOM／時鐘是外部邊界；經由真實 EventTarget 發送輸入，驗證公開 attach/cleanup。
const { attachNebula, NEBULA_STARS, NEBULA_STAR_COLORS } = await import('./starlit-nebula.ts');
let now = 0;
let sequence = 0;
const frames = new Map<number, FrameRequestCallback>();
const media = Object.assign(new EventTarget(), { matches: false });
const win = Object.assign(new EventTarget(), {
  performance: { now: () => now },
  matchMedia: () => media,
  requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++sequence, fn); return sequence; },
  cancelAnimationFrame: (id: number) => { frames.delete(id); },
});
const doc = Object.assign(new EventTarget(), { hidden: false, defaultView: win });
let top = 90;
const host = Object.assign(new EventTarget(), {
  ownerDocument: doc,
  getBoundingClientRect: () => ({ left: 600, top, width: 600, height: 900 }),
});
const variables = new Map<string, string>();
const light = { style: { opacity: '', transform: '', width: '', setProperty: (name: string, value: string) => variables.set(name, value) } };
const stars = NEBULA_STARS.map(() => ({ style: { opacity: '' } }));
let starOffset = { x: 0, y: 0 };
const starField = { getBoundingClientRect: () => ({ left: 600 + starOffset.x, top: top + starOffset.y }) };
const layer = { dataset: { running: '' }, querySelector: (selector: string) => selector === '.starlit-nebula-stars' ? starField : light, querySelectorAll: () => stars };
const tick = (time: number) => {
  now = time;
  const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
};
const send = (target: EventTarget, type: string, props = {}) => {
  const event = Object.assign(new Event(type, { cancelable: true }), props);
  target.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false, `${type} 不攔截預設操作`);
};
const attach = () => attachNebula(host as unknown as HTMLElement, layer as unknown as HTMLElement);
let cleanup = attach();
assert.equal(light.style.opacity, '0');
assert.equal(frames.size, 0, '待機無 JS 動畫循環');
send(host, 'pointermove', { clientX: 800, clientY: 390, pointerType: 'mouse' });
tick(100);
assert.equal(variables.get('--nebula-x'), '200px');
assert.equal(variables.get('--nebula-y'), '300px');
assert.equal(light.style.transform, '', '光只移動遮罩，不移動雲紋理');
assert.equal(light.style.opacity, '1');
assert.ok(stars.some(star => Number(star.style.opacity) > 0));
top = -110;
send(doc, 'scroll'); tick(120);
assert.equal(variables.get('--nebula-y'), '500px', '捲動只更新遮罩座標');
assert.equal(light.style.transform, '');
send(host, 'pointerleave'); tick(870);
assert.equal(Number(light.style.opacity), 0.5);
tick(1620);
assert.equal(light.style.opacity, '0');
assert.ok(stars.every(star => Number(star.style.opacity) === 0));
assert.equal(frames.size, 0);
send(host, 'touchstart', { touches: [{ clientX: 700, clientY: 250 }] }); tick(2400);
send(host, 'touchmove', { touches: [{ clientX: 720, clientY: 270 }] }); tick(2410);
assert.equal(variables.get('--nebula-x'), '120px');
assert.equal(variables.get('--nebula-y'), '380px');
assert.equal(light.style.width, '', '照明半徑不改變整片雲的幾何');
send(doc, 'touchend'); tick(3910);
assert.equal(light.style.opacity, '0');
send(host, 'pointermove', { clientX: 800, clientY: 390 });
doc.hidden = true; send(doc, 'visibilitychange');
assert.equal(frames.size, 0);
assert.equal(layer.dataset.running, 'false');
assert.equal(light.style.opacity, '0');
doc.hidden = false; send(doc, 'visibilitychange');
assert.equal(layer.dataset.running, 'true');
assert.equal(frames.size, 0, '恢復不自行喚醒');
cleanup();
send(host, 'pointermove', { clientX: 800, clientY: 390 });
send(host, 'touchmove', { touches: [{ clientX: 700, clientY: 250 }] });
send(doc, 'scroll');
assert.equal(frames.size, 0, '卸載無殘留輸入');
cleanup = attach();
send(host, 'pointermove', { clientX: 800, clientY: 390 });
assert.equal(frames.size, 1, '重掛只有一個排程');
tick(5000);
media.matches = true;
send(host, 'pointerleave');
assert.equal(light.style.opacity, '0', '減少動態沿用無餘光過渡');
cleanup();
assert.ok(stars.every(star => star.style.opacity === '0'));
console.log('PASS: mouse/touch, scrolling coordinates, visibility, cleanup, remount, reduced motion');

// 欄內移離已照亮星星也有有限餘光；不是只有離開 host 才淡出。
media.matches = false;
cleanup = attach();
const first = NEBULA_STARS[0];
send(host, 'pointermove', { clientX: 600 + first.x * 6, clientY: top + first.y * 9 });
tick(6000);
const peak = Number(stars[0].style.opacity);
assert.ok(peak > 0.8);
send(host, 'pointermove', { clientX: 1199, clientY: top + 899 });
tick(6010);
assert.equal(Number(stars[0].style.opacity), peak, '欄內移開不瞬間熄滅');
assert.equal(frames.size, 1, '全部星芒共用一個有限排程');
starOffset = { x: 2, y: -1 }; // CSS 持續移動不應延長欄內餘光
tick(6760);
assert.ok(Math.abs(Number(stars[0].style.opacity) - peak / 2) < 1e-6);
starOffset = { x: 3, y: -2 };
tick(7510);
assert.equal(Number(stars[0].style.opacity), 0);
assert.equal(frames.size, 0, '即使CSS持續漂移，停留光源穩定後不持續 RAF');
starOffset = { x: 0, y: 0 };
send(host, 'pointermove', { clientX: 600 + first.x * 6, clientY: top + first.y * 9 }); tick(8300);
const releasedPeak = Number(stars[0].style.opacity);
send(host, 'pointerleave'); tick(9050);
assert.equal(Number(light.style.opacity), 0.5, '雲光750ms半亮');
assert.equal(Number(stars[0].style.opacity) / releasedPeak, 0.5, '星光同時衰減至原亮度一半');
tick(9500);
assert.ok(Number(light.style.opacity) > 0, '1200ms雲光不提前熄滅');
assert.ok(Math.abs(Number(stars[0].style.opacity) / releasedPeak - Number(light.style.opacity)) < 1e-12, '雲星共用衰減曲線');
tick(9800);
assert.equal(light.style.opacity, '0');
assert.equal(Number(stars[0].style.opacity), 0);
assert.equal(frames.size, 0);
send(host, 'pointermove', { clientX: 600 + first.x * 6, clientY: top + first.y * 9 }); tick(11000);
send(host, 'pointerleave'); tick(11300);
assert.ok(Number(stars[0].style.opacity) > 0);
doc.hidden = true; send(doc, 'visibilitychange');
assert.ok(stars.every(star => star.style.opacity === '0'), '隱藏立即清除所有星芒餘光');
assert.equal(frames.size, 0);
assert.equal(layer.dataset.running, 'false');
doc.hidden = false; send(doc, 'visibilitychange');
assert.equal(layer.dataset.running, 'true');
assert.equal(frames.size, 0);
cleanup();
const { backgroundStars, STRIDE } = await import('./particle-morph.ts');
const left = backgroundStars(3, 0);
for (let i = 0; i < 3; i++) {
  const actual = NEBULA_STAR_COLORS[i].match(/[\d.]+/g)!.map(Number);
  const max = Math.max(...left.slice(i * STRIDE + 3, i * STRIDE + 6));
  for (let c = 0; c < 3; c++) assert.ok(Math.abs(actual[c] / 100 - left[i * STRIDE + 3 + c] / max) < 1e-6);
}
console.log('PASS: portrait palette ratios, within-host gentle star fade 1.5s, cloud 1.5s, one bounded RAF');

assert.deepEqual(NEBULA_STAR_COLORS.map(color => NEBULA_STARS.filter(star => star.color === color).length), [32,16,16], '金50%、藍紫各25%，總數64');

starOffset = { x: 6, y: -4 };
cleanup = attach();
send(host, 'pointermove', { clientX: 600 + first.x * 6 + 6, clientY: top + first.y * 9 - 4 }); tick(12000);
assert.equal(Number(stars[0].style.opacity), 0.85, '移動後的星中心仍精確喚醒');
assert.equal(frames.size, 0, 'CSS星漂移不新增常駐JS排程');
cleanup();
console.log('PASS: 32/16/16 colors; moved star coordinates; drift needs no continuous JS');
