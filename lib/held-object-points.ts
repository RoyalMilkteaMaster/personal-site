import {STRIDE} from './particle-morph.ts';
const noise=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};

// Geometry is separate from the clean character plate. No hand pixels are cut
// away to make room for it. All parts of a prop share one palm-relative pivot.
export function heldObjectPoints(count:number,pose:number){
 const anchor=[[.326,.276],[.180,.215],[.809,.143]][pose];
 const pivot=[(anchor[0]-.5)*.88,(.5-anchor[1])*1.76,-.29];
 const out=new Float32Array(count*STRIDE);
 for(let i=0;i<count;i++){
  const a=noise(i+31),b=noise(i+792),theta=i*2.399963;
  let x=0,y=0,z=0,nx=0,ny=0,nz=-1,colour=[1,.8,.4],emission=1;
  if(i%5<2){
   // A real open crown: a circular band and five raised gold points, visible
   // from every angle. It shares the enclosing prop's palm-relative pivot.
   const angle=noise(i+431)*Math.PI*2,segment=angle/(Math.PI*2/5)%1;
   const peak=1-Math.abs(segment*2-1),radius=.072;
   const base=-.040,top=.010+peak*.070,part=Math.floor(i/5)%5;
   const r=part<2?radius*(.96+.08*a):radius*(1+(part<4?peak:a*peak)*.16);
   y=part<2?base+(b-.5)*.007:part<4?top:base+(top-base)*b;
   x=Math.cos(angle)*r;z=Math.sin(angle)*r;
   nx=Math.cos(angle);ny=.12;nz=Math.sin(angle);
   colour=part<4?[1,.90,.56]:[.92,.65,.26];emission=part<4?2:1;
  }else if(pose===0){
   emission=2;
    // Closed bulb, curling tip and three helical tongues. It has depth at
    // every angle, unlike rotating a flat flame cutout or a tapered cone.
    const t=a,radius=.19*Math.pow(Math.sin(Math.PI*t),.75)*(1-.85*t);
    const ribbon=i%7<3;
    const azimuth=ribbon?(i%3)*Math.PI*2/3+t*5+(b-.5)*.8:theta;
    const r=radius*(ribbon?.96:.65+.3*b);
    x=Math.cos(azimuth)*r-.06*t*t;y=-.108+t*.485;z=Math.sin(azimuth)*r;
    nx=Math.cos(azimuth);ny=.2;nz=Math.sin(azimuth);
    colour=ribbon?[.38+.32*b,.69+.27*b,1]:[.18,.40,.83];
  }else if(pose===1){
   if(i%9===0){
    // Restore the upper pendant, connecting filament and the little star
    // directly above the cupped palm in the original reference.
    const lower=i%18===0,center=lower?-.154:.175;
    if(i%27===0){y=.125+a*.175;x=(b-.5)*.003;z=0;}
    else{
     const radius=(lower?.026:.029)*(1-a),axis=Math.floor(i/36)%3,sign=Math.floor(i/108)%2?1:-1;
     const point=[(b-.5)*.004,center,(noise(i+82)-.5)*.004];point[axis]+=sign*radius;
     [x,y,z]=point;
    }
    colour=[1,.87,.55];emission=2;
   }else{
    // Three octagonal belts form multiple triangular facets, not a plain
    // eight-face diamond. Bright edges remain readable between sparse faces.
    const side=i%8,band=Math.floor(i/8)%4,angle=side*Math.PI/4;
    const rings=[{y:.112,r:0},{y:.044,r:.075},{y:0,r:.102},{y:-.044,r:.075},{y:-.112,r:0}];
    const top=rings[band],bottom=rings[band+1];
    const v1=[Math.cos(angle)*top.r,top.y,Math.sin(angle)*top.r];
    const v2=[Math.cos(angle+Math.PI/4)*bottom.r,bottom.y,Math.sin(angle+Math.PI/4)*bottom.r];
    const v3=[Math.cos(angle)*bottom.r,bottom.y,Math.sin(angle)*bottom.r];
    // Alternate diagonals to cover both halves of each belt.
    if(Math.floor(i/32)%2&&top.r&&bottom.r){v3[0]=Math.cos(angle+Math.PI/4)*top.r;v3[1]=top.y;v3[2]=Math.sin(angle+Math.PI/4)*top.r;}
    // At a zero-radius tip use the other ring for the third vertex.
    if(!bottom.r){v3[0]=Math.cos(angle+Math.PI/4)*top.r;v3[1]=top.y;v3[2]=Math.sin(angle+Math.PI/4)*top.r;}
    const edge=i%3===0,u=Math.sqrt(a),v=edge?0:b;
    [x,y,z]=v1.map((n,j)=>n*(1-u)+v2[j]*u*(1-v)+v3[j]*u*v);
    const ab=v2.map((n,j)=>n-v1[j]),ac=v3.map((n,j)=>n-v1[j]);
    nx=ab[1]*ac[2]-ab[2]*ac[1];ny=ab[2]*ac[0]-ab[0]*ac[2];nz=ab[0]*ac[1]-ab[1]*ac[0];
    if(nx*x+ny*y+nz*z<0){nx=-nx;ny=-ny;nz=-nz;}
    colour=edge?[.76,.65,.40]:[.20,.16,.12];emission=edge?2:1;
   }
  }else{
   const radius=.087;
   if(i%4===1){
    const r=radius*(1.45+a*.35);x=Math.cos(theta)*r;y=Math.sin(theta)*r*.30;z=Math.sin(theta)*r*.954;
    nx=0;ny=.954;nz=-.30;colour=[.86,.69,1];
   }else{
    ny=1-2*a;const r=Math.sqrt(1-ny*ny);nx=Math.cos(theta)*r;nz=Math.sin(theta)*r;
    x=nx*radius;y=ny*radius;z=nz*radius;
    const band=.66+.34*Math.sin(y*90+theta*.3),rim=Math.abs(nz)<.30;
    colour=rim?[.66,.42,.96]:[.36*band,.21*band,.63*band];
   }
  }
  const length=Math.hypot(nx,ny,nz)||1;
  const scale=.80;
  out.set([x*scale+pivot[0],y*scale+pivot[1],z*scale+pivot[2],...colour,nx/length,ny/length,nz/length,...pivot,emission],i*STRIDE);
 }
 return out;
}
