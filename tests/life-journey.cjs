const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173');await page.locator('#intro-start').click();
 // Continue from an existing first-act save, with all new data defaulted.
 await page.evaluate(()=>{const g=__lifeGame.state;g.story.step=4;g.settings.reducedMotion=true;g.settings.timeOfDay='day';});
 async function stage(n){assert.equal(await page.evaluate(()=>__lifeGame.state.journey.stage),n);}
 async function visit(scene,id){
  await page.evaluate(({scene,id})=>{const g=__lifeGame.state,r=g.villageWorld.entities.find(e=>e.npcId===id);__lifeGame.warp(r?(r.inside?r.insideScene:'village'):scene);}, {scene,id});
  await page.waitForTimeout(80);
  await page.evaluate(id=>{
   const g=__lifeGame.state,z=g.scene.interactZones.find(z=>z.id===id||z.ent&&z.ent.npcId===id);if(!z||z.ent&&z.ent.hidden)throw Error('Missing '+id);
   const cx=z.kind==='npc'?z.ent.x:z.cx,cy=z.kind==='npc'?z.ent.baseline-8:z.cy;
   const candidates=[];
   for(let dy=-20;dy<=20;dy+=4)for(let dx=-20;dx<=20;dx+=4){const x=cx+dx,y=cy+8+dy;
    if(Math.hypot(dx,dy)>=29||g.scene.colliders.some(c=>x-5<c.x+c.w&&x+5>c.x&&y-6<c.y+c.h&&y>c.y))continue;
    const nearer=g.scene.interactZones.some(a=>a!==z&&!(a.ent&&a.ent.hidden)&&GameKeepsakes.available(a,g)&&Math.hypot((a.kind==='npc'?a.ent.x:a.cx)-x,(a.kind==='npc'?a.ent.baseline-8:a.cy)-y+8)<=Math.hypot(dx,dy));
    if(!nearer)candidates.push({x,y,d:Math.hypot(dx,dy)});
   }candidates.sort((a,b)=>a.d-b.d);if(!candidates.length)throw Error('Cannot reach interaction '+id);Object.assign(g.player,candidates[0]);g.keys={};
  },id);
  await page.locator('#game-canvas').focus();await page.waitForTimeout(60);await page.keyboard.press('e');
 }
 async function finish(){await page.waitForSelector('#dialogue:not([hidden])');for(let i=0;i<18&&await page.locator('#dialogue').isVisible();i++)await page.keyboard.press('e');assert.equal(await page.locator('#dialogue').isVisible(),false);}
 async function activity(scene,id,labels){await visit(scene,id);await page.waitForSelector('.activity-grid');for(const label of labels)await page.getByRole('button',{name:label,exact:true}).click();assert.equal(await page.locator('.activity-confirm').isEnabled(),true);await page.locator('.activity-confirm').click();}
 await visit('village','journey-water');await page.getByRole('button',{name:'左边的菜苗',exact:true}).click();await page.keyboard.press('Escape');await stage(0);
 await activity('village','journey-water',['左边的菜苗','中间的菜苗','右边的菜苗']);await stage(1);
 await visit('cottage','journey-cook');await page.getByRole('button',{name:'盛饭上桌',exact:true}).click();assert.equal(await page.locator('.activity-confirm').isEnabled(),false);
 for(const label of ['洗好青菜','添柴煮菜','盛饭上桌'])await page.getByRole('button',{name:label,exact:true}).click();
 if(process.env.GAME_SCREENSHOTS)await page.screenshot({path:process.env.GAME_SCREENSHOTS+'/journey-cooking.png'});
 await page.locator('.activity-confirm').click();await stage(2);
 await visit('cottage','bed-rest');await finish();await stage(3);assert.equal(await page.evaluate(()=>__lifeGame.state.journey.day),2);
 await visit('cottage','journey-letter');await page.keyboard.press('Escape');await stage(3);
 await visit('cottage','journey-letter');await finish();await stage(4);
 await activity('cottage','journey-pack',['入学通知','铅笔','旧手帕']);await stage(5);
 for(const id of ['village-resident-0','village-resident-3','village-resident-4','village-resident-2']){await visit('village',id);await finish();}
 await stage(6);await page.waitForTimeout(250);await page.reload();await page.waitForSelector('body.game-ready');await stage(6);
 await visit('village','journey-depart');await finish();await stage(7);assert.equal(await page.evaluate(()=>__lifeGame.state.scene.id),'county');assert.equal(await page.evaluate(()=>__lifeGame.state.journey.day),3);
 // No real-time waiting or night-time soft lock at school.
 await page.evaluate(()=>__lifeGame.state.settings.timeOfDay='night');
 await visit('county','county-teacher-male-demo');await finish();await stage(7);
 assert.equal(await page.evaluate(()=>LifeJourney.schoolOpen(__lifeGame.state)),true);
 await visit('county','county-teacher-male-demo');await finish();await stage(8);
 await visit('county','county-student-demo');await finish();await stage(9);
 await activity('county','journey-supplies',['练习本','铅笔','橡皮']);await stage(10);
 await activity('county','journey-letter-home',['有点想家，但我会慢慢适应']);await stage(11);
 assert.equal(await page.evaluate(()=>__lifeGame.state.discovered.has('mem-first-school-day')),true);
 await page.waitForTimeout(250);await page.reload();await page.waitForSelector('body.game-ready');await stage(11);
 assert.equal(await page.evaluate(()=>__lifeGame.state.journey.letter),'home');
 await visit('village','village-resident-4');assert.match(await page.locator('#dlg-text').textContent(),/想家就回来看看/);await finish();
 await visit('cottage','journey-school-photo');await finish();
 await page.locator('#btn-menu').click();await page.locator('#btn-story').click();
 if(process.env.GAME_SCREENSHOTS)await page.screenshot({path:process.env.GAME_SCREENSHOTS+'/journey-complete.png'});
 assert.deepEqual(errors,[]);console.log('PASS: full village-to-school chapter, cancelled activities/dialogue, recipe order, sleeping/day transition, four farewells, night school recovery, letter choice, relationship response and save reload.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
