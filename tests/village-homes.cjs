const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173');await page.locator('#intro-start').click();
 const homes=await page.evaluate(()=>Object.values(LIFE_DATA.scenes).filter(s=>s.household).map(s=>s.id));
 assert.equal(homes.length,15);
 assert.equal(await page.evaluate(()=>new Set(Object.values(LIFE_DATA.scenes).filter(s=>s.household).map(s=>s.map.join(''))).size),15);
 for(const id of homes){
  await page.evaluate(id=>{
   __lifeGame.warp('village');const g=__lifeGame.state,z=g.scene.interactZones.find(z=>z.toScene===id);
   g.player.x=z.cx;g.player.y=z.cy+20;g.keys={};
  },id);
  await page.locator('#game-canvas').focus();await page.keyboard.down('ArrowUp');await page.waitForTimeout(400);await page.keyboard.up('ArrowUp');
  await page.waitForFunction(id=>__lifeGame.state.scene.id===id,id);
  assert.equal(await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.homeProjection&&!e.hidden).length),0);
  const clear=await page.evaluate(()=>{const g=__lifeGame.state;return !g.scene.colliders.some(c=>g.player.x-5<c.x+c.w&&g.player.x+5>c.x&&g.player.y-6<c.y+c.h&&g.player.y>c.y)});
  assert.ok(clear,'Interior entrance must be clear: '+id);
  await page.waitForTimeout(250);
  if(process.env.GAME_SCREENSHOTS && [homes[0],homes[3],homes[4]].includes(id))await page.screenshot({path:process.env.GAME_SCREENSHOTS+'/'+id+'.png'});
  await page.waitForTimeout(200);
  await page.evaluate(()=>{const g=__lifeGame.state,z=g.scene.interactZones.find(z=>z.toScene==='village');g.player.x=z.cx;g.player.y=z.cy-12;});
  await page.waitForTimeout(40);await page.keyboard.press('e');
  await page.waitForFunction(()=>__lifeGame.state.scene.id==='village');await page.waitForTimeout(200);
 }
 // Accelerate walking, not the home transition: every resident still follows their actual route to their door.
 await page.evaluate(()=>{const g=__lifeGame.state;g.settings.timeOfDay='night';for(const e of g.villageWorld.entities)if(e.route)e.speed=700;});
 await page.waitForFunction(()=>__lifeGame.state.villageWorld.entities.filter(e=>e.route).every(e=>e.inside),{},{timeout:15000});
 assert.equal(await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.route&&!e.hidden).length),0);
 await page.evaluate(()=>__lifeGame.warp('village-home-0'));
 assert.equal(await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.homeProjection&&!e.hidden).length),2);
 if(process.env.GAME_SCREENSHOTS)await page.screenshot({path:process.env.GAME_SCREENSHOTS+'/home-at-night.png'});
 // Dawn progresses while the player is indoors; no ghost residents remain in the room.
 await page.evaluate(()=>{__lifeGame.state.settings.timeOfDay='day';});await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.homeProjection&&!e.hidden).length),0);
 await page.evaluate(()=>__lifeGame.warp('village'));
 assert.equal(await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.route&&!e.hidden).length),21);
 // Start a fresh saved game inside a house at night.
 await page.evaluate(()=>{__lifeGame.state.settings.timeOfDay='night';});await page.waitForTimeout(3000);
 await page.evaluate(()=>__lifeGame.warp('village-home-0'));await page.waitForTimeout(200);await page.reload();
 await page.waitForSelector('body.game-ready');
 assert.equal(await page.evaluate(()=>__lifeGame.state.scene.id),'village-home-0');
 assert.equal(await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.homeProjection&&!e.hidden).length),2);
 assert.deepEqual(errors,[]);console.log('PASS: 15 distinct homes, all entrances/exits, return indoors, dawn departure, indoor save reload.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
