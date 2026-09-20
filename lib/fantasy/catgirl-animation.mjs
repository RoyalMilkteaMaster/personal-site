// 統一場景秒數輸入；不持有 RAF、計時器、鏡頭或章節門檻。座標為 1000×1000，Y 向下。
export const CATGIRL_TIMING = Object.freeze({ interaction: 30, idle: 30, cycle: 60 });
export const CATGIRL_HOME = Object.freeze({ r: [650, 420], crown: [650, 310], cup: [750, 580] });
const smooth = x => x*x*(3-2*x);
const mix = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);
const home = CATGIRL_HOME;
// 每個接觸起終點都有同一組掌心與道具位置；放手後才進下一個手勢。
const frames = [
  [0, 'peek', [340,560]], [2, 'peek', [385,550]],
  [4, 'reach-r', [560,610], 'r'], [6, 'lift-r', [560,570], 'r', [650,380], [650,270]],
  [8, 'return-r', [560,610], 'r'], [9, 'reach-crown', [470,500]],
  [10, 'take-crown', [490,460], 'crown'],
  [10.25, 'raise-crown', [462,481-Math.sqrt(644)], 'crown', null, [643,304]],
  [12, 'wear-crown', [490,500], 'crown', null, [490,172]],
  [12.5, 'release-crown', [490,520], null, null, [490,192], null, [715,355]],
  [13, 'reach-cup', [490,540], null, null, [490,212]],
  [15, 'take-cup', [615,680], 'cup', null, [615,352]],
  [17, 'drink', [420,600], 'cup', null, [420,272], [420,447]],
  [19, 'drink', [420,600], 'cup', null, [420,272], [420,447]],
  [20, 'wave', [420,600], 'cup', null, [420,272], [545,540]],
  [22, 'wave', [420,600], 'cup', null, [420,272], [545,540]],
  [24, 'return-cup', [615,680], 'cup', null, [615,352]],
  [24.5, 'reach-crown', [552.5,590], null, null, [552.5,262], null, [775.5,425-Math.sqrt(644)]],
  [25, 'remove-crown', [490,500], 'crown', null, [490,172]],
  [26.75, 'lower-crown', [462,481-Math.sqrt(644)], 'crown', null, [643,304]],
  [27, 'return-crown', [490,460], 'crown'], [28, 'return-home', [440,520]],
  [30, 'idle', [340,560]],
];
function key(f) {
  const [time,phase,root,grip,r=home.r,crown=home.crown,cup=home.cup,waypoint] = f;
  const props = {r:r||home.r,crown:crown||home.crown,cup:cup||home.cup};
  let left=[root[0]-130,root[1]-25],right=[root[0]+130,root[1]-25];
  if(grip==='r'){left=[props.r[0]-42,props.r[1]+45];right=[props.r[0]+42,props.r[1]+45];}
  if(grip==='crown')right=[props.crown[0]+42,props.crown[1]+12];
  if(grip==='cup')right=[props.cup[0]+32,props.cup[1]+12];
  if(phase==='wave')left=[root[0]-150,root[1]-255];
  if(waypoint)right=waypoint;
  return {time,phase,root,left,right,props};
}
const keys=frames.map(key);

function idleRoot(t){
  const p=(t-CATGIRL_TIMING.interaction)/CATGIRL_TIMING.idle,envelope=Math.sin(Math.PI*p)**2;
  return [340-85*envelope,560-45*envelope*Math.sin(p*Math.PI*2)];
}
// 固定上臂 65、前臂 85、掌心到腕 12；兩圓交點求肘，不拉伸插畫。
function solveArm(shoulder,hand,bend){
  const dx=hand[0]-shoulder[0],dy=hand[1]-shoulder[1],distance=Math.hypot(dx,dy);
  const reach=Math.max(32.001,Math.min(162,distance)),along=(65**2-97**2+reach**2)/(2*reach);
  const high=Math.sqrt(Math.max(0,65**2-along**2)),ux=dx/distance,uy=dy/distance;
  const elbow=[shoulder[0]+along*ux-bend*high*uy,shoulder[1]+along*uy+bend*high*ux];
  const direction=[(hand[0]-elbow[0])/Math.hypot(hand[0]-elbow[0],hand[1]-elbow[1]),(hand[1]-elbow[1])/Math.hypot(hand[0]-elbow[0],hand[1]-elbow[1])];
  const wrist=[hand[0]-12*direction[0],hand[1]-12*direction[1]];
  return {shoulder,elbow,wrist,handAngle:Math.atan2(direction[1],direction[0])+Math.PI/2,reachable:distance>=32&&distance<=162};
}

