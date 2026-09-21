export function brandOpeningCamera(aspect){return {target:[0,2.2,.03],dist:1.1,az:-35,el:-80,roll:0,fov:Math.atan(Math.tan(25*Math.PI/180)*Math.max(1,1.4/aspect))*360/Math.PI,frameScaleY:1};}
import { cupStudyCamera } from './cup-placement.mjs';
// Full-preview opt-in: confirmed downward-facing brand ceiling and two empty-sky destinations.
export function brandSkyCamera(path,state,aspect) {
  const camera=cupStudyCamera(path,state,aspect,false);
  const portrait=Math.max(0,Math.min(1,(.8-aspect)/.34));
  // Preserve the approved desktop viewpoint on phones; crop the robe sides
  // instead of moving the eye above the figure to fit its width.
  const full=state.cameraWeights[5];
  if(aspect<.8 && full){
    const desktop=cupStudyCamera(path,{cameraWeights:[0,0,0,0,0,1]},.8,false);
    const phone=cupStudyCamera(path,{cameraWeights:[0,0,0,0,0,1]},aspect,false);
    camera.target[1]+=full*(desktop.target[1]-phone.target[1]);
    camera.fov+=full*(desktop.fov-phone.fov);
    // A portrait film gate leaves sky above the same desktop view. Ease the
    // offset away toward landscape, and weight it with the existing journey.
    camera.filmOffsetY=-.67*full*portrait;
  }
  const rear=state.cameraWeights[2];
  if(rear){
    // Calibrated against the model's head/collar centreline, not world -Z.
    // R4 (2026-09-21): phones share this exact desktop eye, orientation and
    // pitch; only the portrait framing below differs.
    camera.az+=rear*(195-path.rear.az);
    camera.el+=rear*(-6-path.rear.el);
    camera.dist+=rear*(1.4-path.rear.dist);
    camera.target[0]+=rear*(.03-path.rear.target[0]);
    camera.target[1]+=rear*(.76-path.rear.target[1]);
  }
  if(rear && aspect<.8){
    // 直式取景：固定垂直視野，讓頭頂落在畫面約四成高、腰線留在畫外；
    // 兩側衣袍隨窄螢幕裁切，不抬高鏡頭、不把人物壓到畫面底部。
    const fov=scale=>Math.atan(Math.tan(14*Math.PI/180)*scale)*360/Math.PI;
    camera.fov+=rear*(fov(1.74)-fov(Math.max(1,.8/aspect)));
    camera.filmOffsetY=(camera.filmOffsetY||0)-.17*rear;
  }
  const weight=state.cameraWeights[3]+state.cameraWeights[4];
  const opening=state.cameraWeights[0];
  if(opening){const original=cupStudyCamera(path,{cameraWeights:[1,0,0,0,0,0]},aspect),brand=brandOpeningCamera(aspect);for(const key of ['dist','az','el','fov','roll'])camera[key]+=opening*(brand[key]-original[key]);camera.target=camera.target.map((v,i)=>v+opening*(brand.target[i]-original.target[i]));}
  if(!weight)return camera;
  const old=cupStudyCamera(path,{cameraWeights:[0,0,0,0,1,0]},aspect);
  const sky={target:[0,1.6,0],dist:.3,az:450,el:-25,fov:60,roll:0};
  for(const key of ['dist','az','el','fov','roll'])camera[key]+=weight*(sky[key]-old[key]);
  camera.target=camera.target.map((v,i)=>v+weight*(sky.target[i]-old.target[i]));
  return camera;
}
export const isPureSky = state => state.cameraWeights[3]+state.cameraWeights[4]>=1-1e-9;

export const isBrandOpening = state => state.cameraWeights[0] > 0;
