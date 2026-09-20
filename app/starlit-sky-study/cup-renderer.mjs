const assetUrl = '/fantasy/milktea-12/points.bin';
import { parseMilkteaPoints,createMilkteaModel } from '../../lib/fantasy/milktea-model.mjs';
import { cameraFrame } from '../../lib/fantasy/camera.mjs';
import {cupMotion} from './cup-layout.mjs';
import { CUP_CENTER,CUP_SCALE } from './cup-placement.mjs';
export async function createStudyCup(gl,canvas) {
  const response=await fetch(assetUrl);
  if(!response.ok)throw Error('Milktea r5 asset unavailable');
  const model=createMilkteaModel(gl,parseMilkteaPoints(await response.arrayBuffer()));
  return {
    count:model.count,
    draw(camera,seconds,opacity=1,reducedMotion=false) {
      const frame=cameraFrame(camera,canvas),direction=frame.eye.map((v,i)=>v-CUP_CENTER[i]);
      if(opacity<=0 || !studyCupIntersectsView(frame.screenM))return false;
      const length=Math.hypot(...direction);
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(false);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
      model.draw(frame.screenM,{center:CUP_CENTER,scale:CUP_SCALE,opacity,...cupMotion(seconds,reducedMotion),size:1.7*Math.min(devicePixelRatio,1.5),eyeDirection:direction.map(v=>v/length)});
      gl.depthMask(true);
      return true;
    },
    dispose(){model.dispose();}
  };
}

// 六個裁切平面檢查原資產的完整自轉圓柱包絡；只略過完全在畫外的杯。
export function studyCupIntersectsView(matrix) {
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const p=[0,1,2,3].map(i=>matrix[i*4+3]+sign*matrix[i*4+axis]);
  const center=p[0]*CUP_CENTER[0]+p[1]*CUP_CENTER[1]+p[2]*CUP_CENTER[2]+p[3];
  const extent=CUP_SCALE*(.40*Math.hypot(p[0],p[2])+.49*Math.abs(p[1]));
  if(center+extent<0)return false;
 }
 return true;
}
