import assert from 'node:assert/strict';
import {openingCupPlacement,openingCupContact,endingCupOpacity} from './cup-layout.mjs';
import {brandOpeningCamera} from './brand-sky.mjs';
import {cameraFrame} from '../../lib/fantasy/camera.mjs';
const project=(m,p,w,h)=>{const q=[0,1,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]);return [(q[0]/q[2]+1)*w/2,(1-q[1]/q[2])*h/2];};
for(const [width,height] of [[390,844],[360,800],[430,932],[768,1024],[1440,900]]){
 const aspect=width/height,{matrix:m,center,scale}=openingCupPlacement(aspect),vp=cameraFrame(brandOpeningCamera(aspect),{width,height}).screenM;
 const box=[Infinity,Infinity,-Infinity,-Infinity];
 // 原資產的完整自轉包絡，包含尾巴和側吊飾。
 for(let i=0;i<72;i++)for(const y of [-.482,.487]){
  const a=i*Math.PI/36,p=[.397*Math.cos(a),y,.397*Math.sin(a)];
  const world=center.map((v,k)=>v+scale*(m[k]*p[0]+m[k+4]*p[1]+m[k+8]*p[2]));
  const [x,yy]=project(vp,world,width,height);box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],yy);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],yy);
 }
 assert(box[3]-box[1]>=110,'opening cup must have at least 110 CSS px height: '+JSON.stringify({width,box}));
 assert(box[0]>width*.52 && box[2]<width-12,'cup stays in right safe area');
 assert(box[1]>70 && box[3]<height*.46,'cup clears header and brand');
 for(const t of [0,7,14,21,28])for(const name of ['leftGrip','rightGrip','strawTip'])assert(openingCupContact(name,aspect,t).every(Number.isFinite));
 for(const name of ['leftGrip','rightGrip','strawTip']){
  const start=openingCupContact(name,aspect,0),end=openingCupContact(name,aspect,2*Math.PI/.23);
  assert(start.every((v,i)=>Math.abs(v-end[i])<1e-12),'grips return continuously after one rotation');
 }
 console.log({width,height,box});
}
for(let i=0;i<5;i++){const cameraWeights=Array(6).fill(0);cameraWeights[i]=1;assert.equal(endingCupOpacity({cameraWeights}),0);}
assert.equal(endingCupOpacity({cameraWeights:[0,0,0,0,0,1]}),1);
for(let i=0;i<=100;i++){const t=i/100,v=endingCupOpacity({cameraWeights:[0,0,0,0,1-t,t]});assert(v>=0&&v<=1);if(t<=.75)assert.equal(v,0);}
console.log('cup placement, contacts and ending visibility passed');

// B1：減少動態時，傳入同一偏好的接點必須跟 render 的零角度一致。
for(const name of ['leftGrip','rightGrip','strawTip']){
 const atRest=openingCupContact(name,390/844,0,true);
 const later=openingCupContact(name,390/844,10,true);
 assert.deepEqual(later,atRest,'reduced-motion contact must remain on static cup');
}
