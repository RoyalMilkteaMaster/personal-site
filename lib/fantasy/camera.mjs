export function cameraMatrix(cam, canvas, aspect) {
  function matVP(aspect) {
    const e = (cam.el * Math.PI) / 180,
      a = (cam.az * Math.PI) / 180;
    const eye = [
      cam.target[0] + cam.dist * Math.cos(e) * Math.sin(a),
      cam.target[1] + cam.dist * Math.sin(e),
      cam.target[2] + cam.dist * Math.cos(e) * Math.cos(a),
    ];
    const f = [
      cam.target[0] - eye[0],
      cam.target[1] - eye[1],
      cam.target[2] - eye[2],
    ];
    const fl = Math.hypot(...f);
    for (let i = 0; i < 3; i++) f[i] /= fl;
    const s = [-f[2], 0, f[0]]; // normalize(f × up(0,1,0))
    const sl = Math.hypot(...s) || 1;
    for (let i = 0; i < 3; i++) s[i] /= sl;
    const u = [
      s[1] * f[2] - s[2] * f[1],
      s[2] * f[0] - s[0] * f[2],
      s[0] * f[1] - s[1] * f[0],
    ];
    const roll = ((cam.roll || 0) * Math.PI) / 180,
      sr = [...s],
      ur = [...u];
    for (let i = 0; i < 3; i++) {
      s[i] = sr[i] * Math.cos(roll) + ur[i] * Math.sin(roll);
      u[i] = ur[i] * Math.cos(roll) - sr[i] * Math.sin(roll);
    }
    const V = [
      s[0],
      u[0],
      -f[0],
      0,
      s[1],
      u[1],
      -f[1],
      0,
      s[2],
      u[2],
      -f[2],
      0,
      -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]),
      -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]),
      f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2],
      1,
    ];
    const fov = ((cam.fov || 28) * Math.PI) / 180,
      n = 0.02,
      far = 40,
      t = 1 / Math.tan(fov / 2);
    const P = [
      t / aspect,
      0,
      0,
      0,
      0,
      t,
      0,
      0,
      0,
      0,
      (far + n) / (n - far),
      -1,
      0,
      0,
      (2 * far * n) / (n - far),
      0,
    ];
    const M = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        M[c * 4 + r] =
          P[r] * V[c * 4] +
          P[4 + r] * V[c * 4 + 1] +
          P[8 + r] * V[c * 4 + 2] +
          P[12 + r] * V[c * 4 + 3];
    return { M, eye, focalPx: (t * canvas.height) / 2 };
  }

  return matVP(aspect);
}

// The camera's film gate fits the rear reference without stretching or changing
// the page. screenM describes those same pixels for interrupted particle morphs.
export function cameraFrame(cam, canvas) {
  const width = canvas.width,
    height = Math.max(1, Math.round(canvas.height * (cam.frameScaleY ?? 1))),
    bottom = Math.round((canvas.height - height) / 2);
  const c = cameraMatrix(cam, { height }, width / height),
    scale = height / canvas.height,
    offset = (2 * bottom + height) / canvas.height - 1;
  // Offset the film gate, never the eye or look direction. GPU M is expressed
  // in viewport coordinates; screenM below converts it to full-canvas NDC.
  if (cam.filmOffsetY)
    for (let col = 0; col < 4; col++)
      c.M[col * 4 + 1] += c.M[col * 4 + 3] * cam.filmOffsetY / scale;
  // 水平 film gate 只平移投影，不移動眼睛或改變觀看方向。
  if (cam.filmOffsetX)
    for (let col = 0; col < 4; col++)
      c.M[col * 4] += c.M[col * 4 + 3] * cam.filmOffsetX;
  const screenM = c.M.slice();
  for (let col = 0; col < 4; col++)
    screenM[col * 4 + 1] = c.M[col * 4 + 1] * scale + c.M[col * 4 + 3] * offset;
  return { ...c, screenM, height, viewport: [0, bottom, width, height] };
}
