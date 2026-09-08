import {STRIDE} from './particle-morph.ts';
const noise=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};

// Geometry is separate from the clean character plate. No hand pixels are cut
// away to make room for it. All parts of a prop share one palm-relative pivot.
export function heldObjectPoints(count:number,pose:number){
 const anchor=[[.282,.441],[.197,.348],[.812,.232]][pose];
 const pivot=[(anchor[0]-.5)*1.04,(.5-anchor[1])*1.76,-.29];
 const out=new Float32Array(count*STRIDE);
 for(let i=0;i<count;i++){
  const a=noise(i+31),b=noise(i+792),theta=i*2.399963;
  let x=0,y=0,z=0,nx=0,ny=0,nz=-1,colour=[1,.8,.4],emission=1;
  if(pose===0){
   emission=2;
   if(i%7===0){
    // A warm ember with six short rays, enclosed by the entire blue flame.
    const axis=i%3,sign=i%2?1:-1,p=[0,0,0];p[axis]=sign*(.008+a*.04);
    p[(axis+1)%3]=(b-.5)*.012;p[(axis+2)%3]=(noise(i+54)-.5)*.012;
    [x,y,z]=p;colour=[1,.82+.18*b,.45+.45*b];
   }else{
    // Closed bulb, curling tip and three helical tongues. It has depth at
    // every angle, unlike rotating a flat flame cutout or a tapered cone.
    const t=a,radius=.19*Math.pow(Math.sin(Math.PI*t),.75)*(1-.85*t);
    const ribbon=i%5<2;
    const azimuth=ribbon?(i%3)*Math.PI*2/3+t*5+(b-.5)*.8:theta;
    const r=radius*(ribbon?.96:.65+.3*b);
    x=Math.cos(azimuth)*r-.06*t*t;y=-.108+t*.485;z=Math.sin(azimuth)*r;
    nx=Math.cos(azimuth);ny=.2;nz=Math.sin(azimuth);
    colour=ribbon?[.38+.32*b,.69+.27*b,1]:[.18,.40,.83];
   }
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
    colour=[1,.80,.84];emission=2;
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
    const edge=i%5<2,u=Math.sqrt(a),v=edge?0:b;
    [x,y,z]=v1.map((n,j)=>n*(1-u)+v2[j]*u*(1-v)+v3[j]*u*v);
    const ab=v2.map((n,j)=>n-v1[j]),ac=v3.map((n,j)=>n-v1[j]);
    nx=ab[1]*ac[2]-ab[2]*ac[1];ny=ab[2]*ac[0]-ab[0]*ac[2];nz=ab[0]*ac[1]-ab[1]*ac[0];
    if(nx*x+ny*y+nz*z<0){nx=-nx;ny=-ny;nz=-nz;}
    colour=edge?[1,.69,.77]:[.72,.45,.52];emission=edge?2:1;
   }
  }else{
   const radius=.087;
   if(i%4===0){
    const r=radius*(1.45+a*.35);x=Math.cos(theta)*r;y=Math.sin(theta)*r*.30;z=Math.sin(theta)*r*.954;
    nx=0;ny=.954;nz=-.30;colour=[.86,.69,1];
   }else{
    ny=1-2*a;const r=Math.sqrt(1-ny*ny);nx=Math.cos(theta)*r;nz=Math.sin(theta)*r;
    x=nx*radius;y=ny*radius;z=nz*radius;
    const band=.66+.34*Math.sin(y*90+theta*.3);colour=[.68*band,.43*band,.96*band];
   }
  }
  // A small crown replaces only the inner accent, leaving the approved shell,
  // scale, ornaments and palm anchor intact. In the flame these are the ember IDs.
  if(i%7===0){
   const crownId=Math.floor(i/7),part=crownId%7,connector=part===4;
   const angle=connector?Math.floor(crownId/7)%5*Math.PI*2/5:noise(i+431)*Math.PI*2,segment=angle/(Math.PI*2/5)%1;
   const peak=1-Math.abs(segment*2-1),band=part===0;
   const radius=.043*(band||connector?1:1+peak*.16);
   x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;
   y=connector?-.019+a*.027:band?-.019+(b-.5)*.004:.008+peak*.045;
   nx=Math.cos(angle);ny=.1;nz=Math.sin(angle);
   colour=[1,.90,.56];emission=2;
   if(part>=5){
    // A second stepped band gives the little crown a solid jewellery base.
    const radius=part===5?.048:.043+a*.005;
    x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;
    y=part===5?-.042+(b-.5)*.003:-.042+a*.023;
    colour=part===5?[1,.91,.67]:[.76,.59,.34];
   }
  }
  const length=Math.hypot(nx,ny,nz)||1;
  out.set([x+pivot[0],y+pivot[1],z+pivot[2],...colour,nx/length,ny/length,nz/length,...pivot,emission],i*STRIDE);
 }
 return out;
}
