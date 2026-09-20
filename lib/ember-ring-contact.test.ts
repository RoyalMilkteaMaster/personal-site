import assert from 'node:assert/strict';
import { perimeterContact } from './ember-ring-contact.ts';
import { burnTimeField, burnContours, simplifyContour, makeFrontPace, paceAt, BURN_OVERSHOOT } from './ember-fire.ts';
const rect=(x:number,y:number,w:number,h:number)=>[x,y,x+w,y,x+w,y+h,x,y+h,x,y];
for(const [w,h] of [[260,260],[354,300],[480,180],[180,480]]){
  assert.deepEqual(perimeterContact([rect(w/2-10,h/2-10,20,20)],w,h,18),{touched:false,fraction:0});
  const touch=perimeterContact([rect(w/2-10,0,20,20)],w,h,18);
  assert.equal(touch.touched,true);assert.ok(touch.fraction>0&&touch.fraction<.1);
  const tangent=perimeterContact([[w/2,0,w/2+10,20,w/2-10,20,w/2,0]],w,h,18);
  assert.equal(tangent.touched,true);assert.equal(tangent.fraction,0,'首次點接觸為細線起點');
  assert.ok(Math.abs(perimeterContact([rect(-10,-10,w/2+10,h+20)],w,h,18).fraction-.5)<1e-8,'半張揭露覆蓋半個周界');
  assert.equal(perimeterContact([rect(-10,-10,w+20,h+20)],w,h,18).fraction,1);
  assert.deepEqual(perimeterContact([rect(-10,-10,w+20,h+20),rect(-20,-20,w+40,h+40)],w,h,18),{touched:false,fraction:0},'與 clip evenodd 一致');
  const corner=perimeterContact([rect(w-18,-20,38,38)],w,h,18);
  assert.ok(Math.abs(corner.fraction-(Math.PI*18/2)/(2*(w+h-72)+36*Math.PI))<1e-8,'圓角按弧長計算，非方框邊長');
  const field=burnTimeField(w,h,2,71),pace=makeFrontPace(71);let first=-1,partial=0,last=0;
  for(let ms=0;ms<=3000;ms+=25){
    const contours=burnContours(field,field.max*BURN_OVERSHOOT*paceAt(pace,ms/3000),2).map(c=>simplifyContour(c));
    const contact=perimeterContact(contours,w,h,18);
    if(contact.touched&&first<0)first=ms;
    if(contact.fraction>0&&contact.fraction<1)partial++;
    last=contact.fraction;
  }
  assert.ok(first>0&&first<3000);assert.ok(partial>0);assert.equal(last,1);
  console.log(JSON.stringify({width:w,height:h,firstContactMs:first,partialFrames:partial,full:last}));
}
console.log('PASS contact before/first/partial/full, rounded perimeter, evenodd and four aspect ratios');
