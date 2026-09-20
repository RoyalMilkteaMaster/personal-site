/** 共用膜揭露輪廓與圓角周界的交集。沿用 filmClipPath 的 0.1px 座標量化，
 * 不取 shader 噪聲／粒子的亮像素；點接觸也算開始，厚度則按已揭露弧長比例。 */
export function perimeterContact(contours: readonly (readonly number[])[], width: number, height: number, radius: number): { touched: boolean; fraction: number } {
  const loops = contours.filter(c => c.length >= 6).map(c => c.map(n => Math.round(n * 10) / 10));
  if (!loops.length) return { touched: false, fraction: 0 };
  const inside = (x: number, y: number) => {
    let odd = false;
    for (const c of loops) for (let i = 0, j = c.length - 2; i < c.length; j = i, i += 2) {
      const ax = c[j], ay = c[j + 1], bx = c[i], by = c[i + 1];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) odd = !odd;
    }
    return odd;
  };
  const r = Math.min(radius, width / 2, height / 2);
  let covered = 0, touched = false;
  // 每段周界先求與輪廓的解析交點，再用 evenodd 判斷交點間的弧是否已揭露。
  const span = (length: number, point: (t: number) => [number, number], intersect: (ax: number, ay: number, bx: number, by: number) => number[]) => {
    if (length <= 0) return;
    const cuts = [0, 1];
    for (const c of loops) for (let i = 0, j = c.length - 2; i < c.length; j = i, i += 2) {
      for (const t of intersect(c[j], c[j + 1], c[i], c[i + 1])) {
        if (t >= -1e-9 && t <= 1 + 1e-9) { cuts.push(Math.max(0, Math.min(1, t))); touched = true; }
      }
    }
    cuts.sort((a,b) => a-b);
    for (let i = 1; i < cuts.length; i++) {
      const [x,y] = point((cuts[i-1]+cuts[i])/2);
      if (inside(x,y)) { covered += (cuts[i]-cuts[i-1])*length; touched = true; }
    }
  };
  const line = (x: number, y: number, dx: number, dy: number) => span(Math.hypot(dx,dy), t => [x+dx*t,y+dy*t], (ax,ay,bx,by) => {
    const ex=bx-ax,ey=by-ay,den=dx*ey-dy*ex;
    if (Math.abs(den)<1e-9) return [];
    const u=((ax-x)*dy-(ay-y)*dx)/den;
    return u>=0&&u<=1 ? [((ax-x)*ey-(ay-y)*ex)/den] : [];
  });
  line(r,0,width-2*r,0);line(width,r,0,height-2*r);line(width-r,height,2*r-width,0);line(0,height-r,0,2*r-height);
  const arc = (cx: number, cy: number, start: number) => span(Math.PI*r/2, t => [cx+r*Math.cos(start+t*Math.PI/2),cy+r*Math.sin(start+t*Math.PI/2)], (ax,ay,bx,by) => {
    const dx=bx-ax,dy=by-ay,x=ax-cx,y=ay-cy,a=dx*dx+dy*dy,b=2*(x*dx+y*dy),c=x*x+y*y-r*r,disc=b*b-4*a*c;
    if (a===0||disc<0) return [];
    return [(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)].filter(u=>u>=0&&u<=1).map(u=>{
      const angle=(Math.atan2(y+u*dy,x+u*dx)-start+Math.PI*4)%(Math.PI*2);
      return angle/(Math.PI/2);
    });
  });
  if(r>0){arc(width-r,r,-Math.PI/2);arc(width-r,height-r,0);arc(r,height-r,Math.PI/2);arc(r,r,Math.PI);}
  return { touched, fraction: Math.max(0,Math.min(1,covered/(2*(width+height-4*r)+2*Math.PI*r))) };
}
