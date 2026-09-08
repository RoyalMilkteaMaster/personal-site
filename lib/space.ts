export function projectStar(x: number, y: number, depth: number, pointerX: number, pointerY: number, width: number, height: number) {
  const z = Math.max(0.2, depth);
  return { x: width / 2 + (x * width / 2 - pointerX * 44) / z,
    y: height / 2 + (y * height / 2 - pointerY * 32) / z, radius: Math.min(2.6, 1.2 / z) };
}
