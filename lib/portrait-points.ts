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

 const luminance=(p:number)=>{const k=p*4;return (.2126*pixels[k]+.7152*pixels[k+1]+.0722*pixels[k+2])/255;};
 let total=0;
 for(let p=0;p<mask.length;p++){
  if(mask[p]||pixels[p*4+3]<80)continue;
  const x=p%width,y=Math.floor(p/width),light=luminance(p);
  const left=x>0?p-1:p,right=x<width-1?p+1:p,up=y>0?p-width:p,down=y<height-1?p+width:p;
  const edge=Math.max(Math.abs(luminance(left)-luminance(right)),Math.abs(luminance(up)-luminance(down)),mask[left],mask[right],mask[up],mask[down]);
  // Allocate more stars to folds, fingers and object rims, keeping shadow volume.
  const u=x/width,v=y/height;
  const head=pose>=0&&v<.345&&v>.035&&u>.33&&u<.79;
  const face=head&&v>.16&&u>(pose===2?.43:.36)&&u<(pose===0?.72:.63);
  const hand=pose===0?u<.50&&v>.40&&v<.63:pose===1?u<.33&&v>.365&&v<.51:pose===2?u>.78&&v>.26&&v<.45:false;
  weights[p]=(.13+light*.85+edge*1.5)*(face?2.4:head?1.5:hand?1.6:.85);
  if(head&&distance[p]<4)weights[p]+=1.5;
  total+=weights[p];
 }
 if(!total)throw new Error('No portrait points');
 const bodyCount=count;
 const out=new Float32Array(count*STRIDE);let p=0,accumulated=weights[0];
 for(let i=0;i<bodyCount;i++){
  const target=(i+noise(i))*total/bodyCount;
  while(accumulated<target&&p<weights.length-1)accumulated+=weights[++p];
  const x=p%width+.5+(noise(i+count)-.5)*.7,y=Math.floor(p/width)+.5+(noise(i+count*2)-.5)*.7,k=i*STRIDE;
  out[k]=(x/width-.5)*1.04;out[k+1]=(.5-y/height)*1.76;
  out[k+2]=depth[p];
  // Keep the original portrait. Only soften the cropped clothing at the two
  // outer edges with a few short star wisps; never extend the face or the hem.
  const edgeWidth=.035,u=x/width,v=y/height,edgeDistance=Math.min(u,1-u);
  if(pose>=0&&v>.55&&edgeDistance<edgeWidth){
   const strength=Math.pow(1-Math.max(0,edgeDistance)/edgeWidth,2);
   const reach=.065*Math.pow(noise(i+891),2)*strength;
   out[k]+=(u<.5?-1:1)*reach;
   out[k+1]+=Math.sin(v*18+pose)*reach*.25;
   out[k+2]+=Math.sin(i)*reach*.18;
  }
  const px=p%width,py=Math.floor(p/width),dx=Math.min(3,px,width-1-px),dy=Math.min(3,py,height-1-py);
  const nx=dx?(depth[p+dx]-depth[p-dx])/(2*dx/width*1.04):0;
  const ny=dy?(depth[p-dy*width]-depth[p+dy*width])/(2*dy/height*1.76):0;
  const length=Math.hypot(nx,ny,1);out[k+6]=nx/length;out[k+7]=ny/length;out[k+8]=-1/length;
  for(let c=0;c<3;c++)out[k+3+c]=Math.min(1,Math.pow(pixels[p*4+c]/255,.88)*1.12);
  if(pose>=0&&y/height>.15&&y/height<.345&&x/width>.33&&x/width<.79){
   const light=Math.max(out[k+3],out[k+4],out[k+5]);
   const lift=light>0?Math.max(1,.30/light):1;
   for(let c=3;c<6;c++)out[k+c]=Math.min(1,out[k+c]*lift);
  }

 }

 return out;
}
