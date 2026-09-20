import assert from 'node:assert/strict';
import {evaluateCatgirl, CATGIRL_TIMING} from './catgirl-animation.mjs';

assert.equal(CATGIRL_TIMING.idle, 30);
assert.equal(evaluateCatgirl(30).phase, 'idle');
assert.equal(evaluateCatgirl(59.999).phase, 'idle');
assert.equal(evaluateCatgirl(60).phase, 'peek');
for (const t of [30, 40, 59.999]) {
  const state = evaluateCatgirl(t);
  assert.equal(state.propsHome, true);
  for (const prop of Object.values(state.props)) assert.deepEqual(prop.position, prop.home);
}
console.log('catgirl: 30 second idle, props home, replay passed');

// 接觸時掌心必須與道具共用接點；所有邊界包含循環都不得瞬移。
for(let t=0;t<60;t+=.025){
  const s=evaluateCatgirl(t);
  assert.equal(s.canLeave,true);
  assert.ok(s.root[0]>=250&&s.root[0]<=620);
  assert.ok(s.root[1]>=400&&s.root[1]<=700);

}
for(const t of [2,4,6,8,9,10,10.25,12,12.5,13,15,17,19,20,22,24,24.5,25,26.75,27,28,30,41,49,60]){
  const a=evaluateCatgirl(t-.00001),b=evaluateCatgirl(t+.00001);
  for(const [p,q]of[[a.root,b.root],[a.hands.left,b.hands.left],[a.hands.right,b.hands.right],...Object.keys(a.props).map(k=>[a.props[k].position,b.props[k].position])]){
    assert.ok(Math.hypot(...p.map((v,i)=>v-q[i]))<.01,`continuous at ${t}: ${p} / ${q}`);
  }
}
assert.throws(()=>evaluateCatgirl(NaN),TypeError);
assert.deepEqual(evaluateCatgirl(-1),evaluateCatgirl(0));
assert.deepEqual(evaluateCatgirl(73),evaluateCatgirl(13));
assert.notDeepEqual(evaluateCatgirl(43).root,evaluateCatgirl(30).root);
assert.ok(evaluateCatgirl(44).stars.length>0);
console.log('catgirl: contacts, attached crown, all boundaries, idle travel, deterministic replay passed');
for(const t of [17,18,19]){
 const s=evaluateCatgirl(t);
 assert.deepEqual([s.props.cup.position[0],s.props.cup.position[1]-65],[s.root[0],s.root[1]-218],'straw meets mouth');
}
console.log('catgirl: drinking straw meets mouth passed');
for(const k of ['headTilt','tail','ears','walk'])assert.ok(Math.abs(evaluateCatgirl(59.99999)[k]-evaluateCatgirl(0)[k])<.0001,`loop ${k}`);
for(const t of [4,5,6,7,8]){
 const s=evaluateCatgirl(t);assert.equal(s.props.crown.position[1]-s.props.r.position[1],-110,'crown rests on lifted R');
}

// 人工校準的道具／掌心座標 fixture；不讀 contacts.offset 反推期望。
for(const [t,prop,position,side,hand]of[
 [6,'r',[650,380],'left',[608,425]],
 [6,'r',[650,380],'right',[692,425]],
 [12,'crown',[490,172],'right',[532,184]],
 [15,'cup',[750,580],'right',[782,592]],
 [17,'cup',[420,447],'right',[452,459]],
 [25,'crown',[490,172],'right',[532,184]],
]){const s=evaluateCatgirl(t);assert.deepEqual(s.props[prop].position,position);assert.deepEqual(s.hands[side],hand);}
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
for(let t=0;t<60;t+=.01){
 const s=evaluateCatgirl(t);
 for(const side of ['left','right']){
  const a=s.arms[side];assert.ok(a.reachable,`reach ${t} ${side}`);
  assert.ok(Math.abs(length(a.shoulder,a.elbow)-65)<1e-8,`upper length ${t}`);
  assert.ok(Math.abs(length(a.elbow,a.wrist)-85)<1e-8,`forearm length ${t}`);
  assert.ok(Math.abs(length(a.wrist,s.hands[side])-12)<1e-8,`palm join ${t}`);
  assert.ok(Math.abs(Math.sin(a.handAngle)-(s.hands[side][0]-a.wrist[0])/12)<1e-8,`palm direction ${t}`);
 }
}
assert.ok(evaluateCatgirl(2).gaze>.9,'peek looks right toward R');
assert.ok(evaluateCatgirl(33.5).gaze<-.9,'idle looks left');
assert.ok(evaluateCatgirl(37.5).gaze>.9,'idle looks right');
assert.ok(evaluateCatgirl(52.5).gaze<-.9,'second idle look');
assert.ok(evaluateCatgirl(56.5).gaze>.9,'returning look');
const first=evaluateCatgirl(43.1).stars.find(s=>s.id===43),later=evaluateCatgirl(43.4).stars.find(s=>s.id===43);
assert.equal(first.foot,'left');assert.deepEqual(first.position,later.position,'footprint stays where foot landed');assert.ok(later.alpha<first.alpha);
assert.equal(evaluateCatgirl(44.1).stars.find(s=>s.id===44).foot,'right');
assert.notEqual(evaluateCatgirl(43.5).walk,0,'half-step evidence has moving leg');
assert.ok(Math.abs(evaluateCatgirl(20.5).wave)>.6,'readable wave');
console.log('catgirl revision: fixed 65/85 arms, oriented palms, independent grip fixtures, gaze and planted starlight passed');

// 戴／取冠換肘解必須經過伸直點，連肘、腕與掌向都不能跳動。
for(const t of [10.25,12.5,24.5,26.75]){
 const a=evaluateCatgirl(t-1e-6).arms.right,b=evaluateCatgirl(t+1e-6).arms.right;
 for(const point of ['shoulder','elbow','wrist'])assert.ok(length(a[point],b[point])<.01,`crown arm continuity ${t} ${point}`);
 assert.ok(Math.abs(Math.sin(a.handAngle-b.handAngle))<.001,`crown palm continuity ${t}`);
 const s=evaluateCatgirl(t);assert.ok(Math.abs(length(s.arms.right.shoulder,s.hands.right)-162)<1e-8,`straight crossover ${t}`);
}
for(const t of [12,25]){
 const s=evaluateCatgirl(t);assert.ok(s.arms.right.elbow[0]>s.root[0]+80,'raised elbow stays outside face');
}
console.log('catgirl rev3: crown elbow/wrist/palm continuity at all four straight crossovers passed');
