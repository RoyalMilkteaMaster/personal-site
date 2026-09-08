import {STRIDE} from './particle-morph.ts';

// Only remove neutral background connected to the image border. Interior white
// highlights belong to the character, even when they match the checker colour.
export function backgroundMask(pixels:Uint8ClampedArray,width:number,height:number){
 const mask=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=0;
 const visit=(p:number)=>{
  if(mask[p])return;
  const k=p*4,max=Math.max(pixels[k],pixels[k+1],pixels[k+2]),min=Math.min(pixels[k],pixels[k+1],pixels[k+2]);
  if(pixels[k+3]>20&&(max<105||max-min>24))return;
  mask[p]=1;queue[tail++]=p;
 };
 for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x);}
 for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1);}
 while(head<tail){const p=queue[head++],x=p%width;if(x>0)visit(p-1);if(x<width-1)visit(p+1);if(p>=width)visit(p-width);if(p<width*(height-1))visit(p+width);}
 // A triptych crop can contain disconnected slivers of the neighbouring pose.
 // Keep held objects and isolated stars; discard only small side-touching fragments.
 const seen=mask.slice();
 for(let start=0;start<mask.length;start++){
  if(seen[start])continue;
  head=0;tail=1;queue[0]=start;seen[start]=1;let touchesSide=false;
  const add=(p:number)=>{if(!seen[p]){seen[p]=1;queue[tail++]=p;}};
  while(head<tail){
   const p=queue[head++],x=p%width;touchesSide ||= x===0||x===width-1;
   if(x>0)add(p-1);if(x<width-1)add(p+1);if(p>=width)add(p-width);if(p<width*(height-1))add(p+width);
  }
  if(touchesSide&&tail<width*height*.025)for(let i=0;i<tail;i++)mask[queue[i]]=1;
 }
 return mask;
}

const noise=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};

export function portraitPoints(pixels:Uint8ClampedArray,width:number,height:number,count:number,pose=-1){
 const mask=backgroundMask(pixels,width,height),weights=new Float32Array(width*height);
 // A rounded relief gives the existing silhouette a surface and real normals.
 // It is deliberately not presented as a reconstructed, complete human model.
 const distance=new Float32Array(mask.length);
 for(let p=0;p<mask.length;p++)distance[p]=mask[p]?0:Math.min(p%width,width-1-p%width,Math.floor(p/width),height-1-Math.floor(p/width));
 for(let p=0;p<mask.length;p++){if(p%width)distance[p]=Math.min(distance[p],distance[p-1]+1);if(p>=width)distance[p]=Math.min(distance[p],distance[p-width]+1);}
 for(let p=mask.length-1;p>=0;p--){if(p%width<width-1)distance[p]=Math.min(distance[p],distance[p+1]+1);if(p<mask.length-width)distance[p]=Math.min(distance[p],distance[p+width]+1);}
 const depth=distance.map(d=>-.22*(1-Math.exp(-d/(width*.045))));
 const held=pose>=0?heldObject(pose):null;
 const luminance=(p:number)=>{const k=p*4;return (.2126*pixels[k]+.7152*pixels[k+1]+.0722*pixels[k+2])/255;};
 let total=0;
 for(let p=0;p<mask.length;p++){
  if(mask[p]||pixels[p*4+3]<80)continue;
  const x=p%width,y=Math.floor(p/width),light=luminance(p);
  if(held&&pose!==0){
   const u=x/width-held.u,v=y/height-held.v;
   const inside=pose===2?((u*1.04*.92-v*1.76*.39)/.205)**2+((u*1.04*.39+v*1.76*.92)/.105)**2<1:(u/held.rx)**2+(v/held.ry)**2<1;
   const ornament=pose===1&&y/height>.16&&y/height<.434&&Math.abs(u)<(y/height<.29?.09:.025);
   if(inside||ornament)continue;
  }
  const left=x>0?p-1:p,right=x<width-1?p+1:p,up=y>0?p-width:p,down=y<height-1?p+width:p;
  const edge=Math.max(Math.abs(luminance(left)-luminance(right)),Math.abs(luminance(up)-luminance(down)),mask[left],mask[right],mask[up],mask[down]);
  // Allocate more stars to folds, fingers and object rims, keeping shadow volume.
  weights[p]=.13+light*.85+edge*1.5;total+=weights[p];
 }
 if(!total)throw new Error('No portrait points');
 const objectCount=held?Math.round(count*(pose===0?.01:.045)):0,bodyCount=count-objectCount;
 const out=new Float32Array(count*STRIDE);let p=0,accumulated=weights[0];
 for(let i=0;i<bodyCount;i++){
  const target=(i+noise(i))*total/bodyCount;
  while(accumulated<target&&p<weights.length-1)accumulated+=weights[++p];
  const x=p%width+.5+(noise(i+count)-.5)*.7,y=Math.floor(p/width)+.5+(noise(i+count*2)-.5)*.7,k=i*STRIDE;
  out[k]=(x/width-.5)*1.04;out[k+1]=(.5-y/height)*1.76;
  out[k+2]=depth[p];
  const px=p%width,py=Math.floor(p/width),dx=Math.min(3,px,width-1-px),dy=Math.min(3,py,height-1-py);
  const nx=dx?(depth[p+dx]-depth[p-dx])/(2*dx/width*1.04):0;
  const ny=dy?(depth[p-dy*width]-depth[p+dy*width])/(2*dy/height*1.76):0;
  const length=Math.hypot(nx,ny,1);out[k+6]=nx/length;out[k+7]=ny/length;out[k+8]=-1/length;
  for(let c=0;c<3;c++)out[k+3+c]=Math.min(1,Math.pow(pixels[p*4+c]/255,.88)*1.12);
 }
 if(held)writeHeldObject(out,bodyCount,objectCount,pose,held);
 return out;
}

