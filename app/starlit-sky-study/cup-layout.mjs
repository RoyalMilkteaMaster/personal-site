// 杯子的單一接點契約；Ticket 14 以同一變換對齊手掌與吸管。
export const CUP_CONTACTS = Object.freeze({leftGrip:[-.24,-.14,0],rightGrip:[.24,-.14,0],strawTip:[-.004704,.482,.08362]});
export function openingCupPlacement(aspect) {
 const a=-35*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
 const portrait=Math.max(0,Math.min(1,(.8-aspect)/.34));
 const x=.43-.105*portrait,z=.32+.36*portrait,scale=.16+.26*portrait;
 const center=[co*x+si*z,2.18,-si*x+co*z];
 const matrix=new Float32Array([co,0,-si,0,si,0,co,0,0,-1,0,0,...center,1]);
 return {center,scale,matrix};
}
export function cupMotion(seconds,reducedMotion=false) {
 const time=reducedMotion?0:seconds;
 return {time,angle:time*.23};
}
export function openingCupContact(name,aspect,seconds,reducedMotion=false) {
 const {center,scale,matrix:m}=openingCupPlacement(aspect),p=CUP_CONTACTS[name];
 if(!p)throw Error('Unknown cup contact');
 const {angle:a}=cupMotion(seconds,reducedMotion),c=Math.cos(a),s=Math.sin(a),q=[c*p[0]+s*p[2],p[1],-s*p[0]+c*p[2]];
 return center.map((v,i)=>v+scale*(m[i]*q[0]+m[i+4]*q[1]+m[i+8]*q[2]));
}
export function endingCupOpacity(state) {
 const t=Math.max(0,Math.min(1,(state.cameraWeights[5]-.75)/.25));
 return t*t*(3-2*t);
}
