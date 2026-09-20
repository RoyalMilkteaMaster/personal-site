import {evaluateCatgirl} from './catgirl-animation.mjs';
import {program} from '../fantasy-particles.mjs';

export const CATGIRL_DRESS_URL='/fantasy/catgirl-13/dress-v2.png';
export const CATGIRL_GAZE_URL='/fantasy/catgirl-13/gaze-v2.png';
export const CATGIRL_ATLAS_URL='/fantasy/catgirl-13/layers-v1.png';
// 原候選為 1536×1024 色鍵分層圖；執行時去綠，原檔不改寫。
async function loadKeyedImage(url){
  const image=new Image();image.src=url;await image.decode();
  const sheet=document.createElement('canvas');sheet.width=image.width;sheet.height=image.height;
  const ctx=sheet.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Catgirl atlas canvas unavailable');
  ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,sheet.width,sheet.height),d=pixels.data;
  for(let i=0;i<d.length;i+=4){const excess=d[i+1]-Math.max(d[i],d[i+2]);
    d[i+3]*=1-Math.max(0,Math.min(1,(excess-25)/95));
    if(excess>25)d[i+1]=Math.min(d[i+1],Math.max(d[i],d[i+2])+20);
  }
  ctx.putImageData(pixels,0,0);
  return sheet;
}
export async function loadCatgirlAtlas(url=CATGIRL_ATLAS_URL){
  const gaze=new Image();gaze.src=CATGIRL_GAZE_URL;
  const [sheet,dress]=await Promise.all([loadKeyedImage(url),loadKeyedImage(CATGIRL_DRESS_URL),gaze.decode()]);
  sheet.gaze=gaze;sheet.dress=dress;return sheet;
}
const rects={head:[25,8,365,375],blink:[410,8,360,375],body:[785,6,375,376],tail:[1180,30,330,340],
  leftArm:[55,390,220,370],rightArm:[520,390,220,370],leftLeg:[885,386,120,383],rightLeg:[1290,386,120,383],
  leftEar:[62,790,215,223],rightEar:[505,790,215,223],palm:[885,780,155,235],grip:[1275,780,155,235]};
