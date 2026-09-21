import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createPath} from '../../lib/fantasy/orbit.mjs';
import {cameraFrame} from '../../lib/fantasy/camera.mjs';
import {brandSkyCamera,isPureSky,isBrandOpening} from './brand-sky.mjs';
import {cupStudyCamera} from './cup-placement.mjs';
const path=createPath(JSON.parse(fs.readFileSync('public/fantasy/camera-alignment.json')));
for(const [width,height]of[[1280,720],[1000,790],[390,844]]) {
 const aspect=width/height;
 for(const step of [1,5]){const state={cameraWeights:Array.from({length:6},(_,i)=>Number(i===step))};const {filmOffsetY,...actual}=brandSkyCamera(path,state,aspect);assert.deepEqual(actual,cupStudyCamera(path,state,step===5?Math.max(.8,aspect):aspect));assert(!isPureSky(state));}
 for(const step of [3,4]){
  const state={cameraWeights:Array.from({length:6},(_,i)=>Number(i===step))},cam=brandSkyCamera(path,state,aspect),m=cameraFrame(cam,{width,height}).screenM;
  assert(isPureSky(state));assert.deepEqual(cam.target,[0,1.6,0]);
  let inside=0;
  for(const name of ['surface-stars.f32','reference-stars.f32']){const raw=fs.readFileSync('public/fantasy/'+name),a=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);for(let k=0;k<a.length;k+=8){const q=[0,1,2,3].map(r=>m[r]*a[k]+m[r+4]*a[k+1]+m[r+8]*a[k+2]+m[r+12]);if(q[3]>.02&&[0,1,2].every(j=>Math.abs(q[j])<=q[3]))inside++;}}
  assert.equal(inside,0);console.log({width,height,step,inside,pureSky:true});
 }
}
for(const[width,height]of[[1280,720],[1000,790],[390,844]]){
 const c=brandSkyCamera(path,{cameraWeights:[1,0,0,0,0,0]},width/height),frame=cameraFrame(c,{width,height}),m=frame.screenM;
 assert(frame.eye[1]>1.05,'eye above existing head');
 let max=0;for(const x of[-.64,.64])for(const z of[-.3933,.46]){const a=-35*Math.PI/180,p=[Math.cos(a)*x+Math.sin(a)*z,2.2,-Math.sin(a)*x+Math.cos(a)*z],q=[0,1,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]);max=Math.max(max,Math.abs(q[0]/q[2]),Math.abs(q[1]/q[2]));}assert(max<.99,'full ceiling fits');console.log({width,height,ceilingMaxNDC:max,eye:frame.eye});
}

for(const aspect of [1280/720,1000/790,390/844]) {
 const front=brandSkyCamera(path,{cameraWeights:[0,1,0,0,0,0]},aspect),rear=brandSkyCamera(path,{cameraWeights:[0,0,1,0,0,0]},aspect);
 for(let i=0;i<=100;i++) {
  const t=i/100,state={cameraWeights:[0,1-t,t,0,0,0]},c=brandSkyCamera(path,state,aspect);
  assert(Math.abs(c.target[1]-(front.target[1]*(1-t)+rear.target[1]*t))<1e-10,'direct focus interpolation, no hump');
  assert(Math.abs(c.az-(front.az*(1-t)+rear.az*t))<1e-10,'direct CCW arc');
  assert(!isBrandOpening(state));
  assert(!isBrandOpening({cameraWeights:[0,0,0,0,1-t,t]}),'no ceiling during sky to ending');
 }
}
assert(isBrandOpening({cameraWeights:[.001,.999,0,0,0,0]}));
console.log('Direct CCW arc and opening-only ceiling: 303 intermediate samples pass');

// Phone ending uses the desktop eye and orientation. Its narrow film crop must
// retain the head while keeping every sampled source cutoff point below screen.
{
 const state={cameraWeights:[0,0,0,0,0,1]},desktop=brandSkyCamera(path,state,1280/720),phone=brandSkyCamera(path,state,390/844);
 const {filmOffsetY,...phoneView}=phone;assert.deepEqual(phoneView,desktop);
 const m=cameraFrame(phone,{width:390,height:844}).screenM;
 const raw=fs.readFileSync('public/fantasy/surface-stars.f32'),points=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);
 let maxHead=-Infinity,maxCut=-Infinity;
 for(let i=0;i<points.length;i+=8){const y=(m[1]*points[i]+m[5]*points[i+1]+m[9]*points[i+2]+m[13])/(m[3]*points[i]+m[7]*points[i+1]+m[11]*points[i+2]+m[15]);maxHead=Math.max(maxHead,y);if(points[i+1]<.025)maxCut=Math.max(maxCut,y);}
 assert(maxHead<1);assert(maxCut<-1);console.log({phoneDesktopCameraEqual:true,maxHead,maxCut});
}

