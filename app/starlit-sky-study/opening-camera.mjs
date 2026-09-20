// Diagnostic only: preserve the original face and fade back to each exact shot.
export function openingStudyCamera(camera, opening, seconds) {
  const c = { ...camera, target: [...camera.target] };
  c.dist += opening * (.04 + .00015 * Math.sin(seconds * .37));
  c.target[0] += opening * .00010 * Math.sin(seconds * .55);
  c.target[1] += opening * (.016 + .00014 * Math.sin(seconds * .43));
  return c;
}
