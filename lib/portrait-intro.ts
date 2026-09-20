import {assignParticleIds,ease,STRIDE} from './particle-morph.ts';
// The first turn (900ms), the typing (900ms) and the wait (3000ms) are the
// approved fixed values. The second leg is the one the spec leaves to
// calibration: it now carries 200 degrees *and* a pull from radius 3.2 out to
// 7.8 — the whole figure arriving from a head-and-shoulders close-up, where the
// old 1900ms only had to travel 4.6 to 7.2. 2600ms keeps that at a readable
// speed instead of a lurch.
export const INTRO_MOVE_MS=1800,INTRO_TURN_MS=900,INTRO_RETURN_TURN_MS=400,INTRO_PULLBACK_MS=2200,INTRO_RETURN_MS=INTRO_RETURN_TURN_MS+INTRO_PULLBACK_MS,INTRO_TYPE_MS=900,INTRO_WAIT_MS=3000;
export const INTRO_COPY={
 front:{title:'嗨，我是林品宏。',body:'探索 AI、自動化與系統開發。'},
 back:{title:'從好奇，到實作。',body:'讓想法走出腦海，成為能被使用的作品。'}
};
export type IntroStage='approach'|'front'|'turn-back'|'back'|'return'|'done';
export type IntroState={stage:IntroStage;visibleChars:number;canAdvance:boolean};
const stages:IntroStage[]=['approach','front','turn-back','back','return','done'];
export class IntroSequence{
 stage:IntroStage='approach';started:number;
 constructor(now:number){this.started=now;}
 update(now:number,advance=false){
  const held=this.stage==='front'||this.stage==='back';
  const duration=held?INTRO_TYPE_MS+INTRO_WAIT_MS:this.duration();
  if(this.stage!=='done'&&(now-this.started>=duration||(held&&advance&&now-this.started>=INTRO_TYPE_MS))){
   this.stage=stages[stages.indexOf(this.stage)+1];this.started=now;
  }
  const copy=this.stage==='front'||this.stage==='back'?INTRO_COPY[this.stage]:null;
  return {stage:this.stage,visibleChars:copy?Math.ceil((copy.title.length+copy.body.length)*Math.min(1,(now-this.started)/INTRO_TYPE_MS)):0,canAdvance:!!copy&&now-this.started>=INTRO_TYPE_MS};
 }
 duration(){return this.stage==='turn-back'?INTRO_TURN_MS:this.stage==='return'?INTRO_RETURN_MS:INTRO_MOVE_MS;}
 progress(now:number){return Math.min(1,Math.max(0,(now-this.started)/this.duration()));}
}
type View={zoom:number;x:number;y:number;z:number;pitch:number;yaw:number};
const macro:View={zoom:6.4,x:.07,y:.70,z:-.14,pitch:.16,yaw:-.06};
const front:View={zoom:2.7,x:.07,y:.50,z:-.14,pitch:-.015,yaw:0};
// Oblique perspective comes from the reference, not rotating a flat image sideways.
const back:View={zoom:2.5,x:0,y:.44,z:-.14,pitch:0,yaw:0};
export type PortraitView='approach'|'front'|'back'|'wide';
// Close-ups use the approved image relief. Front/back changes are particle morphs, never fake 3D orbits.
export function portraitView(source:Float32Array,view:PortraitView,progress:number,out:Float32Array){
 if(source.length!==out.length)throw new Error('Particle counts must remain equal');
 if(view==='wide'){out.set(source);return out;}
 const a=view==='approach'?macro:view==='back'?back:front;
 const b=view==='back'?back:front;
 const t=view==='approach'?ease(progress):1;
 const mix=(key:keyof View)=>a[key]+(b[key]-a[key])*t;
 const zoom=mix('zoom'),cx=mix('x'),cy=mix('y'),cz=mix('z');
 const cp=Math.cos(mix('pitch')),sp=Math.sin(mix('pitch')),cr=Math.cos(mix('yaw')),sr=Math.sin(mix('yaw'));
 out.set(source);
 for(let k=0;k<out.length;k+=STRIDE){
  const x=source[k]-cx,y=source[k+1]-cy,z=source[k+2]-cz,rx=x*cr+z*sr,rz=-x*sr+z*cr;
  out[k]=rx*zoom;out[k+1]=(y*cp-rz*sp)*zoom;out[k+2]=(y*sp+rz*cp)*Math.sqrt(zoom);
  const nx=source[k+6]*cr+source[k+8]*sr,nz=-source[k+6]*sr+source[k+8]*cr;
  out[k+6]=nx;out[k+7]=source[k+7]*cp-nz*sp;out[k+8]=source[k+7]*sp+nz*cp;
 }
 return out;
}

export function introWideProgress(progress:number){
 return Math.max(0,Math.min(1,(progress*INTRO_RETURN_MS-INTRO_RETURN_TURN_MS)/INTRO_PULLBACK_MS));
}
// The held object may not appear until the whole figure is really in the frame.
//
// This used to hang off introWideProgress, which describes the retired return:
// a 400ms reverse spiral and then a pull-back that reached the wide pose as
// soon as it began. Under the orbit camera the second leg is one continuous
// move, and reading "the pull-back has started" as "the figure is wide" put the
// flame on screen at 260 degrees with the pose's worst point still at |NDC|
// 1.91 — the legs and hem cropped away, the object visible. Stage alone cannot
// answer this question; the framing has to.
//
// Measured on the real cloud with evidence/tools/03-reveal-fit.mjs: every body
// point is inside the frame from 0.815 of the leg onwards, at every layout
// aspect the page uses. Against the conservative per-band boxes the regression
// test projects — corners that are a superset of the cloud — the same crossing
// lands at 0.85. The fade starts past both, runs 364ms and reaches 1 exactly as
// the camera settles, so `done` continues it without a step. introWideProgress
// stays as it is; it still describes the close-up weighting, a different
// question.
export const INTRO_PROP_START=.86;
export function introPropReveal(stage:IntroStage,progress:number){
 return stage==='done'?1:stage==='return'?ease((progress-INTRO_PROP_START)/(1-INTRO_PROP_START)):0;
}


// Replace body samples only, preserving the sky and hidden hand-object identities.
export function rearPortrait(front:Float32Array,body:Float32Array){
 const slots:number[]=[];
 for(let k=0;k<front.length;k+=STRIDE)if(front[k+12]===0)slots.push(k);
 if(body.length!==slots.length*STRIDE)throw new Error('Rear body count must match front');
 const reference=new Float32Array(body.length);
 slots.forEach((k,i)=>reference.set(front.subarray(k,k+STRIDE),i*STRIDE));
 const paired=assignParticleIds(body,0,reference),out=front.slice();
 slots.forEach((k,i)=>out.set(paired.subarray(i*STRIDE,(i+1)*STRIDE),k));
 return out;
}