export function evaluateCatgirl(seconds) {
  if(!Number.isFinite(seconds))throw new TypeError('Catgirl time must be finite seconds');
  const t=Math.max(0,seconds)%CATGIRL_TIMING.cycle;
  let a=keys[0], b=keys[1];
  for(let i=0;i<keys.length-1;i++)if(t>=keys[i].time){a=keys[i];b=keys[i+1];}
  const u=smooth(Math.min(1,(t-a.time)/(b.time-a.time)));
  let root=mix(a.root,b.root,u),left=mix(a.left,b.left,u),right=mix(a.right,b.right,u);
  let gaze=0,wave=0;
  let headTilt=.07*Math.sin(t*Math.PI*2/5),walk=0,stars=[];
  if(t>=CATGIRL_TIMING.interaction){
    root=idleRoot(t);left=[root[0]-130,root[1]-25];right=[root[0]+130,root[1]-25];
    const w=Math.max(0,Math.min((t-41)/2,(49-t)/2,1));
    walk=Math.sin((t-43)*Math.PI)*.10*w;
    for(let step=43;step<=48;step++){
      const age=t-step;
      if(age>=0&&age<1.2){const foot=step%2?'left':'right',at=idleRoot(step);
        stars.push({id:step,foot,position:[at[0]+(foot==='left'?-40:40),at[1]+245],alpha:(1-age/1.2)**2});}
    }
  }
  if(t<=4)gaze=smooth(Math.min(1,t/.7))*smooth(Math.min(1,(4-t)/.7));
  if(t>=CATGIRL_TIMING.interaction){for(const [start,direction]of[[32,-1],[36,1],[51,-1],[55,1]]){
    if(t>=start&&t<start+3)gaze=direction*Math.sin((t-start)/3*Math.PI)**2;
  }}
  headTilt+=gaze*.08;
  if(t>=20&&t<=22){wave=Math.sin((t-20)*Math.PI*3)*Math.sin((t-20)/2*Math.PI);left[0]+=25*wave;}

  const positions=Object.fromEntries(Object.keys(home).map(name=>[name,mix(a.props[name],b.props[name],u)]));
  const props=Object.fromEntries(Object.keys(home).map(name=>[name,{position:t>=CATGIRL_TIMING.interaction?[...home[name]]:positions[name],home:[...home[name]],rotation:0}]));
  const contacts={left:null,right:null};
  if(t>=4&&t<=8){contacts.left={prop:'r',offset:[-42,45]};contacts.right={prop:'r',offset:[42,45]};}
  if((t>=10&&t<=12)||(t>=25&&t<=27))contacts.right={prop:'crown',offset:[42,12]};
  if(t>=15&&t<=24)contacts.right={prop:'cup',offset:[32,12]};
  const crownOnHead=t>=12&&t<=25;
  // 戴冠期間跟隨同一頭頂接點；該區段頭部不歪轉，避免冠底滑動。
  headTilt*=1-smooth(Math.max(0,Math.min(1,(t-10)/2,(27-t)/2)));
  if(crownOnHead){headTilt=0;props.crown.position=[root[0],root[1]-328];}
  for(const side of ['left','right'])if(contacts[side]){
    const c=contacts[side],p=props[c.prop].position;
    if(side==='left')left=[p[0]+c.offset[0],p[1]+c.offset[1]];
    else right=[p[0]+c.offset[0],p[1]+c.offset[1]];
  }
  // 僅戴冠／取冠時肘朝外。四個換向點的肩掌距正好 65+97，
  // 兩個 IK 解在伸直處重合，避免直接翻肘跳動；其餘姿勢沿用原解。
  const rightBend=(t>=10.25&&t<=12.5)||(t>=24.5&&t<=26.75)?1:-1;
  // 舉冠時肩小幅上提，袖緣離開眼區；放下時平滑回到原肩點。
  const shoulderLift=Math.max(0,Math.min((t-10.25)/1.75,(12.5-t)/.5),Math.min((t-24.5)/.5,(26.75-t)/1.75));
  const lift=smooth(shoulderLift);
  return {time:t,phase:t>=CATGIRL_TIMING.interaction?'idle':a.phase,root,hands:{left,right},contacts,props,
    landmarks:{mouth:[root[0],root[1]-218],crownSeat:[root[0],root[1]-316]},
    propsHome:t>=27,canLeave:true,crownOnHead,headTilt,gaze,wave,
    arms:{left:solveArm([root[0]-63,root[1]-165],left,1),right:solveArm([root[0]+63,root[1]-165-25*lift],right,rightBend)},
    blink: Math.abs(t%5.1-4.8)<.09 || (t>=19&&t<=22),
    tail:Math.sin(t*Math.PI*2/4)*.10,ears:Math.sin(t*Math.PI*2/3)*.025,walk,stars};
}
