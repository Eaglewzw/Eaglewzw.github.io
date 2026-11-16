const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173');await page.locator('#intro-start').click();
  // Actual afternoon paths, including grandma visiting a different household.
  await page.evaluate(()=>{const g=__lifeGame.state;g.settings.timeOfDay='auto';g.settings.dayCycle=true;g.time=98.4;g.settings.reducedMotion=false;for(const e of g.villageWorld.entities)if(e.route)e.speed=1000;});
  await page.waitForFunction(()=>{const g=__lifeGame.state;return g.villageWorld.entities.filter(e=>e.route).every(e=>{const p=ResidentLife.routine(e.npcId,g);return p.sceneId==='village'?!e.inside:e.inside&&e.insideScene===p.sceneId})},{},{timeout:20000});
  await page.evaluate(()=>{const g=__lifeGame.state;g.story.step=2;__lifeGame.warp('village-home-14');});
  assert.deepEqual(await page.evaluate(()=>{const g=__lifeGame.state;return [GameStory.target(g).sceneId,g.scene.entities.filter(e=>e.npcId==='village-resident-4'&&!e.hidden).length]}),['village-home-14',1]);
  const overlap=await page.evaluate(()=>{const es=__lifeGame.state.scene.entities.filter(e=>e.homeProjection&&!e.hidden);return es.length!==new Set(es.map(e=>e.x+','+e.baseline)).size;});assert.equal(overlap,false);
  if(process.env.GAME_SCREENSHOTS)await page.screenshot({path:process.env.GAME_SCREENSHOTS+'/village-visit.png'});
  // Cancelled recognition does not award the photo; finishing it does.
  await page.evaluate(()=>{const g=__lifeGame.state;g.settings.timeOfDay='day';g.settings.reducedMotion=true;g.story.step=0;g.discovered.add('mem-chest');});
  await page.waitForTimeout(80);
  async function talk(id){
   await page.evaluate(id=>{const g=__lifeGame.state,r=g.villageWorld.entities.find(e=>e.npcId===id);if(r)__lifeGame.warp(r.inside?r.insideScene:'village');const z=g.scene.interactZones.find(z=>z.id===id||z.ent&&z.ent.npcId===id);if(z.ent&&z.kind==='npc'){z.cx=z.ent.x;z.cy=z.ent.baseline-8;}g.player.x=z.cx;g.player.y=z.cy+8;},id);
   await page.locator('#game-canvas').focus();await page.waitForTimeout(60);await page.keyboard.press('e');await page.waitForSelector('#dialogue:not([hidden])');
  }
  async function finish(){for(let i=0;i<12&&await page.locator('#dialogue').isVisible();i++)await page.keyboard.press('e');assert.equal(await page.locator('#dialogue').isVisible(),false);}
  await talk('painter-demo');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__lifeGame.state.discovered.has('mem-village-photo')),false);
  await talk('painter-demo');await finish();assert.equal(await page.evaluate(()=>__lifeGame.state.discovered.has('mem-village-photo')),true);
  await page.evaluate(()=>__lifeGame.warp('cottage'));await page.waitForTimeout(250);await page.reload();await page.waitForSelector('body.game-ready');
  assert.equal(await page.evaluate(()=>__lifeGame.state.discovered.has('mem-village-photo')),true);
  await page.evaluate(()=>{const g=__lifeGame.state;g.story.step=4;g.settings.interactionHints=false;});
  await talk('cottage-photo');await finish();assert.equal(await page.locator('#interaction-hint').isVisible(),false);
  await talk('cottage-thanks');await finish();
  if(process.env.GAME_SCREENSHOTS)await page.screenshot({path:process.env.GAME_SCREENSHOTS+'/cottage-keepsakes.png'});
  await page.locator('#journey-toggle').click();assert.equal(await page.locator('#journey-note').isVisible(),true);
  await page.locator('#journey-toggle').click();await page.waitForTimeout(250);await page.reload();await page.waitForSelector('body.game-ready');
  assert.equal(await page.locator('#journey-note').isVisible(),false);
  assert.equal(await page.evaluate(()=>__lifeGame.state.settings.interactionHints),false);
  assert.deepEqual(errors,[]);console.log('PASS: real afternoon visits, task location, distinct indoor positions, photo cancellation/completion/save, thanks note, hidden hints and persisted collapsed journal.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
