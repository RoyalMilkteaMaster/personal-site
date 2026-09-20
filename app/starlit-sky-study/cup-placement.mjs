import { introCamera, CUP_CENTER as originalCenter } from '../../lib/fantasy/starlit-intro.mjs';
export const CUP_CENTER = [-.61,.22,-.1];
export const CUP_SCALE = .20;
export function cupStudyCamera(path,state,aspect,avoidEarlyCup=true) {
  const c=introCamera(path,state,aspect),w=state.cameraWeights[3]+state.cameraWeights[4],full=state.cameraWeights[5];
  c.az+=360*full;
  c.target[1]+=full*(.14+.43*Math.max(0,Math.min(1,(.8-aspect)/.34)));
  if(w>0){
    c.target=c.target.map((v,i)=>v+w*(CUP_CENTER[i]-(originalCenter[i]+(i===1?.11:0))));
    c.dist+=w*(.25-2.9);
    // Look outwards from the figure's side; the figure is behind this camera.
    c.az+=w*(450-265);
    c.el-=w*9;
    c.fov=c.fov*(1-w)+82*w;
  }
  // Lift only the in-between front/rear focus so the fixed cup stays below frame.
  if (avoidEarlyCup) c.target[1] += 4 * state.cameraWeights[1] * state.cameraWeights[2] * .45;
  return c;
}
