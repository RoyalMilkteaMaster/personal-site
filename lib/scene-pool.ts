import {STRIDE} from './particle-morph.ts';

// How the one shared particle pool is divided.
//
// Every pose is drawn from the same slots so a chapter change is a rebuild
// rather than a cut, and the background stars take part in it. The pool used to
// be sized straight from the canvas; the opening changed that, because it
// magnifies the head about three times over the wide composition and at the
// canvas-sized density the close-up thins out into a cloud with no face in it.
//
// The first pose draws all of them, at every distance. It is a closed surface,
// so most of its stars are on the far side, on a grazing flank or behind
// something else, while the flat sampling the other two poses use puts every
// star on the surface facing the camera. Matching their *count* is what left
// the first chapter see-through: measured through this renderer's own maths at
// the wide stop, the same 22,391 stars carried 0.63 of the light the old flat
// pose did, and the hand and collar stopped reading. Drawing the whole figure
// restores it (1.24), and the count is not the quality — see
// evidence/tools/03-coverage.mjs, which rasterises both and reports coverage.
//
// The other two poses stay exactly as they were: they mark the slots they do
// not need on the body's own opacity field, so they draw the star count they
// were designed with and the surplus travels with everything else during a
// chapter change. The sky and the held object keep their original absolute
// budgets, so a bigger pool cannot become a full field of stars behind them.
export const INTRO_DETAIL = 2.7;
export const SKY_SHARE = [.065, .085, .075], OBJECT_SHARE = [.09, .07, .055];

export function scenePool(rest: number) {
 const sky = (pose: number) => Math.round(rest * SKY_SHARE[pose]);
 const object = (pose: number) => Math.round(rest * OBJECT_SHARE[pose]);
 const restFigure = rest - sky(0) - object(0);
 const count = Math.round(restFigure * INTRO_DETAIL) + sky(0) + object(0);
 return {
  rest, count, restFigure, sky, object,
  // Slots each pose fills with figure, and how many of them are ever drawn.
  body: (pose: number) => count - sky(pose) - object(pose),
  shown: (pose: number) => pose === 0 ? count - sky(0) - object(0) : rest - sky(pose) - object(pose),
 };
}

// Spread `total` picks evenly over `available` sources, keeping the source
// order. Both clouds are built part by part — the figure piece by piece, the
// silhouette row by row — so an even stride keeps every part's share instead of
// taking the first rows and dropping a limb.
export const spread = (index: number, total: number, available: number) =>
 Math.min(available - 1, Math.floor(index * available / total));

// Mark the body slots that only exist for the close-up. Field 9 is the body's
// edge fade, which is to say its opacity, so the renderer can hand these back
// as the camera closes in and a chapter change carries them along with
// everything else instead of leaving a second population behind.
export function markDetail(target: Float32Array, bodyCount: number, shown: number) {
 for (let i = 0; i < bodyCount; i++) {
  if (Math.floor((i + 1) * shown / bodyCount) === Math.floor(i * shown / bodyCount)) target[i * STRIDE + 9] = 1;
 }
 return target;
}