function heldObject(pose:number){
 return [{u:.282,v:.441,rx:.058,ry:.037},{u:.207,v:.354,rx:.115,ry:.081},{u:.812,v:.232,rx:.165,ry:.079}][pose];
}

// Actual 3D surfaces: an eight-faced crystal, and spheres with tilted orbital rings.
// They have front/back points and surface normals, and rotate independently.
function writeHeldObject(out:Float32Array,start:number,count:number,pose:number,held:ReturnType<typeof heldObject>){
 const pivot=[(held.u-.5)*1.04,(.5-held.v)*1.76,-.29];
 for(let i=0;i<count;i++){
  let x=0,y=0,z=0,nx=0,ny=0,nz=-1;
  const a=noise(i+31),b=noise(i+792),theta=i*2.399963;
  if(pose===1){
   const face=i%8,angle=(face%4)*Math.PI/2,upper=face<4?1:-1;
   const top=[0,.14*upper,0],v1=[Math.cos(angle)*.098,0,Math.sin(angle)*.098],v2=[Math.cos(angle+Math.PI/2)*.098,0,Math.sin(angle+Math.PI/2)*.098];
   const u=Math.sqrt(a),v=i%5===0?0:b;
   x=top[0]*(1-u)+v1[0]*u*(1-v)+v2[0]*u*v;y=top[1]*(1-u);z=v1[2]*u*(1-v)+v2[2]*u*v;
   const ab=v1.map((n,j)=>n-top[j]),ac=v2.map((n,j)=>n-top[j]);
   nx=ab[1]*ac[2]-ab[2]*ac[1];ny=ab[2]*ac[0]-ab[0]*ac[2];nz=ab[0]*ac[1]-ab[1]*ac[0];
   if(nx*x+ny*y+nz*z<0){nx=-nx;ny=-ny;nz=-nz;}
  }else{
   const radius=pose===0?.031:.087;
   if(i%4===0){
    const r=radius*(1.45+a*.35);x=Math.cos(theta)*r;y=Math.sin(theta)*r*.30;z=Math.sin(theta)*r*.954;
    nx=0;ny=.954;nz=-.30;
   }else{
    ny=1-2*a;const r=Math.sqrt(1-ny*ny);nx=Math.cos(theta)*r;nz=Math.sin(theta)*r;
    x=nx*radius;y=ny*radius;z=nz*radius;
   }
  }
  const length=Math.hypot(nx,ny,nz),k=(start+i)*STRIDE;
  const colour=pose===0?[.68,.86,1]:pose===1?[1,.76,.40]:[.82,.61,1];
  const band=pose===1?1:.84+.16*Math.sin(theta*3+y*90);
  out.set([x+pivot[0],y+pivot[1],z+pivot[2],...colour.map(c=>c*band),nx/length,ny/length,nz/length,...pivot,1],k);
 }
}
