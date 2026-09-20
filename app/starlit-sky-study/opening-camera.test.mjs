import fs from 'node:fs';
import assert from 'node:assert/strict';
import { openingStudyCamera } from './opening-camera.mjs';
const original = { target: [0,.77,.02], dist: .13, az: 0, el: 0, roll: 0, fov: 28 };
assert.deepEqual(openingStudyCamera(original,0,17),original);
assert.deepEqual(original.target,[0,.77,.02]);
const a=openingStudyCamera(original,1,0), b=openingStudyCamera(original,1,2);
assert.equal(a.dist,.17);
assert.equal(a.target[1],.786);
assert.notEqual(a.target[0],b.target[0]);
for(let t=0;t<100;t+=.1){const c=openingStudyCamera(original,1,t);assert(Math.abs(c.dist-.17)<=.000151);assert(Math.abs(c.target[0])<=.000101);assert(Math.abs(c.target[1]-.786)<=.000141);assert.equal(c.roll,0);}
console.log('Opening camera: .17 distance, .786 target Y; tiny continuous drift; other reading shots unchanged.');
const shader=fs.readFileSync(new URL('./renderer-study.mjs',import.meta.url),'utf8');
assert(shader.includes('col=mix(col,blue,opening*mix(1.,.22,studyOpening));'));
assert(shader.includes("studyOpening: canvas.dataset.openingStudy === 'false' ? 0 : 1"));
console.log('Shader binding verified: baseline blue 100%, study blue 22% / original colour 78%.');
