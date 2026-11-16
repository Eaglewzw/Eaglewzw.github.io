// Requires a running local server and Playwright, as in game-smoke.cjs.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173');
  await page.locator('#intro-start').click();
  const report=await page.evaluate(()=>{
   const s=__lifeGame.state.scene, cols=s.W/16;
   const residents=s.entities.filter(e=>e.route);
   function reachable(e,target){
    const start=Math.floor((e.baseline-1)/16)*cols+Math.floor(e.x/16), goal=target[1]*cols+target[0];
    const seen=new Set([start]),q=[start];
    for(let i=0;i<q.length;i++){
     const c=q[i];if(c===goal)return true;
     for(const n of [c-1,c+1,c-cols,c+cols]){
      if(n<0||n>=s.walkable.length||Math.abs(n%cols-c%cols)>1||!s.walkable[n]||seen.has(n))continue;
      seen.add(n);q.push(n);
     }
    }return false;
   }
   return {homes:s.def.homes.length,npcs:residents.length,lights:s.lights.length,
    blocked:residents.filter(e=>!s.walkable[Math.floor((e.baseline-1)/16)*cols+Math.floor(e.x/16)]).map(e=>e.npcId),
    unreachable:residents.filter(e=>![e.nightHome,...e.route].every(t=>reachable(e,t))).map(e=>e.npcId),
    positions:residents.map(e=>[e.x,e.baseline]),rows:s.def.map.every(r=>r.length===cols)};
  });
  assert.equal(report.homes,15);assert.equal(report.npcs,21);assert.ok(report.lights>=30);
  assert.deepEqual(report.blocked,[]);assert.deepEqual(report.unreachable,[]);assert.ok(report.rows);
  await page.waitForTimeout(6500);
  const after=await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.route).map(e=>[e.x,e.baseline]));
  const moving=after.filter((p,i)=>Math.hypot(p[0]-report.positions[i][0],p[1]-report.positions[i][1])>2).length;
  assert.ok(moving>=5, 'Residents should actually walk along their routes');
  for(const period of ['day','dusk','night']) {
   await page.locator('#btn-menu').click();await page.locator('#btn-settings').click();
   await page.getByLabel('村庄时段').selectOption(period);await page.keyboard.press('Escape');
   await page.waitForTimeout(200);
   if(process.env.GAME_SCREENSHOTS) await page.screenshot({path:process.env.GAME_SCREENSHOTS+'/village-'+period+'.png'});
  }
  assert.ok(await page.evaluate(()=>LGLandscape.nightAmount(__lifeGame.state))>.95);
  assert.ok(await page.evaluate(()=>__lifeGame.state.scene.entities.filter(e=>e.route).every(e=>e.night===true)));
  await page.reload();await page.waitForSelector('body.game-ready');
  assert.equal(await page.evaluate(()=>__lifeGame.state.settings.timeOfDay),'night');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({...report,positions:undefined,moving,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
