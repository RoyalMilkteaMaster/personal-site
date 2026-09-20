import assert from 'node:assert/strict';
import { contactSway, CONTACT_SWAY_PERIOD } from './starlit-contact-milktea.ts';

// 整個循環：臉大致朝前（|angle| < 90°），左右兩側都到得了，不做 360 度自轉。
const angles = Array.from({ length: 700 }, (_, i) => contactSway((i / 700) * CONTACT_SWAY_PERIOD * 2).angle);
assert(angles.every((a) => Math.abs(a) < Math.PI / 2), 'never shows the back');
assert(Math.min(...angles) < -0.3 && Math.max(...angles) > 0.3, 'turns to both sides');
assert(Math.abs(contactSway(CONTACT_SWAY_PERIOD).angle) < 1e-9, 'returns to front each period');
// 相鄰取樣差距小：緩慢擺轉，沒有跳轉。
for (let i = 1; i < angles.length; i++) assert(Math.abs(angles[i] - angles[i - 1]) < 0.02);
// 減少動態：靜止、正面、時間不前進。
assert.deepEqual(contactSway(3.3, true), { time: 0, angle: 0 });
console.log('starlit-contact-milktea ok');