// 腰部與肩部是來源幾何區域；數值僅作裁切回歸，仍須實看輪廓。
// 不以頭頂佔畫面百分比冒充使用者需求。
// R4（2026-09-21）：手機背面與桌面共用同一觀看方向、俯仰與人物朝向；
// 直式只改取景：頭頂落在畫面上半、腰線與來源底部切口留在畫外，
// 兩側衣袍允許裁切（不再要求完整肩寬，也不再把人物壓到畫面底部）。
const rawRear=fs.readFileSync('public/fantasy/surface-stars.f32');
const rearPoints=new Float32Array(rawRear.buffer,rawRear.byteOffset,rawRear.byteLength/4);
const rearState={cameraWeights:[0,0,1,0,0,0]};
const desktopRear=brandSkyCamera(path,rearState,1280/720);
const sizes=[[344,882],[360,838],[360,800],[412,915],[390,844],[390,664],[375,667],[360,640],[320,568],[1280,720]];
// 包含 portrait 飽和點 .46 與短手機中段 .56，避免只保護幾個幸運的尺寸。
for(let n=30;n<=65;n++) sizes.push([390,390/(n/100)]);
for(const [width,height] of sizes){
 const aspect=width/height,c=brandSkyCamera(path,rearState,aspect),m=cameraFrame(c,{width,height}).screenM;
 for(const key of ['az','el','dist','target','roll']) assert.deepEqual(c[key],desktopRear[key],'手機與桌面背面共用同一眼位、方向與俯仰');
 let maxCut=-Infinity,minShoulderY=Infinity,maxHead=-Infinity,maxWaist=-Infinity,headXmin=Infinity,headXmax=-Infinity;
 for(let i=0;i<rearPoints.length;i+=8){
  const a=rearPoints,w=m[3]*a[i]+m[7]*a[i+1]+m[11]*a[i+2]+m[15];
  assert(w>.02,'背面測量點在相機前方');
  const x=(m[0]*a[i]+m[4]*a[i+1]+m[8]*a[i+2]+m[12])/w,y=(m[1]*a[i]+m[5]*a[i+1]+m[9]*a[i+2]+m[13])/w;
  maxHead=Math.max(maxHead,y);
  if(a[i+1]>.7){headXmin=Math.min(headXmin,x);headXmax=Math.max(headXmax,x);}
  if(a[i+1]>.52){minShoulderY=Math.min(minShoulderY,y);if(aspect>=.8)assert(Math.abs(x)<.97,'桌面完整肩寬');assert(y<1,'後腦不出框');}
  if(a[i+1]<.025)maxCut=Math.max(maxCut,y);
  if(a[i+1]<.2)maxWaist=Math.max(maxWaist,y);
 }
 assert(maxCut<-1.04,'來源底部切口留在畫外');
 assert(maxWaist<-1,'桌面與手機均不露腰');
 if(aspect<.8){
  assert(maxWaist<-1.03,`${width}x${height} 腰部必須在畫外並保留餘裕: ${maxWaist}`);
  const headTop=(1-maxHead)/2;
  assert(headTop>.3&&headTop<.45,`${width}x${height} 頭頂應落在畫面上半（三成至四成五）: ${headTop}`);
  assert(minShoulderY>-1,`${width}x${height} 肩線須在畫面內: ${minShoulderY}`);
  assert(Math.abs(headXmin+headXmax)/2<.2&&headXmax-headXmin<1.7,`${width}x${height} 後腦置中且不溢出兩側: ${headXmin},${headXmax}`);
 }
 if(Number.isInteger(height))console.log({width,height,headY:(1-maxHead)*height/2,shoulderBottom:(1-minShoulderY)*height/2,waistMargin:(-1-maxWaist)*height/2,headX:[+headXmin.toFixed(2),+headXmax.toFixed(2)]});
}
console.log('背面：10個實際尺寸＋aspect .30–.65連續區間，桌面方向共用／頭頂上半／腰部畫外通過');

// Freeze the calibrated view observed in ticket-21/ui.json + ui-step-2.png.
// This is a visual-regression baseline, not owner acceptance of the artwork.
// Compare the public screen projection so equivalent camera representations
// remain valid, while rejected oblique views and framing drift cannot pass.
const calibratedRear={target:[.03,.76,-.04],az:195,el:-6,dist:1.4,roll:0,fov:28,frameScaleY:1};
for(const [width,height] of [[1440,900],[1280,720],[1000,790],[1707,735]]){
 const canvas={width,height},c=brandSkyCamera(path,rearState,width/height);
 const actual=cameraFrame(c,canvas).screenM,expected=cameraFrame(calibratedRear,canvas).screenM;
 assert(actual.every((v,i)=>Math.abs(v-expected[i])<1e-6),'desktop rear retains the browser-calibrated screen projection');
}
