const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173');await page.locator('#intro-start').click();
  assert.equal(await page.locator('#journey-note').isVisible(),false);
  await page.locator('#journey-toggle').click();assert.equal(await page.locator('#journey-note').isVisible(),true);
  await page.locator('#journey-note').click();await page.waitForSelector('.story-checklist');await page.keyboard.press('Escape');
  await page.evaluate(()=>{__lifeGame.state.settings.reducedMotion=true;});
  await page.waitForTimeout(100);
  async function talk(id) {
   await page.evaluate(id=>{
    const g=__lifeGame.state,r=g.villageWorld.entities.find(e=>e.npcId===id);
    if(r)__lifeGame.warp(r.inside?(r.insideScene||r.homeScene):'village');
    const z=g.scene.interactZones.find(z=>z.id===id || z.ent&&z.ent.npcId===id);
    if(!z || z.ent&&z.ent.hidden)throw Error('Target missing: '+id);
    if(z.ent && z.kind==='npc') {z.cx=z.ent.x;z.cy=z.ent.baseline-8;}
    g.player.x=z.cx;g.player.y=z.cy+8;
   },id);
   await page.locator('#game-canvas').focus();await page.waitForTimeout(40);await page.keyboard.press('e');
   await page.waitForSelector('#dialogue:not([hidden])');
  }
  async function finish(){
   for(let i=0;i<10 && await page.locator('#dialogue').isVisible();i++) await page.keyboard.press('e');
   assert.equal(await page.locator('#dialogue').isVisible(),false);
  }
  // Out-of-order conversations and cancelling a task never award progress.
  await talk('village-resident-3');await finish();assert.equal(await page.evaluate(()=>__lifeGame.state.story.step),0);
  await talk('village-resident-0');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__lifeGame.state.story.step),0);
  for(const [id,expected] of [['village-resident-0',1],['village-resident-3',2]]){
   await talk(id);await finish();assert.equal(await page.evaluate(()=>__lifeGame.state.story.step),expected);
  }
  await page.waitForTimeout(200);await page.reload();await page.waitForSelector('body.game-ready');
  assert.equal(await page.evaluate(()=>__lifeGame.state.story.step),2);
  // Finish at night: the same quest works with residents inside their actual houses.
  await page.evaluate(()=>{__lifeGame.state.settings.timeOfDay='night';});await page.waitForTimeout(100);
  await page.evaluate(()=>__lifeGame.warp('village-home-4'));
  await talk('village-resident-4');await finish();assert.equal(await page.evaluate(()=>__lifeGame.state.story.step),3);
  await page.evaluate(()=>__lifeGame.warp('village'));await talk('tree-lao-huai');await finish();
  assert.equal(await page.evaluate(()=>__lifeGame.state.story.step),4);
  assert.equal(await page.evaluate(()=>__lifeGame.state.discovered.has('mem-act-one-stool')),true);
  await talk('tree-lao-huai');await finish();assert.equal(await page.evaluate(()=>__lifeGame.state.story.step),4);
  await page.waitForTimeout(200);await page.reload();await page.waitForSelector('body.game-ready');
  assert.equal(await page.evaluate(()=>__lifeGame.state.story.step),4);
  // Check every scheduled stop against the actual navigation grid.
  const blocked=await page.evaluate(()=>{
   const g=__lifeGame.state,cols=g.villageWorld.W/16,result=[];
   for(const period of ['dawn','day','dusk']) {g.settings.timeOfDay=period;
    for(const e of g.villageWorld.entities.filter(e=>e.route)){
     const routine=GameStory.routine(e.npcId,g);if(routine)for(const [x,y]of routine.route)if(!g.villageWorld.walkable[y*cols+x])result.push([e.npcId,period,x,y]);
    }
   }return result;
  });assert.deepEqual(blocked,[]);
  await page.evaluate(()=>{__lifeGame.state.settings.timeOfDay='day';});
  await page.locator('#btn-menu').click();await page.locator('#btn-story').click();
  if(process.env.GAME_SCREENSHOTS)await page.screenshot({path:process.env.GAME_SCREENSHOTS+'/act-one-complete.png'});
  assert.deepEqual(errors,[]);console.log('PASS: full act, cancellation, out-of-order dialogue, indoor night objective, save reload, reward and daily destinations.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
