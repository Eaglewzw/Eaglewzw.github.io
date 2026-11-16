const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173');await page.locator('#intro-start').click();
 const poses=await page.evaluate(()=>{const g=__lifeGame.state;g.settings.timeOfDay='day';g.settings.reducedMotion=false;
  const e=g.villageWorld.entities.find(e=>e.npcId==='village-resident-3');e.walking=false;e.behavior={atActivity:true};
  const base=e.sprite.down[0],sitting=LifeWorld.pose(e,base,g);g.settings.reducedMotion=true;
  return [sitting!==base,sitting.width,sitting.height,LifeWorld.pose(e,base,g)===base];});assert.deepEqual(poses,[true,16,20,true]);
 await page.evaluate(()=>{__lifeGame.warp('county');const g=__lifeGame.state;g.player.x=35*16;g.player.y=17*16;g.settings.reducedMotion=true;document.body.classList.add('experienced-player');});
 const surfaces=[];
 for(const time of ['day','night']){
  surfaces.push(await page.evaluate(time=>{const g=__lifeGame.state;g.settings.timeOfDay=time;
   const c=document.createElement('canvas');c.width=g.scene.W;c.height=g.scene.H;const x=c.getContext('2d');LifeWorld.draw(x,g);return c.toDataURL();},time));
  await page.waitForTimeout(100);if(process.env.GAME_SCREENSHOTS)await page.screenshot({path:process.env.GAME_SCREENSHOTS+'/county-stalls-'+time+'.png'});
 }assert.notEqual(surfaces[0],surfaces[1],'shop shutters and stall stock must change with time');
 await page.evaluate(()=>{GameAudio.setEnabled(false);GameAudio.life('bell');});
 assert.equal(await page.evaluate(()=>GameAudio._bgmState().active||GameAudio._ambState().active),false);
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto(process.env.GAME_URL||'http://127.0.0.1:4173');await mobile.locator('#intro-start').click();
 await mobile.evaluate(()=>{const g=__lifeGame.state;g.story.step=4;g.settings.reducedMotion=true;g.player.x=14*16+8;g.player.y=21*16+16;});
 await mobile.waitForTimeout(100);await mobile.locator('#pad-action').click();await mobile.waitForSelector('.activity-grid');
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 for(const name of ['左边的菜苗','中间的菜苗','右边的菜苗'])await mobile.getByRole('button',{name,exact:true}).click();
 if(process.env.GAME_SCREENSHOTS)await mobile.screenshot({path:process.env.GAME_SCREENSHOTS+'/mobile-watering.png'});
 await mobile.locator('.activity-confirm').click();assert.equal(await mobile.evaluate(()=>__lifeGame.state.journey.stage),1);
 assert.deepEqual(errors,[]);console.log('PASS: seated pixel pose, reduced-motion fallback, visible opening/closing hours, sound mute and mobile watering interaction.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