function sprite(ctx,atlas,name,x,y,w,h,angle=0,px=.5,py=.5){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(atlas,...rects[name],-w*px,-h*py,w,h);ctx.restore();
}
// 指定圖內骨點，以等比旋轉縮放映射到固定長度骨段；不沿單一軸壓縮袖子。
function segment(ctx,atlas,rect,from,to,start,end){
  const angle=Math.atan2(end[1]-start[1],end[0]-start[0])-Math.atan2(to[1]-from[1],to[0]-from[0]);
  const scale=Math.hypot(end[0]-start[0],end[1]-start[1])/Math.hypot(to[0]-from[0],to[1]-from[1]);
  ctx.save();ctx.translate(...start);ctx.rotate(angle);ctx.scale(scale,scale);
  const sourceAngle=Math.atan2(to[1]-from[1],to[0]-from[0]),length=Math.hypot(to[0]-from[0],to[1]-from[1]);
  ctx.rotate(sourceAngle);ctx.beginPath();ctx.rect(-10,-250,length+20,500);ctx.clip();ctx.rotate(-sourceAngle);
  ctx.drawImage(atlas,...rect,rect[0]-from[0],rect[1]-from[1],rect[2],rect[3]);ctx.restore();
}
function arm(ctx,atlas,side,pose){
  const left=side==='left';
  segment(ctx,atlas,left?[95,390,170,220]:[520,390,165,220],left?[222,420]:[575,420],left?[177,580]:[617,580],pose.shoulder,pose.elbow);
  segment(ctx,atlas,left?[55,565,180,195]:[565,565,170,195],left?[177,580]:[617,580],left?[112,706]:[655,706],pose.elbow,pose.wrist);
}
function footsteps(ctx,stars){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const star of stars){const [x,y]=star.position;ctx.globalAlpha=star.alpha;
    const glow=ctx.createRadialGradient(x,y,0,x,y,24);glow.addColorStop(0,'#fffbea');glow.addColorStop(.22,'#e0c49d99');glow.addColorStop(1,'#c0a7e500');ctx.fillStyle=glow;ctx.fillRect(x-24,y-24,48,48);
    ctx.fillStyle='#fffbea';ctx.beginPath();ctx.moveTo(x,y-11);ctx.lineTo(x+2,y-2);ctx.lineTo(x+14,y);ctx.lineTo(x+2,y+2);ctx.lineTo(x,y+11);ctx.lineTo(x-2,y+2);ctx.lineTo(x-14,y);ctx.lineTo(x-2,y-2);ctx.closePath();ctx.fill();
  }ctx.restore();
}
function eyes(ctx,atlas,s){
  if(s.blink||!s.gaze)return;
  // 只採生成圖的眼白／虹膜，不採含棋盤格的背景，也不替換原本臉、頭髮或頭部比例。
  const source=s.gaze<0?[284,449]:[1653,1789];ctx.save();ctx.globalAlpha=Math.abs(s.gaze);
  for(let i=0;i<2;i++){const x=-365*.493/2+([177,259][i]-25)*.493,y=-133+(204-8)*.493,w=62*.493,h=40*.493;
    ctx.save();ctx.beginPath();ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2);ctx.clip();ctx.drawImage(atlas.gaze,source[i]-58,345,116,76,x-w/2,y-h/2,w,h);ctx.restore();
  }ctx.restore();
}
// 可分 back / front 兩次繪製，把主場景 R／皇冠／杯插在兩者之間。
// drawProp 僅供 caller 畫自己的道具，本模組不建立第二套正式杯資產。
export function drawCatgirl(ctx,atlas,state,{pass='all',drawProp}={}){
  const s=state,[x,y]=s.root;
  if(pass!=='front'){
    footsteps(ctx,s.stars);
    sprite(ctx,atlas,'tail',x+80,y+70,110,113.33,s.tail,.12,.7);
    sprite(ctx,atlas,'leftLeg',x-40,y,72,245,s.walk,.5,0);
    sprite(ctx,atlas,'rightLeg',x+40,y,72,245,-s.walk,.5,0);
    ctx.drawImage(atlas.dress,250,30,950,1020,x-129,y-205,258,1020*258/950);
    ctx.save();ctx.translate(x,y-205);ctx.rotate(s.headTilt);
    sprite(ctx,atlas,'leftEar',-48,-106,60,62,-s.ears,.5,.5);
    sprite(ctx,atlas,'rightEar',48,-106,60,62,s.ears,.5,.5);
    sprite(ctx,atlas,s.blink?'blink':'head',0,-133,365*.493,375*.493,0,.5,0);
    eyes(ctx,atlas,s);ctx.restore();
    // 臂在頭髮／軀幹前，道具仍在臂前；掌心最後包住道具。
    for(const side of ['left','right'])arm(ctx,atlas,side,s.arms[side]);
  }
  if(pass==='all'&&drawProp)for(const [name,p]of Object.entries(s.props))drawProp(ctx,name,p,s);
  if(pass!=='back')for(const side of ['left','right']){
    const holding=!!s.contacts[side],pose=s.arms[side],rect=rects[holding?'grip':'palm'];
    // 掌根隨前臂旋轉，左右手各自鏡射。原圖的上方是指尖，不能永遠朝畫面上方。
    const wrist=holding?[1361,929]:[968,929],palm=holding?[1351,878]:[964,876],mirror=side==='right'?-1:1;
    const scale=12/Math.hypot(palm[0]-wrist[0],palm[1]-wrist[1]);
    const angle=pose.handAngle-Math.PI/2-Math.atan2(palm[1]-wrist[1],mirror*(palm[0]-wrist[0]));
    ctx.save();ctx.translate(...pose.wrist);ctx.rotate(angle);ctx.scale(mirror*scale,scale);
    ctx.drawImage(atlas,...rect,rect[0]-wrist[0],rect[1]-wrist[1],rect[2],rect[3]);ctx.restore();
  }
}
// 14 傳入同場景 vp 與 plane：1000×1000 貼圖映射至品牌平面。
// plane.origin 為左上世界點；right/down 是覆蓋整張貼圖的世界向量。
export async function createCatgirlRenderer(gl){
  const atlas=await loadCatgirlAtlas(),sheet=document.createElement('canvas');sheet.width=sheet.height=1000;
  const ctx=sheet.getContext('2d');if(!ctx)throw Error('Catgirl render canvas unavailable');
  const p=program(gl,`#version 300 es
  layout(location=0)in vec2 uv;uniform mat4 vp;uniform vec3 origin;uniform vec3 right;uniform vec3 down;out vec2 tex;
  void main(){tex=uv;gl_Position=vp*vec4(origin+uv.x*right+uv.y*down,1.);}`,
  `#version 300 es
  precision mediump float;in vec2 tex;uniform sampler2D atlas;out vec4 frag;
  void main(){frag=texture(atlas,tex);if(frag.a<.01)discard;}`);
  const vao=gl.createVertexArray(),buffer=gl.createBuffer(),texture=gl.createTexture();
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,8,0);gl.bindVertexArray(null);
  gl.bindTexture(gl.TEXTURE_2D,texture);for(const [k,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1000,1000,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  const uniforms=Object.fromEntries(['vp','origin','right','down','atlas'].map(k=>[k,gl.getUniformLocation(p,k)]));
  let disposed=false;
  return {evaluate:evaluateCatgirl,
    draw(vp,state,plane,pass='all'){
      if(disposed)throw Error('Catgirl renderer disposed');
      ctx.clearRect(0,0,1000,1000);drawCatgirl(ctx,atlas,state,{pass});
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,sheet);
      gl.useProgram(p);gl.uniformMatrix4fv(uniforms.vp,false,vp);for(const k of ['origin','right','down'])gl.uniform3fv(uniforms[k],plane[k]);gl.uniform1i(uniforms.atlas,0);
      gl.bindVertexArray(vao);gl.drawArrays(gl.TRIANGLES,0,6);gl.bindVertexArray(null);
    },
    dispose(){if(disposed)return;disposed=true;gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);gl.deleteProgram(p);}
  };
}
export function catgirlPointToWorld(point,plane){return plane.origin.map((v,i)=>v+point[0]/1000*plane.right[i]+point[1]/1000*plane.down[i]);}
