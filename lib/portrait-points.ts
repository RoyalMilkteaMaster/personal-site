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

export function portraitPoints(pixels:Uint8ClampedArray,width:number,height:number,count:number){
 const mask=backgroundMask(pixels,width,height),weights=new Float32Array(width*height);
 const luminance=(p:number)=>{const k=p*4;return (.2126*pixels[k]+.7152*pixels[k+1]+.0722*pixels[k+2])/255;};
 let total=0;
 for(let p=0;p<mask.length;p++){
  if(mask[p]||pixels[p*4+3]<80)continue;
  const x=p%width,y=Math.floor(p/width),light=luminance(p);
  const left=x>0?p-1:p,right=x<width-1?p+1:p,up=y>0?p-width:p,down=y<height-1?p+width:p;
  const edge=Math.max(Math.abs(luminance(left)-luminance(right)),Math.abs(luminance(up)-luminance(down)),mask[left],mask[right],mask[up],mask[down]);
  // Allocate more stars to folds, fingers and object rims, keeping shadow volume.
  weights[p]=.13+light*.85+edge*1.5;total+=weights[p];
 }
 if(!total)throw new Error('No portrait points');
 const out=new Float32Array(count*STRIDE);let p=0,accumulated=weights[0];
 for(let i=0;i<count;i++){
  const target=(i+noise(i))*total/count;
  while(accumulated<target&&p<weights.length-1)accumulated+=weights[++p];
  const x=p%width+.5+(noise(i+count)-.5)*.7,y=Math.floor(p/width)+.5+(noise(i+count*2)-.5)*.7,k=i*STRIDE;
  out[k]=(x/width-.5)*1.04;out[k+1]=(.5-y/height)*1.76;
  // ponytail: a shallow portrait volume, not a full 3D model; large camera orbits need geometry.
  out[k+2]=(luminance(p)-.5)*.1;
  for(let c=0;c<3;c++)out[k+3+c]=Math.min(1,Math.pow(pixels[p*4+c]/255,.88)*1.12);
 }
 return out;
}
