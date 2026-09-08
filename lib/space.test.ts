import assert from 'node:assert/strict';
import {projectStar} from './space.ts';
// Near stars move more than distant stars, without moving the text layer.
const near=projectStar(0,0,.5,1,1,1200,800),far=projectStar(0,0,2,1,1,1200,800);
assert.ok(Math.abs(near.x-600)>Math.abs(far.x-600));
assert.ok(Math.abs(near.y-400)>Math.abs(far.y-400));
assert.deepEqual(projectStar(0,0,1,0,0,1200,800),{x:600,y:400,radius:1.2});
for(const depth of [0,-1,.2,.5,1,3])for(const width of [360,1200]){
 const p=projectStar(.5,-.5,depth,-1,1,width,800);
 assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.radius>0&&p.radius<=2.6);
}
console.log('Star depth, pointer parallax, and projection bounds passed.');
