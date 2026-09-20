'use client';
import { useEffect, useRef, useState } from 'react';
import { cameraFrame } from '@/lib/fantasy/camera.mjs';
import { createMilkteaModel, parseMilkteaPoints } from '@/lib/fantasy/milktea-model.mjs';
import { CONTACT_CAMERA, contactSway } from '@/lib/starlit-contact-milktea';
import './starlit-contact-milktea.css';

const ASSET_URL = '/fantasy/milktea-12/points.bin';
// 同一分頁重進聯絡區不重抓 2MB；失敗不快取，下次掛載再試。
let asset: Promise<Float32Array> | null = null;
const loadAsset = () =>
  (asset ??= fetch(ASSET_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
    .then(parseMilkteaPoints)
    .catch((e) => {
      asset = null;
      throw e;
    }));

/**
 * Ticket 03 — 聯絡區的既有 3D 貓貓奶茶（lib/fantasy/milktea-model.mjs）。
 * 自己一張透明 WebGL2 畫布、固定相機，與左側人物場景／相機完全分離；
 * 只在畫布可見且分頁未隱藏時繪製，減少動態時畫一張正面靜幀就停。
 * 素材或 WebGL 失敗：畫布卸掉，文字與聯絡入口不受影響。
 */
export default function StarlitContactMilktea() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || failed) return;
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return setFailed(true);
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let model: ReturnType<typeof createMilkteaModel> | null = null;
    let frame = 0,
      disposed = false,
      visible = true;
    const start = performance.now();
    const draw = () => {
      frame = 0;
      if (!model || disposed) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr)),
        h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const cam = cameraFrame(CONTACT_CAMERA, canvas);
      const dir = cam.eye.map((v: number, i: number) => v - CONTACT_CAMERA.target[i]);
      const len = Math.hypot(...dir);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      // 顏色相加（與主場景一致的發光疊法），alpha 走 over：透明畫布上才有正確覆蓋率。
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      model.draw(cam.screenM, {
        ...contactSway((performance.now() - start) / 1000, reduced),
        center: CONTACT_CAMERA.target,
        size: 1.7 * Math.min(dpr, 1.5),
        eyeDirection: dir.map((v: number) => v / len),
      });
      if (!reduced && visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onVisibility = () => wake();
    const onLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    const io =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) wake();
          })
        : null;
    io?.observe(canvas);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(wake) : null;
    ro?.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('webglcontextlost', onLost);
    loadAsset()
      .then((data) => {
        if (disposed) return;
        model = createMilkteaModel(gl, data);
        wake();
      })
      .catch(() => !disposed && setFailed(true));
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      model?.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [failed]);
  if (failed) return null;
  return <canvas ref={ref} className="starlit-contact-milktea" aria-hidden="true" />;
}
