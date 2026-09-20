// This standalone .cjs harness intentionally uses Node CommonJS, including the configurable Playwright module.
/* oxlint-disable typescript/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {build} = require('esbuild');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || '/home/leslie/coordinator-e2e/node_modules/playwright');
/* oxlint-enable typescript/no-require-imports */
const out = process.env.RING_EVIDENCE || fs.mkdtempSync(path.join(os.tmpdir(), 'starlit-card-ring-'));
(async () => {
  fs.mkdirSync(out,{recursive:true});
  await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Shell from './components/starlit-shell';function App(){const [active,setActive]=React.useState('1');const [intro,setIntro]=React.useState(true);const [language,setLanguage]=React.useState('zh');return <><button onClick={()=>setLanguage(v=>v==='zh'?'en':'zh')}>Test language</button><button onClick={()=>setIntro(true)}>Return to works</button><Shell introComplete={intro} language={language} active={active} onActiveChange={setActive} onReplay={()=>setIntro(false)}/></>};const root=createRoot(document.getElementById('root'));window.unmountShell=()=>root.unmount();root.render(<App/>);`,resolveDir:process.cwd(),loader:'tsx'},outfile:path.join(out,'ring-test.js'),bundle:true,jsx:'automatic',tsconfig:'tsconfig.json'});
  const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1100}});
    await page.setContent('<style>body{margin:24px}.starlit-ember-grid{margin-inline:16px}.starlit-nebula{display:none}</style><div id="root"></div>');
    await page.addStyleTag({path:path.join(out,'ring-test.css')});
    // 以既有 2D fallback 隔離 headless SwiftShader context 銷毀造成的動畫時鐘跳躍；主預覽另驗正常 WebGL。
    await page.evaluate(()=>{
      // Capture the original method; the wrapper forwards its canvas receiver explicitly via get.call(this, ...).
      // oxlint-disable-next-line typescript/unbound-method
      const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};
    });
    await page.addScriptTag({path:path.join(out,'ring-test.js')});
    const card=page.locator('.starlit-ember').first();
    // Chapter departure owns both opening/closing timeouts. Observe the native
    // timer boundary without replacing the clock or the component under test.
    await page.evaluate(()=>{
      const schedule=window.setTimeout.bind(window),cancel=window.clearTimeout.bind(window);
      window.cardTimers=new Set();window.cardTimerFired=0;
      window.setTimeout=(callback,delay,...args)=>{
        if(delay!==3800&&delay!==1400)return schedule(callback,delay,...args);
        const id=schedule(()=>{window.cardTimers.delete(id);window.cardTimerFired++;callback(...args);},delay);
        window.cardTimers.add(id);return id;
      };
      window.clearTimeout=id=>{window.cardTimers.delete(id);cancel(id);};
    });
    const assertIcons=async()=>{
      assert.equal(await page.locator('.starlit-ember').count(),5);
      assert.deepEqual(await page.locator('.starlit-ember').evaluateAll(cards=>cards.map(el=>({
        expanded:el.querySelector('button').getAttribute('aria-expanded'),lit:el.dataset.lit,
        closing:el.dataset.closing,burning:el.dataset.burning,ring:el.dataset.ring,
        opacity:+getComputedStyle(el,'::before').opacity,
        clip:getComputedStyle(el.querySelector('button')).clipPath,
        icon:getComputedStyle(el.querySelector('.starlit-ember-icon')).visibility,
        layers:el.querySelectorAll('canvas,clipPath').length,
      }))),Array.from({length:5},()=>({expanded:'false',lit:'false',closing:'false',burning:'false',ring:'false',opacity:0,clip:'none',icon:'visible',layers:0})),'返回作品五張皆為 icon，沒有殘留框或膜裁切');
    };
    await assertIcons();
    await page.locator('.starlit-ember button').nth(0).click();
    await page.locator('.starlit-ember button').nth(1).click();
    await page.getByRole('tab').nth(1).click();
    await page.getByRole('button',{name:'Test language',exact:true}).evaluate(el=>el.click());
    assert.equal(await page.locator('.starlit-ember[data-lit="true"]').count(),2,'同章多卡、已選 tab 與語言切換不清空');
    assert.ok(await page.evaluate(()=>window.cardTimers.size)>0);
    await page.getByRole('tab').nth(2).click();
    await page.getByRole('tab').nth(1).click();
    await assertIcons();
    assert.equal(await page.evaluate(()=>window.cardTimers.size),0,'切走取消燒穿待辦');
    // Closing has two pending callbacks. Return and reopen before their old
    // deadline; neither may terminate the new burn or restore an old face.
    await card.locator('button').click();
    await card.locator('button').evaluate(el=>el.click());
    assert.equal(await card.getAttribute('data-closing'),'true');
    assert.equal(await page.evaluate(()=>window.cardTimers.size),2);
    await page.getByRole('tab').first().click();await page.getByRole('tab').nth(1).click();
    await assertIcons();
    assert.equal(await page.evaluate(()=>window.cardTimers.size),0,'切走取消收回的兩個待辦');
    const fired=await page.evaluate(()=>window.cardTimerFired);
    await card.locator('button').click();await page.waitForTimeout(1600);
    assert.equal(await card.getAttribute('data-burning'),'true','舊收回 callback 不提前終止新燒穿');
    assert.equal(await page.evaluate(()=>window.cardTimerFired),fired);
    await page.waitForFunction(()=>document.querySelector('.starlit-ember').dataset.burning==='false');
    await page.getByRole('tab').nth(2).click();await page.getByRole('tab').nth(1).click();
    await assertIcons();await page.waitForTimeout(4000);await assertIcons();
    await page.getByRole('button',{name:'Test language',exact:true}).evaluate(el=>el.click());
    // Restore the raster fixture's viewport after tab focus scrolled its wide header.
    await page.evaluate(()=>window.scrollTo(0,0));
    console.log('PASS chapter reset: settled/opening/closing, timers cancelled, fresh reopen, same-tab/multi-card/language preserved');
    const angle=()=>card.evaluate(el=>parseFloat(getComputedStyle(el,'::before').getPropertyValue('--ember-angle')));
    const watchGrowth=()=>card.evaluate(el=>{
      window.ringGrowth=new Promise(resolve=>{
        let opened=0,done=false;const samples=[];
        const frame=()=>{
          const style=getComputedStyle(el,'::before');
          samples.push({ms:performance.now()-opened,width:1-parseFloat(style.top),opacity:+style.opacity,burning:el.dataset.burning,coverage:+style.getPropertyValue('--ember-ring-coverage')});
          if(!done)requestAnimationFrame(frame);
        };
        const observer=new MutationObserver(()=>{
          if(!opened&&el.dataset.lit==='true'){opened=performance.now();frame();}
          if(opened&&el.dataset.burning==='false'){observer.disconnect();setTimeout(()=>{done=true;resolve(samples);},100);}
        });observer.observe(el,{attributes:true,attributeFilter:['data-lit','data-burning']});
      });
    });
    await watchGrowth();await card.locator('button').click();
    const growth=await page.evaluate(()=>window.ringGrowth);
    fs.writeFileSync(path.join(out,'growth.json'),JSON.stringify(growth,null,2));
    const visible=growth.filter(s=>s.opacity===1&&s.burning==='true');
    assert.equal(growth[0].opacity,0,'尚未接觸周界時沒有框');
    assert.ok(visible.length>2,'正常燒穿中有接觸驅動的連續樣本');
    assert.ok(visible[0].width>=.49&&visible[0].width<1.1,'首次接觸由細線開始');
    assert.ok(visible.some(s=>s.coverage>.2&&s.coverage<.8),'量到部分周界接觸');
    for(let i=0;i<visible.length;i++){
      assert.ok(Math.abs(visible[i].width-(.5+3*visible[i].coverage))<.001,'厚度由接觸周長比例決定');
      if(i)assert.ok(visible[i].width>=visible[i-1].width-.001,'接觸範圍增大時不反向縮細');
    }
    assert.ok(visible.some(s=>s.width===3.5),'燒穿內已覆蓋整個周界');
    assert.equal(growth.at(-1).width,3.5,'膜卸載後保持完整框，不重播細框');
    assert.equal(await card.locator('.starlit-card-flames,.starlit-ember-rim').count(),0,'不保留任何已撤回的凸起火舌');
    assert.equal(await card.locator('canvas').count(),0,'落定後釋放膜燒穿 canvas');
    const raster=async (time,name)=>{
      await card.evaluate((el,time)=>{const a=el.getAnimations({subtree:true}).find(a=>a.animationName==='starlit-ember-orbit');a.pause();a.currentTime=time;},time);
      await page.waitForTimeout(60);
      const box=await card.boundingBox();
      const shot=await page.screenshot({path:path.join(out,name)});
      return page.evaluate(async({data,box})=>{
        const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
        const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
        return [[box.x+box.width/2,box.y-1],[box.x+box.width+1,box.y+box.height/2],[box.x+box.width/2,box.y+box.height+1],[box.x-1,box.y+box.height/2]].map(([x,y])=>Array.from(ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data).slice(0,3));
      },{data:shot.toString('base64'),box});
    };
    const zero=await raster(0,'ring-zero.png'),quarter=await raster(1750,'ring-quarter.png');
    const luminance=rgb=>rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    const a=zero.map(luminance),b=quarter.map(luminance);
    fs.writeFileSync(path.join(out,'ring-pixels.json'),JSON.stringify({zero,quarter,luminanceZero:a,luminanceQuarter:b},null,2));
    assert.ok(Math.abs(a[0]-a[2])<8 && Math.abs(a[1]-a[3])<8,'對邊明暗相同');
    assert.ok(a[1]-a[0]>50 && a[3]-a[2]>50,'真實像素呈暗亮暗亮，亮度差清楚');
    assert.ok(b[0]-b[1]>50 && b[2]-b[3]>50,'四分之一圈後明暗兩組交換位置');
    // 取樣用的 WAAPI 手動播放狀態不能帶入 CSS 暫停驗證，先經正常切章重新掛載。
    await page.getByRole('tab').first().click();await page.getByRole('tab').nth(1).click();
    await assertIcons();await card.locator('button').click();
    await page.waitForFunction(()=>document.querySelector('.starlit-ember').dataset.burning==='false');
    const start=await angle();await page.waitForTimeout(350);const end=await angle();const delta=((end-start)%360+540)%360-180;assert.ok(delta>10,'順時針且持續流動');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    const frozen=await angle();await page.waitForTimeout(200);assert.ok(Math.abs(await angle()-frozen)<1,'隱藏時暫停框動畫');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForTimeout(200);assert.ok(Math.abs(await angle()-frozen)>5,'恢復後繼續流動');
    await page.getByRole('tab').first().click();await page.locator('.starlit-ember').first().waitFor({state:'detached'});assert.equal(await page.locator('.starlit-ember').count(),0);
    await page.getByRole('tab').nth(1).click();
    await assertIcons();await card.locator('button').click();
    await page.waitForFunction(()=>document.querySelector('.starlit-ember').dataset.burning==='false');
    assert.equal(await card.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.animationName==='starlit-ember-orbit').length),1,'切回僅一個框動畫');
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.starlit-ember'),'::before').top==='-2.5px');
    await page.setViewportSize({width:390,height:844});await card.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'mobile-ring.png')});
    const metrics=await card.evaluate(el=>({inset:getComputedStyle(el,'::before').top,margin:getComputedStyle(el.querySelector('.starlit-ember-open')).marginTop,title:getComputedStyle(el.querySelector('.starlit-ember-head-name')).fontSize,summary:getComputedStyle(el.querySelector('p')).fontSize}));
    assert.deepEqual(metrics,{inset:'-2.5px',margin:'1px',title:'16px',summary:'14px'});
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await card.evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await card.locator('.starlit-ember-open').click({position:{x:25,y:95}});await page.waitForTimeout(1500);
    assert.equal(await card.evaluate(el=>+getComputedStyle(el,'::before').opacity),0,'收合後沒有亮框殘留');
    // 提前收回後立刻重開：上一輪接觸比例不能殘留至新一輪。
    await card.locator('button').click();await page.waitForTimeout(600);
    await card.locator('button').evaluate(el=>el.click());await page.waitForTimeout(500);
    await watchGrowth();await card.locator('button').evaluate(el=>el.click());
    const reopened=await page.evaluate(()=>window.ringGrowth);
    assert.equal(reopened[0].opacity,0,'重開清除上一輪的接觸');
    assert.equal(reopened[0].coverage,0,'重開從尚未接觸開始');
    await card.locator('.starlit-ember-open').click({position:{x:25,y:95}});await page.waitForTimeout(1500);
    // 再次開卡必須重新增粗；隱藏時同時暫停增粗與流動，收回立即取消。
    await card.locator('button').click();
    await page.waitForFunction(()=>+getComputedStyle(document.querySelector('.starlit-ember'),'::before').opacity===1);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    const thickness=()=>card.evaluate(el=>1-parseFloat(getComputedStyle(el,'::before').top));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const held=await thickness();assert.ok(held<3.5,'重開會重新從細框開始');
    await page.waitForTimeout(180);assert.ok(Math.abs(await thickness()-held)<.02,'隱藏時增粗也暫停');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await card.locator('.starlit-ember-open').click({position:{x:25,y:95}});
    assert.equal(await card.evaluate(el=>+getComputedStyle(el,'::before').opacity),0,'增粗中收回立即隱藏');
    assert.equal(await card.getAttribute('data-ring'),'false','收回清除接觸標記');
    assert.equal(await card.evaluate(el=>+getComputedStyle(el).getPropertyValue('--ember-ring-coverage')),0,'收回清除上一輪接觸比例');
    await page.emulateMedia({reducedMotion:'reduce'});
    await card.locator('button').click();
    assert.equal(await thickness(),3.5,'減少動態重開直接顯示完整框');
    assert.equal(await card.evaluate(el=>+getComputedStyle(el,'::before').opacity),1);
    // 真實重播不卸載 Shell，仍須取消尚未到期的燒穿待辦。
    await page.locator('.starlit-brand').click();assert.equal(await page.locator('.starlit-ember').count(),0,'重播移除卡片');
    await page.waitForTimeout(3200);await page.getByRole('button',{name:'Return to works',exact:true}).click();
    assert.equal(await page.locator('.starlit-ember[data-lit="true"],.starlit-ember[data-ring="true"]').count(),0,'重播後返回不殘留開啟或延遲亮框');
    await page.emulateMedia({reducedMotion:'no-preference'});await card.locator('button').click();
    await page.evaluate(()=>window.unmountShell());await page.waitForTimeout(3200);
    assert.equal(await page.locator('.starlit-ember').count(),0,'有待辦時卸載也無殘留');
    console.log('PASS raster dark/light/dark/light, opposing pairs, quarter-turn exchange, clockwise flow, shared-contour perimeter-contact growth, visibility, chapter return, reduced motion, mobile metrics, close/unmount');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
