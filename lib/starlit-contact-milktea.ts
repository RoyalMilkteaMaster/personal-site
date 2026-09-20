// 聯絡區 3D 貓貓奶茶的純數值接縫：擺轉角與固定相機。與人物場景無關。
// 臉在模型 +Z（manifest localCoordinates），angle 0 即正對讀者。
export const CONTACT_SWAY_RAD = (32 * Math.PI) / 180;
export const CONTACT_SWAY_PERIOD = 7;

/** 緩慢左右來回擺轉；reducedMotion 時靜止正面、不閃爍。 */
export function contactSway(seconds: number, reducedMotion = false) {
  const time = reducedMotion ? 0 : seconds;
  return {
    time,
    angle: CONTACT_SWAY_RAD * Math.sin((2 * Math.PI * time) / CONTACT_SWAY_PERIOD),
  };
}

/** 固定相機：略高於杯心俯視，整杯（y ±0.49）約佔畫布高度四分之三。 */
export const CONTACT_CAMERA = Object.freeze({
  target: [0, 0.02, 0] as [number, number, number],
  dist: 2.6,
  el: 6,
  az: 0,
  fov: 28,
});
