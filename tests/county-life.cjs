const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173');await page.locator('#intro-start').click();
 await page.evaluate(()=>{__lifeGame.warp('county');__lifeGame.state.settings.timeOfDay='day';});
 const initial=await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.streetLife).map(e=>[e.npcId,e.x,e.baseline]));assert.equal(initial.length,14);
 assert.equal(await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.kind==='npc').length),18);
 await page.waitForTimeout(6000);
 const moved=await page.evaluate(initial=>__lifeGame.state.scene.entities.filter(e=>e.streetLife).filter(e=>{const before=initial.find(r=>r[0]===e.npcId);return Math.hypot(e.x-before[1],e.baseline-before[2])>3}).length,initial);assert.ok(moved>=8,'pedestrians should actually move');
 const blocked=[];
 for(let i=0;i<20;i++){
  blocked.push(...await page.evaluate(()=>{const s=__lifeGame.state.scene;return s.entities.filter(e=>e.streetLife).filter(e=>s.colliders.some(c=>e.x-5<c.x+c.w&&e.x+5>c.x&&e.baseline-6<c.y+c.h&&e.baseline>c.y)).map(e=>e.npcId)}));
  await page.waitForTimeout(150);
 }assert.deepEqual(blocked,[],'new pedestrians may not walk through buildings');
 await page.evaluate(()=>{const g=__lifeGame.state,e=g.scene.entities.find(e=>e.streetLife);g.player.x=e.x;g.player.y=e.baseline+10;});
 await page.waitForFunction(()=>__lifeGame.state.scene.entities.some(e=>e.streetLife&&e.behavior.gesture==='greet'));
 await page.evaluate(()=>{__lifeGame.state.settings.reducedMotion=true;});
 await page.locator('#game-canvas').focus();await page.waitForTimeout(80);await page.keyboard.press('e');await page.waitForSelector('#dialogue:not([hidden])');await page.keyboard.press('Escape');
 const before=await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.streetLife).map(e=>[e.x,e.baseline]));await page.waitForTimeout(300);
 assert.deepEqual(await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.streetLife).map(e=>[e.x,e.baseline])),before,'reduced motion must freeze ambient walking');
 await page.evaluate(()=>{__lifeGame.state.settings.reducedMotion=false;document.body.classList.add('experienced-player');});
 if(process.env.GAME_SCREENSHOTS)await page.screenshot({path:process.env.GAME_SCREENSHOTS+'/county-people.png'});
 assert.deepEqual(errors,[]);console.log('PASS: 14 new pedestrians / 18 county NPCs, movement, collision-free routes, greeting, interaction and reduced motion.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
